import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { api } from '../lib/api'
import { Button, Card, Empty, Page, Pill, SectionLabel, SkillBar, Spinner } from '../components/primitives'
import {
  IconArrowLeft,
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconLock,
  IconRefresh,
} from '../components/Icons'
import { relativeDate, useReducedMotion } from '../lib/ui'

const MIN_WORDS = 12

/* ------------------------------------------------------------- overview -- */

function RoundRow({ round, onStart, busy, index }) {
  const reduced = useReducedMotion()
  const locked = !round.unlocked

  return (
    <motion.button
      type="button"
      disabled={locked || busy}
      onClick={() => onStart(round.level)}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : index * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={[
        'card flex w-full items-center gap-3.5 p-4 text-left transition-colors',
        locked ? 'opacity-55' : 'hover:border-dim',
      ].join(' ')}
    >
      <span
        className={[
          'grid h-9 w-9 shrink-0 place-items-center rounded-full border',
          round.cleared
            ? 'border-ember bg-ember text-[#160c05]'
            : locked
              ? 'border-line text-faint'
              : 'border-ember/40 text-ember',
        ].join(' ')}
      >
        {round.cleared ? <IconCheck size={16} /> : locked ? <IconLock size={15} /> : round.level}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-display text-[15px] font-semibold">{round.name}</span>
          {round.best !== null && (
            <span className="stat text-[12px] text-faint">best {round.best}/10</span>
          )}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-dim">{round.focus}</span>
      </span>

      {!locked && <IconArrowRight size={17} className="shrink-0 text-faint" />}
    </motion.button>
  )
}

