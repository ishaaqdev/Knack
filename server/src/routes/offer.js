import { Router } from 'express'
import { db, findUserById, publicUser } from '../db.js'
import { requireOnboarded } from '../auth.js'
import { writeReview, judgeNegotiation } from '../ai.js'
import {
  buildOffer,
  createOffer,
  openOffer,
  latestOffer,
  applyNegotiation,
  decideOffer,
  performanceReview,
  promotionCheck,
  promote,
  gradeAt,
  MAX_ROUNDS,
} from '../offer.js'
import { careerState } from '../career.js'
import { applyAttributeDeltas, getAttributes } from '../attributes.js'
import { recordInteraction, listCharacters } from '../characters.js'
import { award, checkStateBadges } from '../badges.js'
import { levelFor } from '../gamification.js'

export const offerRouter = Router()

offerRouter.use(requireOnboarded)

const setFulltime = db.prepare(
  `UPDATE users SET phase = 'fulltime', jobTitle = @jobTitle, ctc = @ctc,
                    gradeIndex = 0, levelsSinceHire = 0
   WHERE id = @id`
)

/* ---------------------------------------------------------- GET /api/offer */

/**
 * The offer screen.
 *
 * Building it is idempotent: the review and the number are written once, at the
 * moment the internship ends, and then they are the offer. Re-rolling them on
 * every page load would make the whole thing feel arbitrary.
 */
offerRouter.get('/', async (req, res, next) => {
  try {
    const user = req.user

    if (user.phase === 'fulltime') {
      return res.json({
        phase: 'fulltime',
        offer: latestOffer(user.id),
        grade: gradeAt(user.gradeIndex ?? 0),
        promotion: promotionCheck(user),
        jobTitle: user.jobTitle,
        ctc: user.ctc,
      })
    }

    if (user.phase !== 'offer') {
      return res.status(403).json({
        error: 'There is no offer yet. Finish the internship first.',
        phase: user.phase,
      })
    }

    let offer = openOffer(user.id)
    if (!offer) {
      const built = buildOffer(user)
      const written = await writeReview({
        review: built.review,
        title: built.title,
        company: built.company,
      })
      offer = createOffer(user, built, { feedback: written.feedback, summary: written.summary })
      award(user.id, 'promotion-ready', 'Completed the internship and received an offer.')
    }

    res.json({
      phase: 'offer',
      offer,
      maxRounds: MAX_ROUNDS,
      roundsUsed: offer.rounds.length,
      review: performanceReview(user),
    })
  } catch (err) {
    next(err)
  }
})

/* ------------------------------------------------ POST /api/offer/negotiate */

offerRouter.post('/negotiate', async (req, res, next) => {
  try {
    const user = req.user
    const offer = openOffer(user.id)
    if (!offer) return res.status(404).json({ error: 'There is no open offer to negotiate.' })
    if (offer.rounds.length >= MAX_ROUNDS) {
      return res.status(409).json({
        error: 'You have used both attempts. Accept or decline the offer as it stands.',
      })
    }

    const message = String(req.body?.message ?? '').trim()
    if (message.length < 20) {
      return res.status(400).json({ error: 'Write what you would actually send — a line or two at least.' })
    }
    if (message.length > 3000) return res.status(400).json({ error: 'That is too long to send.' })

    const review = performanceReview(user)
    const outcome = await judgeNegotiation({
      offer,
      message: message.slice(0, 3000),
      review,
      round: offer.rounds.length + 1,
      roundsLeft: MAX_ROUNDS - offer.rounds.length - 1,
    })

    const applied = applyNegotiation(user.id, outcome)

    /*
     * A negotiation is a professional act with professional consequences. It
     * moves the attributes it exercises, and a badly handled one costs standing
     * with the person who had to sit through it.
     */
    const mean =
      Object.values(outcome.scores).reduce((a, b) => a + b, 0) / Object.keys(outcome.scores).length

    const moved = applyAttributeDeltas(
      user.id,
      {
        confidence: (outcome.scores.confidence - 50) / 14,
        communication: (outcome.scores.communication - 50) / 16,
        professionalism: (outcome.scores.professionalism - 50) / 12,
        decisionMaking: (outcome.scores.strategy - 50) / 18,
      },
      { reason: `Salary negotiation, round ${applied.roundsUsed}`, source: 'negotiation' }
    )

    const manager = listCharacters(user.id).find((c) => c.slug === 'manager')
    const relationship = manager
      ? recordInteraction(user.id, manager.id, {
          summary:
            outcome.result === 'backfire'
              ? 'You pushed on the offer in a way that did not land well.'
              : outcome.result === 'success'
                ? 'You made a clear, evidenced case on your offer and they moved on it.'
                : 'You raised the offer with them professionally.',
          delta: outcome.result === 'backfire' ? -6 : outcome.result === 'success' ? 3 : 1,
          source: 'negotiation',
        })
      : null

    const badges = []
    if (outcome.result === 'success' || (outcome.result === 'partial' && mean >= 68)) {
      const b = award(user.id, 'negotiation-pro', 'Improved your offer by asking for it properly.')
      if (b) badges.push(b)
    }
    badges.push(...checkStateBadges(user.id, { attributes: getAttributes(user.id) }))

    res.json({
      ...outcome,
      ...applied,
      maxRounds: MAX_ROUNDS,
      attributes: moved,
      relationship,
      badges,
      offlineNote: outcome.offlineNote ?? null,
    })
  } catch (err) {
    next(err)
  }
})

/* --------------------------------------------------- POST /api/offer/decide */

offerRouter.post('/decide', (req, res) => {
  const user = req.user
  const offer = openOffer(user.id)
  if (!offer) return res.status(404).json({ error: 'There is no open offer.' })

  const accept = req.body?.accept !== false

  if (!accept) {
    const declined = decideOffer(user.id, false)
    return res.json({ accepted: false, offer: declined })
  }

  const final = decideOffer(user.id, true)
  const grade = gradeAt(0)

  db.transaction(() => {
    setFulltime.run({ id: user.id, jobTitle: grade.name, ctc: final.total })
  })()

  award(user.id, 'career-launch', `Accepted ${final.total} LPA as ${grade.name} at ${final.company}.`)

  const fresh = findUserById(user.id)
  res.json({
    accepted: true,
    offer: final,
    grade: grade.name,
    ctc: final.total,
    user: publicUser(fresh),
    career: careerState(fresh),
    level: levelFor(fresh.xp),
    promotion: promotionCheck(fresh),
  })
})

/* ------------------------------------------------- POST /api/offer/promote */

offerRouter.post('/promote', (req, res) => {
  const user = req.user
  if (user.phase !== 'fulltime') {
    return res.status(403).json({ error: 'You are not a full-time employee yet.' })
  }
  const promoted = promote(user)
  if (!promoted) {
    return res.status(409).json({
      error: 'Not ready for promotion yet.',
      promotion: promotionCheck(user),
    })
  }
  award(user.id, 'rising-professional', `Promoted to ${promoted.grade}.`)
  const fresh = findUserById(user.id)
  res.json({ ...promoted, promotion: promotionCheck(fresh), user: publicUser(fresh) })
})
