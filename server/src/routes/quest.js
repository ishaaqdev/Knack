import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { db, findUserById, listTracks } from '../db.js'
import { generateScenario, evaluateResponse, generateLevel, evaluateLevel } from '../ai.js'
import { requireOnboarded } from '../auth.js'
import { profileBrief, portfolioBrief } from '../profile.js'
import { resumeBrief } from '../resume.js'
import { contextBrief, maybeRefresh } from '../context.js'
import { sampleShape } from '../variation.js'
import {
  levelFor,
  xpFor,
  levelXp,
  levelScore,
  localDate,
  streakStatus,
  streakAfterQuest,
  difficultyFor,
  trackScore,
  allTrackScores,
  readinessScore,
  weakestTrack,
} from '../gamification.js'

export const questRouter = Router()

questRouter.use(requireOnboarded)

const trackById = (id) => listTracks().find((t) => t.id === id)

const recentScenarios = db.prepare(
  'SELECT scenarioText FROM attempts WHERE userId = ? AND trackId = ? ORDER BY id DESC LIMIT 4'
)

/**
 * Scenarios that were generated but never answered — "Different scenario", or a
 * quest abandoned midway. Without this, `avoid` only sees completed attempts and
 * the button hands back near-duplicates. In memory on purpose: it is a
 * de-duplication hint, not data worth persisting.
 */
const justServed = new Map()
const SERVED_MAX = 6

const key = (userId, trackId) => `${userId}:${trackId}`

function servedState(userId, trackId) {
  return justServed.get(key(userId, trackId)) ?? { texts: [], turns: 0, lastRole: null, lastName: null }
}

function rememberServed(userId, trackId, text, shape) {
  const st = servedState(userId, trackId)
  st.texts = [text, ...st.texts].slice(0, SERVED_MAX)
  st.turns += 1
  st.lastRole = shape?.counterpart?.role ?? null
  st.lastName = shape?.name ?? null
  justServed.set(key(userId, trackId), st)
  // Bound the map so a long-lived server cannot grow without limit.
  if (justServed.size > 500) justServed.delete(justServed.keys().next().value)
}

const recentlyServed = (userId, trackId) => servedState(userId, trackId).texts

const trackAttemptCount = db.prepare(
  'SELECT COUNT(*) AS n FROM attempts WHERE userId = ? AND trackId = ?'
)

const insertAttempt = db.prepare(`
  INSERT INTO attempts
    (userId, trackId, difficulty, scenarioText, userResponse, score, feedback,
     strengths, gaps, suggestion, xpAwarded, source, timestamp, localDate)
  VALUES
    (@userId, @trackId, @difficulty, @scenarioText, @userResponse, @score, @feedback,
     @strengths, @gaps, @suggestion, @xpAwarded, @source, @timestamp, @localDate)
`)

const insertLevelAttempt = db.prepare(`
  INSERT INTO attempts
    (userId, trackId, difficulty, scenarioText, userResponse, score, feedback,
     strengths, gaps, suggestion, xpAwarded, source, kind, detail, timestamp, localDate)
  VALUES
    (@userId, @trackId, @difficulty, @scenarioText, @userResponse, @score, @feedback,
     @strengths, @gaps, @suggestion, @xpAwarded, @source, @kind, @detail, @timestamp, @localDate)
`)

const updateUser = db.prepare(`
  UPDATE users SET xp = @xp, streak = @streak, longestStreak = @longestStreak,
                   lastActiveDate = @lastActiveDate
  WHERE id = @id
`)

/* ------------------------------------------- POST /api/quest/generate ----- */

questRouter.post('/generate', async (req, res, next) => {
  try {
    const track = trackById(req.body?.trackId)
    if (!track) return res.status(400).json({ error: 'Unknown trackId' })

    const user = req.user
    const suggested = difficultyFor(user, track.id)
    const asked = req.body?.difficulty
    const difficulty = ['easy', 'medium', 'hard'].includes(asked) ? asked : suggested

    const avoid = [
      ...recentlyServed(user.id, track.id),
      ...recentScenarios.all(user.id, track.id).map((r) => r.scenarioText),
    ].slice(0, 8)

    // The shape counter continues across restarts by seeding from completed
    // attempts, so a returning trainee does not restart the rotation.
    const st = servedState(user.id, track.id)
    const shape = sampleShape(
      trackAttemptCount.get(user.id, track.id).n + st.turns,
      { role: st.lastRole, name: st.lastName }
    )

    const quest = await generateScenario({
      track,
      difficulty,
      avoid,
      shape,
      profile: profileBrief(user),
      learner: contextBrief(user.id),
      portfolio: portfolioBrief(user),
    })

    rememberServed(user.id, track.id, quest.scenarioText, shape)

    res.json({
      ...quest,
      trackId: track.id,
      trackName: track.name,
      suggestedDifficulty: suggested,
      skill: trackScore(user.id, track.id),
    })
  } catch (err) {
    next(err)
  }
})

