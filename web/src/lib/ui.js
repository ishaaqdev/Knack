import { useEffect, useState } from 'react'

export const cx = (...parts) => parts.filter(Boolean).join(' ')

/** Respects the OS "reduce motion" setting; every animation checks this. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export const spring = { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }
export const softSpring = { type: 'spring', stiffness: 180, damping: 24 }

export const TRACK_GLYPH = {
  'workplace-communication': 'speech',
  'critical-thinking': 'branch',
  'ai-fluency': 'spark',
}

export const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

export function relativeDate(iso) {
  const d = new Date(iso)
  const days = Math.round((Date.now() - d.getTime()) / 86400000)
  if (days <= 0) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export const fullDate = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

/** Streak copy rotates so a daily habit never reads like the same robot. */
const STREAK_LINES = [
  (n) => `Day ${n}. You're building a habit.`,
  (n) => `${n} days straight. That compounds.`,
  (n) => `Day ${n}. Most people quit before this.`,
  (n) => `${n} in a row. Quietly getting better.`,
  (n) => `Day ${n}. Same time tomorrow?`,
]

export function streakMessage(event, streak) {
  if (event === 'started') return 'Streak started. Come back tomorrow to keep it.'
  if (event === 'restarted') return 'Back on. Day 1 again — no shame in restarting.'
  if (event === 'held') return `Already counted today. Day ${streak} stands.`
  return STREAK_LINES[streak % STREAK_LINES.length](streak)
}

export function scoreVerdict(score) {
  if (score >= 9) return 'Exceptional'
  if (score >= 7) return 'Strong'
  if (score >= 5) return 'Solid'
  if (score >= 3) return 'Needs work'
  return 'Try again'
}
