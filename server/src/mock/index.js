import { BANK_A } from './bank-a.js'
import { BANK_B } from './bank-b.js'
import { pickWeighted } from '../personalise.js'

/**
 * The mock interview engine.
 *
 * A mock is five multiple-choice questions taken before a real round, and its
 * job is to teach. The bank is hand-written, so it works with no model and no
 * network. When a model is available, some of the five are written fresh for
 * this trainee (see generateMock in ai.js) and the rest come from the bank.
 */

export const MOCK_BANK = [...BANK_A, ...BANK_B]
export const MOCK_SIZE = 5

/** 9 / 6 / 3 / 1, mapped to what the interviewer would call it. */
export const GRADE = { 9: 'Strong', 6: 'Decent', 3: 'Weak', 1: 'Costly' }

const byLevel = (level) => MOCK_BANK.filter((q) => q.round === level)

/** The generic questions for a round, and the ones that fit this kind of employer. */
export function poolsFor(level, style) {
  const all = byLevel(level)
  return {
    generic: all.filter((q) => q.style === 'any'),
    flavoured: style && style !== 'any' ? all.filter((q) => q.style === style) : [],
  }
}

/**
 * Chooses the bank questions for a run. At least one is aimed at the kind of
 * company the trainee has picked, when the bank has one for this round.
 */
export function pickFromBank({ userId, level, style, n = MOCK_SIZE, weakTopics = [], exclude = [] }) {
  const { generic, flavoured } = poolsFor(level, style)
  const skip = new Set(exclude)
  const g = generic.filter((q) => !skip.has(q.id))
  const f = flavoured.filter((q) => !skip.has(q.id))

  const styled = pickWeighted(f, { userId, n: Math.min(f.length, n >= 4 ? 2 : 1), weakTopics })
  const rest = pickWeighted(g, { userId, n: n - styled.length, weakTopics })
  const chosen = [...styled, ...rest]

  // A thin pool for this round: top up from anywhere rather than serve fewer.
  if (chosen.length < n) {
    const have = new Set(chosen.map((q) => q.id))
    const extra = MOCK_BANK.filter((q) => !have.has(q.id) && !skip.has(q.id) && q.style === 'any')
    chosen.push(...pickWeighted(extra, { userId, n: n - chosen.length, weakTopics }))
  }
  return chosen
}

/** Fisher-Yates. The bank is written with the best option in varied places, but
 *  the shuffle means a trainee who retakes a round cannot learn "it was C". */
export function shuffled(list, rng = Math.random) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const withShuffledOptions = (q) => ({ ...q, options: shuffled(q.options) })

/** What the client may see before it has answered: no scores, no reasons. */
export const hiddenQuestion = (q) => ({
  id: q.id,
  topic: q.topic,
  question: q.question,
  options: q.options.map((o) => ({ text: o.text })),
})

/** The employer kind, from the company they chose or the work setting they stated. */
export function styleFor(user, companyType) {
  if (companyType) return companyType
  const setting = user?.workSetting
  if (setting === 'startup') return 'startup'
  if (setting === 'service') return 'service'
  if (setting === 'product') return 'product'
  return 'any'
}

export const roundOf = (score10) =>
  score10 >= 8 ? 'You are ready for this round.' : score10 >= 6 ? 'You are close. Read the reasons you missed.' : 'Worth running the mock once more before the real round.'
