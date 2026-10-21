/**
 * Response times and sizes, measured against a running server.
 *
 *   KNACK_OFFLINE=1 npm start        # in one terminal
 *   node scripts/measure.mjs [baseUrl] [repeats=40]
 *
 * Times are wall-clock from the client, loopback, one request at a time, on
 * whatever machine this runs on, so read them as "this is what a single trainee
 * sees on a laptop", not as a load test. With the server in offline mode no model
 * is involved, which is the case that matters here: the cost of the app's own
 * work. It creates one throwaway account.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import http from 'node:http'
import os from 'node:os'
import { gzipSync } from 'node:zlib'

const base = process.argv[2] ?? 'http://127.0.0.1:5190'
const REPEATS = Number(process.argv[3]) || 40
let cookie = ''
let failures = 0

// node:http rather than fetch. On Windows, fetch (undici) adds a flat ~15 ms to
// every loopback call, which is the timer tick and not the server, and would
// bury everything below it. A keep-alive agent with Nagle off measures the app.
const url = new URL(base)
const agent = new http.Agent({ keepAlive: true })

function call(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null
    const t0 = process.hrtime.bigint()
    const req = http.request(
      {
        host: url.hostname,
        port: url.port,
        path: `/api${path}`,
        method,
        agent,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const ms = Number(process.hrtime.bigint() - t0) / 1e6
          const set = res.headers['set-cookie'] ?? []
          if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ')
          let data = {}
          try {
            data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          } catch {}
          if (res.statusCode >= 400) failures++
          resolve({ status: res.statusCode, data, ms })
        })
      }
    )
    req.on('error', reject)
    req.setNoDelay(true)
    req.end(payload)
  })
}

const pct = (xs, p) => {
  const a = [...xs].sort((x, y) => x - y)
  return a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))]
}

const email = `measure-${Date.now()}@example.test`
await call('POST', '/auth/signup', { email, password: 'measure-pass-1', name: 'Measure' })
await call('POST', '/auth/onboarding', {
  name: 'Measure',
  yearOfStudy: 'final',
  branch: 'cse',
  targetRole: 'swe',
  experience: 'intern',
  workSetting: 'service',
  focusAreas: ['speaking'],
  confidence: { 'workplace-communication': 2, 'critical-thinking': 3, 'ai-fluency': 3 },
})

const rows = []
async function time(label, fn) {
  const ms = []
  failures = 0
  for (let i = 0; i < REPEATS; i++) ms.push(await fn(i))
  rows.push({ label, p50: pct(ms, 50), p95: pct(ms, 95), max: Math.max(...ms), failures })
}

await time('GET /api/user (profile, training, offline)', async () => (await call('GET', '/user')).ms)
await time('GET /api/career (company list, journey)', async () => (await call('GET', '/career')).ms)
await time('GET /api/career/companies/tcs', async () => (await call('GET', '/career/companies/tcs')).ms)
await time('POST /api/mock/start (five questions)', async () => (await call('POST', '/mock/start', { level: 1 })).ms)

let run = (await call('POST', '/mock/start', { level: 1 })).data
let i = 0
await time('POST /api/mock/answer', async () => {
  if (i >= 5) {
    run = (await call('POST', '/mock/start', { level: 1 })).data
    i = 0
  }
  return (await call('POST', '/mock/answer', { runId: run.runId, index: i++, choice: 0 })).ms
})

await time('POST /api/gd/start (panel, mood, pressure)', async () => (await call('POST', '/gd/start', {})).ms)
let gd = (await call('POST', '/gd/start', {})).data
let turns = 0
await time('POST /api/gd/turn (scripted panel, new mood)', async () => {
  if (gd.closed || turns >= 4) {
    gd = (await call('POST', '/gd/start', {})).data
    turns = 0
  }
  const r = await call('POST', '/gd/turn', {
    runId: gd.runId,
    text: 'I think we are skipping who actually pays for it in the long run.',
    to: null,
  })
  gd = r.data.runId ? r.data : gd
  turns++
  return r.ms
})

/* sizes ----------------------------------------------------------------- */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const assets = join(root, 'web', 'dist', 'assets')
let jsRaw = 0
let jsGz = 0
let cssRaw = 0
let cssGz = 0
let fontBytes = 0
try {
  for (const f of readdirSync(assets)) {
    const p = join(assets, f)
    const buf = readFileSync(p)
    if (f.endsWith('.js')) {
      jsRaw += buf.length
      jsGz += gzipSync(buf).length
    } else if (f.endsWith('.css')) {
      cssRaw += buf.length
      cssGz += gzipSync(buf).length
    } else if (/\.(woff2?|ttf)$/.test(f)) fontBytes += statSync(p).size
  }
} catch {
  console.log('(no web/dist build found, skipping bundle sizes)')
}

const loc = (dir) => {
  let n = 0
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) n += loc(p)
    else if (/\.(js|jsx|mjs)$/.test(e.name)) n += readFileSync(p, 'utf8').split('\n').length
  }
  return n
}

console.log(`machine: ${os.cpus()[0].model.trim()}, ${os.cpus().length} threads, ${(os.totalmem() / 2 ** 30).toFixed(0)} GB RAM, ${os.platform()} ${os.release()}, node ${process.version}`)
console.log(`repeats per endpoint: ${REPEATS}\n`)
console.log('endpoint'.padEnd(54), 'p50 ms'.padStart(8), 'p95 ms'.padStart(8), 'max ms'.padStart(8), 'errors'.padStart(7))
for (const r of rows) {
  console.log(
    r.label.padEnd(54),
    r.p50.toFixed(1).padStart(8),
    r.p95.toFixed(1).padStart(8),
    r.max.toFixed(1).padStart(8),
    String(r.failures).padStart(7)
  )
}
console.log()
console.log(`web bundle: js ${(jsRaw / 1024).toFixed(0)} kB (${(jsGz / 1024).toFixed(0)} kB gzip), css ${(cssRaw / 1024).toFixed(0)} kB (${(cssGz / 1024).toFixed(0)} kB gzip), fonts ${(fontBytes / 1024).toFixed(0)} kB`)
console.log(`source lines: server ${loc(join(root, 'server', 'src'))}, web ${loc(join(root, 'web', 'src'))}`)
