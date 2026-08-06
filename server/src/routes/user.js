import { Router } from 'express'
import { db, findUserById, listTracks, publicUser } from '../db.js'
import { requireAuth } from '../auth.js'
import { validateProfile } from '../profile.js'
import { getContext } from '../context.js'
import {
  levelFor,
  localDate,
  streakStatus,
  allTrackScores,
  readinessScore,
  difficultyFor,
  weakestTrack,
  STREAK_BONUS,
} from '../gamification.js'

export const userRouter = Router()

userRouter.use(requireAuth)

const stats = db.prepare(`
  SELECT COUNT(*) AS quests,
         COALESCE(SUM(xpAwarded), 0) AS xpFromQuests,
         COALESCE(ROUND(AVG(score) * 10) / 10, 0) AS avgScore
  FROM attempts WHERE userId = ?
`)

const recent = db.prepare(`
  SELECT a.id, a.trackId, t.name AS trackName, a.score, a.xpAwarded, a.difficulty, a.timestamp
  FROM attempts a JOIN tracks t ON t.id = a.trackId
  WHERE a.userId = ?
  ORDER BY a.id DESC LIMIT 5
`)

/* ------------------------------------------------------- GET /api/user --- */

userRouter.get('/', (req, res) => {
  const user = req.user
  const today = localDate()
  const status = streakStatus(user, today)

  // A dead streak is reported as 0 immediately; the row is only rewritten on
  // the next completed quest, so reads stay side-effect free.
  if (status.stale) {
    db.prepare('UPDATE users SET streak = 0 WHERE id = ?').run(user.id)
  }

  const scores = allTrackScores(user.id)
  const s = stats.get(user.id)
  const hour = new Date().getHours()
  const ctx = getContext(user.id)

  res.json({
    ...publicUser(user),

    level: levelFor(user.xp),
    streak: status.streak,
    doneToday: status.doneToday,
    // Visual-only nudge: after 18:00 with today's quest still open.
    streakAtRisk: !status.doneToday && status.streak > 0 && hour >= 18,
    nextStreakBonus: STREAK_BONUS(status.doneToday ? status.streak : status.streak + 1),
    memberSince: user.createdAt,

    totalQuests: s.quests,
    avgScore: s.avgScore,

    tracks: listTracks().map((t) => ({
      ...t,
      ...scores[t.id],
      difficulty: difficultyFor(user, t.id),
    })),
    trackScores: scores,
    readinessScore: readinessScore(scores),
    weakestTrack: s.quests ? weakestTrack(scores).id : null,
    recent: recent.all(user.id),

    // What the app has worked out about them — surfaced so it is legible
    // rather than a black box.
    insight: ctx.summary
      ? { summary: ctx.summary, gaps: ctx.recurringGaps, pushNext: ctx.pushNext, updatedAt: ctx.updatedAt }
      : null,
  })
})

/* ------------------------------------------------ POST /api/user/reset --- */

userRouter.post('/reset', (req, res) => {
  db.transaction(() => {
    db.prepare('DELETE FROM attempts WHERE userId = ?').run(req.user.id)
    db.prepare('DELETE FROM learner_context WHERE userId = ?').run(req.user.id)
    db.prepare(
      `UPDATE users SET xp = 0, streak = 0, longestStreak = 0, lastActiveDate = NULL
       WHERE id = ?`
    ).run(req.user.id)
  })()
  res.json({ ok: true })
})

/* ------------------------------------------------- PATCH /api/user ------- */

/** Full profile edit — same validation as onboarding. */
userRouter.patch('/', (req, res) => {
  const { errors, clean } = validateProfile({ ...publicUser(req.user), ...req.body })
  if (errors.length) return res.status(400).json({ error: errors[0], errors })

  db.prepare(
    `UPDATE users SET name = @name, yearOfStudy = @yearOfStudy, branch = @branch,
                      targetRole = @targetRole, experience = @experience,
                      workSetting = @workSetting, confidence = @confidence,
                      focusAreas = @focusAreas
     WHERE id = @id`
  ).run({
    ...clean,
    confidence: JSON.stringify(clean.confidence),
    focusAreas: JSON.stringify(clean.focusAreas),
    id: req.user.id,
  })

  res.json({ user: publicUser(findUserById(req.user.id)) })
})
