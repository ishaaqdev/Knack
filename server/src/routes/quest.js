import { Router } from 'express'
import { db, getUser, listTracks } from '../db.js'
import { generateScenario, evaluateResponse } from '../ai.js'
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

const trackById = (id) => listTracks().find((t) => t.id === id)

const recentScenarios = db.prepare(
  'SELECT scenarioText FROM attempts WHERE trackId = ? ORDER BY id DESC LIMIT 4'
)

const insertAttempt = db.prepare(`
  INSERT INTO attempts
    (userId, trackId, difficulty, scenarioText, userResponse, score, feedback,
     strengths, gaps, suggestion, xpAwarded, source, timestamp, localDate)
  VALUES
    (1, @trackId, @difficulty, @scenarioText, @userResponse, @score, @feedback,
     @strengths, @gaps, @suggestion, @xpAwarded, @source, @timestamp, @localDate)
`)

const updateUser = db.prepare(`
  UPDATE users SET xp = @xp, streak = @streak, longestStreak = @longestStreak,
                   lastActiveDate = @lastActiveDate
  WHERE id = 1
`)

/* ------------------------------------------- POST /api/quest/generate ----- */

questRouter.post('/generate', async (req, res, next) => {
  try {
    const track = trackById(req.body?.trackId)
    if (!track) return res.status(400).json({ error: 'Unknown trackId' })

    // Difficulty is derived server-side from the rolling skill score. A client
    // may override it (used by the "try harder" control), but never raise it
    // beyond one step above what the score justifies.
    const suggested = difficultyFor(track.id)
    const asked = req.body?.difficulty
    const difficulty = ['easy', 'medium', 'hard'].includes(asked) ? asked : suggested

    const avoid = recentScenarios.all(track.id).map((r) => r.scenarioText)
    const quest = await generateScenario({ track, difficulty, avoid })

    res.json({
      ...quest,
      trackId: track.id,
      trackName: track.name,
      suggestedDifficulty: suggested,
      skill: trackScore(track.id),
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

    const before = getUser()
    const beforeLevel = levelFor(before.xp)
    const today = localDate()

    const evaluation = await evaluateResponse({
      track,
      difficulty,
      scenarioText,
      userResponse: userResponse.trim(),
    })

    const { streak, event } = streakAfterQuest(before, today)
    const xp = xpFor(evaluation.score, streak)

    const afterXp = before.xp + xp.total
    const afterLevel = levelFor(afterXp)

    db.transaction(() => {
      insertAttempt.run({
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
        xp: afterXp,
        streak,
        longestStreak: Math.max(before.longestStreak, streak),
        lastActiveDate: today,
      })
    })()

    const scores = allTrackScores()
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
      // Powers the personalised forward-nudge; null once everything is strong.
      nudge: weakest.score < 70 && weakest.id !== track.id ? { id: weakest.id, name: weakest.name, score: weakest.score } : null,
    })
  } catch (err) {
    next(err)
  }
})
