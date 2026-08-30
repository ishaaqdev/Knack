import { db, safeParse } from './db.js'
import { listCharacters, recordInteraction, standing } from './characters.js'
import { worldBrief, completedLevels } from './consequences.js'

/**
 * The workplace.
 *
 * This is the part that makes the blueprint's central claim true: the questions
 * live inside a world rather than the world being decoration around questions.
 * A day is a place you walk into, a handful of things happen, and what happens
 * depends on where you go, who you have been decent to, and what you did last
 * week.
 *
 * The day is assembled here rather than asked for wholesale. A model given
 * "write me a day at work" writes the same day every time; given a location, a
 * person, a pressure and an unfinished thread, it writes a specific one.
 */

/* ------------------------------------------------------------ locations -- */

export const LOCATIONS = [
  {
    id: 'desk',
    name: 'Your desk',
    blurb: 'Messages, the task you are actually meant to be doing, and whatever arrived overnight.',
    beats: ['message', 'task', 'decision'],
  },
  {
    id: 'manager',
    name: "Your manager's office",
    blurb: 'One-to-ones, bad news in both directions, and the conversations that decide things.',
    beats: ['dialogue', 'decision'],
    with: 'manager',
  },
  {
    id: 'meeting',
    name: 'The meeting room',
    blurb: 'Standups, design reviews, and the moment where you either speak or do not.',
    beats: ['decision', 'dialogue'],
  },
  {
    id: 'cafeteria',
    name: 'The cafeteria',
    blurb: 'Where you find out what is actually going on, and where relationships are made.',
    beats: ['dialogue', 'message'],
    with: 'peer',
  },
  {
    id: 'hr',
    name: 'HR',
    blurb: 'Process, confidentiality, and problems that are about people rather than work.',
    beats: ['dialogue', 'decision'],
    with: 'hr',
  },
]

export const locationFor = (id) => LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0]

/* ---------------------------------------------------------------- a day -- */

/**
 * The rhythm of a day.
 *
 * Three beats, not eight. The blueprint sketches a nine-item timetable, but a
 * daily habit that takes forty minutes is a daily habit nobody keeps — and the
 * same structure repeated every day is exactly the "linear course" the document
 * warns against. Three beats, differently shaped, chosen from where the trainee
 * went.
 */
export const BEATS_PER_DAY = 3

export const BEAT_KINDS = {
  message: { label: 'A message', seconds: 90 },
  task: { label: 'The work', seconds: 120 },
  decision: { label: 'A decision', seconds: 60 },
  dialogue: { label: 'A conversation', seconds: 120 },
}

const dayCount = db.prepare('SELECT COUNT(*) AS n FROM workdays WHERE userId = ?')
const openDay = db.prepare(
  "SELECT * FROM workdays WHERE userId = ? AND status = 'open' ORDER BY id DESC LIMIT 1"
)
const recentDays = db.prepare(
  'SELECT id, dayNumber, summary, xpAwarded, closedAt FROM workdays WHERE userId = ? AND status = ? ORDER BY id DESC LIMIT ?'
)
const insertDay = db.prepare(`
  INSERT INTO workdays (userId, dayNumber, location, events, summary, status, xpAwarded, createdAt)
  VALUES (@userId, @dayNumber, @location, @events, '{}', 'open', 0, @createdAt)
`)
const updateDay = db.prepare('UPDATE workdays SET events = ? WHERE id = ?')
const closeDay = db.prepare(
  "UPDATE workdays SET status = 'done', summary = ?, xpAwarded = ?, closedAt = ? WHERE id = ?"
)

export const dayNumber = (userId) => dayCount.get(userId).n + 1

export const currentDay = (userId) => {
  const row = openDay.get(userId)
  return row ? { ...row, events: safeParse(row.events, []) } : null
}

export const dayHistory = (userId, limit = 5) =>
  recentDays.all(userId, 'done', limit).map((d) => ({ ...d, summary: safeParse(d.summary, {}) }))

export function startDay(userId, locationId, plan) {
  const n = dayNumber(userId)
  const info = insertDay.run({
    userId,
    dayNumber: n,
    location: locationId,
    events: JSON.stringify(plan),
    createdAt: new Date().toISOString(),
  })
  return { id: info.lastInsertRowid, dayNumber: n, location: locationId, events: plan }
}

export const saveEvents = (dayId, events) => updateDay.run(JSON.stringify(events), dayId)

/**
 * Plans the shape of a day before any of it is written.
 *
 * The plan is a list of (kind, character, pressure) triples. Sampling the shape
 * here and handing it to the model as a requirement is the same trick that
 * fixed scenario repetition: asking a small model to vary its own output does
 * not work, so it is not asked.
 */
const PRESSURES = [
  'you are already behind on something else',
  'this is the third time it has come up',
  'somebody senior is watching how you handle it',
  'you do not have the information you would need to be sure',
  'the deadline moved this morning',
  'the person asking has been short with you lately',
  'you were not told about this until now',
  'saying yes means something else slips',
]

