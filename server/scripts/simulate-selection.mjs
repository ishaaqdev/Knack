/**
 * Simulated learners against the real question-selection code.
 *
 *   node scripts/simulate-selection.mjs [learners=2000]
 *
 * This is a simulation, not a user study. It answers one narrow question: given
 * learners whose behaviour is fixed by an explicit model, does the weighted
 * selection in personalise.js spend a trainee's five questions better than
 * picking at random, or than the obvious alternative of "never repeat until the
 * pool is used up"? The learner model is an assumption and is stated here so it
 * can be argued with:
 *
 *   - each topic has a latent ability a in (0,1), the mean of two uniform draws;
 *   - an item starts with P(strong answer) = a of its topic;
 *   - a strong answer scores 9, otherwise 6, 3 or 1 with weights 0.45/0.35/0.20;
 *   - seeing an item and its explanation raises P(strong) on that item by a
 *     fraction L of the remaining gap (L = 0.35 by default).
 *
 * The Knack policy is the real code (pickFromBank, recordMockAnswer, weakKeys)
 * running on a throwaway SQLite file, with the clock advanced between mocks. The
 * two baselines are written here. Everything is seeded, so the numbers repeat.
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.KNACK_DB = join(mkdtempSync(join(tmpdir(), 'knack-sim-')), 'sim.db')
process.env.KNACK_OFFLINE = '1'

const { db } = await import('../src/db.js')
const { MOCK_BANK, MOCK_SIZE, poolsFor, pickFromBank } = await import('../src/mock/index.js')
const { recordMockAnswer, weakKeys } = await import('../src/personalise.js')

db.pragma('synchronous = OFF')

/* ------------------------------------------------------------- the clock --- */

const RealDate = Date
let skew = 0
globalThis.Date = class extends RealDate {
  constructor(...a) {
    if (a.length) super(...a)
    else super(RealDate.now() + skew)
  }
  static now() {
    return RealDate.now() + skew
  }
}
const advance = (ms) => {
  skew += ms
}

/* ------------------------------------------------------------------ rng --- */

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const realRandom = Math.random

/* ------------------------------------------------------------- the world --- */

const ROUNDS = [1, 2, 3, 4, 5]
const MOCKS_PER_ROUND = 4
const TOPICS = [...new Set(MOCK_BANK.map((q) => q.topic))].sort()
const poolOf = (level) => poolsFor(level, 'any').generic

const insertUser = db.prepare("INSERT INTO users (email, passwordHash, name, createdAt) VALUES (?, 'x', 'sim', ?)")

function makeLearner(seed) {
  const r = mulberry32(seed)
  const ability = Object.fromEntries(TOPICS.map((t) => [t, (r() + r()) / 2]))
  return { ability, out: mulberry32(seed ^ 0x9e3779b9) }
}

function answer(learner, item, state, L) {
  const p = state.get(item.id) ?? learner.ability[item.topic]
  const u = learner.out()
  let score
  if (u < p) score = 9
  else {
    const v = (u - p) / (1 - p)
    score = v < 0.45 ? 6 : v < 0.8 ? 3 : 1
  }
  state.set(item.id, p + L * (1 - p)) // it has now seen the explanation
  return { score, pBefore: p }
}

/* -------------------------------------------------------------- policies --- */

const sampleN = (list, n, rng) => {
  const a = [...list]
  const out = []
  while (out.length < n && a.length) out.push(a.splice(Math.floor(rng() * a.length), 1)[0])
  return out
}

const policies = {
  random: () => ({
    pick: ({ pool, rng }) => sampleN(pool, MOCK_SIZE, rng),
    record() {},
  }),

  // Never repeat until every item has been served once, then start a new cycle.
  'unseen-first': () => {
    const used = new Set()
    return {
      pick({ pool, rng }) {
        let fresh = pool.filter((q) => !used.has(q.id))
        let chosen
        if (fresh.length >= MOCK_SIZE) chosen = sampleN(fresh, MOCK_SIZE, rng)
        else {
          chosen = [...fresh]
          used.clear()
          const rest = pool.filter((q) => !chosen.includes(q))
          chosen.push(...sampleN(rest, MOCK_SIZE - chosen.length, rng))
        }
        chosen.forEach((q) => used.add(q.id))
        return chosen
      },
      record() {},
    }
  },

  // The real thing.
  knack: () => {
    const userId = Number(insertUser.run(`sim-${Math.random()}@x`, new Date().toISOString()).lastInsertRowid)
    return {
      pick({ level, rng }) {
        Math.random = rng
        try {
          const weak = weakKeys(userId, 'mock-topic', { n: 3 })
          return pickFromBank({ userId, level, style: 'any', n: MOCK_SIZE, weakTopics: weak })
        } finally {
          Math.random = realRandom
        }
      },
      record(q, score) {
        recordMockAnswer(userId, q, score)
      },
    }
  },
}

