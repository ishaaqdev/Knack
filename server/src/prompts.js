import { shapeBlock } from './variation.js'

/**
 * Prompt templates live here so they can be tuned without touching route logic.
 *
 * Gemma has no native system role, so everything is folded into one user turn —
 * that survives provider routing more reliably than a system/user split.
 */

const DIFFICULTY_BRIEF = {
  easy: `EASY — one clear problem, one other person involved, low stakes. A
competent fresher should be able to handle it in a short paragraph.`,
  medium: `MEDIUM — two things in tension (e.g. a deadline vs. quality, or two
people who both have a point). Some ambiguity, real but recoverable stakes.`,
  hard: `HARD — competing priorities, incomplete information, and someone senior
or a client involved. There is no clean answer; any choice costs something.`,
}

const TRACK_BRIEF = {
  'workplace-communication': {
    focus: 'professional communication under mild social pressure',
    situations: `giving or receiving code-review criticism, telling a lead an
estimate has slipped, disagreeing with a senior in a design discussion, chasing a
teammate who is blocking you, explaining a technical failure to a non-technical
stakeholder, declining extra scope politely`,
    judge: `clarity and structure; owning the problem without over-apologising;
concrete next steps and timelines; tone that is direct but not blunt; whether
they addressed the actual person's concern rather than talking past it`,
  },
  'critical-thinking': {
    focus: 'structured reasoning under ambiguity',
    situations: `a bug report that contradicts the metrics, a feature request
whose stated reason does not match the real need, two data sources that disagree,
a "quick fix" that would create long-term debt, choosing between two designs with
incomplete benchmarks`,
    judge: `whether they separated evidence from assumption; whether they
identified the real underlying problem instead of the stated one; whether they
named what they would verify next and how; awareness of their own bias or the
cost of being wrong`,
  },
  'ai-fluency': {
    focus: 'effective and sceptical use of AI tools',
    situations: `an AI assistant produces confident code that references a
library function that does not exist, a generated summary states a plausible but
unverified statistic, a teammate ships AI-written code they cannot explain,
deciding what to hand to an AI and what to do yourself, an AI cites a paper that
may be fabricated`,
    judge: `whether they verified rather than trusted; whether they named a
specific check (run it, read the docs, find the primary source); whether they
understood the tool's actual failure mode; whether they kept accountability with
the human rather than the tool`,
  },
}

/**
 * Personalisation blocks.
 *
 * The failure mode with a small model is recitation — hand it a profile and
 * every scenario opens "As a final-year CSE student aiming for a software role,
 * you...". The fix is to state explicitly that the profile selects the *setting*
 * and is never surfaced in the text, and to repeat that at the rules.
 */
function contextBlock({ profile, learner, portfolio, resume, attributes, world }) {
  if (!profile && !learner && !portfolio && !resume && !attributes && !world) return ''

  const parts = ['\nWHO THIS IS FOR (background only — see the rules)']

  if (profile) {
    parts.push(`- Trainee: ${profile.who}`)
    parts.push(`- Set the scenario inside: ${profile.setting}`)
    if (profile.focus.length) {
      parts.push(`- They say they struggle most with: ${profile.focus.join('; ')}`)
    }
  }

  // Resume skills and GitHub stack answer the same question, so they are
  // merged and de-duplicated rather than listed twice.
  const known = [...new Set([...(resume?.skills ?? []), ...(portfolio?.stack ?? [])])].slice(0, 10)
  if (known.length) {
    parts.push(`- Technologies they actually know: ${known.join(', ')}`)
  }
  if (portfolio?.domains?.length) {
    parts.push(`- Kinds of work they have done: ${portfolio.domains.join(', ')}`)
  }

  // The ten attributes decide what the scenario should make them do, not what
  // it should say. A low Leadership score means put them in a position where
  // someone has to decide; it never means mention leadership.
  if (attributes?.weakest?.length) {
    parts.push(`- Weakest professional attributes right now: ${attributes.weakest.join(', ')}`)
    parts.push('- Build the situation so it forces the first of those to be used.')
  }

  /*
   * The state of the room they are walking into.
   *
   * A colleague they handled badly should make the next situation harder in a
   * way they can feel, not be announced to them. So this says who is cold and
   * who owes them, and the rules below turn that into the shape of the problem.
   */
  if (world?.cold?.length) {
    parts.push(`- Currently unlikely to go out of their way for the trainee: ${world.cold.join(', ')}`)
  }
  if (world?.warm?.length) {
    parts.push(`- Would help the trainee if asked: ${world.warm.join(', ')}`)
  }
  if (world?.pending?.length) {
    parts.push(
      `- Unfinished business: ${world.pending.map((p) => `${p.character} — ${p.effect}`).join('; ')}`
    )
  }

  if (learner?.summary) {
    parts.push(`- What their last few attempts showed: ${learner.summary}`)
    if (learner.gaps?.length) {
      parts.push(`- Weaknesses that keep recurring: ${learner.gaps.join('; ')}`)
    }
    if (learner.pushNext) parts.push(`- Push them on: ${learner.pushNext}`)
  }

  return parts.join('\n') + '\n'
}

