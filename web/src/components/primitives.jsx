import { motion } from 'framer-motion'
import { cx, spring, useReducedMotion } from '../lib/ui'

/* ------------------------------------------------------------- button ----- */

const VARIANTS = {
  primary: 'btn-candy btn-orange',
  ghost:
    'bg-white/5 text-dim border-2 border-line font-semibold hover:text-text hover:border-ember hover:bg-white/10 disabled:opacity-40',
  quiet: 'btn-candy btn-dark',
}

// The solid variants press with CSS (they sink into their own lower edge), so a
// scale on top of that would fight it. Only the flat ghost button springs.
const FLAT = new Set(['ghost'])

// motion.create() must never run during render — a fresh component identity on
// every pass would remount the button (and kill focus). Cache per element type.
const motionCache = new Map([['button', motion.button]])
const asMotion = (As) => {
  if (!motionCache.has(As)) motionCache.set(As, motion.create(As))
  return motionCache.get(As)
}

export function Button({
  as: As = 'button',
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}) {
  const reduced = useReducedMotion()
  const M = asMotion(As)

  return (
    <M
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full transition-colors duration-150',
        'disabled:cursor-not-allowed select-none',
        size === 'lg' ? 'h-14 px-7 text-[17px]' : size === 'sm' ? 'h-9 px-4 text-[14px]' : 'h-12 px-6 text-[15px]',
        VARIANTS[variant],
        className
      )}
      whileTap={reduced || rest.disabled || !FLAT.has(variant) ? undefined : { scale: 0.97 }}
      transition={spring}
      {...rest}
    >
      {children}
    </M>
  )
}

/* --------------------------------------------------------------- card ----- */

export function Card({ as: As = 'div', tap = false, hot = false, className, children, ...rest }) {
  return (
    <As className={cx('card p-5', tap && 'card-tap', hot && 'card-hot', className)} {...rest}>
      {children}
    </As>
  )
}

/* --------------------------------------------------------- ember pill ----- */

/**
 * Identity marker: a pill with a leading dot. Solid + glowing when the thing it
 * labels is active, hollow when dormant. One shape, two states.
 */
export function Pill({ active = false, className, children, dot = true, title }) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 text-[11.5px] font-bold tracking-wide whitespace-nowrap',
        active
          ? 'border-ember/70 bg-ember/15 text-ember-hi'
          : 'border-line bg-raised text-dim',
        className
      )}
    >
      {dot && (
        <span
          className={cx(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            active ? 'bg-ember shadow-[0_0_7px_var(--color-ember)]' : 'border border-faint'
          )}
        />
      )}
      {children}
    </span>
  )
}

/* ---------------------------------------------------------- skill bar ----- */

export function SkillBar({ value = 0, delay = 0, className, height = 10, muted = false, tone = 'ember' }) {
  const reduced = useReducedMotion()
  const v = Math.max(0, Math.min(100, value))
  // One hue: the tone is how bright the orange is. 'high' is lighter, 'low' is
  // the dark end, 'dim' is neutral grey for something that is not a score.
  const fill =
    tone === 'high'
      ? 'linear-gradient(180deg, #ffc08f, #ffa061 55%, #f08a45)'
      : tone === 'low'
        ? 'linear-gradient(180deg, #b8693a, #8a4a24 55%, #6e3a1c)'
        : tone === 'dim'
          ? 'linear-gradient(180deg, #b4b4bd, #9a9aa5 55%, #7d7d88)'
          : 'linear-gradient(180deg, #ff9456, #ff7a35 55%, #ee6a28)'

  return (
    <div
      className={cx('w-full overflow-hidden rounded-full', className)}
      style={{
        height,
        background: 'rgb(0 0 0 / 0.6)',
        boxShadow: 'inset 0 2px 3px rgb(0 0 0 / 0.5), 0 1px 0 rgb(255 255 255 / 0.12)',
      }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="relative h-full rounded-full"
        style={{
          background: muted ? 'var(--color-line)' : fill,
          boxShadow: muted ? 'none' : 'inset 0 2px 0 rgb(255 255 255 / 0.4), inset 0 -2px 0 rgb(0 0 0 / 0.15)',
        }}
        initial={{ width: reduced ? `${v}%` : 0 }}
        animate={{ width: `${v}%` }}
        transition={reduced ? { duration: 0 } : { duration: 0.85, delay, ease: [0.34, 1.3, 0.64, 1] }}
      />
    </div>
  )
}

/* --------------------------------------------------------- page frame ----- */

export function Page({ className, children, wide = false }) {
  const reduced = useReducedMotion()
  return (
    <motion.main
      className={cx(
        'mx-auto w-full px-4 pb-28 pt-5 sm:px-6 sm:pt-8 md:pb-16',
        wide ? 'max-w-5xl' : 'max-w-2xl',
        className
      )}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.main>
  )
}

/**
 * The top of a screen.
 *
 * Every page was opening with the same 26px heading and a paragraph, which made
 * eight different screens look like one screen. The title now carries real
 * scale, and an optional eyebrow says where you are — so the reader knows
 * which part of the app they are in before they have read a sentence.
 */
export function PageHead({ eyebrow, title, children, right }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className="mb-6"
      initial={reduced ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ember">
              {eyebrow}
            </p>
          )}
          <h1 className="title">{title}</h1>
        </div>
        {right}
      </div>
      {children && (
        <p className="mt-2.5 max-w-prose text-[14px] leading-relaxed text-dim">{children}</p>
      )}
    </motion.div>
  )
}

export function SectionLabel({ children, right }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{children}</h2>
      {right}
    </div>
  )
}

/* -------------------------------------------------------- empty state ----- */

export function Empty({ title, body, action }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line px-6 py-10 text-center">
      <div className="relative mb-4 grid h-14 w-14 place-items-center rounded-full border border-line">
        <span className="h-2.5 w-2.5 rounded-full bg-ember shadow-[0_0_12px_var(--color-ember)]" />
        <span className="absolute inset-0 rounded-full border border-ember/25" />
      </div>
      <p className="font-display text-[17px] font-semibold">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-dim">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ------------------------------------------------------------ spinner ----- */

export function Spinner({ size = 18, className }) {
  return (
    <span
      className={cx('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}
