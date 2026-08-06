import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, '..', 'data')
mkdirSync(dataDir, { recursive: true })

export const db = new Database(join(dataDir, 'knack.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

/* --------------------------------------------------------------- schema --- */

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    email          TEXT,
    passwordHash   TEXT,
    name           TEXT    NOT NULL DEFAULT 'Trainee',
    xp             INTEGER NOT NULL DEFAULT 0,
    streak         INTEGER NOT NULL DEFAULT 0,
    longestStreak  INTEGER NOT NULL DEFAULT 0,
    lastActiveDate TEXT,
    createdAt      TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tracks (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    blurb       TEXT NOT NULL,
    sortOrder   INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    userId       INTEGER NOT NULL DEFAULT 1,
    trackId      TEXT    NOT NULL,
    difficulty   TEXT    NOT NULL DEFAULT 'medium',
    scenarioText TEXT    NOT NULL,
    userResponse TEXT    NOT NULL,
    score        INTEGER NOT NULL,
    feedback     TEXT    NOT NULL,
    strengths    TEXT    NOT NULL DEFAULT '',
    gaps         TEXT    NOT NULL DEFAULT '',
    suggestion   TEXT    NOT NULL DEFAULT '',
    xpAwarded    INTEGER NOT NULL,
    source       TEXT    NOT NULL DEFAULT 'ai',
    timestamp    TEXT    NOT NULL,
    localDate    TEXT    NOT NULL,
    FOREIGN KEY (trackId) REFERENCES tracks(id)
  );

  CREATE TABLE IF NOT EXISTS sessions (
    tokenHash TEXT PRIMARY KEY,
    userId    INTEGER NOT NULL,
    createdAt TEXT    NOT NULL,
    expiresAt TEXT    NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  -- The derived half of personalisation: a compact, model-written summary of
  -- what this learner keeps getting right and wrong. Rewritten every few
  -- attempts rather than accumulated, so prompt cost stays bounded.
  CREATE TABLE IF NOT EXISTS learner_context (
    userId           INTEGER PRIMARY KEY,
    summary          TEXT    NOT NULL DEFAULT '',
    recurringGaps    TEXT    NOT NULL DEFAULT '[]',
    pushNext         TEXT    NOT NULL DEFAULT '',
    attemptsAtUpdate INTEGER NOT NULL DEFAULT 0,
    updatedAt        TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_attempts_user_track ON attempts(userId, trackId, id DESC);
  CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(userId, id DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);
`)

/* ------------------------------------------------------------ migration --- */

/** Additive-only migration. Existing rows and attempts are never dropped. */
function addColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

// The onboarding profile — the "stated" half of personalisation.
addColumn('users', 'email', 'TEXT')
addColumn('users', 'passwordHash', 'TEXT')
addColumn('users', 'yearOfStudy', 'TEXT')
addColumn('users', 'branch', 'TEXT')
addColumn('users', 'targetRole', 'TEXT')
addColumn('users', 'experience', 'TEXT')
addColumn('users', 'workSetting', 'TEXT')
addColumn('users', 'confidence', "TEXT NOT NULL DEFAULT '{}'")
addColumn('users', 'focusAreas', "TEXT NOT NULL DEFAULT '[]'")
addColumn('users', 'onboardedAt', 'TEXT')

// Optional GitHub link — the distilled portfolio, never the raw READMEs.
addColumn('users', 'githubUsername', 'TEXT')
addColumn('users', 'githubBrief', 'TEXT')
addColumn('users', 'githubStack', "TEXT NOT NULL DEFAULT '[]'")
addColumn('users', 'githubDomains', "TEXT NOT NULL DEFAULT '[]'")
addColumn('users', 'githubLevel', 'TEXT')
addColumn('users', 'githubRepoCount', 'INTEGER')
addColumn('users', 'githubSyncedAt', 'TEXT')

// SQLite cannot add a UNIQUE column via ALTER TABLE, so the constraint lives in
// an index. Partial, because pre-auth legacy rows have a NULL email.
db.exec(
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL'
)

/* ----------------------------------------------------------- track seed --- */

export const TRACKS = [
  {
    id: 'workplace-communication',
    name: 'Workplace Communication',
    description: 'Say the hard thing clearly, kindly, and once.',
    blurb:
      'Standups, code review pushback, telling a manager the estimate slipped. Practise being direct without being blunt.',
    sortOrder: 0,
  },
  {
    id: 'critical-thinking',
    name: 'Critical Thinking',
    description: 'Find the real problem before you solve the wrong one.',
    blurb:
      'Ambiguous requirements, conflicting data, a decision with no obviously right answer. Practise reasoning out loud.',
    sortOrder: 1,
  },
  {
    id: 'ai-fluency',
    name: 'AI Fluency',
    description: 'Use AI well — and catch it when it is confidently wrong.',
    blurb:
      'Prompting, verification, and spotting hallucinated facts before they reach production. Practise healthy scepticism.',
    sortOrder: 2,
  },
]

const seedTrack = db.prepare(`
  INSERT INTO tracks (id, name, description, blurb, sortOrder)
  VALUES (@id, @name, @description, @blurb, @sortOrder)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    blurb = excluded.blurb,
    sortOrder = excluded.sortOrder
`)

db.transaction(() => TRACKS.forEach((t) => seedTrack.run(t)))()

/* ------------------------------------------------------------- helpers --- */

export const listTracks = () => db.prepare('SELECT * FROM tracks ORDER BY sortOrder').all()

export const findUserById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id)

export const findUserByEmail = (email) =>
  db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email)

/** Strips secrets and parses the JSON profile columns for API responses. */
export function publicUser(row) {
  if (!row) return null
  const { passwordHash, ...rest } = row
  return {
    ...rest,
    confidence: safeParse(row.confidence, {}),
    focusAreas: safeParse(row.focusAreas, []),
    onboarded: !!row.onboardedAt,
    github: row.githubUsername
      ? {
          username: row.githubUsername,
          brief: row.githubBrief,
          stack: safeParse(row.githubStack, []),
          domains: safeParse(row.githubDomains, []),
          level: row.githubLevel,
          repoCount: row.githubRepoCount,
          syncedAt: row.githubSyncedAt,
        }
      : null,
  }
}

export function safeParse(text, fallback) {
  try {
    const v = JSON.parse(text ?? '')
    return v ?? fallback
  } catch {
    return fallback
  }
}
