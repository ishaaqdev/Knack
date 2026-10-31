import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useKnack } from '../store/useKnack'
import { Button, Card, Pill, Spinner } from './primitives'
import { IconArrowRight } from './Icons'
import { cx } from '../lib/ui'

/**
 * Admin controls. The server only honours these for an account listed in
 * KNACK_ADMIN_EMAILS, so showing them to anyone else would be a dead button;
 * callers render this only when the server says the account is an admin.
 */

const PHASES = [
  ['gd', 'Group discussion'],
  ['interview', 'Interview'],
  ['joining', 'Joining'],
  ['internship', 'Internship'],
  ['offer', 'The offer'],
  ['fulltime', 'Full-time'],
]

const bandOf = (bands, level) => bands?.find((b) => level >= b.from && level <= b.to)

/** Levels 5 to 30 as chips, coloured by band. Used here and on the office page. */
export function LevelChips({ value, onChange, bands, from = 5, to = 30 }) {
  const levels = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  return (
    <div className="flex flex-wrap gap-1.5">
      {levels.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          className={cx(
            'stat h-8 min-w-8 rounded-full border-2 px-2 text-[12px] font-bold transition-colors',
            value === n
              ? 'border-ember bg-ember/20 text-ember-hi'
              : 'border-line bg-raised text-dim hover:border-ember/40'
          )}
          title={bandOf(bands, n)?.name}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export function AdminPanel({ career, onChanged }) {
  const reload = useKnack((s) => s.load)
  const [level, setLevel] = useState(career.internship.level >= 30 ? 14 : career.internship.level)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const band = bandOf(career.bands, level)

  async function jump(phase) {
    setBusy(phase)
    setError(null)
    try {
      await api.adminPhase(phase, phase === 'internship' ? level : undefined)
      await onChanged()
      await reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card hot className="mb-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ember">Admin</p>
        <Pill active>Everything open</Pill>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-dim">
        All five interview rounds are open with no mock first, every internship level can be played, and the career can
        be moved to any phase. Nothing you have earned is deleted when you move.
      </p>

      <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">Go to phase</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {PHASES.map(([id, name]) => (
          <Button
            key={id}
            variant={career.phase === id ? 'primary' : 'quiet'}
            size="sm"
            disabled={busy !== null}
            onClick={() => jump(id)}
          >
            {busy === id ? <Spinner size={14} /> : null}
            {name}
          </Button>
        ))}
      </div>

      <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">Internship level</p>
      <div className="mt-2">
        <LevelChips value={level} onChange={setLevel} bands={career.bands} />
      </div>
      {band && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-ember-hi">
          Level {level}: {band.name}, {band.difficulty}. {band.brief}.
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button as={Link} to={`/office?level=${level}`} size="sm">
          Work level {level} <IconArrowRight size={15} />
        </Button>
        <Button size="sm" variant="quiet" disabled={busy !== null} onClick={() => jump('internship')}>
          {busy === 'internship' ? <Spinner size={14} /> : null}
          Set my level to {level}
        </Button>
      </div>
      {error && <p className="mt-3 text-[12.5px] text-ember-hi">{error}</p>}
    </Card>
  )
}
