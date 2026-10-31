import { isAdmin } from '../admin.js'
import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { db, safeParse } from '../db.js'
import { requireOnboarded } from '../auth.js'
import { generateInterview, debriefInterview } from '../ai.js'
import { profileBrief, portfolioBrief } from '../profile.js'
import { interviewBrief } from '../resume.js'
import { maybeRefresh } from '../context.js'
import { applyAttributeDeltas, getAttributes } from '../attributes.js'
import { award, checkStateBadges } from '../badges.js'
import { clearInterview, careerState } from '../career.js'
import {
  ROUNDS,
  roundFor,
  MAX_LEVEL,
  QUESTIONS_PER_ROUND,
  PASS_SCORE,
  interviewProgress,
  unlockAfter,
  interviewXp,
  mockDoneLevels,
} from '../interview.js'
import { recordStat } from '../personalise.js'
import {
  levelFor,
  localDate,
  streakStatus,
  streakAfterQuest,
  STREAK_BONUS,
} from '../gamification.js'

export const interviewRouter = Router()

interviewRouter.use(requireOnboarded)

/** The role the interview is for. Falls back to a generic entry-level title. */
const ROLE_TITLE = {
  swe: 'Software Engineer',
  data: 'Data / ML Engineer',
  product: 'Product Analyst',
  qa: 'QA / DevOps Engineer',
  core: 'Graduate Engineer',
  unsure: 'Graduate Trainee',
}

const COMPANY = {
  startup: 'a 30-person startup',
  product: 'a mid-size product company',
  service: 'a large IT services company',
  any: 'a software company',
}

const roleFor = (user) => ROLE_TITLE[user.targetRole] ?? 'Graduate Engineer'
const companyFor = (user) => COMPANY[user.workSetting] ?? 'a software company'

const dossierFor = (user) => ({
  profile: profileBrief(user),
  resume: interviewBrief(user),
  portfolio: portfolioBrief(user),
})

/* ------------------------------------------------- rounds held in memory --- */

const pending = new Map()
const RUN_TTL_MS = 3 * 60 * 60 * 1000
const PENDING_MAX = 100

function stash(run) {
  const id = randomUUID()
  pending.set(id, { ...run, createdAt: Date.now() })
  if (pending.size > PENDING_MAX) {
    for (const [k, v] of pending) {
      if (Date.now() - v.createdAt > RUN_TTL_MS) pending.delete(k)
    }
    while (pending.size > PENDING_MAX) pending.delete(pending.keys().next().value)
  }
  return id
}

function take(id, userId) {
  const run = pending.get(id)
  if (!run || run.userId !== userId) return null
  if (Date.now() - run.createdAt > RUN_TTL_MS) {
    pending.delete(id)
    return null
  }
  return run
}

/* ------------------------------------------------------ GET /api/interview */

const askedBefore = db.prepare(
  'SELECT questions FROM interview_runs WHERE userId = ? AND level = ? ORDER BY id DESC LIMIT 3'
)

const historyRows = db.prepare(`
  SELECT id, level, score, verdict, xpAwarded, source, timestamp
  FROM interview_runs WHERE userId = ? ORDER BY id DESC LIMIT ?
`)

interviewRouter.get('/', (req, res) => {
  res.json({
    ...interviewProgress(req.user),
    role: roleFor(req.user),
    company: companyFor(req.user),
    hasResume: !!req.user.resumeUpdatedAt,
    questionsPerRound: QUESTIONS_PER_ROUND,
    history: historyRows.all(req.user.id, 10),
  })
})

/* ------------------------------------------- GET /api/interview/runs/:id -- */

const runById = db.prepare('SELECT * FROM interview_runs WHERE id = ? AND userId = ?')

interviewRouter.get('/runs/:id', (req, res) => {
  const row = runById.get(Number(req.params.id), req.user.id)
  if (!row) return res.status(404).json({ error: 'No such interview.' })

  res.json({
    ...row,
    questions: safeParse(row.questions, []),
    answers: safeParse(row.answers, []),
    perAnswer: safeParse(row.perAnswer, []),
    round: roundFor(row.level),
  })
})

/* ---------------------------------------- POST /api/interview/start ------- */

