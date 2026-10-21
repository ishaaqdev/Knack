/**
 * Phone screenshots of the running app, for the paper's Fig. 4.
 *
 *   KNACK_OFFLINE=1 PORT=5191 node server/src/index.js     # the app, built web/dist, offline
 *   node docs/capture-figures.mjs http://127.0.0.1:5191
 *
 * Drives headless Edge over the DevTools protocol on a 360 x 640 viewport (9:16,
 * a phone in portrait) at 3x, signs in with throwaway accounts it creates, and
 * writes eight PNGs to docs/paper-figures/. Nothing is mocked up: each image is
 * the real interface in the state named by its file. Needs Edge at the usual path
 * (set EDGE to override) and Node 22 or newer for the built-in WebSocket.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'

const base = process.argv[2] ?? 'http://127.0.0.1:5191'
const EDGE = process.env.EDGE ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const out = join(dirname(fileURLToPath(import.meta.url)), 'paper-figures')
mkdirSync(out, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------------------------------------------------------------- the API --- */

async function account(label) {
  let cookie = ''
  const call = async (method, path, body) => {
    const res = await fetch(`${base}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const set = res.headers.getSetCookie?.() ?? []
    if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ')
    return { status: res.status, data: await res.json().catch(() => ({})) }
  }
  await call('POST', '/auth/signup', { email: `fig-${label}-${Date.now()}@example.test`, password: 'figures-pass-1', name: 'Asha Rao' })
  await call('POST', '/auth/onboarding', {
    name: 'Asha Rao',
    yearOfStudy: 'final',
    branch: 'cse',
    targetRole: 'swe',
    experience: 'intern',
    workSetting: 'service',
    focusAreas: ['speaking', 'criticism'],
    confidence: { 'workplace-communication': 2, 'critical-thinking': 3, 'ai-fluency': 3 },
  })
  const [name, ...rest] = cookie.split(';')[0].split('=')
  return { call, name, value: rest.join('=') }
}

/* ------------------------------------------------------------------- CDP --- */

const tmp = mkdtempSync(join(tmpdir(), 'knack-edge-'))
const PORT = 9333
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
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? reject(new Error(m.error.message)) : resolve(m.result)
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

const W = 360
const H = 640
async function phone() {
  await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 3, mobile: true })
  await cdp('Emulation.setTouchEmulationEnabled', { enabled: true })
}
async function go(path, wait = 1800) {
  await cdp('Page.navigate', { url: `${base}${path}` })
  await sleep(wait)
}
const clickText = (selector, text) =>
  js(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.textContent.includes(${JSON.stringify(text)})); if (!el) return false; el.scrollIntoView({block:'center'}); el.click(); return true })()`)
// Scroll so the first element whose own text matches sits just under the sticky header.
const scrollToText = (text, offset = 72, exact = false) =>
  js(`(() => { const want = ${JSON.stringify(text.toLowerCase())}; const el = [...document.querySelectorAll('h1,h2,h3,p,span,div')].find(e => { if (e.children.length) return false; const t = e.textContent.trim().toLowerCase(); return ${exact} ? t === want : t.includes(want) }); if (!el) return false; el.scrollIntoView({block:'start'}); window.scrollBy(0, -${offset}); return true })()`)
const scrollToP = (startsWith, offset = 80) =>
  js(`(() => { const el = [...document.querySelectorAll('p')].find(p => p.textContent.trim().startsWith(${JSON.stringify(startsWith)})); if (!el) return false; el.scrollIntoView({block:'start'}); window.scrollBy(0, -${offset}); return true })()`)

async function shot(name) {
  await sleep(500)
  const r = await cdp('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(out, name), Buffer.from(r.data, 'base64'))
  console.log('wrote', name)
}

async function signIn(acct) {
  await cdp('Network.enable')
  await cdp('Network.setCookie', { name: acct.name, value: acct.value, url: base, httpOnly: true })
}

/* ------------------------------------------------------------------ shots --- */

try {
  await cdp('Page.enable')
  await phone()

  /* A: nothing done yet. */
  const a = await account('a')
  await signIn(a)

  // 1. A real company: description, hiring steps, simulated openings.
  await go('/career')
  await clickText('button', 'Infosys')
  await sleep(1200)
  if (!(await scrollToText('What is open', 70))) await scrollToText('Where are you applying')
  await shot('phone-1-company.png')

  // 2. The level map for the five interview rounds.
  await go('/interview')
  await scrollToText('The rounds')
  await sleep(1200)
  await shot('phone-2-level-map.png')

  // 3 and 4. A mock question, and the same question once it has been answered.
  await go('/interview')
  await clickText('button', 'Start')
  await sleep(1800)
  await js('window.scrollTo(0, 0)')
  await shot('phone-3-mock-question.png')
  await js(`(() => { const opts = [...document.querySelectorAll('button.card')]; (opts[1] ?? opts[0])?.click() })()`)
  await sleep(1500)
  await js('window.scrollTo(0, 150)')
  await shot('phone-4-mock-explained.png')

  // 5. A panellist's profile, opened from the roster before the discussion starts.
  await go('/gd')
  await clickText('button', 'Vikram')
  await sleep(1200)
  await shot('phone-5-panel-profile.png')
  await js(`document.querySelector('[role="dialog"] button[aria-label="Close"]')?.click()`)
  await sleep(900)

  // 6 and 7. The room: the mood strip with the current speaker, then the conversation.
  await clickText('button', 'Start a discussion')
  await sleep(9000)
  await js(`(() => { const t = document.querySelector('textarea'); if (t) t.focus() })()`)
  await cdp('Input.insertText', { text: 'I see the point, but we should ask who pays for this in the long run.' })
  await sleep(300)
  await clickText('button', 'Say this')
  await sleep(10000)
  if (!(await scrollToP('Room:'))) await js('window.scrollTo(0, 100)')
  await shot('phone-6-room-mood.png')
  if (!(await scrollToText('Discussion', 76, true))) await js('window.scrollTo(0, 600)')
  await shot('phone-7-discussion.png')

  /* B: a few mocks and a discussion done through the API, so the profile has something to show. */
  const b = await account('b')
  await b.call('POST', '/career/company', { companyId: 'infosys', roleId: 'swe' })
  for (let m = 0; m < 3; m++) {
    const run = (await b.call('POST', '/mock/start', { level: 1 })).data
    for (let i = 0; i < run.questions.length; i++) {
      await b.call('POST', '/mock/answer', { runId: run.runId, index: i, choice: (i + m) % 4 })
    }
    await b.call('POST', '/mock/finish', { runId: run.runId })
  }
  const gd = (await b.call('POST', '/gd/start', {})).data
  await b.call('POST', '/gd/turn', { runId: gd.runId, text: 'I agree with part of that, but we are skipping who actually pays for it.', to: null })
  await b.call('POST', '/gd/finish', { runId: gd.runId })

  // 8. What the system has learned about the trainee.
  await signIn(b)
  await go('/profile')
  await scrollToText('What Knack has learned')
  await sleep(800)
  await shot('phone-8-training-profile.png')
} finally {
  ws.close()
  edge.kill()
}
