import { useKnack } from '../store/useKnack'
import { useSpeech } from '../lib/speech'
import { IconMic, IconStop } from './Icons'
import { cx } from '../lib/ui'

/**
 * The mic button. Hold a thought, press it, and say it; the words land in the
 * answer box as you speak, and you can still edit them before sending.
 *
 * It is a toggle rather than push-to-talk because an interview answer runs a
 * minute or two and nobody holds a button that long. Anything it hears is
 * appended, so typing and speaking mix freely.
 */
export function MicButton({ onText, disabled = false, size = 'md', className, withLabel = false }) {
  const offline = useKnack((s) => !!s.user?.offline?.offline)
  const { supported, listening, interim, error, start, stop } = useSpeech({
    onText,
    onDevice: offline,
  })

  const dim = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'
  const label = !supported
    ? 'This browser cannot do speech recognition. Chrome, Edge and Safari can.'
    : listening
      ? 'Stop listening'
      : 'Answer out loud'

  return (
    <div className={cx('flex min-w-0 items-center gap-2.5', className)}>
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={listening}
        disabled={disabled || !supported}
        onClick={listening ? stop : start}
        className={cx(
          'grid shrink-0 place-items-center rounded-full border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40',
          dim,
          listening
            ? 'mic-live border-ember bg-ember text-[#160c05]'
            : 'border-line bg-raised text-ember-hi hover:border-ember hover:bg-white/10'
        )}
      >
        {listening ? <IconStop size={18} /> : <IconMic size={20} />}
      </button>

      {withLabel && !listening && !error && (
        <span className="text-[12px] font-semibold text-faint">
          {supported ? 'Tap to speak' : 'Mic not supported here'}
        </span>
      )}
      {listening && (
        <span className="min-w-0 truncate text-[12.5px] italic text-dim">
          {interim ? `“${interim}”` : 'Listening…'}
        </span>
      )}
      {error && !listening && (
        <span className="min-w-0 text-[11.5px] leading-snug text-ember-hi" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
