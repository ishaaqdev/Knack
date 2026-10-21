import { db, safeParse } from './db.js'

/**
 * Persistent colleagues.
 *
 * The blueprint's argument is that a workplace is people, and a simulation that
 * forgets them is a quiz with names in it. So a character is created once, kept
 * for the rest of the run, remembers specific things, and can end up helping or
 * refusing to help based on them.
 *
 * Pronouns default to they/them and are only ever what the trainee chose. A
 * name does not tell you how someone should be referred to, and guessing wrong
 * in every generated scenario for the next month is worse than being neutral.
 */

export const PRONOUN_OPTIONS = ['they/them', 'she/her', 'he/him']

/**
 * The starting cast. Five is enough for the relationships to be legible and few
 * enough that the trainee can hold them in their head.
 */
export const CAST = [
  {
    slug: 'manager',
    defaultName: 'Hema',
    role: 'Engineering Manager',
    department: 'Engineering',
    // Written without pronouns: the trainee picks those at the introduction,
    // and a description that has already decided makes the choice a fiction.
    personality: 'Calm, direct, and short of time. Says a thing once.',
    strengths: ['Prioritisation', 'People management', 'Clear expectations'],
    weaknesses: ['Assumes context you do not have', 'Rarely follows up in writing'],
    careerHistory: ['Engineer', 'Senior Engineer', 'Engineering Manager'],
    joinedLabel: '4 years at the company',
    relationship: 50,
    sortOrder: 0,
    look: { skin: '#a9714b', hair: 'bun', hairColor: '#2b2326', brows: 'level', eyes: 'calm', accessory: 'none', top: 'blazer', topColor: '#3a3a44' },
    accent: '#ff7a35',
    quirk: 'Answers a question with a question, then goes quiet until you have worked it out.',
  },
  {
    slug: 'senior',
    defaultName: 'Arun',
    role: 'Senior Engineer',
    department: 'Engineering',
    personality: 'Precise and a little blunt in review. Respects a good argument.',
    strengths: ['Deep system knowledge', 'Code review', 'Debugging'],
    weaknesses: ['Impatient with vagueness', 'Reluctant to delegate'],
    careerHistory: ['Engineer', 'Senior Engineer'],
    joinedLabel: '3 years at the company',
    relationship: 45,
    sortOrder: 1,
    look: { skin: '#c4895a', hair: 'crop', hairColor: '#1d1a19', brows: 'thick', eyes: 'sharp', accessory: 'glasses', top: 'collar', topColor: '#2e2e36' },
    accent: '#f2f0ec',
    quirk: 'Reviews code with a single comment that is somehow the only one that matters.',
  },
  {
    slug: 'peer',
    defaultName: 'Kiran',
    role: 'Fellow Intern',
    department: 'Engineering',
    personality: 'Friendly and slightly anxious. Asks for help before trying.',
    strengths: ['Willing', 'Fast learner', 'Good notes'],
    weaknesses: ['Over-commits', 'Goes quiet when stuck'],
    careerHistory: ['Intern'],
    joinedLabel: 'started the same week as you',
    relationship: 55,
    sortOrder: 2,
    look: { skin: '#d19a6c', hair: 'wavy', hairColor: '#3a2a22', brows: 'arched', eyes: 'round', accessory: 'headphones', top: 'hoodie', topColor: '#4a4a55' },
    accent: '#ffa061',
    quirk: 'Has three half-finished side projects and will tell you about all of them.',
  },
  {
    slug: 'product',
    defaultName: 'Meera',
    role: 'Product Manager',
    department: 'Product',
    personality: 'Persuasive, deadline-driven, and not technical.',
    strengths: ['Customer context', 'Decisiveness'],
    weaknesses: ['Underestimates engineering cost', 'Commits before asking'],
    careerHistory: ['Business Analyst', 'Associate PM', 'Product Manager'],
    joinedLabel: '2 years at the company',
    relationship: 50,
    sortOrder: 3,
    look: { skin: '#b97a52', hair: 'long', hairColor: '#241b1a', brows: 'arched', eyes: 'bright', accessory: 'earrings', top: 'blazer', topColor: '#8a4a24' },
    accent: '#9a9aa5',
    quirk: 'Says "quick question" before anything that will take a week.',
  },
  {
    slug: 'hr',
    defaultName: 'Farhan',
    role: 'HR Business Partner',
    department: 'People',
    personality: 'Warm and procedural. Everything ends up in a form.',
    strengths: ['Process', 'Discretion'],
    weaknesses: ['Slow to escalate', 'Avoids conflict'],
    careerHistory: ['HR Executive', 'HR Business Partner'],
    joinedLabel: '5 years at the company',
    relationship: 50,
    sortOrder: 4,
    look: { skin: '#cf9468', hair: 'side', hairColor: '#352a25', brows: 'level', eyes: 'calm', accessory: 'beard', top: 'collar', topColor: '#d8d4cc' },
    accent: '#63636e',
    quirk: 'Keeps a spare charger, a spare pen and a spare form for everyone.',
  },
]

