import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { Button, Card, Spinner } from './primitives'
import { cx, useReducedMotion } from '../lib/ui'
import { useOnboardingConfig } from '../lib/onboarding'

/**
 * Editing the stated profile is editing the prompt. Changing "startup" to
 * "service company" genuinely changes the next scenario, so this is not a
 * cosmetic settings screen.
 */
export function ProfileEditor({ onDone }) {
  const user = useKnack((s) => s.user)
  const saveProfile = useKnack((s) => s.saveProfile)
  const reduced = useReducedMotion()

  const { config, error: configError } = useOnboardingConfig()
  const [values, setValues] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    setValues({
      name: user.name,
      yearOfStudy: user.yearOfStudy,
      branch: user.branch,
      targetRole: user.targetRole,
      experience: user.experience,
      workSetting: user.workSetting,
      focusAreas: user.focusAreas ?? [],
      confidence: user.confidence ?? {},
    })
  }, [user])

  if (!config || !values) {
    return (
      <Card className="mt-3 flex items-center justify-center gap-2 py-8 text-[13px] text-faint">
        {configError ? configError : <><Spinner size={15} /> Loading…</>}
      </Card>
    )
  }

  function toggleFocus(v) {
    setValues((s) => {
      if (s.focusAreas.includes(v)) return { ...s, focusAreas: s.focusAreas.filter((x) => x !== v) }
      if (s.focusAreas.length >= config.maxFocusAreas) return s
      return { ...s, focusAreas: [...s.focusAreas, v] }
    })
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await saveProfile(values)
      onDone?.()
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  const chip = (selected) =>
    cx(
      'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
      selected
        ? 'border-ember/50 bg-ember/10 text-ember-hi'
        : 'border-line bg-raised text-dim hover:text-text'
    )

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <Card className="mt-3 space-y-5">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            Display name
          </p>
          <input
            value={values.name}
            maxLength={40}
            onChange={(e) => setValues((s) => ({ ...s, name: e.target.value }))}
            className="w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-ember"
          />
        </div>

        {config.fields.map((f) => (
          <div key={f.key}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              {f.question}
              {f.key === 'focusAreas' && (
                <span className="ml-1 normal-case tracking-normal text-faint">
                  (max {config.maxFocusAreas})
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {f.options.map((o) => {
                const selected =
                  f.key === 'focusAreas'
                    ? values.focusAreas.includes(o.value)
                    : values[f.key] === o.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    className={chip(selected)}
                    onClick={() =>
                      f.key === 'focusAreas'
                        ? toggleFocus(o.value)
                        : setValues((s) => ({ ...s, [f.key]: o.value }))
                    }
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div>
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            {config.confidence.question}
          </p>
          <div className="space-y-3">
            {config.confidence.tracks.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="flex-1 truncate text-[13px]">{t.name}</span>
                <div className="flex gap-1">
                  {config.confidence.scale.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      aria-label={`${t.name}: ${s.label}`}
                      onClick={() =>
                        setValues((v) => ({
                          ...v,
                          confidence: { ...v.confidence, [t.id]: s.value },
                        }))
                      }
                      className={cx(
                        'h-7 w-7 rounded-lg border text-[11px] font-medium transition-colors',
                        values.confidence[t.id] === s.value
                          ? 'border-ember/50 bg-ember/12 text-ember-hi'
                          : 'border-line text-faint hover:text-dim'
                      )}
                    >
                      {s.value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-[12.5px] text-ember-hi">{error}</p>}

        <div className="flex gap-3 border-t border-hair pt-4">
          <Button variant="ghost" className="flex-1" onClick={onDone} disabled={busy}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={save} disabled={busy}>
            {busy ? <Spinner size={15} /> : 'Save profile'}
          </Button>
        </div>

        <p className="text-[11px] leading-relaxed text-faint">
          These answers are fed into every scenario prompt. Changing them changes what you get next.
        </p>
      </Card>
    </motion.div>
  )
}
