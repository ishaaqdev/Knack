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

  // profile + progress
  user: () => req('/user'),
  updateProfile: (body) => req('/user', { method: 'PATCH', body }),
  resetProgress: () => req('/user/reset', { method: 'POST' }),

  // quests
  generate: (trackId, difficulty) =>
    req('/quest/generate', { method: 'POST', body: { trackId, difficulty } }),
  evaluate: (payload) => req('/quest/evaluate', { method: 'POST', body: payload }),

  history: ({ trackId = 'all', limit = 50, offset = 0 } = {}) =>
    req(`/history?trackId=${encodeURIComponent(trackId)}&limit=${limit}&offset=${offset}`),
}
