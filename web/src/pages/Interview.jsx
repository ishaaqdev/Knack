import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { api } from '../lib/api'
import { Button, Card, Empty, Page, PageHead, Pill, SectionLabel, SkillBar, Spinner } from '../components/primitives'
import { Character } from '../components/Character'
import { PersonCard } from '../components/PersonProfile'
import { JourneyPath } from '../components/JourneyPath'
import { MicButton } from '../components/MicButton'
import { Stars, starsFor } from '../components/Stars'
import { IconArrowLeft, IconArrowRight, IconCheck, IconRefresh } from '../components/Icons'
import { cx, relativeDate, useReducedMotion } from '../lib/ui'

const MIN_WORDS = 12

/**
 * Interview prep.
 *
 * Each of the five rounds is two steps. First a mock: five multiple-choice
 * questions where every option is explained the moment you pick it, so you learn
 * what a strong answer sounds like. Then the real round, where you answer in
 * your own words and are assessed. The mock is required once per round because
 * being assessed on a kind of question you have never seen answered well is a
 * poor way to find out what a good answer is.
 */

const GRADE_STYLE = {
  Strong: { ring: 'border-ember bg-ember/12', chip: 'bg-ember text-[#160c05]', face: 'smile' },
  Decent: { ring: 'border-ember/60 bg-ember/8', chip: 'bg-ember/20 text-ember-hi', face: 'neutral' },
  Weak: { ring: 'border-line bg-white/5', chip: 'bg-line text-dim', face: 'think' },
  Costly: { ring: 'border-faint bg-black/30', chip: 'bg-ember-dim text-ember-hi', face: 'frown' },
}

const LETTERS = ['A', 'B', 'C', 'D']

/* ------------------------------------------------------------- overview -- */

function RoundPanel({ round, practice, company, onMock, onStart, busy }) {
  const mockDone = round.mock.done
  const canStartReal = practice || mockDone

  return (
    <Card hot className="mt-2">
      <PersonCard
        person={{ ...round.interviewer, role: round.interviewer.title }}
        expression={round.cleared ? 'smile' : 'neutral'}
      />

      <div className="mt-4 border-t-2 border-hair pt-4">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">
          Round {round.level} · {round.name}
        </p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-dim">
          {round.focus}
          {company ? `, the way ${company} tends to ask it.` : '.'}
        </p>
      </div>

      <ol className="mt-4 space-y-3">
        <li className="flex items-center gap-3">
          <span
            className={cx(
              'stat grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold',
              mockDone ? 'bg-ember-hi text-[#160c05]' : 'bg-ember text-[#160c05]'
            )}
          >
            {mockDone ? <IconCheck size={16} strokeWidth={2.6} /> : 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold">Mock interview</p>
            <p className="text-[12px] text-faint">
              {mockDone
                ? `Done${round.mock.best !== null ? `, best ${round.mock.best}/10` : ''}. Run it again any time.`
                : 'Five questions. Every option is explained.'}
            </p>
          </div>
          <Button size="sm" variant={mockDone ? 'ghost' : 'primary'} onClick={() => onMock(round.level)} disabled={busy}>
            {mockDone ? 'Again' : 'Start'}
          </Button>
        </li>

        <li className="flex items-center gap-3">
          <span
            className={cx(
              'stat grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold',
              round.cleared
                ? 'bg-ember-hi text-[#160c05]'
                : canStartReal
                  ? 'bg-ember text-[#160c05]'
                  : 'bg-raised text-faint'
            )}
          >
            {round.cleared ? <IconCheck size={16} strokeWidth={2.6} /> : 2}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cx('text-[14px] font-bold', !canStartReal && 'text-faint')}>The real round</p>
            <p className="text-[12px] text-faint">
              {canStartReal
                ? round.best !== null
                  ? `Best so far ${round.best}/10.`
                  : 'Three questions, in your own words.'
                : 'Do the mock first, then this opens.'}
            </p>
          </div>
          <Button
            size="sm"
            variant={canStartReal && mockDone ? 'primary' : 'ghost'}
            onClick={() => onStart(round.level)}
            disabled={busy || !canStartReal}
          >
            {round.cleared ? 'Again' : 'Go'}
          </Button>
        </li>
      </ol>
    </Card>
  )
}

