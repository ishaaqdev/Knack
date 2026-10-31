import { isAdmin } from '../admin.js'
import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { db } from '../db.js'
import { requireOnboarded } from '../auth.js'
import { generateMock } from '../ai.js'
import { isOffline } from '../settings.js'
import { companyById } from '../companies.js'
import { roundFor, MAX_LEVEL, mockDoneLevels } from '../interview.js'
import { levelFor, localDate } from '../gamification.js'
import { weakKeys, recordMockAnswer, trainingProfile, statsFor } from '../personalise.js'
import {
  MOCK_SIZE,
  GRADE,
  pickFromBank,
  withShuffledOptions,
  hiddenQuestion,
  styleFor,
  roundOf,
} from '../mock/index.js'

/**
 * Mock interviews: the multiple-choice rehearsal before a real round.
 *
 * Every answer is explained the moment it is given, because the trainee is here
 * to learn what a strong answer sounds like, not to be graded on not knowing.
 * The scores stay on the server until a question is answered, for the same
 * reason level options do: round-tripping them would hand over the answer key.
 */

export const mockRouter = Router()
mockRouter.use(requireOnboarded)

const pending = new Map()
const TTL_MS = 3 * 60 * 60 * 1000

function stash(run) {
  const id = randomUUID()
  pending.set(id, { ...run, createdAt: Date.now() })
  if (pending.size > 100) {
    for (const [k, v] of pending) if (Date.now() - v.createdAt > TTL_MS) pending.delete(k)
    while (pending.size > 100) pending.delete(pending.keys().next().value)
  }
  return id
}

function take(id, userId) {
  const run = pending.get(id)
  if (!run || run.userId !== userId) return null
  if (Date.now() - run.createdAt > TTL_MS) {
    pending.delete(id)
    return null
  }
  return run
}

const ROLE_TITLE = {
  swe: 'Software Engineer',
  data: 'Data / ML Engineer',
  product: 'Product Analyst',
  qa: 'QA / DevOps Engineer',
  core: 'Graduate Engineer',
  unsure: 'Graduate Trainee',
}

const companyOf = (user) => (user.simCompanyId ? companyById(user.simCompanyId) : null)

/* ------------------------------------------------------------- GET / ------ */

const lastRuns = db.prepare(
  `SELECT id, level, score, xpAwarded, timestamp FROM mock_runs
   WHERE userId = ? ORDER BY id DESC LIMIT 8`
)

mockRouter.get('/', (req, res) => {
  const user = req.user
  const company = companyOf(user)
  res.json({
    size: MOCK_SIZE,
    style: styleFor(user, company?.type),
    company: company ? { id: company.id, name: company.name } : null,
    offline: isOffline(),
    done: mockDoneLevels(user.id),
    history: lastRuns.all(user.id),
    profile: trainingProfile(user.id, {
      mockDone: mockDoneLevels(user.id),
      interviewLevel: user.interviewLevel ?? 1,
    }),
  })
})

/* ---------------------------------------------------------- POST /start --- */

mockRouter.post('/start', async (req, res, next) => {
  try {
    const user = req.user
    const level = Number.isInteger(Number(req.body?.level)) ? Number(req.body.level) : 1
    if (level < 1 || level > MAX_LEVEL) {
      return res.status(400).json({ error: `Rounds run from 1 to ${MAX_LEVEL}.` })
    }
    // A mock is for a round you can actually reach. Practice opens them all.
    if (level > (user.interviewLevel ?? 1) && req.body?.practice !== true && !isAdmin(user)) {
      return res.status(403).json({ error: `Round ${level} is locked, so its mock is too.` })
    }

    const round = roundFor(level)
    const company = companyOf(user)
    const style = styleFor(user, company?.type)
    const weak = weakKeys(user.id, 'mock-topic', { n: 3 })

    // Fresh questions written for this trainee when a model is reachable.
    // Anything the model cannot supply comes from the bank, so this never fails.
    const written = await generateMock({
      round,
      role: ROLE_TITLE[user.targetRole] ?? 'Graduate Engineer',
      company: company?.name ?? 'a software company',
      style: style === 'any' ? null : style,
      weak,
      n: 3,
    })

    const fresh = written?.questions ?? []
    const bank = pickFromBank({
      userId: user.id,
      level,
      style,
      n: MOCK_SIZE - fresh.length,
      weakTopics: weak,
    })
    const questions = [...fresh, ...bank].map(withShuffledOptions)

    const runId = stash({
      userId: user.id,
      level,
      practice: req.body?.practice === true,
      company: company?.name ?? '',
      questions,
      answers: new Array(questions.length).fill(null),
      source: fresh.length ? 'mixed' : 'bank',
    })

    res.json({
      runId,
      level,
      round: { level: round.level, name: round.name, focus: round.focus },
      interviewer: round.interviewer,
      company: company?.name ?? null,
      style,
      source: fresh.length ? 'mixed' : 'bank',
      written: fresh.length,
      leaningOn: weak.map((w) => w.replace(/-/g, ' ')),
      questions: questions.map(hiddenQuestion),
    })
  } catch (err) {
    next(err)
  }
})

