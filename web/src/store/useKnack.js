import { create } from 'zustand'
import { api } from '../lib/api'

export const useKnack = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  /** In-flight level and its result — kept in memory so Quest → Feedback needs
   *  no round trip. A hard refresh on /feedback drops these and redirects. */
  level: null,
  result: null,

  /**
   * Two-stage load. /api/auth/me is cheap and works signed-out; the full
   * progress payload is only fetched once a profile exists, because scenario
   * quality (and half the dashboard) depends on onboarding being done.
   */
  async load() {
    try {
      const { user } = await api.me()
      if (!user) {
        set({ user: null, loading: false, error: null })
        return null
      }
      if (!user.onboarded) {
        set({ user, loading: false, error: null })
        return user
      }
      const full = await api.user()
      set({ user: full, loading: false, error: null })
      return full
    } catch (e) {
      // A network failure is fatal; a 401 just means signed out.
      set({ user: null, loading: false, error: e.status === 401 ? null : e.message })
      return null
    }
  },

  async signup(body) {
    await api.signup(body)
    return get().load()
  },

  async login(body) {
    await api.login(body)
    return get().load()
  },

  async logout() {
    await api.logout()
    set({ user: null, level: null, result: null })
  },

  async completeOnboarding(profile) {
    await api.submitOnboarding(profile)
    return get().load()
  },

  async saveProfile(profile) {
    await api.updateProfile(profile)
    return get().load()
  },

  async linkGithub(username) {
    await api.linkGithub(username)
    return get().load()
  },

  async unlinkGithub() {
    await api.unlinkGithub()
    return get().load()
  },

  setLevel: (level) => set({ level, result: null }),
  setResult: (result) => set({ result }),
  clearSession: () => set({ level: null, result: null }),

  /** Resume: upload by paste or by file, and remove. All reload the user. */
  async saveResumeText(text) {
    await api.pasteResume(text)
    return get().load()
  },

  async saveResumeFile(file) {
    await api.uploadResume(file)
    return get().load()
  },

  async removeResume() {
    await api.removeResume()
    return get().load()
  },

  /** Apply the evaluate response optimistically so the header animates the new
   *  XP/streak immediately, then reconcile with the server. */
  applyResult(result) {
    const user = get().user
    if (user) {
      set({
        user: {
          ...user,
          xp: result.xp.after,
          level: result.level,
          streak: result.streak.value,
          longestStreak: Math.max(user.longestStreak, result.streak.value),
          doneToday: true,
          streakAtRisk: false,
          totalQuests: user.totalQuests + (result.kind === 'interview' ? 0 : 1),
          // An interview round moves XP and the streak but never a track score.
          ...(result.trackScores
            ? {
                trackScores: result.trackScores,
                readinessScore: result.readinessScore,
                tracks: user.tracks.map((t) => ({ ...t, ...result.trackScores[t.id] })),
              }
            : {}),
          ...(result.progress ? { interview: result.progress } : {}),
          // The simulation layer moves on almost every result, so the header
          // and dashboard reflect it before the reconciling fetch lands.
          ...(result.career ? { career: result.career } : {}),
        },
      })
    }
    set({ result })
    get().load()
  },

  async reset() {
    await api.resetProgress()
    set({ level: null, result: null })
    return get().load()
  },
}))