interviewRouter.post('/start', async (req, res, next) => {
  try {
    const user = req.user
    const asked = Number(req.body?.level)
    const level = Number.isInteger(asked) ? asked : 1

    if (level < 1 || level > MAX_LEVEL) {
      return res.status(400).json({ error: `Rounds run from 1 to ${MAX_LEVEL}.` })
    }
    if (level > (user.interviewLevel ?? 1) && !isAdmin(user)) {
      return res.status(403).json({
        error: `Round ${level} is locked. Clear round ${user.interviewLevel ?? 1} with ${PASS_SCORE}/10 or better to open it.`,
      })
    }

    const round = roundFor(level)

    /*
     * The mock comes first. A real round is where you are assessed, and being
     * assessed on a kind of question you have never seen answered well is a poor
     * way to learn what a good answer is. One mock per round, any score: it is
     * a rehearsal, not a gate on ability. Practice mode skips it.
     */
    if (req.body?.practice !== true && !isAdmin(user) && !mockDoneLevels(user.id).includes(level)) {
      return res.status(409).json({
        needsMock: true,
        level,
        error: `Do the round ${level} mock interview first. It is five questions, and it shows you what a strong answer sounds like before you have to give one.`,
      })
    }

    // Do not ask the same questions twice in a row when a round is repeated.
    const previous = askedBefore
      .all(user.id, level)
      .flatMap((r) => safeParse(r.questions, []).map((q) => q.text))
      .slice(0, 9)

    const generated = await generateInterview({
      round,
      role: roleFor(user),
      company: companyFor(user),
      asked: previous,
      n: QUESTIONS_PER_ROUND,
      ...dossierFor(user),
    })

    const runId = stash({
      userId: user.id,
      level,
      practice: req.body?.practice === true,
      questions: generated.questions,
      source: generated.source,
    })

    res.json({
      runId,
      level,
      round: { level: round.level, name: round.name, focus: round.focus },
      interviewer: round.interviewer,
      role: roleFor(user),
      company: companyFor(user),
      opener: generated.opener,
      questions: generated.questions,
      source: generated.source,
      offlineNote: generated.offlineNote ?? null,
      usedResume: !!user.resumeUpdatedAt,
    })
  } catch (err) {
    next(err)
  }
})

/* --------------------------------------- POST /api/interview/submit ------- */

const insertRun = db.prepare(`
  INSERT INTO interview_runs
    (userId, level, role, questions, answers, perAnswer, score, verdict, strengths,
     gaps, nextFocus, xpAwarded, practice, source, timestamp, localDate)
  VALUES
    (@userId, @level, @role, @questions, @answers, @perAnswer, @score, @verdict, @strengths,
     @gaps, @nextFocus, @xpAwarded, @practice, @source, @timestamp, @localDate)
`)

const updateUser = db.prepare(`
  UPDATE users SET xp = @xp, streak = @streak, longestStreak = @longestStreak,
                   lastActiveDate = @lastActiveDate
  WHERE id = @id
`)

