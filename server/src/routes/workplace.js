import { isAdmin } from '../admin.js'
import { Router } from 'express'
import { db, findUserById } from '../db.js'
import { requireOnboarded } from '../auth.js'
import { generateBeat, dialogueTurn, evaluateDialogue, evaluateLevel } from '../ai.js'
import { profileBrief } from '../profile.js'
import { contextBrief, maybeRefresh } from '../context.js'
import { listCharacters, castBrief, recordInteraction } from '../characters.js'
import { applyAttributeDeltas, derivedDeltas, getAttributes, attributeBrief } from '../attributes.js'
import { award, checkStateBadges } from '../badges.js'
import { advanceInternship, careerState, roleFor, bandFor, BANDS } from '../career.js'
import { maybeSchedule, fireDue, worldBrief } from '../consequences.js'
import {
  LOCATIONS,
  locationFor,
  BEATS_PER_DAY,
  BEAT_KINDS,
  planDay,
  startDay,
  currentDay,
  saveEvents,
  finishDay,
  summariseDay,
  dayNumber,
  dayHistory,
  evolveCompany,
  pendingCompanyNews,
  clearCompanyNews,
  companyFeed,
  officeStanding,
} from '../workplace.js'
import {
  levelFor,
  localDate,
  streakAfterQuest,
  streakStatus,
  STREAK_BONUS,
} from '../gamification.js'

export const workplaceRouter = Router()

workplaceRouter.use(requireOnboarded)

/** Only meaningful once there is a workplace to be in. */
function requireJoined(req, res, next) {
  if (!req.user.joinedCompanyAt) {
    return res.status(403).json({
      error: 'You have not joined the company yet. Clear the interview rounds first.',
      phase: req.user.phase,
    })
  }
  next()
}

workplaceRouter.use(requireJoined)

/* ---------------------------------------------------------- the context -- */

const briefFor = (user, location, day, earlier = []) => ({
  kind: null,
  location,
  day,
  company: user.simCompany,
  role: roleFor(user.simRole).name,
  cast: castBrief(user.id),
  world: worldBrief(user.id),
  earlier,
})

/* ------------------------------------------------------ GET /api/workplace */

workplaceRouter.get('/', (req, res) => {
  const user = req.user
  const open = currentDay(user.id)
  const news = pendingCompanyNews(user.id)

  res.json({
    day: dayNumber(user.id),
    admin: isAdmin(user),
    levels: { from: 5, to: 30, current: user.internshipLevel ?? 5, bands: BANDS },
    locations: LOCATIONS.map((l) => ({ id: l.id, name: l.name, blurb: l.blurb })),
    open: open
      ? {
          id: open.id,
          dayNumber: open.dayNumber,
          location: open.location,
          beats: open.events.map(publicBeat),
          at: open.events.findIndex((e) => e.status === 'pending'),
        }
      : null,
    standing: officeStanding(user.id),
    people: listCharacters(user.id).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      tier: c.tier,
      relationship: c.relationship,
      status: c.status,
    })),
    news,
    feed: companyFeed(user.id, 8),
    history: dayHistory(user.id, 5),
    beatsPerDay: BEATS_PER_DAY,
  })
})

workplaceRouter.post('/news/seen', (req, res) => {
  clearCompanyNews(req.user.id)
  res.json({ ok: true })
})

/**
 * What the client is allowed to see about a beat.
 *
 * Option scores never leave the server until the beat is graded, for the same
 * reason they do not in a level: handing the score sheet to the person being
 * scored makes the score meaningless.
 */
function publicBeat(e) {
  return {
    index: e.index,
    kind: e.kind,
    at: e.at ?? null,
    seconds: e.seconds,
    status: e.status,
    character: e.characterName ? { name: e.characterName, role: e.characterRole } : null,
    headline: e.headline ?? null,
    situation: e.situation ?? null,
    prompt: e.prompt ?? null,
    options: e.options?.map((o) => o.text) ?? null,
    opening: e.opening ?? null,
    turns: e.turns ?? [],
    score: e.score ?? null,
    feedback: e.feedback ?? null,
    timedOut: !!e.timedOut,
  }
}

/* ------------------------------------------------ POST /api/workplace/day - */

