import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { api } from '../lib/api'
import { Button, Card, Page, Pill, Spinner } from '../components/primitives'
import { TRACK_ICONS, IconArrowLeft, IconArrowRight, IconRefresh } from '../components/Icons'
import { DIFFICULTY_LABEL, useReducedMotion } from '../lib/ui'

const MIN_WORDS = 8

/* --------------------------------------------------------- loading brief -- */

function BriefSkeleton() {
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2 text-[12px] text-faint">
        <Spinner size={13} />
        Writing your scenario…
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

/* ------------------------------------------------------------------ page -- */

export function QuestSession() {
  const { trackId } = useParams()
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const user = useKnack((s) => s.user)
  const quest = useKnack((s) => s.quest)
  const setQuest = useKnack((s) => s.setQuest)
  const applyResult = useKnack((s) => s.applyResult)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [text, setText] = useState('')

  const taRef = useRef(null)
  const track = user?.tracks.find((t) => t.id === trackId)
  const Icon = TRACK_ICONS[trackId]

  const fetchQuest = useCallback(
    async (difficulty) => {
      setLoading(true)
      setError(null)
      try {
        const q = await api.generate(trackId, difficulty)
        setQuest(q)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    },
    [trackId, setQuest]
  )

  useEffect(() => {
    // Reuse an in-flight quest for this track so a back-navigation does not
    // silently burn a new generation (and a different scenario).
    if (quest?.trackId === trackId) {
      setLoading(false)
      return
    }
    fetchQuest()
  }, [trackId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Textarea grows with the content — no inner scrollbar on mobile.
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 460)}px`
  }, [text])

  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const canSubmit = words >= MIN_WORDS && !submitting && !loading && !!quest

  async function submit(e) {
    e?.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await api.evaluate({
        trackId,
        difficulty: quest.difficulty,
        scenarioText: quest.scenarioText,
        userResponse: text,
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
      {/* back + track */}
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
            {Icon && <span className="text-ember"><Icon size={16} /></span>}
            <p className="truncate font-display text-[15px] font-semibold">{track?.name}</p>
          </div>
        </div>
        {quest && (
          <Pill dot={false} title="Set from your rolling score in this track">
            {DIFFICULTY_LABEL[quest.difficulty]}
          </Pill>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" exit={{ opacity: 0 }}>
            <BriefSkeleton />
          </motion.div>
        ) : error && !quest ? (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="text-center">
              <p className="font-display text-[16px] font-semibold">Could not load a scenario</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-dim">{error}</p>
              <Button variant="quiet" className="mt-4" onClick={() => fetchQuest()}>
                <IconRefresh size={16} /> Try again
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="brief"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* mission brief */}
            <Card className="relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-[3px] bg-ember" />
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                The situation
              </p>
              <p className="text-[16px] leading-[1.65] text-text">{quest.scenarioText}</p>

              {quest.source === 'offline' && (
                <p className="mt-3 text-[11px] leading-relaxed text-faint">
                  The AI model was busy, so this came from the offline scenario bank.
                </p>
              )}
            </Card>

            <form onSubmit={submit} className="mt-5">
              <label htmlFor="response" className="mb-2 block text-[13.5px] font-medium text-dim">
                {quest.taskPrompt}
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
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e)
                  }}
                />
                <div className="flex items-center justify-between border-t border-hair px-4 py-2">
                  <span className="stat text-[11px] text-faint">
                    {words} {words === 1 ? 'word' : 'words'}
                  </span>
                  {words > 0 && words < MIN_WORDS && (
                    <span className="text-[11px] text-faint">
                      {MIN_WORDS - words} more to submit
                    </span>
                  )}
                </div>
              </div>

              {error && quest && (
                <p className="mt-3 text-[12.5px] leading-relaxed text-ember-hi">{error}</p>
              )}

              <Button type="submit" size="lg" className="mt-4 w-full" disabled={!canSubmit}>
                {submitting ? (
                  <>
                    <Spinner size={16} /> Scoring your response…
                  </>
                ) : (
                  <>
                    Submit response <IconArrowRight size={17} />
                  </>
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setText('')
                  fetchQuest(quest.difficulty)
                }}
                disabled={submitting}
                className="mx-auto mt-3.5 flex items-center gap-1.5 text-[12px] text-faint transition-colors hover:text-dim disabled:opacity-40"
              >
                <IconRefresh size={13} /> Different scenario
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  )
}
