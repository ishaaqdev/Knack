import { db } from './db.js'

/**
 * Interview preparation.
 *
 * Five rounds, each a different kind of pressure. The rounds are fixed and
 * declarative — what changes between two students is not the round but the
 * questions inside it, which are written against their resume, their GitHub and
 * their target role.
 *
 * Progression is a competency gate, not an XP threshold: you unlock round N+1
 * by actually clearing round N. Grinding the same round cannot advance you.
 */

export const QUESTIONS_PER_ROUND = 3
export const PASS_SCORE = 6

export const ROUNDS = [
  {
    level: 1,
    name: 'Introduction',
    focus: 'who you are and why this role',
    brief: `Opening questions. "Tell me about yourself", why this role, why this
company, what they know about the work. The test is whether they can give a
structured, specific answer instead of reciting their CV.`,
    ask: `Ask about their background, their motivation for this role, and one
thing on their resume they should be able to talk about naturally.`,
  },
  {
    level: 2,
    name: 'Behavioural',
    focus: 'past behaviour as evidence',
    brief: `Behavioural questions — a time they disagreed, a time they failed, a
time they had to work with someone difficult. The test is whether they answer
with a real, structured story instead of a hypothetical.`,
    ask: `Ask three behavioural questions in the "tell me about a time when"
form, aimed at situations a student could genuinely have lived through.`,
  },
  {
    level: 3,
    name: 'Your work',
    focus: 'depth on what they have actually built',
    brief: `Project and skill depth. The interviewer has read the resume and is
probing whether the candidate really did the work: design choices, trade-offs,
what broke, what they would change. The test is specificity.`,
    ask: `Ask about the specific projects and technologies listed below. Name
them. Probe a design decision, a trade-off, and a failure or limitation.`,
  },
  {
    level: 4,
    name: 'Pressure',
    focus: 'holding up under challenge',
    brief: `Follow-up and pressure. The interviewer pushes back on the answer,
questions a claim, or names a gap in the resume. The test is whether the
candidate stays composed and reasons rather than crumbling or bluffing.`,
    ask: `Ask questions that challenge the candidate — a gap in their profile, a
claim that needs defending, a "what if you are wrong" follow-up. Stay
professional, never rude.`,
  },
  {
    level: 5,
    name: 'Closing',
    focus: 'judgement, fit and the questions they ask back',
    brief: `The closing round: judgement calls, expectations, salary and growth,
and the questions the candidate asks the interviewer. The test is maturity and
whether they treat it as a two-way conversation.`,
    ask: `Ask one judgement question, one about expectations or growth, and one
that invites them to ask the interviewer something.`,
  },
]

export const roundFor = (level) => ROUNDS.find((r) => r.level === level) ?? ROUNDS[0]

export const MAX_LEVEL = ROUNDS.length

/* ------------------------------------------------------------- progress --- */

const bestByLevel = db.prepare(
  `SELECT level, MAX(score) AS best, COUNT(*) AS runs
   FROM interview_runs WHERE userId = ? GROUP BY level`
)

const totalXp = db.prepare(
  'SELECT COALESCE(SUM(xpAwarded), 0) AS xp, COUNT(*) AS runs FROM interview_runs WHERE userId = ?'
)

/** Per-round history plus which rounds are open, for the interview home screen. */
export function interviewProgress(user) {
  const rows = bestByLevel.all(user.id)
  const byLevel = Object.fromEntries(rows.map((r) => [r.level, r]))
  const unlocked = Math.min(MAX_LEVEL, Math.max(1, user.interviewLevel ?? 1))
  const t = totalXp.get(user.id)

  const rounds = ROUNDS.map((r) => ({
    level: r.level,
    name: r.name,
    focus: r.focus,
    best: byLevel[r.level]?.best ?? null,
    runs: byLevel[r.level]?.runs ?? 0,
    cleared: (byLevel[r.level]?.best ?? 0) >= PASS_SCORE,
    unlocked: r.level <= unlocked,
  }))

  const scored = rounds.filter((r) => r.best !== null)

  return {
    rounds,
    unlocked,
    cleared: rounds.filter((r) => r.cleared).length,
    totalRuns: t.runs,
    xp: t.xp,
    // Headline number for the dashboard: mean best score across attempted
    // rounds, on the same 0-100 scale as the track skills.
    readiness: scored.length
      ? Math.round((scored.reduce((s, r) => s + r.best, 0) / scored.length) * 10)
      : 0,
    passScore: PASS_SCORE,
    maxLevel: MAX_LEVEL,
  }
}

/** Clearing a round opens the next one. Never demotes. */
export function unlockAfter(user, level, score) {
  if (score < PASS_SCORE || level >= MAX_LEVEL) return user.interviewLevel ?? 1
  const next = Math.min(MAX_LEVEL, level + 1)
  if (next <= (user.interviewLevel ?? 1)) return user.interviewLevel ?? 1
  db.prepare('UPDATE users SET interviewLevel = ? WHERE id = ?').run(next, user.id)
  return next
}

/** Interview XP: five per point per answer, so a strong round pays ~150. */
export const interviewXp = (perAnswer) =>
  perAnswer.reduce((sum, a) => sum + Math.max(0, Math.min(10, a.score)) * 5, 0)
