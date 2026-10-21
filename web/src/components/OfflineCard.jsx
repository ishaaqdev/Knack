import { useState } from 'react'
import { useKnack } from '../store/useKnack'
import { api } from '../lib/api'
import { Card, Pill, SectionLabel } from './primitives'
import { IconWifiOff } from './Icons'
import { cx } from '../lib/ui'

/**
 * The offline switch.
 *
 * Off means the AI model is never asked, so nothing leaves this machine and
 * nothing waits on a connection: questions come from the built-in bank, the
 * panel runs from its script, and scoring uses the local rubric. All of it is
 * stored and personalised exactly the same way, which is the point. Everything
 * else in Knack already runs on this computer.
 */
export function OfflineCard() {
  const status = useKnack((s) => s.user?.offline)
  const reload = useKnack((s) => s.load)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (!status) return null
  const on = status.offline

  async function toggle() {
    setBusy(true)
    setError(null)
    try {
      await api.setOffline(!on)
      await reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <SectionLabel>Offline mode</SectionLabel>
      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ember/60 bg-ember/10 text-ember-hi">
            <IconWifiOff size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-[16px] font-semibold">Run without the AI</p>
              <Pill active={on} dot={false}>
                {on ? 'On' : 'Off'}
              </Pill>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-dim">
              {on
                ? 'No request leaves this machine. Mock questions come from the built-in bank, the panel runs from its script and scoring uses the local rubric. Your profile is still saved and still shapes what you are asked.'
                : 'The AI writes fresh questions, runs the panel and scores your answers when it can, and falls back to the built-in versions when it cannot.'}
            </p>
          </div>
        </div>

        {status.lockedByEnv ? (
          <p className="text-[12.5px] leading-relaxed text-faint">
            This was set when the server started (KNACK_OFFLINE), so it cannot be switched off from here.
          </p>
        ) : (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={toggle}
            disabled={busy}
            className={cx(
              'flex w-full items-center justify-between rounded-tile border-2 px-4 py-3 text-left transition-colors disabled:opacity-60',
              on ? 'border-ember bg-ember/10' : 'border-line hover:border-ember'
            )}
          >
            <span className="text-[14px] font-bold">{on ? 'Turn offline mode off' : 'Turn offline mode on'}</span>
            <span
              className={cx(
                'relative h-7 w-12 rounded-full border-2 transition-colors',
                on ? 'border-ember bg-ember/40' : 'border-line bg-black/30'
              )}
            >
              <span
                className={cx(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                  on ? 'left-[22px]' : 'left-0.5'
                )}
              />
            </span>
          </button>
        )}

        {error && <p className="text-[12.5px] text-ember-hi">{error}</p>}

        <p className="text-[12px] leading-relaxed text-faint">
          The mic is the one exception you should know about. Browsers do speech recognition themselves, and most send
          the audio to their maker's servers. With offline mode on, Knack asks for on-device recognition where your
          browser supports it, and says so if it cannot.
        </p>
      </Card>
    </div>
  )
}
