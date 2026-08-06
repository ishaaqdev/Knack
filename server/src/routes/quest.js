import { Router } from 'express'
import { db, findUserById, listTracks } from '../db.js'
import { generateScenario, evaluateResponse } from '../ai.js'
import { requireOnboarded } from '../auth.js'
import { profileBrief } from '../profile.js'
import { contextBrief, maybeRefresh } from '../context.js'
import {
  levelFor,
  xpFor,
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

const insertAttempt = db.prepare(`
  INSERT INTO attempts
    (userId, trackId, difficulty, scenarioText, userResponse, score, feedback,
     strengths, gaps, suggestion, xpAwarded, source, timestamp, localDate)
  VALUES
    (@userId, @trackId, @difficulty, @scenarioText, @userResponse, @score, @feedback,
     @strengths, @gaps, @suggestion, @xpAwarded, @source, @timestamp, @localDate)
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

    const quest = await generateScenario({
      track,
      difficulty,
      avoid: recentScenarios.all(user.id, track.id).map((r) => r.scenarioText),
      profile: profileBrief(user),
      learner: contextBrief(user.id),
    })

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
