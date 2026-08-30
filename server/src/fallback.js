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

/* --------------------------------------------------------- offline MCQ ---- */

/**
 * The multiple-choice half of a level, without a model.
 *
 * Each template supplies four responses along the same axis the AI path is told
 * to use — own it, half-own it, defer it, hide it — and the order is rotated per
 * question so the strongest option is not always in the same position.
 */
const MCQ_TEMPLATES = {
  'workplace-communication': [
    (s, sys) => ({
      situation: `${s.name}, ${s.counterpart.role}, asks in ${s.medium} whether ${sys} will be ready for Thursday. You know it will not be.`,
      question: 'What do you say?',
      good: `Tell them today that it will slip, give the new date and the one thing causing it.`,
      ok: `Say it is at risk and promise a firm update tomorrow morning.`,
      weak: `Say it is mostly on track and hope you can pull it back by Thursday.`,
      bad: `Say nothing and raise it on Thursday when it is obvious.`,
    }),
    (s, sys) => ({
      situation: `Your change to ${sys} broke a report ${s.name} depends on. Nobody has noticed yet.`,
      question: 'What is your first move?',
      good: `Message ${s.name} now with what broke, the impact, and when the fix lands.`,
      ok: `Fix it quietly first, then tell ${s.name} it happened and is resolved.`,
      weak: `Wait to see whether anyone actually uses that report this week.`,
      bad: `Leave it. It worked before your change, so someone else can find it.`,
    }),
    (s, sys) => ({
      situation: `In ${s.medium}, ${s.name} criticises your work on ${sys} in front of the team. Part of it is fair, part is not.`,
      question: 'How do you respond in the moment?',
      good: `Accept the fair part specifically, and ask to walk through the rest after.`,
      ok: `Thank them, say little, and follow up privately later.`,
      weak: `Defend the whole thing there and then so the team hears your side.`,
      bad: `Point out that the part they got wrong is their own team's job anyway.`,
    }),
    (s, sys) => ({
      situation: `${s.name} asks you to take on rebuilding ${sys} this sprint. Your current work would slip.`,
      question: 'What do you reply?',
      good: `Ask which of the two they want first, and name what the other one costs.`,
      ok: `Agree to look at it and come back with an estimate before committing.`,
      weak: `Say yes and try to do both, planning to work the weekend.`,
      bad: `Say you are too busy and leave it there.`,
    }),
  ],

  'critical-thinking': [
    (s, sys) => ({
      situation: `${s.name} reports that ${sys} is broken for everyone. Your error metrics are flat.`,
      question: 'What do you do first?',
      good: `Ask ${s.name} for one exact example — account, time, and what they saw.`,
      ok: `Re-run the metrics query yourself in case the dashboard is stale.`,
      weak: `Restart the service and see whether the complaint goes away.`,
      bad: `Reply that the metrics are fine, so nothing is actually wrong.`,
    }),
    (s, sys, art) => ({
      situation: `${s.name} proposes ${art} for ${sys}, citing a benchmark they ran on a dataset far smaller than production.`,
      question: 'What do you raise?',
      good: `Ask what the benchmark assumed, and offer to re-run it at production scale.`,
      ok: `Suggest shipping it behind a flag so it can be measured for real.`,
      weak: `Go along with it — they have more experience than you do.`,
      bad: `Say the benchmark is meaningless and the whole approach is wrong.`,
    }),
    (s, sys) => ({
      situation: `Two dashboards disagree about ${sys}. ${s.name} has already quoted the more flattering number in ${s.medium}.`,
      question: 'What is your next step?',
      good: `Find which definition each one uses before telling anyone either is wrong.`,
      ok: `Flag privately to ${s.name} that the numbers disagree and you are checking.`,
      weak: `Use the number that matches your own analysis and move on.`,
      bad: `Correct ${s.name} publicly in the same thread.`,
    }),
    (s, sys) => ({
      situation: `A request lands to add a feature to ${sys}. The stated reason does not match what the usage data shows.`,
      question: 'What do you do before building it?',
      good: `Ask what problem it solves and who reported it, then check that against the data.`,
      ok: `Build the smallest version and see whether anyone uses it.`,
      weak: `Build exactly what was asked for — it is not your call to question it.`,
      bad: `Reject it and reply that the data says nobody needs this.`,
    }),
  ],

  'ai-fluency': [
    (s, sys) => ({
      situation: `An AI assistant gives you code for ${sys} that calls a library function you cannot find in the docs.`,
      question: 'What do you do?',
      good: `Check the library source or changelog before running anything it wrote.`,
      ok: `Run it in a scratch file first and see whether it even imports.`,
      weak: `Ask the assistant whether the function exists and trust the answer.`,
      bad: `Ship it — it compiled locally, so the function must be real.`,
    }),
    (s, sys) => ({
      situation: `${s.name} pastes an AI-written summary into ${s.medium} with a precise statistic about ${sys} that nobody can source.`,
      question: 'How do you handle it?',
      good: `Ask where the number came from before it is repeated anywhere else.`,
      ok: `Reproduce the number yourself from the raw data, then reply.`,
      weak: `Let it go — it sounds about right and the point stands either way.`,
      bad: `Repeat the number in your own update so the message stays consistent.`,
    }),
    (s, sys) => ({
      situation: `${s.name}, ${s.counterpart.role}, submits AI-written code for ${sys} and cannot explain what one function does.`,
      question: 'What do you say in review?',
      good: `Ask them to walk you through that function, and block only on the part neither of you can explain.`,
      ok: `Approve the rest and ask for a comment explaining the unclear function.`,
      weak: `Approve it — the tests pass, so it works.`,
      bad: `Reject the whole change and say AI-written code is not allowed here.`,
    }),
    (s, sys) => ({
      situation: `You are behind on documenting ${sys} and an AI can draft all of it in a minute.`,
      question: 'What is the right use of it?',
      good: `Let it draft the structure, then verify every claim against the actual code.`,
      ok: `Use it for the boilerplate sections only and write the logic yourself.`,
      weak: `Publish the draft and fix anything people complain about later.`,
      bad: `Publish it as-is and mark the documentation task done.`,
    }),
  ],
}

