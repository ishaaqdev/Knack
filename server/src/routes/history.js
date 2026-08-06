import { Router } from 'express'
import { db } from '../db.js'

export const historyRouter = Router()

/* ---------------------------------------------------- GET /api/history --- */

historyRouter.get('/', (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const trackId = req.query.trackId && req.query.trackId !== 'all' ? req.query.trackId : null

  const where = trackId ? 'WHERE a.trackId = @trackId' : ''
  const rows = db
    .prepare(
      `SELECT a.id, a.trackId, t.name AS trackName, a.difficulty, a.scenarioText,
              a.userResponse, a.score, a.feedback, a.strengths, a.gaps,
              a.suggestion, a.xpAwarded, a.source, a.timestamp
       FROM attempts a JOIN tracks t ON t.id = a.trackId
       ${where}
       ORDER BY a.id DESC LIMIT @limit OFFSET @offset`
    )
    .all({ trackId, limit, offset })

  const { total } = db
    .prepare(
      `SELECT COUNT(*) AS total FROM attempts a ${trackId ? 'WHERE a.trackId = @trackId' : ''}`
    )
    .get({ trackId })

  res.json({ attempts: rows, total, limit, offset })
})
