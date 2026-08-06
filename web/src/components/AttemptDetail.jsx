import { AnimatePresence, motion } from 'framer-motion'
import { IconClose } from './Icons'
import { Pill } from './primitives'
import { DIFFICULTY_LABEL, fullDate, scoreVerdict, spring, useReducedMotion } from '../lib/ui'

function Block({ label, children, accent }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</p>
      <p
        className={`text-[13.5px] leading-relaxed ${
          accent ? 'text-ember-hi' : 'text-dim'
        }`}
      >
        {children}
      </p>
    </div>
  )
}

/** Replays a past attempt: the scenario, what you wrote, and the feedback. */
export function AttemptDetail({ attempt, onClose }) {
  const reduced = useReducedMotion()

  return (
    <AnimatePresence>
      {attempt && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 backdrop-blur-md sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="card flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-b-none sm:rounded-b-card"
            initial={reduced ? { opacity: 0 } : { y: '4%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: '4%', opacity: 0 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-hair px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-semibold">{attempt.trackName}</p>
                <p className="mt-0.5 text-[11px] text-faint">{fullDate(attempt.timestamp)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className="stat text-xl font-bold leading-none text-ember">{attempt.score}</p>
                  <p className="text-[10px] text-faint">{scoreVerdict(attempt.score)}</p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="grid h-8 w-8 place-items-center rounded-full text-faint transition-colors hover:bg-raised hover:text-text"
                >
                  <IconClose size={17} />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="flex flex-wrap gap-2">
                <Pill dot={false}>{DIFFICULTY_LABEL[attempt.difficulty]}</Pill>
                <Pill active>+{attempt.xpAwarded} XP</Pill>
                {attempt.source === 'offline' && <Pill dot={false}>Offline scoring</Pill>}
              </div>

              <div className="rounded-tile border border-hair bg-raised/60 p-4">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                  Scenario
                </p>
                <p className="text-[14px] leading-relaxed text-text">{attempt.scenarioText}</p>
              </div>

              <Block label="Your response">{attempt.userResponse}</Block>
              {attempt.strengths && <Block label="What worked">{attempt.strengths}</Block>}
              {attempt.gaps && <Block label="What was missing">{attempt.gaps}</Block>}
              {attempt.suggestion && (
                <Block label="Do this next time" accent>
                  {attempt.suggestion}
                </Block>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
