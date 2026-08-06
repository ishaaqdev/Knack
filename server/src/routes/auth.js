import { Router } from 'express'
import { db, findUserByEmail, findUserById, publicUser } from '../db.js'
import {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  destroySession,
  hashPassword,
  requireAuth,
  validateCredentials,
  verifyPassword,
} from '../auth.js'
import { FIELDS, CONFIDENCE_FIELD, MAX_FOCUS_AREAS, validateProfile } from '../profile.js'

export const authRouter = Router()

const insertUser = db.prepare(`
  INSERT INTO users (email, passwordHash, name, createdAt)
  VALUES (@email, @passwordHash, @name, @createdAt)
`)

/**
 * Attempts written before auth existed belong to the legacy local profile. The
 * first account created adopts them so an early demo run is not orphaned.
 */
function adoptLegacyProgress(newUserId) {
  const legacy = db.prepare('SELECT * FROM users WHERE email IS NULL ORDER BY id LIMIT 1').get()
  if (!legacy) return

  const { n } = db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE userId = ?').get(legacy.id)
  if (n === 0) {
    db.prepare('DELETE FROM users WHERE id = ?').run(legacy.id)
    return
  }

  db.transaction(() => {
    db.prepare('UPDATE attempts SET userId = ? WHERE userId = ?').run(newUserId, legacy.id)
    db.prepare(
      `UPDATE users SET xp = ?, streak = ?, longestStreak = ?, lastActiveDate = ? WHERE id = ?`
    ).run(legacy.xp, legacy.streak, legacy.longestStreak, legacy.lastActiveDate, newUserId)
    db.prepare('DELETE FROM users WHERE id = ?').run(legacy.id)
  })()
}

/* --------------------------------------------------- POST /api/auth/signup */

authRouter.post('/signup', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const password = String(req.body?.password ?? '')
    const name = String(req.body?.name ?? '').trim().slice(0, 40)

    const invalid = validateCredentials({ email, password })
    if (invalid) return res.status(400).json({ error: invalid })
    if (findUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with that email already exists.' })
    }

    const info = insertUser.run({
      email,
      passwordHash: await hashPassword(password),
      name: name || email.split('@')[0],
      createdAt: new Date().toISOString(),
    })

    adoptLegacyProgress(info.lastInsertRowid)

    const { token, expires } = createSession(info.lastInsertRowid)
    res.cookie(SESSION_COOKIE, token, cookieOptions(expires))
    res.status(201).json({ user: publicUser(findUserById(info.lastInsertRowid)) })
  } catch (err) {
    next(err)
  }
})

/* ---------------------------------------------------- POST /api/auth/login */

authRouter.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const password = String(req.body?.password ?? '')

    const user = findUserByEmail(email)
    // Same message and roughly the same work either way — do not leak which
    // emails have accounts.
    const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false
    if (!ok) return res.status(401).json({ error: 'Email or password is incorrect.' })

    const { token, expires } = createSession(user.id)
    res.cookie(SESSION_COOKIE, token, cookieOptions(expires))
    res.json({ user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

/* --------------------------------------------------- POST /api/auth/logout */

authRouter.post('/logout', (req, res) => {
  destroySession(req.cookies?.[SESSION_COOKIE])
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
})

/* ----------------------------------------------------- GET /api/auth/me -- */

authRouter.get('/me', (req, res) => {
  res.json({ user: publicUser(req.user) })
})

/* -------------------------------------------- GET /api/auth/onboarding --- */

/** Options are served from the server so validation and UI cannot drift. */
authRouter.get('/onboarding', (_req, res) => {
  res.json({ fields: FIELDS, confidence: CONFIDENCE_FIELD, maxFocusAreas: MAX_FOCUS_AREAS })
})

/* ------------------------------------------- POST /api/auth/onboarding --- */

authRouter.post('/onboarding', requireAuth, (req, res) => {
  const { errors, clean } = validateProfile(req.body)
  if (errors.length) return res.status(400).json({ error: errors[0], errors })

  db.prepare(
    `UPDATE users SET name = @name, yearOfStudy = @yearOfStudy, branch = @branch,
                      targetRole = @targetRole, experience = @experience,
                      workSetting = @workSetting, confidence = @confidence,
                      focusAreas = @focusAreas, onboardedAt = @onboardedAt
     WHERE id = @id`
  ).run({
    ...clean,
    confidence: JSON.stringify(clean.confidence),
    focusAreas: JSON.stringify(clean.focusAreas),
    onboardedAt: req.user.onboardedAt ?? new Date().toISOString(),
    id: req.user.id,
  })

  res.json({ user: publicUser(findUserById(req.user.id)) })
})