/* ------------------------------------------- POST /api/quest/evaluate ----- */

questRouter.post('/evaluate', async (req, res, next) => {
  try {
    const { trackId, scenarioText, userResponse, difficulty = 'medium' } = req.body ?? {}
    const track = trackById(trackId)

    if (!track) return res.status(400).json({ error: 'Unknown trackId' })
    if (!scenarioText?.trim()) return res.status(400).json({ error: 'scenarioText is required' })
    if (!userResponse?.trim()) return res.status(400).json({ error: 'Write a response first.' })
    if (userResponse.length > 6000) return res.status(400).json({ error: 'Response is too long.' })

    const before = req.user
    const beforeLevel = levelFor(before.xp)
    const today = localDate()

    const evaluation = await evaluateResponse({
      track,
      difficulty,
      scenarioText,
      userResponse: userResponse.trim(),
      learner: contextBrief(before.id),
    })

    const { streak, event } = streakAfterQuest(before, today)
    const xp = xpFor(evaluation.score, streak)

    const afterXp = before.xp + xp.total
    const afterLevel = levelFor(afterXp)

    db.transaction(() => {
      insertAttempt.run({
        userId: before.id,
        trackId: track.id,
        difficulty,
        scenarioText,
        userResponse: userResponse.trim(),
        score: evaluation.score,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        gaps: evaluation.gaps,
        suggestion: evaluation.suggestion,
        xpAwarded: xp.total,
        source: evaluation.source,
        timestamp: new Date().toISOString(),
        localDate: today,
      })
      updateUser.run({
        id: before.id,
        xp: afterXp,
        streak,
        longestStreak: Math.max(before.longestStreak, streak),
        lastActiveDate: today,
      })
    })()

    const scores = allTrackScores(before.id)
    const weakest = weakestTrack(scores)

    res.json({
      score: evaluation.score,
      strengths: evaluation.strengths,
      gaps: evaluation.gaps,
      suggestion: evaluation.suggestion,
      feedback: evaluation.feedback,
      offlineNote: evaluation.offlineNote ?? null,
      source: evaluation.source,

      xp: { ...xp, before: before.xp, after: afterXp },
      streak: { value: streak, event, before: streakStatus(before, today).streak },
      levelUp: afterLevel.index > beforeLevel.index ? afterLevel : null,
      level: afterLevel,

      trackScores: scores,
      readinessScore: readinessScore(scores),
      nudge:
        weakest.score < 70 && weakest.id !== track.id
          ? { id: weakest.id, name: weakest.name, score: weakest.score }
          : null,
    })

    // Off the request path — the learner summary is allowed to be one cycle
    // stale, but the user should never wait on it.
    maybeRefresh(before.id)
  } catch (err) {
    next(err)
  }
})

/* ------------------------------------------------ POST /quest/level/... --- */

/**
 * A level in flight.
 *
 * The generated options carry their own scores, so they cannot round-trip
 * through the browser — a level is held here and the client submits only the
 * choices it made. Bounded and time-limited: this is a scoreboard, not storage.
 */
const pendingLevels = new Map()
const LEVEL_TTL_MS = 3 * 60 * 60 * 1000
const PENDING_MAX = 200

function stashLevel(payload) {
  const id = randomUUID()
  pendingLevels.set(id, { ...payload, createdAt: Date.now() })
  if (pendingLevels.size > PENDING_MAX) {
    for (const [k, v] of pendingLevels) {
      if (Date.now() - v.createdAt > LEVEL_TTL_MS) pendingLevels.delete(k)
    }
    while (pendingLevels.size > PENDING_MAX) {
      pendingLevels.delete(pendingLevels.keys().next().value)
    }
  }
  return id
}

