/**
 * Reads back the numbers the browser actually paints on every ordered list in
 * the deck, and checks each list runs 1..n or continues cleanly from the one
 * before it. The last bug was a `start` attribute that disagreed with reality,
 * which no amount of reading the source would have caught.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const exe = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9228

const browser = spawn(
  exe,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), 'nums-'))}`,
    '--no-first-run',
    '--disable-gpu',
    'file:///C:/Users/ishaa/knack/docs/Knack_Phase2_Presentation.html',
  ],
  { stdio: 'ignore' }
)

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page.webSocketDebuggerUrl
    } catch {}
    await delay(250)
  }
  throw new Error('no target')
}

const ws = new WebSocket(await target())
await new Promise((ok) => ws.addEventListener('open', ok, { once: true }))

let id = 0
const pending = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (pending.has(m.id)) {
    pending.get(m.id)(m)
    pending.delete(m.id)
  }
})
const send = (method, params) =>
  new Promise((ok) => {
    const n = ++id
    pending.set(n, ok)
    ws.send(JSON.stringify({ id: n, method, params }))
  })

await delay(1500)

const probe = await send('Runtime.evaluate', {
  expression: `(() => {
    const out = []
    document.querySelectorAll('ol').forEach((ol) => {
      const slide = ol.closest('.sl')
      const title = (slide?.querySelector('h1')?.textContent ?? '?').trim()
      // A list styled list-style:none paints no markers — its numbers are
      // literal text, so the browser's counter says nothing about it.
      if (getComputedStyle(ol).listStyleType === 'none') return
      const start = Number(ol.getAttribute('start') ?? 1)
      const n = ol.querySelectorAll(':scope > li').length
      out.push({ title, start, n, last: start + n - 1 })
    })
    return JSON.stringify(out)
  })()`,
  returnByValue: true,
})

const lists = JSON.parse(probe.result.result.value)
let problems = 0
const seen = new Map()

for (const l of lists) {
  const key = l.title.replace(/\s*\(CONTINUED\)\s*/i, '').trim()
  const prev = seen.get(key)

  let verdict = 'ok'
  if (prev && l.start !== prev + 1) {
    verdict = `EXPECTED START ${prev + 1}, GOT ${l.start}`
    problems++
  } else if (!prev && l.start !== 1) {
    verdict = `starts at ${l.start} with no preceding list`
  }

  seen.set(key, l.last)
  console.log(
    `${String(l.start).padStart(3)}..${String(l.last).padEnd(3)} (${String(l.n).padStart(2)} items)  ${l.title.slice(0, 34).padEnd(36)}${verdict === 'ok' ? '' : verdict}`
  )
}

console.log(`\n${lists.length} ordered lists, ${problems} numbering breaks.`)

ws.close()
browser.kill()
process.exit(problems ? 1 : 0)
