import { db } from './db.js'
import { seedCast, listCharacters } from './characters.js'
import { award } from './badges.js'
import { weakest, tierFor, ATTRIBUTES } from './attributes.js'
import { MAX_LEVEL as INTERVIEW_ROUNDS, interviewProgress } from './interview.js'
import { COMPANIES as COMPANY_DATA, companyById, companySummary, companyProfile } from './companies.js'

/**
 * The career spine.
 *
 * Phases run in one direction and each one gates the next, because that is the
 * order the real thing happens in: you sit a group discussion, then an
 * interview, then you join, then you work. A trainee cannot reach the workplace
 * scenarios without having been through the gate that would let them in.
 *
 * The phase lives on the user row and every route reads it. Nothing here
 * advances a phase on XP alone.
 */

export const PHASES = [
  {
    id: 'gd',
    name: 'Group Discussion',
    tagline: 'The first cut. Five candidates, one topic, twenty minutes.',
    goal: 'Clear one discussion at 6/10 or better.',
  },
  {
    id: 'interview',
    name: 'Interview',
    tagline: 'Five rounds with someone who has read your resume.',
    goal: `Clear all ${INTERVIEW_ROUNDS} rounds.`,
  },
  {
    id: 'joining',
    name: 'Joining',
    tagline: 'You got the internship. Meet the people you will work with.',
    goal: 'Name your team and start.',
  },
  {
    id: 'internship',
    name: 'Internship',
    tagline: 'Levels 5 to 30. The work, the people, and the consequences.',
    goal: 'Reach level 30.',
  },
  {
    id: 'offer',
    name: 'The Offer',
    tagline: 'Performance review, then a number you can argue with.',
    goal: 'Accept or negotiate.',
  },
  {
    id: 'fulltime',
    name: 'Full-Time',
    tagline: 'Junior to Manager, one promotion at a time.',
    goal: 'Keep going.',
  },
]

export const PHASE_IDS = PHASES.map((p) => p.id)
export const phaseIndex = (id) => Math.max(0, PHASE_IDS.indexOf(id))
export const phaseFor = (id) => PHASES.find((p) => p.id === id) ?? PHASES[0]

export const INTERNSHIP_START = 5
export const INTERNSHIP_END = 30

/* ------------------------------------------------------------ companies -- */

/**
 * Where the simulation is set. The trainee picks one; it changes who is in the
 * room, how formal the language is and what the stakes are. The dataset lives in
 * companies.js — real firms and invented ones — and this is the picker's view.
 */
export const COMPANIES = COMPANY_DATA.map(companySummary)

export const ROLES = [
  { id: 'swe', name: 'Software Engineer Intern', blurb: 'Code review, blockers, estimates, deploys.' },
  { id: 'data', name: 'Data / ML Intern', blurb: 'Model quality, data disputes, results people over-read.' },
  { id: 'product', name: 'Product Intern', blurb: 'Requirements, stakeholders, saying no to features.' },
  { id: 'qa', name: 'QA / DevOps Intern', blurb: 'Release gates, flaky tests, the thing that broke at 6pm.' },
  { id: 'hr', name: 'HR Intern', blurb: 'Confidential conversations, scheduling, people problems.' },
]

export const companyFor = (id) => COMPANIES.find((c) => c.id === id) ?? COMPANIES[0]

/** The full profile — description, headcount, turnover, hiring and openings. */
export const profileFor = (id) => companyProfile(companyById(id) ?? COMPANY_DATA[0], ROLES)
export const roleFor = (id) => ROLES.find((r) => r.id === id) ?? ROLES[0]

/* --------------------------------------------------------------- state --- */

const setPhase = db.prepare('UPDATE users SET phase = ? WHERE id = ?')
const setCompany = db.prepare(
  `UPDATE users SET simCompany = @simCompany, simCompanyKind = @simCompanyKind,
                    simCompanyId = @simCompanyId, simRole = @simRole WHERE id = @id`
)
const setJoined = db.prepare(
  'UPDATE users SET joinedCompanyAt = ?, internshipLevel = ?, phase = ? WHERE id = ?'
)
const setGdCleared = db.prepare('UPDATE users SET gdCleared = 1, phase = ? WHERE id = ?')
const bumpInternship = db.prepare('UPDATE users SET internshipLevel = ? WHERE id = ?')

const gdBest = db.prepare('SELECT MAX(score) AS best, COUNT(*) AS runs FROM gd_runs WHERE userId = ?')

export const GD_PASS = 6