export function planDay(userId, locationId, seed = 0) {
  const location = locationFor(locationId)
  const people = listCharacters(userId)
  const world = worldBrief(userId)

  // The location decides the kinds of beat; the cast and the world decide who
  // is in them. A cold colleague is more likely to turn up, because that is
  // what an unresolved relationship feels like from the inside.
  const cold = people.filter((c) => world?.cold?.includes(c.name))
  const anchored = location.with ? people.find((c) => c.slug === location.with) : null

  const plan = []
  for (let i = 0; i < BEATS_PER_DAY; i++) {
    const kinds = location.beats
    const kind = kinds[(seed + i) % kinds.length]

    let who = anchored
    if (!who || i > 0) {
      const pool = cold.length && (seed + i) % 3 === 0 ? cold : people
      who = pool.length ? pool[(seed + i * 3) % pool.length] : null
    }

    plan.push({
      index: i,
      kind,
      seconds: BEAT_KINDS[kind].seconds,
      characterId: who?.id ?? null,
      characterName: who?.name ?? null,
      characterRole: who?.role ?? null,
      pressure: PRESSURES[(seed + i * 5) % PRESSURES.length],
      status: 'pending',
      turns: [],
    })
  }
  return plan
}

/* ------------------------------------------------- the company moves on --- */

const insertCompanyEvent = db.prepare(`
  INSERT INTO company_events (userId, kind, characterId, headline, detail, atDay, createdAt)
  VALUES (@userId, @kind, @characterId, @headline, @detail, @atDay, @createdAt)
`)
const unseenEvents = db.prepare(
  'SELECT * FROM company_events WHERE userId = ? AND seen = 0 ORDER BY id'
)
const markSeen = db.prepare('UPDATE company_events SET seen = 1 WHERE userId = ?')
const allEvents = db.prepare(
  'SELECT * FROM company_events WHERE userId = ? ORDER BY id DESC LIMIT ?'
)

const promoteChar = db.prepare(
  'UPDATE characters SET role = ?, careerHistory = ?, sortOrder = sortOrder WHERE id = ?'
)
const setCharStatus = db.prepare('UPDATE characters SET status = ? WHERE id = ?')

/**
 * The company keeps existing whether or not the trainee is looking.
 *
 * Fires at most one event per day, on a schedule rather than a dice roll, so
 * the world moves visibly but does not churn. Every event is tied to a real
 * character, so "Kiran has been promoted" means the Kiran in the directory now
 * has a different role.
 */
export function evolveCompany(userId, day) {
  if (day < 3 || day % 3 !== 0) return null

  const people = listCharacters(userId).filter((c) => c.status === 'active')
  if (!people.length) return null

  const step = Math.floor(day / 3)
  const target = people[step % people.length]
  const now = new Date().toISOString()

  // A colleague you have been good to gets promoted; one you have neglected
  // moves away. Neither is a punishment — it is the world using the same
  // information the trainee has been given.
  const kind = target.relationship >= 60 ? 'promotion' : step % 2 === 0 ? 'transfer' : 'joiner'

  let headline
  let detail

  if (kind === 'promotion') {
    const next = nextRole(target.role)
    promoteChar.run(next, JSON.stringify([...target.careerHistory, next]), target.id)
    headline = `${target.name} has been promoted to ${next}.`
    detail = `They have been doing the job for a while. Worth a message — people remember who noticed.`
  } else if (kind === 'transfer') {
    setCharStatus.run('transferred', target.id)
    headline = `${target.name} has moved to another team.`
    detail = `Still in the company, but no longer in the room every day. Whatever was unresolved with them stays unresolved.`
  } else {
    headline = `A new intern started on the team this week.`
    detail = `You are no longer the newest person here. That changes what people expect of you.`
  }

  insertCompanyEvent.run({
    userId,
    kind,
    characterId: target.id,
    headline,
    detail,
    atDay: day,
    createdAt: now,
  })

  return { kind, headline, detail, character: target.name }
}

const LADDER = [
  'Intern',
  'Junior Engineer',
  'Engineer',
  'Senior Engineer',
  'Team Lead',
  'Engineering Manager',
]

function nextRole(role) {
  const i = LADDER.findIndex((r) => role.includes(r.replace('Engineering ', '')))
  if (i >= 0 && LADDER[i + 1]) return LADDER[i + 1]
  return `Senior ${role}`
}

export const pendingCompanyNews = (userId) => unseenEvents.all(userId)
export const clearCompanyNews = (userId) => markSeen.run(userId)
export const companyFeed = (userId, limit = 12) => allEvents.all(userId, limit)

/* -------------------------------------------------------- day summary ----- */

/**
 * The end of the day.
 *
 * Deliberately not just "you earned 140 XP". The blueprint's session summary is
 * a list of what changed — attributes, relationships, what happened, and what
 * is waiting tomorrow — because that is what makes a day feel like it was part
 * of something.
 */
export function summariseDay({ events, attributeMoves, relationshipMoves, badges, news }) {
  const scored = events.filter((e) => typeof e.score === 'number')
  const mean = scored.length ? scored.reduce((s, e) => s + e.score, 0) / scored.length : 0

  return {
    beats: events.map((e) => ({
      kind: e.kind,
      character: e.characterName,
      score: e.score ?? null,
      timedOut: !!e.timedOut,
      headline: e.headline ?? null,
    })),
    meanScore: Math.round(mean * 10) / 10,
    attributes: attributeMoves,
    relationships: relationshipMoves,
    badges,
    news,
    timedOut: events.filter((e) => e.timedOut).length,
  }
}

export function finishDay(dayId, summary, xp) {
  closeDay.run(JSON.stringify(summary), xp, new Date().toISOString(), dayId)
}

/** Where the trainee stands with the team, for the office screen. */
export const officeStanding = (userId) => ({
  ...standing(userId),
  levels: completedLevels(userId),
})

export { recordInteraction }
