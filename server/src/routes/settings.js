import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { offlineStatus, setSetting } from '../settings.js'

export const settingsRouter = Router()
settingsRouter.use(requireAuth)

settingsRouter.get('/', (_req, res) => res.json(offlineStatus()))

/**
 * The offline switch. Server-wide, because the server is the trainee's own and
 * the model is the only thing it ever calls out to. If the machine was started
 * with KNACK_OFFLINE=1 the app cannot undo that from a button.
 */
settingsRouter.post('/offline', (req, res) => {
  const status = offlineStatus()
  if (status.lockedByEnv) {
    return res.status(409).json({
      error: 'Offline mode was set when the server started (KNACK_OFFLINE), so it cannot be switched off from here.',
    })
  }
  setSetting('offline', req.body?.offline === true ? '1' : '')
  res.json(offlineStatus())
})
