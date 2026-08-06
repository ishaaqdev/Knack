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

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY,
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

  CREATE INDEX IF NOT EXISTS idx_attempts_track ON attempts(trackId, id DESC);
  CREATE INDEX IF NOT EXISTS idx_attempts_recent ON attempts(id DESC);
`)

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

// Single local profile — no auth in the MVP, so the user row is fixed at id 1.
db.prepare(
  `INSERT INTO users (id, name, xp, streak, longestStreak, lastActiveDate, createdAt)
   VALUES (1, 'Trainee', 0, 0, 0, NULL, @now)
   ON CONFLICT(id) DO NOTHING`
).run({ now: new Date().toISOString() })

export const getUser = () => db.prepare('SELECT * FROM users WHERE id = 1').get()
export const listTracks = () =>
  db.prepare('SELECT * FROM tracks ORDER BY sortOrder').all()
