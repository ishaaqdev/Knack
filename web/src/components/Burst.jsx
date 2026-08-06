import { motion } from 'framer-motion'
import { useReducedMotion } from '../lib/ui'

const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2 + 0.4
  const dist = 26 + (i % 3) * 9
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    size: i % 3 === 0 ? 5 : 3,
    delay: (i % 4) * 0.03,
  }
})

/**
 * Particle burst scoped to whatever it is anchored inside — deliberately not
 * full-screen confetti. Fires once when `fire` flips true.
 */
export function Burst({ fire, className = '' }) {
  const reduced = useReducedMotion()
  if (!fire || reduced) return null

  return (
    <div className={`pointer-events-none absolute inset-0 grid place-items-center ${className}`} aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: i % 2 ? 'var(--color-ember)' : 'var(--color-ember-hi)',
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
          transition={{ duration: 0.6, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      <motion.span
        className="absolute rounded-full"
        style={{ border: '1.5px solid var(--color-ember)' }}
        initial={{ width: 8, height: 8, opacity: 0.9 }}
        animate={{ width: 78, height: 78, opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
    </div>
  )
}