interviewRouter.post('/submit', async (req, res, next) => {
  try {
    const before = req.user
    const run = take(req.body?.runId, before.id)
    if (!run) {
      return res.status(410).json({
        error: 'This interview expired. Start the round again — nothing else was lost.',
      })
    }

    const given = Array.isArray(req.body?.answers) ? req.body.answers : []
    const answers = run.questions.map((_, i) => String(given[i] ?? '').trim().slice(0, 4000))

    if (!answers.some((a) => a.length > 0)) {
      return res.status(400).json({ error: 'Answer at least one question before finishing.' })
    }

    const round = roundFor(run.level)
    const pairs = run.questions.map((q, i) => ({ question: q.text, answer: answers[i] }))

    const debrief = await debriefInterview({
      round,
      role: roleFor(before),
      pairs,
      ...dossierFor(before),
    })

    // Practice keeps the debrief and drops the consequences — see gd.js.
    const practice = !!run.practice

    const today = localDate()
    const { streak, event } = practice
      ? { streak: before.streak, event: 'none' }
      : streakAfterQuest(before, today)
    const xp = practice ? 0 : interviewXp(debrief.answers) + STREAK_BONUS(streak)

    const beforeLevel = levelFor(before.xp)
    const afterXp = before.xp + xp
    const afterLevel = levelFor(afterXp)

    let runId
    db.transaction(() => {
      const info = insertRun.run({
        userId: before.id,
        level: run.level,
        role: roleFor(before),
        questions: JSON.stringify(run.questions),
        answers: JSON.stringify(answers),
        perAnswer: JSON.stringify(debrief.answers),
        score: debrief.score,
        verdict: debrief.verdict,
        strengths: debrief.strengths,
        gaps: debrief.gaps,
        nextFocus: debrief.nextFocus,
        xpAwarded: xp,
        practice: practice ? 1 : 0,
        source: debrief.source,
        timestamp: new Date().toISOString(),
        localDate: today,
      })
      runId = info.lastInsertRowid
      if (!practice) {
        updateUser.run({
          id: before.id,
          xp: afterXp,
          streak,
          longestStreak: Math.max(before.longestStreak, streak),
          lastActiveDate: today,
        })
      }
    })()

    pending.delete(req.body.runId)

    // What the app knows about this trainee keeps moving: a round is evidence
    // about how they answer, and the next mock and the dashboard read it back.
    if (!practice) recordStat(before.id, 'interview-round', `round-${run.level}`, debrief.score * 10)

    const unlockedTo = practice
      ? (before.interviewLevel ?? 1)
      : unlockAfter(before, run.level, debrief.score)
    const progress = interviewProgress({ ...before, interviewLevel: unlockedTo })

    /*
     * An interview exercises a specific and narrow set of attributes — how you
     * present evidence, whether you hold up when challenged, whether you can
     * structure an answer. It should not move Teamwork.
     */
    const moved = practice
      ? []
      : applyAttributeDeltas(
      before.id,
      {
        communication: (debrief.score - 5.5) / 1.6,
        confidence: (debrief.score - 5.5) / 1.9,
        professionalism: (debrief.score - 5.5) / 2.6,
        ...(run.level >= 4 ? { adaptability: (debrief.score - 5.5) / 2.6 } : {}),
      },
      { reason: `Interview round ${run.level}: ${round.name}`, source: 'interview' }
    )

    const newBadges = []
    if (!practice && debrief.score >= PASS_SCORE && run.level === 1) {
      const b = award(before.id, 'interview-ready', `Cleared the introduction round at ${debrief.score}/10.`)
      if (b) newBadges.push(b)
    }
    if (!practice && debrief.score >= PASS_SCORE && run.level === 4) {
      const b = award(before.id, 'under-pressure', `Held up in the pressure round at ${debrief.score}/10.`)
      if (b) newBadges.push(b)
    }
    if (!practice) {
      newBadges.push(...checkStateBadges(before.id, { attributes: getAttributes(before.id), streak }))
    }

    // Clearing the last round is the offer of the internship.
    const allCleared = progress.rounds.every((r) => r.cleared)
    const phase = !practice && allCleared ? clearInterview(before) : before.phase

    res.json({
      kind: 'interview',
      runId,
      practice,
      level: run.level,
      round: { level: round.level, name: round.name, focus: round.focus },
      passed: debrief.score >= PASS_SCORE,
      passScore: PASS_SCORE,
      unlockedRound: unlockedTo > (before.interviewLevel ?? 1) ? unlockedTo : null,
      finishedAll: unlockedTo === MAX_LEVEL && run.level === MAX_LEVEL && debrief.score >= PASS_SCORE,

      score: debrief.score,
      verdict: debrief.verdict,
      strengths: debrief.strengths,
      gaps: debrief.gaps,
      nextFocus: debrief.nextFocus,
      answers: run.questions.map((q, i) => ({
        question: q.text,
        hint: q.hint,
        answer: answers[i],
        ...debrief.answers[i],
      })),

      source: debrief.source,
      offlineNote: debrief.offlineNote ?? null,

      xp: { total: xp, before: before.xp, after: afterXp, bonus: STREAK_BONUS(streak) },
      streak: { value: streak, event, before: streakStatus(before, today).streak },
      levelUp: afterLevel.index > beforeLevel.index ? afterLevel : null,
      // Not `level`: that key already carries the round number, and a second
      // `level` in this literal silently replaced it with this object.
      xpLevel: afterLevel,
      progress,

      attributes: moved,
      badges: newBadges,
      phaseUnlocked: phase !== before.phase ? phase : null,
      career: careerState({ ...before, interviewLevel: unlockedTo, phase }),
    })

    maybeRefresh(before.id)
  } catch (err) {
    next(err)
  }
})

export { ROUNDS }
