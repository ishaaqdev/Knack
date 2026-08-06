import { create } from 'zustand'
import { api } from '../lib/api'

export const useKnack = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  /** In-flight quest and its result — kept in memory so Quest → Feedback needs
   *  no round trip. A hard refresh on /feedback drops these and redirects. */
  quest: null,
  result: null,

  async load() {
    try {
      const user = await api.user()
      set({ user, loading: false, error: null })
      return user
    } catch (e) {
      set({ error: e.message, loading: false })
      return null
    }
  },

  setQuest: (quest) => set({ quest, result: null }),
  setResult: (result) => set({ result }),
  clearSession: () => set({ quest: null, result: null }),

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
          totalQuests: user.totalQuests + 1,
          trackScores: result.trackScores,
          readinessScore: result.readinessScore,
          tracks: user.tracks.map((t) => ({ ...t, ...result.trackScores[t.id] })),
        },
      })
    }
    set({ result })
    get().load()
  },

  async reset() {
    await api.resetProgress()
    set({ quest: null, result: null })
    return get().load()
  },

  async rename(name) {
    await api.rename(name)
    return get().load()
  },
}))
