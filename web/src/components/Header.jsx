import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { Ring } from './Ring'
import { CountUp } from './CountUp'
import { Burst } from './Burst'
import { IconFlame } from './Icons'
import { cx, spring, useReducedMotion } from '../lib/ui'

function initials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'K'
  )
}

/**
 * Persistent gamification header. XP and streak animate in place — this never
 * requires a navigation or reload to reflect a completed quest.
 */
export function Header() {
  const user = useKnack((s) => s.user)
  const reduced = useReducedMotion()
  const { pathname } = useLocation()

  const prevXp = useRef(user?.xp ?? 0)
  const prevStreak = useRef(user?.streak ?? 0)
  const [burst, setBurst] = useState(false)

  const xp = user?.xp ?? 0
  const streak = user?.streak ?? 0
  const gained = xp - prevXp.current

  useEffect(() => {
    if (gained > 0) {
      setBurst(true)
      const t = setTimeout(() => setBurst(false), 800)
      return () => clearTimeout(t)
    }
  }, [gained])

  useEffect(() => {
    const t = setTimeout(() => {
      prevXp.current = xp
      prevStreak.current = streak
    }, 1200)
    return () => clearTimeout(t)
  }, [xp, streak])

  if (!user) return <div className="h-14 border-b border-hair" />

  const lit = streak > 0 && !user.streakAtRisk
  const dormant = streak === 0

  return (
    <header className="sticky top-0 z-40 border-b border-hair bg-ink/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        {/* avatar + wordmark */}
        <Link
          to="/profile"
          aria-label="Profile"
          className={cx(
            'grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition-colors',
            pathname === '/profile'
              ? 'border-ember/40 bg-ember/12 text-ember-hi'
              : 'border-line bg-raised text-dim hover:text-text'
          )}
        >
          <span className="stat">{initials(user.name)}</span>
        </Link>

        <Link to="/dashboard" className="hidden font-display text-[15px] font-bold tracking-tight sm:block">
          Knack
        </Link>

        <div className="flex-1" />

        {/* XP + level ring */}
        <Link to="/dashboard" className="relative flex items-center gap-2" aria-label={`${xp} XP`}>
          <Burst fire={burst} />
          <Ring value={user.level?.progress ?? 0} size={30} stroke={2.75} duration={0.7}>
            <span className="h-1 w-1 rounded-full bg-ember" />
          </Ring>
          <span className="stat text-[15px] font-semibold leading-none">
            <CountUp to={xp} from={prevXp.current} duration={1} />
            <span className="ml-1 text-[10px] font-medium text-faint">XP</span>
          </span>
        </Link>

        <span className="mx-1 h-5 w-px bg-hair sm:mx-1.5" />

        {/* streak */}
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5"
          aria-label={`${streak} day streak${user.streakAtRisk ? ', at risk' : ''}`}
          title={
            dormant
              ? 'No streak yet — finish a quest today'
              : user.streakAtRisk
                ? 'At risk — today’s quest is still open'
                : `${streak} day streak`
          }
        >
          <motion.span
            className={cx(
              'grid place-items-center transition-colors duration-300',
              lit ? 'text-ember' : user.streakAtRisk ? 'text-ember-low' : 'text-faint'
            )}
            style={lit ? { filter: 'drop-shadow(0 0 6px rgb(255 122 53 / 0.55))' } : undefined}
            animate={
              reduced || !lit || streak === prevStreak.current
                ? {}
                : { scale: [1, 1.35, 1], rotate: [0, -6, 0] }
            }
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <IconFlame size={17} lit={lit} />
          </motion.span>
          <span
            className={cx(
              'stat text-[15px] font-semibold leading-none',
              lit ? 'text-text' : 'text-faint'
            )}
          >
            <CountUp to={streak} from={prevStreak.current} duration={0.6} />
          </span>
        </Link>

        {/* level */}
        <AnimatePresence mode="popLayout">
          <motion.span
            key={user.level?.name}
            initial={reduced ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={spring}
            className="ml-1 hidden rounded-full border border-line bg-raised px-2.5 py-1 text-[11px] font-medium text-dim xs:block sm:ml-1.5"
          >
            {user.level?.name}
          </motion.span>
        </AnimatePresence>
      </div>
    </header>
  )
}
