import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { api } from '../lib/api'
import {
  Button,
  Card,
  Page,
  PageHead,
  Pill,
  SectionLabel,
  SkillBar,
  Spinner,
} from '../components/primitives'
import { Character, Typing, lookFromSeed } from '../components/Character'
import { ProfileSheet } from '../components/PersonProfile'
import { RoomMood } from '../components/RoomMood'
import { MicButton } from '../components/MicButton'
import { Stars } from '../components/Stars'
import { AttributeDeltas } from '../components/Attributes'
import { IconArrowLeft, IconArrowRight, IconRefresh, IconSpeech } from '../components/Icons'
import { cx, relativeDate, useReducedMotion } from '../lib/ui'

/**
 * The group discussion.
 *
 * The whole point is timing: the trainee decides when to speak and when not to,
 * and staying quiet is a real option with a real cost. So "Stay quiet" is a
 * first-class button next to "Say this", not a way to skip a question.
 *
 * The room is shown the way a room is experienced. People speak one at a time,
 * you can see who is talking and tap them for who they are, and the mood of the
 * table sits to one side and changes as the argument does.
 */

/* --------------------------------------------------------- reveal timing -- */

const BASE_MS = 650
const PER_WORD_MS = 52
const MIN_MS = 900
const MAX_MS = 2800

/**
 * Releases the transcript one line at a time.
 *
 * The server returns a whole beat at once; showing it that way makes a panel
 * read like a script that has been pasted in. Here each line waits, with the
 * speaker's mouth moving, for about as long as it would take to say. The
 * trainee's own lines appear at once, because they have already said them.
 */
function useReveal(transcript, instant) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (shown >= transcript.length) return undefined
    const t = transcript[shown]
    if (t.you || instant) {
      setShown(shown + 1)
      return undefined
    }
    const words = (t.text.match(/\S+/g) ?? []).length
    const ms = Math.min(MAX_MS, Math.max(MIN_MS, BASE_MS + words * PER_WORD_MS))
    const id = setTimeout(() => setShown((s) => Math.max(s, shown + 1)), ms)
    return () => clearTimeout(id)
  }, [shown, transcript, instant])

  const revealing = shown < transcript.length
  const next = revealing ? transcript[shown] : null
  return {
    shown,
    revealing,
    speaking: next && !next.you ? next.speaker : null,
    skip: () => setShown(transcript.length),
  }
}

/* ----------------------------------------------------------- transcript --- */

function Turn({ turn, person, trainee, onOpen }) {
  const reduced = useReducedMotion()
  const mine = turn.you

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className={cx('flex items-end gap-2.5', mine && 'flex-row-reverse')}
    >
      <button
        type="button"
        onClick={() => !mine && onOpen(person)}
        disabled={mine}
        aria-label={mine ? 'You' : `${turn.speaker}'s profile`}
        className={cx('shrink-0 transition-transform', !mine && 'hover:-translate-y-0.5')}
      >
        <Character
          look={mine ? trainee.look : person?.look}
          accent={mine ? '#ff7a35' : person?.accent}
          size={40}
          title={mine ? 'You' : turn.speaker}
        />
      </button>
      <div className={cx('min-w-0 max-w-[82%]', mine && 'text-right')}>
        <p className="mb-1 text-[11.5px] font-bold text-faint">
          {mine ? 'You' : turn.speaker}
          {turn.to ? <span className="font-medium"> to {turn.to}</span> : null}
        </p>
        <p
          className={cx(
            'inline-block rounded-[18px] px-3.5 py-2.5 text-left text-[14px] leading-relaxed',
            mine
              ? 'rounded-br-md bg-ember text-[#160c05] shadow-[0_3px_0_#a8481a]'
              : 'rounded-bl-md border-2 border-hair bg-surface text-text shadow-[0_3px_0_rgb(0_0_0/0.5)]'
          )}
        >
          {turn.text}
        </p>
      </div>
    </motion.div>
  )
}

