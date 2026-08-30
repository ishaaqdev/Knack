import { db, safeParse } from './db.js'

/**
 * The ten permanent professional attributes.
 *
 * These are the part of the simulation that is deliberately *not* XP. XP is a
 * currency you accumulate by turning up; an attribute is a claim about what you
 * can actually do, and it can go down. A trainee who answers ten levels
 * carelessly should end up with a lot of XP and a worse Professionalism score
 * than they started with, and the two numbers disagreeing is the point.
 *
 * Everything that grades a response returns deltas against these keys, and
 * every delta is written with a reason so the change can be explained rather
 * than merely displayed.
 */

export const ATTRIBUTES = [
  {
    key: 'communication',
    name: 'Communication',
    blurb: 'Saying the hard thing clearly, once, to the person who needs to hear it.',
    improve: [
      'Write an update that leads with the decision, not the history.',
      'Tell someone bad news early, with a date attached.',
      'Explain a technical failure to someone non-technical.',
    ],
  },
  {
    key: 'leadership',
    name: 'Leadership',
    blurb: 'Taking the decision nobody else wants to take, and owning what follows.',
    improve: [
      'Coordinate two people who disagree, and name the call you made.',
      'Take a decision under uncertainty and say what would change your mind.',
      'Delegate something you would rather do yourself.',
    ],
  },
  {
    key: 'confidence',
    name: 'Confidence',
    blurb: 'Holding a position under pressure without either folding or digging in.',
    improve: [
      'Disagree with someone more senior, in writing, with a reason.',
      'Ask for something you want — scope, time, or help.',
      'Say "I do not know yet" without apologising for it.',
    ],
  },
  {
    key: 'emotionalIntelligence',
    name: 'Emotional Intelligence',
    blurb: 'Reading what the other person is actually worried about.',
    improve: [
      'Answer the concern behind a question instead of the question.',
      'Take criticism without defending, then act on one part of it.',
      'Give hard feedback that leaves the relationship intact.',
    ],
  },
  {
    key: 'teamwork',
    name: 'Teamwork',
    blurb: 'Making the group better off, including when it costs you.',
    improve: [
      'Unblock someone else before your own task.',
      'Build on a teammate’s idea rather than replacing it.',
      'Share the credit for something specific and by name.',
    ],
  },
  {
    key: 'adaptability',
    name: 'Adaptability',
    blurb: 'Changing plan when the facts change, without drama.',
    improve: [
      'Reprioritise when a deadline moves and say what drops.',
      'Adopt a decision you argued against, properly.',
      'Work a problem where the requirements are still moving.',
    ],
  },
  {
    key: 'professionalism',
    name: 'Professionalism',
    blurb: 'Doing what you said you would, and saying so when you cannot.',
    improve: [
      'Flag a slip before it is visible to anyone else.',
      'Keep something confidential that would be interesting to share.',
      'Own a mistake in the same message that reports it.',
    ],
  },
  {
    key: 'decisionMaking',
    name: 'Decision-Making',
    blurb: 'Choosing with incomplete information and being able to defend it.',
    improve: [
      'Make a call and state what you traded away.',
      'Choose between two options where both cost something.',
      'Decide when to escalate rather than deciding alone.',
    ],
  },
  {
    key: 'problemSolving',
    name: 'Problem-Solving',
    blurb: 'Finding the real problem before solving the stated one.',
    improve: [
      'Separate the evidence from the assumption before proposing a fix.',
      'Ask for one concrete example before debugging anything.',
      'Name what you would check next, and how.',
    ],
  },
  {
    key: 'relationshipBuilding',
    name: 'Relationship Building',
    blurb: 'Being someone people are willing to help later.',
    improve: [
      'Follow up on something a colleague told you last week.',
      'Disagree in a way the other person can accept.',
      'Help someone with no return in sight.',
    ],
  },
]

export const ATTRIBUTE_KEYS = ATTRIBUTES.map((a) => a.key)
const BY_KEY = Object.fromEntries(ATTRIBUTES.map((a) => [a.key, a]))

/* ---------------------------------------------------------------- tiers -- */

/**
 * Numbers alone do not tell a trainee anything. A tier says where they stand
 * and, crucially, whether it is a problem.
 */
