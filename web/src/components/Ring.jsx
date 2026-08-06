import { motion } from 'framer-motion'
import { cx, useReducedMotion } from '../lib/ui'

/**
 * The signature motif. Every quantity in Knack is an arc on a ring:
 * ember stroke, round caps, always starting at 12 o'clock.
 */
export function Ring({
  value = 0, // 0..1
  size = 44,
  stroke = 3.5,
  className,
  trackColor = 'var(--color-line)',
  color = 'var(--color-ember)',
  delay = 0,
  duration = 0.9,
  children,
}) {
  const reduced = useReducedMotion()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, value || 0))

  return (
    <div className={cx('relative grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduced ? c - c * clamped : c }}
          animate={{ strokeDashoffset: c - c * clamped }}
          transition={reduced ? { duration: 0 } : { duration, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {children != null && (
        <div className="absolute inset-0 grid place-items-center">{children}</div>
      )}
    </div>
  )
}

/**
 * Half-ring gauge, used for the headline Professional Readiness Score.
 * Same stroke language as Ring, opened out to 240° so the number can breathe.
 */
export function Gauge({ value = 0, size = 168, stroke = 10, children, duration = 1.1 }) {
  const reduced = useReducedMotion()
  const r = (size - stroke) / 2
  const sweep = 0.68 // fraction of the circle drawn
  const c = 2 * Math.PI * r
  const arc = c * sweep
  const clamped = Math.max(0, Math.min(1, value || 0))

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[122deg]" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c - arc}`}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-ember)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
          initial={{ strokeDashoffset: reduced ? arc - arc * clamped : arc }}
          animate={{ strokeDashoffset: arc - arc * clamped }}
          transition={reduced ? { duration: 0 } : { duration, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}