export function scenarioPrompt({ track, difficulty, avoid = [], profile, learner, portfolio, resume, attributes, world, shape }) {
  const t = TRACK_BRIEF[track.id]
  const avoidBlock = avoid.length
    ? `\nDo NOT reuse these situations — the trainee has already seen them:\n${avoid
        .map((a, i) => `${i + 1}. ${a}`)
        .join('\n')}\n`
    : ''

  const personalised = contextBlock({ profile, learner, portfolio, resume, attributes, world })
  const shaped = shape ? `
${shapeBlock(shape)}
` : ''

  return `You write short training scenarios for a soft-skills app used by
engineering students in India who are about to start their first job.

TRACK: ${track.name} — ${t.focus}
DIFFICULTY: ${DIFFICULTY_BRIEF[difficulty]}
${personalised}
Write ONE realistic workplace scenario drawn from this space: ${t.situations}.
${shaped}${avoidBlock}
RULES
- 2 to 4 sentences. Under 70 words. No preamble, no title.
- Second person ("You are...", "Your team lead...").
- Concrete: give the people names and roles, and one specific detail (a number, a
  deadline, a feature name). Generic scenarios are useless.
- End on the moment of decision — the trainee must know what they have to say or
  do next. Do NOT ask a question at the end and do NOT give advice.
- Plain professional English. No jargon, no emoji, no markdown.

CRITICAL — how to use the background above:
It decides the SETTING, who else is in the room, how senior they are, and what is
at stake. It is NOT part of the scenario. Never state or hint at the trainee's
year of study, branch, career goal, confidence, or past performance. Do not open
with "As a final-year student" or anything like it. Write the situation as it
would actually be experienced, from inside it.

If someone is listed as unlikely to help, you may build the situation so that
their help is exactly what the trainee now needs — but write it as an ordinary
workplace friction, never as a punishment and never by referring to whatever
happened before. The trainee should recognise it without being told.

The five shape requirements above are not suggestions. Use that person, that
place, that moment and that pressure. Do NOT default to a team lead asking for a
shortcut before a deadline — that shape is overused and will be rejected.

If technologies they know are listed, you may use ONE of them to make the
scenario concrete — a real stack beats "the system". Vary which one you pick and
invent a fresh product or feature each time; do not keep returning to the same
project, domain or deadline. Do not name their repositories or describe their
personal projects back to them. Do not force technology in where the situation
does not call for it — this track is about the human problem, and the tech is
only texture.

Reply with ONLY this JSON object and nothing else:
{"scenario":"<the scenario text>","prompt":"<a 6-10 word instruction telling the trainee what to write, e.g. 'Write the message you would send to Priya.'>"}`
}

export function evaluationPrompt({ track, difficulty, scenarioText, userResponse, learner }) {
  const t = TRACK_BRIEF[track.id]

  const history = learner?.summary
    ? `\nWHAT YOU KNOW ABOUT THIS TRAINEE ALREADY
${learner.summary}${learner.gaps?.length ? `\nRecurring weaknesses: ${learner.gaps.join('; ')}` : ''}

If they repeated a mistake you have flagged before, say so plainly — "this is the
same gap as last time" is more useful than pretending it is new. If they fixed
one, name it and give them credit. Do not invent history that is not listed here.
`
    : ''

  return `You are a fair, experienced engineering mentor grading a trainee's
response to a workplace scenario. Be encouraging but honest — inflated scores
make the training worthless.

TRACK: ${track.name} — ${t.focus}
DIFFICULTY: ${difficulty}
${history}
SCENARIO
"""
${scenarioText}
"""

TRAINEE'S RESPONSE
"""
${userResponse}
"""

Judge specifically on: ${t.judge}.

SCORING (1-10, be calibrated)
1-2  = did not engage, off-topic, or a single throwaway line
3-4  = understood the situation but the response is vague or avoids the hard part
5-6  = reasonable and safe; handles the basics, misses nuance or specifics
7-8  = clear, specific, and handles the tension well; minor gaps
9-10 = exceptional — precise, and does something a thoughtful senior would do
A very short or empty response cannot score above 3, no matter how polite.

RULES
- Address the trainee as "you". Quote or paraphrase something they actually wrote.
- Never invent things they did not say.
- strengths / gaps: 1-2 sentences each. suggestion: one concrete rewrite or move
  they could make next time, not generic advice like "be more clear".
- Plain text only. No markdown, no emoji.

Reply with ONLY this JSON object and nothing else:
{"score":<integer 1-10>,"strengths":"<what worked>","gaps":"<what was missing>","suggestion":"<one specific improvement>"}`
}

/**
 * Distils a GitHub profile into a short brief. Run once at connect time — the
 * raw READMEs are never injected into a scenario prompt.
 */
export function portfolioPrompt({ raw, username }) {
  return `You are summarising an engineering student's public GitHub so a
training app can make its workplace scenarios technically concrete.

GITHUB PROFILE: ${username}
${raw}

Work out what this person actually builds. Be honest about the evidence — if the
repos are small college projects, say so; do not inflate them into industry work.
If there is genuinely too little to tell, say that in the brief.

RULES
- brief: under 45 words, third person. What they build and at what level. Concrete
  ("builds small full-stack web apps, mostly React front-ends with Node APIs"),
  not flattering ("passionate developer").
- stack: up to 6 technologies they have actually used, most prominent first.
  Real names only (React, Firebase, Flask, OpenCV). No vague entries like "web".
- domains: up to 3 problem areas they work in (e.g. "web apps", "computer
  vision", "embedded"). Empty array if unclear.
- level: exactly one of "beginner", "intermediate", "advanced" — judged on
  project complexity and breadth, not repo count.
- Plain text. No markdown, no emoji.

Reply with ONLY this JSON object and nothing else:
{"brief":"<under 45 words>","stack":["<tech>"],"domains":["<area>"],"level":"<beginner|intermediate|advanced>"}`
}

