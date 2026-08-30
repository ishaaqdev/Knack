import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { api } from '../lib/api'
import {
  Button,
  Card,
  Empty,
  Page,
  PageHead,
  Pill,
  SectionLabel,
  Spinner,
} from '../components/primitives'
import { Avatar } from '../components/Avatar'
import { Clock, useCountdown } from '../components/Countdown'
import { AttributeDeltas } from '../components/Attributes'
import {
  IconArrowLeft,
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconClock,
  IconPen,
  IconSpeech,
  IconUser,
} from '../components/Icons'
import { cx, relativeDate, useReducedMotion } from '../lib/ui'

/**
 * A day at work.
 *
 * The office is a place you choose to be in, three things happen, and each one
 * follows from the last. The timer is the part that makes it a workplace rather
 * than an exam: real decisions are taken before you feel ready, and running out
 * of time is an answer with its own consequence rather than a failure state.
 */

const KIND_ICON = { message: IconPen, task: IconBriefcase, decision: IconCheck, dialogue: IconSpeech }

/** Each room gets its own mark, so the office reads as five places not five rows. */
const LOCATION_ICON = {
  desk: IconPen,
  manager: IconBriefcase,
  meeting: IconUser,
  cafeteria: IconSpeech,
  hr: IconCheck,
}
const KIND_LABEL = {
  message: 'A message',
  task: 'The work',
  decision: 'A decision',
  dialogue: 'A conversation',
}

/* ------------------------------------------------------------- the beat -- */

