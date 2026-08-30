import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { IconClock } from './Icons'
import { cx } from '../lib/ui'

/**
 * The clock.
 *
 * Shared by the workplace, the interview and the group discussion, because all
 * three are timed for the same reason: an answer you had four minutes to
 * compose is not the answer you would give in the room. Deliberately not paused
 * when the tab loses focus — the point of the pressure is that the clock does
 * not care what else you are doing.
 *
 * Fires exactly once. A timer that expires twice submits twice.
 */
export function useCountdown(seconds, onExpire, active = true) {
  const [left, setLeft] = useState(seconds)
  const fired = useRef(false)
  const cb = useRef(onExpire)
  cb.current = onExpire

  useEffect(() => {
    setLeft(seconds)
    fired.current = false
  }, [seconds])

  useEffect(() => {
    if (!active || !seconds) return undefined
    const id = setInterval(() => {
      setLeft((v) => {
        if (v <= 1 && !fired.current) {
          fired.current = true
          cb.current?.()
          return 0
        }
        return Math.max(0, v - 1)
      })
    }, 1000)
    return () => clearInterval(id)
  }, [active, seconds])

  return left
}

export function Clock({ left, total, className }) {
  const low = left <= 15
  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className={cx('flex items-center gap-2', className)}>
      <motion.span
        className={cx('transition-colors', low ? 'text-ember' : 'text-faint')}
        animate={low ? { scale: [1, 1.14, 1] } : {}}
        transition={{ duration: 1, repeat: low ? Infinity : 0 }}
      >
        <IconClock size={14} />
      </motion.span>
      <span className={cx('stat text-[13px] tabular-nums', low ? 'text-ember' : 'text-dim')}>
        {mm}:{ss}
      </span>
      <span className="h-1 w-16 overflow-hidden rounded-full bg-line">
        <motion.span
          className={cx('block h-full rounded-full', low ? 'bg-ember' : 'bg-ember-low')}
          animate={{ width: `${total ? (left / total) * 100 : 0}%` }}
          transition={{ duration: 0.9, ease: 'linear' }}
        />
      </span>
    </div>
  )
}