/**
 * Rewrites the rolling learner summary. Kept deliberately short — this text is
 * injected into every later prompt, so length here is a recurring cost.
 */
export function learnerSummaryPrompt({ attempts, previous }) {
  const history = attempts
    .map(
      (a, i) =>
        `${i + 1}. [${a.trackName}, ${a.difficulty}, scored ${a.score}/10]
   Situation: ${a.scenarioText.slice(0, 160)}
   They wrote: ${a.userResponse.slice(0, 300)}
   Gaps noted: ${a.gaps || 'none recorded'}`
    )
    .join('\n\n')

  const prior = previous?.summary
    ? `\nYOUR PREVIOUS SUMMARY OF THEM (update it — do not just repeat it):\n${previous.summary}\n`
    : ''

  return `You are tracking one trainee's progress in a soft-skills training app so
that future scenarios can be aimed at their actual weaknesses.

THEIR MOST RECENT ATTEMPTS (newest first)
${history}
${prior}
Write an updated picture of this trainee. Be specific and behavioural — "gives
timelines but never explains the cause of a delay" is useful; "needs improvement"
is not. Base it only on the attempts above.

RULES
- summary: under 60 words, third person, present tense. What they reliably do
  well and what they reliably miss.
- recurringGaps: 1-3 short phrases, each under 8 words. Only patterns that show
  up more than once. Empty array if nothing recurs yet.
- pushNext: one clause naming the specific thing the next scenario should force
  them to confront.
- Plain text. No markdown, no emoji.

Reply with ONLY this JSON object and nothing else:
{"summary":"<under 60 words>","recurringGaps":["<phrase>"],"pushNext":"<one clause>"}`
}

/* ------------------------------------------------------------- resume ----- */

/**
 * Distils an uploaded resume once, at upload time. The raw document is kept for
 * the interviewer; everything else downstream reads only these fields.
 */