/* --------------------------------------------------------- POST /answer --- */

mockRouter.post('/answer', (req, res) => {
  const run = take(req.body?.runId, req.user.id)
  if (!run) return res.status(410).json({ error: 'That mock expired. Start it again, nothing was lost.' })

  const index = Number(req.body?.index)
  const choice = Number(req.body?.choice)
  const q = run.questions[index]
  if (!q || !Number.isInteger(choice) || choice < 0 || choice >= q.options.length) {
    return res.status(400).json({ error: 'That is not one of the options.' })
  }

  // Answering twice returns the first answer. Otherwise the way to learn the
  // key would be to try every option and keep the best.
  if (run.answers[index] === null) {
    const score = q.options[choice].score
    run.answers[index] = { choice, score }
    recordMockAnswer(req.user.id, q, score)
  }
  const given = run.answers[index]
  const best = q.options.reduce((b, o, i) => (o.score > q.options[b].score ? i : b), 0)

  res.json({
    index,
    choice: given.choice,
    score: given.score,
    grade: GRADE[given.score],
    best,
    options: q.options.map((o) => ({ score: o.score, grade: GRADE[o.score], why: o.why })),
    lesson: q.lesson,
    answered: run.answers.filter(Boolean).length,
    total: run.questions.length,
  })
})

/* --------------------------------------------------------- POST /finish --- */

const insertRun = db.prepare(`
  INSERT INTO mock_runs (userId, level, company, items, score, xpAwarded, source, timestamp, localDate)
  VALUES (@userId, @level, @company, @items, @score, @xpAwarded, @source, @timestamp, @localDate)
`)
const priorRuns = db.prepare('SELECT COUNT(*) AS n FROM mock_runs WHERE userId = ? AND level = ?')
const addXp = db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?')

mockRouter.post('/finish', (req, res) => {
  const user = req.user
  const run = take(req.body?.runId, user.id)
  if (!run) return res.status(410).json({ error: 'That mock expired. Start it again, nothing was lost.' })

  if (run.answers.some((a) => a === null)) {
    return res.status(400).json({ error: 'Answer every question first, then finish.' })
  }

  const total = run.answers.reduce((n, a) => n + a.score, 0)
  const score10 = Math.round((total / (run.answers.length * 9)) * 100) / 10

  // A mock teaches, so repeating one pays nothing: the first run of a round earns
  // XP, and after that the reward is the thing you actually learned.
  const first = priorRuns.get(user.id, run.level).n === 0
  const xp = first && !run.practice ? total : 0

  db.transaction(() => {
    insertRun.run({
      userId: user.id,
      level: run.level,
      company: run.company,
      items: JSON.stringify(
        run.questions.map((q, i) => ({ id: q.id, topic: q.topic, score: run.answers[i].score }))
      ),
      score: score10,
      xpAwarded: xp,
      source: run.source,
      timestamp: new Date().toISOString(),
      localDate: localDate(),
    })
    if (xp) addXp.run(xp, user.id)
  })()

  pending.delete(req.body.runId)

  const missed = run.questions
    .map((q, i) => ({ q, a: run.answers[i] }))
    .filter(({ a }) => a.score <= 3)
    .map(({ q }) => ({ topic: q.topic.replace(/-/g, ' '), lesson: q.lesson }))

  const done = mockDoneLevels(user.id)
  res.json({
    level: run.level,
    round: roundFor(run.level).name,
    score: score10,
    verdict: roundOf(score10),
    xp: { total: xp, before: user.xp, after: user.xp + xp },
    level_: levelFor(user.xp + xp),
    missed,
    unlocked: run.level <= (user.interviewLevel ?? 1),
    profile: trainingProfile(user.id, { mockDone: done, interviewLevel: user.interviewLevel ?? 1 }),
    topics: statsFor(user.id, 'mock-topic').length,
  })
})