function Overview({ state, onStart, busy, error }) {
  const user = useKnack((s) => s.user)

  return (
    <>
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-bold tracking-tight">Interview prep</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-dim">
          Five rounds against an interviewer who has read your file. You are applying for{' '}
          <span className="text-text">{state.role}</span> at {state.company}.
        </p>
      </div>

      <Card className="mb-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            Interview readiness
          </p>
          <span className="stat text-[15px] font-bold">{state.readiness}</span>
        </div>
        <SkillBar value={state.readiness} className="mt-2.5" />
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-faint">
          {state.totalRuns === 0
            ? 'Nothing yet. Clear a round with 6/10 or better to open the next one.'
            : `${state.cleared} of ${state.maxLevel} rounds cleared over ${state.totalRuns} ${
                state.totalRuns === 1 ? 'attempt' : 'attempts'
              }.`}
        </p>
      </Card>

      {!state.hasResume && (
        <Card className="mb-5 border-ember/25">
          <p className="text-[13.5px] leading-relaxed text-dim">
            No resume on file, so the questions will be generic ones for {state.role}. Add your
            resume and the interviewer asks about your actual projects.
          </p>
          <Button as={Link} to="/profile" variant="quiet" size="sm" className="mt-3.5">
            Add your resume
          </Button>
        </Card>
      )}

      {error && (
        <p className="mb-4 text-[12.5px] leading-relaxed text-ember-hi" role="alert">
          {error}
        </p>
      )}

      <SectionLabel>Rounds</SectionLabel>
      <div className="space-y-3">
        {state.rounds.map((r, i) => (
          <RoundRow key={r.level} round={r} index={i} onStart={onStart} busy={busy} />
        ))}
      </div>

      {state.history?.length > 0 && (
        <div className="mt-7">
          <SectionLabel>Past rounds</SectionLabel>
          <Card className="divide-y divide-hair p-0">
            {state.history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                <span className="stat w-6 shrink-0 text-[12px] text-faint">R{h.level}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-dim">
                  {h.verdict || 'Completed'}
                </span>
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

      <p className="mt-6 text-center text-[12px] leading-relaxed text-faint">
        A round is three questions and takes about five minutes. XP counts towards level{' '}
        {user?.level?.name ? `(${user.level.name} now)` : ''}.
      </p>
    </>
  )
}

/* ------------------------------------------------------------ the round -- */

function Round({ run, onFinish, submitting, error, onQuit }) {
  const reduced = useReducedMotion()
  const [at, setAt] = useState(0)
  const [answers, setAnswers] = useState(() => run.questions.map(() => ''))
  const taRef = useRef(null)

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 380)}px`
  }, [answers, at])

  const q = run.questions[at]
  const answer = answers[at]
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0
  const last = at === run.questions.length - 1
  const ready = words >= MIN_WORDS && !submitting

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onQuit}
          aria-label="Leave the interview"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-dim transition-colors hover:border-dim hover:text-text"
        >
          <IconArrowLeft size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-semibold">
            Round {run.round.level} — {run.round.name}
          </p>
          <p className="mt-0.5 text-[11.5px] text-faint">
            Question {at + 1} of {run.questions.length} · {run.role}
          </p>
        </div>
        {run.source === 'offline' && <Pill dot={false}>Standard questions</Pill>}
      </div>

      {at === 0 && run.opener && (
        <p className="mb-4 text-[13px] leading-relaxed text-faint">{run.opener}</p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={at}
          initial={reduced ? false : { opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, x: -18 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-[3px] bg-ember" />
            <p className="mb-2.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
              <IconBriefcase size={13} /> The interviewer
            </p>
            <p className="text-[16px] leading-[1.65] text-text">{q.text}</p>
            {q.hint && (
              <p className="mt-3 border-t border-hair pt-3 text-[12.5px] leading-relaxed text-faint">
                A good answer: {q.hint}
              </p>
            )}
          </Card>

          <div className="card mt-4 overflow-hidden p-0 focus-within:border-line">
            <textarea
              ref={taRef}
              autoFocus
              rows={6}
              value={answer}
              disabled={submitting}
              onChange={(e) =>
                setAnswers((prev) => prev.map((a, i) => (i === at ? e.target.value : a)))
              }
              placeholder="Answer as you would out loud…"
              className="w-full resize-none bg-transparent px-4 py-3.5 text-[15px] leading-relaxed outline-none placeholder:text-faint disabled:opacity-60"
            />
            <div className="flex items-center justify-between border-t border-hair px-4 py-2">
              <span className="stat text-[11px] text-faint">
                {words} {words === 1 ? 'word' : 'words'}
              </span>
              {words > 0 && words < MIN_WORDS && (
                <span className="text-[11px] text-faint">{MIN_WORDS - words} more</span>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {error && <p className="mt-3 text-[12.5px] leading-relaxed text-ember-hi">{error}</p>}

      <Button
        size="lg"
        className="mt-4 w-full"
        disabled={!ready}
        onClick={() => (last ? onFinish(answers) : setAt((i) => i + 1))}
      >
        {submitting ? (
          <>
            <Spinner size={16} /> Getting your debrief…
          </>
        ) : (
          <>
            {last ? 'Finish and get the debrief' : 'Next question'} <IconArrowRight size={17} />
          </>
        )}
      </Button>

      {at > 0 && !submitting && (
        <button
          type="button"
          onClick={() => setAt((i) => i - 1)}
          className="mx-auto mt-3.5 flex text-[12px] text-faint transition-colors hover:text-dim"
        >
          Back to the previous question
        </button>
      )}
    </>
  )
}

/* --------------------------------------------------------------- debrief -- */

function Debrief({ result, onAgain, onDone }) {
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
          Round {result.level} — {result.round.name}
        </p>
        <p className="stat mt-2 text-[46px] font-bold leading-none text-ember">
          {result.score}
          <span className="text-[22px] text-faint">/10</span>
        </p>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-dim">
          {result.verdict}
        </p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <Pill active={result.passed}>
            {result.passed ? 'Round cleared' : `Needs ${result.passScore}/10 to clear`}
          </Pill>
          <Pill dot={false}>+{result.xp.total} XP</Pill>
        </div>

        {result.unlockedRound && (
          <p className="mt-3 text-[13px] text-ember-hi">
            Round {result.unlockedRound} is now open.
          </p>
        )}
      </motion.div>

      <div className="space-y-3">
        {result.answers.map((a, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-[14px] font-medium leading-relaxed text-text">{a.question}</p>
              <span className="stat shrink-0 text-[13px] text-ember">{a.score}/10</span>
            </div>

            <p className="mt-2.5 border-l-2 border-line pl-3 text-[13px] italic leading-relaxed text-faint">
              {a.answer || 'No answer given.'}
            </p>

            <div className="mt-3.5 space-y-2.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                  What worked
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-dim">{a.worked}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                  What to improve
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-dim">{a.improve}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Stronger framing
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ember-hi">{a.better}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-5 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            Across the round
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-dim">{result.strengths}</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-dim">{result.gaps}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            Before the next round
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ember-hi">{result.nextFocus}</p>
        </div>
        {result.offlineNote && (
          <p className="text-[11.5px] leading-relaxed text-faint">{result.offlineNote}</p>
        )}
      </Card>

      <div className="mt-5 space-y-3">
        <Button size="lg" className="w-full" onClick={onAgain}>
          {result.unlockedRound ? `Start round ${result.unlockedRound}` : 'Run this round again'}
          <IconArrowRight size={17} />
        </Button>
        <Button variant="ghost" size="lg" className="w-full" onClick={onDone}>
          Back to interview prep
        </Button>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ page -- */

export function Interview() {
  const navigate = useNavigate()
  const applyResult = useKnack((s) => s.applyResult)

  const [state, setState] = useState(null)
  const [run, setRun] = useState(null)
  const [result, setResult] = useState(null)

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    try {
      setState(await api.interview())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function start(level) {
    setBusy(true)
    setError(null)
    try {
      setResult(null)
      setRun(await api.startInterview(level))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function finish(answers) {
    setSubmitting(true)
    setError(null)
    try {
      const r = await api.submitInterview({ runId: run.runId, answers })
      applyResult(r)
      setResult(r)
      setRun(null)
      refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Page>
        <div className="flex items-center gap-2 text-[13px] text-faint">
          <Spinner size={15} /> Loading your rounds…
        </div>
      </Page>
    )
  }

  if (!state) {
    return (
      <Page>
        <Empty
          title="Interview prep is unavailable"
          body={error ?? 'The server did not respond.'}
          action={
            <Button variant="quiet" onClick={refresh}>
              <IconRefresh size={16} /> Try again
            </Button>
          }
        />
      </Page>
    )
  }

  return (
    <Page className="pb-12">
      {busy && !run && (
        <div className="mb-4 flex items-center gap-2 text-[13px] text-faint">
          <Spinner size={15} /> Your interviewer is reading your file…
        </div>
      )}

      {run ? (
        <Round
          run={run}
          submitting={submitting}
          error={error}
          onFinish={finish}
          onQuit={() => {
            setRun(null)
            setError(null)
          }}
        />
      ) : result ? (
        <Debrief
          result={result}
          onAgain={() => start(result.unlockedRound ?? result.level)}
          onDone={() => {
            setResult(null)
            navigate('/interview', { replace: true })
          }}
        />
      ) : (
        <Overview state={state} onStart={start} busy={busy} error={error} />
      )}
    </Page>
  )
}
