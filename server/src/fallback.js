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
    'Walk me through the last two years — not your CV, the decisions.',
    'Why this role specifically? "I like coding" is true of everyone in the building.',
    'What is on your resume that you would defend hardest if I pushed on it?',
    'What made you apply to us rather than the company next door?',
    'Tell me about something you built that nobody asked you to build.',
    'What do you think this job is mostly going to be, day to day?',
    'What is the last thing you learned that you did not have to?',
  ],
  2: [
    'Tell me about a time you were clearly wrong and someone else was right.',
    'Describe a deadline you missed. What did the other people find out, and when?',
    'Tell me about someone on a team you found genuinely difficult to work with.',
    'When did you last change your mind about something technical? What changed it?',
    'Tell me about a time you had to do work you thought was pointless.',
    'Describe a moment where you should have asked for help earlier than you did.',
    'Tell me about a decision you made that affected someone else more than you.',
  ],
  3: [
    'Pick your hardest project. What was the thing that nearly killed it?',
    'What did you build that you would now build completely differently?',
    'Talk me through a technical decision where the alternative was also defensible.',
    'What part of that project did you not really understand at the time?',
    'If I gave you two more weeks on it, what would you fix first, and why that?',
    'Which part of it would break first under ten times the load?',
    'What did you leave out, and was that the right call?',
  ],
  4: [
    'I am not convinced that project was as much your work as you are suggesting.',
    'You have said you learn fast. What have you learned in the last month?',
    'Your marks are below what we normally shortlist. Why should that not matter here?',
    'What would your last teammate say was the most annoying thing about working with you?',
    'That is not the question I asked. Try again.',
    'Everything you have described went well. Tell me about one that did not.',
    'You are twenty minutes into a production incident and nobody knows the cause. Then what?',
  ],
  5: [
    'The offer is going to be lower than you were hoping. Talk me through how you think about that.',
    'What would make you leave a job inside the first year?',
    'Where do you want to be in two years, and what would have to be true here for that?',
    'What should I have asked you that I did not?',
    'What is the part of this job you think you will be worst at?',
    'If two of us disagree about you after this, what will the disagreement be about?',
    'What do you want to ask me?',
  ],
}


