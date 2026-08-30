async function req(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // session cookie
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

/**
 * Binary upload. Deliberately not multipart: one file, no fields, and the server
 * reads the raw body — a form parser would be a dependency for no gain.
 */
async function upload(path, file) {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/octet-stream',
      'x-resume-filename': file.name.replace(/[^\w.\- ]/g, ''),
    },
    body: file,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Upload failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export const api = {
  // auth
  me: () => req('/auth/me'),
  signup: (body) => req('/auth/signup', { method: 'POST', body }),
  login: (body) => req('/auth/login', { method: 'POST', body }),
  logout: () => req('/auth/logout', { method: 'POST' }),
  onboardingOptions: () => req('/auth/onboarding'),
  submitOnboarding: (body) => req('/auth/onboarding', { method: 'POST', body }),
  linkGithub: (username) => req('/auth/github', { method: 'POST', body: { username } }),
  unlinkGithub: () => req('/auth/github', { method: 'DELETE' }),

  // resume
  pasteResume: (text) => req('/auth/resume', { method: 'POST', body: { text } }),
  uploadResume: (file) => upload('/auth/resume/file', file),
  removeResume: () => req('/auth/resume', { method: 'DELETE' }),

  // profile + progress
  user: () => req('/user'),
  updateProfile: (body) => req('/user', { method: 'PATCH', body }),
  resetProgress: () => req('/user/reset', { method: 'POST' }),

  // quests
  generate: (trackId, difficulty) =>
    req('/quest/generate', { method: 'POST', body: { trackId, difficulty } }),
  evaluate: (payload) => req('/quest/evaluate', { method: 'POST', body: payload }),

  // levels: four judgement calls, then one written stage
  generateLevel: (trackId, difficulty) =>
    req('/quest/level/generate', { method: 'POST', body: { trackId, difficulty } }),
  writtenStage: (levelId) => req(`/quest/level/written/${levelId}`),
  submitLevel: (payload) => req('/quest/level/submit', { method: 'POST', body: payload }),

  // interview
  interview: () => req('/interview'),
  startInterview: (level) => req('/interview/start', { method: 'POST', body: { level } }),
  submitInterview: (payload) => req('/interview/submit', { method: 'POST', body: payload }),
  interviewRun: (id) => req(`/interview/runs/${id}`),

  // career simulation
  career: () => req('/career'),
  chooseCompany: (companyId, roleId) =>
    req('/career/company', { method: 'POST', body: { companyId, roleId } }),
  joinCompany: () => req('/career/join', { method: 'POST' }),
  people: () => req('/career/people'),
  person: (id) => req(`/career/people/${id}`),
  renamePerson: (id, body) => req(`/career/people/${id}`, { method: 'PATCH', body }),
  attributes: () => req('/career/attributes'),
  badges: () => req('/career/badges'),

  // group discussion
  gd: () => req('/gd'),
  startGd: () => req('/gd/start', { method: 'POST', body: {} }),
  gdTurn: (runId, text) => req('/gd/turn', { method: 'POST', body: { runId, text } }),
  finishGd: (runId) => req('/gd/finish', { method: 'POST', body: { runId } }),
  gdRun: (id) => req(`/gd/runs/${id}`),

  history: ({ trackId = 'all', limit = 50, offset = 0 } = {}) =>
    req(`/history?trackId=${encodeURIComponent(trackId)}&limit=${limit}&offset=${offset}`),
}
