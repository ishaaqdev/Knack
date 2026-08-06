/**
 * Offline safety net.
 *
 * Free-tier Gemma is served from a shared upstream pool and does return 429s
 * under load. Rather than let a demo die mid-viva, the app degrades to a local
 * scenario bank and a deterministic rubric. Anything produced here is tagged
 * `source: "offline"` and the UI labels it — it is never passed off as AI output.
 */

const BANK = {
  'workplace-communication': {
    easy: [
      {
        scenario:
          'Your teammate Rahul asked you to review his pull request three days ago and you still have not opened it. He just pinged you again on Slack, this time with a "?" and nothing else. Standup is in twenty minutes.',
        prompt: 'Write the Slack reply you would send Rahul.',
      },
      {
        scenario:
          'You are two days into a five-day task and you have realised the API you were told to use does not support bulk uploads. Your lead, Sneha, is about to leave for a client call. You catch her at her desk.',
        prompt: 'Write what you say to Sneha in that moment.',
      },
    ],
    medium: [
      {
        scenario:
          'In sprint planning, a senior developer named Arun dismisses your suggestion to add retry logic with "we have never needed it in four years." You have seen three timeout errors in the logs this week. Four other people are in the room.',
        prompt: 'Write how you respond to Arun.',
      },
      {
        scenario:
          'A product manager, Divya, asks in a group channel why the login fix is not deployed yet. The real reason is that a teammate pushed a broken migration and is still fixing it. Naming him publicly would not go down well.',
        prompt: 'Write your reply in the channel.',
      },
    ],
    hard: [
      {
        scenario:
          'A client on a video call says your team promised a feature by Friday. You were never told about that commitment, and building it properly needs two weeks. Your manager is on the call and has just gone quiet. The client is waiting for you specifically.',
        prompt: 'Write what you say next on that call.',
      },
      {
        scenario:
          'Your teammate Karthik has been quietly shipping code you know he does not understand — he cannot explain it in review. He is on probation and a bad report would likely end his contract. Your lead asks you directly: "Is Karthik ready to own the payments module?"',
        prompt: 'Write your answer to your lead.',
      },
    ],
  },
  'critical-thinking': {
    easy: [
      {
        scenario:
          'A user reports the dashboard is "loading slowly." Your monitoring shows the average page load is 400ms, which is well within target. The user is a paying customer and your lead has forwarded you the ticket.',
        prompt: 'Write how you would approach this.',
      },
      {
        scenario:
          'A stakeholder asks for a CSV export button on the reports page. When you check the analytics, the reports page had eleven visits last month, all from the same internal account.',
        prompt: 'Write what you would do before building it.',
      },
    ],
    medium: [
      {
        scenario:
          'Two dashboards disagree: the analytics tool says signups grew 22% last month, the database query you wrote says they fell 4%. Marketing has already put the 22% figure in a deck for tomorrow morning.',
        prompt: 'Write how you would resolve this before tomorrow.',
      },
      {
        scenario:
          'Your team is choosing between two caching approaches. The benchmark favouring option A was run by the engineer who proposed it, on his own laptop, with a dataset one-tenth of production size. Nobody has questioned it.',
        prompt: 'Write what you raise and how.',
      },
    ],
    hard: [
      {
        scenario:
          'Checkout failures rose from 0.2% to 1.1% after a release last Tuesday. That release contained fourteen merged PRs. A payment provider also had a partial outage that week, and traffic was up 30% from a campaign. Your lead wants a root cause by end of day.',
        prompt: 'Write how you would narrow this down.',
      },
      {
        scenario:
          'A churn model your team built recommends dropping a customer segment that looks unprofitable. The model was trained on eighteen months of data, but pricing changed nine months ago. Leadership is ready to act on it this quarter.',
        prompt: 'Write the case you would make.',
      },
    ],
  },
  'ai-fluency': {
    easy: [
      {
        scenario:
          'An AI assistant writes you a working-looking Python function that calls pandas.read_json_lines(). It runs in your head but you have never seen that method before. The deadline is in an hour.',
        prompt: 'Write what you do before committing this.',
      },
      {
        scenario:
          'You ask an AI to summarise a 40-page compliance document. The summary is clear, confident, and includes a specific clause number you need to cite in an email to your manager today.',
        prompt: 'Write your next step and why.',
      },
    ],
    medium: [
      {
        scenario:
          'A teammate, Meera, opens a PR with 300 lines of AI-generated code. In review she cannot explain why one function retries three times. The tests pass and the sprint ends tomorrow.',
        prompt: 'Write your review comment to Meera.',
      },
      {
        scenario:
          'You are writing your project report and an AI gives you three academic citations that perfectly support your argument. Two of the paper titles return nothing on Google Scholar. Submission is in two days.',
        prompt: 'Write what you do about the citations.',
      },
    ],
    hard: [
      {
        scenario:
          'Your team wants to ship an AI feature that answers customer questions from your docs. In testing it is right about 90% of the time and confidently wrong the rest, usually on refund policy. Leadership sees 90% as a pass and wants it live next week.',
        prompt: 'Write the position you take and how you argue it.',
      },
      {
        scenario:
          'An AI tool your company adopted has quietly been writing most of a junior engineer\'s output for four months. His code passes review. He has just been recommended for a promotion, and your lead asks what you think.',
        prompt: 'Write your response to your lead.',
      },
    ],
  },
}

export function FALLBACK_SCENARIOS(trackId, difficulty, avoid = []) {
  const pool = BANK[trackId]?.[difficulty] ?? BANK['workplace-communication'].easy
  const seen = new Set(avoid.map((a) => a.slice(0, 60)))
  const fresh = pool.filter((p) => !seen.has(p.scenario.slice(0, 60)))
  const list = fresh.length ? fresh : pool
  const pick = list[Math.floor(Math.random() * list.length)]
  return { scenarioText: pick.scenario, taskPrompt: pick.prompt }
}

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
      'The AI model was unreachable, so this was scored by a local rubric — treat it as rough, not a real evaluation.',
  }
}
