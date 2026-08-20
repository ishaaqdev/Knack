import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import './db.js'
import { attachUser } from './auth.js'
import { authRouter } from './routes/auth.js'
import { questRouter } from './routes/quest.js'
import { userRouter } from './routes/user.js'
import { historyRouter } from './routes/history.js'
import { health, rateLimitStatus } from './ai.js'

const here = dirname(fileURLToPath(import.meta.url))
const app = express()

// Credentialed requests need an explicit origin — a wildcard cannot carry
// cookies. Any private-network origin on the dev port is allowed so the app can
// be opened from a phone on the same Wi-Fi; requests still reach the API only
// through the Vite proxy, which is same-origin from the browser's point of view.
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/
app.use(cors({ origin: (o, cb) => cb(null, !o || DEV_ORIGIN.test(o)), credentials: true }))
app.use(express.json({ limit: '256kb' }))
app.use(cookieParser())
app.use(attachUser)

app.use('/api/auth', authRouter)
app.use('/api/quest', questRouter)
app.use('/api/user', userRouter)
app.use('/api/history', historyRouter)
app.get('/api/health', async (_req, res) =>
  res.json({ ok: true, ai: await health(), rateLimit: rateLimitStatus() })
)

// Production single-port mode: `npm run build` then `npm start` serves the SPA
// and the API from http://localhost:5174.
const dist = join(here, '..', '..', 'web', 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(join(dist, 'index.html')))
}

app.use((err, _req, res, _next) => {
  console.error('[api]', err)
  res.status(err.status && err.status < 600 ? err.status : 500).json({
    error: err.message || 'Something went wrong on the server.',
  })
})

const PORT = Number(process.env.PORT) || 5190
// Loopback by default. The Vite dev server proxies to it from this same machine,
// so exposing Vite with --host does not put the API (or the SQLite file) on the
// network. Override with HOST=0.0.0.0 only if you actually want that.
const HOST = process.env.HOST || '127.0.0.1'

app.listen(PORT, HOST, () => {
  const key = process.env.OPENROUTER_API_KEY
  console.log(`\n  Knack API   http://${HOST}:${PORT}`)
  console.log(`  model       ${process.env.OPENROUTER_MODEL}`)
  console.log(`  key         ${key ? `${key.slice(0, 12)}…` : 'MISSING — check server/.env'}`)
  if (existsSync(dist)) console.log(`  serving     web/dist (single-port mode)`)
  console.log('')
})
