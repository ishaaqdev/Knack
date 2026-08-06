import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { TRACK_ICONS, IconArrowRight } from './Icons'
import { Ring } from './Ring'
import { Pill } from './primitives'
import { DIFFICULTY_LABEL, spring, useReducedMotion } from '../lib/ui'

export function TrackCard({ track, index = 0 }) {
  const reduced = useReducedMotion()
  const Icon = TRACK_ICONS[track.id]
  const started = track.attempts > 0

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div whileTap={reduced ? undefined : { scale: 0.985 }} transition={spring}>
        <Link
          to={`/quest/${track.id}`}
          className="card group block p-5 transition-colors duration-200 hover:border-line"
        >
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-tile border border-line bg-raised text-ember">
              <Icon size={21} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-[17px] font-semibold leading-tight">{track.name}</h3>
                <Ring value={track.score / 100} size={38} stroke={3} duration={0.7} delay={index * 0.07}>
                  <span className="stat text-[12px] font-semibold">{track.score}</span>
                </Ring>
              </div>

              <p className="mt-1.5 text-[13px] leading-relaxed text-dim">{track.description}</p>

              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <Pill active={started}>
                  {started ? `Skill ${track.score}/100` : 'Not started'}
                </Pill>
                <Pill dot={false}>{DIFFICULTY_LABEL[track.difficulty]}</Pill>
                {track.attempts > 0 && (
                  <span className="text-[11px] text-faint">
                    {track.attempts} {track.attempts === 1 ? 'quest' : 'quests'}
                  </span>
                )}
                <span className="ml-auto text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ember">
                  <IconArrowRight size={17} />
                </span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  )
}
