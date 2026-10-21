import { motion } from 'framer-motion'
import { Character } from './Character'
import { SkillBar } from './primitives'
import { cx, useReducedMotion } from '../lib/ui'

/**
 * The mood of the room, kept to one side.
 *
 * A real discussion has a temperature you read without being told: someone
 * leaning back, two people talking over each other, a silence. This is that, as
 * a gauge and a face per person. It describes the room and never tells the
 * trainee what to do about it, because working that out is the exercise.
 */
export function RoomMood({ mood, panel, speaking = null, compact = false, className }) {
  const reduced = useReducedMotion()
  if (!mood) return null

  const looks = Object.fromEntries(panel.map((p) => [p.name, p]))

  if (compact) {
    return (
      <div className={cx('card flex items-center gap-3 px-4 py-2.5', className)}>
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[11px] font-bold text-[#160c05]"
          style={{ background: mood.tone, boxShadow: `0 3px 0 ${mood.tone}88` }}
        >
          {mood.label.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[14px] font-semibold leading-tight">
            Room: <span style={{ color: mood.tone }}>{mood.label}</span>
          </p>
          <p className="truncate text-[12px] text-dim">{mood.note}</p>
        </div>
        <div className="flex -space-x-2">
          {mood.people.map((p) => (
            <Character
              key={p.name}
              look={looks[p.name]?.look}
              accent={looks[p.name]?.accent}
              expression={p.expression}
              size={26}
              title={`${p.name}: ${p.mood}`}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <aside className={cx('card p-4', className)} aria-label="Mood of the room">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-faint">Mood of the room</p>

      <motion.p
        key={mood.id}
        initial={reduced ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 16 }}
        className="mt-1 font-display text-[30px] font-bold leading-none"
        style={{ color: mood.tone, textShadow: `0 3px 0 ${mood.tone}44` }}
      >
        {mood.label}
      </motion.p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-dim">{mood.note}</p>

      <div className="mt-3.5 space-y-2.5">
        {[
          ['Tension', mood.tension, 'ember'],
          ['Warmth', mood.warmth, 'ember'],
          ['Energy', mood.energy, 'ember'],
        ].map(([label, value, tone]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-[11px] font-bold text-faint">
              <span>{label}</span>
              <span className="stat">{value}</span>
            </div>
            <SkillBar value={value} tone={tone} height={8} />
          </div>
        ))}
      </div>

      <p className="mb-2 mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-faint">At the table</p>
      <ul className="space-y-2">
        {mood.people.map((p) => (
          <li key={p.name} className="flex items-center gap-2.5">
            <Character
              look={looks[p.name]?.look}
              accent={looks[p.name]?.accent}
              expression={p.expression}
              speaking={speaking === p.name}
              size={34}
              title={p.name}
            />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[13px] font-bold">{p.name}</span>
              <span className="block truncate text-[11.5px] text-dim">{p.mood}</span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
