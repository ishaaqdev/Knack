import { db, safeParse } from './db.js'
import { rawAttributes, ATTRIBUTE_KEYS } from './attributes.js'
import { listCharacters } from './characters.js'
import { companyFor, roleFor } from './career.js'

/**
 * The offer, and the argument about it.
 *
 * The number is not random and it is not a reward for finishing. It is
 * assembled from what the trainee actually did: the ten attributes, how the
 * internship levels went, and whether the people around them would speak up for
 * them. A trainee who ground through thirty levels carelessly gets a visibly
 * worse offer than one who did twenty well, which is the entire point of
 * keeping attributes separate from XP.
 *
 * All figures are lakhs per annum, because that is the unit the conversation
 * actually happens in.
 */

/* ---------------------------------------------------------------- bands -- */

/** Base fixed pay by role and company type, before performance. */
const BANDS = {
  startup: { swe: 6.0, data: 6.5, product: 5.5, qa: 5.0, hr: 4.5 },
  product: { swe: 8.0, data: 8.5, product: 7.5, qa: 6.5, hr: 5.5 },
  service: { swe: 4.5, data: 5.0, product: 4.5, qa: 4.0, hr: 3.8 },
}

const TITLES = {
  swe: 'Software Engineer',
  data: 'Data Engineer',
  product: 'Associate Product Manager',
  qa: 'QA Engineer',
  hr: 'HR Executive',
}

/** Variable pay is a bigger slice where the company is bigger. */
const VARIABLE_SHARE = { startup: 0.08, product: 0.15, service: 0.12 }

const LOCATION = { startup: 'Bengaluru', product: 'Bengaluru', service: 'Bengaluru or Pune' }
const MODEL = { startup: 'In office, 4 days a week', product: 'Hybrid, 3 days a week', service: 'In office' }

const BENEFITS = {
  startup: ['Health cover for you and one dependent', 'ESOPs, 4-year vest', 'Annual learning budget'],
  product: [
    'Health cover for you and family',
    'Annual bonus tied to company performance',
    'Learning budget and conference travel',
  ],
  service: ['Health cover for you and family', 'Provident fund', 'Certification reimbursement'],
}

const round1 = (n) => Math.round(n * 10) / 10

/* --------------------------------------------------------- the review ---- */

const levelStats = db.prepare(`
  SELECT COUNT(*) AS n, COALESCE(AVG(score), 0) AS avg
  FROM attempts WHERE userId = ? AND kind = 'level'
`)

/**
 * The performance review that precedes the number.
 *
 * Four headline competencies, each drawn from the attributes that actually
 * feed it, so the review and the profile page cannot disagree with each other.
 */
const REVIEW_MAP = {
  Communication: ['communication', 'emotionalIntelligence'],
  Leadership: ['leadership', 'decisionMaking'],
  Professionalism: ['professionalism', 'adaptability'],
  'Problem-Solving': ['problemSolving', 'teamwork'],
}

export function performanceReview(user) {
  const attrs = rawAttributes(user.id) ?? Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, 50]))
  const stats = levelStats.get(user.id)
  const people = listCharacters(user.id)

  const scores = Object.fromEntries(
    Object.entries(REVIEW_MAP).map(([label, keys]) => [
      label,
      Math.round(keys.reduce((s, k) => s + attrs[k], 0) / keys.length),
    ])
  )

  const meanAttr = ATTRIBUTE_KEYS.reduce((s, k) => s + attrs[k], 0) / ATTRIBUTE_KEYS.length
  const meanRelationship = people.length
    ? people.reduce((s, c) => s + c.relationship, 0) / people.length
    : 50

  return {
    scores,
    levels: stats.n,
    averageLevelScore: round1(stats.avg),
    meanAttribute: Math.round(meanAttr),
    meanRelationship: Math.round(meanRelationship),
    advocates: people.filter((c) => c.relationship >= 70).map((c) => c.name),
    detractors: people.filter((c) => c.relationship <= 35).map((c) => c.name),
  }
}

/* ---------------------------------------------------------- the number --- */

/**
 * Performance multiplier.
 *
 * Attributes carry most of the weight, level scores some, and relationships a
 * real but smaller share — a manager who likes you cannot make you good, but
 * they do decide whether anyone argues for your band.
 */
