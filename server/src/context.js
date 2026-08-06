import { db, safeParse } from './db.js'
import { summariseLearner } from './ai.js'

/**
 * The derived half of personalisation.
 *
 * The naive approach is to stuff past attempts into every prompt. That grows
 * without bound and degrades output on a small model. Instead the model rewrites
 * a compact summary every REFRESH_EVERY attempts, and only that summary is ever
 * injected — cost stays flat no matter how long someone trains.
 */

const REFRESH_EVERY = 3
const WINDOW = 6

const selectContext = db.prepare('SELECT * FROM learner_context WHERE userId = ?')
const upsertContext = db.prepare(`
  INSERT INTO learner_context (userId, summary, recurringGaps, pushNext, attemptsAtUpdate, updatedAt)
  VALUES (@userId, @summary, @recurringGaps, @pushNext, @attemptsAtUpdate, @updatedAt)
  ON CONFLICT(userId) DO UPDATE SET
    summary = excluded.summary,
    recurringGaps = excluded.recurringGaps,
    pushNext = excluded.pushNext,
    attemptsAtUpdate = excluded.attemptsAtUpdate,
    updatedAt = excluded.updatedAt
`)

const recentAttempts = db.prepare(`
  SELECT a.trackId, t.name AS trackName, a.difficulty, a.scenarioText,
         a.userResponse, a.score, a.strengths, a.gaps
  FROM attempts a JOIN tracks t ON t.id = a.trackId
  WHERE a.userId = ?
  ORDER BY a.id DESC LIMIT ${WINDOW}
`)

const countAttempts = db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE userId = ?')

export function getContext(userId) {
  const row = selectContext.get(userId)
  if (!row) return { summary: '', recurringGaps: [], pushNext: '', attemptsAtUpdate: 0 }
  return { ...row, recurringGaps: safeParse(row.recurringGaps, []) }
}

/** Compact brief injected into scenario and evaluation prompts. */
export function contextBrief(userId) {
  const c = getContext(userId)
  if (!c.summary) return null
  return { summary: c.summary, gaps: c.recurringGaps, pushNext: c.pushNext }
}

export function needsRefresh(userId) {
  const total = countAttempts.get(userId).n
  if (total < 2) return false
  return total - getContext(userId).attemptsAtUpdate >= REFRESH_EVERY
}

/**
 * Rewrites the summary from the recent window. Called fire-and-forget after a
 * quest is scored, so it never sits on the request path — a failure just means
 * the summary is one cycle stale.
 */
export async function refreshContext(userId) {
  const attempts = recentAttempts.all(userId)
  if (attempts.length < 2) return null

  const previous = getContext(userId)
  const result = await summariseLearner({ attempts, previous })
  if (!result) return null

  upsertContext.run({
    userId,
    summary: result.summary,
    recurringGaps: JSON.stringify(result.recurringGaps ?? []),
    pushNext: result.pushNext ?? '',
    attemptsAtUpdate: countAttempts.get(userId).n,
    updatedAt: new Date().toISOString(),
  })
  return result
}

export function maybeRefresh(userId) {
  if (!needsRefresh(userId)) return
  refreshContext(userId).catch((e) => console.warn('[context] refresh failed:', e.message))
}
