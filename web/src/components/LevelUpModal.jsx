import { AnimatePresence, motion } from 'framer-motion'
import { Button } from './primitives'
import { Ring } from './Ring'
import { spring, useReducedMotion } from '../lib/ui'

/**
 * The only celebratory modal in the app. Levels are rare, so this is the one
 * moment allowed to interrupt.
 */
export function LevelUpModal({ level, onClose }) {
  const reduced = useReducedMotion()

  return (
    <AnimatePresence>
      {level && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-5 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Level up: ${level.name}`}
        >
          <motion.div
            className="card relative w-full max-w-sm overflow-hidden p-7 text-center"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
              style={{ background: 'var(--color-ember)' }}
            />

            <div className="relative mx-auto mb-5 w-fit">
              <Ring value={1} size={92} stroke={4} duration={0.8}>
                <motion.span
                  className="stat text-[26px] font-bold text-ember"
                  initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring, delay: 0.15 }}
                >
                  {level.index + 1}
                </motion.span>
              </Ring>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ember">
              Level up
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold">{level.name}</h2>
            <p className="mt-1 text-sm text-dim">“{level.title}”</p>
            <p className="mt-4 text-sm leading-relaxed text-dim">
              {level.xpToNext
                ? `${level.xpToNext} XP to ${level.nextName}. You earned this one — keep the run going.`
                : 'Top tier. There is no level above this one.'}
            </p>

            <Button className="mt-6 w-full" size="lg" onClick={onClose}>
              Nice
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
