import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import './db.js'
import { questRouter } from './routes/quest.js'
import { userRouter } from './routes/user.js'
import { historyRouter } from './routes/history.js'
import { health } from './ai.js'

const here = dirname(fileURLToPath(import.meta.url))
const app = express()

app.use(cors())
app.use(express.json({ limit: '256kb' }))

app.use('/api/quest', questRouter)
app.use('/api/user', userRouter)
app.use('/api/history', historyRouter)
app.get('/api/health', async (_req, res) => res.json({ ok: true, ai: await health() }))

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

const PORT = Number(process.env.PORT) || 5174

app.listen(PORT, () => {
  const key = process.env.OPENROUTER_API_KEY
  console.log(`\n  Knack API   http://localhost:${PORT}`)
  console.log(`  model       ${process.env.OPENROUTER_MODEL}`)
  console.log(`  key         ${key ? `${key.slice(0, 12)}…` : 'MISSING — check server/.env'}`)
  if (existsSync(dist)) console.log(`  serving     web/dist (single-port mode)`)
  console.log('')
})
