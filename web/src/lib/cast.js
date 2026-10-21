import { useKnack } from '../store/useKnack'

/**
 * Looks up a colleague's drawing by the name the trainee gave them. Beats and
 * conversations only carry a name and a role, and sending the look along with
 * every one of them would be the same data again; the cast is already on the
 * user, so this reads it from there.
 */
export function useCast() {
  const people = useKnack((s) => s.user?.people ?? [])
  return (name) => {
    const p = people.find((c) => c.name === name || c.defaultName === name)
    return p ? { look: p.look, accent: p.accent } : { look: null, accent: undefined }
  }
}
