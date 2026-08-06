import { motion } from 'framer-motion'
import { Card, Pill } from './primitives'
import { useReducedMotion } from '../lib/ui'

/**
 * Surfaces the derived learner context. Personalisation that the user cannot
 * see reads as a black box — showing the summary makes the adaptation legible,
 * and lets them correct it by training rather than wonder about it.
 */
export function Insight({ insight, compact = false }) {
  const reduced = useReducedMotion()
  if (!insight?.summary) return null

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="relative overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-[3px] bg-ember/60" />

        <div className="mb-2.5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-ember shadow-[0_0_7px_var(--color-ember)]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            What Knack has picked up
          </p>
        </div>

        <p className="text-[13.5px] leading-relaxed text-text">{insight.summary}</p>

        {!compact && insight.gaps?.length > 0 && (
          <div className="mt-3.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              Keeps coming up
            </p>
            <div className="flex flex-wrap gap-2">
              {insight.gaps.map((g) => (
                <Pill key={g} dot={false}>
                  {g}
                </Pill>
              ))}
            </div>
          </div>
        )}

        {!compact && insight.pushNext && (
          <p className="mt-3.5 text-[12.5px] leading-relaxed text-dim">
            <span className="text-faint">Next scenarios will push you on: </span>
            <span className="text-ember-hi">{insight.pushNext}</span>
          </p>
        )}
      </Card>
    </motion.div>
  )
}