/* --------------------------------------------------------------- levels -- */

export const RELATIONSHIP_TIERS = [
  { min: 0, max: 20, label: 'Hostile' },
  { min: 21, max: 40, label: 'Distant' },
  { min: 41, max: 60, label: 'Neutral' },
  { min: 61, max: 75, label: 'Positive' },
  { min: 76, max: 90, label: 'Trusted' },
  { min: 91, max: 100, label: 'Very Close' },
]

export const relationshipTier = (v) =>
  RELATIONSHIP_TIERS.find((t) => v >= t.min && v <= t.max)?.label ?? 'Neutral'

/* ---------------------------------------------------------------- read --- */

const listStmt = db.prepare('SELECT * FROM characters WHERE userId = ? ORDER BY sortOrder, id')
const byIdStmt = db.prepare('SELECT * FROM characters WHERE id = ? AND userId = ?')
const bySlugStmt = db.prepare('SELECT * FROM characters WHERE userId = ? AND slug = ?')

const eventsStmt = db.prepare(
  'SELECT summary, delta, before, after, at FROM character_events WHERE characterId = ? ORDER BY id DESC LIMIT ?'
)

const shape = (row, { events = 0 } = {}) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  defaultName: row.defaultName,
  renamed: row.name !== row.defaultName,
  pronouns: row.pronouns,
  role: row.role,
  department: row.department,
  personality: row.personality,
  strengths: safeParse(row.strengths, []),
  weaknesses: safeParse(row.weaknesses, []),
  careerHistory: safeParse(row.careerHistory, []),
  joinedLabel: row.joinedLabel,
  relationship: row.relationship,
  tier: relationshipTier(row.relationship),
  status: row.status,
  look: CAST.find((c) => c.slug === row.slug)?.look ?? null,
  accent: CAST.find((c) => c.slug === row.slug)?.accent ?? null,
  quirk: CAST.find((c) => c.slug === row.slug)?.quirk ?? null,
  history: events ? eventsStmt.all(row.id, events) : undefined,
})

export const listCharacters = (userId, opts) => listStmt.all(userId).map((r) => shape(r, opts))

export function getCharacter(userId, id) {
  const row = byIdStmt.get(id, userId)
  return row ? shape(row, { events: 20 }) : null
}

export const characterBySlug = (userId, slug) => {
  const row = bySlugStmt.get(userId, slug)
  return row ? shape(row) : null
}

/* --------------------------------------------------------------- write --- */

const insertChar = db.prepare(`
  INSERT INTO characters
    (userId, slug, name, defaultName, pronouns, role, department, personality,
     strengths, weaknesses, careerHistory, joinedLabel, relationship, sortOrder, createdAt)
  VALUES
    (@userId, @slug, @name, @defaultName, @pronouns, @role, @department, @personality,
     @strengths, @weaknesses, @careerHistory, @joinedLabel, @relationship, @sortOrder, @createdAt)
  ON CONFLICT(userId, slug) DO NOTHING
`)

