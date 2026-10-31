/**
 * Unlocks everything for an existing account by playing it through every gate.
 *
 *   node scripts/unlock.mjs you@example.com [another@example.com ...]
 *
 * Nothing is skipped and no progress column is written by hand: the account is
 * played through the app's own API, in order, so every screen it unlocks has
 * the rows behind it that the screen expects. That means the group discussion,
 * a mock and the real round for each of the five interview rounds, joining,
 * working days in the office until internship level 30, and accepting the
 * offer, which lands the account in Full-Time with every phase open.
 *
 * It starts its own offline API on a spare port, against the same database the
 * app uses, so the answers are scored by the local rubrics and no model quota is
 * spent. A copy of the database is taken first (data/knack.backup-<time>.db);
 * to undo, stop the app and copy it back over data/knack.db.
 */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { db, findUserById } from '../src/db.js'
import { createSession, destroySession, SESSION_COOKIE } from '../src/auth.js'
import { BANK_A } from '../src/mock/bank-a.js'
import { BANK_B } from '../src/mock/bank-b.js'

const here = dirname(fileURLToPath(import.meta.url))
const serverDir = join(here, '..')
const PORT = Number(process.env.UNLOCK_PORT || 5195)
const base = `http://127.0.0.1:${PORT}/api`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const emails = process.argv.slice(2)
if (!emails.length) {
  console.error('usage: node scripts/unlock.mjs <email> [<email> ...]')
  process.exit(1)
}

/* ------------------------------------------------------------ answers ---- */

// Written to clear the offline rubrics honestly: long enough, specific, owned,
// and in the discussion, built on what others said.
const GD_LINES = [
  'I agree that this needs a clear rule, and building on the point already made, I think the real question is who carries the risk. If we define that first, for example by asking what happens in the worst case for each side, the rest gets much easier and we stop talking past each other.',
  'Building on what was just said, I partly disagree. The strongest point on the other side is fairness, but fairness cuts both ways. I would separate the cases where people choose this freely from the cases where they have no real choice, because the answer is different for each of them.',
  'Let me try to pull the points together. I agree with the concern about misuse, and I also agree it should not become a blanket ban. A middle ground is simple: allow it, make it transparent, and review it after six months with real numbers rather than opinions.',
  'To close from my side, the point I would leave the panel with is that a good rule is one people can actually follow. If we keep it simple, measurable and reviewed, I think both sides in this room get most of what they asked for today.',
]

const INTERVIEW = [
  'First, a little context. I am a final-year Information Science student, and over the last 2 years I built 3 projects with friends, including a canteen pre-order app that about 400 students used. I chose those projects because I like problems where real people feel the result the same week. For example, when orders spiked at 1 pm, I rewrote the queue so that the kitchen saw orders in batches instead of one by one, and the wait dropped from roughly 15 minutes to 6. That is the kind of work I want to keep doing in this role.',
  'There was a time I disagreed with a teammate about whether to ship a feature before our college demo. Instead of arguing in the group chat, I first asked for 10 minutes to compare both options on the 2 things that mattered: how many users it affected and how risky it was. I wrote both down, we picked the safer option, and I took responsibility for the follow-up the next week. I learned that most disagreements get easier when you agree on what you are measuring before you argue about the answer, so that is what I do now.',
  'If I joined, the first thing I would do is listen, because a new person who changes things in week 1 usually breaks something they did not understand. For example, in my internship I spent the first 5 days reading the code and asking questions before I touched anything, and then I fixed 2 small bugs the team had been living with. I would also ask you something back: what does a good first 90 days look like for someone in this role, and what is the most common reason new people struggle here? That would help me plan properly.',
]

const WRITTEN =
  'Thanks for flagging this. I will take it from here. First I will check the logs and confirm exactly which part is broken, then I will send you a short update by 4 pm today with what I found and what I plan to do next. If the fix looks bigger than 2 hours, I will tell you before I start, so we can decide together whether it should wait. Could you confirm whether anyone else depends on this, so I do not miss them?'

const DIALOGUE = [
  'I understand, and thanks for raising it with me directly. You mentioned the deadline, so here is what I will do: I will finish the part that blocks you first and send it to you by 3 pm today, then pick up the rest.',
  'That is fair, and I hear your point about the risk. I will also write down the 2 things I am not sure about and check them with the senior engineer before the end of the day, so nothing surprises you later.',
  'Agreed. I will send you a short status at 6 pm every day this week, and if anything slips by more than 1 day I will tell you the same morning, not after the fact.',
]

const LOCATIONS = ['desk', 'meeting', 'cafeteria', 'hr', 'manager']
const BANK = new Map([...BANK_A, ...BANK_B].map((q) => [q.id, q]))

/* ---------------------------------------------------------------- api ---- */

