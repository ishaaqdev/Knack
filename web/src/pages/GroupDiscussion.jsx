import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Avatar } from '../components/Avatar'
import { AttributeDeltas } from '../components/Attributes'
import { IconArrowLeft, IconArrowRight, IconRefresh, IconSpeech } from '../components/Icons'
import { Clock, useCountdown } from '../components/Countdown'
import { relativeDate, useReducedMotion } from '../lib/ui'

/**
 * The group discussion.
 *
 * The whole point is timing: the trainee decides when to speak and when not to,
 * and staying quiet is a real option with a real cost. So "Stay quiet" is a
 * first-class button next to "Say this", not a way to skip a question.
 */

/* ----------------------------------------------------------- transcript -- */

const INITIALS = (name) => name.slice(0, 2).toUpperCase()

function Turn({ turn, index }) {
  const reduced = useReducedMotion()
  const mine = turn.you

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : Math.min(index, 3) * 0.08, duration: 0.3 }}
      className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}
    >
      <Avatar
        name={mine ? 'You' : turn.speaker}
        value={null}
        size={28}
        stroke={0}
        active={mine}
        className="mt-0.5"
      />
      <div className={`min-w-0 flex-1 ${mine ? 'text-right' : ''}`}>
        <p className="text-[11px] text-faint">{turn.speaker}</p>
        <p
          className={`mt-1 inline-block rounded-tile px-3 py-2 text-left text-[13.5px] leading-relaxed ${
            mine ? 'bg-ember/12 text-text' : 'bg-surface text-dim'
          }`}
        >
          {turn.text}
        </p>
      </div>
    </motion.div>
  )
}

/* ---------------------------------------------------------------- room --- */