export function resumeDistilPrompt({ text, name }) {
  return `You are reading an engineering student's resume so a training app can
make its practice scenarios and mock interviews specific to them.

RESUME TEXT (extracted from the uploaded file, so the layout is lost)
"""
${text}
"""

Work out what this person has actually done. Be accurate and unflattering — a
college project is a college project. If a section is missing from the text, omit
it rather than inventing it.

RULES
- brief: under 45 words, third person, using "they" — never guess a gender from
  the name. What they have built and studied, at what level. Concrete, not
  promotional.
- skills: up to 10 technologies, tools or languages they genuinely list. Real
  names only (React, Python, TensorFlow, Figma). No soft skills, no "web".
- projects: up to 4 items. Each is {"name": "<as written on the resume>", "what":
  "<under 15 words on what it does>"}. Only projects actually described.
- highlights: up to 3 short factual claims worth being asked about in an
  interview — a metric, an award, an internship, a responsibility. Under 15 words
  each. Empty array if the resume has none.
- Plain text. No markdown, no emoji.${name ? `\n- The candidate's name is ${name}; never put it in the brief.` : ''}

Reply with ONLY this JSON object and nothing else:
{"brief":"<under 45 words>","skills":["<tech>"],"projects":[{"name":"<name>","what":"<what it does>"}],"highlights":["<claim>"]}`
}

/* ---------------------------------------------------------- MCQ level ----- */

/**
 * The four multiple-choice stages of a level.
 *
 * The scoring gradient is dictated rather than left to the model. Asked freely,
 * a small model writes one obviously correct option and three strawmen, which
 * teaches nothing — the interesting workplace choices are the ones that are all
 * defensible and differ by degree.
 */
export function levelPrompt({ track, difficulty, profile, learner, portfolio, resume, attributes, world, shape, avoid = [] }) {
  const t = TRACK_BRIEF[track.id]
  const personalised = contextBlock({ profile, learner, portfolio, resume, attributes, world })
  const shaped = shape ? `\n${shapeBlock(shape)}\n` : ''
  const avoidBlock = avoid.length
    ? `\nThe trainee has recently seen these situations. Do not reuse them:\n${avoid
        .map((a, i) => `${i + 1}. ${a}`)
        .join('\n')}\n`
    : ''

  return `You write multiple-choice workplace judgement questions for a
soft-skills app used by engineering students in India starting their first job.

TRACK: ${track.name} — ${t.focus}
DIFFICULTY: ${DIFFICULTY_BRIEF[difficulty]}
${personalised}
Draw the situations from this space: ${t.situations}.
${shaped}${avoidBlock}
Write ONE short setting, then FOUR separate moments inside it. Each moment is a
question with four possible responses.

SETTING
- 2 sentences. Establishes the company, the team and what is going on this week.
- Name the people. Reuse the same names in all four questions.

EACH QUESTION
- situation: 1-2 sentences. A specific moment. Under 45 words.
- question: one line asking what the trainee does or says next.
- options: exactly four. Each is something a real person might actually do,
  written in first person ("Tell Priya I will...", "Ship it and flag it after").
  Under 25 words each. No option may be a joke or obviously self-destructive.

SCORING — this is mandatory and the whole point
Give the four options these four scores, in a DIFFERENT random order each time:
  one option scores 9   — what a thoughtful senior would actually do
  one option scores 6   — reasonable, safe, but misses the harder half
  one option scores 3   — avoids the real problem or defers it
  one option scores 1   — actively damages trust, quality or the relationship
Never put the 9 first every time. Vary which position holds the best answer.
- why: under 18 words, second person, explaining the consequence of that choice.
  For the 9 say what it gets right; for the 1 say what it costs.

RULES
- Plain professional English. No markdown, no emoji, no letters or numbering
  inside the option text.
- Never mention the trainee's year of study, branch, career goal or past scores.
- The four questions must test four different things, not the same one restated.

Reply with ONLY this JSON object and nothing else:
{"setting":"<2 sentences>","questions":[{"situation":"<1-2 sentences>","question":"<one line>","options":[{"text":"<what you do>","score":9,"why":"<consequence>"}]}]}`
}

/**
 * The end-of-level grader. Handles the written stage and, in the same call, any
 * free-text answers the trainee typed instead of picking an option — batching
 * them keeps a level at two model calls regardless of how many they wrote.
 */
export function levelEvaluationPrompt({ track, difficulty, scenarioText, userResponse, customs = [], learner }) {
  const t = TRACK_BRIEF[track.id]

  const history = learner?.summary
    ? `\nWHAT YOU KNOW ABOUT THIS TRAINEE ALREADY
${learner.summary}${learner.gaps?.length ? `\nRecurring weaknesses: ${learner.gaps.join('; ')}` : ''}
If they repeated a flagged mistake, say so plainly. Do not invent history.
`
    : ''

  const customBlock = customs.length
    ? `\nThey also wrote their own answer instead of picking an option on ${
        customs.length === 1 ? 'one question' : `${customs.length} questions`
      }. Score each on the same 1-10 scale.
${customs
  .map(
    (c, i) => `[${i}] Situation: ${c.situation}
    Question: ${c.question}
    They wrote: ${c.answer}`
  )
  .join('\n')}
`
    : ''

  return `You are a fair, experienced engineering mentor grading the written
stage of a training level. Be encouraging but honest — inflated scores make the
training worthless.

TRACK: ${track.name} — ${t.focus}
DIFFICULTY: ${difficulty}
${history}
SCENARIO
"""
${scenarioText}
"""

TRAINEE'S WRITTEN RESPONSE
"""
${userResponse}
"""
${customBlock}
Judge specifically on: ${t.judge}.

SCORING (1-10, be calibrated)
1-2  = did not engage, off-topic, or a single throwaway line
3-4  = understood the situation but is vague or avoids the hard part
5-6  = reasonable and safe; handles the basics, misses nuance
7-8  = clear, specific, handles the tension well; minor gaps
9-10 = exceptional — precise, and does what a thoughtful senior would do
A very short or empty response cannot score above 3, no matter how polite.

RULES
- Address the trainee as "you". Quote or paraphrase something they actually wrote.
- Never invent things they did not say.
- strengths / gaps: 1-2 sentences each. suggestion: one concrete rewrite or move
  for next time, not generic advice.
- custom[].i is the ZERO-BASED number in brackets above, exactly as written.
- custom[].why: under 20 words, second person.
- Plain text only. No markdown, no emoji.

Reply with ONLY this JSON object and nothing else:
{"score":<1-10>,"strengths":"<what worked>","gaps":"<what was missing>","suggestion":"<one specific improvement>","custom":[{"i":<index>,"score":<1-10>,"why":"<short reason>"}]}`
}

/* ---------------------------------------------------------- interview ----- */

/** Renders the candidate dossier the interviewer is allowed to have read. */
function dossier({ profile, resume, portfolio }) {
  const parts = []
  if (profile) parts.push(`Background: ${profile.who}`)
  if (resume?.brief) parts.push(`Resume summary: ${resume.brief}`)
  if (resume?.skills?.length) parts.push(`Skills claimed: ${resume.skills.join(', ')}`)
  if (resume?.projects?.length) {
    parts.push(
      `Projects on the resume:\n${resume.projects
        .map((p) => `  - ${p.name}: ${p.what}`)
        .join('\n')}`
    )
  }
  if (resume?.highlights?.length) {
    parts.push(`Claims worth probing: ${resume.highlights.join('; ')}`)
  }
  if (portfolio?.stack?.length) parts.push(`GitHub stack: ${portfolio.stack.join(', ')}`)
  if (portfolio?.domains?.length) parts.push(`GitHub domains: ${portfolio.domains.join(', ')}`)
  return parts.length ? parts.join('\n') : 'No resume on file — ask general questions for the role.'
}

export function interviewPrompt({ round, role, company, profile, resume, portfolio, asked = [], n = 3 }) {
  const avoidBlock = asked.length
    ? `\nYou have already asked this candidate the following. Ask something new:\n${asked
        .map((q, i) => `${i + 1}. ${q}`)
        .join('\n')}\n`
    : ''

  return `You are conducting a mock job interview for an entry-level ${role} role
at ${company}. You are the interviewer, and you have read the candidate's file.

CANDIDATE FILE
${dossier({ profile, resume, portfolio })}

ROUND ${round.level} of 5 — ${round.name.toUpperCase()}
${round.brief}

YOUR TASK
${round.ask}
${avoidBlock}
Write exactly ${n} questions, in the order you would ask them.

RULES
- Each question is 1-2 sentences, spoken aloud as an interviewer would say it.
  Under 40 words.
- Ground them in the candidate file. If a project or skill is listed, name it —
  a generic question wastes the round. If the file is thin, ask about the role
  instead of inventing experience the candidate never claimed.
- Never invent achievements, companies or numbers the file does not contain.
- One question per idea. No compound questions with three parts.
- hint: under 12 words, telling the candidate what a good answer needs to contain
  (e.g. "Name the trade-off you chose and why"). Not the answer itself.
- Plain spoken English. No markdown, no emoji, no numbering in the text.

Reply with ONLY this JSON object and nothing else:
{"opener":"<one line the interviewer says to start the round, under 25 words>","questions":[{"text":"<the question>","hint":"<what a good answer needs>"}]}`
}

/**
 * The debrief. One call grades every answer in the round, which keeps an
 * interview at two model calls and lets the grader see the answers as a set —
 * the same story told twice is only visible from there.
 */
export function interviewDebriefPrompt({ round, role, profile, resume, portfolio, pairs }) {
  const transcript = pairs
    .map(
      (p, i) => `Q${i + 1}: ${p.question}
A${i + 1}: ${p.answer || '(no answer given)'}`
    )
    .join('\n\n')

  return `You are an experienced interviewer debriefing a candidate after a mock
interview for an entry-level ${role} role. Be honest and useful — a candidate who
is told they were great and then fails a real interview has been let down.

CANDIDATE FILE
${dossier({ profile, resume, portfolio })}

ROUND ${round.level} of 5 — ${round.name.toUpperCase()}
This round tests: ${round.focus}.

TRANSCRIPT
${transcript}

Grade each answer, then the round as a whole.

SCORING (1-10 per answer, be calibrated)
1-2  = did not answer, or one throwaway line
3-4  = on topic but generic; could be any candidate; no evidence
5-6  = a real answer with some substance; structure or specifics missing
7-8  = specific, structured, evidenced; would pass a real screen
9-10 = exceptional — precise, self-aware, and makes the interviewer want more
An answer with no concrete example cannot score above 5.
An empty or one-word answer scores 1.

FOR EACH ANSWER
- worked: one sentence on what was genuinely good. If nothing was, say so plainly.
- improve: one sentence on the single biggest thing missing.
- better: one sentence showing a stronger way to frame the SAME answer using what
  they actually said. Never write a whole model answer for them, and never
  attribute experience to them that they did not mention.

FOR THE ROUND
- score: 1-10 overall. It should sit near the mean of the answers, but a serious
  failure (bluffing, defensiveness, no examples anywhere) pulls it down.
- verdict: one sentence, the honest bottom line.
- strengths / gaps: 1-2 sentences each, about the pattern across answers.
- nextFocus: one clause naming the single thing to work on before the next round.

RULES
- Address the candidate as "you". Quote or paraphrase what they actually said.
- answers[].i is the ZERO-BASED position of the question: Q1 is i=0, Q2 is i=1.
  Return one entry per question, in order.
- Plain text only. No markdown, no emoji.

Reply with ONLY this JSON object and nothing else:
{"answers":[{"i":<index>,"score":<1-10>,"worked":"<one sentence>","improve":"<one sentence>","better":"<one sentence>"}],"score":<1-10>,"verdict":"<one sentence>","strengths":"<1-2 sentences>","gaps":"<1-2 sentences>","nextFocus":"<one clause>"}`
}

/* --------------------------------------------------- group discussion ----- */

/**
 * The five candidates in the room.
 *
 * Personalities are fixed rather than generated. The point of a GD is that the
 * trainee learns to handle a dominant voice, a quiet one with a good idea, and
 * someone who challenges everything — those roles have to be reliably present,
 * not left to a sampler.
 */
export const GD_PANEL = [
  { name: 'Rohit', trait: 'Dominant', how: 'talks first, talks longest, interrupts to finish his own point' },
  { name: 'Anjali', trait: 'Knowledgeable', how: 'brings real facts and numbers, but states them flatly and does not push' },
  { name: 'Vikram', trait: 'Aggressive', how: 'challenges whatever was just said, sometimes fairly, sometimes not' },
  { name: 'Sneha', trait: 'Diplomatic', how: 'tries to reconcile two positions and bring quieter people in' },
  { name: 'Imran', trait: 'Quiet', how: 'says very little, but what he says is usually the best point so far' },
]

export const GD_TOPICS = [
  'Should companies require employees to return to the office full time?',
  'Is it fair for companies to use AI to screen resumes?',
  'Should engineers be responsible for the business impact of what they build?',
  'Do college degrees still matter for hiring in software?',
  'Should a company ever ship a product it knows is not finished?',
  'Is remote work worse for people at the start of their careers?',
  'Should social media companies be liable for what their algorithms promote?',
  'Are internships exploitative when they are unpaid?',
]

/**
 * One beat of the discussion: what the panel says next, given everything so
 * far. Asking for the whole discussion up front would make it a script the
 * trainee reads rather than a room they are in.
 */
export function gdTurnPrompt({ topic, transcript, beat, totalBeats, lastUserTurn }) {
  const panel = GD_PANEL.map((p) => `- ${p.name} (${p.trait}): ${p.how}`).join('\n')
  const said = transcript.length
    ? transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n')
    : '(nothing yet — this is the opening)'

  return `You are simulating a campus placement group discussion for a training
app. Five candidates are in the room, plus the trainee, who is a sixth
participant you must NOT speak for.

TOPIC
${topic}

THE PANEL
${panel}

THE DISCUSSION SO FAR
${said}

You are writing beat ${beat} of about ${totalBeats}.
${
  lastUserTurn
    ? `The trainee just said: "${lastUserTurn}"\nAt least one candidate should react to it directly — agreeing, building on it, or pushing back. Do not ignore it.`
    : 'The trainee has not spoken yet. Do not mention them or invite them by name.'
}

Write 2 or 3 short turns from DIFFERENT candidates, in the order they speak.

RULES
- Each turn is 1 to 2 sentences, under 40 words. Spoken, not written.
- Stay in character. Rohit dominates, Vikram challenges, Imran is brief and
  sharp, Anjali cites something concrete, Sneha reconciles.
- Advance the argument. Do not restate what has already been said.
- Never speak for the trainee and never put words in their mouth.
- Real spoken English. No markdown, no emoji, no stage directions.

Reply with ONLY this JSON object and nothing else:
{"turns":[{"speaker":"<candidate name>","text":"<what they say>"}]}`
}

/**
 * The debrief. Judged on the things a GD actually tests, which are mostly not
 * "did they talk a lot".
 */
export function gdEvaluationPrompt({ topic, transcript, contributions, profile }) {
  const said = transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n')
  const mine = contributions.length
    ? contributions.map((c, i) => `${i + 1}. (after ${c.after} other turns) "${c.text}"`).join('\n')
    : '(the trainee never spoke)'

  return `You are an experienced placement assessor debriefing a candidate after
a group discussion. Be honest — a candidate told they were great and then cut in
a real GD has been let down.

TOPIC
${topic}
${profile ? `\nTHE CANDIDATE: ${profile.who}\n` : ''}
FULL TRANSCRIPT
${said}

WHAT THE CANDIDATE SAID, AND WHEN
${mine}

Assess them on: when they entered, whether they added anything new, whether they
built on others, whether they disagreed without being rude, clarity, and whether
they helped the group reach anywhere.

SCORING, on each of these, 0-100
- communication: clarity and structure of what they actually said
- confidence: entering without being invited, holding a position under challenge
- leadership: shaping direction, summarising, bringing others in
- teamwork: building on others, crediting them, not talking over people
- listening: responding to what was actually said rather than a prepared point

Do NOT reward volume. A candidate who spoke twice at the right moment and moved
the discussion on scores higher than one who spoke six times and repeated the
room. A candidate who never spoke cannot score above 25 on anything, and their
verdict must say so plainly.

Then give an overall score out of 10 consistent with those five numbers.

RULES
- Address them as "you". Quote something they actually said, if they said anything.
- strengths / gaps: 1-2 sentences each, behavioural and specific.
- nextFocus: one clause naming the single thing to change next time.
- Plain text only. No markdown, no emoji.

Reply with ONLY this JSON object and nothing else:
{"scores":{"communication":<0-100>,"confidence":<0-100>,"leadership":<0-100>,"teamwork":<0-100>,"listening":<0-100>},"score":<1-10>,"verdict":"<one sentence>","strengths":"<1-2 sentences>","gaps":"<1-2 sentences>","nextFocus":"<one clause>"}`
}

/* ------------------------------------------------------- the offer -------- */

/**
 * The manager's write-up. Grounded in the four review scores so it cannot
 * contradict the numbers printed next to it.
 */
export function reviewPrompt({ review, title, company, months = 6 }) {
  const lines = Object.entries(review.scores)
    .map(([k, v]) => `- ${k}: ${v}/100`)
    .join('\n')

  return `You are an engineering manager writing the end-of-internship review for
an intern who is about to be offered a full-time ${title} role at ${company}.

THEIR SCORES AFTER ${months} MONTHS
${lines}
- Levels completed: ${review.levels}, averaging ${review.averageLevelScore}/10
- Standing with the team: ${review.meanRelationship}/100
${
  review.advocates.length
    ? `- Would speak up for them: ${review.advocates.join(', ')}`
    : '- NOBODY on the team would particularly speak up for them yet.'
}
${review.detractors.length ? `- Has reservations about them: ${review.detractors.join(', ')}` : ''}

Write the review the way a real manager would say it out loud.

RULES
- feedback: 2 to 3 sentences, second person, warm but honest. Name the strongest
  thing and the weakest thing specifically. Do not list all four scores back.
- summary: one sentence, the line that would go at the top of the form.
- If a score is below 45, say so plainly rather than softening it — an intern
  told they were excellent and then not promoted has been let down.
- If someone is listed above as willing to speak up for them, mention that person
  by name; it is the part of a review people remember. If the brief says nobody
  would, do NOT mention anyone. Never use a name that does not appear in this
  brief — inventing a colleague makes the whole review worthless.
- Plain text. No markdown, no emoji.

Reply with ONLY this JSON object and nothing else:
{"summary":"<one sentence>","feedback":"<2-3 sentences>"}`
}

/**
 * The salary conversation.
 *
 * There is deliberately no single correct sentence. The grader is told to judge
 * how the ask was made rather than whether it was made, because both an
 * apologetic ask and an entitled one fail, and they fail differently.
 */
export function negotiationPrompt({ offer, message, review, round, roundsLeft }) {
  return `You are the hiring manager at ${offer.company}. You have made an offer
to an intern you are converting to a full-time ${offer.title}, and they have just
replied asking to discuss it. Decide how you respond.

THE OFFER ON THE TABLE
- Fixed: ${offer.fixed} LPA
- Variable: ${offer.variable} LPA
- Total: ${offer.total} LPA${offer.joiningBonus ? `\n- Joining bonus: ${offer.joiningBonus} LPA` : ''}
- ${offer.location}, ${offer.workingModel}, ${offer.probation} probation

WHAT YOU KNOW ABOUT THEM
${Object.entries(review.scores).map(([k, v]) => `- ${k}: ${v}/100`).join('\n')}
- Average level score during the internship: ${review.averageLevelScore}/10
- Standing with the team: ${review.meanRelationship}/100

HOW MUCH ROOM YOU ACTUALLY HAVE
${
  review.meanAttribute >= 70
    ? 'They are one of the stronger interns you have had. You have real room and you would rather not lose them.'
    : review.meanAttribute >= 55
      ? 'They are solid but replaceable. You have a little room and would use it only for a well-made case.'
      : 'They are below the bar you would normally convert at. You have almost no room, and you know it.'
}

THIS IS ROUND ${round}. They have ${roundsLeft} further ${roundsLeft === 1 ? 'attempt' : 'attempts'} after this.

WHAT THEY SAID
"""
${message}
"""

Judge how they asked, not whether they asked. Score each 0-100:
- confidence: did they state a position, or apologise for having one
- communication: is the ask clear and specific, or vague and hedged
- professionalism: tone, and whether they respected the relationship
- reasoning: did they give evidence from their own work, or just want more
- strategy: did they name what they want and leave you a way to say yes

Then choose exactly one result:
- "success": a well-made, evidenced case, and you have the room. Fixed pay moves.
- "partial": a reasonable ask you cannot fully meet. You move a bonus, the
  variable, or a term instead of the base.
- "none": the ask was too vague, or you genuinely have no room. Nothing moves,
  and you say why.
- "backfire": entitled, threatening, dishonest, or comparing themselves to
  colleagues by name. Nothing moves and the conversation has cost them something.

Be strict. "I would like more money because I worked hard" is "none", not
"partial". Most real asks land on "partial" or "none".

RULES
- reaction: 2 to 3 sentences, spoken as the manager, second person. This is what
  they actually hear back, so it has to sound like a person, not a verdict.
- coaching: one sentence, addressed to the trainee, on what would have landed
  better. Honest even when they did well.
- strength: 0 to 1, how strong the case was. Only meaningful for "success".
- Plain text. No markdown, no emoji.

Reply with ONLY this JSON object and nothing else:
{"scores":{"confidence":<0-100>,"communication":<0-100>,"professionalism":<0-100>,"reasoning":<0-100>,"strategy":<0-100>},"result":"<success|partial|none|backfire>","strength":<0-1>,"reaction":"<2-3 sentences>","coaching":"<one sentence>"}`
}

/* ------------------------------------------------------- the workplace ---- */

/** The standing brief every workplace beat is written against. */
function officeBlock({ company, role, location, day, cast, world }) {
  const parts = [`SETTING: ${company ?? 'the company'} — ${location.name}. Day ${day} of the job.`]
  if (role) parts.push(`The trainee is a ${role}.`)

  if (cast?.length) {
    parts.push('\nWHO WORKS HERE')
    for (const c of cast) {
      parts.push(
        `- ${c.name}, ${c.role}. ${c.personality} You are on ${c.relationship.toLowerCase()} terms.${
          c.remembers?.length ? ` They remember: ${c.remembers.join(' ')}` : ''
        }`
      )
    }
  }

  if (world?.pending?.length) {
    parts.push(
      `\nUNFINISHED: ${world.pending.map((p) => `${p.character} — ${p.effect}`).join('; ')}`
    )
  }

  return parts.join('\n')
}

/**
 * One beat of a working day.
 *
 * The kind, the person and the pressure are all decided by the server and
 * handed over as requirements, for the same reason the scenario sampler exists:
 * a model asked to invent a varied day invents the same day.
 */
export function workplaceBeatPrompt({
  kind,
  character,
  pressure,
  location,
  company,
  role,
  day,
  cast,
  world,
  earlier = [],
}) {
  const kindBrief = {
    message: `A message has arrived — Slack, email, or a ticket comment. Short, and it
needs an answer. The trainee writes the reply.`,
    task: `The trainee is in the middle of the work itself and something about it
has gone wrong or become unclear. They have to decide what to do and say so.`,
    decision: `A moment that needs a call, now. Offer four things a real person
might actually do.`,
    dialogue: `A conversation that is happening in real time. Write only the
other person's opening line — the trainee replies, and you will continue after.`,
  }[kind]

  const chain = earlier.length
    ? `\nWHAT HAS ALREADY HAPPENED TODAY
${earlier.map((e, i) => `${i + 1}. ${e.headline} — the trainee ${e.summary}`).join('\n')}

This beat must follow from that. If they made a promise, this is where it comes
due. If they pushed something to later, later is now.\n`
    : ''

  const mcq =
    kind === 'decision'
      ? `\nFOR THE OPTIONS
Give exactly four, each something a real person might do, each under 25 words,
first person. Score them 9, 6, 3 and 1 — the strongest, a safe one that misses
the harder half, one that defers the problem, and one that damages something.
Put them in a DIFFERENT random order each time. why: under 18 words, second
person, naming the consequence.\n`
      : ''

  return `You are writing one beat of a working day in a workplace simulation for
engineering students starting their first job.

${officeBlock({ company, role, location, day, cast, world })}
${chain}
THIS BEAT
- Kind: ${kind}. ${kindBrief}
- The person involved: ${character ? `${character.name}, ${character.role}` : 'no one in particular'}
- The pressure on it: ${pressure}
${mcq}
RULES
- headline: under 8 words, what this beat is, for a timeline. No punctuation at the end.
- situation: 2 to 3 sentences, under 60 words, second person, present tense. End on
  the moment where the trainee has to act.
- prompt: 6 to 10 words telling them what to write or decide.
- Use the named person. Do not invent new colleagues.
- Never mention the trainee's year of study, course, scores or attributes.
- Plain professional English. No markdown, no emoji.

Reply with ONLY this JSON object and nothing else:
${
  kind === 'decision'
    ? `{"headline":"<under 8 words>","situation":"<2-3 sentences>","prompt":"<what to decide>","options":[{"text":"<what you do>","score":9,"why":"<consequence>"}]}`
    : `{"headline":"<under 8 words>","situation":"<2-3 sentences>","prompt":"<what to write>"${
        kind === 'dialogue' ? ',"opening":"<the first thing they say to you>"' : ''
      }}`
}`
}

