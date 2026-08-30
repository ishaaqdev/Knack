import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { api } from '../lib/api'
import { Button, Card, Page, Pill, Spinner } from '../components/primitives'
import { TRACK_ICONS, IconArrowLeft, IconArrowRight, IconRefresh, IconPen } from '../components/Icons'
import { DIFFICULTY_LABEL, useReducedMotion } from '../lib/ui'

const MIN_WORDS = 8
const CUSTOM = 'custom' // the fifth option: write your own

/* ------------------------------------------------------------- progress -- */

/** Five pips, one per stage. The only navigation this screen has. */
function Progress({ total, at }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Stage ${at + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <motion.span
          key={i}
          className="h-1 rounded-full"
          initial={false}
          animate={{
            width: i === at ? 22 : 10,
            backgroundColor:
              i < at ? 'var(--color-ember-low)' : i === at ? 'var(--color-ember)' : 'var(--color-line)',
          }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  )
}

function BriefSkeleton({ label }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2 text-[12px] text-faint">
        <Spinner size={13} />
        {label}
      </div>
      {[100, 92, 74].map((w, i) => (
        <motion.div
          key={i}
          className="h-3.5 rounded-full bg-raised"
          style={{ width: `${w}%` }}
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12 }}
        />
      ))}
    </Card>
  )
}

/* ------------------------------------------------------ choice stage ----- */

function ChoiceStage({ stage, index, answer, onChange, onNext, isLast }) {
  const reduced = useReducedMotion()
  const taRef = useRef(null)

  const picked = answer?.choice ?? null
  const writing = answer?.mode === CUSTOM
  const custom = answer?.custom ?? ''

  useEffect(() => {
    if (!writing) return
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }, [custom, writing])

  const ready = picked !== null || (writing && custom.trim().split(/\s+/).filter(Boolean).length >= 4)

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: -18 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-[3px] bg-ember" />
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
          Stage {index + 1}
        </p>
        <p className="text-[15.5px] leading-[1.65] text-text">{stage.situation}</p>
        <p className="mt-3 text-[14px] font-medium leading-relaxed text-dim">{stage.question}</p>
      </Card>

      <div className="mt-4 space-y-2.5">
        {stage.options.map((text, i) => {
          const on = picked === i
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange({ choice: i, mode: null, custom: '' })}
              className={[
                'flex w-full items-start gap-3 rounded-tile border px-4 py-3.5 text-left transition-colors',
                on
                  ? 'border-ember/45 bg-ember/10'
                  : 'border-line bg-surface hover:border-dim',
              ].join(' ')}
            >
              <span
                className={[
                  'mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold',
                  on ? 'border-ember bg-ember text-[#160c05]' : 'border-line text-faint',
                ].join(' ')}
              >
                {'ABCD'[i]}
              </span>
              <span className={`text-[14.5px] leading-relaxed ${on ? 'text-text' : 'text-dim'}`}>
                {text}
              </span>
            </button>
          )
        })}

        {/* The fifth option. Real workplaces are not multiple choice. */}
        <button
          type="button"
          onClick={() => onChange({ choice: null, mode: CUSTOM, custom })}
          className={[
            'flex w-full items-center gap-3 rounded-tile border border-dashed px-4 py-3 text-left transition-colors',
            writing ? 'border-ember/45 bg-ember/5' : 'border-line hover:border-dim',
          ].join(' ')}
        >
          <span className={writing ? 'text-ember' : 'text-faint'}>
            <IconPen size={15} />
          </span>
          <span className={`text-[13.5px] ${writing ? 'text-text' : 'text-faint'}`}>
            Something else — write it yourself
          </span>
        </button>

        <AnimatePresence initial={false}>
          {writing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="card overflow-hidden p-0 focus-within:border-line">
                <textarea
                  ref={taRef}
                  autoFocus
                  rows={3}
                  value={custom}
                  onChange={(e) => onChange({ choice: null, mode: CUSTOM, custom: e.target.value })}
                  placeholder="What would you actually do?"
                  className="w-full resize-none bg-transparent px-4 py-3 text-[14.5px] leading-relaxed outline-none placeholder:text-faint"
                />
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
                Written answers are graded by the model alongside your final response.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Button size="lg" className="mt-5 w-full" onClick={onNext} disabled={!ready}>
        {isLast ? 'Go to the written stage' : 'Next'} <IconArrowRight size={17} />
      </Button>
    </motion.div>
  )
}

/* ----------------------------------------------------- written stage ----- */

