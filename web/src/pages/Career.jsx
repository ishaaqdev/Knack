import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { api } from '../lib/api'
import { Button, Card, Page, PageHead, Pill, SectionLabel, Spinner } from '../components/primitives'
import { AttributePanel } from '../components/Attributes'
import { CompanyCard } from '../components/CompanyCard'
import { JourneyPath } from '../components/JourneyPath'
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
  internship: '/office',
  offer: '/offer',
  fulltime: '/office',
}

/* ------------------------------------------------- company + role choice -- */

function ChooseCompany({ career, onChosen }) {
  const [companyId, setCompanyId] = useState(career.companies.find((c) => c.real)?.id ?? career.companies[0].id)
  const [roleId, setRoleId] = useState(career.roles[0].id)
  const [customName, setCustomName] = useState('')
  const [profile, setProfile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const selected = career.companies.find((c) => c.id === companyId)
  const real = career.companies.filter((c) => c.real)
  const invented = career.companies.filter((c) => !c.real)

  // Read about a company before committing to it.
  useEffect(() => {
    let live = true
    setProfile(null)
    api
      .companyProfile(companyId)
      .then((p) => live && setProfile(p))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [companyId])

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.chooseCompany(companyId, roleId, selected?.real ? '' : customName)
      await onChosen()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const row = (c) => (
    <button
      key={c.id}
      type="button"
      onClick={() => setCompanyId(c.id)}
      className={cx(
        'w-full rounded-tile border-2 px-4 py-3 text-left transition-colors',
        companyId === c.id ? 'border-ember bg-ember/12' : 'border-line hover:border-ember'
      )}
    >
      <p className="text-[14.5px] font-bold">
        {c.name} <span className="font-medium text-faint">· {c.kind}</span>
      </p>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-dim">{c.blurb}</p>
      <p className="mt-1 text-[11.5px] font-semibold text-faint">
        ~{c.employeesLabel} people · {c.revenue.label}
      </p>
    </button>
  )

  return (
    <Card className="mb-5">
      <p className="font-display text-[18px] font-semibold">Where are you applying?</p>
      <p className="mt-1 text-[13px] leading-relaxed text-dim">
        Pick a real company to prepare for how it actually hires, or an invented one to play it loose. This decides who
        is in the room, how formal it gets and what is at stake. You can change it until the day you join.
      </p>

      <div className="mt-4">
        <SectionLabel>Real companies</SectionLabel>
        <div className="max-h-[22rem] space-y-2.5 overflow-y-auto pr-1">{real.map(row)}</div>
      </div>

      <div className="mt-4">
        <SectionLabel>Invented ones</SectionLabel>
        <div className="space-y-2.5">{invented.map(row)}</div>
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
                'rounded-full border-2 px-3.5 py-1.5 text-[13px] font-bold transition-colors',
                roleId === r.id
                  ? 'border-ember bg-ember/15 text-ember-hi'
                  : 'border-line text-dim hover:border-ember'
              )}
            >
              {r.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-faint">
          {career.roles.find((r) => r.id === roleId)?.blurb}
        </p>
      </div>

      {selected && !selected.real && (
        <div className="mt-4">
          <SectionLabel>Name it yourself (optional)</SectionLabel>
          <input
            value={customName}
            maxLength={40}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={selected.name}
            className="w-full rounded-xl border-2 border-line bg-surface px-3.5 py-2.5 text-[15px] outline-none focus:border-ember"
          />
          <p className="mt-2 text-[12px] leading-relaxed text-faint">
            The size and culture still come from the choice above. The name is the part that makes it yours.
          </p>
        </div>
      )}

      <div className="well mt-5 p-4">
        {profile ? (
          <CompanyCard profile={profile} roleId={roleId} />
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-faint">
            <Spinner size={14} /> Pulling up the company file…
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-[12.5px] text-ember-hi">{error}</p>}

      <Button className="mt-4 w-full" size="lg" onClick={save} disabled={busy}>
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
      // Straight into the introductions — the team is five strangers until the
      // trainee has named them.
      navigate('/joining')
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
      <PageHead
        eyebrow={career.company ? career.company.name : 'Not set yet'}
        title="Your career"
      >
        {career.company
          ? `Six phases at ${career.company.kind}, each one earned rather than unlocked.`
          : 'Pick where you are aiming, then work through the phases.'}
      </PageHead>

      {/* one action, always */}
      <Card hot className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ember">
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
                : career.phase === 'offer'
                  ? 'See your offer'
                  : career.phase === 'fulltime'
                    ? 'Go to the office'
                    : 'Go to the office'}
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

      {career.companyProfile && (
        <details className="card mb-5 p-0 open:pb-1">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
            <span className="min-w-0">
              <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">
                The company
              </span>
              <span className="block truncate font-display text-[17px] font-semibold">
                {career.companyProfile.full ?? career.companyProfile.name}
              </span>
            </span>
            <span className="shrink-0 text-[12px] font-bold text-ember-hi">
              ~{career.companyProfile.employeesLabel} people · {career.companyProfile.revenue.label}
            </span>
          </summary>
          <div className="px-5 pb-4">
            <CompanyCard profile={career.companyProfile} roleId={career.role?.id} />
          </div>
        </details>
      )}

      <SectionLabel>The journey</SectionLabel>
      <Card className="mb-5 overflow-hidden">
        <JourneyPath
          nodes={career.phases.map((p) => {
            const done = p.reached && !p.current
            const route = PHASE_ROUTE[p.id]
            return {
              id: p.id,
              title: p.name,
              sub: p.current ? p.goal : p.tagline,
              state: done ? 'done' : p.current ? 'current' : 'locked',
              icon: PHASE_ICON[p.id] ?? IconBriefcase,
              tag: p.current ? 'You are here' : undefined,
              onClick: p.current && route ? () => navigate(route) : undefined,
            }
          })}
        />
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
          {career.band && (
            <p className="mt-1.5 text-[13px] text-ember-hi">
              {career.band.name} — {career.band.brief}
            </p>
          )}
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

      {career.challenge && (
        <Card hot className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ember">
            Development challenge
          </p>
          <p className="mt-1.5 font-display text-[15.5px] font-semibold">
            {career.challenge.name} · {career.challenge.value}
            <span className="ml-2 text-[12.5px] font-normal text-faint">
              {career.challenge.tier}
            </span>
          </p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-dim">
            {career.challenge.challenge}
          </p>
          <Button
            as={Link}
            to={`/quest/${career.challenge.trackId}`}
            variant="quiet"
            size="sm"
            className="mt-3.5"
          >
            Take it on <IconArrowRight size={15} />
          </Button>
        </Card>
      )}

      <p className="mt-4 text-center text-[12px] leading-relaxed text-faint">
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
        {career.joinedAt && (
          <Button as={Link} to="/office" variant="quiet" className="col-span-2 w-full">
            <IconBriefcase size={16} /> The office
          </Button>
        )}
        {(career.phase === 'offer' || career.phase === 'fulltime') && (
          <Button as={Link} to="/offer" variant="quiet" className="col-span-2 w-full">
            <IconCheck size={16} /> Your offer
          </Button>
        )}
      </div>
    </Page>
  )
}
