import { motion } from 'framer-motion'
import { IconCheck, IconLock } from './Icons'
import { Stars } from './Stars'
import { cx, useReducedMotion } from '../lib/ui'

const ROW = 118
const XS = [20, 64, 32, 74, 24, 66]

/**
 * A winding level map, the way a candy-matching game lays out its stages.
 *
 * Used for the career phases and for the five interview rounds. A node is a
 * gem: green and starred when cleared, glowing orange and bobbing when it is the
 * one you should do next, grey with a lock when it is not open yet. The path
 * between them is a dashed ribbon, solid once you have walked it.
 *
 * node: { id, title, sub, state: 'done'|'current'|'open'|'locked', stars, glyph,
 *         icon, tag, onClick }
 */
export function JourneyPath({ nodes, className }) {
  const reduced = useReducedMotion()
  const h = nodes.length * ROW
  const pts = nodes.map((_, i) => ({ x: XS[i % XS.length], y: i * ROW + ROW / 2 }))

  const seg = (a, b) =>
    `M ${a.x} ${a.y} C ${a.x} ${a.y + ROW * 0.55}, ${b.x} ${b.y - ROW * 0.55}, ${b.x} ${b.y}`

  return (
    <div className={cx('relative w-full', className)} style={{ height: h }}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {pts.slice(0, -1).map((a, i) => {
          const walked = nodes[i].state === 'done'
          return (
            <path
              key={i}
              d={seg(a, pts[i + 1])}
              fill="none"
              stroke={walked ? '#ffa061' : '#3a3a44'}
              strokeWidth={walked ? 7 : 5}
              strokeLinecap="round"
              strokeDasharray={walked ? undefined : '1 11'}
              vectorEffect="non-scaling-stroke"
              opacity={walked ? 0.95 : 0.9}
            />
          )
        })}
      </svg>

      {nodes.map((n, i) => {
        const p = pts[i]
        const right = p.x < 50
        const interactive = n.onClick && n.state !== 'locked'
        const gem =
          n.state === 'done'
            ? 'bg-[linear-gradient(180deg,#ffc08f,#ffa061_55%,#f08a45)] text-[#160c05] shadow-[inset_0_2px_0_rgb(255_255_255/0.5),0_5px_0_#a8481a]'
            : n.state === 'locked'
              ? 'bg-[#26262d] text-faint shadow-[inset_0_2px_0_rgb(255_255_255/0.07),0_5px_0_#0a0a0c]'
              : 'bg-[linear-gradient(180deg,#ff9456,#ff7a35_55%,#ee6a28)] text-[#160c05] shadow-[inset_0_2px_0_rgb(255_255_255/0.45),0_5px_0_#a8481a,0_0_28px_rgb(255_122_53/0.6)]'

        return (
          <motion.div
            key={n.id}
            className="absolute"
            style={{ left: `${p.x}%`, top: p.y, x: '-50%', y: '-50%' }}
            initial={reduced ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: reduced ? 0 : i * 0.07 }}
          >
            <button
              type="button"
              disabled={!interactive}
              onClick={n.onClick}
              aria-label={`${n.title}${n.sub ? `, ${n.sub}` : ''}`}
              className={cx(
                'relative grid h-[62px] w-[62px] place-items-center rounded-full font-display text-[22px] font-bold transition-transform',
                gem,
                n.state === 'current' && !reduced && 'bob',
                interactive ? 'cursor-pointer hover:scale-105 active:translate-y-1' : 'cursor-default'
              )}
            >
              {n.state === 'done' ? (
                <IconCheck size={28} strokeWidth={2.6} />
              ) : n.state === 'locked' ? (
                <IconLock size={22} />
              ) : n.icon ? (
                <n.icon size={26} strokeWidth={2} />
              ) : (
                (n.glyph ?? i + 1)
              )}
            </button>

            {n.state === 'done' && n.stars !== undefined && (
              <div className="pointer-events-none absolute left-1/2 top-[66px] -translate-x-1/2">
                <Stars count={n.stars} size={13} animate={false} />
              </div>
            )}

            <div
              className={cx(
                'pointer-events-none absolute top-1/2 w-[150px] -translate-y-1/2 sm:w-[210px]',
                right ? 'left-[76px]' : 'right-[76px] text-right'
              )}
            >
              {n.tag && (
                <span className="mb-1 inline-block rounded-full bg-ember px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#160c05]">
                  {n.tag}
                </span>
              )}
              <p
                className={cx(
                  'font-display text-[15px] font-semibold leading-tight',
                  n.state === 'locked' ? 'text-faint' : 'text-text'
                )}
              >
                {n.title}
              </p>
              {n.sub && <p className="mt-0.5 text-[12px] leading-snug text-dim">{n.sub}</p>}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
