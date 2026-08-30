import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { db, safeParse } from '../db.js'
import { requireOnboarded } from '../auth.js'
import { gdTurn, evaluateGd } from '../ai.js'
import { GD_PANEL, GD_TOPICS } from '../prompts.js'
import { profileBrief } from '../profile.js'
import { clearGd, GD_PASS, careerState } from '../career.js'
import { applyAttributeDeltas, getAttributes } from '../attributes.js'
import { award, checkStateBadges } from '../badges.js'
import { levelFor, localDate, streakAfterQuest, streakStatus, STREAK_BONUS } from '../gamification.js'

export const gdRouter = Router()

gdRouter.use(requireOnboarded)

/** Beats of panel talk before the discussion is closed. */
const TOTAL_BEATS = 5

const live = new Map()
const TTL_MS = 2 * 60 * 60 * 1000

function stash(run) {
  const id = randomUUID()
  live.set(id, { ...run, createdAt: Date.now() })
  if (live.size > 80) {
    for (const [k, v] of live) if (Date.now() - v.createdAt > TTL_MS) live.delete(k)
    while (live.size > 80) live.delete(live.keys().next().value)
  }
  return id
}

function take(id, userId) {
  const run = live.get(id)
  if (!run || run.userId !== userId) return null
  if (Date.now() - run.createdAt > TTL_MS) {
    live.delete(id)
    return null
  }
  return run
}

/* ------------------------------------------------------------ GET /api/gd */

const runsStmt = db.prepare(
  `SELECT id, topic, score, verdict, xpAwarded, timestamp FROM gd_runs
   WHERE userId = ? ORDER BY id DESC LIMIT 8`
)
const bestStmt = db.prepare('SELECT MAX(score) AS best, COUNT(*) AS runs FROM gd_runs WHERE userId = ?')

gdRouter.get('/', (req, res) => {
  const b = bestStmt.get(req.user.id)
  res.json({
    panel: GD_PANEL.map((p) => ({ name: p.name, trait: p.trait })),
    best: b.best ?? null,
    runs: b.runs,
    cleared: !!req.user.gdCleared,
    pass: GD_PASS,
    totalBeats: TOTAL_BEATS,
    history: runsStmt.all(req.user.id),
  })
})

/* ------------------------------------------------------ GET /api/gd/runs/:id */

const runByIdStmt = db.prepare('SELECT * FROM gd_runs WHERE id = ? AND userId = ?')

gdRouter.get('/runs/:id', (req, res) => {
  const row = runByIdStmt.get(Number(req.params.id), req.user.id)
  if (!row) return res.status(404).json({ error: 'No such discussion.' })
  res.json({
    ...row,
    transcript: safeParse(row.transcript, []),
    contributions: safeParse(row.contributions, []),
    scores: safeParse(row.scores, {}),
  })
})

/* -------------------------------------------------- POST /api/gd/start ---- */

const topicCount = db.prepare('SELECT COUNT(*) AS n FROM gd_runs WHERE userId = ?')

gdRouter.post('/start', async (req, res, next) => {
  try {
    const user = req.user
    // Rotate the topic rather than repeating one; a second attempt on the same
    // motion is a rehearsal, not a discussion.
    const topic = GD_TOPICS[topicCount.get(user.id).n % GD_TOPICS.length]

    const opening = await gdTurn({ topic, transcript: [], beat: 1, totalBeats: TOTAL_BEATS })
    const transcript = opening.turns.map((t) => ({ ...t, you: false }))

    const runId = stash({
      userId: user.id,
      topic,
      transcript,
      contributions: [],
      beat: 1,
      source: opening.source,
    })

    res.json({
      runId,
      topic,
      panel: GD_PANEL.map((p) => ({ name: p.name, trait: p.trait })),
      transcript,
      beat: 1,
      totalBeats: TOTAL_BEATS,
      source: opening.source,
      offlineNote: opening.offlineNote ?? null,
    })
  } catch (err) {
    next(err)
  }
})

/* --------------------------------------------------- POST /api/gd/turn ---- */

/**
 * One exchange. The trainee may speak or stay quiet, and staying quiet is a
 * real choice with a real cost — it is recorded as a pass, not skipped.
 */
gdRouter.post('/turn', async (req, res, next) => {
  try {
    const run = take(req.body?.runId, req.user.id)
    if (!run) return res.status(410).json({ error: 'That discussion has ended. Start a new one.' })

    const said = String(req.body?.text ?? '').trim().slice(0, 1200)

    if (said) {
      run.contributions.push({ text: said, after: run.transcript.length })
      run.transcript.push({ speaker: 'You', text: said, you: true })
    }

    run.beat += 1
    const done = run.beat > TOTAL_BEATS

    if (done) {
      return res.json({
        runId: req.body.runId,
        transcript: run.transcript,
        beat: run.beat,
        totalBeats: TOTAL_BEATS,
        closed: true,
      })
    }

    const next_ = await gdTurn({
      topic: run.topic,
      transcript: run.transcript,
      beat: run.beat,
      totalBeats: TOTAL_BEATS,
      lastUserTurn: said || null,
    })

    const added = next_.turns.map((t) => ({ ...t, you: false }))
    run.transcript.push(...added)

    res.json({
      runId: req.body.runId,
      added,
      transcript: run.transcript,
      beat: run.beat,
      totalBeats: TOTAL_BEATS,
      closed: false,
      source: next_.source,
      offlineNote: next_.offlineNote ?? null,
    })
  } catch (err) {
    next(err)
  }
})

