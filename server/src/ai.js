import { scenarioPrompt, evaluationPrompt, learnerSummaryPrompt } from './prompts.js'
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
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`)
    err.status = res.status
    throw err
  }

  const data = await res.json()
  if (data.error) throw new Error(`OpenRouter: ${data.error.message}`)
  return data.choices?.[0]?.message?.content ?? ''
}

/**
 * Ask the model for JSON, walking the model fallback list and retrying the
 * transient statuses. Free-tier Gemma shares an upstream pool and returns 429
 * under load, so this is a normal path rather than an edge case.
 */
async function askForJson(prompt, { temperature = 0.9, maxTokens = 700, validate } = {}) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set — check server/.env')
  }

  const RETRYABLE = new Set([408, 429, 500, 502, 503, 504])
  let last

  for (const model of models()) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), 45_000)
      try {
        const text = await callOnce(model, prompt, {
          temperature,
          maxTokens,
          signal: ac.signal,
        })
        const parsed = extractJson(text)
        if (parsed && (!validate || validate(parsed))) return { data: parsed, model }
        last = new Error(`Unusable reply from ${model}: ${String(text).slice(0, 160)}`)
      } catch (e) {
        last = e
        if (e.status && !RETRYABLE.has(e.status)) break // hard error — next model
      } finally {
        clearTimeout(timer)
      }
      await sleep(600 * (attempt + 1))
    }
  }
  throw last ?? new Error('No response from any model')
}

/* --------------------------------------------------------------- public --- */

export async function generateScenario({ track, difficulty, avoid, profile, learner }) {
  try {
    const { data, model } = await askForJson(
      scenarioPrompt({ track, difficulty, avoid, profile, learner }),
      {
        temperature: 1.0,
        maxTokens: 400,
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
    console.warn('[ai] scenario fell back to offline bank:', err.message)
    return { ...FALLBACK_SCENARIOS(track.id, difficulty, avoid), difficulty, source: 'offline' }
  }
}

export async function evaluateResponse({ track, difficulty, scenarioText, userResponse, learner }) {
  try {
    const { data, model } = await askForJson(
      evaluationPrompt({ track, difficulty, scenarioText, userResponse, learner }),
      {
        temperature: 0.3,
        maxTokens: 600,
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
    console.warn('[ai] evaluation fell back to offline heuristic:', err.message)
    return { ...heuristicEvaluation({ track, userResponse }), source: 'offline' }
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