workplaceRouter.post('/day', async (req, res, next) => {
  try {
    const user = req.user
    const existing = currentDay(user.id)
    if (existing) {
      return res.json({
        id: existing.id,
        dayNumber: existing.dayNumber,
        location: existing.location,
        beats: existing.events.map(publicBeat),
        at: existing.events.findIndex((e) => e.status === 'pending'),
        resumed: true,
      })
    }

    const location = locationFor(req.body?.locationId)
    const day = dayNumber(user.id)
    // An admin can play any internship level, which for a day means its band.
    const asked = Number(req.body?.level)
    const level =
      isAdmin(user) && Number.isInteger(asked)
        ? Math.max(5, Math.min(30, asked))
        : (user.internshipLevel ?? 5)
    const band = bandFor(level)
    const plan = planDay(user.id, location.id, day * 3, band.id)

    // Only the first beat is written now. The rest are written as they are
    // reached, so each one can follow from what actually happened.
    const first = await generateBeat({
      ...briefFor(user, location, day),
      kind: plan[0].kind,
      character: plan[0].characterId
        ? { name: plan[0].characterName, role: plan[0].characterRole }
        : null,
      pressure: plan[0].pressure,
      n: day,
    })
    Object.assign(plan[0], first, { status: 'pending' })

    const created = startDay(user.id, location.id, plan)

    res.json({
      id: created.id,
      dayNumber: day,
      location: location.id,
      locationName: location.name,
      beats: plan.map(publicBeat),
      at: 0,
      source: first.source,
    })
  } catch (err) {
    next(err)
  }
})

/* ------------------------------------------- POST /api/workplace/dialogue - */

/**
 * One exchange inside a live conversation.
 *
 * Capped at three replies. A conversation that never ends is not a scenario,
 * and the cap is what makes the last thing the trainee says matter.
 */
export const MAX_EXCHANGES = 3

workplaceRouter.post('/dialogue', async (req, res, next) => {
  try {
    const user = req.user
    const dayRow = currentDay(user.id)
    if (!dayRow) return res.status(410).json({ error: 'No day is running. Start one.' })

    const events = dayRow.events
    const beat = events.find((e) => e.status === 'pending')
    if (!beat || beat.kind !== 'dialogue') {
      return res.status(409).json({ error: 'That is not the beat you are on.' })
    }

    const said = String(req.body?.text ?? '').trim().slice(0, 1500)
    if (!said) return res.status(400).json({ error: 'Say something first.' })

    if (!beat.turns.length && beat.opening) {
      beat.turns.push({ who: 'them', text: beat.opening })
    }
    beat.turns.push({ who: 'you', text: said })

    const mine = beat.turns.filter((t) => t.who === 'you').length
    const remaining = MAX_EXCHANGES - mine

    const character = listCharacters(user.id).find((c) => c.id === beat.characterId)
    const withMemory = character
      ? { ...character, remembers: castBrief(user.id).find((c) => c.name === character.name)?.remembers }
      : { name: 'A colleague', role: '', personality: '', relationship: 'Neutral', tier: 'Neutral' }

    let reply = null
    if (remaining > 0) {
      reply = await dialogueTurn({
        character: { ...withMemory, relationship: withMemory.tier ?? 'Neutral' },
        situation: beat.situation,
        turns: beat.turns,
        remaining,
        company: user.simCompany,
      })
      beat.turns.push({ who: 'them', text: reply.text, mood: reply.mood })
    }

    saveEvents(dayRow.id, events)

    res.json({
      turns: beat.turns,
      exchangesLeft: Math.max(0, remaining),
      closed: remaining <= 0,
      source: reply?.source ?? 'closed',
    })
  } catch (err) {
    next(err)
  }
})

/* --------------------------------------------- POST /api/workplace/answer - */

const insertAttempt = db.prepare(`
  INSERT INTO attempts
    (userId, trackId, difficulty, scenarioText, userResponse, score, feedback,
     strengths, gaps, suggestion, xpAwarded, source, kind, detail, timestamp, localDate)
  VALUES
    (@userId, @trackId, @difficulty, @scenarioText, @userResponse, @score, @feedback,
     @strengths, @gaps, @suggestion, @xpAwarded, @source, 'workday', @detail, @timestamp, @localDate)
`)

/** Which track a beat counts towards, so the existing skill scores keep working. */
const TRACK_FOR = {
  message: 'workplace-communication',
  dialogue: 'workplace-communication',
  decision: 'critical-thinking',
  task: 'critical-thinking',
}

