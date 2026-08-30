import { Router } from 'express'
import { findUserById, publicUser } from '../db.js'
import { requireOnboarded } from '../auth.js'
import {
  COMPANIES,
  ROLES,
  careerState,
  chooseCompany,
  joinCompany,
  phaseIndex,
} from '../career.js'
import {
  getAttributes,
  attributeHistory,
  professionalIndex,
  weakest,
  seedAttributes,
} from '../attributes.js'
import {
  listCharacters,
  getCharacter,
  renameCharacter,
  PRONOUN_OPTIONS,
} from '../characters.js'
import { listBadges, earnedCount, award, checkStateBadges } from '../badges.js'

export const careerRouter = Router()

careerRouter.use(requireOnboarded)

/* --------------------------------------------------------- GET /api/career */

careerRouter.get('/', (req, res) => {
  const user = req.user
  seedAttributes(user)
  award(user.id, 'career-starter', 'Entered the simulation.')

  const attributes = getAttributes(user.id)
  const characters = listCharacters(user.id)
  checkStateBadges(user.id, { attributes, characters, streak: user.streak })

  res.json({
    ...careerState(user),
    companies: COMPANIES,
    roles: ROLES,
    attributes,
    professionalIndex: professionalIndex(user.id),
    weakest: weakest(user.id, 3),
    characters,
    badges: { earned: earnedCount(user.id), list: listBadges(user.id) },
  })
})

/* --------------------------------------------- POST /api/career/company --- */

careerRouter.post('/company', (req, res) => {
  const user = req.user
  if (phaseIndex(user.phase) > phaseIndex('joining')) {
    return res.status(409).json({ error: 'You have already joined. This cannot be changed now.' })
  }
  const chosen = chooseCompany(user, {
    companyId: req.body?.companyId,
    roleId: req.body?.roleId,
  })
  res.json({ ...chosen, user: publicUser(findUserById(user.id)) })
})

/* ------------------------------------------------ POST /api/career/join --- */

careerRouter.post('/join', (req, res) => {
  const user = req.user
  if (phaseIndex(user.phase) < phaseIndex('joining')) {
    return res.status(403).json({
      error: 'Clear the interview rounds first — you have not been offered the internship yet.',
    })
  }
  const joined = joinCompany(user)
  const fresh = findUserById(user.id)
  res.json({
    ...joined,
    user: publicUser(fresh),
    career: careerState(fresh),
  })
})

/* -------------------------------------------------------- GET /api/career/people */

careerRouter.get('/people', (req, res) => {
  res.json({
    characters: listCharacters(req.user.id, { events: 3 }),
    pronounOptions: PRONOUN_OPTIONS,
  })
})

careerRouter.get('/people/:id', (req, res) => {
  const c = getCharacter(req.user.id, Number(req.params.id))
  if (!c) return res.status(404).json({ error: 'No such person.' })
  res.json(c)
})

/**
 * Renaming. The trainee names their own colleagues, and chooses the pronouns
 * to go with the name rather than having them inferred from it.
 */
careerRouter.patch('/people/:id', (req, res) => {
  const c = renameCharacter(req.user.id, Number(req.params.id), {
    name: req.body?.name,
    pronouns: req.body?.pronouns,
  })
  if (!c) return res.status(404).json({ error: 'No such person.' })
  res.json(c)
})

/* ------------------------------------------------ GET /api/career/attributes */

careerRouter.get('/attributes', (req, res) => {
  seedAttributes(req.user)
  res.json({
    attributes: getAttributes(req.user.id),
    professionalIndex: professionalIndex(req.user.id),
    history: attributeHistory(req.user.id, 15),
  })
})

/* ---------------------------------------------------- GET /api/career/badges */

careerRouter.get('/badges', (req, res) => {
  res.json({ earned: earnedCount(req.user.id), list: listBadges(req.user.id) })
})