/* ------------------------------------------------- POST /api/gd/finish ---- */

const insertRun = db.prepare(`
  INSERT INTO gd_runs
    (userId, topic, transcript, contributions, scores, score, verdict, strengths,
     gaps, nextFocus, xpAwarded, source, timestamp, localDate)
  VALUES
    (@userId, @topic, @transcript, @contributions, @scores, @score, @verdict, @strengths,
     @gaps, @nextFocus, @xpAwarded, @source, @timestamp, @localDate)
`)

const updateUser = db.prepare(`
  UPDATE users SET xp = @xp, streak = @streak, longestStreak = @longestStreak,
                   lastActiveDate = @lastActiveDate
  WHERE id = @id
`)

/**
 * A GD moves the five attributes it actually tests. The mapping is direct
 * because the assessor already scored those five dimensions by name.
 */
const GD_TO_ATTRIBUTE = {
  communication: 'communication',
  confidence: 'confidence',
  leadership: 'leadership',
  teamwork: 'teamwork',
  listening: 'emotionalIntelligence',
}

gdRouter.post('/finish', async (req, res, next) => {
  try {
    const before = req.user
    const run = take(req.body?.runId, before.id)
    if (!run) return res.status(410).json({ error: 'That discussion has ended. Start a new one.' })

    const debrief = await evaluateGd({
      topic: run.topic,
      transcript: run.transcript,
      contributions: run.contributions,
      profile: profileBrief(before),
    })

    const today = localDate()
    const { streak, event } = streakAfterQuest(before, today)
    const xp = debrief.score * 12 + STREAK_BONUS(streak)

    const beforeLevel = levelFor(before.xp)
    const afterXp = before.xp + xp
    const afterLevel = levelFor(afterXp)

    let runId
    db.transaction(() => {
      const info = insertRun.run({
        userId: before.id,
        topic: run.topic,
        transcript: JSON.stringify(run.transcript),
        contributions: JSON.stringify(run.contributions),
        scores: JSON.stringify(debrief.scores),
        score: debrief.score,
        verdict: debrief.verdict,
        strengths: debrief.strengths,
        gaps: debrief.gaps,
        nextFocus: debrief.nextFocus,
        xpAwarded: xp,
        source: debrief.source,
        timestamp: new Date().toISOString(),
        localDate: today,
      })
      runId = info.lastInsertRowid
      updateUser.run({
        id: before.id,
        xp: afterXp,
        streak,
        longestStreak: Math.max(before.longestStreak, streak),
        lastActiveDate: today,
      })
    })()

    live.delete(req.body.runId)

    // Each dimension is scored 0-100; the delta is how far it sits from an
    // even 50, scaled down so one discussion nudges rather than rewrites.
    const deltas = {}
    for (const [dim, key] of Object.entries(GD_TO_ATTRIBUTE)) {
      deltas[key] = Math.round(((debrief.scores[dim] - 50) / 14) * 10) / 10
    }
    const moved = applyAttributeDeltas(before.id, deltas, {
      reason: `Group discussion: ${run.topic.slice(0, 80)}`,
      source: 'gd',
    })

    const newBadges = []
    if (run.contributions.length >= 2 && debrief.score >= 6) {
      const b = award(before.id, 'discussion-catalyst', `Contributed ${run.contributions.length} times and scored ${debrief.score}/10.`)
      if (b) newBadges.push(b)
    }
    const phase = clearGd(before, debrief.score)
    newBadges.push(
      ...checkStateBadges(before.id, { attributes: getAttributes(before.id), streak })
    )

    res.json({
      kind: 'gd',
      runId,
      topic: run.topic,
      passed: debrief.score >= GD_PASS,
      pass: GD_PASS,
      phaseUnlocked: phase !== (before.phase ?? 'gd') ? phase : null,

      score: debrief.score,
      scores: debrief.scores,
      verdict: debrief.verdict,
      strengths: debrief.strengths,
      gaps: debrief.gaps,
      nextFocus: debrief.nextFocus,
      transcript: run.transcript,
      contributions: run.contributions,

      source: debrief.source,
      offlineNote: debrief.offlineNote ?? null,

      xp: { total: xp, before: before.xp, after: afterXp, bonus: STREAK_BONUS(streak) },
      streak: { value: streak, event, before: streakStatus(before, today).streak },
      levelUp: afterLevel.index > beforeLevel.index ? afterLevel : null,
      level: afterLevel,
      attributes: moved,
      badges: newBadges,
      career: careerState({ ...before, phase, gdCleared: 1 }),
    })
  } catch (err) {
    next(err)
  }
})