export function FALLBACK_INTERVIEW(level, n = 3, seed = 0) {
  const bank = INTERVIEW_BANK[level] ?? INTERVIEW_BANK[1]
  // Rotate, so running a round twice does not serve the same three questions.
  const picked = Array.from({ length: n }, (_, i) => bank[(seed + i * 2) % bank.length])
  return {
    opener: 'Thanks for making the time. Let us get straight into it.',
    questions: picked.map((text) => ({ text, hint: '' })),
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

/* ------------------------------------------------------- offline GD ------- */

/**
 * The discussion without a model. Beats are pre-written per personality and
 * selected by position, so the room still behaves the way the panel says it
 * does even when nothing can be generated.
 */
const GD_BEATS = [
  // 1. opening
  [
    [
      { speaker: 'Rohit', text: "Okay, I'll start. Honestly, I think the answer's pretty obvious once you stop overthinking it." },
      { speaker: 'Anjali', text: "I'm not sure it's that obvious. What I've read cuts both ways." },
    ],
    [
      { speaker: 'Sneha', text: "Should we agree how we're doing this? Otherwise we'll all talk at once." },
      { speaker: 'Rohit', text: "Fine, but I'll go first. My view's simple, and I think most of you will end up agreeing." },
    ],
    [
      { speaker: 'Anjali', text: "Before we pick sides, can we say what we actually mean by the question? Everyone's going to define it differently." },
      { speaker: 'Vikram', text: 'Good luck with that. Define it however you like, someone here will argue with it.' },
    ],
  ],
  // 2. the first clash
  [
    [
      { speaker: 'Vikram', text: "That's a convenient reading. You've kind of assumed the thing you're trying to prove." },
      { speaker: 'Sneha', text: "I think you two are talking about different timeframes, not really disagreeing. Short term versus long term?" },
    ],
    [
      { speaker: 'Rohit', text: "No, no, wait, let me finish. The point is it works, whatever people say." },
      { speaker: 'Vikram', text: "It works for who, though? That's the bit you keep skipping." },
    ],
    [
      { speaker: 'Anjali', text: "The numbers I know of are mixed. Some of it's clearly good, some of it isn't, and it depends where you look." },
      { speaker: 'Rohit', text: "Mixed? That's just what people say when they don't want to pick a side." },
    ],
  ],
  // 3. the quiet one speaks
  [
    [
      { speaker: 'Imran', text: "Can I add something? Nobody's said who ends up paying for this. It isn't spread evenly." },
      { speaker: 'Rohit', text: "Somebody always pays. That can't be the reason not to do it." },
    ],
    [
      { speaker: 'Imran', text: "Sorry, one thing. We keep arguing about the idea but nobody's talked about how you'd actually do it." },
      { speaker: 'Vikram', text: "Because that's the hard part, and it's easier to argue about the idea." },
    ],
    [
      { speaker: 'Sneha', text: "Imran, you've been quiet. What do you think?" },
      { speaker: 'Imran', text: "I think we're all right about different bits. It's the bit in between that's the problem." },
    ],
  ],
  // 4. looking for middle ground
  [
    [
      { speaker: 'Anjali', text: "There's a middle option, I think. Don't decide it for everyone, let each case decide." },
      { speaker: 'Vikram', text: "Then you get ten different rules and nobody can plan anything." },
    ],
    [
      { speaker: 'Sneha', text: "What if we try it small first and see what happens? Then both of you get something." },
      { speaker: 'Rohit', text: "Small? That's just a slow way of saying no." },
    ],
    [
      { speaker: 'Vikram', text: "Okay, I'll say it. Some of what Rohit said is right. I just don't like how he said it." },
      { speaker: 'Rohit', text: "Ha. Take it, I'll live with that." },
    ],
  ],
  // 5. wrapping up
  [
    [
      { speaker: 'Sneha', text: "We're nearly out of time. Can somebody sum up where we actually landed?" },
      { speaker: 'Imran', text: "We agreed it matters and that the cost isn't shared fairly. We never agreed who should decide." },
    ],
    [
      { speaker: 'Anjali', text: "So, quickly. Real benefit, real cost, and the cost lands on the wrong people. That's the one thing we all accepted." },
      { speaker: 'Rohit', text: "And I'd still say do it. But fine, put it that way." },
    ],
    [
      { speaker: 'Imran', text: "If I had to say it in one line, it's a good idea with a fairness problem." },
      { speaker: 'Vikram', text: "I'd have argued with that an hour ago. I can't now." },
    ],
  ],
]

/** How each person answers the trainee when nothing can be generated. */
const GD_REACT = {
  Rohit: ["Okay, but that's only half of it.", 'Fine, fine, but let me finish my point.', "See, that's what I was saying, just slower."],
  Anjali: ["That's fair. What I've seen points roughly the same way.", "Partly right, though the data's messier than that."],
  Vikram: ["Hold on, that's a big assumption.", 'Is that actually true, or does it just sound good?'],
  Sneha: ["I think that's a useful way to put it. Can we build on it?", 'That sort of bridges what those two said, actually.'],
  Imran: ["That's the bit I was about to say. And who pays for it?", "Yeah. And nobody's asked what happens after."],
}

export function FALLBACK_GD_TURN(beat, lastUserTurn, { addressed = null, traineeName = null, topic = '' } = {}) {
  const seed = (topic?.length ?? 0) + beat
  const set = GD_BEATS[Math.min(beat - 1, GD_BEATS.length - 1)]
  let turns = set[seed % set.length].map((t) => ({ ...t }))

  // Someone always answers the trainee, and it is the person they spoke to if
  // they spoke to anyone. Being ignored is not the lesson here.
  if (lastUserTurn) {
    const who = addressed ?? turns[0].speaker
    const lines = GD_REACT[who] ?? GD_REACT.Rohit
    const call = traineeName ? `${traineeName}, ` : ''
    const line = lines[seed % lines.length]
    // "Asha, Hold on" reads wrong: after a name the line carries on in lower case,
    // unless it starts with "I" or with someone's name.
    const carried = call && !/^(I\b|I'|Rohit|Anjali|Vikram|Sneha|Imran)/.test(line) ? line[0].toLowerCase() + line.slice(1) : line
    turns = [
      { speaker: who, text: `${call}${carried}` },
      ...turns.filter((t) => t.speaker !== who),
    ].slice(0, 3)
  }

  return { turns, offlineNote: 'The panel is running from a scripted discussion rather than the AI model, so it will not react to the details of what you say.' }
}

/**
 * Deterministic GD scoring. Timing and build-on behaviour are visible from the
 * transcript positions alone, which is most of what a GD is judged on, so this
 * is a better proxy than the written-answer rubric.
 */
export function heuristicGd({ transcript, contributions }) {
  const n = contributions.length
  const total = transcript.length || 1

  if (n === 0) {
    return {
      scores: { communication: 10, confidence: 5, leadership: 5, teamwork: 15, listening: 20 },
      score: 1,
      verdict: 'You did not speak. In a real group discussion that is an automatic cut.',
      strengths: 'You listened to the whole discussion.',
      gaps: 'Nothing was contributed, so there is nothing to assess.',
      nextFocus: 'enter the discussion within the first two minutes, even briefly',
      offlineNote: 'Scored by a local rubric while the model was unavailable.',
    }
  }

  const words = contributions.reduce((s, c) => s + c.text.trim().split(/\s+/).length, 0) / n
  const firstEntry = contributions[0].after / total
  const referenced = contributions.filter((c) => /\b(agree|point|said|building on|as \w+ mentioned|disagree)\b/i.test(c.text)).length

  const timing = firstEntry < 0.35 ? 85 : firstEntry < 0.6 ? 60 : 35
  const substance = words >= 35 ? 80 : words >= 18 ? 62 : 40
  const buildsOn = Math.min(90, 35 + (referenced / n) * 60)
  const share = n >= 2 && n <= 4 ? 80 : n === 1 ? 50 : 55

  const scores = {
    communication: Math.round(substance),
    confidence: Math.round((timing + share) / 2),
    leadership: Math.round((buildsOn + timing) / 2 - 8),
    teamwork: Math.round(buildsOn),
    listening: Math.round(buildsOn * 0.9 + 8),
  }
  const mean = Object.values(scores).reduce((a, b) => a + b, 0) / 5

  return {
    scores,
    score: Math.max(1, Math.min(7, Math.round(mean / 10))),
    verdict: 'Scored locally while the model was unavailable — treat this as rough.',
    strengths: `You spoke ${n} ${n === 1 ? 'time' : 'times'}, averaging ${Math.round(words)} words${
      firstEntry < 0.35 ? ', and you entered early rather than waiting to be invited' : ''
    }.`,
    gaps:
      referenced === 0
        ? 'None of your contributions referred to what anyone else had said, which reads as a prepared speech rather than a discussion.'
        : 'Without the model this can only judge timing and structure, not the quality of your argument.',
    nextFocus:
      referenced === 0 ? 'name the person you are building on before making your own point' : 'run this again for a real read',
    offlineNote: 'Scored by a local rubric while the model was unavailable. Retry later for a proper debrief.',
  }
}

/* --------------------------------------------------- offline offer path --- */

/** The review, assembled from the numbers when no model can write it. */
export function heuristicReview(review) {
  const entries = Object.entries(review.scores).sort((a, b) => b[1] - a[1])
  const best = entries[0]
  const worst = entries.at(-1)

  const band =
    review.meanAttribute >= 70
      ? 'one of the stronger interns on the team'
      : review.meanAttribute >= 55
        ? 'a solid contributor'
        : 'someone still finding their feet'

  return {
    summary: `Converted after ${review.levels} levels, averaging ${review.averageLevelScore}/10.`,
    feedback: `Over the internship you have been ${band}. Your strongest area is ${best[0].toLowerCase()} at ${best[1]}/100, and ${worst[0].toLowerCase()} at ${worst[1]}/100 is where the next year of work is.${
      review.advocates.length ? ` ${review.advocates[0]} would speak up for you, which counts for more than any single score here.` : ''
    }`,
  }
}

/**
 * Negotiation without a model.
 *
 * Judged on the things that are visible in the text: whether a number was
 * named, whether any evidence was offered, whether it was asked for or demanded.
 * Crude, but it separates the four outcomes in the right direction.
 */
export function heuristicNegotiation({ message, review }) {
  const text = String(message || '').trim()
  const words = text.split(/\s+/).filter(Boolean).length

  const named = /\d+(\.\d+)?\s*(lpa|lakh|l\b|%)/i.test(text)
  const evidence = /\b(during|delivered|reduced|built|led|shipped|owned|my (work|review|internship))\b/i.test(text)
  const rude = /\b(deserve|entitled|unfair|insulting|other companies are offering|i will leave|take it or leave)\b/i.test(text)
  const compares = /\b(than (my|other) (peers|colleagues|teammates))\b/i.test(text)
  const hedged = /\b(sorry|just wondering|if possible|maybe|hope this is ok|not sure if)\b/i.test(text)

  const scores = {
    confidence: hedged ? 35 : named ? 75 : 55,
    communication: words >= 40 ? 72 : words >= 18 ? 58 : 38,
    professionalism: rude || compares ? 25 : 72,
    reasoning: evidence ? 76 : 40,
    strategy: named && evidence ? 74 : named || evidence ? 55 : 35,
  }

  let result = 'none'
  if (rude || compares) result = 'backfire'
  else if (named && evidence && review.meanAttribute >= 60) result = 'success'
  else if (evidence || named) result = 'partial'

  const reaction =
    result === 'success'
      ? 'That is a fair case, and you have made it with something I can take upstairs. I can move the fixed component. Let me get the revised letter out today.'
      : result === 'partial'
        ? 'I hear you, and I would like to do something here. The band on the fixed component is set, but there are other parts of the package I can move. Let me see what I can do.'
        : result === 'backfire'
          ? 'I am going to be straight with you. That is not how this conversation usually goes, and comparing yourself to colleagues is not something I can act on. The offer stands as it is.'
          : 'I appreciate you raising it. Without something specific to point at, though, I do not have a case to take to anyone. The offer stands.'

  const coaching =
    result === 'backfire'
      ? 'Ask for a number and give a reason from your own work — never a comparison to a colleague or a threat.'
      : !named
        ? 'Name the figure you want. An open-ended ask gives the other person nothing to say yes to.'
        : !evidence
          ? 'Point at something you actually did during the internship. Wanting more is not a reason.'
          : 'Solid. Next time, also name what you would accept instead if the base cannot move.'

  return {
    scores,
    result,
    strength: result === 'success' ? 0.6 : 0.3,
    reaction,
    coaching,
    offlineNote: 'The model was unavailable, so this was judged by a local rubric.',
  }
}

/* -------------------------------------------------- offline workplace ----- */

const BEAT_TEMPLATES = {
  message: (who, sys, pressure) => ({
    headline: 'A message you have to answer',
    situation: `${who} has left a message asking where things stand on ${sys}. It has been sitting unanswered since yesterday, and ${pressure}.`,
    prompt: 'Write the reply you would send.',
  }),
  task: (who, sys, pressure) => ({
    headline: 'The work is not going to plan',
    situation: `Halfway through ${sys} you find something that means the approach everyone agreed on will not work. ${who} is expecting it done. ${pressure.charAt(0).toUpperCase()}${pressure.slice(1)}.`,
    prompt: 'Write what you do and who you tell.',
  }),
  decision: (who, sys, pressure) => ({
    headline: 'A call that cannot wait',
    situation: `${who} needs an answer on ${sys} before the end of the day, and ${pressure}.`,
    prompt: 'What do you do?',
    options: [
      { text: 'Give them a straight answer now, and say what you are not sure about.', score: 9, why: 'They can plan around a known unknown; they cannot plan around silence.' },
      { text: 'Ask for an hour, check properly, then come back with a firm answer.', score: 6, why: 'Careful, but the hour costs them a decision they needed now.' },
      { text: 'Give a vague answer and hope it does not come back.', score: 3, why: 'It comes back, and it comes back with your name on it.' },
      { text: 'Say yes to get them off your back and work it out later.', score: 1, why: 'You have just committed someone else to a plan you know may not hold.' },
    ],
  }),
  dialogue: (who, sys, pressure) => ({
    headline: 'A conversation you cannot dodge',
    situation: `${who} has caught you about ${sys}. They are not angry, but they want a straight answer, and ${pressure}.`,
    prompt: 'Reply as you would out loud.',
    opening: `Have you got a minute? I want to talk about ${sys} — I do not think we are on the same page.`,
  }),
}

export function FALLBACK_BEAT({ kind, character, pressure, n = 0 }) {
  const who = character ? `${character.name}, ${character.role}` : 'a colleague'
  const sys = pickFrom(SYSTEMS, n)
  const built = (BEAT_TEMPLATES[kind] ?? BEAT_TEMPLATES.message)(who, sys, pressure)
  return {
    ...built,
    offlineNote: 'The AI model was unavailable, so this beat came from the offline bank.',
  }
}

/**
 * A conversational reply without a model.
 *
 * Three canned turns per relationship temperature. Crude, but it keeps the
 * shape of a conversation — the other person says something, it depends on how
 * warm they are, and it ends.
 */
const DIALOGUE_REPLIES = {
  cold: [
    'That is not really an answer. Can you tell me what actually happened?',
    'Alright. I would rather have heard it earlier than now.',
    'Fine. Let us leave it there and see how it goes.',
  ],
  neutral: [
    'Okay — so what do you want to do about it?',
    'That makes sense. What do you need from me?',
    'Good. Let us go with that and I will follow up on Friday.',
  ],
  warm: [
    'That is fair. I had not thought about it from that angle.',
    'I appreciate you being straight with me about it.',
    'Right, let us do it your way. Tell me if it slips.',
  ],
}

export function FALLBACK_DIALOGUE_TURN({ character, turnIndex }) {
  const temp =
    character.relationship >= 65 ? 'warm' : character.relationship <= 40 ? 'cold' : 'neutral'
  const bank = DIALOGUE_REPLIES[temp]
  return {
    text: bank[Math.min(turnIndex, bank.length - 1)],
    mood: 'same',
    offlineNote: 'The model was unavailable, so this reply came from a scripted bank.',
  }
}

/** Grading a conversation locally: length, responsiveness, ownership. */
export function heuristicDialogue({ turns, character }) {
  const mine = turns.filter((t) => t.who === 'you')
  const text = mine.map((t) => t.text).join(' ')
  const words = text.trim().split(/\s+/).filter(Boolean).length

  const responsive = /\b(you said|your point|you mentioned|i hear|agree|understand)\b/i.test(text)
  const owns = /\bI (will|would|can|should|am going to|take)\b/i.test(text)
  const concrete = /\b\d+\b|\b(by|before|within)\s+\w+day\b/i.test(text)

  let score = 2
  if (mine.length >= 2) score = 4
  if (words >= 45) score += 1
  if (responsive) score += 1
  if (owns) score += 1
  if (concrete) score += 1
  score = Math.max(1, Math.min(7, score))

  return {
    score,
    strengths: mine.length
      ? `You stayed in the conversation and replied ${mine.length} ${mine.length === 1 ? 'time' : 'times'}${
          concrete ? ', with something concrete in it' : ''
        }.`
      : 'You listened.',
    gaps: !responsive
      ? `You did not refer to anything ${character.name} actually said, which reads as talking past them.`
      : !owns
        ? 'You did not commit to doing anything, so the conversation ends where it started.'
        : 'Without the model this can only judge the shape of the exchange, not its content.',
    suggestion: 'Name what you will do, by when, and check it is what they actually needed.',
    relationship: score >= 6 ? 2 : score <= 3 ? -2 : 0,
    consequence:
      score >= 6
        ? `${character.name} is more likely to come to you directly next time.`
        : `${character.name} may go around you next time rather than through you.`,
    offlineNote: 'Scored by a local rubric while the model was unavailable.',
  }
}
