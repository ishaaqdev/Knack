import { Router } from 'express'
import { db } from '../db.js'
import { requireAuth } from '../auth.js'

export const historyRouter = Router()

historyRouter.use(requireAuth)

/* ---------------------------------------------------- GET /api/history --- */

historyRouter.get('/', (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50))
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const trackId = req.query.trackId && req.query.trackId !== 'all' ? req.query.trackId : null

  const trackFilter = trackId ? 'AND a.trackId = @trackId' : ''
  const rows = db
    .prepare(
      `SELECT a.id, a.trackId, t.name AS trackName, a.difficulty, a.scenarioText,
              a.userResponse, a.score, a.feedback, a.strengths, a.gaps,
              a.suggestion, a.xpAwarded, a.source, a.timestamp
       FROM attempts a JOIN tracks t ON t.id = a.trackId
       WHERE a.userId = @userId ${trackFilter}
       ORDER BY a.id DESC LIMIT @limit OFFSET @offset`
    )
    .all({ userId: req.user.id, trackId, limit, offset })

  const { total } = db
    .prepare(
      `SELECT COUNT(*) AS total FROM attempts a
       WHERE a.userId = @userId ${trackId ? 'AND a.trackId = @trackId' : ''}`
    )
    .get({ userId: req.user.id, trackId })

  res.json({ attempts: rows, total, limit, offset })
})
