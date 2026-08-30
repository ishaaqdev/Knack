import { db } from './db.js'
import { listCharacters, recordInteraction } from './characters.js'

/**
 * The consequence engine.
 *
 * A decision that only costs you points at the moment you make it is not a
 * consequence, it is a score. What the blueprint asks for is the other thing:
 * you embarrass a colleague in week two, and in week six they are slow to help
 * you on something that matters, and the app tells you why.
 *
 * So a notable outcome is written down with a due count, and the world checks
 * for anything owed before it builds the next situation. The count is in
 * completed levels rather than days, because the simulation only moves when the
 * trainee does.
 */

const insert = db.prepare(`
  INSERT INTO consequences (userId, characterId, kind, cause, effect, weight, dueAfter, createdAt)
  VALUES (@userId, @characterId, @kind, @cause, @effect, @weight, @dueAfter, @createdAt)
`)

const dueStmt = db.prepare(`
  SELECT c.*, ch.name AS characterName, ch.role AS characterRole
  FROM consequences c LEFT JOIN characters ch ON ch.id = c.characterId
  WHERE c.userId = ? AND c.firedAt IS NULL AND c.dueAfter <= ?
  ORDER BY c.id LIMIT 2
`)

const pendingStmt = db.prepare(
  'SELECT COUNT(*) AS n FROM consequences WHERE userId = ? AND firedAt IS NULL'
)

const fireStmt = db.prepare('UPDATE consequences SET firedAt = ? WHERE id = ?')

const levelCount = db.prepare(
  "SELECT COUNT(*) AS n FROM attempts WHERE userId = ? AND kind = 'level'"
)

export const completedLevels = (userId) => levelCount.get(userId).n

/* --------------------------------------------------------------- write --- */

/**
 * Schedules a consequence. `delay` is how many more levels have to pass first —
 * far enough that it lands as a callback rather than an immediate penalty, near
 * enough that the trainee still remembers what they did.
 */
export function schedule(userId, { characterId = null, kind, cause, effect, weight = 0, delay = 2 }) {
  insert.run({
    userId,
    characterId,
    kind,
    cause: String(cause).slice(0, 240),
    effect: String(effect).slice(0, 240),
    weight,
    dueAfter: completedLevels(userId) + Math.max(1, delay),
    createdAt: new Date().toISOString(),
  })
}

/**
 * Decides whether a graded exchange leaves anything behind.
 *
 * Most do not. Only the ends of the scale are worth remembering — an exchange
 * handled well enough that someone would return the favour, or badly enough
 * that they would think twice. A middling six is just a Tuesday.
 */
export function maybeSchedule(userId, { character, score, situation }) {
  if (!character) return null

  if (score >= 8) {
    schedule(userId, {
      characterId: character.id,
      kind: 'favour',
      cause: `You handled a difficult exchange with ${character.name} well.`,
      effect: `${character.name} goes out of their way for you.`,
      weight: 3,
      delay: 2,
    })
    return 'favour'
  }

  if (score <= 3) {
    schedule(userId, {
      characterId: character.id,
      kind: 'grudge',
      cause: `You handled ${character.name} badly during ${situation}.`,
      effect: `${character.name} is slower to help you than they would have been.`,
      weight: -3,
      delay: 3,
    })
    return 'grudge'
  }

  return null
}

/* ---------------------------------------------------------------- read --- */

/** Anything owed right now. Firing is separate, so a read stays side-effect free. */
export const due = (userId) => dueStmt.all(userId, completedLevels(userId))

export const pendingCount = (userId) => pendingStmt.get(userId).n

/**
 * Fires what is due and returns it for display.
 *
 * The relationship moves again here, in the direction the original decision
 * pointed. That is deliberate: the first move was the reaction in the moment,
 * this one is what it cost or earned once the person had time to think about it.
 */
export function fireDue(userId) {
  const items = due(userId)
  if (!items.length) return []

  const now = new Date().toISOString()
  const fired = []

  for (const c of items) {
    fireStmt.run(now, c.id)
    let relationship = null
    if (c.characterId && c.weight) {
      relationship = recordInteraction(userId, c.characterId, {
        summary: c.effect,
        delta: c.weight,
        source: 'consequence',
      })
    }
    fired.push({
      id: c.id,
      kind: c.kind,
      cause: c.cause,
      effect: c.effect,
      character: c.characterName ?? null,
      characterRole: c.characterRole ?? null,
      relationship,
    })
  }

  return fired
}

/**
 * The brief handed to the scenario generator.
 *
 * A grudge should change the situation the trainee walks into, not be announced
 * to them. So this says who is unlikely to help and who owes them a favour, and
 * the prompt turns that into the shape of the next problem.
 */
export function worldBrief(userId) {
  const people = listCharacters(userId)
  if (!people.length) return null

  const cold = people.filter((c) => c.relationship <= 40).map((c) => c.name)
  const warm = people.filter((c) => c.relationship >= 70).map((c) => c.name)
  const owed = due(userId)

  if (!cold.length && !warm.length && !owed.length) return null

  return {
    cold,
    warm,
    pending: owed.map((c) => ({ character: c.characterName, kind: c.kind, effect: c.effect })),
  }
}