export function buildOffer(user) {
  const review = performanceReview(user)
  const companyKind = user.simCompanyKind ?? ''
  const kindId = companyKind.includes('startup')
    ? 'startup'
    : companyKind.includes('services')
      ? 'service'
      : 'product'

  const roleId = user.simRole && BANDS[kindId][user.simRole] ? user.simRole : 'swe'
  const base = BANDS[kindId][roleId]

  const attrFactor = (review.meanAttribute - 50) / 100 // -0.5 .. +0.5
  const levelFactor = (review.averageLevelScore - 5.5) / 20 // about -0.22 .. +0.22
  const peopleFactor = (review.meanRelationship - 50) / 250 // about -0.2 .. +0.2

  const multiplier = Math.max(0.78, Math.min(1.35, 1 + attrFactor * 0.55 + levelFactor + peopleFactor))

  const total = round1(base * multiplier)
  const variable = round1(total * VARIABLE_SHARE[kindId])
  const fixed = round1(total - variable)

  const start = new Date()
  start.setMonth(start.getMonth() + 2)
  start.setDate(1)

  return {
    company: user.simCompany ?? companyFor('product').name,
    title: TITLES[roleId] ?? 'Engineer',
    fixed,
    variable,
    joiningBonus: 0,
    benefits: BENEFITS[kindId],
    location: LOCATION[kindId],
    workingModel: MODEL[kindId],
    joiningDate: start.toISOString().slice(0, 10),
    probation: '6 months',
    review,
    // How much room the company actually has. The trainee never sees this; it
    // is what makes a negotiation a negotiation rather than a dice roll.
    headroom: round1(Math.max(0.3, total * (review.meanAttribute >= 65 ? 0.14 : 0.07))),
    band: { base, multiplier: Math.round(multiplier * 100) / 100, kindId, roleId },
  }
}

/* ------------------------------------------------------------- storage --- */

const insertOffer = db.prepare(`
  INSERT INTO offers
    (userId, company, title, fixed, variable, joiningBonus, benefits, location,
     workingModel, joiningDate, probation, reviewScores, reviewFeedback,
     reviewSummary, rounds, status, createdAt)
  VALUES
    (@userId, @company, @title, @fixed, @variable, @joiningBonus, @benefits, @location,
     @workingModel, @joiningDate, @probation, @reviewScores, @reviewFeedback,
     @reviewSummary, '[]', 'open', @createdAt)
`)

const openOfferStmt = db.prepare(
  "SELECT * FROM offers WHERE userId = ? AND status IN ('open','negotiating') ORDER BY id DESC LIMIT 1"
)
const latestOfferStmt = db.prepare('SELECT * FROM offers WHERE userId = ? ORDER BY id DESC LIMIT 1')

export const shapeOffer = (row) =>
  row && {
    id: row.id,
    company: row.company,
    title: row.title,
    fixed: row.fixed,
    variable: row.variable,
    joiningBonus: row.joiningBonus,
    total: round1(row.fixed + row.variable),
    benefits: safeParse(row.benefits, []),
    location: row.location,
    workingModel: row.workingModel,
    joiningDate: row.joiningDate,
    probation: row.probation,
    review: { scores: safeParse(row.reviewScores, {}), feedback: row.reviewFeedback, summary: row.reviewSummary },
    rounds: safeParse(row.rounds, []),
    status: row.status,
    createdAt: row.createdAt,
    decidedAt: row.decidedAt,
  }

export const openOffer = (userId) => shapeOffer(openOfferStmt.get(userId))
export const latestOffer = (userId) => shapeOffer(latestOfferStmt.get(userId))

export function createOffer(user, built, { feedback, summary }) {
  const existing = openOfferStmt.get(user.id)
  if (existing) return shapeOffer(existing)

  const info = insertOffer.run({
    userId: user.id,
    company: built.company,
    title: built.title,
    fixed: built.fixed,
    variable: built.variable,
    joiningBonus: built.joiningBonus,
    benefits: JSON.stringify(built.benefits),
    location: built.location,
    workingModel: built.workingModel,
    joiningDate: built.joiningDate,
    probation: built.probation,
    reviewScores: JSON.stringify(built.review.scores),
    reviewFeedback: feedback,
    reviewSummary: summary,
    createdAt: new Date().toISOString(),
  })
  return shapeOffer(db.prepare('SELECT * FROM offers WHERE id = ?').get(info.lastInsertRowid))
}

const updateTerms = db.prepare(`
  UPDATE offers SET fixed = @fixed, variable = @variable, joiningBonus = @joiningBonus,
                    benefits = @benefits, rounds = @rounds, status = @status
  WHERE id = @id
`)

export const MAX_ROUNDS = 2

/**
 * Applies one negotiation outcome to the standing offer.
 *
 * Four outcomes, and only one of them is "you got more money". A partial win
 * moves the parts of a package that are easier for a company to move, and a
 * badly handled ask can cost something — otherwise negotiating would be free,
 * and it is not.
 */
