import { db } from './db.js'
import { seedCast, listCharacters } from './characters.js'
import { award } from './badges.js'
import { MAX_LEVEL as INTERVIEW_ROUNDS, interviewProgress } from './interview.js'

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
 * room, how formal the language is and what the stakes are.
 */
export const COMPANIES = [
  {
    id: 'startup',
    name: 'Nexora',
    kind: 'a 30-person product startup',
    blurb: 'Everyone is reachable, nothing is documented, and the roadmap changed on Tuesday.',
  },
  {
    id: 'product',
    name: 'Aether Systems',
    kind: 'a 900-person product company',
    blurb: 'Defined teams, real process, and a design review you have to get through.',
  },
  {
    id: 'service',
    name: 'Vantage Global',
    kind: 'a large IT services company',
    blurb: 'Clients, hierarchy, status calls, and a manager between you and every decision.',
  },
]

export const ROLES = [
  { id: 'swe', name: 'Software Engineer Intern', blurb: 'Code review, blockers, estimates, deploys.' },
  { id: 'data', name: 'Data / ML Intern', blurb: 'Model quality, data disputes, results people over-read.' },
  { id: 'product', name: 'Product Intern', blurb: 'Requirements, stakeholders, saying no to features.' },
  { id: 'qa', name: 'QA / DevOps Intern', blurb: 'Release gates, flaky tests, the thing that broke at 6pm.' },
  { id: 'hr', name: 'HR Intern', blurb: 'Confidential conversations, scheduling, people problems.' },
]

export const companyFor = (id) => COMPANIES.find((c) => c.id === id) ?? COMPANIES[0]
export const roleFor = (id) => ROLES.find((r) => r.id === id) ?? ROLES[0]

/* --------------------------------------------------------------- state --- */

const setPhase = db.prepare('UPDATE users SET phase = ? WHERE id = ?')
const setCompany = db.prepare(
  `UPDATE users SET simCompany = @simCompany, simCompanyKind = @simCompanyKind,
                    simRole = @simRole WHERE id = @id`
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
    company: user.simCompany ? { name: user.simCompany, kind: user.simCompanyKind } : null,
    role: user.simRole ? roleFor(user.simRole) : null,
    gd: { best: gd.best ?? null, runs: gd.runs, cleared: !!user.gdCleared, pass: GD_PASS },
    interview: { cleared: iv.cleared, rounds: iv.maxLevel, unlocked: iv.unlocked },
    internship: {
      level: user.internshipLevel ?? INTERNSHIP_START,
      start: INTERNSHIP_START,
      end: INTERNSHIP_END,
    },
    joinedAt: user.joinedCompanyAt,
  }
}

/** Chooses the company and role. Only meaningful before joining. */
export function chooseCompany(user, { companyId, roleId }) {
  const c = companyFor(companyId)
  const r = roleFor(roleId)
  setCompany.run({ id: user.id, simCompany: c.name, simCompanyKind: c.kind, simRole: r.id })
  return { company: c, role: r }
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
