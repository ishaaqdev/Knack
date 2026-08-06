import { useState } from 'react'
import { motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { Button, Card, Pill, Spinner } from './primitives'
import { IconGithub, IconRefresh, IconClose } from './Icons'
import { cx, useReducedMotion } from '../lib/ui'

export function GithubInput({ value, onChange, onSubmit, busy, error, autoFocus }) {
  return (
    <div>
      <div
        className={cx(
          'flex items-center rounded-xl border bg-surface transition-colors',
          error ? 'border-ember/50' : 'border-line focus-within:border-ember'
        )}
      >
        <span className="pl-3.5 text-faint">
          <IconGithub size={17} />
        </span>
        <span className="pl-2 text-[15px] text-faint">github.com/</span>
        <input
          autoFocus={autoFocus}
          value={value}
          disabled={busy}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && onSubmit?.()}
          placeholder="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full min-w-0 bg-transparent py-3 pr-3.5 text-[15px] outline-none placeholder:text-faint disabled:opacity-60"
        />
      </div>
      {error && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-ember-hi" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** What Knack read from GitHub — shown so the inference is inspectable. */
export function GithubSummary({ github, onRefresh, onDisconnect, busy }) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-ember">
            <IconGithub size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-semibold">
              {github.username}
            </p>
            <p className="mt-0.5 text-[11.5px] text-faint">
              {github.repoCount} {github.repoCount === 1 ? 'repository' : 'repositories'} read
              {github.level ? ` · reads as ${github.level}` : ''}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[13.5px] leading-relaxed text-dim">{github.brief}</p>

        {github.stack?.length > 0 && (
          <div className="mt-3.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              Used in your scenarios
            </p>
            <div className="flex flex-wrap gap-2">
              {github.stack.map((s) => (
                <Pill key={s} active>
                  {s}
                </Pill>
              ))}
            </div>
          </div>
        )}

        {(onRefresh || onDisconnect) && (
          <div className="mt-4 flex gap-2.5 border-t border-hair pt-4">
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh} disabled={busy}>
                {busy ? <Spinner size={13} /> : <IconRefresh size={14} />} Re-read
              </Button>
            )}
            {onDisconnect && (
              <Button variant="ghost" size="sm" onClick={onDisconnect} disabled={busy}>
                <IconClose size={14} /> Disconnect
              </Button>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  )
}

/** Profile-page section: connect, inspect, re-read or disconnect. */
export function GithubSection() {
  const user = useKnack((s) => s.user)
  const linkGithub = useKnack((s) => s.linkGithub)
  const unlinkGithub = useKnack((s) => s.unlinkGithub)

  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function connect(name = username) {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await linkGithub(name.trim())
      setUsername('')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function disconnect() {
    setBusy(true)
    try {
      await unlinkGithub()
    } finally {
      setBusy(false)
    }
  }

  if (user.github) {
    return (
      <>
        <GithubSummary
          github={user.github}
          busy={busy}
          onRefresh={() => connect(user.github.username)}
          onDisconnect={disconnect}
        />
        {error && <p className="mt-2 text-[12.5px] text-ember-hi">{error}</p>}
      </>
    )
  }

  return (
    <Card>
      <p className="text-[13.5px] leading-relaxed text-dim">
        Link a public GitHub and your scenarios use the tools you actually work with, instead of
        generic ones. Nothing is posted, and only public repositories are read.
      </p>
      <div className="mt-3.5 space-y-3">
        <GithubInput
          value={username}
          onChange={setUsername}
          onSubmit={connect}
          busy={busy}
          error={error}
        />
        <Button className="w-full" onClick={() => connect()} disabled={busy || !username.trim()}>
          {busy ? (
            <>
              <Spinner size={15} /> Reading your repositories…
            </>
          ) : (
            'Connect GitHub'
          )}
        </Button>
      </div>
    </Card>
  )
}
