import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { Button, Card, Pill, Spinner } from './primitives'
import { IconDoc, IconUpload, IconClose, IconPen } from './Icons'
import { cx, relativeDate, useReducedMotion } from '../lib/ui'

const ACCEPT = '.pdf,.docx,.txt,.md'

/** What Knack read out of the resume — shown so the inference is inspectable. */
function ResumeSummary({ resume, onReplace, onRemove, busy }) {
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
            <IconDoc size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-semibold">
              {resume.fileName || 'Resume'}
            </p>
            <p className="mt-0.5 text-[11.5px] text-faint">
              {resume.words} words read · added {relativeDate(resume.updatedAt)}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[13.5px] leading-relaxed text-dim">{resume.brief}</p>

        {resume.skills?.length > 0 && (
          <div className="mt-3.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              Used in your scenarios
            </p>
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((s) => (
                <Pill key={s} active>
                  {s}
                </Pill>
              ))}
            </div>
          </div>
        )}

        {resume.projects?.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              Your interviewer will ask about
            </p>
            <ul className="space-y-1.5">
              {resume.projects.map((p) => (
                <li key={p.name} className="text-[13px] leading-relaxed text-dim">
                  <span className="text-text">{p.name}</span>
                  {p.what ? ` — ${p.what}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}

        {resume.highlights?.length > 0 && (
          <div className="mt-3.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              Claims you should be ready to defend
            </p>
            <ul className="space-y-1.5">
              {resume.highlights.map((h) => (
                <li key={h} className="text-[13px] leading-relaxed text-dim">
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex gap-2.5 border-t border-hair pt-4">
          <Button variant="ghost" size="sm" onClick={onReplace} disabled={busy}>
            {busy ? <Spinner size={13} /> : <IconUpload size={14} />} Replace
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} disabled={busy}>
            <IconClose size={14} /> Remove
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

/** Profile-page section: upload a file, or paste the text. */
export function ResumeSection() {
  const user = useKnack((s) => s.user)
  const saveResumeFile = useKnack((s) => s.saveResumeFile)
  const saveResumeText = useKnack((s) => s.saveResumeText)
  const removeResume = useKnack((s) => s.removeResume)

  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [pasting, setPasting] = useState(false)
  const [text, setText] = useState('')
  const [drag, setDrag] = useState(false)

  async function run(fn) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      setPasting(false)
      setText('')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onFile = (file) => file && run(() => saveResumeFile(file))

  if (user.resume && !pasting) {
    return (
      <>
        <ResumeSummary
          resume={user.resume}
          busy={busy}
          onReplace={() => fileRef.current?.click()}
          onRemove={() => run(removeResume)}
        />
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {error && <p className="mt-2 text-[12.5px] leading-relaxed text-ember-hi">{error}</p>}
      </>
    )
  }

  return (
    <Card>
      <p className="text-[13.5px] leading-relaxed text-dim">
        Add your resume and the mock interviewer asks about your actual projects instead of
        generic questions. It stays on this machine and is never posted anywhere.
      </p>

      {!pasting ? (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              onFile(e.dataTransfer.files?.[0])
            }}
            disabled={busy}
            className={cx(
              'mt-3.5 flex w-full flex-col items-center rounded-tile border border-dashed px-5 py-7 transition-colors',
              drag ? 'border-ember bg-ember/5' : 'border-line hover:border-dim',
              busy && 'opacity-60'
            )}
          >
            <span className="mb-2.5 text-ember">
              {busy ? <Spinner size={20} /> : <IconUpload size={22} />}
            </span>
            <span className="text-[14px] font-medium text-text">
              {busy ? 'Reading your resume…' : 'Drop a file, or tap to choose'}
            </span>
            <span className="mt-1 text-[11.5px] text-faint">PDF, DOCX or TXT — up to 4 MB</span>
          </button>

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => setPasting(true)}
            className="mx-auto mt-3.5 flex items-center gap-1.5 text-[12.5px] text-faint transition-colors hover:text-dim"
          >
            <IconPen size={13} /> Paste the text instead
          </button>
        </>
      ) : (
        <div className="mt-3.5 space-y-3">
          <div className="card overflow-hidden p-0 focus-within:border-line">
            <textarea
              autoFocus
              rows={9}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
              placeholder="Paste everything — education, skills, projects, internships."
              className="w-full resize-none bg-transparent px-4 py-3.5 text-[14px] leading-relaxed outline-none placeholder:text-faint disabled:opacity-60"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => run(() => saveResumeText(text))}
            disabled={busy || text.trim().length < 200}
          >
            {busy ? (
              <>
                <Spinner size={15} /> Reading your resume…
              </>
            ) : (
              'Save resume'
            )}
          </Button>
          <button
            type="button"
            onClick={() => {
              setPasting(false)
              setError(null)
            }}
            className="mx-auto flex text-[12.5px] text-faint transition-colors hover:text-dim"
          >
            Upload a file instead
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-[12.5px] leading-relaxed text-ember-hi" role="alert">
          {error}
        </p>
      )}
    </Card>
  )
}