function Overview({ state, onMock, onStart, busy, error, practice, company }) {
  const [picked, setPicked] = useState(null)

  const rounds = state.rounds.map((r) => (practice ? { ...r, unlocked: true } : r))
  // The one to do next: the first open round that has not been cleared.
  const currentLevel = rounds.find((r) => r.unlocked && !r.cleared)?.level ?? null
  const active = rounds.find((r) => r.level === (picked ?? currentLevel ?? 1)) ?? rounds[0]

  const nodes = rounds.map((r) => ({
    id: r.level,
    title: r.name,
    sub: r.cleared
      ? `${r.best}/10 · ${r.mock.done ? 'mock done' : 'cleared'}`
      : r.unlocked
        ? r.mock.done
          ? 'Mock done, real round open'
          : 'Start with the mock'
        : 'Clear the round before',
    state: r.cleared ? 'done' : r.level === currentLevel ? 'current' : r.unlocked ? 'open' : 'locked',
    stars: r.best !== null ? starsFor(r.best) : undefined,
    tag: r.level === currentLevel ? 'You are here' : undefined,
    glyph: r.level,
    onClick: () => setPicked(r.level),
  }))

  return (
    <>
      <PageHead eyebrow={practice ? 'Practice · nothing at stake' : state.role} title="Interview prep">
        Five rounds against interviewers who have read your file. Do the mock first, then the real thing.
        {company ? ` You are applying at ${company}.` : ''}
      </PageHead>

      <Card className="mb-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">Interview readiness</p>
          <span className="stat text-[17px] font-bold">{state.readiness}</span>
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
        <Card className="mb-5 border-ember/60">
          <p className="text-[13.5px] leading-relaxed text-dim">
            No resume on file, so the real-round questions will be generic ones for {state.role}. Add your resume and
            the interviewer asks about your actual projects.
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

      <SectionLabel>The rounds</SectionLabel>
      <JourneyPath nodes={nodes} className="mb-2" />
      <RoundPanel round={active} practice={practice} company={company} onMock={onMock} onStart={onStart} busy={busy} />

      {state.history?.length > 0 && (
        <div className="mt-8">
          <SectionLabel>Past rounds</SectionLabel>
          <Card className="divide-y-2 divide-hair p-0">
            {state.history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                <span className="stat w-7 shrink-0 text-[12.5px] font-bold text-faint">R{h.level}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-dim">{h.verdict || 'Completed'}</span>
                <span className="shrink-0 text-[11px] text-faint">{relativeDate(h.timestamp)}</span>
                <span className="stat w-10 shrink-0 text-right text-[13px] font-bold text-text">{h.score}/10</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------- the mock -- */

function MockRun({ run, onDone, onQuit }) {
  const reduced = useReducedMotion()
  const [at, setAt] = useState(0)
  const [fb, setFb] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const q = run.questions[at]
  const answer = fb[at]
  const last = at === run.questions.length - 1
  const grade = answer ? GRADE_STYLE[answer.grade] : null

  async function choose(i) {
    if (answer || busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await api.answerMock(run.runId, at, i)
      setFb((f) => ({ ...f, [at]: r }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onQuit}
          aria-label="Leave the mock"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-line text-dim transition-colors hover:border-ember hover:text-text"
        >
          <IconArrowLeft size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[17px] font-semibold">
            Mock · Round {run.round.level}, {run.round.name}
          </p>
          <p className="mt-0.5 text-[12px] text-faint">
            Question {at + 1} of {run.questions.length}
            {run.company ? ` · ${run.company}` : ''}
          </p>
        </div>
        <Pill dot={false}>{run.source === 'mixed' ? `${run.written} written for you` : 'Practice bank'}</Pill>
      </div>

      <div className="mb-4 flex gap-1.5" aria-hidden="true">
        {run.questions.map((_, i) => (
          <span
            key={i}
            className={cx('h-2 flex-1 rounded-full', i < at ? 'bg-ember-hi' : i === at ? 'bg-ember' : 'bg-hair')}
          />
        ))}
      </div>

      {at === 0 && run.leaningOn?.length > 0 && (
        <p className="mb-4 text-[12.5px] leading-relaxed text-faint">
          Leaning on {run.leaningOn.join(', ')} this time, because that is where you have been losing marks.
        </p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={at}
          initial={reduced ? false : { opacity: 0, x: 22 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, x: -22 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="flex items-start gap-3.5">
            <Character
              look={run.interviewer.look}
              accent={run.interviewer.accent}
              expression={grade?.face ?? 'neutral'}
              speaking={!answer}
              size={62}
              title={run.interviewer.name}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-bold text-faint">
                {run.interviewer.name} · {run.interviewer.title}
              </p>
              <p className="mt-1.5 text-[15.5px] font-semibold leading-[1.55] text-text">{q.question}</p>
            </div>
          </Card>

          <div className="mt-4 space-y-3">
            {q.options.map((o, i) => {
              const info = answer?.options[i]
              const style = info ? GRADE_STYLE[info.grade] : null
              const chosen = answer?.choice === i
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!!answer || busy}
                  onClick={() => choose(i)}
                  className={cx(
                    'card flex w-full gap-3 p-3.5 text-left',
                    !answer && 'card-tap',
                    style && cx(style.ring, !chosen && 'opacity-85'),
                    chosen && 'ring-4 ring-white/30'
                  )}
                >
                  <span
                    className={cx(
                      'stat grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold',
                      style ? style.chip : 'bg-raised text-ember-hi'
                    )}
                  >
                    {LETTERS[i]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] leading-relaxed text-text">{o.text}</span>
                    {info && (
                      <span className="mt-2 block border-t-2 border-white/10 pt-2 text-[12.5px] leading-relaxed text-dim">
                        <span className="font-extrabold">
                          {info.grade}
                          {chosen ? ' (your pick)' : ''}.{' '}
                        </span>
                        {info.why}
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {answer && (
            <motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <Card className="border-ember/70">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ember-hi">Remember this</p>
                <p className="mt-1 text-[14px] leading-relaxed text-text">{answer.lesson}</p>
              </Card>
              <Button size="lg" className="mt-4 w-full" onClick={() => (last ? onDone(run.runId) : setAt((i) => i + 1))}>
                {last ? 'See how you did' : 'Next question'} <IconArrowRight size={17} />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && <p className="mt-3 text-[12.5px] text-ember-hi">{error}</p>}
    </>
  )
}

function MockResult({ result, practice, onReal, onBack }) {
  const reduced = useReducedMotion()
  const next = result.profile?.next

  return (
    <>
      <motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 text-center">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-faint">
          Mock · Round {result.level}, {result.round}
        </p>
        <div className="mt-3">
          <Stars score={result.score} size={40} />
        </div>
        <p className="stat mt-3 text-[52px] font-bold leading-none text-ember">
          {result.score}
          <span className="text-[24px] text-faint">/10</span>
        </p>
        <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-dim">{result.verdict}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Pill dot={false}>{result.xp.total > 0 ? `+${result.xp.total} XP` : 'Repeat mocks teach, they do not pay'}</Pill>
        </div>
      </motion.div>

      {result.missed.length > 0 ? (
        <Card className="space-y-3">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">
            Take these into the real round
          </p>
          {result.missed.map((m) => (
            <div key={m.topic}>
              <p className="text-[12px] font-bold capitalize text-ember-hi">{m.topic}</p>
              <p className="mt-0.5 text-[13.5px] leading-relaxed text-dim">{m.lesson}</p>
            </div>
          ))}
        </Card>
      ) : (
        <Card>
          <p className="text-[13.5px] leading-relaxed text-dim">
            You picked a sound answer every time. The real round asks you to say it in your own words, which is harder,
            so keep the structure and use your own examples.
          </p>
        </Card>
      )}

      {next && next.kind !== 'mock' && (
        <Card className="mt-4 border-ember/50">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ember-hi">What Knack has noticed</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-dim">{next.text}</p>
        </Card>
      )}

      <div className="mt-6 space-y-3">
        {(result.unlocked || practice) && (
          <Button size="lg" className="w-full" onClick={onReal}>
            Start the real round <IconArrowRight size={17} />
          </Button>
        )}
        <Button variant="ghost" size="lg" className="w-full" onClick={onBack}>
          Back to the rounds
        </Button>
      </div>
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

  const appendSpoken = useCallback(
    (chunk) => setAnswers((prev) => prev.map((a, i) => (i === at ? (a ? `${a} ${chunk}` : chunk) : a))),
    [at]
  )

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onQuit}
          aria-label="Leave the interview"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-line text-dim transition-colors hover:border-ember hover:text-text"
        >
          <IconArrowLeft size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[17px] font-semibold">
            Round {run.round.level}, {run.round.name}
          </p>
          <p className="mt-0.5 text-[12px] text-faint">
            Question {at + 1} of {run.questions.length} · {run.role}
          </p>
        </div>
        {run.source === 'offline' && <Pill dot={false}>Standard questions</Pill>}
      </div>

      {at === 0 && run.opener && <p className="mb-4 text-[13.5px] leading-relaxed text-faint">{run.opener}</p>}

      <AnimatePresence mode="wait">
        <motion.div
          key={at}
          initial={reduced ? false : { opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, x: -18 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="flex items-start gap-3.5">
            {run.interviewer && (
              <Character
                look={run.interviewer.look}
                accent={run.interviewer.accent}
                speaking={!answer}
                size={62}
                title={run.interviewer.name}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-bold text-faint">
                {run.interviewer ? `${run.interviewer.name} · ${run.interviewer.title}` : 'The interviewer'}
              </p>
              <p className="mt-1.5 text-[16px] font-semibold leading-[1.6] text-text">{q.text}</p>
              {q.hint && (
                <p className="mt-3 border-t-2 border-hair pt-3 text-[12.5px] leading-relaxed text-faint">
                  A good answer: {q.hint}
                </p>
              )}
            </div>
          </Card>

          <div className="card mt-4 overflow-hidden p-0 focus-within:border-ember">
            <textarea
              ref={taRef}
              autoFocus
              rows={6}
              value={answer}
              disabled={submitting}
              onChange={(e) => setAnswers((prev) => prev.map((a, i) => (i === at ? e.target.value : a)))}
              placeholder="Answer as you would out loud, or tap the mic and say it."
              className="w-full resize-none bg-transparent px-4 py-3.5 text-[15px] leading-relaxed outline-none placeholder:text-faint disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-3 border-t-2 border-hair px-3 py-2">
              <MicButton onText={appendSpoken} disabled={submitting} size="sm" />
              <span className="stat shrink-0 text-[11.5px] text-faint">
                {words} {words === 1 ? 'word' : 'words'}
                {words > 0 && words < MIN_WORDS ? ` · ${MIN_WORDS - words} more` : ''}
              </span>
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
          className="mx-auto mt-3.5 flex text-[12.5px] font-semibold text-faint transition-colors hover:text-dim"
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
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-faint">
          Round {result.level}, {result.round.name}
        </p>
        <div className="mt-3">
          <Stars score={result.score} size={40} />
        </div>
        <p className="stat mt-3 text-[52px] font-bold leading-none text-ember">
          {result.score}
          <span className="text-[24px] text-faint">/10</span>
        </p>
        <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-dim">{result.verdict}</p>

        <div className="mt-4 flex items-center justify-center gap-2">
          <Pill active={result.passed}>{result.passed ? 'Round cleared' : `Needs ${result.passScore}/10 to clear`}</Pill>
          <Pill dot={false}>+{result.xp.total} XP</Pill>
        </div>

        {result.unlockedRound && (
          <p className="mt-3 text-[13.5px] font-bold text-ember-hi">Round {result.unlockedRound} is now open.</p>
        )}
      </motion.div>

      <div className="space-y-3">
        {result.answers.map((a, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-[14.5px] font-semibold leading-relaxed text-text">{a.question}</p>
              <span className="stat shrink-0 text-[14px] font-bold text-ember">{a.score}/10</span>
            </div>

            <p className="mt-2.5 border-l-4 border-line pl-3 text-[13px] italic leading-relaxed text-faint">
              {a.answer || 'No answer given.'}
            </p>

            <div className="mt-3.5 space-y-2.5">
              <div>
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">What worked</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-dim">{a.worked}</p>
              </div>
              <div>
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">What to change</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-dim">{a.improve}</p>
              </div>
              <div>
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">How I would say it</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ember-hi">{a.better}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-5 space-y-3">
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">Across the round</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-dim">{result.strengths}</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-dim">{result.gaps}</p>
        </div>
        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">Before the next round</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ember-hi">{result.nextFocus}</p>
        </div>
        {result.offlineNote && <p className="text-[11.5px] leading-relaxed text-faint">{result.offlineNote}</p>}
      </Card>

      <div className="mt-6 space-y-3">
        <Button size="lg" className="w-full" onClick={onAgain}>
          {result.unlockedRound ? `On to round ${result.unlockedRound}` : 'Run this round again'}
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
  const [params] = useSearchParams()
  const practice = params.get('practice') === '1'
  const applyResult = useKnack((s) => s.applyResult)
  const reloadUser = useKnack((s) => s.load)
  const company = useKnack((s) => s.user?.sim?.company)

  const [state, setState] = useState(null)
  const [run, setRun] = useState(null)
  const [mock, setMock] = useState(null)
  const [mockResult, setMockResult] = useState(null)
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

  async function startMock(level) {
    setBusy(true)
    setError(null)
    try {
      setResult(null)
      setMockResult(null)
      setMock(await api.startMock(level, practice))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function finishMock(runId) {
    setBusy(true)
    try {
      const r = await api.finishMock(runId)
      setMockResult(r)
      setMock(null)
      refresh()
      reloadUser()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function start(level) {
    setBusy(true)
    setError(null)
    try {
      setResult(null)
      setMockResult(null)
      setRun(await api.startInterview(level, practice))
    } catch (e) {
      setError(e.message)
      if (e.status === 409) refresh()
    } finally {
      setBusy(false)
    }
  }

  async function finish(answers) {
    setSubmitting(true)
    setError(null)
    try {
      const r = await api.submitInterview({ runId: run.runId, answers })
      // A practice round awards nothing, so there is nothing to apply.
      if (!r.practice) applyResult(r)
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
      {busy && !run && !mock && (
        <div className="mb-4 flex items-center gap-2 text-[13px] text-faint">
          <Spinner size={15} /> Your interviewer is reading your file…
        </div>
      )}

      {mock ? (
        <MockRun
          run={mock}
          onDone={finishMock}
          onQuit={() => {
            setMock(null)
            setError(null)
          }}
        />
      ) : mockResult ? (
        <MockResult
          result={mockResult}
          practice={practice}
          onReal={() => start(mockResult.level)}
          onBack={() => {
            setMockResult(null)
            navigate('/interview', { replace: true })
          }}
        />
      ) : run ? (
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
        <Overview
          state={state}
          onMock={startMock}
          onStart={start}
          busy={busy}
          error={error}
          practice={practice}
          company={company}
        />
      )}
    </Page>
  )
}
