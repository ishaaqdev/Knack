import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, SkillBar } from './primitives'
import { IconChevron } from './Icons'
import { cx, useReducedMotion } from '../lib/ui'

/**
 * The ten attributes.
 *
 * A number on its own is not feedback, so each bar carries the tier label and,
 * when it is low enough to matter, opens onto what would actually move it. The
 * suggestions are only shown below 60 — nobody needs coaching on a 90, and
 * showing it anyway makes the whole panel read as nagging.
 */

const TONE = {
  critical: 'text-ember-hi',
  low: 'text-ember-hi',
  mid: 'text-dim',
  ok: 'text-dim',
  good: 'text-text',
  best: 'text-text',
}

function Row({ attribute, index, open, onToggle }) {
  const reduced = useReducedMotion()
  const canOpen = attribute.improve.length > 0

  return (
    <div className="border-b border-hair last:border-0">
      <button
        type="button"
        onClick={canOpen ? onToggle : undefined}
        className={cx('w-full py-3 text-left', canOpen && 'cursor-pointer')}
      >
        <div className="mb-2 flex items-baseline gap-2">
          <span className="flex-1 truncate text-[13.5px] font-medium">{attribute.name}</span>
          <span className={cx('text-[11px]', TONE[attribute.tone])}>{attribute.tier}</span>
          <span className="stat w-8 text-right text-[13.5px] font-semibold">{attribute.value}</span>
          {canOpen && (
            <motion.span
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-faint"
            >
              <IconChevron size={13} />
            </motion.span>
          )}
        </div>
        <SkillBar value={attribute.value} delay={0.05 + index * 0.04} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="pb-3.5 pt-1">
              <p className="text-[12.5px] leading-relaxed text-faint">{attribute.blurb}</p>
              <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                What moves it
              </p>
              <ul className="mt-1.5 space-y-1">
                {attribute.improve.map((s) => (
                  <li key={s} className="flex gap-2 text-[13px] leading-relaxed text-dim">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ember" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function AttributePanel({ attributes = [], professionalIndex }) {
  const [open, setOpen] = useState(null)
  if (!attributes.length) return null

  return (
    <Card className="py-1">
      {professionalIndex !== undefined && (
        <div className="flex items-baseline justify-between border-b border-hair py-3">
          <span className="text-[13.5px] font-medium">Professional profile</span>
          <span className="stat text-[15px] font-bold text-ember">{professionalIndex}</span>
        </div>
      )}
      {attributes.map((a, i) => (
        <Row
          key={a.key}
          attribute={a}
          index={i}
          open={open === a.key}
          onToggle={() => setOpen(open === a.key ? null : a.key)}
        />
      ))}
    </Card>
  )
}

/** The "Leadership 27 → 31" moment, shown after anything that moved a bar. */
export function AttributeDeltas({ moved = [] }) {
  const reduced = useReducedMotion()
  if (!moved.length) return null

  return (
    <Card className="mt-5">
      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
        What this changed
      </p>
      <div className="space-y-2">
        {moved.map((m, i) => (
          <motion.div
            key={m.key}
            initial={reduced ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: reduced ? 0 : 0.1 + i * 0.07 }}
            className="flex items-baseline gap-2 text-[13.5px]"
          >
            <span className="flex-1 truncate text-dim">{m.name}</span>
            <span className="stat text-faint">{m.before}</span>
            <span className="text-faint">→</span>
            <span className={cx('stat font-semibold', m.delta > 0 ? 'text-ember' : 'text-dim')}>
              {m.after}
            </span>
            {m.crossedUp && (
              <span className="text-[10.5px] uppercase tracking-wide text-ember-hi">{m.tier}</span>
            )}
          </motion.div>
        ))}
      </div>
    </Card>
  )
}