function WrittenStage({ written, loading, text, setText, onSubmit, submitting, error }) {
  const reduced = useReducedMotion()
  const taRef = useRef(null)

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 420)}px`
  }, [text])

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const canSubmit = words >= MIN_WORDS && !submitting && !loading && !!written

  if (loading || !written) {
    return <BriefSkeleton label="Writing the last stage…" />
  }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-[3px] bg-ember" />
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
          Stage 5 — in your own words
        </p>
        <p className="text-[16px] leading-[1.65] text-text">{written.scenarioText}</p>
        {written.source === 'offline' && (
          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            The AI model was busy, so this came from the offline scenario bank.
          </p>
        )}
      </Card>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSubmit) onSubmit()
        }}
        className="mt-5"
      >
        <label htmlFor="response" className="mb-2 block text-[13.5px] font-medium text-dim">
          {written.taskPrompt}
        </label>

        <div className="card overflow-hidden p-0 focus-within:border-line">
          <textarea
            id="response"
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={submitting}
            rows={5}
            placeholder="Write it the way you would actually send it…"
            className="w-full resize-none bg-transparent px-4 py-3.5 text-[15px] leading-relaxed text-text outline-none placeholder:text-faint disabled:opacity-60"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) onSubmit()
            }}
          />
          <div className="flex items-center justify-between border-t border-hair px-4 py-2">
            <span className="stat text-[11px] text-faint">
              {words} {words === 1 ? 'word' : 'words'}
            </span>
            {words > 0 && words < MIN_WORDS && (
              <span className="text-[11px] text-faint">{MIN_WORDS - words} more to submit</span>
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-[12.5px] leading-relaxed text-ember-hi">{error}</p>}

        <Button type="submit" size="lg" className="mt-4 w-full" disabled={!canSubmit}>
          {submitting ? (
            <>
              <Spinner size={16} /> Scoring your level…
            </>
          ) : (
            <>
              Finish level <IconArrowRight size={17} />
            </>
          )}
        </Button>
      </form>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ page -- */

export function QuestSession() {
  const { trackId } = useParams()
  const navigate = useNavigate()

  const user = useKnack((s) => s.user)
  const level = useKnack((s) => s.level)
  const setLevel = useKnack((s) => s.setLevel)
  const applyResult = useKnack((s) => s.applyResult)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [stage, setStage] = useState(0)
  const [answers, setAnswers] = useState([])
  const [text, setText] = useState('')

  const [written, setWritten] = useState(null)
  const [writtenLoading, setWrittenLoading] = useState(false)

  const track = user?.tracks.find((t) => t.id === trackId)
  const Icon = TRACK_ICONS[trackId]
  const stages = level?.stages ?? []
  const total = stages.length + 1
  const onWritten = stage >= stages.length

  const fetchLevel = useCallback(
    async (difficulty) => {
      setLoading(true)
      setError(null)
      setStage(0)
      setAnswers([])
      setText('')
      setWritten(null)
      try {
        const l = await api.generateLevel(trackId, difficulty)
        setLevel(l)
        setAnswers(l.stages.map(() => ({ choice: null, mode: null, custom: '' })))
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    },
    [trackId, setLevel]
  )

  useEffect(() => {
    // Reuse an in-flight level so a back-navigation does not burn a generation.
    if (level?.trackId === trackId) {
      setAnswers(level.stages.map(() => ({ choice: null, mode: null, custom: '' })))
      setLoading(false)
      return
    }
    fetchLevel()
  }, [trackId]) // eslint-disable-line react-hooks/exhaustive-deps

  /*
   * The written stage was started on the server the moment this level was
   * generated. Collecting it one stage early means the request finishes while
   * the trainee is still on question four, so the last screen appears instantly.
   */
  const collectWritten = useCallback(async () => {
    if (!level?.levelId || written || writtenLoading) return
    setWrittenLoading(true)
    try {
      setWritten(await api.writtenStage(level.levelId))
    } catch (e) {
      setError(e.message)
    } finally {
      setWrittenLoading(false)
    }
  }, [level?.levelId, written, writtenLoading])

  useEffect(() => {
    if (!loading && level && stage >= stages.length - 1) collectWritten()
  }, [stage, loading, level, stages.length, collectWritten])

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const result = await api.submitLevel({
        levelId: level.levelId,
        answers: answers.map((a) => ({ choice: a.choice, custom: a.custom })),
        response: text,
      })
      applyResult(result)
      navigate('/feedback', { replace: true })
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <Page className="pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Link
          to="/tracks"
          aria-label="Back to tracks"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-dim transition-colors hover:border-dim hover:text-text"
        >
          <IconArrowLeft size={17} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {Icon && (
              <span className="text-ember">
                <Icon size={16} />
              </span>
            )}
            <p className="truncate font-display text-[15px] font-semibold">{track?.name}</p>
          </div>
          {!loading && level && (
            <div className="mt-1.5">
              <Progress total={total} at={stage} />
            </div>
          )}
        </div>
        {level && !loading && (
          <Pill dot={false} title="Set from your rolling score in this track">
            {DIFFICULTY_LABEL[level.difficulty]}
          </Pill>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" exit={{ opacity: 0 }}>
            <BriefSkeleton label="Building your level…" />
            <p className="mt-3 text-center text-[12px] leading-relaxed text-faint">
              Four judgement calls and one written response, written for you.
            </p>
          </motion.div>
        ) : error && !level ? (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="text-center">
              <p className="font-display text-[16px] font-semibold">Could not build a level</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-dim">{error}</p>
              <Button variant="quiet" className="mt-4" onClick={() => fetchLevel()}>
                <IconRefresh size={16} /> Try again
              </Button>
            </Card>
          </motion.div>
        ) : onWritten ? (
          <motion.div key="written">
            <WrittenStage
              written={written}
              loading={writtenLoading || !written}
              text={text}
              setText={setText}
              onSubmit={submit}
              submitting={submitting}
              error={error}
            />
          </motion.div>
        ) : (
          <motion.div key={`stage-${stage}`}>
            {level.setting && stage === 0 && (
              <p className="mb-4 text-[13px] leading-relaxed text-faint">{level.setting}</p>
            )}
            <ChoiceStage
              stage={stages[stage]}
              index={stage}
              answer={answers[stage]}
              onChange={(a) =>
                setAnswers((prev) => prev.map((old, i) => (i === stage ? a : old)))
              }
              onNext={() => setStage((s) => s + 1)}
              isLast={stage === stages.length - 1}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && level && !onWritten && (
        <button
          type="button"
          onClick={() => fetchLevel(level.difficulty)}
          className="mx-auto mt-4 flex items-center gap-1.5 text-[12px] text-faint transition-colors hover:text-dim"
        >
          <IconRefresh size={13} /> Different level
        </button>
      )}
    </Page>
  )
}