function Beat({ beat, at, total, onAnswer, onDialogue, busy, error }) {
  const reduced = useReducedMotion()
  const [text, setText] = useState('')
  const [choice, setChoice] = useState(null)
  const taRef = useRef(null)
  const endRef = useRef(null)

  const Icon = KIND_ICON[beat.kind] ?? IconBriefcase
  const isDialogue = beat.kind === 'dialogue'
  const turns = beat.turns ?? []
  const mine = turns.filter((t) => t.who === 'you').length
  const closed = isDialogue && mine >= 3

  const expire = useCallback(() => {
    if (busy) return
    onAnswer({ timedOut: true, choice, text })
  }, [busy, choice, text, onAnswer])

  const left = useCountdown(beat.seconds, expire, !busy)

  useEffect(() => {
    setText('')
    setChoice(null)
  }, [beat.index])

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [text])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length])

  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <motion.div
      key={beat.index}
      initial={reduced ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-faint">
          <Icon size={13} />
          {beat.at ? beat.at + ' · ' : ''}
          {KIND_LABEL[beat.kind]} · {at + 1} of {total}
        </div>
        <Clock left={left} total={beat.seconds} />
      </div>

      <Card hot className="relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-[3px] bg-ember" />
        {beat.character && (
          <div className="mb-3 flex items-center gap-2.5">
            <Avatar name={beat.character.name} size={26} stroke={0} value={null} />
            <p className="text-[11.5px] text-faint">
              <span className="text-dim">{beat.character.name}</span> · {beat.character.role}
            </p>
          </div>
        )}
        <p className="font-display text-[16px] font-semibold">{beat.headline}</p>
        <p className="mt-2 text-[15px] leading-[1.65] text-dim">{beat.situation}</p>
      </Card>

      {/* a live conversation */}
      {isDialogue && (
        <div className="mt-4 space-y-3">
          {turns.map((t, i) => (
            <div key={i} className={cx('flex gap-2.5', t.who === 'you' && 'flex-row-reverse')}>
              <Avatar
                name={t.who === 'you' ? 'You' : (beat.character?.name ?? '?')}
                value={null}
                size={28}
                stroke={0}
                active={t.who === 'you'}
                className="mt-0.5"
              />
              <p
                className={cx(
                  'max-w-[80%] rounded-tile px-3 py-2 text-[13.5px] leading-relaxed',
                  t.who === 'you' ? 'bg-ember/12 text-text' : 'bg-surface text-dim'
                )}
              >
                {t.text}
              </p>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 pl-10 text-[12px] text-faint">
              <Spinner size={12} /> …
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

      {/* four options */}
      {beat.kind === 'decision' && (
        <div className="mt-4 space-y-2.5">
          {beat.options.map((o, i) => (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => setChoice(i)}
              className={cx(
                'flex w-full items-start gap-3 rounded-tile border px-4 py-3.5 text-left transition-colors',
                choice === i ? 'border-ember/45 bg-ember/10' : 'border-line bg-surface hover:border-dim'
              )}
            >
              <span
                className={cx(
                  'mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold',
                  choice === i ? 'border-ember bg-ember text-[#160c05]' : 'border-line text-faint'
                )}
              >
                {'ABCD'[i]}
              </span>
              <span className={cx('text-[14.5px] leading-relaxed', choice === i ? 'text-text' : 'text-dim')}>
                {o}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* free text, for a message, the work, or your next line */}
      {beat.kind !== 'decision' && !closed && (
        <div className="mt-4">
          <label className="mb-2 block text-[13.5px] font-medium text-dim">{beat.prompt}</label>
          <div className="card overflow-hidden p-0 focus-within:border-line">
            <textarea
              ref={taRef}
              rows={isDialogue ? 3 : 5}
              value={text}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              placeholder={isDialogue ? 'Reply as you would out loud…' : 'Write it the way you would send it…'}
              className="w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-faint disabled:opacity-60"
            />
            <div className="flex items-center justify-between border-t border-hair px-4 py-2">
              <span className="stat text-[11px] text-faint">{words} words</span>
              {isDialogue && (
                <span className="text-[11px] text-faint">{3 - mine} replies left</span>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-[12.5px] text-ember-hi">{error}</p>}

      <div className="mt-4 flex gap-2.5">
        {isDialogue && !closed ? (
          <>
            <Button
              className="flex-1"
              disabled={busy || words < 3}
              onClick={() => {
                onDialogue(text)
                setText('')
              }}
            >
              Reply
            </Button>
            {mine > 0 && (
              <Button variant="ghost" className="flex-1" disabled={busy} onClick={() => onAnswer({})}>
                Leave it there
              </Button>
            )}
          </>
        ) : (
          <Button
            size="lg"
            className="w-full"
            disabled={busy || (beat.kind === 'decision' ? choice === null : !isDialogue && words < 6)}
            onClick={() => onAnswer({ choice, text })}
          >
            {busy ? (
              <>
                <Spinner size={16} /> …
              </>
            ) : (
              <>
                {closed ? 'Finish the conversation' : 'Done'} <IconArrowRight size={17} />
              </>
            )}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------- feedback -- */

function BeatResult({ graded, attributes, relationship, onNext, done }) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card>
        <div className="flex items-baseline justify-between">
          <p className="font-display text-[15px] font-semibold">{graded.headline}</p>
          <span className="stat text-[15px] font-bold text-ember">{graded.score}/10</span>
        </div>

        {graded.timedOut && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-ember-hi">
            The moment passed while you were deciding.
          </p>
        )}

        {graded.feedback?.strengths && (
          <p className="mt-3 text-[13.5px] leading-relaxed text-dim">{graded.feedback.strengths}</p>
        )}
        {graded.feedback?.gaps && (
          <p className="mt-2 text-[13.5px] leading-relaxed text-dim">{graded.feedback.gaps}</p>
        )}
        {graded.feedback?.suggestion && (
          <p className="mt-2 text-[13.5px] leading-relaxed text-ember-hi">
            {graded.feedback.suggestion}
          </p>
        )}
        {graded.feedback?.consequence && (
          <p className="mt-3 border-t border-hair pt-3 text-[12.5px] leading-relaxed text-faint">
            {graded.feedback.consequence}
          </p>
        )}

        {relationship && relationship.delta !== 0 && (
          <p className="mt-3 text-[12.5px] text-faint">
            {relationship.name}: {relationship.before} → {relationship.after} ({relationship.tier})
          </p>
        )}
      </Card>

      <AttributeDeltas moved={attributes} />

      <Button size="lg" className="mt-5 w-full" onClick={onNext}>
        {done ? 'End the day' : 'Next'} <IconArrowRight size={17} />
      </Button>
    </motion.div>
  )
}

/* -------------------------------------------------------------- summary -- */

function DaySummary({ result, onDone }) {
  const reduced = useReducedMotion()

  return (
    <>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-5 text-center"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
          End of day {result.dayNumber}
        </p>
        <p className="stat mt-2 text-[42px] font-bold leading-none text-ember">
          +{result.xp.total}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-faint">XP</p>
      </motion.div>

      <Card className="mb-4">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
          What happened
        </p>
        <ul className="space-y-2">
          {result.summary.beats.map((b, i) => (
            <li key={i} className="flex items-baseline gap-2.5 text-[13.5px]">
              <span className="stat w-9 shrink-0 text-right text-[12.5px] text-ember">
                {b.score ?? '—'}
              </span>
              <span className="flex-1 text-dim">{b.headline ?? KIND_LABEL[b.kind]}</span>
              {b.timedOut && <span className="text-[11px] text-ember-hi">timed out</span>}
            </li>
          ))}
        </ul>
      </Card>

      {result.callbacks?.length > 0 && (
        <Card className="mb-4 border-ember/25">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            From earlier
          </p>
          {result.callbacks.map((c) => (
            <div key={c.id} className="mb-2 last:mb-0">
              <p className="text-[13.5px] leading-relaxed text-ember-hi">{c.effect}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-faint">{c.cause}</p>
            </div>
          ))}
        </Card>
      )}

      {result.news && (
        <Card className="mb-4">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            Around the company
          </p>
          <p className="text-[13.5px] font-medium">{result.news.headline}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{result.news.detail}</p>
        </Card>
      )}

      <AttributeDeltas moved={result.summary.attributes} />

      {result.summary.relationships?.length > 0 && (
        <Card className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            People
          </p>
          {result.summary.relationships.map((r, i) => (
            <p key={i} className="text-[13.5px] text-dim">
              {r.name}: {r.before} → {r.after}{' '}
              <span className="text-faint">({r.tier})</span>
            </p>
          ))}
        </Card>
      )}

      {result.summary.badges?.length > 0 && (
        <Card className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            Badges
          </p>
          {result.summary.badges.map((b) => (
            <p key={b.slug} className="text-[13.5px]">
              <span className="font-medium text-ember-hi">{b.name}</span>
              <span className="text-dim"> — {b.why}</span>
            </p>
          ))}
        </Card>
      )}

      {result.internship?.advanced && (
        <p className="mt-4 text-center text-[13px] text-ember-hi">
          Internship level {result.internship.level}.
        </p>
      )}

      <Button size="lg" className="mt-5 w-full" onClick={onDone}>
        Back to the office <IconArrowRight size={17} />
      </Button>
    </>
  )
}

/* ------------------------------------------------------------------ page -- */

export function Workplace() {
  const navigate = useNavigate()
  const applyResult = useKnack((s) => s.applyResult)

  const [state, setState] = useState(null)
  const [day, setDay] = useState(null)
  const [beat, setBeat] = useState(null)
  const [result, setResult] = useState(null)
  const [summary, setSummary] = useState(null)

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const s = await api.workplace()
      setState(s)
      if (s.open && s.open.at >= 0) {
        setDay(s.open)
        setBeat(s.open.beats[s.open.at])
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function startDay(locationId) {
    setBusy(true)
    setError(null)
    setSummary(null)
    try {
      const d = await api.startWorkday(locationId)
      setDay(d)
      setBeat(d.beats[d.at])
      setResult(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function answer(payload) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await api.answerBeat(payload)
      setResult(r)
      setBeat(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function say(text) {
    setBusy(true)
    setError(null)
    // Show what was said straight away; the reply lands when it lands.
    setBeat((b) => ({ ...b, turns: [...(b.turns ?? []), { who: 'you', text }] }))
    try {
      const r = await api.workplaceDialogue(text)
      setBeat((b) => ({ ...b, turns: r.turns }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function closeDay() {
    setBusy(true)
    setError(null)
    try {
      const r = await api.closeWorkday()
      applyResult(r)
      setSummary(r)
      setResult(null)
      setDay(null)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Page>
        <div className="flex items-center gap-2 text-[13px] text-faint">
          <Spinner size={15} /> Walking in…
        </div>
      </Page>
    )
  }

  if (!state) {
    return (
      <Page>
        <Empty
          title="You have not joined yet"
          body={error ?? 'The office opens once you have cleared the interview and joined the company.'}
          action={
            <Button as={Link} to="/career">
              See your career <IconArrowRight size={16} />
            </Button>
          }
        />
      </Page>
    )
  }

  if (summary) {
    return (
      <Page className="pb-12">
        <DaySummary result={summary} onDone={() => setSummary(null)} />
      </Page>
    )
  }

  if (result) {
    return (
      <Page className="pb-12">
        <BeatResult
          graded={result.graded}
          attributes={result.attributes}
          relationship={result.relationship}
          done={result.done}
          onNext={() => {
            if (result.done) {
              closeDay()
            } else {
              setBeat(result.next)
              setResult(null)
            }
          }}
        />
      </Page>
    )
  }

  if (beat) {
    return (
      <Page className="pb-12">
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/career')}
            aria-label="Leave"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-dim transition-colors hover:border-dim hover:text-text"
          >
            <IconArrowLeft size={17} />
          </button>
          <p className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold">
            Day {day?.dayNumber} · {state.locations.find((l) => l.id === day?.location)?.name}
          </p>
        </div>
        <AnimatePresence mode="wait">
          <Beat
            beat={beat}
            at={beat.index}
            total={state.beatsPerDay}
            onAnswer={answer}
            onDialogue={say}
            busy={busy}
            error={error}
          />
        </AnimatePresence>
      </Page>
    )
  }

  /* ------------------------------------------------------------ the office */

  return (
    <Page className="pb-12">
      <PageHead eyebrow={`Day ${state.day}`} title="The office">
        Pick where you spend it. Three things will happen, and where you go decides what they are.
      </PageHead>

      {state.news?.length > 0 && (
        <Card className="mb-5 border-ember/25">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            While you were away
          </p>
          {state.news.map((n) => (
            <div key={n.id} className="mb-2 last:mb-0">
              <p className="text-[13.5px] font-medium">{n.headline}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-dim">{n.detail}</p>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => api.seenNews().then(load)}
          >
            Got it
          </Button>
        </Card>
      )}

      {error && <p className="mb-4 text-[12.5px] text-ember-hi">{error}</p>}

      <SectionLabel>Where do you go?</SectionLabel>
      <div className="space-y-3">
        {state.locations.map((l, i) => {
          const LIcon = LOCATION_ICON[l.id] ?? IconBriefcase
          return (
            <motion.button
              key={l.id}
              type="button"
              disabled={busy}
              onClick={() => startDay(l.id)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="card card-tap group flex w-full items-start gap-4 p-4 text-left disabled:opacity-50"
            >
              <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-tile border border-line bg-raised text-dim transition-colors group-hover:border-ember/40 group-hover:text-ember">
                <LIcon size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[15.5px] font-semibold">{l.name}</span>
                <span className="mt-1 block text-[12.5px] leading-relaxed text-dim">{l.blurb}</span>
              </span>
              <IconArrowRight
                size={16}
                className="mt-3.5 shrink-0 text-faint transition-colors group-hover:text-ember"
              />
            </motion.button>
          )
        })}
      </div>

      {busy && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-faint">
          <Spinner size={14} /> Starting the day…
        </div>
      )}

      <div className="mt-7">
        <SectionLabel
          right={
            <Link to="/people" className="text-[12px] font-medium text-dim hover:text-ember">
              People
            </Link>
          }
        >
          The team today
        </SectionLabel>
        <Card className="divide-y divide-hair p-0">
          {state.people.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={p.name} value={p.relationship} size={34} delay={0.1 + i * 0.05} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{p.name}</span>
                <span className="block truncate text-[11.5px] text-faint">{p.role}</span>
              </span>
              <Pill dot={false}>{p.tier}</Pill>
            </div>
          ))}
        </Card>
      </div>

      {state.history?.length > 0 && (
        <div className="mt-7">
          <SectionLabel>Recent days</SectionLabel>
          <Card className="divide-y divide-hair p-0">
            {state.history.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                <span className="stat w-10 shrink-0 text-[12px] text-faint">Day {d.dayNumber}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-dim">
                  {d.summary?.beats?.map((b) => b.headline).filter(Boolean).join(' · ') || 'Worked'}
                </span>
                <span className="stat shrink-0 text-[12px] text-ember">+{d.xpAwarded}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </Page>
  )
}
