/**
 * Every level of Knack, played once by one trainee, and photographed on a phone.
 *
 *   KNACK_OFFLINE=1 KNACK_DB=<scratch>/levels.db PORT=5191 node server/src/index.js
 *   node docs/capture-levels.mjs http://127.0.0.1:5191
 *
 * Creates one fresh account, "Asha Rao", and plays her through the whole career
 * in order: onboarding, a real company (Zoho), the group discussion, the mock and
 * the real round for each of the five interview rounds, joining, internship
 * levels 5 to 30 with the periodic reviews as they come due, the offer and one
 * round of negotiation, accepting it, and full-time work until the first
 * promotion. Every gate is passed through the server's own endpoints, with the
 * answers written below; nothing writes to the database directly and nothing is
 * faked. The states that only exist inside a running page (a discussion in
 * progress and its debrief, a mock question once it has been answered, a round
 * being answered, a day being worked, the signed offer, the promotion) are
 * played in the real interface itself, in headless Edge, and the page's own API
 * traffic is recorded off the DevTools protocol. The interview round's own
 * debrief screen is not among the figures: it currently crashes into the error
 * boundary (see the note above ROUND_SHOTS), so round results are taken from the
 * level map and the list of past rounds, and the crash is logged as a UI issue.
 *
 * Writes thirty PNGs to docs/paper-figures/levels/ (360 x 640 at 3x, a phone in
 * portrait) and docs/playthrough-data.json: every step with its score, XP,
 * timestamp and duration, attribute snapshots, the offer and the negotiation,
 * the badges, the call count and any gate that had to be retried. Every number
 * in that file is one the API returned. Meant for a fresh offline server (the
 * offline rubric and banks are deterministic, so a re-run plays the same
 * career); needs Edge at the usual path (set EDGE to override) and Node 22 or
 * newer for the built-in WebSocket.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import { BANK_A } from '../server/src/mock/bank-a.js'
import { BANK_B } from '../server/src/mock/bank-b.js'

const base = process.argv[2] ?? 'http://127.0.0.1:5191'
const EDGE = process.env.EDGE ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'paper-figures', 'levels')
const dataFile = join(here, 'playthrough-data.json')
mkdirSync(out, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const T0 = Date.now()

/* ============================================================ the answers ==
 *
 * What Asha says. She is a final-year Information Science student in Bengaluru
 * with one summer internship behind her, and the same facts run through every
 * answer: a canteen pre-order app built with two friends, delivery
 * notifications at a logistics startup, a timetable feed nobody asked for, a
 * CGPA of 7.4. The answers are written the way a prepared candidate would
 * answer, and they are scored by whatever the server's offline rubric makes of
 * them.
 */

// The first discussion a new trainee gets is the moonlighting motion. Four
// contributions, one silence, and the summary when the room asks for one.
const GD_TOPIC = 'Should employees be free to take on paid work outside their job?'
const GD_PLAN = [
  {
    to: 'Anjali',
    text: 'I agree with Anjali that we should pin the question down first, so here is a working definition: paid work done in your own time, on your own laptop, for someone who is not a client or a competitor. On that definition I would allow it, with disclosure, because a ban mostly pushes it out of sight rather than stopping it.',
  },
  {
    to: 'Vikram',
    text: 'Vikram, that is a fair challenge, so let me state the assumption openly: what an employer actually owns is my working hours, its code and its clients, not my evenings. The people Indian IT firms let go in 2022 were mostly working for direct rivals, which is a conflict of interest. My point is that a clear disclosure rule handles that better than a blanket ban.',
  },
  {
    to: 'Imran',
    text: 'Building on the point Imran just made about how you would actually do it: one page filed with HR, saying what the work is, roughly how many hours a week, and confirming it uses no company time, code or clients. The manager has two weeks to raise a conflict, and if nobody does, it stands. And Vikram, that is checkable: the dismissals cited work for rivals, not weekend tutoring.',
  },
  { to: null, text: '' }, // stays quiet while Vikram and Rohit make up
  {
    to: null,
    text: 'Let me try to sum up where we landed. Most of us agree it should be neither a free-for-all nor a blanket ban: disclose it, stay away from clients and competitors, and use none of the company’s time or code. Imran asked who pays when it goes wrong, and my answer is that if the day job slips, that is a performance conversation the manager can have anyway. Where we still disagree is who gets the final say on a conflict.',
  },
]

// The offline interview bank is fixed per round, so these are keyed by the
// question as the interviewer asks it.
const INTERVIEW = {
  1: {
    'Walk me through the last two years — not your CV, the decisions.':
      'Two years ago I made the first real decision: I stopped doing competitive programming every evening and started building things, because I was getting better at puzzles but could not ship anything. The first thing I built was a canteen pre-order app with two friends, and about 600 students used it. Then, in third year, I chose a summer internship at a 40-person logistics startup over a bigger name, because the startup would let me touch production, and I worked on their delivery notifications. This year I decided to focus on backend roles, which is why I am applying for this one.',
    'What is on your resume that you would defend hardest if I pushed on it?':
      'The internship work on delivery notifications. I wrote the retry logic for failed SMS messages, with exponential backoff and a dead-letter queue, and failed notifications went from about 4 percent to under 1 percent over three weeks. I would defend it hardest because I can explain every decision in it: why we capped retries at five, why we backed off instead of retrying immediately, and what happened to the messages that still failed. I also know its weak point, which is that it depends on a single SMS provider, so if you push on it I can tell you exactly where it breaks first.',
    'Tell me about something you built that nobody asked you to build.':
      'In third year our department published the timetable as a PDF that changed almost every week, and people kept missing rescheduled labs. Nobody asked, but I wrote a Python script that read the PDF, turned it into calendar events and published a feed anyone could subscribe to. About 150 classmates were using it by the end of the semester. The interesting part was keeping it correct: the PDF layout changed twice, so I added a check that compared the number of events with the previous week and emailed me instead of publishing when the difference looked wrong. I maintained it for two semesters.',
  },
  2: {
    'Tell me about a time you were clearly wrong and someone else was right.':
      'During my internship I was sure the shipment tracking page was slow because it needed a cache, and I had already started building one. My mentor looked at the query and said the real problem was a missing index on the shipments table. I argued for a day, then I measured both: the index alone took the query from about 800 milliseconds to 40, and the cache would only have hidden the problem until the next slow query. She was right and I was wrong. What I changed afterwards is that I measure first and propose a fix second, instead of starting with the solution I find most interesting.',
    'Tell me about someone on a team you found genuinely difficult to work with.':
      'In our fifth-semester mini project, one of the four of us went quiet for two weeks and missed two internal deadlines. My first instinct was to redo his part myself, which would have been faster. Instead I asked him to get tea and asked what was going on, because I genuinely did not know. He was working a part-time job in the evenings and was embarrassed to say so. We re-split the work so that he took the report and the testing, which he could do on weekends, and I set up a ten-minute check-in twice a week. We submitted on time, and his part was done well.',
    'Tell me about a time you had to do work you thought was pointless.':
      'In my internship I was asked to write a runbook for the notification service: what to check, in what order, when messages stop going out. I thought it was pointless, because I assumed nobody reads documentation and the code was right there. I wrote it anyway, and I kept it short, with five checks in order and the exact commands to run. Three weeks after I left, my mentor told me the on-call engineer had used it at 2 am when the SMS provider changed its API, and fixed the outage in twenty minutes. Since then I treat that kind of work as part of the job instead of a distraction from it.',
  },
  3: {
    'Pick your hardest project. What was the thing that nearly killed it?':
      'The canteen pre-order app. What nearly killed it was the lunch rush. In the first week about 300 orders came in within ten minutes at 12:30, the database ran out of connections, and some students were charged twice because they tapped pay again when the page hung. The canteen owner nearly stopped using it. First, I added a connection pool limit and a queue, so requests waited instead of failing. Then I added an idempotency key to every payment request, so that a second tap could not create a second charge. We refunded every duplicate by hand that week, and it has not happened since.',
    'Talk me through a technical decision where the alternative was also defensible.':
      'For telling students their order was ready, I chose polling every 5 seconds instead of WebSockets. WebSockets were the better design on paper, because they push the update instantly and use less traffic. I chose polling because the college Wi-Fi dropped long-lived connections constantly and the canteen tablet ran an old browser, so a simple request that failed and retried was more reliable than a socket that silently died. The cost was more requests, about 2 per second at the peak, which our small server handled easily. If the app had to serve the whole university instead of one canteen, I would revisit that decision.',
    'If I gave you two more weeks on it, what would you fix first, and why that?':
      'I would fix payment reconciliation first, because it is the only part where a bug costs a student real money. Right now we compare our orders with the payment gateway report by hand at the end of each day. With two weeks, I would first write an automated job that matches every payment to an order and flags anything unmatched within an hour, so that a double charge is caught the same day instead of the same week. Then I would add tests around the order state machine, because that is where most of our bugs came from. The interface can wait, because nobody loses money over an ugly button.',
  },
  4: {
    'I am not convinced that project was as much your work as you are suggesting.':
      'That is a fair thing to test, so let me separate what was mine from what was not. Three of us built it. Rahul built the React front end and Divya handled the payment gateway integration. I wrote the ordering API in Node and Express, designed the PostgreSQL schema, and built the order queue that the canteen tablet reads. For example, the idempotency key that stopped duplicate orders during the lunch rush was my change, and I can walk you through the commit and the bug that caused it. If you want to check, ask me anything about the queue or the schema and I will draw it for you now.',
    'Your marks are below what we normally shortlist. Why should that not matter here?':
      'My CGPA is 7.4, and I will not pretend that is the same as an 8.5. It dipped in my fourth semester, because I spent most of that term building the canteen app and under-prepared for two exams, which was a bad trade I would make differently now. Since then every semester has been above 8. I think it should matter less here because this company hires on what people can build, and I can show you working code: the canteen system, which handled 300 orders in ten minutes at lunch, and the notification retries I shipped during my internship. I would rather be judged on those.',
    'That is not the question I asked. Try again.':
      'You are right, I answered why I am a good candidate instead of whether my marks should count. Directly, then: they should count, as evidence of how I handle work I find less interesting, and on that evidence I was inconsistent in my fourth semester. What I would ask is that you weigh them alongside the more recent evidence, because my last three semesters were all above 8 and I shipped two real systems in that time. So my honest answer is that the marks matter, but they are neither the most recent nor the most relevant data you have about how I will do this job.',
  },
  5: {
    'The offer is going to be lower than you were hoping. Talk me through how you think about that.':
      'I would first ask how the number is built, because a fixed salary, a variable part and a joining bonus are three different conversations. Then I would compare it with what I actually need: I have worked out that I need roughly 45,000 a month in Bengaluru to live and send some money home, so I know my floor. If the offer is above that, I would weigh the learning and the team more than the last lakh, because the first two years compound. If it is below, I would say so plainly and ask what would have to be true for it to move, instead of accepting it and resenting it later.',
    'Where do you want to be in two years, and what would have to be true here for that?':
      'In two years I want to be the person a team trusts with a service end to end: designing it, shipping it, and being on call for it. For example, owning something like the notification service I worked on in my internship, not just a ticket inside it. For that to happen here, three things would need to be true. First, that I get real ownership early, even of something small. Then, regular and honest feedback, because I improve fastest when someone tells me specifically what was weak. And a manager who lets me make a contained mistake and learn from it, instead of shielding me from all of them.',
    'What is the part of this job you think you will be worst at?':
      'Probably estimating. In my internship I said two days for the retry change and it took five, because I did not account for testing against the real SMS provider, which had rate limits I had not read about. I have not fixed this, but I have a habit now: I break a task into steps, estimate each one, and then add the time for testing and review separately, so that I am not hiding them inside the coding time. I also say early when an estimate is slipping instead of at the deadline. I expect I will still be wrong at first, so I would want my manager to check my estimates for the first few months.',
  },
}

