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
function contextBlock({ profile, learner }) {
  if (!profile && !learner) return ''

  const parts = ['\nWHO THIS IS FOR (background only — see the rules)']

  if (profile) {
    parts.push(`- Trainee: ${profile.who}`)
    parts.push(`- Set the scenario inside: ${profile.setting}`)
    if (profile.focus.length) {
      parts.push(`- They say they struggle most with: ${profile.focus.join('; ')}`)
    }
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

export function scenarioPrompt({ track, difficulty, avoid = [], profile, learner }) {
  const t = TRACK_BRIEF[track.id]
  const avoidBlock = avoid.length
    ? `\nDo NOT reuse these situations — the trainee has already seen them:\n${avoid
        .map((a, i) => `${i + 1}. ${a}`)
        .join('\n')}\n`
    : ''

  const personalised = contextBlock({ profile, learner })

  return `You write short training scenarios for a soft-skills app used by
engineering students in India who are about to start their first job.

TRACK: ${track.name} — ${t.focus}
DIFFICULTY: ${DIFFICULTY_BRIEF[difficulty]}
${personalised}
Write ONE realistic workplace scenario drawn from this space: ${t.situations}.
${avoidBlock}
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
