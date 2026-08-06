import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { fetchOnboardingConfig } from '../lib/onboarding'
import { Button, Spinner } from '../components/primitives'
import { Ring } from '../components/Ring'
import { GithubInput } from '../components/GithubCard'
import { IconArrowLeft, IconArrowRight, IconCheck } from '../components/Icons'
import { cx, spring, useReducedMotion } from '../lib/ui'

/* ------------------------------------------------------------- controls --- */

function Choice({ label, selected, onClick, index = 0, muted }) {
  const reduced = useReducedMotion()
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      className={cx(
        'flex w-full items-center gap-3 rounded-tile border px-4 py-3.5 text-left transition-colors duration-150',
        selected
          ? 'border-ember/50 bg-ember/10 text-text'
          : 'border-line bg-surface text-dim hover:border-dim hover:text-text'
      )}
    >
      <span
        className={cx(
          'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition-colors',
          selected ? 'border-ember bg-ember text-[#160c05]' : 'border-faint'
        )}
      >
        {selected && <IconCheck size={11} />}
      </span>
      <span className={cx('text-[14.5px]', muted && 'text-[13.5px]')}>{label}</span>
    </motion.button>
  )
}

function ConfidenceRow({ track, value, scale, onChange }) {
  return (
    <div>
      <p className="mb-2 text-[13.5px] font-medium">{track.name}</p>
      <div className="flex gap-1.5">
        {scale.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            aria-label={`${track.name}: ${s.label}`}
            className={cx(
              'flex-1 rounded-lg border py-2.5 text-[11px] font-medium transition-colors',
              value === s.value
                ? 'border-ember/50 bg-ember/12 text-ember-hi'
                : 'border-line bg-surface text-faint hover:text-dim'
            )}
          >
            {s.value}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10.5px] text-faint">
        <span>{scale[0].label}</span>
        <span>{scale[scale.length - 1].label}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ page -- */

export function Onboarding() {
  const user = useKnack((s) => s.user)
  const completeOnboarding = useKnack((s) => s.completeOnboarding)
  const linkGithub = useKnack((s) => s.linkGithub)
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const [config, setConfig] = useState(null)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const [values, setValues] = useState({ name: '', focusAreas: [], confidence: {} })
  const [github, setGithub] = useState('')

  useEffect(() => {
    fetchOnboardingConfig()
      .then((c) => {
        setConfig(c)
        setValues((v) => ({
          ...v,
          name: user?.name && user.name !== 'Trainee' ? user.name : '',
          confidence: Object.fromEntries(c.confidence.tracks.map((t) => [t.id, 3])),
        }))
      })
      .catch((e) => setError(e.message))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Name, each server-defined field, the confidence grid, then optional GitHub.
  const steps = useMemo(() => {
    if (!config) return []
    return [
      { kind: 'name' },
      ...config.fields.map((f) => ({ kind: 'field', field: f })),
      { kind: 'confidence' },
      { kind: 'github' },
    ]
  }, [config])

  if (!user) return <Navigate to="/login" replace />
  if (user.onboarded) return <Navigate to="/dashboard" replace />

  if (!config) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink text-faint">
        {error ? <p className="px-6 text-center text-[13px]">{error}</p> : <Spinner size={22} />}
      </div>
    )
  }

  const current = steps[step]
  const isLast = step === steps.length - 1
  const progress = (step + 1) / steps.length

  const go = (delta) => {
    setDir(delta)
    setStep((s) => Math.min(steps.length - 1, Math.max(0, s + delta)))
  }

  function canAdvance() {
    if (current.kind === 'name') return values.name.trim().length > 0
    if (current.kind === 'confidence') return true
    const f = current.field
    if (f.key === 'focusAreas') return values.focusAreas.length > 0
    return !!values[f.key]
  }

  function pick(field, value) {
    if (field.key === 'focusAreas') {
      setValues((v) => {
        const has = v.focusAreas.includes(value)
        if (has) return { ...v, focusAreas: v.focusAreas.filter((x) => x !== value) }
        if (v.focusAreas.length >= config.maxFocusAreas) return v
        return { ...v, focusAreas: [...v.focusAreas, value] }
      })
      return
    }
    setValues((v) => ({ ...v, [field.key]: value }))
    // Single-select advances itself — one tap per screen, no Continue needed.
    setTimeout(() => go(1), reduced ? 0 : 220)
  }

  /**
   * GitHub is linked *before* the profile is marked complete — completing it
   * flips the route guard and would redirect out of this page mid-flow. A
   * GitHub failure leaves the user here with the error and a working Skip.
   */
  async function submit({ withGithub = false } = {}) {
    setBusy(true)
    setError(null)
    try {
      if (withGithub && github.trim()) {
        await linkGithub(github.trim())
      }
      await completeOnboarding(values)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const slide = {
    initial: reduced ? { opacity: 0 } : { opacity: 0, x: dir * 28 },
    animate: { opacity: 1, x: 0 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, x: dir * -28 },
    transition: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
  }

  return (
    <main className="flex min-h-dvh flex-col bg-ink">
      {/* progress */}
      <div className="sticky top-0 z-10 bg-ink/90 px-5 pb-3 pt-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={step === 0}
            aria-label="Back"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-dim transition-colors hover:text-text disabled:opacity-25"
          >
            <IconArrowLeft size={16} />
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <motion.div
              className="h-full rounded-full bg-ember"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="stat shrink-0 text-[11px] text-faint">
            {step + 1}/{steps.length}
          </span>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-4 sm:px-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} {...slide} className="flex flex-1 flex-col">
            {/* ---------------------------------------------------- name -- */}
            {current.kind === 'name' && (
              <>
                <div className="mb-7">
                  <Ring value={1} size={26} stroke={3} duration={1} />
                  <h1 className="mt-5 font-display text-[26px] font-bold leading-tight tracking-tight">
                    What should we call you?
                  </h1>
                  <p className="mt-2 text-[14px] leading-relaxed text-dim">
                    The next few questions decide what your scenarios look like. About 40 seconds.
                  </p>
                </div>
                <input
                  autoFocus
                  value={values.name}
                  maxLength={40}
                  onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && canAdvance() && go(1)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-[16px] outline-none transition-colors placeholder:text-faint focus:border-ember"
                />
              </>
            )}

            {/* --------------------------------------------------- field -- */}
            {current.kind === 'field' && (
              <>
                <div className="mb-6">
                  <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight">
                    {current.field.question}
                  </h1>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
                    {current.field.hint}
                    {current.field.key === 'focusAreas' && (
                      <span className="text-faint">
                        {' '}
                        ({values.focusAreas.length}/{config.maxFocusAreas} picked)
                      </span>
                    )}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {current.field.options.map((o, i) => (
                    <Choice
                      key={o.value}
                      index={i}
                      label={o.label}
                      selected={
                        current.field.key === 'focusAreas'
                          ? values.focusAreas.includes(o.value)
                          : values[current.field.key] === o.value
                      }
                      onClick={() => pick(current.field, o.value)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ---------------------------------------------- confidence -- */}
            {current.kind === 'confidence' && (
              <>
                <div className="mb-6">
                  <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight">
                    {config.confidence.question}
                  </h1>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
                    {config.confidence.hint}
                  </p>
                </div>
                <div className="space-y-5">
                  {config.confidence.tracks.map((t) => (
                    <ConfidenceRow
                      key={t.id}
                      track={t}
                      scale={config.confidence.scale}
                      value={values.confidence[t.id]}
                      onChange={(v) =>
                        setValues((s) => ({ ...s, confidence: { ...s.confidence, [t.id]: v } }))
                      }
                    />
                  ))}
                </div>
              </>
            )}
            {/* -------------------------------------------------- github -- */}
            {current.kind === 'github' && (
              <>
                <div className="mb-6">
                  <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight">
                    Got a GitHub?
                  </h1>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
                    Optional. If you link one, your scenarios use the tools you actually work with
                    instead of generic ones. Only public repositories are read, and nothing is
                    posted.
                  </p>
                </div>
                <GithubInput
                  autoFocus
                  value={github}
                  onChange={setGithub}
                  onSubmit={() => submit({ withGithub: true })}
                  busy={busy}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="mt-4 text-[12.5px] leading-relaxed text-ember-hi" role="alert">
            {error}
          </p>
        )}

        {/* Continue only where a tap cannot advance on its own. */}
        {(current.kind !== 'field' || current.field.key === 'focusAreas') && (
          <motion.div
            className="mt-7 space-y-3"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <Button
              size="lg"
              className="w-full"
              disabled={busy || (current.kind === 'github' ? !github.trim() : !canAdvance())}
              onClick={() => (isLast ? submit({ withGithub: true }) : go(1))}
            >
              {busy ? (
                <>
                  <Spinner size={16} />
                  {current.kind === 'github' && github.trim() ? ' Reading your repositories…' : ''}
                </>
              ) : current.kind === 'github' ? (
                <>
                  Connect and start <IconArrowRight size={17} />
                </>
              ) : (
                <>
                  Continue <IconArrowRight size={17} />
                </>
              )}
            </Button>

            {current.kind === 'github' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => submit()}
                className="w-full py-1 text-[13px] font-medium text-faint transition-colors hover:text-dim disabled:opacity-40"
              >
                Skip — I'll add it later
              </button>
            )}
          </motion.div>
        )}
      </div>
    </main>
  )
}