export function applyNegotiation(userId, outcome) {
  const row = openOfferStmt.get(userId)
  if (!row) return null

  const rounds = safeParse(row.rounds, [])
  const built = { fixed: row.fixed, variable: row.variable, joiningBonus: row.joiningBonus }
  const benefits = safeParse(row.benefits, [])

  let moved = { fixed: 0, variable: 0, joiningBonus: 0, benefit: null }

  if (outcome.result === 'success') {
    moved.fixed = round1(row.fixed * (0.05 + outcome.strength * 0.05))
    built.fixed = round1(row.fixed + moved.fixed)
  } else if (outcome.result === 'partial') {
    moved.joiningBonus = round1(Math.max(0.25, row.fixed * 0.05))
    built.joiningBonus = round1(row.joiningBonus + moved.joiningBonus)
    moved.variable = round1(row.variable * 0.1)
    built.variable = round1(row.variable + moved.variable)
    moved.benefit = 'Probation shortened to 3 months'
    if (!benefits.includes(moved.benefit)) benefits.push(moved.benefit)
  } else if (outcome.result === 'backfire') {
    // Nothing is taken back, but the goodwill is. The cost lands on the
    // relationship and the record, not on the number.
    moved.benefit = null
  }

  rounds.push({
    at: new Date().toISOString(),
    message: outcome.message,
    result: outcome.result,
    reaction: outcome.reaction,
    scores: outcome.scores,
    moved,
  })

  const status = rounds.length >= MAX_ROUNDS ? 'open' : 'negotiating'

  updateTerms.run({
    id: row.id,
    fixed: built.fixed,
    variable: built.variable,
    joiningBonus: built.joiningBonus,
    benefits: JSON.stringify(benefits),
    rounds: JSON.stringify(rounds),
    status,
  })

  return {
    offer: shapeOffer(db.prepare('SELECT * FROM offers WHERE id = ?').get(row.id)),
    moved,
    roundsUsed: rounds.length,
    roundsLeft: Math.max(0, MAX_ROUNDS - rounds.length),
  }
}

const decideStmt = db.prepare('UPDATE offers SET status = ?, decidedAt = ? WHERE id = ?')

export function decideOffer(userId, accept) {
  const row = openOfferStmt.get(userId)
  if (!row) return null
  decideStmt.run(accept ? 'accepted' : 'declined', new Date().toISOString(), row.id)
  return shapeOffer(db.prepare('SELECT * FROM offers WHERE id = ?').get(row.id))
}

/* ------------------------------------------------------- the career after */

/** Where accepting puts you, and what comes next. */
export const GRADES = [
  { name: 'Junior Engineer', needs: 0 },
  { name: 'Engineer', needs: 6 },
  { name: 'Senior Engineer', needs: 14 },
  { name: 'Team Lead', needs: 24 },
  { name: 'Engineering Manager', needs: 36 },
]

export const gradeAt = (i) => GRADES[Math.max(0, Math.min(GRADES.length - 1, i))]

/**
 * Promotion is not a level counter. Levels since hire are necessary but the
 * gate is competency: you do not lead a team on attendance.
 */
export function promotionCheck(user) {
  const idx = user.gradeIndex ?? 0
  const next = GRADES[idx + 1]
  if (!next) return { grade: gradeAt(idx), next: null, ready: false }

  const attrs = rawAttributes(user.id) ?? {}
  const leadershipNeeded = 45 + idx * 10
  const meanNeeded = 55 + idx * 5
  const mean = ATTRIBUTE_KEYS.reduce((s, k) => s + (attrs[k] ?? 50), 0) / ATTRIBUTE_KEYS.length

  const levels = user.levelsSinceHire ?? 0
  const ready = levels >= next.needs && (attrs.leadership ?? 0) >= leadershipNeeded && mean >= meanNeeded

  return {
    grade: gradeAt(idx),
    next: next.name,
    ready,
    requirements: [
      { label: 'Levels since joining', have: levels, need: next.needs },
      { label: 'Leadership', have: Math.round(attrs.leadership ?? 0), need: leadershipNeeded },
      { label: 'Overall profile', have: Math.round(mean), need: meanNeeded },
    ],
  }
}

const promoteStmt = db.prepare(
  'UPDATE users SET gradeIndex = ?, jobTitle = ?, ctc = ?, levelsSinceHire = 0 WHERE id = ?'
)

export function promote(user) {
  const check = promotionCheck(user)
  if (!check.ready) return null
  const idx = (user.gradeIndex ?? 0) + 1
  const grade = gradeAt(idx)
  const ctc = round1((user.ctc ?? 6) * 1.22)
  promoteStmt.run(idx, grade.name, ctc, user.id)
  return { grade: grade.name, ctc, from: check.grade.name }
}