workplaceRouter.post('/answer', async (req, res, next) => {
  try {
    const user = req.user
    const dayRow = currentDay(user.id)
    if (!dayRow) return res.status(410).json({ error: 'No day is running. Start one.' })

    const events = dayRow.events
    const idx = events.findIndex((e) => e.status === 'pending')
    if (idx === -1) return res.status(409).json({ error: 'This day is already finished.' })

    const beat = events[idx]
    const timedOut = req.body?.timedOut === true
    const character = beat.characterId
      ? listCharacters(user.id).find((c) => c.id === beat.characterId)
      : null

    let score = 1
    let feedback = { strengths: '', gaps: '', suggestion: '' }
    let response = ''
    let relDelta = 0
    let consequence = null
    let source = 'offline'

    if (beat.kind === 'decision') {
      const choice = Number(req.body?.choice)
      const picked = Number.isInteger(choice) ? beat.options?.[choice] : null
      response = picked?.text ?? '(no choice made)'
      score = timedOut || !picked ? 1 : picked.score
      feedback = {
        strengths: picked ? picked.why : '',
        gaps: timedOut ? 'The moment passed while you were deciding. That is an answer too.' : '',
        suggestion: '',
      }
      beat.chosen = Number.isInteger(choice) ? choice : null
      beat.best = beat.options.reduce((b, o, k) => (o.score > beat.options[b].score ? k : b), 0)
      relDelta = score >= 8 ? 3 : score >= 5 ? 1 : -3
      source = 'deterministic'
    } else if (beat.kind === 'dialogue') {
      const graded = await evaluateDialogue({
        character: character ?? { name: 'a colleague', relationship: 50 },
        situation: beat.situation,
        turns: beat.turns,
        learner: contextBrief(user.id),
      })
      score = timedOut ? Math.min(graded.score, 4) : graded.score
      feedback = graded
      relDelta = graded.relationship
      consequence = graded.consequence
      response = beat.turns.filter((t) => t.who === 'you').map((t) => t.text).join(' | ')
      source = graded.source
    } else {
      response = String(req.body?.text ?? '').trim().slice(0, 4000)
      if (!response && !timedOut) return res.status(400).json({ error: 'Write something first.' })

      const track = { id: TRACK_FOR[beat.kind], name: 'Workplace Communication' }
      const graded = response
        ? await evaluateLevel({
            track,
            difficulty: 'medium',
            scenarioText: beat.situation,
            userResponse: response,
            customs: [],
            learner: contextBrief(user.id),
          })
        : { score: 1, strengths: '', gaps: 'You ran out of time without replying.', suggestion: '', source: 'offline' }

      score = timedOut ? Math.min(graded.score, 4) : graded.score
      feedback = graded
      relDelta = score >= 8 ? 3 : score >= 5 ? 1 : -3
      source = graded.source
    }

    Object.assign(beat, {
      status: 'done',
      score,
      response,
      timedOut,
      feedback: {
        strengths: feedback.strengths ?? '',
        gaps: feedback.gaps ?? '',
        suggestion: feedback.suggestion ?? '',
        consequence,
      },
      source,
    })

    /* ------------------ the beat lands on the world, not just the score --- */

    const attributes = applyAttributeDeltas(
      user.id,
      derivedDeltas(TRACK_FOR[beat.kind] ?? 'workplace-communication', score),
      { reason: `Day ${dayRow.dayNumber}: ${beat.headline}`, source: 'workday' }
    )

    const relationship = character
      ? recordInteraction(user.id, character.id, {
          summary: consequence ?? `${beat.headline}. You scored ${score}/10 on how you handled it.`,
          delta: relDelta,
          source: 'workday',
        })
      : null

    beat.attributes = attributes
    beat.relationship = relationship

    /* --------------------------- write the next beat, following from this - */

    let nextBeat = null
    const next = events[idx + 1]
    if (next) {
      const earlier = events
        .filter((e) => e.status === 'done')
        .map((e) => ({
          headline: e.headline,
          summary:
            e.kind === 'decision'
              ? `chose to ${String(e.response).toLowerCase()}`
              : `handled it at ${e.score}/10`,
        }))

      const generated = await generateBeat({
        ...briefFor(user, locationFor(dayRow.location), dayRow.dayNumber, earlier),
        kind: next.kind,
        character: next.characterName ? { name: next.characterName, role: next.characterRole } : null,
        pressure: next.pressure,
        n: dayRow.dayNumber + idx,
      })
      Object.assign(next, generated, { status: 'pending' })
      nextBeat = publicBeat(next)
    }

    saveEvents(dayRow.id, events)

    res.json({
      graded: publicBeat(beat),
      attributes,
      relationship,
      next: nextBeat,
      done: !next,
      at: next ? idx + 1 : BEATS_PER_DAY,
    })
  } catch (err) {
    next(err)
  }
})

/* ---------------------------------------------- POST /api/workplace/close - */

