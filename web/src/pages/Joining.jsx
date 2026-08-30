import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { api } from '../lib/api'
import { Button, Card, Page, PageHead, Spinner } from '../components/primitives'
import { Avatar } from '../components/Avatar'
import { IconArrowRight, IconCheck } from '../components/Icons'
import { cx, useReducedMotion } from '../lib/ui'

/**
 * The first day.
 *
 * The design document asks for characters to be introduced by role and named by
 * the trainee, and it is right that this happens at the start rather than in a
 * settings screen: a colleague you named is a colleague, and one the app named
 * is a label. So the team is introduced one at a time, by what they do, and the
 * trainee decides what to call them.
 *
 * Skipping is allowed and keeps the defaults — nobody should be blocked from
 * starting work by a naming form.
 */

const PRONOUNS = ['they/them', 'she/her', 'he/him']

function Introduce({ person, index, total, onSave, onSkip, busy }) {
  const reduced = useReducedMotion()
  const [name, setName] = useState(person.name)
  const [pronouns, setPronouns] = useState(person.pronouns)

  useEffect(() => {
    setName(person.name)
    setPronouns(person.pronouns)
  }, [person.id, person.name, person.pronouns])

  return (
    <motion.div
      key={person.id}
      initial={reduced ? false : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: -20 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-faint">
        {index + 1} of {total}
      </p>

      <Card hot>
        <div className="flex items-center gap-3.5">
          <Avatar name={name || person.role} value={null} size={44} stroke={0} />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[16px] font-semibold">{person.role}</p>
            <p className="mt-0.5 text-[12.5px] text-faint">{person.department}</p>
          </div>
        </div>

        <p className="mt-3.5 text-[13.5px] leading-relaxed text-dim">{person.personality}</p>
        <p className="mt-2 text-[12.5px] text-faint">{person.joinedLabel}</p>

        <div className="mt-4 border-t border-hair pt-4">
          <label className="mb-2 block text-[13px] font-medium text-dim">
            What do you want to call them?
          </label>
          <input
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            placeholder={person.defaultName}
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-ember"
          />

          <p className="mt-3 mb-2 text-[13px] font-medium text-dim">And their pronouns?</p>
          <div className="flex flex-wrap gap-2">
            {PRONOUNS.map((p) => (
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
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-faint">
            A separate choice on purpose — a name does not decide them, and the app would rather
            ask than guess.
          </p>
        </div>
      </Card>

      <div className="mt-5 flex gap-2.5">
        <Button
          className="flex-1"
          disabled={busy}
          onClick={() => onSave({ name: name.trim() || person.defaultName, pronouns })}
        >
          {busy ? <Spinner size={15} /> : null}
          {index + 1 === total ? 'Start work' : 'Next'}
          <IconArrowRight size={16} />
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={busy}>
          Keep {person.defaultName}
        </Button>
      </div>
    </motion.div>
  )
}

export function Joining() {
  const navigate = useNavigate()
  const reload = useKnack((s) => s.load)

  const [people, setPeople] = useState([])
  const [at, setAt] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const load = useCallback(async () => {
    try {
      const d = await api.people()
      setPeople(d.characters)
      if (!d.characters.length) setError('Your team has not been created yet.')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const advance = () => {
    if (at + 1 >= people.length) {
      setDone(true)
      reload()
    } else {
      setAt((i) => i + 1)
    }
  }

  async function save(body) {
    setBusy(true)
    setError(null)
    try {
      await api.renamePerson(people[at].id, body)
      advance()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Page>
        <div className="flex items-center gap-2 text-[13px] text-faint">
          <Spinner size={15} /> Walking you round…
        </div>
      </Page>
    )
  }

  if (done || !people.length) {
    return (
      <Page className="pb-12">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-ember bg-ember text-[#160c05]">
            <IconCheck size={24} />
          </span>
          <h1 className="title">You are on the team</h1>
          <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-dim">
            They will remember how you handle them. Relationships move on what you actually do,
            not on how many levels you finish.
          </p>
        </div>

        <Button size="lg" className="w-full" onClick={() => navigate('/office')}>
          Start your first day <IconArrowRight size={17} />
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="mt-3 w-full"
          onClick={() => navigate('/people')}
        >
          See the team first
        </Button>
      </Page>
    )
  }

  return (
    <Page className="pb-12">
      <PageHead eyebrow="First day" title="Meet the team">
        Five people you will be working with. Name them however you like — this is your workplace.
      </PageHead>

      {error && <p className="mb-4 text-[12.5px] text-ember-hi">{error}</p>}

      <AnimatePresence mode="wait">
        <Introduce
          key={people[at].id}
          person={people[at]}
          index={at}
          total={people.length}
          busy={busy}
          onSave={save}
          onSkip={advance}
        />
      </AnimatePresence>
    </Page>
  )
}
