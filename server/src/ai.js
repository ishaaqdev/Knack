import {
  scenarioPrompt,
  evaluationPrompt,
  learnerSummaryPrompt,
  portfolioPrompt,
} from './prompts.js'
import { FALLBACK_SCENARIOS, heuristicEvaluation } from './fallback.js'

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
      max_tokens: maxTokens,
      // Reasoning models (Nemotron) otherwise emit their visible chain of
      // thought first and hit the token ceiling before the JSON is written.
      // Ignored by providers that do not support it.
      reasoning: { exclude: true },
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
  if (data.error) throw new Error(`OpenRouter: ${data.error.message}`)
  return data.choices?.[0]?.message?.content ?? ''
}

/**
 * Ask the model for JSON. One attempt per model, plus a single retry reserved
 * for genuinely transient failures (timeouts, 5xx) — never for rate limits,
 * where retrying is exactly the wrong move.
 */
async function askForJson(prompt, { temperature = 0.9, maxTokens = 700, validate } = {}) {
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
  let last
  const tried = []

  for (const model of models()) {
    if (coolingModel(model) || coolingAccount()) {
      tried.push(`${model}: cooling down`)
      continue
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), 45_000)
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
      if (attempt === 0) await sleep(700)
    }
  }
  const err = last ?? new Error('No response from any model')
  err.tried = tried
  throw err
}

/* --------------------------------------------------------------- public --- */

export async function generateScenario({ track, difficulty, avoid, profile, learner, portfolio, shape }) {
  try {
    const { data, model } = await askForJson(
      scenarioPrompt({ track, difficulty, avoid, profile, learner, portfolio, shape }),
      {
        temperature: 1.0,
        maxTokens: 900,
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
