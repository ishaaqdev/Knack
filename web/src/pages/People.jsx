import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '../lib/api'
import { Button, Card, Empty, Page, Pill, SectionLabel, SkillBar, Spinner } from '../components/primitives'
import { IconArrowRight, IconClose, IconPen, IconUser } from '../components/Icons'
import { cx, relativeDate, useReducedMotion } from '../lib/ui'

/**
 * The people directory.
 *
 * A relationship number on its own would be a score. What makes it a colleague
 * is the list underneath it — the specific things they remember you doing, in
 * order, with the effect each one had.
 */

const INITIALS = (n) => n.slice(0, 2).toUpperCase()

const TIER_TONE = {
  Hostile: 'text-ember-hi',
  Distant: 'text-ember-hi',
  Neutral: 'text-dim',
  Positive: 'text-text',
  Trusted: 'text-text',
  'Very Close': 'text-text',
}

/* --------------------------------------------------------------- rename -- */

function RenameCard({ person, pronounOptions, onSave, onCancel, busy }) {
  const [name, setName] = useState(person.name)
  const [pronouns, setPronouns] = useState(person.pronouns)

  return (
    <Card className="mt-2.5">
      <p className="text-[13px] leading-relaxed text-dim">
        Name them whatever you like — this is your workplace. Pronouns are a separate choice,
        because a name does not decide them.
      </p>

      <input
        value={name}
        maxLength={24}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        placeholder={person.defaultName}
        className="mt-3.5 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-ember"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {pronounOptions.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPronouns(p)}
            className={cx(
              'rounded-full border px-3 py-1.5 text-[12.5px] transition-colors',
              pronouns === p
                ? 'border-ember/45 bg-ember/10 text-ember-hi'
                : 'border-line text-dim hover:border-dim'
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2.5">
        <Button
          size="sm"
          disabled={busy}
          onClick={() => onSave({ name: name.trim() || person.defaultName, pronouns })}
        >
          {busy ? <Spinner size={13} /> : null} Save
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </Card>
  )
}

/* --------------------------------------------------------------- person -- */

function Person({ person, index, pronounOptions, onRenamed }) {
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [full, setFull] = useState(null)

  const expand = async () => {
    const next = !open
    setOpen(next)
    if (next && !full) {
      try {
        setFull(await api.person(person.id))
      } catch {
        /* the summary is enough to keep the row usable */
      }
    }
  }

  const save = async (body) => {
    setBusy(true)
    try {
      const updated = await api.renamePerson(person.id, body)
      setFull(updated)
      onRenamed(updated)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  const shown = full ?? person

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : index * 0.05, duration: 0.35 }}
    >
      <Card className="p-0">
        <button type="button" onClick={expand} className="flex w-full items-center gap-3.5 p-4 text-left">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-[12px] font-semibold text-faint">
            {INITIALS(shown.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="truncate font-display text-[15px] font-semibold">{shown.name}</span>
              <span className={cx('shrink-0 text-[11.5px]', TIER_TONE[shown.tier])}>{shown.tier}</span>
            </span>
            <span className="mt-0.5 block truncate text-[12.5px] text-dim">{shown.role}</span>
            <span className="mt-2 block">
              <SkillBar value={shown.relationship} height={4} delay={0.1 + index * 0.05} />
            </span>
          </span>
          <span className="stat shrink-0 text-[13px] text-dim">{shown.relationship}</span>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={reduced ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-3.5 border-t border-hair p-4">
                <p className="text-[13px] leading-relaxed text-dim">{shown.personality}</p>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12.5px]">
                  <span className="text-faint">
                    {shown.department} · {shown.joinedLabel}
                  </span>
                  <span className="text-faint">{shown.pronouns}</span>
                </div>

                {shown.careerHistory?.length > 0 && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                      Career so far
                    </p>
                    <p className="text-[13px] text-dim">{shown.careerHistory.join(' → ')}</p>
                  </div>
                )}

                {shown.strengths?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {shown.strengths.map((s) => (
                      <Pill key={s} dot={false}>
                        {s}
                      </Pill>
                    ))}
                  </div>
                )}

                {shown.history?.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                      What they remember
                    </p>
                    <ul className="space-y-2">
                      {shown.history.map((h, i) => (
                        <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                          <span
                            className={cx(
                              'stat mt-[1px] w-7 shrink-0 text-right text-[11.5px]',
                              h.delta > 0 ? 'text-ember' : h.delta < 0 ? 'text-ember-hi' : 'text-faint'
                            )}
                          >
                            {h.delta > 0 ? `+${h.delta}` : h.delta || '—'}
                          </span>
                          <span className="text-dim">{h.summary}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {editing ? (
                  <RenameCard
                    person={shown}
                    pronounOptions={pronounOptions}
                    busy={busy}
                    onSave={save}
                    onCancel={() => setEditing(false)}
                  />
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    <IconPen size={13} /> {shown.renamed ? 'Rename again' : 'Give them a name'}
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ page -- */

export function People() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setData(await api.people())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRenamed = (updated) =>
    setData((d) => ({
      ...d,
      characters: d.characters.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
    }))

  if (loading) {
    return (
      <Page>
        <div className="flex items-center gap-2 text-[13px] text-faint">
          <Spinner size={15} /> Loading your team…
        </div>
      </Page>
    )
  }

  const people = data?.characters ?? []

  return (
    <Page className="pb-12">
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-bold tracking-tight">People</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-dim">
          The colleagues you work with. They remember how you handled them, and it changes what
          they are willing to do for you later.
        </p>
      </div>

      {error && <p className="mb-4 text-[12.5px] text-ember-hi">{error}</p>}

      {people.length === 0 ? (
        <Empty
          title="You have not joined yet"
          body="Your team is created the day you join the company. Clear the group discussion and the interview rounds first."
          action={
            <Button as={Link} to="/career">
              See your career <IconArrowRight size={16} />
            </Button>
          }
        />
      ) : (
        <>
          <SectionLabel right={<span className="text-[12px] text-faint">{people.length} people</span>}>
            Your team
          </SectionLabel>
          <div className="space-y-3">
            {people.map((p, i) => (
              <Person
                key={p.id}
                person={p}
                index={i}
                pronounOptions={data.pronounOptions}
                onRenamed={onRenamed}
              />
            ))}
          </div>
          <p className="mt-6 text-center text-[12px] leading-relaxed text-faint">
            Tap anyone to see what they remember. Relationships move on how you actually treated
            them, not on how many levels you finished.
          </p>
        </>
      )}
    </Page>
  )
}