/* ------------------------------------------------------------------- run --- */

function runLearner(name, seed, { L, gapMs }) {
  const learner = makeLearner(seed)
  const policy = policies[name]()
  const pick = mulberry32(seed ^ 0x51ed270b)
  const state = new Map()
  const lastScore = new Map()
  const m = { cov2: [], cov3: [], wasted: 0, revisitedMisses: 0, served: 0, mock4: [], poolP: [] }

  db.transaction(() => {
    for (const level of ROUNDS) {
      const pool = poolOf(level)
      const seen = new Set()
      let later = 0
      for (let k = 1; k <= MOCKS_PER_ROUND; k++) {
        const items = policy.pick({ level, pool, rng: pick })
        let sum = 0
        for (const q of items) {
          if (k >= 2) {
            m.served++
            later++
            const prev = lastScore.get(q.id)
            if (prev === 9) m.wasted++
            if (prev !== undefined && prev <= 3) m.revisitedMisses++
          }
          const { score } = answer(learner, q, state, L)
          lastScore.set(q.id, score)
          policy.record(q, score)
          seen.add(q.id)
          sum += score
        }
        if (k === 2) m.cov2.push(seen.size / pool.length)
        if (k === 3) m.cov3.push(seen.size / pool.length)
        if (k === 4) m.mock4.push(sum / items.length)
        advance(gapMs)
      }
      m.poolP.push(pool.reduce((a, q) => a + (state.get(q.id) ?? learner.ability[q.topic]), 0) / pool.length)
    }
  })()

  const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
  return {
    cov2: avg(m.cov2),
    cov3: avg(m.cov3),
    wasted: m.wasted / m.served,
    revisitedMisses: m.revisitedMisses / m.served,
    mock4: avg(m.mock4),
    poolP: avg(m.poolP),
  }
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
const ci = (xs) => {
  const mu = mean(xs)
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mu) ** 2, 0) / (xs.length - 1))
  return 1.96 * (sd / Math.sqrt(xs.length))
}

function experiment(label, learners, opts) {
  const rows = {}
  for (const name of Object.keys(policies)) {
    const results = []
    for (let i = 0; i < learners; i++) results.push(runLearner(name, 1000 + i, opts))
    rows[name] = Object.fromEntries(
      Object.keys(results[0]).map((k) => [k, { mean: mean(results.map((r) => r[k])), ci: ci(results.map((r) => r[k])) }])
    )
  }
  return { label, opts, rows }
}

const N = Number(process.argv[2]) || 2000
const DAY = 24 * 3600 * 1000

const runs = [
  experiment('main: gap 1 day, L 0.35', N, { L: 0.35, gapMs: DAY }),
  experiment('slower learning: gap 1 day, L 0.15', N, { L: 0.15, gapMs: DAY }),
  experiment('immediate retakes: gap 10 min, L 0.35', N, { L: 0.35, gapMs: 10 * 60 * 1000 }),
]

const f = (c, d = 3) => `${c.mean.toFixed(d)} ±${c.ci.toFixed(d)}`
console.log(`learners per policy: ${N}; rounds: ${ROUNDS.length}; mocks per round: ${MOCKS_PER_ROUND}; pool per round: 12\n`)
for (const run of runs) {
  console.log(`## ${run.label}`)
  console.log('policy        cov@2          cov@3          wasted         revisited-miss  mock4 (of 9)   pool P(strong)')
  for (const [name, r] of Object.entries(run.rows)) {
    console.log(
      `${name.padEnd(13)} ${f(r.cov2).padEnd(14)} ${f(r.cov3).padEnd(14)} ${f(r.wasted).padEnd(14)} ${f(r.revisitedMisses).padEnd(15)} ${f(r.mock4, 2).padEnd(14)} ${f(r.poolP)}`
    )
  }
  console.log()
}
