/**
 * End-to-end smoke test against a running server.
 *
 *   node scripts/smoke.mjs [baseUrl]
 *
 * Signs up a throwaway account, walks the new flows (company profile, mock
 * interview, group discussion with mood and profiles, offline switch), prints
 * what it found. The account stays in the local database (there is no
 * delete-account route). Exits non-zero on the first failure.
 * It never needs a model: run the server with KNACK_OFFLINE=1 and everything
 * below still has to work, which is the point.
 */

const base = process.argv[2] ?? 'http://127.0.0.1:5190'
let cookie = ''
let failed = 0

async function call(method, path, body) {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const set = res.headers.getSetCookie?.() ?? []
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ')
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

function check(label, ok, detail = '') {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? `  (${detail})` : ''}`)
  if (!ok) failed++
}

const email = `smoke-${Date.now()}@example.test`

// --- account ---------------------------------------------------------------
let r = await call('POST', '/auth/signup', { email, password: 'smoke-test-pass-1', name: 'Smoke Tester' })
check('signup', r.status === 201, r.status)

r = await call('POST', '/auth/onboarding', {
  name: 'Smoke Tester',
  yearOfStudy: 'final',
  branch: 'cse',
  targetRole: 'swe',
  experience: 'intern',
  workSetting: 'service',
  focusAreas: ['speaking', 'criticism'],
  confidence: { 'workplace-communication': 2, 'critical-thinking': 3, 'ai-fluency': 3 },
})
check('onboarding', r.status === 200 || r.status === 201, r.data.error ?? r.status)
if (failed) {
  console.log('\nSetup failed, stopping.')
  process.exit(1)
}

// --- settings --------------------------------------------------------------
r = await call('GET', '/settings')
check('settings readable', r.status === 200 && typeof r.data.offline === 'boolean', JSON.stringify(r.data))
const lockedByEnv = r.data.lockedByEnv

// --- companies -------------------------------------------------------------
r = await call('GET', '/career')
check('career lists real and invented companies', r.data.companies?.length >= 16, `${r.data.companies?.length}`)
check('real companies are flagged', r.data.companies?.some((c) => c.id === 'tcs' && c.real))

r = await call('GET', '/career/companies/tcs')
check('company profile has turnover, headcount, openings',
  r.data.revenue?.label && r.data.employees > 0 && r.data.openings?.length === 5,
  `${r.data.revenue?.label}, ~${r.data.employeesLabel}`)
check('openings are labelled as simulated', /simulated/i.test(r.data.disclaimer ?? ''))

r = await call('POST', '/career/company', { companyId: 'infosys', roleId: 'swe' })
check('choose a real company', r.status === 200 && r.data.company?.name === 'Infosys', r.data.error ?? '')
r = await call('GET', '/career')
check('chosen company profile comes back on /career', r.data.companyProfile?.id === 'infosys')

// --- group discussion ------------------------------------------------------
r = await call('POST', '/gd/start', {})
check('gd start', r.status === 200 && r.data.runId, r.data.error ?? '')
const gd = r.data
check('panel carries profiles and drawn looks',
  gd.panel?.length === 5 && gd.panel.every((p) => p.tagline && p.background && p.look?.skin))
check('panel hides prompt-only fields', gd.panel?.every((p) => p.how === undefined))
check('mood present with tension, warmth, energy',
  gd.mood && ['tension', 'warmth', 'energy'].every((k) => Number.isFinite(gd.mood[k])), gd.mood?.label)
check('panel intensity is explained', gd.pressure?.why?.length > 10, gd.pressure?.label)

let last = gd
for (let i = 0; i < 4 && !last.closed; i++) {
  r = await call('POST', '/gd/turn', {
    runId: gd.runId,
    text:
      i === 1
        ? ''
        : 'I agree with part of that, but I think we are skipping who actually pays for it in the long run.',
    to: i === 2 ? 'Vikram' : null,
  })
  check(`gd turn ${i + 1}`, r.status === 200, r.data.error ?? '')
  last = r.data
}
check('mood updates between turns', last.mood && last.mood.people?.length === 5, last.mood?.label)
const lines = (last.transcript ?? []).map((t) => t.text).join(' ')
check('no dashes in the panel talk', !/[—–]/.test(lines))

r = await call('POST', '/gd/finish', { runId: gd.runId })
check('gd finish', r.status === 200 && Number.isFinite(r.data.score), r.data.error ?? '')

// --- mock interview --------------------------------------------------------
r = await call('POST', '/interview/start', { level: 1 })
check('a real round is refused until its mock is done', r.status === 409 && r.data.needsMock, r.data.error?.slice(0, 40))

r = await call('POST', '/mock/start', { level: 1 })
check('mock start', r.status === 200 && r.data.questions?.length === 5, r.data.error ?? '')
const mock = r.data
check('questions arrive without the answer key',
  mock.questions.every((q) => q.options.length === 4 && q.options.every((o) => o.score === undefined && o.why === undefined)))
check('interviewer persona attached', !!mock.interviewer?.name, mock.interviewer?.name)

let again = null
for (let i = 0; i < mock.questions.length; i++) {
  r = await call('POST', '/mock/answer', { runId: mock.runId, index: i, choice: i % 4 })
  if (i === 0) again = r.data
  check(`mock answer ${i + 1} explains every option`,
    r.status === 200 && r.data.options?.length === 4 && r.data.options.every((o) => o.why), `scored ${r.data.score}`)
}
r = await call('POST', '/mock/answer', { runId: mock.runId, index: 0, choice: (again.choice + 1) % 4 })
check('re-answering returns the first answer', r.data.choice === again.choice && r.data.score === again.score)

r = await call('POST', '/mock/finish', { runId: mock.runId })
check('mock finish', r.status === 200 && Number.isFinite(r.data.score), `${r.data.score}/10, +${r.data.xp?.total} XP`)
check('mock updates the training profile', r.data.profile?.mock?.answered === 5)

r = await call('POST', '/mock/start', { level: 1 })
const second = r.data
r = await call('POST', '/interview/start', { level: 1 })
check('real round opens once the mock is done', r.status === 200 && r.data.questions?.length >= 2, r.data.error ?? '')

// --- personalisation -------------------------------------------------------
r = await call('GET', '/user')
check('user payload carries the training profile', !!r.data.training?.mock, `answered ${r.data.training?.mock?.answered}`)
check('user payload carries offline status', typeof r.data.offline?.offline === 'boolean')

// --- offline switch --------------------------------------------------------
if (!lockedByEnv) {
  r = await call('POST', '/settings/offline', { offline: true })
  check('offline can be switched on', r.data.offline === true)
  r = await call('POST', '/settings/offline', { offline: false })
  check('offline can be switched off', r.data.offline === false)
} else {
  r = await call('POST', '/settings/offline', { offline: false })
  check('offline set by KNACK_OFFLINE cannot be undone from the app', r.status === 409)
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed')
process.exit(failed ? 1 : 0)