/**
 * The next line in a live conversation.
 *
 * The character has to actually respond to what was said — that is the whole
 * difference between a dialogue and two monologues — and they have to stay the
 * person the directory says they are, including being harder work when the
 * relationship is poor.
 */
export function dialogueTurnPrompt({ character, situation, turns, remaining, company }) {
  const script = turns
    .map((t) => `${t.who === 'you' ? 'TRAINEE' : character.name}: ${t.text}`)
    .join('\n')

  return `You are ${character.name}, ${character.role} at ${company ?? 'the company'}.
${character.personality}

Your relationship with the trainee is currently ${character.relationship.toLowerCase()}.
${
  character.remembers?.length
    ? `You remember: ${character.remembers.join(' ')}`
    : 'You have no strong history with them either way.'
}

THE SITUATION
${situation}

THE CONVERSATION SO FAR
${script}

Write your next line. ${
    remaining <= 1
      ? 'This is the end of the exchange — close it off the way this person would, whether or not it is resolved.'
      : 'The conversation continues after this.'
  }

RULES
- 1 to 2 sentences, under 45 words. Spoken, not written.
- React to what they actually just said. Do not restate your previous line.
- Stay in character. If your relationship with them is distant or hostile, be
  harder work — shorter, less willing, more sceptical. Never cartoonishly rude.
- If they handled it well, let that land. People do change their mind.
- Never speak for the trainee.
- Plain spoken English. No markdown, no emoji, no stage directions.

Reply with ONLY this JSON object and nothing else:
{"text":"<what you say>","mood":"<one word: warmer, same, or cooler>"}`
}

