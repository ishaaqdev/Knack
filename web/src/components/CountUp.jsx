import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useReducedMotion } from '../lib/ui'

/** Animated number. Progress should count up, never jump-cut. */
export function CountUp({ to = 0, from = null, duration = 0.9, delay = 0, className, suffix = '' }) {
  const reduced = useReducedMotion()
  const mv = useMotionValue(from ?? to)
  const text = useTransform(mv, (v) => `${Math.round(v).toLocaleString()}${suffix}`)

  useEffect(() => {
    if (reduced) {
      mv.set(to)
      return
    }
    const controls = animate(mv, to, { duration, delay, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [to, duration, delay, reduced, mv])

  return <motion.span className={className}>{text}</motion.span>
}
