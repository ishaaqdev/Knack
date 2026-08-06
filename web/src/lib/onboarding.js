import { useEffect, useState } from 'react'
import { api } from './api'

/**
 * The onboarding field definitions are owned by the server so validation and UI
 * cannot drift. They never change at runtime, so one fetch is cached for the
 * whole session and shared by the onboarding flow, the profile editor and the
 * profile summary chips.
 */
let cache = null
let inflight = null

export function fetchOnboardingConfig() {
  if (cache) return Promise.resolve(cache)
  if (!inflight) {
    inflight = api
      .onboardingOptions()
      .then((c) => {
        cache = c
        inflight = null
        return c
      })
      .catch((e) => {
        inflight = null
        throw e
      })
  }
  return inflight
}

export function useOnboardingConfig() {
  const [config, setConfig] = useState(cache)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (cache) return
    let alive = true
    fetchOnboardingConfig()
      .then((c) => alive && setConfig(c))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  return { config, error }
}

/** { fieldKey: { optionValue: label } } — for rendering stored profile values. */
export function labelLookup(config) {
  if (!config) return {}
  return Object.fromEntries(
    config.fields.map((f) => [f.key, Object.fromEntries(f.options.map((o) => [o.value, o.label]))])
  )
}
