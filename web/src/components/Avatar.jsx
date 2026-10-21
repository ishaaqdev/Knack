import { motion } from 'framer-motion'
import { cx, useReducedMotion } from '../lib/ui'
import { Character } from './Character'

/**
 * A person, as a ring.
 *
 * The relationship number is the most useful thing about a colleague and the
 * least readable as a digit in a list. Drawing it as an arc around their
 * initials means a directory of five people can be scanned in one look — you
 * see who is warm and who is not before you read a single word.
 *
 * Same stroke language as every other quantity in the app: ember, round caps,
 * starting at twelve o'clock.
 */
export function Avatar({
  name = '',
  value = null, // 0..100, or null for no ring
  size = 40,
  stroke = 2.5,
  active = false,
  className,
  delay = 0,
  look = null, // a drawn character instead of initials
  accent,
  expression = 'neutral',
  speaking = false,
}) {
  const reduced = useReducedMotion()
  // A one-word name gave a single letter, which reads as a bullet rather than a
  // person. Two characters of that one word is the right fallback.
  const words = name.trim().split(/\s+/).filter(Boolean)
  const initials =
    (words.length > 1
      ? words
          .slice(0, 2)
          .map((w) => w[0])
          .join('')
      : (words[0] ?? '').slice(0, 2)
    ).toUpperCase() || '?'

  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, (value ?? 0) / 100))

  // A cold relationship should look cold, not merely short.
  const tone =
    value === null
      ? 'var(--color-line)'
      : value >= 61
        ? 'var(--color-ember)'
        : value >= 41
          ? 'var(--color-ember-low)'
          : 'var(--color-ember-dim)'

  return (
    <div
      className={cx('relative grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      {value !== null && (
        <svg width={size} height={size} className="absolute -rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-hair)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: reduced ? c - c * pct : c }}
            animate={{ strokeDashoffset: c - c * pct }}
            transition={reduced ? { duration: 0 } : { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
      )}

      {look ? (
        <Character
          look={look}
          accent={accent}
          expression={expression}
          speaking={speaking}
          title={name}
          size={size - stroke * 2 - 2}
        />
      ) : (
      <span
        className={cx(
          'grid place-items-center rounded-full font-semibold',
          value === null && 'border',
          active
            ? 'bg-ember text-[#160c05]'
            : value === null
              ? 'border-line bg-raised text-faint'
              : 'bg-raised text-dim'
        )}
        style={{
          width: size - stroke * 2 - 4,
          height: size - stroke * 2 - 4,
          fontSize: Math.max(9, Math.round(size * 0.3)),
        }}
      >
        <span className="stat">{initials}</span>
      </span>
      )}
    </div>
  )
}
