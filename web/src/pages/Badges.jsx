import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { Card, Page, PageHead, SectionLabel, Spinner } from '../components/primitives'
import { IconCheck, IconLock } from '../components/Icons'
import { cx, fullDate, useReducedMotion } from '../lib/ui'

/**
 * The badge shelf.
 *
 * Locked badges are shown deliberately: a milestone nobody knows exists cannot
 * motivate anyone, and the hint is what turns a badge into a goal. Each earned
 * one carries the specific thing that earned it, so the shelf reads as a record
 * rather than a scoreboard.
 */

/** Rarity reads as brightness, so the shelf can be scanned without reading it. */
const RARITY_TONE = {
  bronze: 'text-faint',
  silver: 'text-dim',
  gold: 'text-ember-hi',
  platinum: 'text-ember',
}

const GROUPS = [
  ['gd', 'Group discussion'],
  ['interview', 'Interview'],
  ['joining', 'Joining'],
  ['internship', 'On the job'],
  ['any', 'Anywhere'],
]

function Badge({ badge, index }) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : index * 0.04, duration: 0.3 }}
      className={cx(
        'flex gap-3.5 rounded-tile border p-3.5',
        badge.earned ? 'border-ember/30 bg-ember/[0.06]' : 'border-line'
      )}
    >
      <span
        className={cx(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full border',
          badge.earned ? 'border-ember bg-ember text-[#160c05]' : 'border-line text-faint'
        )}
      >
        {badge.earned ? <IconCheck size={16} /> : <IconLock size={14} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cx('font-display text-[14.5px] font-semibold', !badge.earned && 'text-dim')}>
          {badge.name}
          <span
            className={cx(
              'ml-2 align-middle text-[10px] font-medium uppercase tracking-[0.12em]',
              RARITY_TONE[badge.rarity] ?? 'text-faint'
            )}
          >
            {badge.rarity}
          </span>
        </p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
          {badge.earned ? badge.why : badge.hint}
        </p>
        {badge.earned && badge.at && (
          <p className="mt-1 text-[11px] text-faint">{fullDate(badge.at)}</p>
        )}
      </div>
    </motion.div>
  )
}

export function Badges() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .badges()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Page>
        <div className="flex items-center gap-2 text-[13px] text-faint">
          <Spinner size={15} /> Loading your badges…
        </div>
      </Page>
    )
  }

  const list = data?.list ?? []

  return (
    <Page className="pb-12">
      <PageHead eyebrow={`${data.earned} of ${list.length} earned`} title="Badges">
        Every one has a condition. None are given out for turning up.
      </PageHead>

      {GROUPS.map(([phase, label]) => {
        const group = list.filter((b) => b.phase === phase)
        if (!group.length) return null
        return (
          <div key={phase} className="mb-6">
            <SectionLabel
              right={
                <span className="text-[12px] text-faint">
                  {group.filter((b) => b.earned).length}/{group.length}
                </span>
              }
            >
              {label}
            </SectionLabel>
            <div className="space-y-2.5">
              {group.map((b, i) => (
                <Badge key={b.slug} badge={b} index={i} />
              ))}
            </div>
          </div>
        )
      })}
    </Page>
  )
}