/** Grading a whole conversation, rather than a single message. */
export function dialogueEvaluationPrompt({ character, situation, turns, learner }) {
  const script = turns
    .map((t) => `${t.who === 'you' ? 'TRAINEE' : character.name}: ${t.text}`)
    .join('\n')

  return `You are an experienced engineering mentor grading how a trainee handled
a live conversation with ${character.name}, ${character.role}.

THE SITUATION
${situation}

THE CONVERSATION
${script}
${learner?.summary ? `\nWHAT YOU KNOW ABOUT THIS TRAINEE: ${learner.summary}\n` : ''}
Judge the conversation as a whole, not line by line. What matters: did they hold
a position without becoming rigid, did they respond to what ${character.name}
actually said, did they leave the relationship intact, and did anything get
resolved.

SCORING (1-10)
1-2  = did not engage, or made it worse
3-4  = replied, but talked past them or folded immediately
5-6  = handled it adequately; nothing resolved or nothing risked
7-8  = responsive, clear, and moved it somewhere
9-10 = exceptional — got a result and left the relationship better

RULES
- Address the trainee as "you". Quote something they actually said.
- relationship: how ${character.name} feels afterwards, from -6 to +6.
- Plain text. No markdown, no emoji.

Reply with ONLY this JSON object and nothing else:
{"score":<1-10>,"strengths":"<what worked>","gaps":"<what was missing>","suggestion":"<one specific improvement>","relationship":<-6 to 6>,"consequence":"<one sentence on what this means later>"}`
}
