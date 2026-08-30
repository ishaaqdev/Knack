import {
  scenarioPrompt,
  evaluationPrompt,
  learnerSummaryPrompt,
  portfolioPrompt,
  resumeDistilPrompt,
  levelPrompt,
  levelEvaluationPrompt,
  interviewPrompt,
  interviewDebriefPrompt,
  gdTurnPrompt,
  gdEvaluationPrompt,
  GD_PANEL,
  reviewPrompt,
  negotiationPrompt,
  workplaceBeatPrompt,
  dialogueTurnPrompt,
  dialogueEvaluationPrompt,
} from './prompts.js'
import {
  FALLBACK_SCENARIOS,
  FALLBACK_LEVEL,
  FALLBACK_INTERVIEW,
  heuristicEvaluation,
  heuristicDebrief,
  FALLBACK_GD_TURN,
  heuristicGd,
  heuristicReview,
  heuristicNegotiation,
  FALLBACK_BEAT,
  FALLBACK_DIALOGUE_TURN,
  heuristicDialogue,
} from './fallback.js'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const models = () =>
  [
    process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free',
    ...(process.env.OPENROUTER_FALLBACK_MODELS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ].filter((v, i, a) => a.indexOf(v) === i)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Budget added to every max_tokens for a reasoning model's hidden trace.
 *
 * Nearly every model on the free tier in 2026 reasons before it answers, and
 * those tokens are charged against max_tokens even when the trace is hidden.
 * Measured: MiniMax spent 2,691 of them on one level prompt and returned an
 * empty message. A ceiling is not a target — a model that stops early is not
 * billed for the headroom — so this is generous on purpose.
 */
const REASONING_HEADROOM = 3000

/**
 * Pull the first JSON object out of a model reply. Gemma will sometimes wrap it
 * in ```json fences or add a sentence of preamble, so we cannot just JSON.parse.
 */
function extractJson(text) {
  if (!text) return null
  let s = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

  const start = s.indexOf('{')
  if (start === -1) return null

  // Walk to the matching brace so trailing prose does not break the parse.
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (esc) { esc = false; continue }
    if (c === '\\') { esc = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === '{') depth++
    else if (c === '}' && --depth === 0) {
      try {
        return JSON.parse(s.slice(start, i + 1))
      } catch {
        try {
          // Last resort: strip raw newlines inside string literals.
          return JSON.parse(s.slice(start, i + 1).replace(/\r?\n/g, ' '))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

/**
 * Rate-limit state.
 *
 * OpenRouter enforces two different limits and they need opposite responses.
 * `openrouter_free_tier_per_minute` is account-wide across every free model —
 * retrying burns the remaining budget and switching model does nothing, because
 * both models draw on the same allowance. An upstream provider limit is
 * per-model, so moving to the next model genuinely can help.
 *
 * The original implementation retried three times across two models, so a single
 * generation could fire six requests into a 20-per-minute account budget. Three
 * generations exhausted it, which is why almost everything was being served from
 * the offline bank.
 */
const cooldown = { account: 0, models: new Map() }

const coolingAccount = () => Date.now() < cooldown.account
const coolingModel = (m) => Date.now() < (cooldown.models.get(m) ?? 0)

function noteRateLimit(model, body, headers) {
  // Prefer the server's own reset timestamp over a guess.
  let resetAt = Number(headers?.get?.('x-ratelimit-reset')) || 0
  if (resetAt && resetAt < 1e12) resetAt *= 1000 // seconds -> ms

  let source = ''
  try {
    const meta = JSON.parse(body)?.error?.metadata
    source = meta?.limit_source ?? ''
    const h = meta?.headers?.['X-RateLimit-Reset']
    if (!resetAt && h) resetAt = Number(h) < 1e12 ? Number(h) * 1000 : Number(h)
  } catch { /* body was not JSON */ }

  const until = resetAt || Date.now() + 20_000

  if (source.includes('per_minute') || source.includes('free_tier')) {
    cooldown.account = until
    console.warn(`[ai] account-wide free-tier limit reached; pausing calls for ${Math.ceil((until - Date.now()) / 1000)}s`)
  } else {
    cooldown.models.set(model, until)
  }
}

export function rateLimitStatus() {
  return {
    accountCoolingFor: Math.max(0, Math.ceil((cooldown.account - Date.now()) / 1000)),
    modelsCooling: [...cooldown.models.entries()]
      .filter(([, t]) => Date.now() < t)
      .map(([m, t]) => ({ model: m, seconds: Math.ceil((t - Date.now()) / 1000) })),
  }
}

async function callOnce(model, prompt, { temperature, maxTokens, signal }) {
  const res = await fetch(API_URL, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Knack',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      // Reasoning tokens are billed against max_tokens even when they are
      // hidden, and MiniMax will happily spend 800 of them thinking before it
      // writes a character. Excluding the trace is not enough on its own, so
      // the ceiling carries an allowance the caller does not have to know about.
      max_tokens: maxTokens + REASONING_HEADROOM,
      // effort:low shortens the trace where the provider supports it; the whole
      // object is ignored by providers that do not.
      reasoning: { effort: 'low', exclude: true },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 429) noteRateLimit(model, body, res.headers)
    const err = new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`)
    err.status = res.status
    throw err
  }

  const data = await res.json()
  // A 200 can still carry an upstream failure in the body. Surface its code so
  // the retry rules above apply to it as they would to a real HTTP status.
  if (data.error) {
    const err = new Error(`OpenRouter: ${data.error.message}`)
    err.status = Number(data.error.code) || 502
    throw err
  }
  return data.choices?.[0]?.message?.content ?? ''
}

/**
 * Ask the model for JSON. One attempt per model, plus a single retry reserved
 * for genuinely transient failures (timeouts, 5xx) — never for rate limits,
 * where retrying is exactly the wrong move.
 */
async function askForJson(prompt, { temperature = 0.9, maxTokens = 700, validate, budgetMs = 70_000 } = {}) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set — check server/.env')
  }

  if (coolingAccount()) {
    const s = Math.ceil((cooldown.account - Date.now()) / 1000)
    const e = new Error(`Free-tier budget exhausted; ${s}s until reset`)
    e.rateLimited = true
    throw e
  }

  const TRANSIENT = new Set([408, 500, 502, 503, 504])
  const deadline = Date.now() + budgetMs
  let last
  const tried = []

  for (const model of models()) {
    if (coolingModel(model) || coolingAccount()) {
      tried.push(`${model}: cooling down`)
      continue
    }
    // Walking four models at 30s each is slower than any trainee will wait.
    // Past the budget the offline bank is the better answer.
    if (Date.now() > deadline) {
      tried.push(`${model}: skipped, out of time`)
      continue
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), Math.max(8_000, Math.min(30_000, deadline - Date.now())))
      try {
        const text = await callOnce(model, prompt, { temperature, maxTokens, signal: ac.signal })
        const parsed = extractJson(text)
        if (parsed && (!validate || validate(parsed))) return { data: parsed, model }
        tried.push(`${model}: unusable reply`)
        last = new Error(`Unusable reply from ${model}: ${String(text).slice(0, 120)}`)
      } catch (e) {
        last = e
        // A rate limit is not transient in the useful sense — stop hitting it.
        if (e.status === 429) { tried.push(`${model}: rate limited`); break }
        if (e.status && !TRANSIENT.has(e.status)) { tried.push(`${model}: ${e.status}`); break }
      } finally {
        clearTimeout(timer)
      }
      if (attempt === 0 && Date.now() < deadline) await sleep(700)
      else break
    }
  }
  const err = last ?? new Error('No response from any model')
  err.tried = tried
  throw err
}

/* --------------------------------------------------------------- public --- */

export async function generateScenario({ track, difficulty, avoid, profile, learner, portfolio, resume, attributes, world, shape }) {
  try {
    const { data, model } = await askForJson(
      scenarioPrompt({ track, difficulty, avoid, profile, learner, portfolio, resume, attributes, world, shape }),
      {
        temperature: 1.0,
        maxTokens: 900,
        budgetMs: 45_000,
        validate: (d) => typeof d.scenario === 'string' && d.scenario.trim().length > 40,
      }
    )
    return {
      scenarioText: data.scenario.trim(),
      taskPrompt: (data.prompt || 'Write your response below.').trim(),
      difficulty,
      source: 'ai',
      model,
    }
  } catch (err) {
    console.warn('[ai] scenario fell back to offline bank |', (err.tried ?? []).join(' | ') || err.message)
    return { ...FALLBACK_SCENARIOS(track.id, difficulty, avoid), difficulty, source: 'offline' }
  }
}

export async function evaluateResponse({ track, difficulty, scenarioText, userResponse, learner }) {
  try {
    const { data, model } = await askForJson(
      evaluationPrompt({ track, difficulty, scenarioText, userResponse, learner }),
      {
        temperature: 0.3,
        maxTokens: 1100,
        budgetMs: 60_000,
        validate: (d) => Number.isFinite(Number(d.score)) && typeof d.strengths === 'string',
      }
    )
    const score = Math.min(10, Math.max(1, Math.round(Number(data.score))))
    const strengths = String(data.strengths || '').trim()
    const gaps = String(data.gaps || '').trim()
    return {
      score,
      strengths,
      gaps,
      suggestion: String(data.suggestion || '').trim(),
      feedback: [strengths, gaps].filter(Boolean).join(' '),
      source: 'ai',
      model,
    }
  } catch (err) {
    console.warn('[ai] evaluation fell back to heuristic |', (err.tried ?? []).join(' | ') || err.message)
    return { ...heuristicEvaluation({ track, userResponse }), source: 'offline' }
  }
}

const LEVELS = new Set(['beginner', 'intermediate', 'advanced'])

/** Distils a fetched GitHub profile. Throws so the route can report failure —
 *  an unlinked account is better than a fabricated portfolio. */
export async function summarisePortfolio({ raw, username }) {
  const { data } = await askForJson(portfolioPrompt({ raw, username }), {
    temperature: 0.3,
    maxTokens: 500,
    validate: (d) => typeof d.brief === 'string' && d.brief.trim().length > 15,
  })

  const list = (v, max, cap) =>
    (Array.isArray(v) ? v : [])
      .filter((x) => typeof x === 'string' && x.trim())
      .slice(0, max)
      .map((x) => x.trim().slice(0, cap))

  return {
    brief: data.brief.trim().slice(0, 400),
    stack: list(data.stack, 6, 30),
    domains: list(data.domains, 3, 40),
    level: LEVELS.has(data.level) ? data.level : 'beginner',
  }
}

/**
 * Rewrites the rolling learner summary. Returns null on failure rather than
 * falling back — a stale summary is fine, an invented one is not.
 */
export async function summariseLearner({ attempts, previous }) {
  try {
    const { data } = await askForJson(learnerSummaryPrompt({ attempts, previous }), {
      temperature: 0.4,
      maxTokens: 400,
      validate: (d) => typeof d.summary === 'string' && d.summary.trim().length > 20,
    })
    return {
      summary: data.summary.trim().slice(0, 600),
      recurringGaps: (Array.isArray(data.recurringGaps) ? data.recurringGaps : [])
        .filter((g) => typeof g === 'string' && g.trim())
        .slice(0, 3)
        .map((g) => g.trim().slice(0, 80)),
      pushNext: String(data.pushNext || '').trim().slice(0, 200),
    }
  } catch (err) {
    console.warn('[ai] learner summary failed:', err.message)
    return null
  }
}

export async function health() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    })
    return { ok: res.ok, status: res.status, models: models() }
  } catch (e) {
    return { ok: false, error: e.message, models: models() }
  }
}

/* ------------------------------------------------------------- resume ----- */

const str = (v, cap) => String(v ?? '').trim().slice(0, cap)
/**
 * Re-key a model's per-item array onto our own indices.
 *
 * Graders are asked for an `i` on every entry and they do return one — but
 * whether it counts from zero or from one depends on the model, and a transcript
 * labelled "Q1, Q2, Q3" pulls them towards one. Getting this wrong is silent and
 * ugly: every critique lands on the wrong answer, and the reader sees feedback
 * about a paragraph they did not write.
 *
 * So the base is detected from the values themselves rather than assumed, with
 * plain position as the last resort.
 */
function alignByIndex(items, count) {
  const list = Array.isArray(items) ? items : []
  const given = list.map((x) => Number(x?.i)).filter(Number.isInteger)

  // Nothing claiming index 0 means the model counted from one.
  const oneBased = given.length > 0 && !given.includes(0)
  const byIndex = new Map()
  for (const item of list) {
    const i = Number(item?.i)
    if (Number.isInteger(i)) byIndex.set(oneBased ? i - 1 : i, item)
  }

  // Position is a fallback only when no entry carried an index at all. Once the
  // model has said where things belong, guessing at the gaps would put real
  // criticism against an answer nobody wrote, which is worse than a blank.
  const positional = given.length === 0
  return Array.from(
    { length: count },
    (_, i) => byIndex.get(i) ?? (positional ? list[i] : null) ?? {}
  )
}

const strList = (v, max, cap) =>
  (Array.isArray(v) ? v : [])
    .filter((x) => typeof x === 'string' && x.trim())
    .slice(0, max)
    .map((x) => x.trim().slice(0, cap))

/**
 * Distils an uploaded resume. Throws rather than falling back — an unread
 * resume is honest, an invented one silently corrupts every later prompt.
 */
export async function summariseResume({ text, name }) {
  const { data, model } = await askForJson(resumeDistilPrompt({ text, name }), {
    temperature: 0.2,
    maxTokens: 800,
    budgetMs: 60_000,
    validate: (d) => typeof d.brief === 'string' && d.brief.trim().length > 15,
  })

  return {
    brief: str(data.brief, 400),
    skills: strList(data.skills, 10, 30),
    projects: (Array.isArray(data.projects) ? data.projects : [])
      .filter((p) => p && typeof p.name === 'string' && p.name.trim())
      .slice(0, 4)
      .map((p) => ({ name: str(p.name, 60), what: str(p.what, 120) })),
    highlights: strList(data.highlights, 3, 120),
    model,
  }
}

/* -------------------------------------------------------------- level ----- */

const SCORE_LADDER = [9, 6, 3, 1]

/**
 * Normalises one generated question.
 *
 * The prompt dictates the 9/6/3/1 gradient, but a small model will occasionally
 * return four nines or five options. Rather than reject the whole level for it,
 * the options are re-graded by their stated rank — the model's *ordering* is
 * reliable even when its numbers are not.
 */
function normaliseQuestion(q) {
  const options = (Array.isArray(q?.options) ? q.options : [])
    .filter((o) => o && typeof o.text === 'string' && o.text.trim())
    .slice(0, 4)
  if (options.length < 3) return null

  const graded = [...options]
    .map((o, i) => ({ o, i, raw: Number(o.score) }))
    .sort((a, b) => (Number.isFinite(b.raw) ? b.raw : 0) - (Number.isFinite(a.raw) ? a.raw : 0))

  graded.forEach((g, rank) => {
    g.o.score = SCORE_LADDER[Math.min(rank, SCORE_LADDER.length - 1)]
  })

  return {
    situation: str(q.situation, 400),
    question: str(q.question, 200) || 'What do you do?',
    options: options.map((o) => ({
      text: str(o.text, 220),
      score: o.score,
      why: str(o.why, 200),
    })),
  }
}

export async function generateLevel({ track, difficulty, profile, learner, portfolio, resume, attributes, world, shape, avoid, n = 0 }) {
  try {
    const { data, model } = await askForJson(
      levelPrompt({ track, difficulty, profile, learner, portfolio, resume, attributes, world, shape, avoid }),
      {
        temperature: 1.0,
        maxTokens: 1800,
        budgetMs: 55_000,
        validate: (d) => Array.isArray(d.questions) && d.questions.length >= 3,
      }
    )

    const questions = data.questions.map(normaliseQuestion).filter(Boolean).slice(0, 4)
    if (questions.length < 3) throw new Error('too few usable questions')

    return { setting: str(data.setting, 400), questions, source: 'ai', model }
  } catch (err) {
    console.warn('[ai] level fell back to offline bank |', (err.tried ?? []).join(' | ') || err.message)
    return { ...FALLBACK_LEVEL(track.id, n), source: 'offline' }
  }
}

export async function evaluateLevel({ track, difficulty, scenarioText, userResponse, customs = [], learner }) {
  try {
    const { data, model } = await askForJson(
      levelEvaluationPrompt({ track, difficulty, scenarioText, userResponse, customs, learner }),
      {
        temperature: 0.3,
        maxTokens: 1300,
        budgetMs: 60_000,
        validate: (d) => Number.isFinite(Number(d.score)) && typeof d.strengths === 'string',
      }
    )

    const clamp = (v) => Math.min(10, Math.max(1, Math.round(Number(v) || 1)))
    const custom = alignByIndex(data.custom, customs.length).map((c, i) => ({
      i,
      score: clamp(c.score),
      why: str(c.why, 200),
    }))

    const strengths = str(data.strengths, 600)
    const gaps = str(data.gaps, 600)

    return {
      score: clamp(data.score),
      strengths,
      gaps,
      suggestion: str(data.suggestion, 400),
      feedback: [strengths, gaps].filter(Boolean).join(' '),
      custom,
      source: 'ai',
      model,
    }
  } catch (err) {
    console.warn('[ai] level evaluation fell back to heuristic |', (err.tried ?? []).join(' | ') || err.message)
    const base = heuristicEvaluation({ track, userResponse })
    // Free-text answers still need a number. The same rubric, applied per answer.
    const custom = customs.map((c, i) => {
      const h = heuristicEvaluation({ track, userResponse: c.answer })
      return { i, score: h.score, why: 'Scored locally — the model was unavailable.' }
    })
    return { ...base, custom, source: 'offline' }
  }
}

/* ---------------------------------------------------------- interview ----- */

export async function generateInterview({ round, role, company, profile, resume, portfolio, asked, n = 3 }) {
  try {
    const { data, model } = await askForJson(
      interviewPrompt({ round, role, company, profile, resume, portfolio, asked, n }),
      {
        temperature: 0.95,
        maxTokens: 900,
        budgetMs: 50_000,
        validate: (d) => Array.isArray(d.questions) && d.questions.length >= 2,
      }
    )

    const questions = data.questions
      .filter((q) => q && typeof q.text === 'string' && q.text.trim().length > 12)
      .slice(0, n)
      .map((q) => ({ text: str(q.text, 300), hint: str(q.hint, 120) }))

    if (questions.length < 2) throw new Error('too few usable questions')

    return {
      opener: str(data.opener, 200) || 'Thanks for making the time. Shall we start?',
      questions,
      source: 'ai',
      model,
    }
  } catch (err) {
    console.warn('[ai] interview fell back to the question bank |', (err.tried ?? []).join(' | ') || err.message)
    return { ...FALLBACK_INTERVIEW(round.level, n), source: 'offline' }
  }
}

export async function debriefInterview({ round, role, profile, resume, portfolio, pairs }) {
  try {
    const { data, model } = await askForJson(
      interviewDebriefPrompt({ round, role, profile, resume, portfolio, pairs }),
      {
        temperature: 0.3,
        maxTokens: 1600,
        budgetMs: 70_000,
        validate: (d) => Array.isArray(d.answers) && Number.isFinite(Number(d.score)),
      }
    )

    const clamp = (v) => Math.min(10, Math.max(1, Math.round(Number(v) || 1)))

    const aligned = alignByIndex(data.answers, pairs.length)

    const answers = pairs.map((pair, i) => {
      const a = aligned[i]
      // An unanswered question is graded here, not by the model. There is
      // nothing to read, so there is nothing for it to be generous about.
      if (!pair.answer?.trim()) {
        return {
          i,
          score: 1,
          worked: 'You did not answer this one.',
          improve:
            'Say something. In a real interview, silence reads as either unprepared or unwilling, and both cost you the round.',
          better:
            'Even "I have not hit that situation yet, but here is how I would approach it" keeps the conversation alive.',
        }
      }
      return {
        i,
        score: clamp(a.score),
        worked: str(a.worked, 400),
        improve: str(a.improve, 400),
        better: str(a.better, 400),
      }
    })

    return {
      answers,
      score: clamp(data.score),
      verdict: str(data.verdict, 300),
      strengths: str(data.strengths, 600),
      gaps: str(data.gaps, 600),
      nextFocus: str(data.nextFocus, 200),
      source: 'ai',
      model,
    }
  } catch (err) {
    console.warn('[ai] debrief fell back to heuristic |', (err.tried ?? []).join(' | ') || err.message)
    return { ...heuristicDebrief({ pairs }), source: 'offline' }
  }
}

/* --------------------------------------------------- group discussion ----- */

export async function gdTurn({ topic, transcript, beat, totalBeats, lastUserTurn }) {
  try {
    const { data, model } = await askForJson(
      gdTurnPrompt({ topic, transcript, beat, totalBeats, lastUserTurn }),
      {
        temperature: 1.0,
        maxTokens: 500,
        budgetMs: 40_000,
        validate: (d) => Array.isArray(d.turns) && d.turns.length >= 1,
      }
    )

    const names = new Set(GD_PANEL.map((p) => p.name))
    const turns = data.turns
      .filter((t) => t && typeof t.text === 'string' && t.text.trim())
      // A turn attributed to someone not in the room breaks the illusion
      // completely, so an unknown speaker is reassigned rather than shown.
      .map((t, i) => ({
        speaker: names.has(t.speaker) ? t.speaker : GD_PANEL[(beat + i) % GD_PANEL.length].name,
        text: str(t.text, 240),
      }))
      .slice(0, 3)

    if (!turns.length) throw new Error('no usable turns')
    return { turns, source: 'ai', model }
  } catch (err) {
    console.warn('[ai] GD turn fell back to script |', (err.tried ?? []).join(' | ') || err.message)
    return { ...FALLBACK_GD_TURN(beat, lastUserTurn), source: 'offline' }
  }
}

export async function evaluateGd({ topic, transcript, contributions, profile }) {
  try {
    const { data, model } = await askForJson(
      gdEvaluationPrompt({ topic, transcript, contributions, profile }),
      {
        temperature: 0.3,
        maxTokens: 900,
        budgetMs: 60_000,
        validate: (d) => d.scores && Number.isFinite(Number(d.score)),
      }
    )

    const pct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))
    const scores = {
      communication: pct(data.scores.communication),
      confidence: pct(data.scores.confidence),
      leadership: pct(data.scores.leadership),
      teamwork: pct(data.scores.teamwork),
      listening: pct(data.scores.listening),
    }

    // A candidate who never spoke cannot be carried by a generous grader.
    if (!contributions.length) {
      for (const k of Object.keys(scores)) scores[k] = Math.min(scores[k], 25)
    }

    return {
      scores,
      score: contributions.length
        ? Math.max(1, Math.min(10, Math.round(Number(data.score))))
        : 1,
      verdict: str(data.verdict, 300),
      strengths: str(data.strengths, 600),
      gaps: str(data.gaps, 600),
      nextFocus: str(data.nextFocus, 200),
      source: 'ai',
      model,
    }
  } catch (err) {
    console.warn('[ai] GD debrief fell back to heuristic |', (err.tried ?? []).join(' | ') || err.message)
    return { ...heuristicGd({ transcript, contributions }), source: 'offline' }
  }
}

/* ------------------------------------------------------------- the offer -- */

/**
 * Strips any name the model made up.
 *
 * The review prompt is told not to invent colleagues, and it did anyway — a run
 * produced "Jordan has spoken up for you" on a team with no Jordan on it. A
 * fabricated advocate is worse than a bland review, so the sentence carrying an
 * unknown name is dropped rather than shown.
 */
function withoutInventedPeople(text, known) {
  if (!text) return text
  const allowed = new Set(known.map((n) => n.toLowerCase()))
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => {
      const names = sentence.match(/\b[A-Z][a-z]{2,}\b/g) ?? []
      return !names.some(
        (n) =>
          !allowed.has(n.toLowerCase()) &&
          !COMMON_WORDS.has(n.toLowerCase())
      )
    })
    .join(' ')
    .trim()
}

// Sentence-initial words and role nouns that look like names to the regex.
const COMMON_WORDS = new Set([
  'you', 'your', 'the', 'this', 'that', 'these', 'those', 'over', 'during', 'after',
  'before', 'when', 'while', 'they', 'their', 'there', 'here', 'and', 'but', 'for',
  'with', 'without', 'across', 'against', 'communication', 'leadership', 'teamwork',
  'professionalism', 'adaptability', 'confidence', 'problem', 'solving', 'decision',
  'making', 'emotional', 'intelligence', 'relationship', 'building', 'engineer',
  'engineering', 'software', 'product', 'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'internship', 'intern', 'overall', 'however', 'although', 'given',
  'moving', 'going', 'keep', 'well', 'good', 'strong', 'nobody', 'someone', 'people',
])

export async function writeReview({ review, title, company }) {
  try {
    const { data, model } = await askForJson(reviewPrompt({ review, title, company }), {
      temperature: 0.5,
      maxTokens: 500,
      budgetMs: 45_000,
      validate: (d) => typeof d.feedback === 'string' && d.feedback.trim().length > 30,
    })
    const known = [...(review.advocates ?? []), ...(review.detractors ?? [])]
    return {
      summary: withoutInventedPeople(str(data.summary, 200), known) || str(data.summary, 200),
      feedback: withoutInventedPeople(str(data.feedback, 600), known),
      source: 'ai',
      model,
    }
  } catch (err) {
    console.warn('[ai] review fell back |', (err.tried ?? []).join(' | ') || err.message)
    return { ...heuristicReview(review), source: 'offline' }
  }
}

const NEGOTIATION_RESULTS = new Set(['success', 'partial', 'none', 'backfire'])

export async function judgeNegotiation({ offer, message, review, round, roundsLeft }) {
  try {
    const { data, model } = await askForJson(
      negotiationPrompt({ offer, message, review, round, roundsLeft }),
      {
        temperature: 0.35,
        maxTokens: 800,
        budgetMs: 55_000,
        validate: (d) => NEGOTIATION_RESULTS.has(d.result) && d.scores,
      }
    )

    const pct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))
    const scores = {
      confidence: pct(data.scores.confidence),
      communication: pct(data.scores.communication),
      professionalism: pct(data.scores.professionalism),
      reasoning: pct(data.scores.reasoning),
      strategy: pct(data.scores.strategy),
    }

    // A "success" the numbers do not support is the grader being generous; the
    // company's own room is what decides, and it is stated in the prompt.
    const mean = Object.values(scores).reduce((a, b) => a + b, 0) / 5
    let result = data.result
    if (result === 'success' && (mean < 62 || review.meanAttribute < 55)) result = 'partial'

    return {
      scores,
      result,
      strength: Math.max(0, Math.min(1, Number(data.strength) || 0.5)),
      reaction: str(data.reaction, 500),
      coaching: str(data.coaching, 300),
      message,
      source: 'ai',
      model,
    }
  } catch (err) {
    console.warn('[ai] negotiation fell back |', (err.tried ?? []).join(' | ') || err.message)
    return { ...heuristicNegotiation({ message, review }), message, source: 'offline' }
  }
}

/* -------------------------------------------------------- the workplace --- */

export async function generateBeat(spec) {
  try {
    const { data, model } = await askForJson(workplaceBeatPrompt(spec), {
      temperature: 1.0,
      maxTokens: spec.kind === 'decision' ? 1400 : 700,
      budgetMs: 50_000,
      validate: (d) =>
        typeof d.situation === 'string' &&
        d.situation.trim().length > 30 &&
        (spec.kind !== 'decision' || (Array.isArray(d.options) && d.options.length >= 3)),
    })

    const beat = {
      headline: str(data.headline, 80) || 'Something came up',
      situation: str(data.situation, 500),
      prompt: str(data.prompt, 160) || 'Write what you would do.',
      source: 'ai',
      model,
    }

    if (spec.kind === 'decision') {
      const q = normaliseQuestion({ situation: data.situation, question: data.prompt, options: data.options })
      if (!q) throw new Error('unusable options')
      beat.options = q.options
    }
    if (spec.kind === 'dialogue') {
      beat.opening = str(data.opening, 300) || 'Have you got a minute?'
    }
    return beat
  } catch (err) {
    console.warn('[ai] beat fell back |', (err.tried ?? []).join(' | ') || err.message)
    return { ...FALLBACK_BEAT(spec), source: 'offline' }
  }
}

export async function dialogueTurn({ character, situation, turns, remaining, company }) {
  try {
    const { data, model } = await askForJson(
      dialogueTurnPrompt({ character, situation, turns, remaining, company }),
      {
        temperature: 0.95,
        maxTokens: 400,
        budgetMs: 40_000,
        validate: (d) => typeof d.text === 'string' && d.text.trim().length > 5,
      }
    )
    return { text: str(data.text, 300), mood: str(data.mood, 20) || 'same', source: 'ai', model }
  } catch (err) {
    console.warn('[ai] dialogue turn fell back |', (err.tried ?? []).join(' | ') || err.message)
    return {
      ...FALLBACK_DIALOGUE_TURN({ character, turnIndex: turns.filter((t) => t.who === 'you').length - 1 }),
      source: 'offline',
    }
  }
}

export async function evaluateDialogue({ character, situation, turns, learner }) {
  try {
    const { data, model } = await askForJson(
      dialogueEvaluationPrompt({ character, situation, turns, learner }),
      {
        temperature: 0.3,
        maxTokens: 900,
        budgetMs: 55_000,
        validate: (d) => Number.isFinite(Number(d.score)) && typeof d.strengths === 'string',
      }
    )
    return {
      score: Math.max(1, Math.min(10, Math.round(Number(data.score)))),
      strengths: str(data.strengths, 500),
      gaps: str(data.gaps, 500),
      suggestion: str(data.suggestion, 400),
      relationship: Math.max(-6, Math.min(6, Math.round(Number(data.relationship) || 0))),
      consequence: str(data.consequence, 300),
      source: 'ai',
      model,
    }
  } catch (err) {
    console.warn('[ai] dialogue grading fell back |', (err.tried ?? []).join(' | ') || err.message)
    return { ...heuristicDialogue({ turns, character }), source: 'offline' }
  }
}