/** Everything the client needs to draw the career map. */
export function careerState(user) {
  const gd = gdBest.get(user.id)
  const iv = interviewProgress(user)
  const phase = user.phase ?? 'gd'

  return {
    phase,
    phaseIndex: phaseIndex(phase),
    phases: PHASES.map((p, i) => ({
      ...p,
      reached: i <= phaseIndex(phase),
      current: p.id === phase,
    })),
    company: user.simCompany
      ? { id: user.simCompanyId ?? null, name: user.simCompany, kind: user.simCompanyKind }
      : null,
    role: user.simRole ? roleFor(user.simRole) : null,
    gd: { best: gd.best ?? null, runs: gd.runs, cleared: !!user.gdCleared, pass: GD_PASS },
    interview: { cleared: iv.cleared, rounds: iv.maxLevel, unlocked: iv.unlocked },
    internship: {
      level: user.internshipLevel ?? INTERNSHIP_START,
      start: INTERNSHIP_START,
      end: INTERNSHIP_END,
    },
    joinedAt: user.joinedCompanyAt,
    band: phase === 'internship' ? bandFor(user.internshipLevel ?? INTERNSHIP_START) : null,
    objective: currentObjective(user),
    review: reviewDue(user),
    grade: user.jobTitle ? { name: user.jobTitle, ctc: user.ctc } : null,
  }
}

/** Chooses the company and role. Only meaningful before joining. */
export function chooseCompany(user, { companyId, roleId, customName }) {
  const c = companyFor(companyId)
  const r = roleFor(roleId)

  // The trainee may name an invented company themselves. The kind still comes
  // from the preset, because that is what decides how formal the room is and who
  // is in it — the name is the part that makes it theirs. A real company keeps
  // its own name: renaming TCS to something else would just be a different
  // fictional company wearing a real one's numbers.
  const name = c.real ? c.name : String(customName ?? '').trim().slice(0, 40) || c.name

  setCompany.run({
    id: user.id,
    simCompany: name,
    simCompanyKind: c.kind,
    simCompanyId: c.id,
    simRole: r.id,
  })
  return { company: { ...c, name }, role: r }
}

/** GD cleared: opens the interview phase. Never demotes. */
export function clearGd(user, score) {
  if (score < GD_PASS) return user.phase ?? 'gd'
  if (phaseIndex(user.phase) > phaseIndex('gd')) {
    db.prepare('UPDATE users SET gdCleared = 1 WHERE id = ?').run(user.id)
    return user.phase
  }
  setGdCleared.run('interview', user.id)
  award(user.id, 'voice-of-the-room', `Cleared the group discussion with ${score}/10.`)
  return 'interview'
}

/** All interview rounds cleared: the offer of an internship. */
export function clearInterview(user) {
  if (phaseIndex(user.phase) > phaseIndex('interview')) return user.phase
  setPhase.run('joining', user.id)
  award(user.id, 'offer-secured', `Cleared all ${INTERVIEW_ROUNDS} interview rounds.`)
  return 'joining'
}

/**
 * Joining. This is where the cast comes into existence — before this the
 * trainee is a candidate and has no colleagues.
 */
export function joinCompany(user) {
  if (phaseIndex(user.phase) < phaseIndex('joining')) return null
  const now = new Date().toISOString()
  if (!user.joinedCompanyAt) {
    setJoined.run(now, INTERNSHIP_START, 'internship', user.id)
    award(user.id, 'first-day', 'Joined the company as an intern.')
  }
  seedCast(user.id)
  return { joinedAt: user.joinedCompanyAt ?? now, cast: listCharacters(user.id) }
}

/**
 * Internship progression.
 *
 * A level is earned by performance, not by attendance: a level scored below 5
 * does not advance the internship, it just costs the day. Reaching 30 opens the
 * offer.
 */
export function advanceInternship(user, levelScore) {
  const current = user.internshipLevel ?? INTERNSHIP_START
  if (user.phase !== 'internship') return { level: current, advanced: false, phase: user.phase }
  if (levelScore < 5) return { level: current, advanced: false, phase: user.phase }

  const next = Math.min(INTERNSHIP_END, current + 1)
  if (next !== current) bumpInternship.run(next, user.id)

  if (next >= INTERNSHIP_END) {
    setPhase.run('offer', user.id)
    return { level: next, advanced: true, phase: 'offer' }
  }
  return { level: next, advanced: next !== current, phase: user.phase }
}

/* --------------------------------------------- what to do next (§9, §50) -- */

/**
 * Internship difficulty bands.
 *
 * The design document splits the internship into early, middle and advanced,
 * and it is right to: a level-6 intern being handed a stakeholder conflict is
 * not training, it is noise. The band decides how hard the situations are and
 * how much context they assume.
 */
