import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { Button, Card, Page, Pill } from '../components/primitives'
import { ScoreDial } from '../components/ScoreDial'
import { LevelUpModal } from '../components/LevelUpModal'
import { CountUp } from '../components/CountUp'
import { Burst } from '../components/Burst'
import { IconArrowRight, IconFlame, IconCheck, IconClose, IconPen } from '../components/Icons'
import { streakMessage, useReducedMotion } from '../lib/ui'

function Section({ label, children, delay, accent }) {
  const reduced = useReducedMotion()
  if (!children) return null
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</p>
      <p className={`text-[14px] leading-relaxed ${accent ? 'text-ember-hi' : 'text-dim'}`}>
        {children}
      </p>
    </motion.div>
  )
}

/**
 * The four judgement calls, replayed.
 *
 * A score on its own teaches nothing — what teaches is seeing the option you
 * picked next to the one that scored highest, with the reason for both.
 */
function StageReview({ stages }) {
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(null)

  return (
    <Card className="mt-5">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
          Your four calls
        </p>
        <span className="stat text-[11px] text-faint">
          {stages.reduce((n, s) => n + (s.chosen === s.best ? 1 : 0), 0)}/{stages.length} best
        </span>
      </div>

      <div className="space-y-2">
        {stages.map((st, i) => {
          const wrote = st.chosen === null && st.custom
          const bestPick = st.chosen === st.best
          const isOpen = open === i

          return (
            <div key={i} className="rounded-tile border border-line bg-surface">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                    st.score >= 8
                      ? 'bg-ember text-[#160c05]'
                      : st.score >= 5
                        ? 'border border-ember/40 text-ember-hi'
                        : 'border border-line text-faint'
                  }`}
                >
                  {wrote ? <IconPen size={12} /> : bestPick ? <IconCheck size={13} /> : <IconClose size={12} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-dim">
                  {st.question}
                </span>
                <span className="stat shrink-0 text-[12.5px] text-text">{st.score}/10</span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={reduced ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-hair px-3.5 py-3">
                      <p className="text-[12.5px] leading-relaxed text-faint">{st.situation}</p>

                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                          {wrote ? 'What you wrote' : 'What you picked'}
                        </p>
                        <p className="text-[13.5px] leading-relaxed text-text">
                          {wrote ? st.custom : st.options[st.chosen]}
                        </p>
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-dim">{st.why}</p>
                      </div>

                      {!bestPick && (
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                            Strongest option
                          </p>
                          <p className="text-[13.5px] leading-relaxed text-ember-hi">
                            {st.options[st.best]}
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function Feedback() {
  const result = useKnack((s) => s.result)
  const level = useKnack((s) => s.level)
  const clearSession = useKnack((s) => s.clearSession)
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const [showLevelUp, setShowLevelUp] = useState(false)
  const [xpBurst, setXpBurst] = useState(false)

  useEffect(() => {
    if (!result) return
    const t1 = setTimeout(() => setXpBurst(true), reduced ? 0 : 1100)
    const t2 = setTimeout(() => setXpBurst(false), reduced ? 0 : 1900)
    const t3 = result.levelUp
      ? setTimeout(() => setShowLevelUp(true), reduced ? 300 : 1800)
      : null
    return () => [t1, t2, t3].forEach((t) => t && clearTimeout(t))
  }, [result, reduced])

  // A hard refresh drops the in-memory result — send the user somewhere useful.
  if (!result) return <Navigate to="/dashboard" replace />

  const nextTrack = result.nudge?.id ?? level?.trackId

  return (
    <Page className="pb-12">
      <ScoreDial score={result.score} />

      {/* XP + streak */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduced ? 0 : 0.9, duration: 0.4 }}
        className="mt-1 flex items-stretch gap-3"
      >
        <div className="card relative flex flex-1 flex-col items-center py-4">
          <Burst fire={xpBurst} />
          <span className="stat text-[26px] font-bold leading-none text-ember">
            +<CountUp to={result.xp.total} from={0} duration={0.9} delay={reduced ? 0 : 1.1} />
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-faint">XP earned</span>
          {result.xp.bonus > 0 && (
            <span className="mt-1.5 text-[10.5px] text-dim">
              {result.xp.base} + {result.xp.bonus} streak bonus
            </span>
          )}
        </div>

        <div className="card flex flex-1 flex-col items-center py-4">
          <motion.span
            className="text-ember"
            style={{ filter: 'drop-shadow(0 0 8px rgb(255 122 53 / 0.5))' }}
            animate={reduced ? {} : { scale: [1, 1.3, 1], rotate: [0, -8, 4, 0] }}
            transition={{ duration: 0.6, delay: 1.3, ease: 'easeOut' }}
          >
            <IconFlame size={26} lit />
          </motion.span>
          <span className="stat mt-1 text-[15px] font-bold leading-none">
            Day {result.streak.value}
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-faint">Streak</span>
        </div>
      </motion.div>

      <motion.p
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduced ? 0 : 1.5 }}
        className="mt-3 text-center text-[13px] text-dim"
      >
        {streakMessage(result.streak.event, result.streak.value)}
      </motion.p>

      {result.stages?.length > 0 && <StageReview stages={result.stages} />}

      {/* feedback on the written stage */}
      <Card className="mt-5 space-y-4">
        {result.source === 'offline' && (
          <Pill dot={false}>Offline scoring — model was unreachable</Pill>
        )}
        {result.stages?.length > 0 && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            Your written response — {result.writtenScore}/10
          </p>
        )}
        <Section label="What worked" delay={reduced ? 0 : 1.0}>
          {result.strengths}
        </Section>
        <Section label="What was missing" delay={reduced ? 0 : 1.1}>
          {result.gaps}
        </Section>
        <Section label="Do this next time" delay={reduced ? 0 : 1.2} accent>
          {result.suggestion}
        </Section>
        {result.offlineNote && (
          <p className="text-[11.5px] leading-relaxed text-faint">{result.offlineNote}</p>
        )}
      </Card>

      {/* forward nudge — personalised to the weakest track */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduced ? 0 : 1.4, duration: 0.4 }}
        className="mt-5 space-y-3"
      >
        {result.nudge && (
          <p className="text-center text-[13px] leading-relaxed text-dim">
            One more? Your <span className="text-text">{result.nudge.name}</span> score is{' '}
            <span className="stat text-text">{result.nudge.score}</span> — it could use the reps.
          </p>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            clearSession()
            navigate(nextTrack ? `/quest/${nextTrack}` : '/tracks')
          }}
        >
          {result.nudge ? `Try ${result.nudge.name}` : 'Next quest'}
          <IconArrowRight size={17} />
        </Button>

        <Button
          variant="ghost"
          size="lg"
          className="w-full"
          onClick={() => {
            clearSession()
            navigate('/dashboard')
          }}
        >
          Back to dashboard
        </Button>
      </motion.div>

      <LevelUpModal
        level={showLevelUp ? result.levelUp : null}
        onClose={() => setShowLevelUp(false)}
      />
    </Page>
  )
}
