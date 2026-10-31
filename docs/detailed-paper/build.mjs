// Builds the detailed IEEE paper from paper.src.html.
//
//   node docs/detailed-paper/build.mjs          -> HTML only
//   node docs/detailed-paper/build.mjs --pdf    -> HTML and PDF (Edge, headless)
//
// The source uses keys instead of numbers so that nothing has to be renumbered
// by hand when a section moves:
//   [@key] or [@a;@b]            citation, numbered by first use (IEEE order)
//   <li data-ref="key">          a reference entry
//   data-fig="key" on figcaption Fig. N.      {fig:key} -> N
//   data-tab="key" on .cap       TABLE N (roman) {tab:key} -> N
//   <span class="no" data-eq="key"></span>   (n)   {eq:key} -> (n)
//   <!--#include file.html-->   pasted in from this folder
// The build fails if a citation has no entry, an entry is never cited, or a
// figure, table or equation is referenced but not defined.
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outHtml = join(here, '..', 'Knack_Detailed_Research_Paper.html')
const outPdf = join(here, '..', 'Knack_Detailed_Research_Paper.pdf')

let src = readFileSync(join(here, 'paper.src.html'), 'utf8')
src = src.replace(/<!--#include ([\w.-]+)-->/g, (_, f) => readFileSync(join(here, f), 'utf8'))

const errors = []
const roman = (n) => {
  const t = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let s = ''
  for (const [v, r] of t) while (n >= v) { s += r; n -= v }
  return s
}

// ---- references: split the list off so citations inside it are not counted
const refsOpen = src.indexOf('<ol class="refs">')
const refsClose = src.indexOf('</ol>', refsOpen)
if (refsOpen < 0) throw new Error('no <ol class="refs">')
const body = src.slice(0, refsOpen)
const tail = src.slice(refsClose)
const entries = new Map()
for (const m of src.slice(refsOpen, refsClose).matchAll(/<li data-ref="([\w-]+)">([\s\S]*?)<\/li>/g)) {
  if (entries.has(m[1])) errors.push(`duplicate reference key ${m[1]}`)
  entries.set(m[1], m[2].trim())
}

const order = []
const number = (key) => {
  if (!entries.has(key)) { errors.push(`cited but not defined: ${key}`); return '?' }
  if (!order.includes(key)) order.push(key)
  return order.indexOf(key) + 1
}
const format = (nums) => {
  // [3], [5]-[7]: IEEE ranges for three or more consecutive numbers
  const sorted = [...new Set(nums)].sort((a, b) => a - b)
  const parts = []
  for (let i = 0; i < sorted.length; ) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++
    if (j - i >= 2) parts.push(`[${sorted[i]}]–[${sorted[j]}]`)
    else for (let k = i; k <= j; k++) parts.push(`[${sorted[k]}]`)
    i = j + 1
  }
  return parts.join(', ')
}
let out = body.replace(/\[(@[\w-]+(?:\s*;\s*@[\w-]+)*)\]/g, (_, list) =>
  format(list.split(';').map((s) => number(s.trim().slice(1))))
)
for (const key of entries.keys()) if (!order.includes(key)) errors.push(`defined but never cited: ${key}`)
const refList = '<ol class="refs">\n' + order.map((k) => `  <li>${entries.get(k)}</li>`).join('\n') + '\n'

// ---- figures, tables, equations, numbered in document order
const label = { fig: new Map(), tab: new Map(), eq: new Map() }
out = out.replace(/<figcaption data-fig="([\w-]+)">/g, (_, k) => {
  label.fig.set(k, label.fig.size + 1)
  return `<figcaption>Fig. ${label.fig.size}. `
})
out = out.replace(/<div class="cap" data-tab="([\w-]+)">/g, (_, k) => {
  label.tab.set(k, roman(label.tab.size + 1))
  return `<div class="cap">TABLE ${label.tab.get(k)}`
})
out = out.replace(/<span class="no" data-eq="([\w-]+)"><\/span>/g, (_, k) => {
  label.eq.set(k, label.eq.size + 1)
  return `<span class="no">(${label.eq.size})</span>`
})
out = out.replace(/\{(fig|tab|eq):([\w-]+)\}/g, (_, kind, k) => {
  const v = label[kind].get(k)
  if (v == null) { errors.push(`${kind} not defined: ${k}`); return '??' }
  return kind === 'eq' ? `(${v})` : String(v)
})

if (errors.length) {
  console.error(errors.join('\n'))
  // --draft renders anyway, so the layout can be checked before every figure exists
  if (!process.argv.includes('--draft')) process.exit(1)
}

writeFileSync(outHtml, out + refList + tail)
console.log(`html: ${order.length} references, ${label.fig.size} figures, ${label.tab.size} tables, ${label.eq.size} equations`)

if (process.argv.includes('--pdf')) {
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  execFileSync(edge, [
    '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
    `--print-to-pdf=${outPdf}`, pathToFileURL(outHtml).href,
  ], { stdio: 'ignore', timeout: 120000 })
  console.log('pdf:', outPdf)
}