let cookie = ''
async function api(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${data.error ?? JSON.stringify(data).slice(0, 200)}`)
  return data
}

const me = async () => (await api('GET', '/auth/me')).user

/* -------------------------------------------------------------- phases --- */

async function groupDiscussion() {
  const start = await api('POST', '/gd/start', {})
  let r = { closed: false }
  for (let beat = 0; beat < 8 && !r.closed; beat++) {
    r = await api('POST', '/gd/turn', { runId: start.runId, text: GD_LINES[beat] ?? '' })
  }
  const fin = await api('POST', '/gd/finish', { runId: start.runId })
  return `group discussion ${fin.score}/10`
}

async function interviewRound(level) {
  const mock = await api('POST', '/mock/start', { level })
  for (let i = 0; i < mock.questions.length; i++) {
    const q = mock.questions[i]
    const known = BANK.get(q.id)
    const best = known ? known.options.reduce((b, o) => (o.score > b.score ? o : b)).text : null
    const k = Math.max(0, q.options.findIndex((o) => o.text === best))
    await api('POST', '/mock/answer', { runId: mock.runId, index: i, choice: k })
  }
  const mf = await api('POST', '/mock/finish', { runId: mock.runId })
  const iv = await api('POST', '/interview/start', { level })
  const sub = await api('POST', '/interview/submit', {
    runId: iv.runId,
    answers: iv.questions.map((_, i) => INTERVIEW[i % INTERVIEW.length]),
  })
  return `round ${level}: mock ${mf.score}/10, real ${sub.score}/10`
}

async function beat(b) {
  if (b.kind === 'decision') {
    const i = (b.options ?? []).findIndex((o) => /straight answer now/i.test(typeof o === 'string' ? o : o.text))
    return api('POST', '/workplace/answer', { choice: i >= 0 ? i : 0 })
  }
  if (b.kind === 'dialogue') {
    const mine = (b.turns ?? []).filter((t) => t.who === 'you').length
    for (let k = mine; k < DIALOGUE.length; k++) await api('POST', '/workplace/dialogue', { text: DIALOGUE[k] })
    return api('POST', '/workplace/answer', {})
  }
  return api('POST', '/workplace/answer', { text: WRITTEN })
}

async function workday(n) {
  const w = await api('GET', '/workplace')
  let current
  if (w.open) {
    current = w.open.beats[w.open.at]
  } else {
    const d = await api('POST', '/workplace/day', { locationId: LOCATIONS[n % LOCATIONS.length] })
    current = d.beats[d.at]
  }
  while (current) {
    const a = await beat(current)
    current = a.next ?? null
  }
  const c = await api('POST', '/workplace/close')
  return c.summary?.meanScore
}

async function unlock(email) {
  const user = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(email)
  if (!user) throw new Error(`no account for ${email}`)
  const { token } = createSession(user.id)
  cookie = `${SESSION_COOKIE}=${token}`
  const log = []
  try {
    let u = await me()
    if (!u.onboardedAt) throw new Error('finish onboarding in the app first')
    if (!findUserById(user.id).simCompanyId) {
      const role = ['swe', 'data', 'product', 'qa', 'hr'].includes(u.targetRole) ? u.targetRole : 'swe'
      await api('POST', '/career/company', { companyId: 'zoho', roleId: role })
      log.push('company: Zoho')
    }

    for (let guard = 0; guard < 200; guard++) {
      u = findUserById(user.id)
      if (u.phase === 'gd') log.push(await groupDiscussion())
      else if (u.phase === 'interview') log.push(await interviewRound(u.interviewLevel ?? 1))
      else if (u.phase === 'joining') {
        await api('POST', '/career/join', {})
        log.push('joined the team')
      } else if (u.phase === 'internship') {
        const before = u.internshipLevel
        const mean = await workday(guard)
        if (findUserById(user.id).internshipLevel === 30 || guard % 5 === 0) log.push(`internship level ${before}: day ${mean}`)
      } else if (u.phase === 'offer') {
        const o = await api('GET', '/offer')
        const d = await api('POST', '/offer/decide', { accept: true })
        log.push(`offer accepted: ${d.ctc ?? o.offer?.total} LPA as ${d.grade ?? 'Junior'}`)
      } else break
    }
    u = findUserById(user.id)
    return { email, phase: u.phase, interviewLevel: u.interviewLevel, internshipLevel: u.internshipLevel, jobTitle: u.jobTitle, ctc: u.ctc, log }
  } finally {
    destroySession(token)
  }
}

/* --------------------------------------------------------------- main ---- */

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backup = join(dirname(db.name), `knack.backup-${stamp}.db`)
await db.backup(backup)
console.log('backup:', backup)

const server = spawn(process.execPath, ['src/index.js'], {
  cwd: serverDir,
  env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', KNACK_OFFLINE: '1', OPENROUTER_API_KEY: '' },
  stdio: 'ignore',
})
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${base}/health`)).ok) break } catch { /* not up yet */ }
    await sleep(250)
  }
  for (const email of emails) {
    try {
      const r = await unlock(email)
      console.log(`\n${email}: ${r.phase}` + (r.jobTitle ? `, ${r.jobTitle} at ${r.ctc} LPA` : ''))
      for (const line of r.log) console.log('  ' + line)
    } catch (e) {
      console.log(`\n${email}: stopped, ${e.message}`)
    }
  }
} finally {
  server.kill()
}
