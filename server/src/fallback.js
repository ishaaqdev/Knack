/**
 * Offline safety net.
 *
 * The free tier enforces an account-wide 20-requests-per-minute cap, so the
 * offline path is not a rare edge case — during a demo it may serve a large
 * share of scenarios. The original bank held eighteen fixed strings, two per
 * (track, difficulty), which produced visible verbatim repeats after the second
 * request in a band.
 *
 * It is now procedural: templates are combined with the same shape axes the AI
 * path uses, so the offline mode inherits the same variety instead of cycling.
 */

import { sampleShape } from './variation.js'

const SYSTEMS = [
  'the checkout service', 'the notification worker', 'the onboarding flow',
  'the reporting dashboard', 'the authentication service', 'the payments webhook',
  'the search index', 'the mobile sync job', 'the billing export',
  'the image processing pipeline', 'the referral module', 'the audit log',
]

const ARTEFACTS = [
  'a migration script', 'a caching layer', 'a retry policy', 'a rate limiter',
  'an input validation rule', 'a background job', 'a feature flag', 'a webhook handler',
]

const pickFrom = (list, n) => list[Math.abs(n) % list.length]
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Each template receives the sampled shape, so the counterpart, medium, moment
 * and pressure vary exactly as they do on the AI path.
 */
const TEMPLATES = {
  'workplace-communication': [
    (s, sys) => ({
      scenario: `${s.name}, ${s.counterpart.role}, has asked you twice about ${sys} and you have not replied yet. The message is sitting in ${s.medium} and ${s.pressure}.`,
      prompt: `Write what you send ${s.name}.`,
    }),
    (s, sys, art) => ({
      scenario: `You shipped ${art} to ${sys} last week and it has caused a problem nobody has noticed yet. ${s.name}, ${s.counterpart.role}, is the person it will land on. You have to raise it in ${s.medium}, and ${s.pressure}.`,
      prompt: `Write how you tell ${s.name}.`,
    }),
    (s, sys) => ({
      scenario: `${s.name}, ${s.counterpart.role}, wants you to take on rebuilding ${sys} on top of what you already have. Saying yes means something else slips. The conversation is happening in ${s.medium} and ${s.pressure}.`,
      prompt: `Write your reply to ${s.name}.`,
    }),
    (s, sys) => ({
      scenario: `In ${s.medium}, ${s.name} — ${s.counterpart.role} — criticised your work on ${sys} in a way you think is only partly fair. Others saw it. ${cap(s.pressure)}.`,
      prompt: `Write how you respond to ${s.name}.`,
    }),
    (s, sys) => ({
      scenario: `A decision has already been made to ship ${sys} on Friday and you disagree with it. ${s.name}, ${s.counterpart.role}, made that call. You get one chance to say something in ${s.medium}, and ${s.pressure}.`,
      prompt: `Write what you say to ${s.name}.`,
    }),
    (s, sys) => ({
      scenario: `${s.name}, ${s.counterpart.role}, is asking you to commit to a delivery date for ${sys}. You genuinely do not know whether it is two days or two weeks. They want the answer now, in ${s.medium}, and ${s.pressure}.`,
      prompt: `Write your answer to ${s.name}.`,
    }),
  ],

  'critical-thinking': [
    (s, sys) => ({
      scenario: `${s.name}, ${s.counterpart.role}, reports that ${sys} is broken for everyone. Your metrics show error rates unchanged from last week. They raised it in ${s.medium} and ${s.pressure}.`,
      prompt: `Write how you would approach this.`,
    }),
    (s, sys, art) => ({
      scenario: `${s.name}, ${s.counterpart.role}, is proposing ${art} for ${sys}, citing a benchmark they ran themselves on a dataset far smaller than production. Nobody has questioned it. ${cap(s.pressure)}.`,
      prompt: `Write what you raise, and how.`,
    }),
    (s, sys) => ({
      scenario: `Two dashboards disagree about ${sys}: one shows usage rising, your own query shows it falling. ${s.name}, ${s.counterpart.role}, has already quoted the rising figure in ${s.medium}. ${cap(s.pressure)}.`,
      prompt: `Write how you would resolve this.`,
    }),
    (s, sys) => ({
      scenario: `A request has come in to add a feature to ${sys}. The stated reason does not match what the usage data shows. ${s.name}, ${s.counterpart.role}, is the one asking, in ${s.medium}, and ${s.pressure}.`,
      prompt: `Write what you would do before building it.`,
    }),
    (s, sys) => ({
      scenario: `Failures in ${sys} rose sharply after a release containing eleven merged changes. A third-party provider also had an outage that week, and traffic was up from a campaign. ${s.name}, ${s.counterpart.role}, wants a cause, and ${s.pressure}.`,
      prompt: `Write how you would narrow this down.`,
    }),
    (s, sys, art) => ({
      scenario: `You have to choose between ${art} and a simpler alternative for ${sys}. The evidence you have does not clearly favour either. ${s.name}, ${s.counterpart.role}, is waiting on your recommendation in ${s.medium}, and ${s.pressure}.`,
      prompt: `Write your recommendation and your reasoning.`,
    }),
  ],

  'ai-fluency': [
    (s, sys) => ({
      scenario: `An AI assistant has written you a working-looking function for ${sys} that calls a library method you have never seen documented. ${s.name}, ${s.counterpart.role}, is waiting on the change, and ${s.pressure}.`,
      prompt: `Write what you do before committing it.`,
    }),
    (s, sys) => ({
      scenario: `${s.name}, ${s.counterpart.role}, has opened a large change to ${sys} that was clearly AI-generated. In ${s.medium} they cannot explain why one part retries three times. The tests pass, and ${s.pressure}.`,
      prompt: `Write your review comment to ${s.name}.`,
    }),
    (s, sys) => ({
      scenario: `You asked an AI to summarise the incident history for ${sys}. The summary is confident and includes a specific figure you are about to repeat to ${s.name}, ${s.counterpart.role}, in ${s.medium}. ${cap(s.pressure)}.`,
      prompt: `Write your next step and why.`,
    }),
    (s, sys) => ({
      scenario: `A generated report about ${sys} cites three sources supporting your argument. Two of them return nothing when you search for them. ${s.name}, ${s.counterpart.role}, expects the report in ${s.medium}, and ${s.pressure}.`,
      prompt: `Write what you do about the citations.`,
    }),
    (s, sys) => ({
      scenario: `Your team wants to let an AI answer customer questions about ${sys}. In testing it is right most of the time and confidently wrong the rest, usually on refunds. ${s.name}, ${s.counterpart.role}, considers that acceptable, and ${s.pressure}.`,
      prompt: `Write the position you take.`,
    }),
    (s, sys) => ({
      scenario: `${s.name}, ${s.counterpart.role}, asks you in ${s.medium} whether an AI tool should be allowed to change ${sys} without human review. You can see arguments both ways, and ${s.pressure}.`,
      prompt: `Write your answer to ${s.name}.`,
    }),
  ],
}