/** Who is talking, and who they are, kept in view above the conversation. */
function SpeakerCard({ person, speaking, expression, onOpen }) {
  if (!person) return null
  return (
    <button
      type="button"
      onClick={() => onOpen(person)}
      className="card card-tap flex w-full items-center gap-3.5 p-3.5 text-left"
    >
      <Character
        look={person.look}
        accent={person.accent}
        expression={expression}
        speaking={speaking}
        size={58}
        title={person.name}
        ring={speaking ? person.accent : null}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display text-[17px] font-bold leading-none">{person.name}</span>
          <Pill active dot={false}>
            {person.trait}
          </Pill>
          {speaking && <Typing color={person.accent} />}
        </span>
        <span className="mt-1 block text-[12.5px] leading-snug text-dim">{person.tagline}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-faint">{person.background}</span>
      </span>
    </button>
  )
}

/* ---------------------------------------------------------------- room --- */

const NEUTRAL_MOOD = (panel) => ({
  id: 'calm',
  label: 'Settling',
  tone: '#9a9aa5',
  tension: 15,
  warmth: 35,
  energy: 25,
  note: 'People are finding their seats and sizing each other up.',
  people: panel.map((p) => ({ name: p.name, mood: 'Listening', expression: 'neutral' })),
})

function Room({ run, trainee, onTurn, onFinish, busy, error, onOpen }) {
  const [text, setText] = useState('')
  const [to, setTo] = useState(null)
  const endRef = useRef(null)
  const taRef = useRef(null)
  const reduced = useReducedMotion()

  const { shown, revealing, speaking, skip } = useReveal(run.transcript, reduced)

  // The mood only moves once the room has finished talking, so the gauge never
  // gets ahead of what the trainee has actually heard.
  const [mood, setMood] = useState(() => NEUTRAL_MOOD(run.panel))
  useEffect(() => {
    if (!revealing && run.mood) setMood(run.mood)
  }, [revealing, run.mood])

  const byName = useMemo(() => Object.fromEntries(run.panel.map((p) => [p.name, p])), [run.panel])
  const visible = run.transcript.slice(0, shown)

  const lastTalker = [...visible].reverse().find((t) => !t.you)?.speaker ?? run.panel[0].name
  const current = byName[speaking ?? lastTalker]
  const currentExpression = mood.people.find((p) => p.name === current?.name)?.expression ?? 'neutral'

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'end' })
  }, [shown, busy, reduced])

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const spoken = run.transcript.filter((t) => t.you).length
  const waiting = busy || revealing

  const appendSpoken = useCallback((chunk) => setText((t) => (t ? `${t} ${chunk}` : chunk)), [])

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_270px] lg:items-start lg:gap-5">
      <div className="min-w-0">
        <Card hot className="relative overflow-hidden">
          {run.room && <p className="mb-3 text-[12.5px] leading-relaxed text-faint">{run.room.setting}</p>}

          <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ember">
            The motion{run.category ? ` · ${run.category}` : ''}
          </p>
          <p className="font-display text-[19px] font-semibold leading-snug text-text">{run.topic}</p>

          {run.frame && (
            <p className="mt-3 border-t-2 border-hair pt-3 text-[13px] leading-relaxed text-dim">{run.frame}</p>
          )}
          {run.room && <p className="mt-3 text-[12.5px] leading-relaxed text-faint">{run.room.brief}</p>}

          {run.pressure && (
            <p className="mt-3 text-[12px] text-faint">
              <span className="font-bold text-ember-hi">{run.pressure.label} room.</span> {run.pressure.why}
            </p>
          )}
        </Card>

        {/* on a phone the mood sits above the conversation instead of beside it */}
        <div className="mt-4 lg:hidden">
          <RoomMood mood={mood} panel={run.panel} compact />
        </div>

        <div className="mt-4">
          <SpeakerCard person={current} speaking={!!speaking} expression={currentExpression} onOpen={onOpen} />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <SectionLabel>Discussion</SectionLabel>
          <span className="text-[11.5px] font-semibold text-faint">
            beat {Math.min(run.beat, run.totalBeats)} of {run.totalBeats} · you spoke {spoken}×
          </span>
        </div>

        <div className="space-y-4">
          {visible.map((t, i) => (
            <Turn key={i} turn={t} person={byName[t.speaker]} trainee={trainee} onOpen={onOpen} />
          ))}

          {revealing && speaking && (
            <div className="flex items-center gap-2.5 pl-1">
              <Character
                look={byName[speaking]?.look}
                accent={byName[speaking]?.accent}
                speaking
                size={40}
                title={speaking}
              />
              <span className="rounded-full border-2 border-hair bg-surface px-3.5 py-2.5 text-dim">
                <Typing />
              </span>
              <button
                type="button"
                onClick={skip}
                className="ml-auto text-[11.5px] font-bold text-faint underline-offset-2 hover:text-text hover:underline"
              >
                Skip ahead
              </button>
            </div>
          )}

          {busy && !revealing && (
            <div className="flex items-center gap-2 pl-1 text-[12.5px] text-faint">
              <Spinner size={13} /> the room is talking…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && <p className="mt-3 text-[12.5px] leading-relaxed text-ember-hi">{error}</p>}

        {run.closed ? (
          <div className="mt-6">
            <p className="mb-3 text-center text-[13px] leading-relaxed text-dim">
              Time. The assessor will score how you handled the room, not how much you said.
            </p>
            <Button size="lg" className="w-full" onClick={onFinish} disabled={busy || revealing}>
              {busy ? (
                <>
                  <Spinner size={16} /> Scoring the discussion…
                </>
              ) : (
                <>
                  Get your debrief <IconArrowRight size={17} />
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            <div className="card overflow-hidden p-0 focus-within:border-ember">
              <textarea
                ref={taRef}
                rows={3}
                value={text}
                disabled={waiting}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  revealing ? 'Let them finish. Listening is part of this.' : 'Say something, or stay quiet and let it run.'
                }
                className="w-full resize-none bg-transparent px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-faint disabled:opacity-60"
              />
              <div className="flex items-center justify-between gap-3 border-t-2 border-hair px-3 py-2">
                <MicButton onText={appendSpoken} disabled={waiting} size="sm" />
                <span className="stat shrink-0 text-[11.5px] text-faint">
                  {words} words{spoken === 0 && !words ? ' · you have not spoken yet' : ''}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-semibold text-faint">Speaking to</span>
              {[{ name: null, label: 'the room' }, ...run.panel.map((p) => ({ name: p.name, label: p.name }))].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setTo(o.name)}
                  className={cx(
                    'rounded-full border-2 px-3 py-1 text-[12.5px] font-bold transition-colors',
                    to === o.name
                      ? 'border-ember bg-ember/15 text-ember-hi'
                      : 'border-line text-dim hover:border-ember'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                className="flex-1"
                disabled={waiting || words < 4}
                onClick={() => {
                  onTurn(text, to)
                  setText('')
                  setTo(null)
                }}
              >
                {to ? `Say this to ${to}` : 'Say this'}
              </Button>
              <Button variant="ghost" className="flex-1" disabled={waiting} onClick={() => onTurn('', null)}>
                Stay quiet
              </Button>
            </div>
            <p className="mt-3 text-center text-[12px] leading-relaxed text-faint">
              Staying quiet is a real choice here, and it is scored like one.
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 hidden lg:sticky lg:top-20 lg:mt-0 lg:block">
        <RoomMood mood={mood} panel={run.panel} speaking={speaking} />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- debrief -- */

const DIMENSIONS = [
  ['communication', 'Communication', 'ember'],
  ['confidence', 'Confidence', 'ember'],
  ['leadership', 'Leadership', 'ember'],
  ['teamwork', 'Teamwork', 'ember'],
  ['listening', 'Listening', 'ember'],
]

function Debrief({ result, onAgain, onNext }) {
  const reduced = useReducedMotion()

  return (
    <>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-5 text-center"
      >
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-faint">Group discussion</p>
        <div className="mt-3">
          <Stars score={result.score} size={40} />
        </div>
        <p className="stat mt-3 text-[52px] font-bold leading-none text-ember">
          {result.score}
          <span className="text-[24px] text-faint">/10</span>
        </p>
        <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-dim">{result.verdict}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Pill active={result.passed}>{result.passed ? 'Cleared' : `Needs ${result.pass}/10 to clear`}</Pill>
          <Pill dot={false}>+{result.xp.total} XP</Pill>
        </div>
        {result.phaseUnlocked && <p className="mt-3 text-[13.5px] font-bold text-ember-hi">You are through to the interview.</p>}
      </motion.div>

      <Card className="space-y-3.5">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">How you were assessed</p>
        {DIMENSIONS.map(([key, label, tone], i) => (
          <div key={key}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[13.5px] font-bold text-dim">{label}</span>
              <span className="stat text-[14px] font-bold">{result.scores[key]}</span>
            </div>
            <SkillBar value={result.scores[key]} tone={tone} delay={0.1 + i * 0.07} />
          </div>
        ))}
      </Card>

      {result.mood && (
        <Card className="mt-5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">How the room ended</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-dim">
            <span className="font-display text-[16px] font-bold" style={{ color: result.mood.tone }}>
              {result.mood.label}.
            </span>{' '}
            {result.mood.note}
          </p>
        </Card>
      )}

      <Card className="mt-5 space-y-3.5">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">What landed</p>
          <p className="mt-1 text-[14px] leading-relaxed text-dim">{result.strengths}</p>
        </div>
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">What was missing</p>
          <p className="mt-1 text-[14px] leading-relaxed text-dim">{result.gaps}</p>
        </div>
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">Next time</p>
          <p className="mt-1 text-[14px] leading-relaxed text-ember-hi">{result.nextFocus}</p>
        </div>
        {result.offlineNote && <p className="text-[11.5px] leading-relaxed text-faint">{result.offlineNote}</p>}
      </Card>

      <AttributeDeltas moved={result.attributes} />

      {result.badges?.length > 0 && (
        <Card className="mt-5">
          <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">Badge unlocked</p>
          {result.badges.map((b) => (
            <div key={b.slug} className="text-[14px] leading-relaxed">
              <span className="font-bold text-ember-hi">{b.name}</span>
              <span className="text-dim"> · {b.why}</span>
            </div>
          ))}
        </Card>
      )}

      <div className="mt-6 space-y-3">
        {result.passed ? (
          <Button size="lg" className="w-full" onClick={onNext}>
            Go to the interview <IconArrowRight size={17} />
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={onAgain}>
            <IconRefresh size={16} /> Try another discussion
          </Button>
        )}
        <Button variant="ghost" size="lg" className="w-full" onClick={() => onNext('/career')}>
          Back to your career
        </Button>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ page -- */

export function GroupDiscussion() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const practice = params.get('practice') === '1'
  const applyResult = useKnack((s) => s.applyResult)
  const user = useKnack((s) => s.user)

  const trainee = useMemo(() => ({ look: lookFromSeed(user?.name ?? 'you') }), [user?.name])

  const [state, setState] = useState(null)
  const [run, setRun] = useState(null)
  const [result, setResult] = useState(null)
  const [open, setOpen] = useState(null)

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      setState(await api.gd())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function start() {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const r = await api.startGd(practice)
      setRun({ ...r, closed: false })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function turn(text, to = null) {
    setBusy(true)
    setError(null)
    // Show what was said immediately; the room replies when it replies.
    if (text.trim()) {
      setRun((r) => ({ ...r, transcript: [...r.transcript, { speaker: 'You', text, you: true, to }] }))
    }
    try {
      const r = await api.gdTurn(run.runId, text, to)
      setRun((prev) => ({
        ...prev,
        transcript: r.transcript,
        beat: r.beat,
        closed: r.closed,
        mood: r.mood ?? prev.mood,
      }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function finish() {
    setBusy(true)
    setError(null)
    try {
      const r = await api.finishGd(run.runId)
      // A practice run awards nothing, so there is nothing to apply.
      if (!r.practice) applyResult(r)
      setResult(r)
      setRun(null)
      refresh()
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
          <Spinner size={15} /> Loading the room…
        </div>
      </Page>
    )
  }

  return (
    <Page className="pb-12" wide={!!run}>
      <ProfileSheet person={open} onClose={() => setOpen(null)} />

      {run ? (
        <>
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRun(null)}
              aria-label="Leave the discussion"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-line text-dim transition-colors hover:border-ember hover:text-text"
            >
              <IconArrowLeft size={17} />
            </button>
            <p className="min-w-0 flex-1 truncate font-display text-[17px] font-semibold">Group discussion</p>
            {run.source === 'offline' && <Pill dot={false}>Scripted panel</Pill>}
          </div>
          <Room
            run={run}
            trainee={trainee}
            onTurn={turn}
            onFinish={finish}
            busy={busy}
            error={error}
            onOpen={setOpen}
          />
        </>
      ) : result ? (
        <Debrief
          result={result}
          onAgain={start}
          onNext={(to) => navigate(typeof to === 'string' ? to : '/interview')}
        />
      ) : (
        <>
          <PageHead eyebrow={practice ? 'Practice · nothing at stake' : 'Phase one'} title="Group discussion">
            Five candidates, one motion, five exchanges. You decide when to speak, and being the loudest is not how
            this is scored.
          </PageHead>

          {state && (
            <Card className="mb-5">
              <div className="flex items-baseline justify-between">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">Best so far</p>
                <span className="stat text-[17px] font-bold">{state.best !== null ? `${state.best}/10` : '-'}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-faint">
                {state.cleared
                  ? 'Cleared. You can run it again any time to push the score up.'
                  : `Clear one at ${state.pass}/10 to reach the interview.`}
              </p>
              {state.pressure && (
                <p className="mt-2.5 border-t-2 border-hair pt-2.5 text-[12.5px] leading-relaxed text-dim">
                  <span className="font-bold text-ember-hi">{state.pressure.label} room. </span>
                  {state.pressure.why}
                </p>
              )}
            </Card>
          )}

          <SectionLabel>Who is in the room</SectionLabel>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(state?.panel ?? []).map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setOpen(p)}
                className="card card-tap flex items-center gap-3 p-3 text-left"
              >
                <Character look={p.look} accent={p.accent} size={56} title={p.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-display text-[16px] font-bold">{p.name}</span>
                    <span className="text-[11.5px] font-bold text-ember-hi">{p.trait}</span>
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-dim">{p.tagline}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="-mt-2 mb-5 text-center text-[12px] text-faint">Tap anyone to read their profile.</p>

          {error && <p className="mb-4 text-[12.5px] text-ember-hi">{error}</p>}

          <Button size="lg" className="w-full" onClick={start} disabled={busy}>
            {busy ? (
              <>
                <Spinner size={16} /> Getting everyone in the room…
              </>
            ) : (
              <>
                <IconSpeech size={17} /> Start a discussion
              </>
            )}
          </Button>

          {state?.history?.length > 0 && (
            <div className="mt-8">
              <SectionLabel>Past discussions</SectionLabel>
              <Card className="divide-y-2 divide-hair p-0">
                {state.history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-dim">{h.topic}</span>
                    <span className="shrink-0 text-[11px] text-faint">{relativeDate(h.timestamp)}</span>
                    <span className="stat w-10 shrink-0 text-right text-[13px] font-bold text-text">{h.score}/10</span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </>
      )}
    </Page>
  )
}
