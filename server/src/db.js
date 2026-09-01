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

  -- One completed interview round per row. Kept out of the attempts table
  -- because an interview is not a track and must not move the track scores.
  CREATE TABLE IF NOT EXISTS interview_runs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    userId     INTEGER NOT NULL,
    level      INTEGER NOT NULL,
    role       TEXT    NOT NULL DEFAULT '',
    questions  TEXT    NOT NULL DEFAULT '[]',
    answers    TEXT    NOT NULL DEFAULT '[]',
    perAnswer  TEXT    NOT NULL DEFAULT '[]',
    score      INTEGER NOT NULL,
    verdict    TEXT    NOT NULL DEFAULT '',
    strengths  TEXT    NOT NULL DEFAULT '',
    gaps       TEXT    NOT NULL DEFAULT '',
    nextFocus  TEXT    NOT NULL DEFAULT '',
    xpAwarded  INTEGER NOT NULL DEFAULT 0,
    source     TEXT    NOT NULL DEFAULT 'ai',
    timestamp  TEXT    NOT NULL,
    localDate  TEXT    NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  -- The ten permanent professional attributes, one row per user per attribute.
  -- Key/value rather than ten columns: the set is meant to be inspectable and
  -- extendable, and every write is a delta with a reason attached.
  CREATE TABLE IF NOT EXISTS attributes (
    userId    INTEGER NOT NULL,
    key       TEXT    NOT NULL,
    value     REAL    NOT NULL DEFAULT 50,
    updatedAt TEXT,
    PRIMARY KEY (userId, key),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Why an attribute moved. This is what lets the app say "Leadership 27 to 31
  -- because you coordinated two people under a deadline" instead of a number
  -- changing on its own.
  CREATE TABLE IF NOT EXISTS attribute_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    userId    INTEGER NOT NULL,
    key       TEXT    NOT NULL,
    delta     REAL    NOT NULL,
    before    REAL    NOT NULL,
    after     REAL    NOT NULL,
    reason    TEXT    NOT NULL DEFAULT '',
    source    TEXT    NOT NULL DEFAULT '',
    at        TEXT    NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Persistent colleagues. Created when the trainee joins the company and kept
  -- for the rest of the simulation.
  CREATE TABLE IF NOT EXISTS characters (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    userId        INTEGER NOT NULL,
    slug          TEXT    NOT NULL,
    name          TEXT    NOT NULL,
    defaultName   TEXT    NOT NULL,
    pronouns      TEXT    NOT NULL DEFAULT 'they/them',
    role          TEXT    NOT NULL,
    department    TEXT    NOT NULL DEFAULT '',
    personality   TEXT    NOT NULL DEFAULT '',
    strengths     TEXT    NOT NULL DEFAULT '[]',
    weaknesses    TEXT    NOT NULL DEFAULT '[]',
    careerHistory TEXT    NOT NULL DEFAULT '[]',
    joinedLabel   TEXT    NOT NULL DEFAULT '',
    relationship  INTEGER NOT NULL DEFAULT 50,
    status        TEXT    NOT NULL DEFAULT 'active',
    sortOrder     INTEGER NOT NULL DEFAULT 0,
    createdAt     TEXT    NOT NULL,
    UNIQUE (userId, slug),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  -- What a colleague remembers. Bounded per character when read, because a
  -- prompt cannot carry an unbounded history any more than a person can.
  CREATE TABLE IF NOT EXISTS character_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      INTEGER NOT NULL,
    characterId INTEGER NOT NULL,
    summary     TEXT    NOT NULL,
    delta       INTEGER NOT NULL DEFAULT 0,
    before      INTEGER NOT NULL DEFAULT 50,
    after       INTEGER NOT NULL DEFAULT 50,
    source      TEXT    NOT NULL DEFAULT '',
    at          TEXT    NOT NULL,
    FOREIGN KEY (characterId) REFERENCES characters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS badges (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    slug   TEXT    NOT NULL,
    why    TEXT    NOT NULL DEFAULT '',
    phase  TEXT    NOT NULL DEFAULT '',
    at     TEXT    NOT NULL,
    UNIQUE (userId, slug),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  -- One group discussion, transcript and all.
  CREATE TABLE IF NOT EXISTS gd_runs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    userId        INTEGER NOT NULL,
    topic         TEXT    NOT NULL,
    transcript    TEXT    NOT NULL DEFAULT '[]',
    contributions TEXT    NOT NULL DEFAULT '[]',
    scores        TEXT    NOT NULL DEFAULT '{}',
    score         INTEGER NOT NULL DEFAULT 0,
    verdict       TEXT    NOT NULL DEFAULT '',
    strengths     TEXT    NOT NULL DEFAULT '',
    gaps          TEXT    NOT NULL DEFAULT '',
    nextFocus     TEXT    NOT NULL DEFAULT '',
    xpAwarded     INTEGER NOT NULL DEFAULT 0,
    source        TEXT    NOT NULL DEFAULT 'ai',
    timestamp     TEXT    NOT NULL,
    localDate     TEXT    NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  -- The end of the internship: a review, a number, and an argument about it.
  CREATE TABLE IF NOT EXISTS offers (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    userId         INTEGER NOT NULL,
    company        TEXT    NOT NULL DEFAULT '',
    title          TEXT    NOT NULL DEFAULT '',
    fixed          REAL    NOT NULL DEFAULT 0,
    variable       REAL    NOT NULL DEFAULT 0,
    joiningBonus   REAL    NOT NULL DEFAULT 0,
    benefits       TEXT    NOT NULL DEFAULT '[]',
    location       TEXT    NOT NULL DEFAULT '',
    workingModel   TEXT    NOT NULL DEFAULT '',
    joiningDate    TEXT    NOT NULL DEFAULT '',
    probation      TEXT    NOT NULL DEFAULT '',
    reviewScores   TEXT    NOT NULL DEFAULT '{}',
    reviewFeedback TEXT    NOT NULL DEFAULT '',
    reviewSummary  TEXT    NOT NULL DEFAULT '',
    rounds         TEXT    NOT NULL DEFAULT '[]',
    status         TEXT    NOT NULL DEFAULT 'open',
    createdAt      TEXT    NOT NULL,
    decidedAt      TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  -- A decision that has not finished happening yet.
  --
  -- The blueprint's demand is that consequences arrive later than the choice
  -- that caused them, which means they have to be written down at the moment
  -- of the choice and then waited on. The due count is in completed
  -- levels, not on a clock: the world moves when the trainee does.
  CREATE TABLE IF NOT EXISTS consequences (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      INTEGER NOT NULL,
    characterId INTEGER,
    kind        TEXT    NOT NULL,
    cause       TEXT    NOT NULL DEFAULT '',
    effect      TEXT    NOT NULL DEFAULT '',
    weight      INTEGER NOT NULL DEFAULT 0,
    dueAfter    INTEGER NOT NULL DEFAULT 0,
    firedAt     TEXT,
    createdAt   TEXT    NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  -- A day at work: where you went, what happened, and what it changed.
  CREATE TABLE IF NOT EXISTS workdays (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    userId    INTEGER NOT NULL,
    dayNumber INTEGER NOT NULL,
    location  TEXT    NOT NULL DEFAULT 'desk',
    events    TEXT    NOT NULL DEFAULT '[]',
    summary   TEXT    NOT NULL DEFAULT '{}',
    status    TEXT    NOT NULL DEFAULT 'open',
    xpAwarded INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT    NOT NULL,
    closedAt  TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  -- The company continues to exist whether or not the trainee is looking.
  CREATE TABLE IF NOT EXISTS company_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    userId      INTEGER NOT NULL,
    kind        TEXT    NOT NULL,
    characterId INTEGER,
    headline    TEXT    NOT NULL,
    detail      TEXT    NOT NULL DEFAULT '',
    atDay       INTEGER NOT NULL DEFAULT 0,
    seen        INTEGER NOT NULL DEFAULT 0,
    createdAt   TEXT    NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_attempts_user_track ON attempts(userId, trackId, id DESC);
  CREATE INDEX IF NOT EXISTS idx_workdays_user ON workdays(userId, id DESC);
  CREATE INDEX IF NOT EXISTS idx_compev_user ON company_events(userId, seen, id);
  CREATE INDEX IF NOT EXISTS idx_offers_user ON offers(userId, id DESC);
  CREATE INDEX IF NOT EXISTS idx_conseq_user ON consequences(userId, firedAt, dueAfter);
  CREATE INDEX IF NOT EXISTS idx_attrlog_user ON attribute_log(userId, id DESC);
  CREATE INDEX IF NOT EXISTS idx_chars_user ON characters(userId, sortOrder);
  CREATE INDEX IF NOT EXISTS idx_charev_char ON character_events(characterId, id DESC);
  CREATE INDEX IF NOT EXISTS idx_gd_user ON gd_runs(userId, id DESC);
  CREATE INDEX IF NOT EXISTS idx_interview_user ON interview_runs(userId, id DESC);
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

// The resume — the third personalisation source. `resumeText` is the extracted
// plain text, kept because an interviewer needs the actual document; the
// distilled fields are what reach a scenario prompt.
addColumn('users', 'resumeText', 'TEXT')
addColumn('users', 'resumeBrief', 'TEXT')
addColumn('users', 'resumeSkills', "TEXT NOT NULL DEFAULT '[]'")
addColumn('users', 'resumeProjects', "TEXT NOT NULL DEFAULT '[]'")
addColumn('users', 'resumeHighlights', "TEXT NOT NULL DEFAULT '[]'")
addColumn('users', 'resumeFileName', 'TEXT')
addColumn('users', 'resumeUpdatedAt', 'TEXT')

// Interview mode progression. Separate from track XP on purpose — see §
// interview.js: clearing a round is a competency gate, not an XP threshold.
addColumn('users', 'interviewLevel', 'INTEGER NOT NULL DEFAULT 1')

// A quest is now a five-stage level (4 MCQ + 1 written). Older rows stay
// readable: kind defaults to the single-scenario shape they were written in.
addColumn('attempts', 'kind', "TEXT NOT NULL DEFAULT 'open'")
addColumn('attempts', 'detail', "TEXT NOT NULL DEFAULT ''")

// The career simulation. `phase` is the spine: gd -> interview -> joining ->
// internship -> offer -> fulltime. Everything else reads it to decide what the
// trainee is allowed to do next.
addColumn('users', 'phase', "TEXT NOT NULL DEFAULT 'gd'")
addColumn('users', 'simCompany', 'TEXT')
addColumn('users', 'simCompanyKind', 'TEXT')
addColumn('users', 'simRole', 'TEXT')
addColumn('users', 'joinedCompanyAt', 'TEXT')
addColumn('users', 'internshipLevel', 'INTEGER NOT NULL DEFAULT 5')
addColumn('users', 'gdCleared', 'INTEGER NOT NULL DEFAULT 0')

// Full-time career, after the offer is accepted.
addColumn('users', 'jobTitle', 'TEXT')
addColumn('users', 'ctc', 'REAL')
addColumn('users', 'gradeIndex', 'INTEGER NOT NULL DEFAULT 0')
addColumn('users', 'levelsSinceHire', 'INTEGER NOT NULL DEFAULT 0')
addColumn('users', 'lastReviewLevel', 'INTEGER NOT NULL DEFAULT 5')

// Practice runs are kept, because the feedback is worth re-reading, but they
// are marked so nothing downstream counts them.
addColumn('gd_runs', 'practice', 'INTEGER NOT NULL DEFAULT 0')
addColumn('interview_runs', 'practice', 'INTEGER NOT NULL DEFAULT 0')

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
  // resumeText is the whole document — it stays server-side.
  const { passwordHash, resumeText, ...rest } = row
  return {
    ...rest,
    confidence: safeParse(row.confidence, {}),
    focusAreas: safeParse(row.focusAreas, []),
    onboarded: !!row.onboardedAt,
    sim: {
      phase: row.phase ?? 'gd',
      company: row.simCompany,
      companyKind: row.simCompanyKind,
      role: row.simRole,
      joinedAt: row.joinedCompanyAt,
      internshipLevel: row.internshipLevel ?? 5,
      gdCleared: !!row.gdCleared,
      jobTitle: row.jobTitle,
      ctc: row.ctc,
      gradeIndex: row.gradeIndex ?? 0,
    },
    resume: row.resumeUpdatedAt
      ? {
          brief: row.resumeBrief,
          skills: safeParse(row.resumeSkills, []),
          projects: safeParse(row.resumeProjects, []),
          highlights: safeParse(row.resumeHighlights, []),
          fileName: row.resumeFileName,
          updatedAt: row.resumeUpdatedAt,
          words: row.resumeText ? row.resumeText.split(/\s+/).length : 0,
        }
      : null,
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
