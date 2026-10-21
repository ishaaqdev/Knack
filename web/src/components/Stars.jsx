import { motion } from 'framer-motion'
import { IconStar } from './Icons'
import { cx, useReducedMotion } from '../lib/ui'

/** Score out of ten to stars out of three, the way a level map does it. */
export const starsFor = (score10) => (score10 >= 8 ? 3 : score10 >= 6 ? 2 : score10 >= 3 ? 1 : 0)

/**
 * Three stars that pop in one at a time. The middle one is bigger because that is
 * where the eye lands, and an empty star stays on screen so the trainee can see
 * exactly how far off the third one was.
 */
export function Stars({ score, count, size = 30, animate = true, className }) {
  const reduced = useReducedMotion()
  const n = count ?? starsFor(score)

  return (
    <div className={cx('inline-flex items-end justify-center gap-1', className)} aria-label={`${n} of 3 stars`}>
      {[0, 1, 2].map((i) => {
        const on = i < n
        const s = i === 1 ? size * 1.28 : size
        return (
          <motion.span
            key={i}
            className={cx('inline-block', on ? 'text-ember-hi' : 'text-hair')}
            style={{
              filter: on ? 'drop-shadow(0 3px 0 #a8481a) drop-shadow(0 0 8px rgb(255 160 97 / 0.5))' : 'none',
              rotate: i === 0 ? -10 : i === 2 ? 10 : 0,
            }}
            initial={animate && !reduced ? { scale: 0, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 14, delay: reduced ? 0 : 0.25 + i * 0.22 }}
          >
            <IconStar size={s} filled={on} />
          </motion.span>
        )
      })}
    </div>
  )
}
