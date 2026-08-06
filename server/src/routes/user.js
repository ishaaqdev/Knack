import { Router } from 'express'
import { db, getUser, listTracks } from '../db.js'
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

const stats = db.prepare(`
  SELECT COUNT(*) AS quests,
         COALESCE(SUM(xpAwarded), 0) AS xpFromQuests,
         COALESCE(ROUND(AVG(score) * 10) / 10, 0) AS avgScore
  FROM attempts
`)

const recent = db.prepare(`
  SELECT a.id, a.trackId, t.name AS trackName, a.score, a.xpAwarded, a.difficulty, a.timestamp
  FROM attempts a JOIN tracks t ON t.id = a.trackId
  ORDER BY a.id DESC LIMIT ?
`)

/* ------------------------------------------------------- GET /api/user --- */

userRouter.get('/', (_req, res) => {
  const user = getUser()
  const today = localDate()
  const status = streakStatus(user, today)

  // A dead streak is reported as 0 immediately; the row is only rewritten on
  // the next completed quest, so reads stay side-effect free.
  if (status.stale) {
    db.prepare('UPDATE users SET streak = 0 WHERE id = 1').run()
  }

  const scores = allTrackScores()
  const s = stats.get()
  const hour = new Date().getHours()

  res.json({
    id: user.id,
    name: user.name,
    xp: user.xp,
    level: levelFor(user.xp),
    streak: status.streak,
    longestStreak: user.longestStreak,
    doneToday: status.doneToday,
    // Visual-only nudge: after 18:00 with today's quest still open.
    streakAtRisk: !status.doneToday && status.streak > 0 && hour >= 18,
    nextStreakBonus: STREAK_BONUS(status.doneToday ? status.streak : status.streak + 1),
    lastActiveDate: user.lastActiveDate,
    memberSince: user.createdAt,

    totalQuests: s.quests,
    avgScore: s.avgScore,

    tracks: listTracks().map((t) => ({
      ...t,
      ...scores[t.id],
      difficulty: difficultyFor(t.id),
    })),
    trackScores: scores,
    readinessScore: readinessScore(scores),
    weakestTrack: s.quests ? weakestTrack(scores).id : null,
    recent: recent.all(5),
  })
})

/* ------------------------------------------------ POST /api/user/reset --- */

userRouter.post('/reset', (_req, res) => {
  db.transaction(() => {
    db.prepare('DELETE FROM attempts').run()
    db.prepare(
      `UPDATE users SET xp = 0, streak = 0, longestStreak = 0,
                        lastActiveDate = NULL, createdAt = @now WHERE id = 1`
    ).run({ now: new Date().toISOString() })
  })()
  res.json({ ok: true })
})

/* ------------------------------------------------- PATCH /api/user ------- */

userRouter.patch('/', (req, res) => {
  const name = String(req.body?.name ?? '').trim().slice(0, 32)
  if (!name) return res.status(400).json({ error: 'Name cannot be empty.' })
  db.prepare('UPDATE users SET name = ? WHERE id = 1').run(name)
  res.json({ ok: true, name })
})
