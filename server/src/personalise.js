import { db, safeParse } from './db.js'

/**
 * What the app has learned about this trainee, kept in the database and updated
 * after every mock, discussion and interview round.
 *
 * The existing derived context (context.js) is a paragraph a model rewrites
 * every few attempts. That is good for tone and bad for decisions: you cannot
 * ask a paragraph "which topic should the next question be about". This is the
 * structured half. One row per thing it can measure, a rolling mean of the last
 * few observations, and a handful of functions that turn those rows into a
 * choice: which questions to serve, how hard the panel pushes, what to do next.
 *
 * Everything here is arithmetic on stored rows. It works with no model, which is
 * why offline mode can still be personal.
 */

const RECENT = 5

const getRow = db.prepare('SELECT * FROM training_stats WHERE userId = ? AND area = ? AND key = ?')
const allRows = db.prepare('SELECT * FROM training_stats WHERE userId = ? AND area = ?')
const putRow = db.prepare(`
  INSERT INTO training_stats (userId, area, key, seen, total, recent, lastAt)
  VALUES (@userId, @area, @key, @seen, @total, @recent, @lastAt)
  ON CONFLICT(userId, area, key) DO UPDATE SET
    seen = excluded.seen, total = excluded.total, recent = excluded.recent, lastAt = excluded.lastAt
`)

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Record one observation, 0 to 100, against a named thing. */
export function recordStat(userId, area, key, value) {
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  const row = getRow.get(userId, area, key)
  const recent = [...safeParse(row?.recent, []), Math.round(v)].slice(-RECENT)
  putRow.run({
    userId,
    area,
    key,
    seen: (row?.seen ?? 0) + 1,
    total: (row?.total ?? 0) + v,
    recent: JSON.stringify(recent),
    lastAt: new Date().toISOString(),
  })
}

const shape = (r) => {
  const recent = safeParse(r.recent, [])
  const now = Math.round(mean(recent))
  // Trend: the latest half of the window against the earlier half.
  const half = Math.floor(recent.length / 2)
  const trend = recent.length >= 4 ? Math.round(mean(recent.slice(half)) - mean(recent.slice(0, half))) : 0
  return {
    key: r.key,
    seen: r.seen,
    value: now,
    lifetime: Math.round(r.total / Math.max(1, r.seen)),
    trend,
    lastAt: r.lastAt,
  }
}

export const statsFor = (userId, area) => allRows.all(userId, area).map(shape)

/** The weakest `n` keys in an area, ignoring anything seen too little to judge. */
export function weakKeys(userId, area, { n = 3, below = 60, minSeen = 1 } = {}) {
  return statsFor(userId, area)
    .filter((s) => s.seen >= minSeen && s.value < below)
    .sort((a, b) => a.value - b.value)
    .slice(0, n)
    .map((s) => s.key)
}

/* ---------------------------------------------------------- mock memory --- */

const seenRow = db.prepare('SELECT * FROM mock_seen WHERE userId = ? AND questionId = ?')
const seenAll = db.prepare('SELECT * FROM mock_seen WHERE userId = ?')
const putSeen = db.prepare(`
  INSERT INTO mock_seen (userId, questionId, times, lastScore, lastAt)
  VALUES (@userId, @questionId, @times, @lastScore, @lastAt)
  ON CONFLICT(userId, questionId) DO UPDATE SET
    times = excluded.times, lastScore = excluded.lastScore, lastAt = excluded.lastAt
`)

export function recordMockAnswer(userId, question, score) {
  const prev = seenRow.get(userId, question.id)
  putSeen.run({
    userId,
    questionId: question.id,
    times: (prev?.times ?? 0) + 1,
    lastScore: score,
    lastAt: new Date().toISOString(),
  })
  // 9/6/3/1 mapped onto 0-100 so it sits on the same scale as every other stat.
  recordStat(userId, 'mock-topic', question.topic, Math.round((score / 9) * 100))
}

export const seenMap = (userId) => new Map(seenAll.all(userId).map((r) => [r.questionId, r]))

/* ----------------------------------------------------------- selection ---- */

/**
 * Weighted pick without replacement.
 *
 * The weights are the personalisation. A question never seen is worth more than
 * one seen, a question answered badly comes back (spaced practice, Cepeda et
 * al.), one answered well last time is shelved for a while, and a topic the
 * trainee is weak on is pulled forward. None of it is random except the final
 * draw, which is there so two people with the same history do not get the same
 * five questions in the same order.
 */
export function pickWeighted(pool, { userId, n, weakTopics = [], rng = Math.random }) {
  const seen = seenMap(userId)
  const day = 24 * 3600 * 1000

  const weight = (q) => {
    let w = 1
    const s = seen.get(q.id)
    if (!s) w += 2
    else {
      const age = Date.now() - new Date(s.lastAt).getTime()
      if (s.lastScore <= 3 && age > day * 0.5) w += 1.5
      else if (s.lastScore <= 3) w += 0.3
      if (s.lastScore >= 9) w -= 0.8
      if (age < day * 0.25) w -= 0.6
    }
    if (weakTopics.includes(q.topic)) w += 1.5
    return Math.max(0.15, w)
  }

  const bag = pool.map((q) => ({ q, w: weight(q) }))
  const out = []
  while (out.length < n && bag.length) {
    const total = bag.reduce((a, b) => a + b.w, 0)
    let r = rng() * total
    let i = 0
    for (; i < bag.length - 1; i++) {
      r -= bag[i].w
      if (r <= 0) break
    }
    out.push(bag[i].q)
    bag.splice(i, 1)
  }
  return out
}

/* ------------------------------------------------------ the whole picture -- */

const pretty = (key) => key.replace(/-/g, ' ')

/**
 * Everything worth saying about this trainee, in one object. The dashboard and
 * the profile page both draw from it, so what the app says about you in two
 * places cannot disagree.
 */
export function trainingProfile(userId, { mockDone = [], interviewLevel = 1 } = {}) {
  const mock = statsFor(userId, 'mock-topic').sort((a, b) => b.value - a.value)
  const gd = statsFor(userId, 'gd-dimension').sort((a, b) => b.value - a.value)

  const strong = mock.filter((m) => m.value >= 70).slice(0, 3)
  const weak = [...mock].reverse().filter((m) => m.value < 60).slice(0, 3)
  const gdWeak = [...gd].reverse().find((g) => g.value < 55) ?? null

  let next = null
  const round = Math.min(5, Math.max(1, interviewLevel))
  if (!mockDone.includes(round)) {
    next = {
      kind: 'mock',
      text: `Do the round ${round} mock interview. It is five questions and it tells you what a strong answer sounds like before you have to give one.`,
      to: '/interview',
    }
  } else if (weak[0]) {
    next = {
      kind: 'topic',
      text: `You keep losing marks on ${pretty(weak[0].key)}. The next mock will lean on it.`,
      to: '/interview',
    }
  } else if (gdWeak) {
    next = {
      kind: 'gd',
      text: `${gdWeak.key[0].toUpperCase()}${gdWeak.key.slice(1)} is your lowest area in group discussions (${gdWeak.value}). Run one and aim at that.`,
      to: '/gd?practice=1',
    }
  }

  return {
    mock: {
      topics: mock.map((m) => ({ ...m, label: pretty(m.key) })),
      strong: strong.map((m) => ({ ...m, label: pretty(m.key) })),
      weak: weak.map((m) => ({ ...m, label: pretty(m.key) })),
      answered: mock.reduce((n, m) => n + m.seen, 0),
    },
    gd: { dimensions: gd.map((g) => ({ ...g, label: g.key })), weakest: gdWeak },
    next,
  }
}
