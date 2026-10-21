import { db } from './db.js'

/**
 * Server-wide switches that have to survive a restart.
 *
 * Knack runs on the trainee's own machine, one server to one person, so a
 * setting here is the trainee's setting. Kept in the database rather than in
 * `.env` because someone on a train with no signal should be able to flip this
 * from the app, not from a text editor.
 */

const get = db.prepare('SELECT value FROM app_settings WHERE key = ?')
const put = db.prepare(
  `INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`
)

export const getSetting = (key, fallback = null) => get.get(key)?.value ?? fallback
export const setSetting = (key, value) => put.run(key, String(value), new Date().toISOString())

const TRUE = /^(1|true|yes|on)$/i

/** Set in the environment, the app cannot undo it: that is the point of setting it there. */
export const offlineLockedByEnv = () => TRUE.test(process.env.KNACK_OFFLINE ?? '')

/**
 * Offline means no request leaves this machine. Not "try the model and fall
 * back" — the model is never asked, so nothing is sent, nothing waits on a
 * timeout, and a trainee on a flaky connection gets the same speed every time.
 */
export const isOffline = () => offlineLockedByEnv() || TRUE.test(getSetting('offline', ''))

export function offlineStatus() {
  return {
    offline: isOffline(),
    lockedByEnv: offlineLockedByEnv(),
    hasKey: !!process.env.OPENROUTER_API_KEY,
  }
}
