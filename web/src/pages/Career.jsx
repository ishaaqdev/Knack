import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { api } from '../lib/api'
import { Button, Card, Page, Pill, SectionLabel, Spinner } from '../components/primitives'
import { AttributePanel } from '../components/Attributes'
import {
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconLock,
  IconSpeech,
  IconUser,
} from '../components/Icons'
import { cx, useReducedMotion } from '../lib/ui'

/**
 * The career map.
 *
 * This is the screen that says the app is a career rather than a set of
 * exercises: one line, six phases, and exactly one thing you can do next.
 */

const PHASE_ICON = {
  gd: IconSpeech,
  interview: IconBriefcase,
  joining: IconUser,
  internship: IconBriefcase,
  offer: IconCheck,
  fulltime: IconCheck,
}

const PHASE_ROUTE = {
  gd: '/gd',
  interview: '/interview',
  internship: '/tracks',
}

/* ----------------------------------------------------------- career map -- */

function PhaseRow({ phase, index, current, done }) {
  const reduced = useReducedMotion()
  const Icon = PHASE_ICON[phase.id] ?? IconBriefcase

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: reduced ? 0 : index * 0.06, duration: 0.35 }}
      className="relative flex gap-3.5 pb-5 last:pb-0"
    >
      {/* the spine */}
      <div className="relative flex flex-col items-center">
        <span
          className={cx(
            'grid h-9 w-9 shrink-0 place-items-center rounded-full border',
            done
              ? 'border-ember bg-ember text-[#160c05]'
              : current
                ? 'border-ember text-ember'
                : 'border-line text-faint'
          )}
        >
          {done ? <IconCheck size={16} /> : current ? <Icon size={16} /> : <IconLock size={14} />}
        </span>
        <span
          className={cx(
            'mt-1 w-px flex-1',
            done ? 'bg-ember-low' : 'bg-line',
            index === 5 && 'hidden'
          )}
        />
      </div>

      <div className={cx('min-w-0 flex-1 pt-1', !current && !done && 'opacity-55')}>
        <div className="flex items-baseline gap-2">
          <p className="font-display text-[15px] font-semibold">{phase.name}</p>
          {current && <Pill active>Now</Pill>}
        </div>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-dim">{phase.tagline}</p>
        {current && <p className="mt-1.5 text-[12px] text-ember-hi">{phase.goal}</p>}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------- company + role choice -- */

function ChooseCompany({ career, onChosen }) {
  const [companyId, setCompanyId] = useState(career.companies[0].id)
  const [roleId, setRoleId] = useState(career.roles[0].id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.chooseCompany(companyId, roleId)
      await onChosen()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="mb-5">
      <p className="font-display text-[15px] font-semibold">Where are you applying?</p>
      <p className="mt-1 text-[13px] leading-relaxed text-dim">
        This decides who is in the room, how formal it gets and what is at stake. You can change it
        until the day you join.
      </p>

      <SectionLabel>Company</SectionLabel>
      <div className="space-y-2.5">
        {career.companies.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCompanyId(c.id)}
            className={cx(
              'w-full rounded-tile border px-4 py-3 text-left transition-colors',
              companyId === c.id ? 'border-ember/45 bg-ember/10' : 'border-line hover:border-dim'
            )}
          >
            <p className="text-[14px] font-medium">
              {c.name} <span className="text-faint">· {c.kind}</span>
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-dim">{c.blurb}</p>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <SectionLabel>Role</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {career.roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoleId(r.id)}
              className={cx(
                'rounded-full border px-3 py-1.5 text-[12.5px] transition-colors',
                roleId === r.id
                  ? 'border-ember/45 bg-ember/10 text-ember-hi'
                  : 'border-line text-dim hover:border-dim'
              )}
            >
              {r.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-faint">
          {career.roles.find((r) => r.id === roleId)?.blurb}
        </p>
      </div>

      {error && <p className="mt-3 text-[12.5px] text-ember-hi">{error}</p>}

      <Button className="mt-4 w-full" onClick={save} disabled={busy}>
        {busy ? <Spinner size={15} /> : null} Set my target
      </Button>
    </Card>
  )
}

/* ------------------------------------------------------------------ page -- */

export function Career() {
  const navigate = useNavigate()
  const reload = useKnack((s) => s.load)

  const [career, setCareer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setCareer(await api.career())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function join() {
    setBusy(true)
    setError(null)
    try {
      await api.joinCompany()
      await load()
      await reload()
      navigate('/people')
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
          <Spinner size={15} /> Loading your career…
        </div>
      </Page>
    )
  }
  if (!career) {
    return (
      <Page>
        <p className="text-[13px] text-ember-hi">{error ?? 'Could not load your career.'}</p>
      </Page>
    )
  }

  const phase = career.phases.find((p) => p.current)
  const nextRoute = PHASE_ROUTE[career.phase]

  return (
    <Page className="pb-12">
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-bold tracking-tight">Your career</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-dim">
          {career.company
            ? `Applying to ${career.company.name} — ${career.company.kind}.`
            : 'Pick where you are aiming, then work through the phases.'}
        </p>
      </div>

      {/* one action, always */}
      <Card className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
          Where you are
        </p>
        <p className="mt-1.5 font-display text-[17px] font-semibold">{phase?.name}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-dim">{phase?.goal}</p>

        {error && <p className="mt-3 text-[12.5px] text-ember-hi">{error}</p>}

        {career.phase === 'joining' ? (
          <Button size="lg" className="mt-4 w-full" onClick={join} disabled={busy}>
            {busy ? <Spinner size={16} /> : null} Join {career.company?.name ?? 'the company'}
            <IconArrowRight size={17} />
          </Button>
        ) : nextRoute ? (
          <Button as={Link} to={nextRoute} size="lg" className="mt-4 w-full">
            {career.phase === 'gd'
              ? 'Go to the group discussion'
              : career.phase === 'interview'
                ? 'Go to the interview'
                : 'Play the next level'}
            <IconArrowRight size={17} />
          </Button>
        ) : (
          <p className="mt-3 text-[12.5px] leading-relaxed text-faint">
            This phase is not built yet — it is next on the list.
          </p>
        )}
      </Card>

      {!career.company && career.phase === 'gd' && (
        <ChooseCompany career={career} onChosen={load} />
      )}

      <SectionLabel>The journey</SectionLabel>
      <Card className="mb-5">
        {career.phases.map((p, i) => (
          <PhaseRow key={p.id} phase={p} index={i} current={p.current} done={p.reached && !p.current} />
        ))}
      </Card>

      {career.phase === 'internship' && (
        <Card className="mb-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              Internship level
            </p>
            <span className="stat text-[15px] font-bold">
              {career.internship.level}
              <span className="text-faint"> / {career.internship.end}</span>
            </span>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-faint">
            A level scored 5 or better advances you. Level {career.internship.end} is the job offer.
          </p>
        </Card>
      )}

      <SectionLabel
        right={
          <span className="text-[12px] text-faint">
            {career.badges.earned} of {career.badges.list.length} badges
          </span>
        }
      >
        Professional attributes
      </SectionLabel>
      <AttributePanel attributes={career.attributes} professionalIndex={career.professionalIndex} />

      <p className="mt-3 text-center text-[12px] leading-relaxed text-faint">
        These are not XP. They go down when you handle something badly, and they decide which
        situations the app puts you in next.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button as={Link} to="/people" variant="quiet" className="w-full">
          <IconUser size={16} /> People
        </Button>
        <Button as={Link} to="/badges" variant="quiet" className="w-full">
          <IconCheck size={16} /> Badges
        </Button>
      </div>
    </Page>
  )
}