export const TIERS = [
  { min: 0, max: 20, label: 'Critical Development', tone: 'critical' },
  { min: 21, max: 40, label: 'Needs Development', tone: 'low' },
  { min: 41, max: 60, label: 'Developing', tone: 'mid' },
  { min: 61, max: 75, label: 'Competent', tone: 'ok' },
  { min: 76, max: 90, label: 'Strong', tone: 'good' },
  { min: 91, max: 100, label: 'Exceptional', tone: 'best' },
]

export const tierFor = (value) =>
  TIERS.find((t) => value >= t.min && value <= t.max) ?? TIERS[0]

/* ----------------------------------------------------------- starting ---- */

/**
 * Opening values.
 *
 * Self-rated confidence and the "what do you find hardest" answers seed the
 * starting point, so the first scenarios already aim somewhere useful. They are
 * a starting point only — every value moves on evidence from here.
 */
const FOCUS_TO_ATTRIBUTE = {
  'saying-no': ['confidence', 'professionalism'],
  criticism: ['emotionalIntelligence', 'adaptability'],
  seniors: ['confidence', 'communication'],
  writing: ['communication'],
  speaking: ['confidence', 'leadership'],
  ambiguity: ['decisionMaking', 'problemSolving'],
  badnews: ['communication', 'professionalism'],
  'ai-trust': ['problemSolving', 'decisionMaking'],
}

const TRACK_TO_ATTRIBUTE = {
  'workplace-communication': ['communication', 'emotionalIntelligence', 'relationshipBuilding'],
  'critical-thinking': ['problemSolving', 'decisionMaking', 'adaptability'],
  'ai-fluency': ['problemSolving', 'professionalism'],
}

const upsert = db.prepare(`
  INSERT INTO attributes (userId, key, value, updatedAt)
  VALUES (@userId, @key, @value, @updatedAt)
  ON CONFLICT(userId, key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
`)

const selectAll = db.prepare('SELECT key, value FROM attributes WHERE userId = ?')

export function seedAttributes(user) {
  if (selectAll.all(user.id).length) return getAttributes(user.id)

  const start = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 50]))

  // Confidence per track lifts the attributes that track exercises.
  const confidence = safeParse(user.confidence, {})
  for (const [trackId, keys] of Object.entries(TRACK_TO_ATTRIBUTE)) {
    const c = Number(confidence[trackId])
    if (!Number.isFinite(c)) continue
    for (const k of keys) start[k] += (c - 3) * 4
  }

  // A self-identified difficulty starts lower — it is the thing they came here
  // to fix, and a bar that begins at "Developing" is more honest than 50.
  for (const focus of safeParse(user.focusAreas, [])) {
    for (const k of FOCUS_TO_ATTRIBUTE[focus] ?? []) start[k] -= 12
  }

  // Prior team experience is real evidence about workplace attributes.
  if (user.experience === 'intern') {
    start.teamwork += 5
    start.professionalism += 5
  } else if (user.experience === 'fulltime') {
    start.teamwork += 10
    start.professionalism += 10
    start.adaptability += 5
  } else {
    start.teamwork -= 5
    start.professionalism -= 5
  }

  const now = new Date().toISOString()
  db.transaction(() => {
    for (const key of ATTRIBUTE_KEYS) {
      upsert.run({ userId: user.id, key, value: clamp(start[key]), updatedAt: now })
    }
  })()

  return getAttributes(user.id)
}

const clamp = (v) => Math.max(0, Math.min(100, Math.round(v * 10) / 10))

/* ---------------------------------------------------------------- read --- */

export function rawAttributes(userId) {
  const rows = selectAll.all(userId)
  if (!rows.length) return null
  const out = Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 50]))
  for (const r of rows) if (k_in(r.key)) out[r.key] = r.value
  return out
}

const k_in = (k) => ATTRIBUTE_KEYS.includes(k)

/** The full display shape: value, tier, and what to do about it. */
export function getAttributes(userId) {
  const raw = rawAttributes(userId) ?? Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 50]))
  return ATTRIBUTES.map((a) => {
    const value = Math.round(raw[a.key])
    const tier = tierFor(value)
    return {
      key: a.key,
      name: a.name,
      blurb: a.blurb,
      value,
      tier: tier.label,
      tone: tier.tone,
      // Only surfaced when it is actually low — nobody needs coaching on a 90.
      improve: value <= 60 ? a.improve : [],
    }
  })
}

