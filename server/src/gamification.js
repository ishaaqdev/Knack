import { db, TRACKS } from './db.js'
import { startingDifficulty } from './profile.js'

/* ---------------------------------------------------------------- levels -- */

// Rebalanced when a quest became a five-stage level. A level pays up to ~200 XP
// against the ~100 a single written scenario paid, so the bands were widened by
// the same factor — the number of sessions to Expert is unchanged.
export const LEVELS = [
  { name: 'Novice', title: 'Quest Rookie', min: 0, max: 400 },
  { name: 'Intermediate', title: 'Steady Hand', min: 400, max: 1200 },
  { name: 'Advanced', title: 'Sharp Operator', min: 1200, max: 2600 },
  { name: 'Expert', title: 'Knack for It', min: 2600, max: Infinity },
]

export function levelFor(xp) {
  const idx = LEVELS.findIndex((l) => xp >= l.min && xp < l.max)
  const i = idx === -1 ? LEVELS.length - 1 : idx
  const level = LEVELS[i]
  const next = LEVELS[i + 1] ?? null
  const span = next ? level.max - level.min : 1
  return {
    name: level.name,
    title: level.title,
    index: i,
    xpIntoLevel: xp - level.min,
    xpForLevel: next ? span : null,
    xpToNext: next ? next.min - xp : null,
    nextName: next?.name ?? null,
    // 0..1 fill of the header ring; a maxed-out Expert reads as full.
    progress: next ? Math.min(1, (xp - level.min) / span) : 1,
  }
}

/* -------------------------------------------------------------- xp rules -- */

export const STREAK_BONUS = (streak) => (streak >= 7 ? 10 : streak >= 3 ? 5 : 0)

export function xpFor(score, streakAfter) {
  const base = score * 10
  const bonus = STREAK_BONUS(streakAfter)
  return { base, bonus, total: base + bonus }
}

/**
 * A five-stage level: four judgement calls plus one written response.
 *
 * The written stage is worth as much as all four choices together. Picking the
 * right option shows recognition; writing the message shows you can actually do
 * it, and that is the harder half.
 */
export const MCQ_XP = (score) => Math.round(Math.max(0, Math.min(10, score)) * 2.5)

export function levelXp(mcqScores, writtenScore, streakAfter) {
  const mcq = mcqScores.reduce((sum, s) => sum + MCQ_XP(s), 0)
  const written = Math.max(0, Math.min(10, writtenScore)) * 10
  const bonus = STREAK_BONUS(streakAfter)
  return { mcq, written, base: mcq + written, bonus, total: mcq + written + bonus }
}

/** Weighted level score on the same 1-10 scale every other score uses. */
export function levelScore(mcqScores, writtenScore) {
  const mean = mcqScores.length
    ? mcqScores.reduce((a, b) => a + b, 0) / mcqScores.length
    : writtenScore
  return Math.max(1, Math.min(10, Math.round(0.4 * mean + 0.6 * writtenScore)))
}

/* --------------------------------------------------------------- streaks -- */

/** Local calendar date as YYYY-MM-DD. The server runs on the student's own
 *  machine, so server-local == user-local. */
export function localDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const dayDiff = (a, b) =>
  Math.round((Date.parse(`${a}T00:00:00`) - Date.parse(`${b}T00:00:00`)) / 86400000)

/**
 * Streak state *as of today*, without writing anything. A streak whose last
 * activity is 2+ days old is already dead, so the dashboard must show 0 even
 * before the next quest is submitted.
 */
export function streakStatus(user, today = localDate()) {
  const last = user.lastActiveDate
  if (!last) return { streak: 0, doneToday: false, atRisk: false, stale: user.streak > 0 }

  const gap = dayDiff(today, last)
  if (gap === 0) return { streak: user.streak, doneToday: true, atRisk: false, stale: false }
  if (gap === 1) return { streak: user.streak, doneToday: false, atRisk: true, stale: false }
  return { streak: 0, doneToday: false, atRisk: false, stale: user.streak > 0 }
}

/** What the streak becomes once a quest is completed today. */
export function streakAfterQuest(user, today = localDate()) {
  const { streak, doneToday } = streakStatus(user, today)
  if (doneToday) return { streak, event: 'held' }
  if (streak > 0) return { streak: streak + 1, event: 'extended' }
  return { streak: 1, event: user.longestStreak > 0 ? 'restarted' : 'started' }
}

/* ---------------------------------------------------- per-track skill -------- */

export const ROLLING_WINDOW = 5

const recentScores = db.prepare(
  `SELECT score FROM attempts WHERE userId = ? AND trackId = ? ORDER BY id DESC LIMIT ${ROLLING_WINDOW}`
)
const trackCount = db.prepare(
  'SELECT COUNT(*) AS n FROM attempts WHERE userId = ? AND trackId = ?'
)

/** Rolling mean of the last N scores in a track, scaled 1-10 -> 0-100. */
export function trackScore(userId, trackId) {
  const rows = recentScores.all(userId, trackId)
  const attempts = trackCount.get(userId, trackId).n
  if (!rows.length) return { score: 0, attempts: 0, trend: 0 }

  const mean = rows.reduce((s, r) => s + r.score, 0) / rows.length
  // Trend = newest half vs oldest half of the window; drives adaptive difficulty.
  let trend = 0
  if (rows.length >= 4) {
    const half = Math.floor(rows.length / 2)
    const newer = rows.slice(0, half)
    const older = rows.slice(rows.length - half)
    const avg = (a) => a.reduce((s, r) => s + r.score, 0) / a.length
    trend = Math.round((avg(newer) - avg(older)) * 10) / 10
  }
  return { score: Math.round(mean * 10), attempts, trend }
}

export function allTrackScores(userId) {
  return Object.fromEntries(TRACKS.map((t) => [t.id, trackScore(userId, t.id)]))
}

/** Composite headline metric: plain mean of the three track scores.
 *  Untouched tracks count as 0 — readiness is meant to reward breadth. */
export function readinessScore(scores) {
  const vals = TRACKS.map((t) => scores[t.id]?.score ?? 0)
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

/* ---------------------------------------------------- adaptive difficulty -- */

export function difficultyFor(user, trackId) {
  const { score, attempts, trend } = trackScore(user.id, trackId)
  // Before there is any performance data, self-rated confidence picks the entry
  // point. It never touches the score itself.
  if (attempts === 0) return startingDifficulty(user, trackId)

  let tier = score >= 75 ? 2 : score >= 45 ? 1 : 0
  // Nudge one step on a clear run in either direction.
  if (trend >= 1 && tier < 2) tier += 1
  if (trend <= -1 && tier > 0) tier -= 1
  return ['easy', 'medium', 'hard'][tier]
}

/** The track most in need of work — powers the forward-nudge on Feedback. */
export function weakestTrack(scores) {
  return TRACKS.map((t) => ({ ...t, ...scores[t.id] })).sort(
    (a, b) => a.score - b.score || a.attempts - b.attempts
  )[0]
}
