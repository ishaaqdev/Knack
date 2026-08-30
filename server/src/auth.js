import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { db, findUserById } from './db.js'
import { seedAttributes } from './attributes.js'

const scryptAsync = promisify(scrypt)

export const SESSION_COOKIE = 'knack_session'
const SESSION_DAYS = 30

/* ------------------------------------------------------------ passwords -- */

// scrypt from Node's own crypto — memory-hard, OWASP-recommended, and it keeps
// the project free of a native build step on Windows.
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 }

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT)
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, saltB64, keyB64] = String(stored).split('$')
    if (scheme !== 'scrypt') return false

    const salt = Buffer.from(saltB64, 'base64')
    const expected = Buffer.from(keyB64, 'base64')
    const actual = await scryptAsync(password, salt, expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    })
    return timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

/* ------------------------------------------------------------- sessions -- */

const sha256 = (v) => createHash('sha256').update(v).digest('hex')

const insertSession = db.prepare(
  'INSERT INTO sessions (tokenHash, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)'
)
const selectSession = db.prepare('SELECT * FROM sessions WHERE tokenHash = ?')
const deleteSession = db.prepare('DELETE FROM sessions WHERE tokenHash = ?')

/** Returns the raw token for the cookie; only its hash is persisted, so a
 *  database leak does not hand over live sessions. */
export function createSession(userId) {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400_000)
  insertSession.run(sha256(token), userId, now.toISOString(), expires.toISOString())
  return { token, expires }
}

export function destroySession(token) {
  if (token) deleteSession.run(sha256(token))
}

export function userForToken(token) {
  if (!token) return null
  const row = selectSession.get(sha256(token))
  if (!row) return null

  if (Date.parse(row.expiresAt) < Date.now()) {
    deleteSession.run(row.tokenHash)
    return null
  }
  return findUserById(row.userId) ?? null
}

db.prepare('DELETE FROM sessions WHERE expiresAt < ?').run(new Date().toISOString())

/* ----------------------------------------------------------- middleware -- */

export function cookieOptions(expires) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  }
}

/** Attaches req.user when a valid session cookie is present. Never rejects. */
export function attachUser(req, _res, next) {
  req.user = userForToken(req.cookies?.[SESSION_COOKIE]) ?? null
  next()
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not signed in.' })
  next()
}

/**
 * Gameplay routes.
 *
 * The ten attributes are seeded here rather than on whichever screen happens to
 * be loaded first. They were originally seeded on the dashboard read, which
 * meant a trainee who went straight from onboarding into a level had no
 * attribute rows — and every delta written against them was silently dropped,
 * because there was nothing to update. Seeding at the gate makes that
 * impossible: nothing can score before the thing it scores into exists.
 *
 * Idempotent and cheap: one indexed lookup that returns early once seeded.
 */
export function requireOnboarded(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not signed in.' })
  if (!req.user.onboardedAt) return res.status(403).json({ error: 'Finish onboarding first.' })
  seedAttributes(req.user)
  next()
}

/* ---------------------------------------------------------- validation --- */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateCredentials({ email, password }) {
  if (!email || !EMAIL_RE.test(String(email).trim())) return 'Enter a valid email address.'
  if (!password || String(password).length < 8) return 'Password must be at least 8 characters.'
  if (String(password).length > 200) return 'That password is too long.'
  return null
}
