async function req(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  user: () => req('/user'),
  resetProgress: () => req('/user/reset', { method: 'POST' }),
  rename: (name) => req('/user', { method: 'PATCH', body: { name } }),

  generate: (trackId, difficulty) =>
    req('/quest/generate', { method: 'POST', body: { trackId, difficulty } }),

  evaluate: (payload) => req('/quest/evaluate', { method: 'POST', body: payload }),

  history: ({ trackId = 'all', limit = 50, offset = 0 } = {}) =>
    req(`/history?trackId=${encodeURIComponent(trackId)}&limit=${limit}&offset=${offset}`),
}