function takeLevel(id, userId) {
  const level = pendingLevels.get(id)
  if (!level || level.userId !== userId) return null
  if (Date.now() - level.createdAt > LEVEL_TTL_MS) {
    pendingLevels.delete(id)
    return null
  }
  return level
}

questRouter.post('/level/generate', async (req, res, next) => {
  try {
    const track = trackById(req.body?.trackId)
    if (!track) return res.status(400).json({ error: 'Unknown trackId' })

    const user = req.user
    const suggested = difficultyFor(user, track.id)
    const asked = req.body?.difficulty
    const difficulty = ['easy', 'medium', 'hard'].includes(asked) ? asked : suggested

    const avoid = [
      ...recentlyServed(user.id, track.id),
      ...recentScenarios.all(user.id, track.id).map((r) => r.scenarioText),
    ].slice(0, 8)

    const st = servedState(user.id, track.id)
    const n = trackAttemptCount.get(user.id, track.id).n + st.turns
    const shape = sampleShape(n, { role: st.lastRole, name: st.lastName })

    const context = {
      profile: profileBrief(user),
      learner: contextBrief(user.id),
      portfolio: portfolioBrief(user),
      resume: resumeBrief(user),
    }

    const choices = await generateLevel({ track, difficulty, shape, avoid, n, ...context })

    /*
     * The written stage is generated *after* the choices, not alongside them.
     *
     * Two concurrent requests to one free-tier model queue behind each other,
     * and a level then takes longer than anyone will sit through. Starting it
     * here and not awaiting it puts the second generation underneath the ninety
     * seconds the trainee spends on the four questions, so by the time they
     * reach the last stage it is almost always already waiting. It never
     * rejects — generateScenario falls back to the offline bank internally.
     */
    const writtenPromise = generateScenario({
      track,
      difficulty,
      avoid,
      shape: sampleShape(n + 7, { role: shape.counterpart.role, name: shape.name }),
      ...context,
    })

    const levelId = stashLevel({
      userId: user.id,
      trackId: track.id,
      difficulty,
      setting: choices.setting,
      questions: choices.questions,
      writtenPromise,
    })

    writtenPromise.then((w) => rememberServed(user.id, track.id, w.scenarioText, shape))

    res.json({
      levelId,
      trackId: track.id,
      trackName: track.name,
      difficulty,
      suggestedDifficulty: suggested,
      setting: choices.setting,
      // Scores and rationales stay on the server until the level is graded.
      stages: choices.questions.map((q) => ({
        situation: q.situation,
        question: q.question,
        options: q.options.map((o) => o.text),
      })),
      source: choices.source,
      skill: trackScore(user.id, track.id),
    })
  } catch (err) {
    next(err)
  }
})

/* ------------------------------- GET /quest/level/written/:levelId -------- */

questRouter.get('/level/written/:levelId', async (req, res, next) => {
  try {
    const level = takeLevel(req.params.levelId, req.user.id)
    if (!level) {
      return res.status(410).json({ error: 'This level expired. Start a fresh one.' })
    }

    // Usually already resolved by now; if not, this is the only place the
    // trainee waits for it, and they have just finished four questions.
    const written = await level.writtenPromise
    level.written = written

    res.json({
      scenarioText: written.scenarioText,
      taskPrompt: written.taskPrompt,
      source: written.source,
    })
  } catch (err) {
    next(err)
  }
})