/* ---------------------------------------------------- a day at the office --- */

// The offline beat bank names one of these systems in every situation.
const SYSTEMS = [
  'the checkout service', 'the notification worker', 'the onboarding flow',
  'the reporting dashboard', 'the authentication service', 'the payments webhook',
  'the search index', 'the mobile sync job', 'the billing export',
  'the image processing pipeline', 'the referral module', 'the audit log',
]
const systemIn = (text) => SYSTEMS.find((s) => String(text ?? '').includes(s)) ?? 'this'

// The pressure line of a situation, answered rather than ignored.
const PRESSURE = {
  'you have not been told who owns this': 'Nobody has told me who owns this yet, so I will check with {manager} today and confirm the owner before I promise anything more.',
  'you are still learning how the team works': 'I am still learning how the team usually handles this, so tell me if there is a step I should be following that I have missed.',
  'you do not want to look like you cannot cope': 'I would rather flag this now than look as if I have it under control when I do not.',
  'you are already behind on something else': 'I am also behind on another task, so I will tell {manager} which one I am doing first and why.',
  'the deadline moved this morning': 'Since the deadline moved this morning, I will re-check what still fits and confirm the new plan with you before lunch.',
  'saying yes means something else slips': 'Taking this on means something else slips, so I will name exactly what moves and check that you are happy with that trade.',
  'two people who both outrank you want different things': 'Two people above me want different things here, so I will put both options in one thread and ask them to agree, rather than quietly picking one.',
  'somebody senior is watching how you handle it': 'I know this is visible, which is one more reason to give you the plain facts rather than a polished version.',
  'the decision is yours and nobody will make it for you': 'This one is my call, so I will make it today and write down why, so anyone can check my reasoning.',
  'this is the third time it has come up': 'This is the third time it has come up, which tells me the fix so far has not been good enough, and I will treat it that way.',
  'you do not have the information you would need to be sure': 'I do not have everything I would need to be certain yet, so I will say clearly which parts are confirmed and which are my best guess.',
  'the person asking has been short with you lately': 'I know things have felt a bit strained between us lately, so I want this to be clear and useful rather than defensive.',
  'you were not told about this until now': 'I only heard about this today, so I will catch up properly before I commit to anything I cannot keep.',
}
const pressureLine = (situation) => {
  const key = Object.keys(PRESSURE).find((k) => String(situation ?? '').toLowerCase().includes(k))
  return key ? PRESSURE[key] : ''
}

const MESSAGE = [
  'Hi {first}, sorry for leaving this overnight; that is on me. Where {sys} stands: the main change is done and passing tests locally, and two edge cases are still failing. I will have it up for review by 4 pm today and message you as soon as it is merged. {P} Can you confirm whether Friday is still the date you are planning around?',
  'Hi {first}, thanks for the nudge, and apologies for the slow reply. The short version on {sys}: about 70 percent done, nothing blocking, and what is left is the error handling. I will send you a screenshot of the working flow by 3 pm and a firm finish date at tomorrow’s standup. {P} Is there anything specific you need from it this week that I should do first?',
  'Hi {first}, I should have replied yesterday, sorry. On {sys}: I found a bug while testing that pushes my estimate back by about 1 day, so realistically it lands on Thursday, not Wednesday. I will write up what the bug is in the ticket within the hour so nobody is surprised. {P} Would it help if I shipped the part that already works first?',
  'Hi {first}, apologies for the delay. Here is where {sys} is: the code is done, review is pending with {senior}, and I expect to merge by 11 am tomorrow. If the review raises anything big, I will tell you the same day rather than at the deadline. {P} Who else is waiting on this, so I can keep them in the loop as well?',
]

const TASK = [
  'First, I would stop building on the agreed approach, because every extra hour makes it harder to undo. I will write a short note by 3 pm today on what I found, why it breaks the plan, and two alternatives with rough costs, and send it to {first} before the standup rather than after. I will check my reading with {senior} first, in case I have misunderstood something. {P} The question I would ask {first} is whether the date or the scope is fixed, because that decides which option we take.',
  'I would tell {first} today rather than quietly trying to rescue the original plan. I will first spend 1 hour confirming the problem with a small test, so that I bring evidence and not a hunch. Then I will message {first} with what breaks, what still works and the change I suggest, and ask {senior} to sanity-check the new approach. {P} Would {first} prefer a smaller version on time, or the full version a few days late?',
  'My first step is to write down exactly what does not work and how I found out, because "the plan is wrong" is not something anyone can act on. I will then tell {first} and {senior} together in one message, so that the decision is made with the full picture. I would propose a fallback I can finish within 2 days and flag the risk in the ticket. {P} I would also ask whether anyone else has hit this before, so I am not solving it twice.',
]