export const BANDS = [
  {
    id: 'early',
    from: 5,
    to: 12,
    name: 'Early internship',
    difficulty: 'easy',
    brief: 'introductions, basic tasks, asking for help, learning how the team works',
  },
  {
    id: 'middle',
    from: 13,
    to: 22,
    name: 'Middle internship',
    difficulty: 'medium',
    brief: 'deadlines, disagreement, presentations, difficult colleagues',
  },
  {
    id: 'advanced',
    from: 23,
    to: 30,
    name: 'Advanced internship',
    difficulty: 'hard',
    brief: 'leading, high-pressure calls, competing stakeholders, presenting to seniors',
  },
]

export const bandFor = (level) =>
  BANDS.find((b) => level >= b.from && level <= b.to) ?? BANDS[0]

/**
 * A development challenge, aimed at the weakest attribute.
 *
 * The document's complaint about telling a learner they are bad at something is
 * fair, so this never says it. It offers a specific thing to go and do, in the
 * track that actually exercises the ability, and the scenario generator is
 * already pointed at the same weakness.
 */
const ATTRIBUTE_TRACK = {
  communication: 'workplace-communication',
  emotionalIntelligence: 'workplace-communication',
  relationshipBuilding: 'workplace-communication',
  confidence: 'workplace-communication',
  professionalism: 'workplace-communication',
  leadership: 'critical-thinking',
  decisionMaking: 'critical-thinking',
  adaptability: 'critical-thinking',
  problemSolving: 'critical-thinking',
  teamwork: 'workplace-communication',
}

export function developmentChallenge(userId) {
  const weak = weakest(userId, 1)[0]
  if (!weak) return null

  const detail = ATTRIBUTES.find((a) => a.key === weak.key)
  return {
    key: weak.key,
    name: weak.name,
    value: Math.round(weak.value),
    tier: tierFor(weak.value).label,
    trackId: ATTRIBUTE_TRACK[weak.key] ?? 'workplace-communication',
    // One suggestion, not the whole list — a challenge is a thing you go and
    // do, and three of them is a reading exercise.
    challenge: detail?.improve?.[0] ?? 'Take on something that forces this.',
  }
}

/**
 * The single line telling the trainee what to do next.
 *
 * Every screen in this app has exactly one primary action; the dashboard should
 * be able to say what today's is in a sentence.
 */
export function currentObjective(user) {
  const phase = user.phase ?? 'gd'
  const challenge = developmentChallenge(user.id)

  if (phase === 'gd') {
    return { text: 'Clear a group discussion at 6 out of 10.', to: '/gd', label: 'Group discussion' }
  }
  if (phase === 'interview') {
    return { text: 'Clear the next interview round.', to: '/interview', label: 'Interview' }
  }
  if (phase === 'joining') {
    return { text: 'Join the company and meet your team.', to: '/career', label: 'Joining' }
  }
  if (phase === 'offer') {
    return { text: 'Read your review, then decide on the offer.', to: '/offer', label: 'The offer' }
  }

  const band = bandFor(user.internshipLevel ?? INTERNSHIP_START)
  if (phase === 'internship') {
    return challenge
      ? {
          text: `${challenge.name} is your weakest at ${challenge.value}. ${challenge.challenge}`,
          to: '/office',
          label: `${band.name} · level ${user.internshipLevel ?? INTERNSHIP_START}`,
        }
      : { text: 'Go to the office and take a day.', to: '/office', label: band.name }
  }

  return challenge
    ? {
        text: `${challenge.name} at ${challenge.value} is what stands between you and the next grade.`,
        to: '/office',
        label: user.jobTitle ?? 'Full-time',
      }
    : { text: 'Keep working towards the next grade.', to: '/office', label: 'Full-time' }
}

/* ------------------------------------------- periodic reviews (§46) ------- */

export const REVIEW_EVERY = 6

/**
 * A review is due every six internship levels.
 *
 * The document asks for periodic reviews and it is right that they matter more
 * than the final one: a review that arrives only at the end cannot change
 * anything. This reports when one is owed; the offer module writes it.
 */
export function reviewDue(user) {
  if (user.phase !== 'internship') return null
  const level = user.internshipLevel ?? INTERNSHIP_START
  const since = level - (user.lastReviewLevel ?? INTERNSHIP_START)
  if (since < REVIEW_EVERY) {
    return { due: false, nextAt: (user.lastReviewLevel ?? INTERNSHIP_START) + REVIEW_EVERY }
  }
  return { due: true, atLevel: level }
}

export const markReviewed = (userId, level) =>
  db.prepare('UPDATE users SET lastReviewLevel = ? WHERE id = ?').run(level, userId)