function Room({ run, onTurn, onFinish, busy, error }) {
  const [text, setText] = useState('')
  const endRef = useRef(null)
  const taRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [run.transcript.length, busy])

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [text])

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const spoken = run.transcript.filter((t) => t.you).length

  /*
   * The window to make a point closes whether or not you have decided to make
   * it. Running out passes — which is a real move here, and a scored one.
   */
  const expire = useCallback(() => {
    if (busy || run.closed) return
    onTurn('')
    setText('')
  }, [busy, run.closed, onTurn])

  const left = useCountdown(run.seconds ?? 60, expire, !busy && !run.closed)

  return (
    <>
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-[3px] bg-ember" />
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
          The motion
        </p>
        <p className="text-[15.5px] leading-[1.6] text-text">{run.topic}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {run.panel.map((p) => (
            <Pill key={p.name} dot={false}>
              {p.name} · {p.trait}
            </Pill>
          ))}
        </div>
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <SectionLabel>Discussion</SectionLabel>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-faint">
            beat {Math.min(run.beat, run.totalBeats)}/{run.totalBeats} · spoke {spoken}×
          </span>
          {!run.closed && <Clock left={left} total={run.seconds ?? 60} />}
        </div>
      </div>

      <div className="space-y-3.5">
        {run.transcript.map((t, i) => (
          <Turn key={i} turn={t} index={i} />
        ))}
        {busy && (
          <div className="flex items-center gap-2 pl-10 text-[12px] text-faint">
            <Spinner size={12} /> the room is talking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-3 text-[12.5px] leading-relaxed text-ember-hi">{error}</p>}

      {run.closed ? (
        <div className="mt-5">
          <p className="mb-3 text-center text-[13px] leading-relaxed text-dim">
            Time. The assessor will score how you handled the room, not how much you said.
          </p>
          <Button size="lg" className="w-full" onClick={onFinish} disabled={busy}>
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
        <div className="mt-5">
          <div className="card overflow-hidden p-0 focus-within:border-line">
            <textarea
              ref={taRef}
              rows={3}
              value={text}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              placeholder="Say something — or stay quiet and let it run."
              className="w-full resize-none bg-transparent px-4 py-3 text-[14.5px] leading-relaxed outline-none placeholder:text-faint disabled:opacity-60"
            />
            <div className="flex items-center justify-between border-t border-hair px-4 py-2">
              <span className="stat text-[11px] text-faint">{words} words</span>
              <span className="text-[11px] text-faint">
                {spoken === 0 ? 'you have not spoken yet' : ''}
              </span>
            </div>
          </div>

          <div className="mt-3 flex gap-2.5">
            <Button
              className="flex-1"
              disabled={busy || words < 4}
              onClick={() => {
                onTurn(text)
                setText('')
              }}
            >
              Say this
            </Button>
            <Button variant="ghost" className="flex-1" disabled={busy} onClick={() => onTurn('')}>
              Stay quiet
            </Button>
          </div>
          <p className="mt-2.5 text-center text-[11.5px] leading-relaxed text-faint">
            Staying quiet is a real choice here, and it is scored like one.
          </p>
        </div>
      )}
    </>
  )
}

/* -------------------------------------------------------------- debrief -- */

const DIMENSIONS = [
  ['communication', 'Communication'],
  ['confidence', 'Confidence'],
  ['leadership', 'Leadership'],
  ['teamwork', 'Teamwork'],
  ['listening', 'Listening'],
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
          Group discussion
        </p>
        <p className="stat mt-2 text-[46px] font-bold leading-none text-ember">
          {result.score}
          <span className="text-[22px] text-faint">/10</span>
        </p>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-dim">{result.verdict}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Pill active={result.passed}>
            {result.passed ? 'Cleared' : `Needs ${result.pass}/10 to clear`}
          </Pill>
          <Pill dot={false}>+{result.xp.total} XP</Pill>
        </div>
        {result.phaseUnlocked && (
          <p className="mt-3 text-[13px] text-ember-hi">
            You are through to the interview.
          </p>
        )}
      </motion.div>

      <Card className="space-y-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
          How you were assessed
        </p>
        {DIMENSIONS.map(([key, label], i) => (
          <div key={key}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[13px] text-dim">{label}</span>
              <span className="stat text-[13px] font-semibold">{result.scores[key]}</span>
            </div>
            <SkillBar value={result.scores[key]} delay={0.1 + i * 0.07} />
          </div>
        ))}
      </Card>

      <Card className="mt-5 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            What worked
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-dim">{result.strengths}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            What was missing
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-dim">{result.gaps}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            Next time
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ember-hi">{result.nextFocus}</p>
        </div>
        {result.offlineNote && (
          <p className="text-[11.5px] leading-relaxed text-faint">{result.offlineNote}</p>
        )}
      </Card>

      <AttributeDeltas moved={result.attributes} />

      {result.badges?.length > 0 && (
        <Card className="mt-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            Badge unlocked
          </p>
          {result.badges.map((b) => (
            <div key={b.slug} className="text-[13.5px] leading-relaxed">
              <span className="font-medium text-ember-hi">{b.name}</span>
              <span className="text-dim"> — {b.why}</span>
            </div>
          ))}
        </Card>
      )}

      <div className="mt-5 space-y-3">
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
  const applyResult = useKnack((s) => s.applyResult)

  const [state, setState] = useState(null)
  const [run, setRun] = useState(null)
  const [result, setResult] = useState(null)

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
      const r = await api.startGd()
      setRun({ ...r, closed: false })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function turn(text) {
    setBusy(true)
    setError(null)
    // Show what was said immediately; the room replies when it replies.
    if (text.trim()) {
      setRun((r) => ({ ...r, transcript: [...r.transcript, { speaker: 'You', text, you: true }] }))
    }
    try {
      const r = await api.gdTurn(run.runId, text)
      setRun((prev) => ({ ...prev, transcript: r.transcript, beat: r.beat, closed: r.closed }))
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
      applyResult(r)
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
    <Page className="pb-12">
      {run ? (
        <>
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRun(null)}
              aria-label="Leave the discussion"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-dim transition-colors hover:border-dim hover:text-text"
            >
              <IconArrowLeft size={17} />
            </button>
            <p className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold">
              Group discussion
            </p>
            {run.source === 'offline' && <Pill dot={false}>Scripted panel</Pill>}
          </div>
          <Room run={run} onTurn={turn} onFinish={finish} busy={busy} error={error} />
        </>
      ) : result ? (
        <Debrief
          result={result}
          onAgain={start}
          onNext={(to) => navigate(typeof to === 'string' ? to : '/interview')}
        />
      ) : (
        <>
          <PageHead eyebrow="Phase one" title="Group discussion">
            Five candidates, one motion, five exchanges. You decide when to speak — and being the
            loudest is not how this is scored.
          </PageHead>

          {state && (
            <Card className="mb-5">
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Best so far
                </p>
                <span className="stat text-[15px] font-bold">
                  {state.best !== null ? `${state.best}/10` : '—'}
                </span>
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-faint">
                {state.cleared
                  ? 'Cleared. You can run it again any time to push the score up.'
                  : `Clear one at ${state.pass}/10 to reach the interview.`}
              </p>
            </Card>
          )}

          <SectionLabel>Who is in the room</SectionLabel>
          <Card className="mb-5 divide-y divide-hair p-0">
            {(state?.panel ?? []).map((p) => (
              <div key={p.name} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={p.name} value={null} size={32} stroke={0} />
                <span className="flex-1 text-[13.5px] font-medium">{p.name}</span>
                <span className="text-[12px] text-faint">{p.trait}</span>
              </div>
            ))}
          </Card>

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
            <div className="mt-7">
              <SectionLabel>Past discussions</SectionLabel>
              <Card className="divide-y divide-hair p-0">
                {state.history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-[13px] text-dim">{h.topic}</span>
                    <span className="shrink-0 text-[11px] text-faint">
                      {relativeDate(h.timestamp)}
                    </span>
                    <span className="stat w-9 shrink-0 text-right text-[12.5px] text-text">
                      {h.score}/10
                    </span>
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