const updateUser = db.prepare(`
  UPDATE users SET xp = @xp, streak = @streak, longestStreak = @longestStreak,
                   lastActiveDate = @lastActiveDate
  WHERE id = @id
`)

workplaceRouter.post('/close', async (req, res, next) => {
  try {
    const before = req.user
    const dayRow = currentDay(before.id)
    if (!dayRow) return res.status(410).json({ error: 'No day is running.' })

    const events = dayRow.events
    if (events.some((e) => e.status === 'pending')) {
      return res.status(409).json({ error: 'The day is not finished yet.' })
    }

    const scored = events.filter((e) => typeof e.score === 'number')
    const mean = scored.length ? scored.reduce((s, e) => s + e.score, 0) / scored.length : 0

    const today = localDate()
    const { streak, event } = streakAfterQuest(before, today)
    const xp = Math.round(scored.reduce((s, e) => s + e.score * 8, 0)) + STREAK_BONUS(streak)

    const beforeLevel = levelFor(before.xp)
    const afterXp = before.xp + xp
    const afterLevel = levelFor(afterXp)

    // The day is written into attempts so it shows up in history and moves the
    // track scores like anything else the trainee does.
    const headline = events.map((e) => e.headline).filter(Boolean).join(' · ')

    db.transaction(() => {
      insertAttempt.run({
        userId: before.id,
        trackId: 'workplace-communication',
        difficulty: 'medium',
        scenarioText: `Day ${dayRow.dayNumber} — ${locationFor(dayRow.location).name}: ${headline}`,
        userResponse: events.map((e) => e.response ?? '').join('\n---\n').slice(0, 6000),
        score: Math.max(1, Math.round(mean)),
        feedback: events.map((e) => e.feedback?.strengths ?? '').filter(Boolean).join(' ').slice(0, 1000),
        strengths: events.map((e) => e.feedback?.strengths ?? '').filter(Boolean).join(' ').slice(0, 800),
        gaps: events.map((e) => e.feedback?.gaps ?? '').filter(Boolean).join(' ').slice(0, 800),
        suggestion: events.map((e) => e.feedback?.suggestion ?? '').filter(Boolean)[0] ?? '',
        xpAwarded: xp,
        source: events[0]?.source ?? 'ai',
        detail: JSON.stringify({ day: dayRow.dayNumber, location: dayRow.location, beats: events.map(publicBeat) }),
        timestamp: new Date().toISOString(),
        localDate: today,
      })
      updateUser.run({
        id: before.id,
        xp: afterXp,
        streak,
        longestStreak: Math.max(before.longestStreak, streak),
        lastActiveDate: today,
      })
      if (before.phase === 'fulltime') {
        db.prepare('UPDATE users SET levelsSinceHire = levelsSinceHire + 1 WHERE id = ?').run(before.id)
      }
    })()

    // Anything owed from earlier days arrives, and today may leave its own mark.
    const callbacks = fireDue(before.id)
    const worst = [...scored].sort((a, b) => a.score - b.score)[0]
    if (worst?.characterId) {
      maybeSchedule(before.id, {
        character: { id: worst.characterId, name: worst.characterName },
        score: worst.score,
        situation: `day ${dayRow.dayNumber}`,
      })
    }

    const news = evolveCompany(before.id, dayRow.dayNumber)
    const progress = advanceInternship(before, Math.round(mean))

    const badges = checkStateBadges(before.id, {
      attributes: getAttributes(before.id),
      characters: listCharacters(before.id),
      streak,
    })
    if (dayRow.dayNumber === 1) {
      const b = award(before.id, 'workplace-explorer', 'Got through your first day.')
      if (b) badges.push(b)
    }

    const summary = summariseDay({
      events,
      attributeMoves: events.flatMap((e) => e.attributes ?? []),
      relationshipMoves: events.map((e) => e.relationship).filter(Boolean),
      badges,
      news,
    })

    finishDay(dayRow.id, summary, xp)

    const fresh = findUserById(before.id)
    res.json({
      kind: 'workday',
      dayNumber: dayRow.dayNumber,
      summary,
      callbacks,
      news,
      xp: { total: xp, before: before.xp, after: afterXp, bonus: STREAK_BONUS(streak) },
      streak: { value: streak, event, before: streakStatus(before, today).streak },
      levelUp: afterLevel.index > beforeLevel.index ? afterLevel : null,
      level: afterLevel,
      internship: progress,
      career: careerState({ ...fresh, internshipLevel: progress.level, phase: progress.phase }),
    })

    maybeRefresh(before.id)
  } catch (err) {
    next(err)
  }
})