// A conversation is three replies. The first states the gap as Asha sees it; the
// second and third answer what the other person actually said back.
const OPENERS = [
  'Yes, of course. I think the gap is about what {sys} has to do by Friday. My understanding was that we ship the core change first and leave the edge cases for the next sprint, but I may have assumed that without checking with you.',
  'Yes. I think we read the ticket for {sys} differently. I took it as fixing the existing flow, and I suspect you expected a redesign. I would rather sort that out now than find out at the review.',
  'Of course. From my side {sys} is on track for the date we agreed, but I suspect we agreed different things: I have been working to the scope in the ticket, and I think the scope you have in mind is bigger.',
]
const SECOND = {
  'That is not really an answer': 'Fair, let me be specific. I changed the plan for {sys} on Tuesday without telling you, because I thought the edge cases could wait. That was my call, and I should have checked with you before making it.',
  'so what do you want to do about it': 'I would like us to agree it in writing so neither of us is guessing. I will put a short note in the ticket today listing what is in this week and what is not, and you can correct anything I have got wrong.',
  'I had not thought about it from that angle': 'I understand your side matters as much as mine, so here is a middle option: I will get a basic version of {sys} ready by Wednesday behind a flag, and spend Thursday and Friday on the fixes.',
}
const THIRD = {
  'rather have heard it earlier': 'I agree, and I understand why that is frustrating. From now on I will check with you before changing anything on {sys}, and I will send you a short status at 6 pm every day this week so you hear it from me first.',
  'What do you need from me': 'Just a reply on that note by 10 tomorrow, and a heads-up if anyone else depends on the edge cases. I understand you are under pressure on this too, so I will flag it the same day if anything slips.',
  'being straight with me': 'Thanks. I will put both dates in the ticket today so the whole team can see them, and if the fixes look bigger than 2 days I will tell you before the demo, not after.',
}
const SECOND_DEFAULT = SECOND['so what do you want to do about it']
const THIRD_DEFAULT = THIRD['What do you need from me']
const pickBy = (table, said, fallback) =>
  Object.entries(table).find(([k]) => String(said ?? '').includes(k))?.[1] ?? fallback

// Of four ways to answer a call that cannot wait, the one that says what you
// know now and what you do not.
const bestDecision = (options) => {
  const i = options.findIndex((o) => /straight answer now/i.test(o))
  return i >= 0 ? i : 0
}

const fill = (template, v) =>
  template
    .replace(/\{P\}\s*/g, v.P ? `${v.P} ` : '')
    .replace(/\{first\}/g, v.first)
    .replace(/\{sys\}/g, v.sys)
    .replace(/\{manager\}/g, v.manager)
    .replace(/\{senior\}/g, v.senior)
    .replace(/\s+/g, ' ')
    .trim()

/* ================================================================ records == */

const calls = [] // every API call, from this script and from the page
const steps = [] // the moves that matter, with what they scored
const shots = []
const retries = []
const snapshots = {}
const data = { reviews: [], days: [], fulltimeDays: [], interview: {} }

function step(entry) {
  steps.push({ n: steps.length + 1, ...entry })
  const s = steps.at(-1)
  console.log(
    `[${String(s.n).padStart(3)}] ${s.phase}${s.level != null ? ` ${s.level}` : ''} ${s.label ?? ''} ${s.endpoint}` +
      `${s.score != null ? ` score=${s.score}` : ''}${s.verdict ? ` (${s.verdict})` : ''}${s.xpAfter != null ? ` xp=${s.xpAfter}` : ''}`
  )
  return s
}

/* ================================================================ the API == */

let cookie = ''
async function api(method, path, body) {
  const t = Date.now()
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const set = res.headers.getSetCookie?.() ?? []
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ')
  const json = await res.json().catch(() => ({}))
  const ms = Date.now() - t
  calls.push({ via: 'api', method, path, status: res.status, at: new Date(t).toISOString(), ms })
  return { status: res.status, data: json, ms, at: new Date(t).toISOString() }
}

async function must(method, path, body) {
  const r = await api(method, path, body)
  if (r.status >= 400) throw new Error(`${method} ${path} -> ${r.status}: ${JSON.stringify(r.data).slice(0, 300)}`)
  return r
}

const xpNow = async () => (await api('GET', '/auth/me')).data.user?.xp ?? null

async function snapshot(label) {
  const r = await must('GET', '/career/attributes')
  snapshots[label] = {
    at: r.at,
    professionalIndex: r.data.professionalIndex,
    values: Object.fromEntries(r.data.attributes.map((a) => [a.key, a.value])),
    tiers: Object.fromEntries(r.data.attributes.map((a) => [a.key, a.tier])),
  }
  console.log(`  attributes @ ${label}: index ${r.data.professionalIndex}`)
}

/* ==================================================================== CDP == */

