import express, { Router } from 'express'
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
import { fetchProfile, profileForPrompt, GitHubError } from '../github.js'
import { summarisePortfolio, summariseResume } from '../ai.js'
import {
  extractResumeText,
  cleanResumeText,
  looksLikeProse,
  ResumeError,
  MAX_UPLOAD_BYTES,
} from '../resume.js'

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

/* ----------------------------------------------- POST /api/auth/github --- */

const saveGithub = db.prepare(`
  UPDATE users SET githubUsername = @githubUsername, githubBrief = @githubBrief,
                   githubStack = @githubStack, githubDomains = @githubDomains,
                   githubLevel = @githubLevel, githubRepoCount = @githubRepoCount,
                   githubSyncedAt = @githubSyncedAt
  WHERE id = @id
`)

/**
 * Links a public GitHub account. Fetches, distils to a short brief, stores only
 * the brief — raw READMEs never touch a scenario prompt.
 */
authRouter.post('/github', requireAuth, async (req, res, next) => {
  const username = String(req.body?.username ?? '')
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\/.*$/, '')

  if (!username) return res.status(400).json({ error: 'Enter your GitHub username.' })

  try {
    const profile = await fetchProfile(username)

    if (!profile.repos.length) {
      return res.status(422).json({
        error: `${profile.username} has no public repositories of their own yet, so there is nothing to read. You can skip this — it is optional.`,
      })
    }

    const summary = await summarisePortfolio({
      raw: profileForPrompt(profile),
      username: profile.username,
    })

    saveGithub.run({
      id: req.user.id,
      githubUsername: profile.username,
      githubBrief: summary.brief,
      githubStack: JSON.stringify(summary.stack),
      githubDomains: JSON.stringify(summary.domains),
      githubLevel: summary.level,
      githubRepoCount: profile.repos.length,
      githubSyncedAt: new Date().toISOString(),
    })

    res.json({ user: publicUser(findUserById(req.user.id)) })
  } catch (err) {
    if (err instanceof GitHubError) return res.status(err.status).json({ error: err.message })
    // A model failure here must not save a fabricated portfolio.
    console.warn('[github] distillation failed:', err.message)
    return res.status(503).json({
      error: 'Read your GitHub, but the model was busy summarising it. Try again in a moment.',
    })
  }
})

/* --------------------------------------------- DELETE /api/auth/github --- */

authRouter.delete('/github', requireAuth, (req, res) => {
  db.prepare(
    `UPDATE users SET githubUsername = NULL, githubBrief = NULL, githubStack = '[]',
                      githubDomains = '[]', githubLevel = NULL, githubRepoCount = NULL,
                      githubSyncedAt = NULL
     WHERE id = ?`
  ).run(req.user.id)
  res.json({ user: publicUser(findUserById(req.user.id)) })
})

/* ----------------------------------------------- POST /api/auth/resume --- */

const saveResume = db.prepare(`
  UPDATE users SET resumeText = @resumeText, resumeBrief = @resumeBrief,
                   resumeSkills = @resumeSkills, resumeProjects = @resumeProjects,
                   resumeHighlights = @resumeHighlights, resumeFileName = @resumeFileName,
                   resumeUpdatedAt = @resumeUpdatedAt
  WHERE id = @id
`)

/**
 * Distils and stores an extracted resume.
 *
 * The raw text is kept because the mock interviewer legitimately needs the whole
 * document; everything else reads the distilled fields. A model failure saves
 * nothing — an unread resume is honest, a fabricated one is not.
 */
async function ingestResume(req, res, text, fileName) {
  if (!looksLikeProse(text)) {
    return res.status(422).json({
      error: 'That does not look like enough resume text to work with. Paste the whole thing — education, skills and projects.',
    })
  }

  try {
    const summary = await summariseResume({ text, name: req.user.name })

    saveResume.run({
      id: req.user.id,
      resumeText: text,
      resumeBrief: summary.brief,
      resumeSkills: JSON.stringify(summary.skills),
      resumeProjects: JSON.stringify(summary.projects),
      resumeHighlights: JSON.stringify(summary.highlights),
      resumeFileName: fileName || null,
      resumeUpdatedAt: new Date().toISOString(),
    })

    res.json({ user: publicUser(findUserById(req.user.id)) })
  } catch (err) {
    console.warn('[resume] distillation failed |', (err.tried ?? []).join(' | ') || err.message)
    res.status(503).json({
      error: 'Read your resume, but the model was busy summarising it. Try again in a moment.',
    })
  }
}

/** Pasted text. */
authRouter.post('/resume', requireAuth, async (req, res, next) => {
  try {
    const text = cleanResumeText(req.body?.text)
    if (!text) return res.status(400).json({ error: 'Paste your resume text first.' })
    await ingestResume(req, res, text, null)
  } catch (err) {
    next(err)
  }
})

/**
 * Uploaded file. Raw body rather than a multipart parser — one file, no fields,
 * and no dependency. The name travels in a header.
 */
authRouter.post(
  '/resume/file',
  requireAuth,
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
  async (req, res, next) => {
    try {
      const fileName = String(req.get('x-resume-filename') ?? '')
        .replace(/[^\w.\- ]/g, '')
        .slice(0, 80)

      const text = extractResumeText(req.body, fileName)
      await ingestResume(req, res, text, fileName)
    } catch (err) {
      if (err instanceof ResumeError) return res.status(err.status).json({ error: err.message })
      next(err)
    }
  }
)

/* --------------------------------------------- DELETE /api/auth/resume --- */

authRouter.delete('/resume', requireAuth, (req, res) => {
  db.prepare(
    `UPDATE users SET resumeText = NULL, resumeBrief = NULL, resumeSkills = '[]',
                      resumeProjects = '[]', resumeHighlights = '[]',
                      resumeFileName = NULL, resumeUpdatedAt = NULL
     WHERE id = ?`
  ).run(req.user.id)
  res.json({ user: publicUser(findUserById(req.user.id)) })
})
