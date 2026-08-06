import { motion } from 'framer-motion'
import { Gauge } from './Ring'
import { CountUp } from './CountUp'
import { scoreVerdict, useReducedMotion } from '../lib/ui'

/**
 * Score reveal on the Feedback page. The number is deliberately withheld —
 * the arc fills over ~1.1s and the digits count with it, so the result lands
 * rather than appearing.
 */
export function ScoreDial({ score = 0, size = 180 }) {
  const reduced = useReducedMotion()

  return (
    <div className="flex flex-col items-center">
      <Gauge value={score / 10} size={size} stroke={9}>
        <div className="flex flex-col items-center">
          <div className="flex items-start">
            <CountUp
              to={score}
              from={0}
              duration={reduced ? 0 : 1.1}
              className="stat text-[56px] font-bold leading-none text-text"
            />
            <span className="stat mt-2.5 ml-0.5 text-[17px] font-medium text-faint">/10</span>
          </div>
          <motion.span
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduced ? 0 : 1.05, duration: 0.35 }}
            className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ember"
          >
            {scoreVerdict(score)}
          </motion.span>
        </div>
      </Gauge>
    </div>
  )
}