/** Harder bands get a second complication appended. */
const COMPLICATION = {
  easy: '',
  medium: ' Someone else on the team has already given a different answer.',
  hard: ' Whatever you decide, one of the people involved loses something, and it will be visible to everyone.',
}

let counter = 0

export function FALLBACK_SCENARIOS(trackId, difficulty, avoid = []) {
  const templates = TEMPLATES[trackId] ?? TEMPLATES['workplace-communication']

  // Walk forward until we produce something not recently served. The space is
  // large enough that this terminates almost immediately.
  for (let tries = 0; tries < 24; tries++) {
    const n = counter++
    const built = templates[n % templates.length](
      sampleShape(n, {}, { singularOnly: true }),
      pickFrom(SYSTEMS, n * 3),
      pickFrom(ARTEFACTS, n * 5)
    )
    const scenarioText = built.scenario + (COMPLICATION[difficulty] ?? '')

    if (!avoid.some((a) => a.slice(0, 60) === scenarioText.slice(0, 60))) {
      return { scenarioText, taskPrompt: built.prompt }
    }
  }

  const n = counter++
  const built = templates[n % templates.length](
    sampleShape(n, {}, { singularOnly: true }),
    pickFrom(SYSTEMS, n),
    pickFrom(ARTEFACTS, n)
  )
  return { scenarioText: built.scenario, taskPrompt: built.prompt }
}

/** Distinct offline scenarios reachable per track. Quoted in the report. */
export const OFFLINE_SPACE = 6 * SYSTEMS.length * ARTEFACTS.length

/**
 * Deterministic rubric used only when the model is unreachable. It rewards
 * length, specificity and structure — a crude proxy, so it is capped at 7 and
 * says plainly that it is not a real evaluation.
 */
export function heuristicEvaluation({ track, userResponse }) {
  const text = String(userResponse || '').trim()
  const words = text.split(/\s+/).filter(Boolean).length
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 3).length

  let score = 1
  if (words >= 15) score = 3
  if (words >= 40) score = 4
  if (words >= 70) score = 5

  const specific = /\b\d+\b|\b(?:by|before|within)\s+\w+day|\b\d+\s*(?:hour|day|week)/i.test(text)
  const asks = /\?|clarif|confirm|check|verify|ask\b/i.test(text)
  const owns = /\bI (?:will|would|can|should|plan|propose|suggest)\b/i.test(text)

  if (specific) score += 1
  if (asks) score += 1
  if (owns && sentences >= 2) score += 1
  score = Math.max(1, Math.min(7, score))

  const strengths =
    words < 15
      ? 'There is the start of an idea here.'
      : `You engaged with the situation and wrote ${words} words with a clear point of view.${
          specific ? ' You included a concrete detail, which is what makes a response actionable.' : ''
        }`

  const gaps = [
    words < 40 ? 'The response is short — there is not enough here to show your reasoning.' : null,
    !specific ? 'It stays general. Naming a specific timeline, number, or next step would make it land.' : null,
    !asks ? 'You did not name anything you would verify or clarify first.' : null,
  ]
    .filter(Boolean)
    .join(' ') || 'Nothing major missing at this length — push for more nuance next time.'

  return {
    score,
    strengths,
    gaps,
    suggestion:
      'Try the "situation → what I will do → by when" shape. One sentence each, with a real name and a real date in it.',
    feedback: `${strengths} ${gaps}`,
    offlineNote:
      'The AI model was rate-limited, so this was scored by a local rubric — treat it as rough, not a real evaluation.',
  }
}
