/**
 * Scenario shape sampling.
 *
 * Asking a small model to "vary" its output does not work — it collapses to one
 * template. Observed in production: nine consecutive generations, almost every
 * one opened "Your team lead, <name>, wants to <take a shortcut> before
 * <deadline>". Instructing it to be diverse changed the surface wording and
 * nothing else.
 *
 * The fix is to stop asking. Sample the axes of variation here, deterministically
 * rotated per user and track, and hand the model a filled-in specification it has
 * to satisfy. Diversity becomes a property of the sampler, not a hope about the
 * model.
 */

/** Who the other person is, and how power runs between you. */
export const COUNTERPARTS = [
  { role: 'your team lead', power: 'they outrank you' },
  { role: 'your skip-level manager', power: 'they outrank you significantly' },
  { role: 'a senior engineer on a different team', power: 'senior, but not your boss' },
  { role: 'a teammate who joined the same week as you', power: 'exact peer' },
  { role: 'a junior engineer you are mentoring', power: 'you are the senior one' },
  { role: 'the product manager for your feature', power: 'lateral, different priorities' },
  { role: 'the designer who owns the flow', power: 'lateral, different priorities' },
  { role: 'the QA engineer who found the bug', power: 'lateral' },
  { role: 'a client contact', power: 'external, pays your company' },
  { role: 'a support engineer relaying a customer complaint', power: 'lateral, speaking for the customer' },
  { role: 'a vendor support engineer', power: 'external, not accountable to you' },
  { role: 'two teammates who disagree with each other', power: 'you are in the middle', group: true },
  { role: 'the whole team, listening', power: 'a group, everyone hears your answer', group: true },
  { role: 'a colleague from a team you depend on', power: 'lateral, you need something from them' },
]

/** Where it happens — changes tone, audience and how permanent it is. */
export const MEDIUMS = [
  'a direct message on Slack',
  'a team channel where everyone can read it',
  'standup, in front of everyone',
  'a comment on their pull request',
  'a conversation at their desk',
  'an email thread with your manager copied in',
  'a video call with the client also on the line',
  'a comment on a shared design document',
  'a one-to-one meeting',
  'the sprint retrospective, in front of the team',
  'a written status update nobody asked you for',
]

/** The moment that makes it hard. */
export const TRIGGERS = [
  'they ask you for something you cannot give',
  'you have to raise something they do not know about yet',
  'you disagree with a decision that has already been made',
  'you have to refuse extra work',
  'you have to admit a mistake that was yours',
  'you are asked to judge the quality of someone else’s work',
  'two people expect opposite things from you',
  'you receive criticism you think is only half fair',
  'you have to deliver bad news',
  'you are asked to commit to a date you are not sure of',
  'you notice something wrong that nobody asked you to look at',
  'you are given credit that actually belongs to someone else',
]

/** What raises the stakes. */
export const PRESSURES = [
  'it has to be resolved today',
  'a client is waiting on the answer right now',
  'real money or a contract is at stake',
  'someone senior already disagreed with you in public',
  'a teammate is personally affected by the outcome',
  'you are missing information you would need to be sure',
  'there is no time pressure at all, but getting it wrong is expensive later',
  'this is the third time the same thing has happened',
  'you are new enough that you do not know the norms yet',
  'whatever you choose, somebody loses something',
]

/** Names are rotated too — one repeated name reads as one repeated scenario. */
export const NAMES = [
  'Priya', 'Arjun', 'Sneha', 'Rohan', 'Divya', 'Karthik', 'Meera', 'Vikram',
  'Ananya', 'Rahul', 'Lakshmi', 'Farhan', 'Nandini', 'Imran', 'Kavya', 'Tejas',
  'Ritu', 'Sandeep', 'Aisha', 'Manoj', 'Shreya', 'Nikhil', 'Fatima', 'Gaurav',
]

/**
 * Rotates each axis on a different stride so the combinations do not fall into
 * a short repeating cycle. Strides are coprime with the list lengths where
 * possible, which is what keeps the period long.
 */
function pick(list, counter, stride) {
  return list[(counter * stride) % list.length]
}

/**
 * @param counter  monotonically increasing per user+track (generation number)
 * @param exclude  shapes recently served, so we can skip an immediate repeat
 */
export function sampleShape(counter, exclude = {}, { singularOnly = false } = {}) {
  const pool = singularOnly ? COUNTERPARTS.filter((c) => !c.group) : COUNTERPARTS
  let counterpart = pick(pool, counter, 5)
  // Never serve the same counterpart role twice running — that is the single
  // most visible form of repetition to a user.
  if (exclude.role && counterpart.role === exclude.role) {
    counterpart = pick(pool, counter + 1, 5)
  }

  let name = pick(NAMES, counter, 7)
  if (exclude.name && name === exclude.name) name = pick(NAMES, counter + 1, 7)

  return {
    counterpart,
    name,
    medium: pick(MEDIUMS, counter, 3),
    trigger: pick(TRIGGERS, counter, 4),
    pressure: pick(PRESSURES, counter, 3),
  }
}

/** Rendered into the prompt as requirements the model must satisfy. */
export function shapeBlock(shape) {
  return `THIS SCENARIO MUST USE THE FOLLOWING SHAPE (all five are requirements)
- The other side: ${shape.counterpart.group
    ? `${shape.counterpart.role} — name one of them ${shape.name}`
    : `${shape.counterpart.role}, named ${shape.name}`}. ${shape.counterpart.power}.
- Where it happens: ${shape.medium}.
- The moment: ${shape.trigger}.
- What raises the stakes: ${shape.pressure}.
- Invent a specific product, feature or system for this situation. Do not reuse
  a generic "the API" or "the dashboard" — name something concrete.`
}

/** Total distinct shapes the sampler can produce. Quoted in the report. */
export const SHAPE_SPACE =
  COUNTERPARTS.length * MEDIUMS.length * TRIGGERS.length * PRESSURES.length
