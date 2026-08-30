import { db } from './db.js'

/**
 * Achievements.
 *
 * Every badge has a condition that is checked against real state — none are
 * awarded for turning up, and none are awarded randomly. The `why` recorded
 * alongside each one is the specific thing that earned it, so the badge shelf
 * reads as a history rather than a trophy cabinet.
 */

export const BADGES = [
  {
    slug: 'career-starter',
    name: 'Career Starter',
    hint: 'Enter the simulation.',
    phase: 'gd',
  },
  {
    slug: 'discussion-catalyst',
    name: 'Discussion Catalyst',
    hint: 'Make a valuable contribution in a group discussion.',
    phase: 'gd',
  },
  {
    slug: 'voice-of-the-room',
    name: 'Voice of the Room',
    hint: 'Clear a group discussion with 7 or better.',
    phase: 'gd',
  },
  {
    slug: 'interview-ready',
    name: 'Interview Ready',
    hint: 'Clear the first interview round.',
    phase: 'interview',
  },
  {
    slug: 'under-pressure',
    name: 'Under Pressure',
    hint: 'Clear the pressure round without dropping below 6.',
    phase: 'interview',
  },
  {
    slug: 'offer-secured',
    name: 'Offer Secured',
    hint: 'Clear all five interview rounds.',
    phase: 'interview',
  },
  {
    slug: 'first-day',
    name: 'First Day',
    hint: 'Join the company.',
    phase: 'joining',
  },
  {
    slug: 'confident-communicator',
    name: 'Confident Communicator',
    hint: 'Reach 70 in Communication.',
    phase: 'any',
  },
  {
    slug: 'leadership-spark',
    name: 'Leadership Spark',
    hint: 'Reach 60 in Leadership.',
    phase: 'any',
  },
  {
    slug: 'professional-standard',
    name: 'Professional Standard',
    hint: 'Reach 80 in Professionalism.',
    phase: 'any',
  },
  {
    slug: 'problem-solver',
    name: 'Problem Solver',
    hint: 'Reach 75 in Problem-Solving.',
    phase: 'any',
  },
  {
    slug: 'team-player',
    name: 'Team Player',
    hint: 'Reach 70 in Teamwork.',
    phase: 'any',
  },
  {
    slug: 'trusted-colleague',
    name: 'Trusted Colleague',
    hint: 'Reach Trusted with anyone on the team.',
    phase: 'internship',
  },
  {
    slug: 'people-person',
    name: 'People Person',
    hint: 'Hold a Positive or better relationship with the whole team.',
    phase: 'internship',
  },
  {
    slug: 'conflict-navigator',
    name: 'Conflict Navigator',
    hint: 'Score 8 or better on a level about disagreement.',
    phase: 'internship',
  },
  {
    slug: 'deadline-defender',
    name: 'Deadline Defender',
    hint: 'Score 8 or better on a level under deadline pressure.',
    phase: 'internship',
  },
  {
    slug: 'feedback-pro',
    name: 'Feedback Pro',
    hint: 'Act on a gap the app flagged, and score better next time.',
    phase: 'internship',
  },
  {
    slug: 'promotion-ready',
    name: 'Promotion Ready',
    hint: 'Finish the internship and receive an offer.',
    phase: 'offer',
  },
  {
    slug: 'negotiation-pro',
    name: 'Negotiation Pro',
    hint: 'Improve your offer by asking for it properly.',
    phase: 'offer',
  },
  {
    slug: 'career-launch',
    name: 'Career Launch',
    hint: 'Accept your first full-time role.',
    phase: 'offer',
  },
  {
    slug: 'rising-professional',
    name: 'Rising Professional',
    hint: 'Earn a promotion.',
    phase: 'fulltime',
  },
  {
    slug: 'long-memory',
    name: 'Long Memory',
    hint: 'Have a past decision come back to help you.',
    phase: 'internship',
  },
  {
    slug: 'workplace-explorer',
    name: 'Workplace Explorer',
    hint: 'Get through your first day in the office.',
    phase: 'internship',
  },
  {
    slug: 'steady-hand',
    name: 'Steady Hand',
    hint: 'Hold a seven-day streak.',
    phase: 'any',
  },
]

const BY_SLUG = Object.fromEntries(BADGES.map((b) => [b.slug, b]))

const ownedStmt = db.prepare('SELECT slug, why, at FROM badges WHERE userId = ? ORDER BY id')
const hasStmt = db.prepare('SELECT 1 FROM badges WHERE userId = ? AND slug = ?')
const insertStmt = db.prepare(`
  INSERT INTO badges (userId, slug, why, phase, at)
  VALUES (@userId, @slug, @why, @phase, @at)
  ON CONFLICT(userId, slug) DO NOTHING
`)

export const hasBadge = (userId, slug) => !!hasStmt.get(userId, slug)

/** Awards a badge once. Returns it if this was the first time, else null. */
export function award(userId, slug, why) {
  const def = BY_SLUG[slug]
  if (!def || hasBadge(userId, slug)) return null
  insertStmt.run({
    userId,
    slug,
    why: String(why ?? def.hint).slice(0, 200),
    phase: def.phase,
    at: new Date().toISOString(),
  })
  return { slug, name: def.name, why: String(why ?? def.hint).slice(0, 200) }
}

/**
 * The whole shelf, earned and unearned. Showing the locked ones is deliberate:
 * a badge nobody knows exists cannot motivate anyone.
 */
export function listBadges(userId) {
  const owned = Object.fromEntries(ownedStmt.all(userId).map((b) => [b.slug, b]))
  return BADGES.map((b) => ({
    slug: b.slug,
    name: b.name,
    hint: b.hint,
    phase: b.phase,
    earned: !!owned[b.slug],
    why: owned[b.slug]?.why ?? null,
    at: owned[b.slug]?.at ?? null,
  }))
}

export const earnedCount = (userId) => ownedStmt.all(userId).length

/* ------------------------------------------------------------ triggers --- */

const ATTRIBUTE_BADGES = [
  ['confident-communicator', 'communication', 70],
  ['leadership-spark', 'leadership', 60],
  ['professional-standard', 'professionalism', 80],
  ['problem-solver', 'problemSolving', 75],
  ['team-player', 'teamwork', 70],
]

/**
 * Checks every condition that depends on standing state. Called after anything
 * that could move an attribute, a relationship or a streak.
 */
export function checkStateBadges(userId, { attributes, characters, streak } = {}) {
  const won = []

  if (attributes) {
    const by = Object.fromEntries(attributes.map((a) => [a.key, a.value]))
    for (const [slug, key, threshold] of ATTRIBUTE_BADGES) {
      if ((by[key] ?? 0) >= threshold) {
        const b = award(userId, slug, `${BY_SLUG[slug].name}: reached ${by[key]} in this attribute.`)
        if (b) won.push(b)
      }
    }
  }

  if (characters?.length) {
    const trusted = characters.find((c) => c.relationship >= 76)
    if (trusted) {
      const b = award(userId, 'trusted-colleague', `${trusted.name} trusts you (${trusted.relationship}/100).`)
      if (b) won.push(b)
    }
    if (characters.every((c) => c.relationship >= 61)) {
      const b = award(userId, 'people-person', 'Every colleague on the team is Positive or better.')
      if (b) won.push(b)
    }
  }

  if (streak >= 7) {
    const b = award(userId, 'steady-hand', `${streak} days in a row.`)
    if (b) won.push(b)
  }

  return won
}
