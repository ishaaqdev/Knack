import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { Button, Card, Page, Pill } from '../components/primitives'
import { ScoreDial } from '../components/ScoreDial'
import { LevelUpModal } from '../components/LevelUpModal'
import { CountUp } from '../components/CountUp'
import { Burst } from '../components/Burst'
import { IconArrowRight, IconFlame } from '../components/Icons'
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

export function Feedback() {
  const result = useKnack((s) => s.result)
  const quest = useKnack((s) => s.quest)
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

  const nextTrack = result.nudge?.id ?? quest?.trackId

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

      {/* feedback */}
      <Card className="mt-5 space-y-4">
        {result.source === 'offline' && (
          <Pill dot={false}>Offline scoring — model was unreachable</Pill>
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