/** Called once, when the trainee joins the company. Idempotent. */
export function seedCast(userId) {
  const now = new Date().toISOString()
  db.transaction(() => {
    for (const c of CAST) {
      insertChar.run({
        userId,
        slug: c.slug,
        name: c.defaultName,
        defaultName: c.defaultName,
        pronouns: 'they/them',
        role: c.role,
        department: c.department,
        personality: c.personality,
        strengths: JSON.stringify(c.strengths),
        weaknesses: JSON.stringify(c.weaknesses),
        careerHistory: JSON.stringify(c.careerHistory),
        joinedLabel: c.joinedLabel,
        relationship: c.relationship,
        sortOrder: c.sortOrder,
        createdAt: now,
      })
    }
  })()
  return listCharacters(userId)
}

const renameStmt = db.prepare(
  'UPDATE characters SET name = @name, pronouns = @pronouns WHERE id = @id AND userId = @userId'
)

export function renameCharacter(userId, id, { name, pronouns }) {
  const row = byIdStmt.get(id, userId)
  if (!row) return null
  const clean = String(name ?? '').trim().slice(0, 24) || row.defaultName
  const p = PRONOUN_OPTIONS.includes(pronouns) ? pronouns : row.pronouns
  renameStmt.run({ id, userId, name: clean, pronouns: p })
  return getCharacter(userId, id)
}

const insertEvent = db.prepare(`
  INSERT INTO character_events (userId, characterId, summary, delta, before, after, source, at)
  VALUES (@userId, @characterId, @summary, @delta, @before, @after, @source, @at)
`)

const bumpStmt = db.prepare('UPDATE characters SET relationship = ? WHERE id = ?')

export const MAX_RELATIONSHIP_DELTA = 8

/**
 * Moves a relationship and records why.
 *
 * The "why" is not decoration. A month later the app has to be able to say
 * "you helped me when I first joined" and mean a specific thing that happened,
 * and a bare number cannot produce that sentence.
 */
export function recordInteraction(userId, slugOrId, { summary, delta = 0, source = '' }) {
  const row =
    typeof slugOrId === 'number' ? byIdStmt.get(slugOrId, userId) : bySlugStmt.get(userId, slugOrId)
  if (!row) return null

  const d = Math.max(-MAX_RELATIONSHIP_DELTA, Math.min(MAX_RELATIONSHIP_DELTA, Math.round(delta)))
  const before = row.relationship
  const after = Math.max(0, Math.min(100, before + d))
  const now = new Date().toISOString()

  db.transaction(() => {
    if (after !== before) bumpStmt.run(after, row.id)
    insertEvent.run({
      userId,
      characterId: row.id,
      summary: String(summary ?? '').slice(0, 240),
      delta: after - before,
      before,
      after,
      source: String(source).slice(0, 40),
      at: now,
    })
  })()

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    delta: after - before,
    before,
    after,
    tier: relationshipTier(after),
    crossed: relationshipTier(after) !== relationshipTier(before),
  }
}

/**
 * What the characters collectively remember, bounded for prompt use.
 * Two events each, five characters — enough to be recognised, small enough to
 * stay a constant cost.
 */
export function castBrief(userId) {
  const rows = listStmt.all(userId)
  if (!rows.length) return null
  return rows.map((r) => ({
    name: r.name,
    role: r.role,
    relationship: relationshipTier(r.relationship),
    remembers: eventsStmt
      .all(r.id, 2)
      .map((e) => e.summary)
      .filter(Boolean),
  }))
}

/** Who is most likely to help, and who is not. Powers the workplace beats. */
export function standing(userId) {
  const rows = listStmt.all(userId)
  const sorted = [...rows].sort((a, b) => b.relationship - a.relationship)
  return {
    closest: sorted[0] ? { name: sorted[0].name, tier: relationshipTier(sorted[0].relationship) } : null,
    weakest: sorted.at(-1)
      ? { name: sorted.at(-1).name, tier: relationshipTier(sorted.at(-1).relationship) }
      : null,
  }
}