/** The weakest attributes, which is what the scenario engine should aim at. */
export function weakest(userId, n = 3) {
  const raw = rawAttributes(userId)
  if (!raw) return []
  return ATTRIBUTE_KEYS.map((k) => ({ key: k, name: BY_KEY[k].name, value: raw[k] }))
    .sort((a, b) => a.value - b.value)
    .slice(0, n)
}

/** A one-line brief for prompts. Bounded, like every other prompt input. */
export function attributeBrief(userId) {
  const raw = rawAttributes(userId)
  if (!raw) return null
  const ranked = ATTRIBUTE_KEYS.map((k) => ({ name: BY_KEY[k].name, value: Math.round(raw[k]) })).sort(
    (a, b) => a.value - b.value
  )
  return {
    weakest: ranked.slice(0, 3).map((r) => `${r.name} ${r.value}`),
    strongest: ranked.slice(-2).map((r) => `${r.name} ${r.value}`),
  }
}

/* --------------------------------------------------------------- write --- */

const insertLog = db.prepare(`
  INSERT INTO attribute_log (userId, key, delta, before, after, reason, source, at)
  VALUES (@userId, @key, @delta, @before, @after, @reason, @source, @at)
`)

/**
 * Applies a set of deltas.
 *
 * Deltas are clamped per-write, not just at the bounds. A single response
 * moving an attribute by fifteen points would make the whole system feel
 * arbitrary; the ceiling keeps any one answer from being decisive while still
 * letting a run of them matter.
 */
export const MAX_DELTA = 5

export function applyAttributeDeltas(userId, deltas, { reason = '', source = '' } = {}) {
  const raw = rawAttributes(userId)
  if (!raw || !deltas) return []

  const now = new Date().toISOString()
  const applied = []

  db.transaction(() => {
    for (const [key, rawDelta] of Object.entries(deltas)) {
      if (!k_in(key)) continue
      const delta = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, Number(rawDelta) || 0))
      if (!delta) continue

      const before = raw[key]
      const after = clamp(before + delta)
      if (after === before) continue

      upsert.run({ userId, key, value: after, updatedAt: now })
      insertLog.run({
        userId,
        key,
        delta: Math.round((after - before) * 10) / 10,
        before,
        after,
        reason: String(reason).slice(0, 200),
        source: String(source).slice(0, 40),
        at: now,
      })
      /*
       * Only report a move the reader can actually see.
       *
       * Values are kept to one decimal so small movements accumulate rather
       * than being rounded away, but announcing "Communication 26 -> 26" reads
       * as a bug. The write always happens; the announcement waits until the
       * whole point has landed.
       */
      if (Math.round(before) !== Math.round(after)) {
        applied.push({
          key,
          name: BY_KEY[key].name,
          delta: Math.round((after - before) * 10) / 10,
          before: Math.round(before),
          after: Math.round(after),
          tier: tierFor(after).label,
          crossedUp: tierFor(after).label !== tierFor(before).label && after > before,
        })
      }
    }
  })()

  return applied
}

/**
 * Turns one graded response into attribute movement when the model did not
 * supply deltas of its own — the offline path, mostly.
 *
 * Deliberately not "good answer, plus five to everything". A score says how
 * well they handled *this* situation, and the track says which abilities the
 * situation actually exercised.
 */
export function derivedDeltas(trackId, score) {
  const keys = TRACK_TO_ATTRIBUTE[trackId] ?? ['communication']
  // 1-10 maps to -2..+2.5, so a poor answer costs something.
  const magnitude = (score - 5.5) / 1.8
  const out = {}
  keys.forEach((k, i) => {
    out[k] = Math.round((magnitude * (i === 0 ? 1 : 0.6)) * 10) / 10
  })
  return out
}

/** Recent movement, for the profile page. */
const recentLog = db.prepare(
  `SELECT key, delta, before, after, reason, at FROM attribute_log
   WHERE userId = ? ORDER BY id DESC LIMIT ?`
)

export const attributeHistory = (userId, limit = 12) =>
  recentLog.all(userId, limit).map((r) => ({ ...r, name: BY_KEY[r.key]?.name ?? r.key }))

/** Mean of all ten — the single number for "how professional are you now". */
export function professionalIndex(userId) {
  const raw = rawAttributes(userId)
  if (!raw) return 0
  return Math.round(ATTRIBUTE_KEYS.reduce((s, k) => s + raw[k], 0) / ATTRIBUTE_KEYS.length)
}
