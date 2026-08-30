/**
 * Slide overflow check.
 *
 * Every slide is a fixed 1024x768 box with `overflow:hidden`, which means a
 * slide that has grown too tall does not look broken on screen — it just
 * silently loses its last row. Adding table rows to this deck without a check
 * is therefore a good way to ship a table whose final entry nobody can see.
 *
 * Run:  node docs/check-overflow.mjs [file.html]
 * Needs Edge or Chrome; it drives one through the DevTools protocol.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]

const file = resolve(process.argv[2] ?? 'docs/Knack_Phase2_Presentation.html')
const exe = BROWSERS.find((b) => existsSync(b))
if (!exe) {
  console.error('No Edge or Chrome found. Checked:\n  ' + BROWSERS.join('\n  '))
  process.exit(1)
}

const PORT = 9223
const profile = mkdtempSync(join(tmpdir(), 'knack-check-'))

const browser = spawn(
  exe,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--disable-gpu',
    `file:///${file.replace(/\\/g, '/')}`,
  ],
  { stdio: 'ignore' }
)

/** The debugging endpoint is not up the instant the process is. */
async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page.webSocketDebuggerUrl
    } catch {
      /* not listening yet */
    }
    await delay(250)
  }
  throw new Error('browser never exposed a debugging target')
}

const ws = new WebSocket(await target())
await new Promise((ok, no) => {
  ws.addEventListener('open', ok, { once: true })
  ws.addEventListener('error', no, { once: true })
})

let id = 0
const pending = new Map()
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
})
const send = (method, params) =>
  new Promise((ok) => {
    const n = ++id
    pending.set(n, ok)
    ws.send(JSON.stringify({ id: n, method, params }))
  })

// Fonts and layout settle a beat after load.
await delay(1500)

const probe = `
(() => {
  const out = []
  document.querySelectorAll('.sl').forEach((sl, i) => {
    const cs = getComputedStyle(sl)
    const room = sl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    let used = 0
    for (const child of sl.children) {
      const r = child.getBoundingClientRect()
      used = Math.max(used, r.bottom - sl.getBoundingClientRect().top - parseFloat(cs.paddingTop))
    }
    const title = (sl.querySelector('h1')?.textContent ?? '(title slide)').trim().slice(0, 46)
    out.push({ n: i + 1, title, room: Math.round(room), used: Math.round(used) })
  })
  return JSON.stringify(out)
})()`

const { result } = await send('Runtime.evaluate', { expression: probe, returnByValue: true })
const slides = JSON.parse(result.result.value)

let bad = 0
for (const s of slides) {
  const over = s.used - s.room
  const flag = over > 0 ? 'OVERFLOW' : over > -24 ? 'tight' : 'ok'
  if (over > 0) bad++
  if (flag !== 'ok') {
    console.log(
      `${String(s.n).padStart(2)}. ${flag.padEnd(9)} ${String(over > 0 ? '+' + over : over).padStart(5)}px  ${s.title}`
    )
  }
}
console.log(`\n${slides.length} slides checked, ${bad} overflowing.`)

ws.close()
browser.kill()
process.exit(bad > 0 ? 1 : 0)
