import { AnimatePresence, motion } from 'framer-motion'
import { Character } from './Character'
import { Pill } from './primitives'
import { IconClose } from './Icons'
import { cx, useReducedMotion } from '../lib/ui'

const Row = ({ label, children }) => (
  <div>
    <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">{label}</p>
    <div className="mt-1 text-[13.5px] leading-relaxed text-dim">{children}</div>
  </div>
)

/** Everything worth knowing about one person, as a sticker-book page. */
export function PersonCard({ person, expression = 'neutral', speaking = false, className }) {
  if (!person) return null
  return (
    <div className={cx('space-y-3.5', className)}>
      <div className="flex items-center gap-4">
        <Character
          look={person.look}
          accent={person.accent}
          expression={expression}
          speaking={speaking}
          size={92}
          title={person.name}
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[22px] font-bold leading-tight">{person.name}</p>
          <p className="text-[12.5px] text-faint">
            {[person.pronouns, person.role ?? person.title].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {person.trait && <Pill active>{person.trait}</Pill>}
            {person.department && <Pill dot={false}>{person.department}</Pill>}
          </div>
        </div>
      </div>

      {person.tagline && (
        <p className="font-display text-[15px] italic leading-snug text-text">{person.tagline}</p>
      )}
      {person.background && <Row label="Background">{person.background}</Row>}
      {person.personality && <Row label="What they are like">{person.personality}</Row>}
      {person.speaking && <Row label="How they talk">{person.speaking}</Row>}
      {person.strengths?.length > 0 && <Row label="Good at">{person.strengths.join(' · ')}</Row>}
      {(person.tell || person.quirk) && <Row label="Watch for">{person.tell ?? person.quirk}</Row>}
    </div>
  )
}

/** The card in a sheet that slides up over the page. */
export function ProfileSheet({ person, expression, onClose }) {
  const reduced = useReducedMotion()
  return (
    <AnimatePresence>
      {person && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-end bg-black/70 backdrop-blur-sm sm:place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${person.name} profile`}
            className="card relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-b-none p-5 sm:rounded-b-[22px]"
            initial={reduced ? false : { y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3.5 top-3.5 grid h-9 w-9 place-items-center rounded-full border-2 border-line text-dim hover:border-ember hover:text-text"
            >
              <IconClose size={16} />
            </button>
            <PersonCard person={person} expression={expression} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