const tmp = mkdtempSync(join(tmpdir(), 'knack-edge-'))
const PORT = 9334
const edge = spawn(
  EDGE,
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${tmp}`, '--no-first-run', 'about:blank'],
  { stdio: 'ignore' }
)

const getJson = (path) =>
  new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port: PORT, path }, (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()))
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })

let targets
for (let i = 0; i < 50; i++) {
  try {
    targets = await getJson('/json/list')
    if (targets.some((t) => t.type === 'page')) break
  } catch {}
  await sleep(200)
}
const page = targets?.find((t) => t.type === 'page')
if (!page) throw new Error('Edge did not start')

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()

// The page's own calls to /api, with what came back, so a step played in the
// interface is recorded exactly as one played from here.
const uiCalls = []
const inflight = new Map()
function onEvent(method, p) {
  if (method === 'Network.requestWillBeSent') {
    const url = p.request?.url ?? ''
    if (!url.startsWith(base) || !url.includes('/api/')) return
    inflight.set(p.requestId, {
      method: p.request.method,
      path: new URL(url).pathname.replace(/^\/api/, ''),
      req: p.request.postData ? safeJson(p.request.postData) : null,
      t0: p.timestamp,
      at: new Date(p.wallTime * 1000).toISOString(),
    })
  } else if (method === 'Network.responseReceived' && inflight.has(p.requestId)) {
    inflight.get(p.requestId).status = p.response.status
  } else if (method === 'Network.loadingFinished' && inflight.has(p.requestId)) {
    const r = inflight.get(p.requestId)
    inflight.delete(p.requestId)
    r.ms = Math.round((p.timestamp - r.t0) * 1000)
    cdp('Network.getResponseBody', { requestId: p.requestId })
      .then((b) => (r.res = safeJson(b.base64Encoded ? Buffer.from(b.body, 'base64').toString() : b.body)))
      .catch(() => (r.res = null))
      .finally(() => {
        delete r.t0
        uiCalls.push(r)
        calls.push({ via: 'ui', method: r.method, path: r.path, status: r.status, at: r.at, ms: r.ms })
      })
  } else if (method === 'Network.loadingFailed' && inflight.has(p.requestId)) {
    const r = inflight.get(p.requestId)
    inflight.delete(p.requestId)
    calls.push({ via: 'ui', method: r.method, path: r.path, status: 0, at: r.at, ms: null, failed: p.errorText })
  }
}
function safeJson(s) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? reject(new Error(m.error.message)) : resolve(m.result)
  } else if (m.method) {
    onEvent(m.method, m.params ?? {})
  }
}
const cdp = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id
    pending.set(n, { resolve, reject })
    ws.send(JSON.stringify({ id: n, method, params }))
  })
const js = async (expression) => {
  const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  return r.result?.value
}

/* ------------------------------------------------------------ page moves --- */

const W = 360
const H = 640
const Q = JSON.stringify

async function waitFor(expression, { timeout = 20000, every = 250, label = expression } = {}) {
  const until = Date.now() + timeout
  while (Date.now() < until) {
    if (await js(`(() => { try { return !!(${expression}) } catch { return false } })()`)) return true
    await sleep(every)
  }
  throw new Error(`Timed out waiting for: ${String(label).slice(0, 160)}`)
}
// textContent, not innerText: several labels are uppercased in CSS and innerText would report them that way.
const hasText = (text) => `document.body && document.body.textContent.includes(${Q(text)})`
const waitText = (text, timeout) => waitFor(hasText(text), { timeout, label: `text "${text}"` })

async function go(path, text) {
  await cdp('Page.navigate', { url: `${base}${path}` })
  await sleep(600)
  await waitFor(`document.readyState === 'complete'`)
  if (text) await waitText(text)
  await sleep(500)
}
const blank = () => cdp('Page.navigate', { url: 'about:blank' })

// Buttons are found by what they say, the way a person finds them.
const findButton = (text, mode) =>
  `[...document.querySelectorAll('button, a')].find((e) => { const t = e.textContent.replace(/\\s+/g, ' ').trim(); return ${
    mode === 'exact' ? `t === ${Q(text)}` : mode === 'starts' ? `t.startsWith(${Q(text)})` : `t.includes(${Q(text)})`
  } })`
async function click(text, mode = 'includes', { timeout = 15000 } = {}) {
  await waitFor(`(() => { const b = ${findButton(text, mode)}; return b && !b.disabled })()`, { timeout, label: `button "${text}"` })
  await js(`(() => { const b = ${findButton(text, mode)}; b.scrollIntoView({ block: 'center' }); b.click(); return true })()`)
  await sleep(250)
}
async function type(text, selector = 'textarea') {
  await waitFor(`(() => { const t = document.querySelector(${Q(selector)}); return t && !t.disabled })()`, { label: selector })
  await js(`(() => { const t = document.querySelector(${Q(selector)}); t.focus(); return true })()`)
  await cdp('Input.insertText', { text })
  await sleep(300)
}
// Scroll so the first leaf element whose text matches sits under the sticky header.
const scrollToText = (text, offset = 72, exact = false) =>
  js(`(() => { const want = ${Q(text.toLowerCase())}; const el = [...document.querySelectorAll('h1,h2,h3,p,span,div,dt,li,button')].find((e) => { if (e.children.length) return false; const t = e.textContent.trim().toLowerCase(); return ${exact} ? t === want : t.includes(want) }); if (!el) return false; el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -${offset}); return true })()`)
// Scroll so the first element matching a selector whose text starts with `start` sits under the header.
const scrollToStart = (selector, start, offset = 76) =>
  js(`(() => { const el = [...document.querySelectorAll(${Q(selector)})].find((e) => e.textContent.trim().startsWith(${Q(start)})); if (!el) return false; el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -${offset}); return true })()`)
const top = () => js('window.scrollTo(0, 0)')
// Lettered options (A to D): the buttons whose first span is a single letter.
const OPTIONS = `[...document.querySelectorAll('button')].filter((b) => { const s = b.querySelector('span'); return s && /^[ABCD]$/.test(s.textContent.trim()) })`
// A question that has just replaced another one: the old one animates out first,
// still holding the last answer, so wait until only the fresh, empty box is left.
const freshTextarea = `(() => { const t = [...document.querySelectorAll('textarea')]; return t.length === 1 && !t[0].disabled && t[0].value === '' })()`

async function shot(name, desc) {
  await sleep(700)
  const r = await cdp('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(out, name), Buffer.from(r.data, 'base64'))
  shots.push({ file: `docs/paper-figures/levels/${name}`, shows: desc, at: new Date().toISOString() })
  console.log('  wrote', name)
}

// The page's next call to an endpoint, once its response body has been read.
const mark = () => uiCalls.length
async function uiCall(path, from, timeout = 30000) {
  const until = Date.now() + timeout
  while (Date.now() < until) {
    const hit = uiCalls.slice(from).find((c) => c.path === path)
    if (hit) return hit
    await sleep(150)
  }
  throw new Error(`The page never called ${path}`)
}

/* =============================================================== the run == */

const BANK = new Map([...BANK_A, ...BANK_B].map((q) => [q.id, q]))
let me = null
let team = { manager: 'Hema', senior: 'Arun' }
let stoppedAt = null
let failure = null

try {
  await cdp('Page.enable')
  await cdp('Network.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 3, mobile: true })
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: true })

  /* ------------------------------------------------- sign up and onboard -- */

  const email = `asha.rao.levels-${Date.now()}@example.test`
  let r = await must('POST', '/auth/signup', { email, password: 'asha-levels-pass-1', name: 'Asha Rao' })
  step({ phase: 'setup', label: 'sign up', endpoint: 'POST /api/auth/signup', via: 'api', status: r.status, xpAfter: r.data.user?.xp, at: r.at, ms: r.ms })
  const profile = {
    name: 'Asha Rao',
    yearOfStudy: 'final',
    branch: 'ise',
    targetRole: 'swe',
    experience: 'intern',
    workSetting: 'product',
    focusAreas: ['saying-no', 'criticism'],
    confidence: { 'workplace-communication': 3, 'critical-thinking': 4, 'ai-fluency': 3 },
  }
  r = await must('POST', '/auth/onboarding', profile)
  me = r.data.user
  step({ phase: 'setup', label: 'onboarding', endpoint: 'POST /api/auth/onboarding', via: 'api', status: r.status, xpAfter: me?.xp, at: r.at, ms: r.ms })
  await snapshot('start')

  const [cname, ...rest] = cookie.split(';')[0].split('=')
  await cdp('Network.setCookie', { name: cname, value: rest.join('='), url: base, httpOnly: true })

  // 01. Day one: nothing done yet.
  await go('/dashboard', 'Hey, Asha')
  await shot('01-dashboard-start.png', 'Dashboard for a brand-new trainee: no activity yet, group discussion is the current objective.')

  /* ------------------------------------------------------------ company -- */

  // 02 and 03. The picker, and the file on the company she picks.
  await go('/career', 'Where are you applying?')
  await click('Zoho · a bootstrapped product company', 'starts')
  await waitText('What is open (simulated)')
  await scrollToText('Where are you applying?', 64)
  await js(`(() => { const b = ${findButton('Zoho · a bootstrapped product company', 'starts')}; const box = b.parentElement; box.scrollTop = b.offsetTop - box.offsetTop - 140; return true })()`)
  await shot('02-company-list.png', 'Career screen, company picker: the list of real companies with Zoho selected.')
  await js(`(() => { const w = document.querySelector('.well'); w.scrollIntoView({ block: 'start' }); window.scrollBy(0, -72); return true })()`)
  await shot('03-company-profile-zoho.png', 'Zoho company file inside the picker: description, culture, how it hires graduates and simulated openings.')

  r = await must('POST', '/career/company', { companyId: 'zoho', roleId: 'swe' })
  step({ phase: 'setup', label: `company ${r.data.company?.name} / ${r.data.role?.name}`, endpoint: 'POST /api/career/company', via: 'api', status: r.status, xpAfter: r.data.user?.xp, at: r.at, ms: r.ms })

  /* ------------------------------------------------ group discussion (UI) -- */

  await go('/gd', 'Start a discussion')
  let m = mark()
  await click('Start a discussion')
  const gdStart = await uiCall('/gd/start', m)
  if (gdStart.res?.topic !== GD_TOPIC) {
    throw new Error(`The discussion opened on "${gdStart.res?.topic}", not the motion the contributions were written for.`)
  }
  step({ phase: 'gd', label: `start: ${gdStart.res.topic}`, endpoint: 'POST /api/gd/start', via: 'ui', status: gdStart.status, at: gdStart.at, ms: gdStart.ms })

  const roomIdle = `(() => { const bs = [...document.querySelectorAll('button')]; if (bs.some((b) => b.textContent.trim() === 'Skip ahead')) return false; const done = bs.find((b) => b.textContent.includes('Get your debrief')); if (done) return !done.disabled; const t = document.querySelector('textarea'); return t && !t.disabled })()`
  await waitFor(roomIdle, { timeout: 30000, label: 'the room to finish talking' })

  const gdTurns = []
  for (let i = 0; i < GD_PLAN.length; i++) {
    const { to, text } = GD_PLAN[i]
    m = mark()
    if (text) {
      if (to) await click(to, 'exact')
      await type(text)
      await click('Say this', 'starts')
    } else {
      await click('Stay quiet', 'exact')
    }
    const turn = await uiCall('/gd/turn', m)
    gdTurns.push({ beat: turn.res?.beat, said: text || null, to, mood: turn.res?.mood?.label ?? null, closed: turn.res?.closed })
    step({ phase: 'gd', label: `turn ${i + 1}: ${text ? `spoke${to ? ` to ${to}` : ''}` : 'stayed quiet'}`, endpoint: 'POST /api/gd/turn', via: 'ui', status: turn.status, verdict: turn.res?.mood ? `room ${turn.res.mood.label}` : null, at: turn.at, ms: turn.ms })
    await waitFor(roomIdle, { timeout: 30000, label: 'the room to finish talking' })
    await sleep(900)

    // 04. Mid-discussion, once the room has answered her second point.
    if (i === 1) {
      await scrollToStart('p', 'Room:', 76)
      await shot('04-gd-room-mid-discussion.png', 'Group discussion in progress (beat 3 of 5): room mood strip, current speaker card and the discussion so far.')
    }
  }

  m = mark()
  await click('Get your debrief')
  const gd = await uiCall('/gd/finish', m)
  await waitText('How you were assessed')
  await top()
  await shot('05-gd-debrief.png', `Group discussion debrief: ${gd.res.score}/10, cleared, with the five assessed dimensions.`)
  step({ phase: 'gd', label: 'finish', endpoint: 'POST /api/gd/finish', via: 'ui', status: gd.status, score: gd.res.score, verdict: gd.res.passed ? 'cleared' : 'not cleared', xpAfter: gd.res.xp?.after, at: gd.at, ms: gd.ms })
  data.gd = {
    topic: gd.res.topic,
    attempts: 1,
    score: gd.res.score,
    passed: gd.res.passed,
    pass: gd.res.pass,
    scores: gd.res.scores,
    verdict: gd.res.verdict,
    strengths: gd.res.strengths,
    gaps: gd.res.gaps,
    roomAtEnd: gd.res.mood?.label,
    turns: gdTurns,
    contributions: gd.res.contributions?.length,
    transcriptLength: gd.res.transcript?.length,
    phaseUnlocked: gd.res.phaseUnlocked,
    badges: gd.res.badges?.map((b) => b.name),
    source: gd.res.source,
  }
  if (!gd.res.passed) {
    stoppedAt = 'gd'
    throw new Error(`The discussion scored ${gd.res.score}/10, below the ${gd.res.pass} needed (heuristicGd in server/src/fallback.js).`)
  }
  await snapshot('afterGd')

  /* --------------------------------------------------- interview rounds (UI) */

  await go('/interview', 'The rounds')
  await scrollToText('The rounds', 64)
  await shot('06-interview-map-round1-open.png', 'Interview level map: round 1 (Introduction) open and marked "You are here", rounds 2 to 5 locked.')

  /*
   * What each round contributes to the figures. The round's own debrief screen
   * cannot be one of them: POST /api/interview/submit returns `level` twice (the
   * round number, then the XP level object, which wins), and the Debrief in
   * web/src/pages/Interview.jsx renders `Round {result.level}`, so React throws
   * error #31 and the error boundary takes the screen. The round is saved before
   * that, so its result is shown where the interface still shows it: on the level
   * map and in the list of past rounds.
   */
  const ROUND_SHOTS = {
    1: { mockAnswered: '07-r1-mock-answered.png', mapAfter: '08-r1-result-on-map.png' },
    2: { answering: '09-r2-behavioural-answering.png' },
    3: { mockResult: '10-r3-mock-result.png' },
    4: { mockAnswered: '11-r4-mock-answered.png' },
    5: { answering: '12-r5-closing-answering.png' },
  }
  data.uiIssues = []
  for (let level = 1; level <= 5; level++) {
    const plan = ROUND_SHOTS[level]
    await go('/interview', 'The rounds')

    // The mock: five questions, each explained once it is answered.
    m = mark()
    await click('Start', 'exact')
    const mockStart = await uiCall('/mock/start', m)
    await waitText('Question 1 of')
    const picks = []
    let mFinish = 0
    for (let i = 0; i < mockStart.res.questions.length; i++) {
      const q = mockStart.res.questions[i]
      const known = BANK.get(q.id)
      const best = known ? known.options.reduce((b, o) => (o.score > b.score ? o : b)).text : null
      let k = q.options.findIndex((o) => o.text === best)
      if (k < 0) k = 0
      await waitText(`Question ${i + 1} of`)
      await waitFor(`(() => { const o = ${OPTIONS}; return o.length === 4 && o.every((b) => !b.disabled) })()`, { label: `mock question ${i + 1} options` })
      m = mark()
      await js(`(() => { const o = ${OPTIONS}[${k}]; o.scrollIntoView({ block: 'center' }); o.click(); return true })()`)
      const ans = await uiCall('/mock/answer', m)
      await waitText('Remember this')
      picks.push({ id: q.id, topic: q.topic, choice: k, score: ans.res.score, grade: ans.res.grade, best: ans.res.best })
      step({ phase: 'interview', level, label: `mock q${i + 1} (${q.topic})`, endpoint: 'POST /api/mock/answer', via: 'ui', status: ans.status, score: ans.res.score, verdict: ans.res.grade, at: ans.at, ms: ans.ms })

      if (plan.mockAnswered && i === 0) {
        await js(`(() => { const o = ${OPTIONS}[${k}]; o.scrollIntoView({ block: 'start' }); window.scrollBy(0, -250); return true })()`)
        await shot(plan.mockAnswered, `Round ${level} (${mockStart.res.round?.name}) mock, question 1 answered: Asha's pick graded "${ans.res.grade} (your pick)" with its explanation, between the other explained options.`)
      }
      mFinish = mark()
      await click(i === mockStart.res.questions.length - 1 ? 'See how you did' : 'Next question')
    }
    const mf = await uiCall('/mock/finish', mFinish)
    await waitText('Start the real round')
    step({ phase: 'interview', level, label: 'mock finish', endpoint: 'POST /api/mock/finish', via: 'ui', status: mf.status, score: mf.res.score, verdict: mf.res.verdict, xpAfter: mf.res.xp?.after, at: mf.at, ms: mf.ms })
    if (plan.mockResult) {
      await top()
      await shot(plan.mockResult, `Round ${level} (${mf.res.round}) mock result: ${mf.res.score}/10, "${mf.res.verdict}", with the button into the real round.`)
    }

    // The real round: three questions in her own words.
    m = mark()
    await click('Start the real round')
    const ivStart = await uiCall('/interview/start', m)
    if (ivStart.status !== 200) throw new Error(`Round ${level} would not start: ${JSON.stringify(ivStart.res)}`)
    const qs = ivStart.res.questions
    for (let i = 0; i < qs.length; i++) {
      const answer = INTERVIEW[level]?.[qs[i].text]
      if (!answer) throw new Error(`No answer written for round ${level} question "${qs[i].text}"`)
      await waitText(`Question ${i + 1} of ${qs.length}`)
      await waitFor(freshTextarea, { label: `an empty answer box for question ${i + 1}` })
      await type(answer)
      if (plan.answering && i === 0) {
        await top()
        await shot(plan.answering, `Round ${level} (${ivStart.res.round?.name}), question 1 of 3 from ${ivStart.res.interviewer?.name}, with Asha's answer written in before submitting.`)
      }
      m = mark()
      await click(i === qs.length - 1 ? 'Finish and get the debrief' : 'Next question')
    }
    const iv = await uiCall('/interview/submit', m, 40000)
    await waitFor(`${hasText('What to change')} || ${hasText('Something broke on this screen')}`, { label: 'the debrief or the error screen' })
    if (await js(hasText('Something broke on this screen'))) {
      const msg = String(await js(`(document.body.innerText.match(/Minified React error #\\d+[^\\n]*/) || [''])[0]`)).slice(0, 300)
      data.uiIssues.push({ round: level, screen: 'interview debrief', shown: 'error boundary: "Something broke on this screen"', error: msg, responseLevelField: iv.res.level })
      console.log(`  round ${level} debrief screen crashed (${msg.slice(0, 40)}...); result read from the API response`)
    }
    step({ phase: 'interview', level, label: `round ${level} ${iv.res.round?.name}`, endpoint: 'POST /api/interview/submit', via: 'ui', status: iv.status, score: iv.res.score, verdict: iv.res.passed ? 'cleared' : 'not cleared', xpAfter: iv.res.xp?.after, at: iv.at, ms: iv.ms })
    data.interview[level] = {
      round: iv.res.round?.name,
      interviewer: ivStart.res.interviewer?.name,
      mock: { score: mf.res.score, verdict: mf.res.verdict, xp: mf.res.xp?.total, source: mockStart.res.source, picks },
      real: {
        attempts: 1,
        score: iv.res.score,
        passed: iv.res.passed,
        verdict: iv.res.verdict,
        perAnswer: iv.res.answers?.map((a) => ({ question: a.question, score: a.score, words: a.answer.split(/\s+/).length })),
        xp: iv.res.xp?.total,
        unlockedRound: iv.res.unlockedRound,
        phaseUnlocked: iv.res.phaseUnlocked,
        badges: iv.res.badges?.map((b) => b.name),
        source: iv.res.source,
      },
    }
    if (!iv.res.passed) {
      stoppedAt = `interview round ${level}`
      throw new Error(`Round ${level} scored ${iv.res.score}/10, below 6 (heuristicDebrief in server/src/fallback.js).`)
    }
    if (plan.mapAfter) {
      await go('/interview', 'The rounds')
      await scrollToText('The rounds', 64)
      await shot(plan.mapAfter, `Interview level map after round 1: Introduction cleared at ${iv.res.score}/10 with its stars, round 2 now "You are here".`)
    }
  }
  await snapshot('afterInterviews')

  // 13 and 14. The five results, then the map with every round cleared.
  await go('/interview', 'Past rounds')
  await scrollToText('Past rounds', 64)
  await shot('13-interview-past-rounds.png', `Interview prep, "Past rounds": all five real rounds with their scores (${[1, 2, 3, 4, 5].map((l) => `R${l} ${data.interview[l].real.score}/10`).join(', ')}).`)
  await js(`(() => { const t = [...document.querySelectorAll('*')].filter((e) => !e.children.length && e.textContent.trim() === 'Closing').at(-1); t.scrollIntoView({ block: 'start' }); window.scrollBy(0, -430); return true })()`)
  await shot('14-interview-map-all-cleared.png', 'Interview level map at the end of the interview phase: rounds 2 to 5 (Behavioural, Your work, Pressure, Closing) all cleared with scores and stars; round 1 is just above.')

  /* ------------------------------------------------------------- joining -- */

  r = await must('POST', '/career/join')
  step({ phase: 'joining', label: 'join', endpoint: 'POST /api/career/join', via: 'api', status: r.status, xpAfter: r.data.user?.xp, at: r.at, ms: r.ms })
  const cast = r.data.cast ?? []
  team = {
    manager: cast.find((c) => c.slug === 'manager')?.name ?? 'Hema',
    senior: cast.find((c) => c.slug === 'senior')?.name ?? 'Arun',
  }
  data.joining = { joinedAt: r.data.joinedAt, phase: r.data.career?.phase, team: cast.map((c) => ({ name: c.name, role: c.role, relationship: c.relationship })) }

  await go('/joining', 'Meet the team')
  await top()
  await shot('15-joining-meet-the-team.png', `Joining: "Meet the team", introducing ${team.manager}, the Engineering Manager, first of five colleagues.`)

  /* ---------------------------------------------------------- internship -- */

  const LOCATIONS = ['desk', 'meeting', 'cafeteria', 'hr', 'manager']
  let level = 5
  let dayNo = 0

  const values = (beat) => ({
    first: beat.character?.name?.split(' ')[0] ?? 'there',
    sys: systemIn(beat.situation),
    manager: team.manager,
    senior: team.senior,
    P: fill(pressureLine(beat.situation), { first: '', sys: '', manager: team.manager, senior: team.senior }),
  })
  const writeFor = (beat, day) => {
    const list = beat.kind === 'task' ? TASK : MESSAGE
    return fill(list[day % list.length], values(beat))
  }

  // One beat through the API, whatever kind it is.
  async function beatByApi(beat, day, phase, lvl) {
    const v = values(beat)
    if (beat.kind === 'dialogue') {
      let said = fill(OPENERS[day % OPENERS.length], v)
      let turns = beat.turns ?? []
      for (let k = turns.filter((t) => t.who === 'you').length; k < 3; k++) {
        if (k === 1) said = fill(pickBy(SECOND, turns.at(-1)?.text, SECOND_DEFAULT), v)
        if (k === 2) said = fill(pickBy(THIRD, turns.at(-1)?.text, THIRD_DEFAULT), v)
        const d = await must('POST', '/workplace/dialogue', { text: said })
        turns = d.data.turns
      }
      const a = await must('POST', '/workplace/answer', {})
      return a
    }
    if (beat.kind === 'decision') return must('POST', '/workplace/answer', { choice: bestDecision(beat.options ?? []) })
    return must('POST', '/workplace/answer', { text: writeFor(beat, day) })
  }

  const openBeat = async () => {
    const w = await must('GET', '/workplace')
    return w.data.open ? w.data.open.beats[w.data.open.at] : null
  }

  async function recordBeat(dayRec, res, via, phase, lvl) {
    const g = res.graded ?? res.data?.graded
    const at = res.at
    dayRec.beats.push({ kind: g.kind, character: g.character?.name ?? null, headline: g.headline, score: g.score, via })
    step({ phase, level: lvl, label: `day ${dayRec.day} beat ${g.index + 1} ${g.kind}`, endpoint: 'POST /api/workplace/answer', via, status: res.status, score: g.score, at, ms: res.ms })
  }

  /**
   * One working day. `ui` names the moments played in the page: a screenshot of
   * a beat in progress, a beat answered in the page, and the day closed there.
   */
  async function workday({ phase, location, ui = {} }) {
    dayNo += 1
    const lvl = phase === 'internship' ? level : null
    const dayRec = { day: null, level: lvl, location, beats: [], phase }
    const d = await must('POST', '/workplace/day', { locationId: location })
    dayRec.day = d.data.dayNumber
    step({ phase, level: lvl, label: `day ${d.data.dayNumber} at ${d.data.locationName}`, endpoint: 'POST /api/workplace/day', via: 'api', status: d.status, at: d.at, ms: d.ms })
    let beat = d.data.beats[d.data.at]
    let closedInUi = null

    for (let i = 0; i < 3; i++) {
      const hook = ui[i]
      if (hook) {
        // Play into the beat through the API first if the shot wants a conversation under way.
        if (hook.repliesFirst && beat.kind === 'dialogue') {
          const v = values(beat)
          let turns = []
          for (let k = 0; k < hook.repliesFirst; k++) {
            const said =
              k === 0 ? fill(OPENERS[dayRec.day % OPENERS.length], v) : fill(pickBy(SECOND, turns.at(-1)?.text, SECOND_DEFAULT), v)
            const dd = await must('POST', '/workplace/dialogue', { text: said })
            turns = dd.data.turns
            step({ phase, level: lvl, label: `day ${dayRec.day} beat ${i + 1} reply ${k + 1}`, endpoint: 'POST /api/workplace/dialogue', via: 'api', status: dd.status, at: dd.at, ms: dd.ms })
          }
          beat = await openBeat()
        }
        await go('/office', beat.headline ?? 'Day')
        await top()
        if (hook.prepare === 'type') {
          await type(writeFor(beat, dayRec.day))
          await js(`(() => { const t = document.querySelector('textarea'); t.blur(); t.scrollTop = 0; return true })()`)
        }
        if (hook.prepare === 'choose') {
          const k = bestDecision(beat.options ?? [])
          await js(`(() => { const o = ${OPTIONS}[${k}]; o.click(); return true })()`)
          await sleep(300)
        }
        await sleep(1200) // the page scrolls itself to the newest line of a conversation
        if (hook.scrollTo) await scrollToText(hook.scrollTo(beat), hook.offset ?? 72)
        else await top()
        if (hook.shot) await shot(hook.shot, hook.desc(beat, lvl))
        if (hook.submit) {
          m = mark()
          await click('Done', 'exact')
          const a = await uiCall('/workplace/answer', m)
          await recordBeat(dayRec, { ...a, graded: a.res.graded }, 'ui', phase, lvl)
          await waitText(a.res.done ? 'End the day' : 'Next')
          if (hook.resultShot) {
            await top()
            await shot(hook.resultShot, hook.resultDesc(a.res.graded, lvl))
          }
          if (hook.closeInUi && a.res.done) {
            m = mark()
            await click('End the day', 'starts')
            const c = await uiCall('/workplace/close', m)
            await waitText(`End of day ${dayRec.day}`)
            closedInUi = c
            if (hook.summaryShot) {
              // The level line sits under the day's moves; bring it up above the bottom bar.
              await js(`(() => { const el = [...document.querySelectorAll('p')].find((p) => p.textContent.trim().startsWith('Internship level')); if (!el) return false; el.scrollIntoView({ block: 'end' }); window.scrollBy(0, 110); return true })()`)
              await shot(hook.summaryShot, hook.summaryDesc(c.res))
            }
          }
          await blank()
          await sleep(300)
          beat = a.res.next
          continue
        }
        await blank()
        await sleep(300)
      }
      const res = await beatByApi(beat, dayRec.day, phase, lvl)
      await recordBeat(dayRec, res.data ? { ...res, graded: res.data.graded } : res, 'api', phase, lvl)
      beat = res.data.next
    }

    let c
    if (closedInUi) {
      c = { status: closedInUi.status, data: closedInUi.res, at: closedInUi.at, ms: closedInUi.ms, via: 'ui' }
    } else {
      c = { ...(await must('POST', '/workplace/close')), via: 'api' }
    }
    const res = c.data
    dayRec.mean = res.summary?.meanScore
    dayRec.xp = res.xp?.total
    dayRec.xpAfter = res.xp?.after
    dayRec.advanced = res.internship?.advanced
    dayRec.levelAfter = res.internship?.level
    dayRec.news = res.news?.headline ?? null
    dayRec.callbacks = res.callbacks?.map((x) => x.effect) ?? []
    dayRec.badges = res.summary?.badges?.map((b) => b.name) ?? []
    step({
      phase,
      level: lvl,
      label: `day ${dayRec.day} close`,
      endpoint: 'POST /api/workplace/close',
      via: c.via,
      status: c.status,
      score: res.summary?.meanScore,
      verdict: phase === 'internship' ? (res.internship?.advanced ? `level ${res.internship.level}` : 'did not advance') : `levels since hire +1`,
      xpAfter: res.xp?.after,
      at: c.at,
      ms: c.ms,
    })
    if (phase === 'internship') {
      if (!res.internship?.advanced) retries.push({ gate: `internship level ${lvl}`, day: dayRec.day, mean: dayRec.mean, note: 'day mean below 5, level not advanced' })
      level = res.internship?.level ?? level
    }
    return { dayRec, res }
  }

  const UI_DAYS = {
    5: {
      location: 'desk',
      ui: {
        0: {
          prepare: 'type',
          scrollTo: (b) => b.headline,
          offset: 110,
          shot: '16-internship-early-l5-message.png',
          desc: (b, l) => `Internship level ${l} (early band), day 1 at the desk, 9:40 AM: "${b.headline}" from ${b.character?.name}, with Asha's reply written in.`,
          submit: true,
          resultShot: '17-internship-early-l5-feedback.png',
          resultDesc: (g, l) => `Internship level ${l}: the graded message beat, ${g.score}/10, with feedback, the relationship change and attribute moves.`,
        },
      },
    },
    14: {
      location: null, // the room where the day opens with a conversation
      ui: {
        0: {
          repliesFirst: 2,
          scrollTo: () => 'Have you got a minute?',
          offset: 90,
          shot: '18-internship-middle-l14-conversation.png',
          desc: (b, l) => `Internship level ${l} (middle band): a live conversation with ${b.character?.name} (${b.character?.role}): the opening line, Asha's two replies and the reply between them, one reply left.`,
        },
      },
    },
    25: {
      location: 'desk',
      ui: {
        2: {
          prepare: 'choose',
          scrollTo: (b) => b.headline,
          offset: 150,
          shot: '19-internship-advanced-l25-decision.png',
          desc: (b, l) => `Internship level ${l} (advanced band), 4:30 PM decision beat: "${b.headline}" with four options and Asha's choice selected.`,
          submit: true,
          resultDesc: () => '',
        },
      },
    },
    29: {
      location: 'desk',
      ui: {
        2: {
          prepare: 'choose',
          submit: true,
          resultDesc: () => '',
          closeInUi: true,
          summaryShot: '20-internship-l30-day-summary.png',
          summaryDesc: (c) => `End of the last internship day: day summary with each beat's score, ending "Internship level ${c.internship?.level}."`,
        },
      },
    },
  }

  while (level < 30) {
    const plan = UI_DAYS[level] && !UI_DAYS[level].used ? UI_DAYS[level] : null
    if (plan) plan.used = true
    let location = plan?.location ?? LOCATIONS[dayNo % LOCATIONS.length]
    // A day number is the count of days so far plus one; on an even day the
    // manager's office opens with a conversation, on an odd one the meeting room does.
    if (plan && plan.location === null) location = (dayNo + 1) % 2 === 0 ? 'manager' : 'meeting'
    const { dayRec, res } = await workday({ phase: 'internship', location, ui: plan?.ui ?? {} })
    data.days.push(dayRec)

    if (res.career?.review?.due) {
      const rv = await must('GET', '/career/review')
      data.reviews.push({
        atLevel: rv.data.level,
        band: rv.data.band?.name,
        scores: rv.data.review?.scores,
        levelsCounted: rv.data.review?.levels,
        averageLevelScore: rv.data.review?.averageLevelScore,
        meanAttribute: rv.data.review?.meanAttribute,
        meanRelationship: rv.data.review?.meanRelationship,
        advocates: rv.data.review?.advocates,
        detractors: rv.data.review?.detractors,
        summary: rv.data.summary,
        feedback: rv.data.feedback,
        goal: rv.data.goal ? `${rv.data.goal.name} ${rv.data.goal.value}: ${rv.data.goal.challenge}` : null,
        source: rv.data.source,
      })
      step({ phase: 'internship', level, label: 'periodic review', endpoint: 'GET /api/career/review', via: 'api', status: rv.status, score: rv.data.review?.meanAttribute, verdict: rv.data.summary, xpAfter: await xpNow(), at: rv.at, ms: rv.ms })
    }
    if (level === 12 && !snapshots.internship12) await snapshot('internship12')
    if (level === 22 && !snapshots.internship22) await snapshot('internship22')
    if (dayNo > 60) throw new Error('The internship is not advancing.')
  }
  await snapshot('internship30')

  /* ----------------------------------------------------------- the offer -- */

  r = await must('GET', '/offer')
  const offer0 = r.data.offer
  step({ phase: 'offer', label: 'offer built', endpoint: 'GET /api/offer', via: 'api', status: r.status, score: offer0.total, verdict: `${offer0.title} at ${offer0.company}, ${offer0.total} LPA`, xpAfter: await xpNow(), at: r.at, ms: r.ms })
  data.offer = {
    initial: {
      company: offer0.company,
      title: offer0.title,
      fixed: offer0.fixed,
      variable: offer0.variable,
      joiningBonus: offer0.joiningBonus,
      total: offer0.total,
      benefits: offer0.benefits,
      location: offer0.location,
      workingModel: offer0.workingModel,
      probation: offer0.probation,
    },
    review: { scores: offer0.review.scores, summary: offer0.review.summary, feedback: offer0.review.feedback, ...r.data.review },
  }

  await go('/offer', 'End of internship review')
  await top()
  await shot('21-offer-performance-review.png', `End-of-internship performance review on the offer screen: "${offer0.review.summary}" and four competency scores.`)
  await scrollToText('Total CTC, LPA', 190)
  await shot('22-offer-terms.png', `The offer: ${offer0.title} at ${offer0.company}, ${offer0.total} LPA total (${offer0.fixed} fixed + ${offer0.variable} variable), with location, model, joining date and benefits.`)

  // One ask, with a number and the work behind it.
  const days = data.days
  const beatsAll = days.flatMap((d) => d.beats)
  const meanBeat = Math.round((beatsAll.reduce((s, b) => s + b.score, 0) / beatsAll.length) * 10) / 10
  const ask = Math.round(offer0.fixed * 1.1 * 2) / 2
  const strongest = Object.entries(offer0.review.scores).sort((a, b) => b[1] - a[1])[0]
  const message =
    `Hi ${team.manager}, thank you for the offer and for the review; I want to accept it. ` +
    `Before I sign, I would like to ask for a fixed component of ${ask.toFixed(1)} LPA. ` +
    `During the internship I worked ${days.length} days and cleared every level from 5 to 30, the situations I handled averaged ${meanBeat}/10, ` +
    `and my review puts ${strongest[0].toLowerCase()} at ${strongest[1]}/100. ` +
    `If the fixed pay cannot move that far, a joining bonus would also work for me.`
  r = await must('POST', '/offer/negotiate', { message })
  const neg = r.data
  step({ phase: 'offer', label: 'negotiation round 1', endpoint: 'POST /api/offer/negotiate', via: 'api', status: r.status, score: Math.round(Object.values(neg.scores).reduce((a, b) => a + b, 0) / 5), verdict: neg.result, xpAfter: await xpNow(), at: r.at, ms: r.ms })
  data.offer.negotiation = {
    message,
    asked: { fixed: ask },
    result: neg.result,
    scores: neg.scores,
    reaction: neg.reaction,
    coaching: neg.coaching,
    moved: neg.moved,
    roundsUsed: neg.roundsUsed,
    roundsLeft: neg.roundsLeft,
    after: { fixed: neg.offer.fixed, variable: neg.offer.variable, joiningBonus: neg.offer.joiningBonus, total: neg.offer.total, benefits: neg.offer.benefits },
    badges: neg.badges?.map((b) => b.name),
    source: neg.source,
  }

  await go('/offer', 'The conversation')
  await scrollToText('The conversation', 64)
  await shot('23-offer-negotiation-result.png', `Negotiation, round 1: Asha's message, the result "${neg.result}" (fixed +${neg.moved?.fixed} LPA) and the manager's reply.`)

  // Accepting is done on the page, because the signed screen only exists there.
  await top()
  m = mark()
  await click('Accept', 'starts')
  const dec = await uiCall('/offer/decide', m)
  await waitText('Signed')
  await top()
  await shot('24-offer-accepted.png', `Offer accepted: "Signed", ${dec.res.ctc} LPA as ${dec.res.grade} at ${dec.res.offer?.company}.`)
  step({ phase: 'offer', label: 'accept', endpoint: 'POST /api/offer/decide', via: 'ui', status: dec.status, score: dec.res.ctc, verdict: dec.res.accepted ? `accepted as ${dec.res.grade}` : 'declined', xpAfter: dec.res.user?.xp, at: dec.at, ms: dec.ms })
  data.offer.final = { accepted: dec.res.accepted, ctc: dec.res.ctc, grade: dec.res.grade, fixed: dec.res.offer?.fixed, variable: dec.res.offer?.variable, joiningBonus: dec.res.offer?.joiningBonus, total: dec.res.offer?.total }
  await blank()
  await snapshot('afterOffer')

  /* ----------------------------------------------------------- full-time -- */

  let promo = (await must('GET', '/offer')).data.promotion
  let ftDays = 0
  while (!promo.ready && ftDays < 30) {
    ftDays += 1
    const { dayRec } = await workday({ phase: 'fulltime', location: LOCATIONS[dayNo % LOCATIONS.length] })
    data.fulltimeDays.push(dayRec)
    promo = (await must('GET', '/offer')).data.promotion
  }
  data.promotion = { daysWorked: ftDays, before: promo }

  await go('/offer', 'Next grade')
  await top()
  await shot('25-fulltime-promotion-ready.png', `Full-time as ${promo.grade?.name}: next grade ${promo.next}, every requirement met (${promo.requirements.map((x) => `${x.label} ${x.have}/${x.need}`).join(', ')}).`)
  m = mark()
  await click('Take the promotion')
  const pr = await uiCall('/offer/promote', m)
  await waitFor(`!document.body.textContent.includes('Take the promotion')`)
  await sleep(1200)
  await top()
  step({ phase: 'fulltime', label: 'promotion', endpoint: 'POST /api/offer/promote', via: 'ui', status: pr.status, score: pr.res.ctc, verdict: pr.status === 200 ? `${pr.res.from} -> ${pr.res.grade}` : pr.res.error, xpAfter: pr.res.user?.xp, at: pr.at, ms: pr.ms })
  data.promotion.result = pr.res
  await shot('26-fulltime-promoted.png', `After the promotion: ${pr.res.grade} at ${pr.res.ctc} LPA, with the requirements for ${pr.res.promotion?.next}.`)

  /* -------------------------------------------------------------- the end -- */

  await snapshot('end')
  const b = await must('GET', '/career/badges')
  data.badges = { earned: b.data.earned, of: b.data.list.length, list: b.data.list.filter((x) => x.earned).map((x) => ({ name: x.name, slug: x.slug, why: x.why, at: x.at })) }

  await go('/career', 'The journey')
  await js(`(() => { const t = [...document.querySelectorAll('*')].filter((e) => !e.children.length && e.textContent.trim() === 'Full-Time').at(-1); t.scrollIntoView({ block: 'start' }); window.scrollBy(0, -410); return true })()`)
  await shot('27-career-all-phases.png', 'Career journey at the end: Joining, Internship and The Offer done (Group Discussion and Interview above, also done), Full-Time current.')
  await go('/dashboard', 'Current objective')
  await scrollToText('Current objective', 64)
  await shot('28-dashboard-final.png', 'Dashboard at the end: current objective, "Your career: Full-time", and the three attributes that most need work.')
  await go('/profile', 'What Knack has learned')
  await scrollToText('What Knack has learned', 64)
  await shot('29-profile-training.png', 'Profile: "What Knack has learned about you", the training profile built from the play-through.')
  await go('/badges', 'earned')
  await top()
  await shot('30-badges.png', `Badges: ${data.badges.earned} of ${data.badges.of} earned.`)
} catch (err) {
  failure = String(err.stack ?? err)
  console.error(err)
  // What the page looked like when it stopped, kept out of the figures folder.
  try {
    const r = await cdp('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(tmpdir(), 'knack-levels-failure.png'), Buffer.from(r.data, 'base64'))
    console.error('page at failure:', join(tmpdir(), 'knack-levels-failure.png'))
    console.error(String(await js('document.body.innerText')).slice(0, 1500))
  } catch {}
} finally {
  await sleep(500)
  const ended = Date.now()
  const byVia = (v) => calls.filter((c) => c.via === v).length
  const report = {
    generatedAt: new Date().toISOString(),
    base,
    note: 'One trainee played through every phase of Knack against an offline server (KNACK_OFFLINE=1). Every value here was returned by the API; steps marked via "ui" were played in the real interface and read off its network traffic.',
    account: me ? { name: me.name, email: me.email, id: me.id } : null,
    onboarding: me ? { yearOfStudy: me.yearOfStudy, branch: me.branch, targetRole: me.targetRole, experience: me.experience, workSetting: me.workSetting, focusAreas: me.focusAreas, confidence: me.confidence } : null,
    stoppedAt,
    failure,
    totals: {
      apiCalls: calls.length,
      apiCallsFromScript: byVia('api'),
      apiCallsFromPage: byVia('ui'),
      steps: steps.length,
      internshipDays: data.days.length,
      fulltimeDays: data.fulltimeDays.length,
      wallMs: ended - T0,
      startedAt: new Date(T0).toISOString(),
      endedAt: new Date(ended).toISOString(),
    },
    retries: retries.length ? retries : 'none: every gate passed on the first attempt',
    uiIssues: data.uiIssues ?? [],
    attributes: snapshots,
    gd: data.gd ?? null,
    interview: data.interview,
    joining: data.joining ?? null,
    internship: {
      days: data.days,
      levelsCleared: data.days.filter((d) => d.advanced).length,
      meanDayScore: data.days.length ? Math.round((data.days.reduce((s, d) => s + (d.mean ?? 0), 0) / data.days.length) * 100) / 100 : null,
      reviews: data.reviews,
    },
    offer: data.offer ?? null,
    fulltime: { days: data.fulltimeDays, promotion: data.promotion ?? null },
    badges: data.badges ?? null,
    screenshots: shots,
    steps,
    calls,
  }
  writeFileSync(dataFile, JSON.stringify(report, null, 2))
  console.log(`\nwrote ${dataFile}: ${steps.length} steps, ${calls.length} calls, ${Math.round((ended - T0) / 1000)}s${failure ? ' (FAILED)' : ''}`)
  ws.close()
  edge.kill()
}
