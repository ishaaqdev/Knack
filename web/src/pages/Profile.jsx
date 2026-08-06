import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { api } from '../lib/api'
import { Button, Card, Empty, Page, Pill, SectionLabel, SkillBar, Spinner } from '../components/primitives'
import { Ring } from '../components/Ring'
import { AttemptDetail } from '../components/AttemptDetail'
import { Insight } from '../components/Insight'
import { ProfileEditor } from '../components/ProfileEditor'
import { GithubSection } from '../components/GithubCard'
import { TRACK_ICONS, IconArrowRight, IconChevron, IconClose } from '../components/Icons'
import { cx, relativeDate, spring, useReducedMotion } from '../lib/ui'
import { labelLookup, useOnboardingConfig } from '../lib/onboarding'

const PAGE_SIZE = 20

function initials(name = '') {
  return (
    name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'K'
  )
}

/* ----------------------------------------------------------- stat block --- */

function Stat({ label, value }) {
  return (
    <div className="flex-1 text-center">
      <p className="stat text-[22px] font-bold leading-none">{value}</p>
      <p className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-faint">{label}</p>
    </div>
  )
}

/* --------------------------------------------------------------- danger --- */

function ResetConfirm({ open, onCancel, onConfirm, busy }) {
  const reduced = useReducedMotion()
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-5 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="card w-full max-w-sm p-6"
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-[18px] font-semibold">Reset all progress?</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
              This deletes every attempt and sets XP, level and streak back to zero. It cannot be
              undone.
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={onCancel} disabled={busy}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={onConfirm} disabled={busy}>
                {busy ? <Spinner size={15} /> : 'Reset'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ page -- */

export function Profile() {
  const user = useKnack((s) => s.user)
  const reset = useKnack((s) => s.reset)
  const logout = useKnack((s) => s.logout)

  const [filter, setFilter] = useState('all')
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)

  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)

  const { config } = useOnboardingConfig()
  const labels = labelLookup(config)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .history({ trackId: filter, limit: PAGE_SIZE })
      .then((d) => {
        if (!alive) return
        setRows(d.attempts)
        setTotal(d.total)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [filter, user?.totalQuests])

  async function loadMore() {
    const d = await api.history({ trackId: filter, limit: PAGE_SIZE, offset: rows.length })
    setRows((r) => [...r, ...d.attempts])
  }

  if (!user) return null

  return (
    <Page>
      {/* identity */}
      <Card className="flex items-center gap-4">
        <Ring value={user.level.progress} size={62} stroke={3.5}>
          <span className="stat text-[16px] font-bold">{initials(user.name)}</span>
        </Ring>

        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-[20px] font-bold tracking-tight">
            {user.name}
          </h1>
          <p className="truncate text-[12px] text-faint">{user.email}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Pill active>{user.level.name}</Pill>
            <span className="text-[12px] text-faint">“{user.level.title}”</span>
          </div>
        </div>
      </Card>

      {/* level progress */}
      <Card className="mt-3.5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[12.5px] text-dim">
            {user.level.xpToNext != null
              ? `${user.level.xpToNext} XP to ${user.level.nextName}`
              : 'Highest level reached'}
          </span>
          <span className="stat text-[12.5px] font-semibold text-dim">
            {user.level.xpForLevel
              ? `${user.level.xpIntoLevel} / ${user.level.xpForLevel}`
              : `${user.xp}`}
          </span>
        </div>
        <SkillBar value={user.level.progress * 100} />
      </Card>

      {/* stats */}
      <Card className="mt-3.5 flex divide-x divide-hair px-0 py-4">
        <Stat label="Total XP" value={user.xp} />
        <Stat label="Quests" value={user.totalQuests} />
        <Stat label="Best streak" value={user.longestStreak} />
        <Stat label="Avg score" value={user.avgScore || '—'} />
      </Card>

      {/* what the app has learned */}
      {user.insight && (
        <section className="mt-6">
          <SectionLabel>Your training profile</SectionLabel>
          <Insight insight={user.insight} />
        </section>
      )}

      {/* stated profile */}
      <section className="mt-6">
        <SectionLabel
          right={
            <button
              onClick={() => setEditing((v) => !v)}
              className="text-[12px] font-medium text-dim transition-colors hover:text-ember"
            >
              {editing ? 'Close' : 'Edit'}
            </button>
          }
        >
          About you
        </SectionLabel>

        {!editing && (
          <Card className="flex flex-wrap gap-2">
            {['yearOfStudy', 'branch', 'targetRole', 'experience', 'workSetting']
              .map((key) => labels[key]?.[user[key]])
              .filter(Boolean)
              .map((label) => (
                <Pill key={label} dot={false}>
                  {label}
                </Pill>
              ))}
            {(user.focusAreas ?? []).map((f) => (
              <Pill key={f} active>
                {labels.focusAreas?.[f] ?? f}
              </Pill>
            ))}
          </Card>
        )}

        <AnimatePresence>
          {editing && <ProfileEditor onDone={() => setEditing(false)} />}
        </AnimatePresence>
      </section>

      {/* github */}
      <section className="mt-6">
        <SectionLabel>GitHub</SectionLabel>
        <GithubSection />
      </section>

      {/* skill breakdown */}
      <section className="mt-6">
        <SectionLabel>Skill breakdown</SectionLabel>
        <Card className="space-y-4">
          {user.tracks.map((t, i) => {
            const Icon = TRACK_ICONS[t.id]
            return (
              <div key={t.id}>
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="text-faint"><Icon size={16} /></span>
                  <span className="flex-1 truncate text-[13.5px] font-medium">{t.name}</span>
                  <span className="text-[11px] text-faint">
                    {t.attempts} {t.attempts === 1 ? 'quest' : 'quests'}
                  </span>
                  <span className="stat w-8 text-right text-[13.5px] font-semibold text-dim">
                    {t.score}
                  </span>
                </div>
                <SkillBar value={t.score} delay={0.08 * i} />
              </div>
            )
          })}
          <div className="flex items-center justify-between border-t border-hair pt-3.5">
            <span className="text-[13px] font-medium">Professional Readiness</span>
            <span className="stat text-[17px] font-bold text-ember">{user.readinessScore}</span>
          </div>
        </Card>
      </section>

      {/* history */}
      <section className="mt-6">
        <SectionLabel right={<span className="text-[12px] text-faint">{total} total</span>}>
          Quest history
        </SectionLabel>

        <div className="mb-3 flex flex-wrap gap-2">
          {[{ id: 'all', name: 'All' }, ...user.tracks].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={cx(
                'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
                filter === t.id
                  ? 'border-ember/40 bg-ember/10 text-ember-hi'
                  : 'border-line bg-raised text-dim hover:text-text'
              )}
            >
              {t.name === 'All' ? 'All' : t.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {loading ? (
          <Card className="flex items-center justify-center gap-2 py-8 text-[13px] text-faint">
            <Spinner size={15} /> Loading history…
          </Card>
        ) : rows.length === 0 ? (
          <Empty
            title={filter === 'all' ? 'No quests yet' : 'Nothing in this track yet'}
            body="Finish a quest and it will appear here — scenario, your answer, and the feedback."
            action={
              <Button as={Link} to="/tracks">
                Start a quest <IconArrowRight size={16} />
              </Button>
            }
          />
        ) : (
          <>
            <Card className="divide-y divide-hair p-0">
              {rows.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setOpen(a)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised/60"
                >
                  <span className="stat grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-[13px] font-semibold text-ember">
                    {a.score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{a.trackName}</p>
                    <p className="truncate text-[11.5px] text-faint">
                      {relativeDate(a.timestamp)} · {a.scenarioText.slice(0, 52)}…
                    </p>
                  </div>
                  <span className="stat shrink-0 text-[12px] font-semibold text-dim">
                    +{a.xpAwarded}
                  </span>
                  <span className="shrink-0 text-faint"><IconChevron size={14} /></span>
                </button>
              ))}
            </Card>

            {rows.length < total && (
              <Button variant="ghost" className="mt-3 w-full" onClick={loadMore}>
                Load {Math.min(PAGE_SIZE, total - rows.length)} more
              </Button>
            )}
          </>
        )}
      </section>

      {/* settings */}
      <section className="mt-8">
        <SectionLabel>Settings</SectionLabel>
        <Card className="divide-y divide-hair p-0">
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium">Reset progress</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-dim">
                Clears attempts, XP, streaks and everything Knack has learned about you. Your
                profile is kept.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={() => setConfirming(true)}>
              <IconClose size={14} /> Reset
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium">Sign out</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-dim">
                Ends this session on this device.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={logout}>
              Sign out
            </Button>
          </div>
        </Card>
        <p className="mt-3 text-center text-[11px] text-faint">
          Member since {new Date(user.memberSince).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </section>

      <AttemptDetail attempt={open} onClose={() => setOpen(null)} />
      <ResetConfirm
        open={confirming}
        busy={resetting}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setResetting(true)
          await reset()
          setRows([])
          setTotal(0)
          setResetting(false)
          setConfirming(false)
        }}
      />
    </Page>
  )
}
