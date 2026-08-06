import { motion } from 'framer-motion'
import { cx, spring, useReducedMotion } from '../lib/ui'

/* ------------------------------------------------------------- button ----- */

const VARIANTS = {
  primary:
    'bg-ember text-[#160c05] font-semibold hover:bg-ember-hi active:bg-ember disabled:bg-line disabled:text-faint',
  ghost:
    'bg-transparent text-dim border border-line hover:text-text hover:border-dim disabled:opacity-40',
  quiet: 'bg-raised text-text hover:bg-line disabled:opacity-40',
}

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
        size === 'lg' ? 'h-14 px-7 text-[15px]' : size === 'sm' ? 'h-9 px-4 text-[13px]' : 'h-11 px-5 text-sm',
        VARIANTS[variant],
        className
      )}
      whileTap={reduced || rest.disabled ? undefined : { scale: 0.97 }}
      transition={spring}
      {...rest}
    >
      {children}
    </M>
  )
}

/* --------------------------------------------------------------- card ----- */

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx('card p-5', className)} {...rest}>
      {children}
    </div>
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
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide whitespace-nowrap',
        active
          ? 'border-ember/35 bg-ember/10 text-ember-hi'
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

export function SkillBar({ value = 0, delay = 0, className, height = 6 }) {
  const reduced = useReducedMotion()
  return (
    <div
      className={cx('w-full overflow-hidden rounded-full bg-line', className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full bg-ember"
        initial={{ width: reduced ? `${value}%` : 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={reduced ? { duration: 0 } : { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

/* --------------------------------------------------------- page frame ----- */

export function Page({ className, children }) {
  const reduced = useReducedMotion()
  return (
    <motion.main
      className={cx('mx-auto w-full max-w-2xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8 md:pb-16', className)}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.main>
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
