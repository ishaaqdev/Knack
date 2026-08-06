import { TRACKS, safeParse } from './db.js'

/**
 * The "stated" half of personalisation — collected once at onboarding, editable
 * later. Defined server-side so validation and the onboarding UI can never drift
 * apart; the client fetches this via GET /api/onboarding/options.
 *
 * `prompt` on each option is the phrasing handed to the model. It describes the
 * trainee's situation, never their CV — see prompts.js for why that matters.
 */

const field = (key, question, hint, options) => ({ key, question, hint, options })

export const FIELDS = [
  field('yearOfStudy', 'Where are you right now?', 'This sets how much workplace context a scenario can assume.', [
    { value: 'early', label: '1st or 2nd year', prompt: 'an early-stage engineering student with no workplace exposure' },
    { value: 'third', label: '3rd year', prompt: 'a third-year engineering student preparing for placements' },
    { value: 'final', label: 'Final year', prompt: 'a final-year engineering student about to start work' },
    { value: 'graduated', label: 'Graduated', prompt: 'a recent engineering graduate' },
  ]),

  field('branch', 'What do you study?', 'Shapes the technical texture of scenarios.', [
    { value: 'cse', label: 'CSE', prompt: 'computer science' },
    { value: 'ise', label: 'ISE', prompt: 'information science' },
    { value: 'ece', label: 'ECE', prompt: 'electronics and communication' },
    { value: 'eee', label: 'EEE', prompt: 'electrical engineering' },
    { value: 'mech', label: 'Mechanical', prompt: 'mechanical engineering' },
    { value: 'civil', label: 'Civil', prompt: 'civil engineering' },
    { value: 'other', label: 'Something else', prompt: 'engineering' },
  ]),

  field('targetRole', 'What are you aiming for?', 'Scenarios will be drawn from this kind of job.', [
    { value: 'swe', label: 'Software engineer', prompt: 'a software engineering role' },
    { value: 'data', label: 'Data / ML', prompt: 'a data or machine-learning role' },
    { value: 'product', label: 'Product / analyst', prompt: 'a product or analyst role' },
    { value: 'qa', label: 'QA / DevOps', prompt: 'a QA or DevOps role' },
    { value: 'core', label: 'Core engineering', prompt: 'a core (non-software) engineering role' },
    { value: 'unsure', label: 'Still deciding', prompt: 'an entry-level technical role' },
  ]),

  field('experience', 'Worked in a team before?', 'Decides whether a scenario can assume you know how a sprint works.', [
    { value: 'none', label: 'College projects only', prompt: 'has only worked on college projects, so office norms are unfamiliar' },
    { value: 'intern', label: 'Internship', prompt: 'has done an internship and knows basic team rituals' },
    { value: 'fulltime', label: 'Full-time already', prompt: 'is already working full-time and knows workplace dynamics well' },
  ]),

  field('workSetting', 'Where would you rather work?', 'Changes the stakes and who is in the room.', [
    { value: 'startup', label: 'Startup', prompt: 'a small fast-moving startup where roles blur and everyone is reachable' },
    { value: 'product', label: 'Product company', prompt: 'a mid-size product company with defined teams and process' },
    { value: 'service', label: 'Service / MNC', prompt: 'a large service company with clients, hierarchy and formal process' },
    { value: 'any', label: 'No preference', prompt: 'a typical software company' },
  ]),

  field('focusAreas', 'What do you find hardest?', 'Pick up to three. These get weighted into your scenarios.', [
    { value: 'saying-no', label: 'Saying no', prompt: 'declining work or pushing back on scope' },
    { value: 'criticism', label: 'Taking criticism', prompt: 'receiving critical feedback without getting defensive' },
    { value: 'seniors', label: 'Disagreeing with seniors', prompt: 'disagreeing with someone more senior' },
    { value: 'writing', label: 'Written updates', prompt: 'writing clear written updates and messages' },
    { value: 'speaking', label: 'Speaking up in groups', prompt: 'speaking up in meetings and group settings' },
    { value: 'ambiguity', label: 'Unclear requirements', prompt: 'acting when requirements are ambiguous' },
    { value: 'badnews', label: 'Delivering bad news', prompt: 'delivering bad news such as a slipped deadline' },
    { value: 'ai-trust', label: 'Knowing when to trust AI', prompt: 'judging when AI output can be trusted' },
  ], ),
]

export const CONFIDENCE_FIELD = {
  key: 'confidence',
  question: 'How confident are you in each of these?',
  hint: 'Only used to pick your starting difficulty — it does not affect your score.',
  scale: [
    { value: 1, label: 'Not at all' },
    { value: 2, label: 'A little' },
    { value: 3, label: 'Somewhat' },
    { value: 4, label: 'Fairly' },
    { value: 5, label: 'Very' },
  ],
  tracks: TRACKS.map((t) => ({ id: t.id, name: t.name })),
}

export const MAX_FOCUS_AREAS = 3

/* ---------------------------------------------------------- validation --- */

const byKey = Object.fromEntries(FIELDS.map((f) => [f.key, f]))

export function validateProfile(input = {}) {
  const errors = []
  const clean = {}

  const name = String(input.name ?? '').trim()
  if (!name) errors.push('Name is required.')
  if (name.length > 40) errors.push('Name is too long.')
  clean.name = name.slice(0, 40)

  for (const f of FIELDS) {
    const allowed = f.options.map((o) => o.value)

    if (f.key === 'focusAreas') {
      const picked = Array.isArray(input.focusAreas) ? input.focusAreas : []
      const valid = picked.filter((v) => allowed.includes(v)).slice(0, MAX_FOCUS_AREAS)
      if (!valid.length) errors.push('Pick at least one thing you find hard.')
      clean.focusAreas = valid
      continue
    }

    const v = input[f.key]
    if (!allowed.includes(v)) errors.push(`Choose an option for "${f.question}"`)
    else clean[f.key] = v
  }

  const conf = input.confidence ?? {}
  clean.confidence = {}
  for (const t of TRACKS) {
    const n = Number(conf[t.id])
    clean.confidence[t.id] = Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : 3
  }

  return { errors, clean }
}

/* ------------------------------------------------- prompt serialisation --- */

const labelFor = (key, value) => byKey[key]?.options.find((o) => o.value === value)

/**
 * Renders the stated profile as a short brief for the model. Deliberately prose,
 * not a field dump — a bulleted CV makes small models recite it back verbatim.
 */
export function profileBrief(user) {
  if (!user?.onboardedAt) return null

  const year = labelFor('yearOfStudy', user.yearOfStudy)?.prompt ?? 'an engineering student'
  const branch = labelFor('branch', user.branch)?.prompt ?? 'engineering'
  const role = labelFor('targetRole', user.targetRole)?.prompt ?? 'an entry-level technical role'
  const exp = labelFor('experience', user.experience)?.prompt ?? ''
  const setting = labelFor('workSetting', user.workSetting)?.prompt ?? 'a typical software company'

  const focus = safeParse(user.focusAreas, [])
    .map((v) => labelFor('focusAreas', v)?.prompt)
    .filter(Boolean)

  return {
    who: `${year} studying ${branch}, targeting ${role}. They ${exp}.`,
    setting,
    focus,
  }
}

/** Self-rated confidence seeds the opening difficulty only — never the score. */
export function startingDifficulty(user, trackId) {
  const c = safeParse(user?.confidence, {})[trackId]
  if (!Number.isFinite(c)) return 'easy'
  return c >= 4 ? 'medium' : 'easy'
}