/** Four fixed grades, rotated so the best option moves position by question. */
const GRADES = [
  { key: 'good', score: 9, why: 'This owns the problem and gives the other person something concrete to act on.' },
  { key: 'ok', score: 6, why: 'Reasonable and safe, but it leaves the harder half of the problem for later.' },
  { key: 'weak', score: 3, why: 'This avoids the real issue rather than resolving it.' },
  { key: 'bad', score: 1, why: 'This costs you trust, and the problem still arrives — just later and larger.' },
]

export function FALLBACK_LEVEL(trackId, n = 0) {
  const templates = MCQ_TEMPLATES[trackId] ?? MCQ_TEMPLATES['workplace-communication']
  const shape = sampleShape(n, {}, { singularOnly: true })

  const questions = templates.map((build, i) => {
    const t = build(shape, pickFrom(SYSTEMS, n + i * 5), pickFrom(ARTEFACTS, n + i * 3))
    // Rotate the grade order per question so position carries no signal.
    const order = GRADES.map((_, k) => GRADES[(k + i + n) % GRADES.length])
    return {
      situation: t.situation,
      question: t.question,
      options: order.map((g) => ({ text: t[g.key], score: g.score, why: g.why })),
    }
  })

  return {
    setting: `You are two months into your first job. ${shape.name} is ${shape.counterpart.role} on your team, and this week is busier than usual.`,
    questions,
  }
}

/* ---------------------------------------------------- offline interview ---- */

const INTERVIEW_BANK = {
  1: [
    'Tell me about yourself — start wherever you think is most relevant to this role.',
    'Why this role in particular, rather than the other things your degree opens up?',
    'What is one thing on your resume you would happily spend ten minutes on?',
  ],
  2: [
    'Tell me about a time you disagreed with someone on a team project. What did you do?',
    'Describe something you worked on that did not go the way you planned.',
    'Tell me about a time you had to learn something quickly to keep a project moving.',
  ],
  3: [
    'Pick the project you are proudest of and walk me through how you built it.',
    'What was the hardest technical decision you made on it, and what did you trade away?',
    'If you started that project again tomorrow, what would you do differently and why?',
  ],
  4: [
    'You have said you work well under pressure. What is the evidence for that?',
    'A reviewer says your approach is wrong and you believe they have misread it. What happens next?',
    'What is the weakest part of your profile for this role, and what are you doing about it?',
  ],
  5: [
    'You are given a task with a deadline you know is unrealistic. Walk me through your first day.',
    'What do you want to be doing two years from now, and what would have to be true here for that?',
    'What would you like to ask me about the team or the work?',
  ],
}

export function FALLBACK_INTERVIEW(level, n = 3) {
  const bank = INTERVIEW_BANK[level] ?? INTERVIEW_BANK[1]
  return {
    opener: 'Thanks for making the time. Let us get straight into it.',
    questions: bank.slice(0, n).map((text) => ({ text, hint: '' })),
    offlineNote:
      'The AI model was unavailable, so these are standard questions for this round rather than ones written from your resume.',
  }
}

/**
 * Deterministic interview grading. The same crude proxy as heuristicEvaluation,
 * capped the same way — it exists so a round is never lost, not to be trusted.
 */
export function heuristicDebrief({ pairs }) {
  const answers = pairs.map((p, i) => {
    const text = String(p.answer || '').trim()
    const words = text.split(/\s+/).filter(Boolean).length
    const concrete = /\b\d+\b|\bfor example\b|\bI (?:built|used|shipped|ran|wrote|led)\b/i.test(text)
    const structured = /\bbecause\b|\bso that\b|\bfirst\b|\bthen\b|\binstead\b/i.test(text)

    let score = 1
    if (words >= 20) score = 3
    if (words >= 50) score = 4
    if (words >= 90) score = 5
    if (concrete) score += 1
    if (structured) score += 1
    score = Math.max(1, Math.min(7, score))

    return {
      i,
      score,
      worked:
        words < 20
          ? 'There is not enough here to judge yet.'
          : `You gave a real answer of ${words} words${concrete ? ', with a concrete example in it' : ''}.`,
      improve: !concrete
        ? 'It stays general. An interviewer needs one specific thing you actually did.'
        : !structured
          ? 'The reasoning is implicit. Say why you chose what you chose.'
          : 'Tighten it — the same point in half the words lands harder.',
      better:
        'Try: situation, what you did, what it changed. One sentence each, with a real number in it.',
    }
  })

  const mean = answers.reduce((s, a) => s + a.score, 0) / (answers.length || 1)
  return {
    answers,
    score: Math.max(1, Math.min(7, Math.round(mean))),
    verdict: 'Scored locally while the model was unavailable — treat this as rough.',
    strengths: 'You completed the round and answered every question put to you.',
    gaps: 'Without the model this can only judge the shape of your answers, not their content.',
    nextFocus: 'run this round again when the model is available for a real read',
    offlineNote:
      'The AI model was rate-limited, so this round was scored by a local rubric. Retry later for a proper debrief.',
  }
}
