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
  developmentChallenge,
  currentObjective,
  reviewDue,
  markReviewed,
  bandFor,
  INTERNSHIP_START,
} from '../career.js'
import { performanceReview } from '../offer.js'
import { writeReview } from '../ai.js'
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
    challenge: developmentChallenge(user.id),
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
    customName: req.body?.customName,
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

/* -------------------------------------------- GET /api/career/challenge --- */

/**
 * What to work on, and where to go and do it.
 *
 * The design document is right that repeatedly telling a learner they are bad
 * at something does not help. So this never says it — it names one ability, one
 * concrete thing that would move it, and the track that exercises it.
 */
careerRouter.get('/challenge', (req, res) => {
  res.json({
    challenge: developmentChallenge(req.user.id),
    objective: currentObjective(req.user),
  })
})

/* ----------------------------------------------- GET /api/career/review --- */

/**
 * The periodic review.
 *
 * Every six internship levels. A review that only arrives at the end cannot
 * change anything, which is the whole argument for having them during.
 */
careerRouter.get('/review', async (req, res, next) => {
  try {
    const user = req.user
    const due = reviewDue(user)
    if (!due) return res.status(403).json({ error: 'Reviews run during the internship.' })
    if (!due.due) {
      return res.json({ due: false, nextAt: due.nextAt, level: user.internshipLevel ?? INTERNSHIP_START })
    }

    const review = performanceReview(user)
    const written = await writeReview({
      review,
      title: `${bandFor(user.internshipLevel).name} intern`,
      company: user.simCompany ?? 'the company',
    })

    markReviewed(user.id, user.internshipLevel ?? INTERNSHIP_START)

    res.json({
      due: true,
      level: user.internshipLevel,
      band: bandFor(user.internshipLevel),
      review,
      summary: written.summary,
      feedback: written.feedback,
      // The one thing to fix before the next review, named specifically.
      goal: developmentChallenge(user.id),
      source: written.source,
    })
  } catch (err) {
    next(err)
  }
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