questRouter.post('/level/submit', async (req, res, next) => {
  try {
    const { levelId, answers, response } = req.body ?? {}
    const before = req.user

    const level = takeLevel(levelId, before.id)
    if (!level) {
      return res.status(410).json({
        error: 'This level expired. Start a fresh one — your earlier progress is safe.',
      })
    }

    const track = trackById(level.trackId)
    const written = String(response ?? '').trim()
    if (!written) return res.status(400).json({ error: 'Write a response to the last stage first.' })
    if (written.length > 6000) return res.status(400).json({ error: 'Response is too long.' })

    // Reconcile the client's picks against the level we actually served. An
    // out-of-range index or a missing answer is treated as unanswered, not as
    // an error — a partial level should still be gradeable.
    const picks = level.questions.map((q, i) => {
      const a = Array.isArray(answers) ? answers[i] : null
      const choice = Number.isInteger(a?.choice) && q.options[a.choice] ? a.choice : null
      const custom = typeof a?.custom === 'string' ? a.custom.trim().slice(0, 1200) : ''
      return { q, i, choice, custom: choice === null ? custom : '' }
    })

    const customs = picks
      .filter((p) => p.custom)
      .map((p) => ({ i: p.i, situation: p.q.situation, question: p.q.question, answer: p.custom }))

    const writtenStage = level.written ?? (await level.writtenPromise)

    const evaluation = await evaluateLevel({
      track,
      difficulty: level.difficulty,
      scenarioText: writtenStage.scenarioText,
      userResponse: written,
      customs,
      learner: contextBrief(before.id),
    })

    // The grader indexes by position in the customs list; the stages below are
    // indexed by question. Translate once, here.
    const customScore = new Map()
    for (const [k, c] of (evaluation.custom ?? []).entries()) {
      const entry = customs[c.i] ?? customs[k]
      if (entry) customScore.set(entry.i, c)
    }

    const stages = picks.map((p) => {
      if (p.choice !== null) {
        const opt = p.q.options[p.choice]
        return {
          situation: p.q.situation,
          question: p.q.question,
          options: p.q.options.map((o) => o.text),
          chosen: p.choice,
          custom: '',
          score: opt.score,
          why: opt.why,
          // What they should have picked, shown only after the level is graded.
          best: p.q.options.reduce((b, o, k) => (o.score > p.q.options[b].score ? k : b), 0),
        }
      }
      const graded = customScore.get(p.i)
      return {
        situation: p.q.situation,
        question: p.q.question,
        options: p.q.options.map((o) => o.text),
        chosen: null,
        custom: p.custom,
        score: p.custom ? (graded?.score ?? 5) : 1,
        why: p.custom
          ? graded?.why || 'Scored as a written answer.'
          : 'Skipped — an unanswered question scores the same as the worst option.',
        best: p.q.options.reduce((b, o, k) => (o.score > p.q.options[b].score ? k : b), 0),
      }
    })

    const mcqScores = stages.map((s) => s.score)
    const score = levelScore(mcqScores, evaluation.score)

    const beforeLevel = levelFor(before.xp)
    const today = localDate()
    const { streak, event } = streakAfterQuest(before, today)
    const xp = levelXp(mcqScores, evaluation.score, streak)

    const afterXp = before.xp + xp.total
    const afterLevel = levelFor(afterXp)

    db.transaction(() => {
      insertLevelAttempt.run({
        userId: before.id,
        trackId: track.id,
        difficulty: level.difficulty,
        scenarioText: writtenStage.scenarioText,
        userResponse: written,
        score,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        gaps: evaluation.gaps,
        suggestion: evaluation.suggestion,
        xpAwarded: xp.total,
        source: evaluation.source,
        kind: 'level',
        detail: JSON.stringify({
          setting: level.setting,
          stages,
          writtenScore: evaluation.score,
          taskPrompt: writtenStage.taskPrompt,
        }),
        timestamp: new Date().toISOString(),
        localDate: today,
      })
      updateUser.run({
        id: before.id,
        xp: afterXp,
        streak,
        longestStreak: Math.max(before.longestStreak, streak),
        lastActiveDate: today,
      })
    })()

    pendingLevels.delete(levelId)

    const scores = allTrackScores(before.id)
    const weakest = weakestTrack(scores)

    res.json({
      kind: 'level',
      score,
      writtenScore: evaluation.score,
      stages,
      strengths: evaluation.strengths,
      gaps: evaluation.gaps,
      suggestion: evaluation.suggestion,
      feedback: evaluation.feedback,
      offlineNote: evaluation.offlineNote ?? null,
      source: evaluation.source,

      xp: { ...xp, before: before.xp, after: afterXp },
      streak: { value: streak, event, before: streakStatus(before, today).streak },
      levelUp: afterLevel.index > beforeLevel.index ? afterLevel : null,
      level: afterLevel,

      trackScores: scores,
      readinessScore: readinessScore(scores),
      nudge:
        weakest.score < 70 && weakest.id !== track.id
          ? { id: weakest.id, name: weakest.name, score: weakest.score }
          : null,
    })

    maybeRefresh(before.id)
  } catch (err) {
    next(err)
  }
})
