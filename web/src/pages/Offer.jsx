import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { api } from '../lib/api'
import {
  Button,
  Card,
  Page,
  PageHead,
  Pill,
  SectionLabel,
  SkillBar,
  Spinner,
} from '../components/primitives'
import { AttributeDeltas } from '../components/Attributes'
import { IconArrowRight, IconBriefcase, IconCheck } from '../components/Icons'
import { cx, useReducedMotion } from '../lib/ui'

/**
 * The offer, and the argument about it.
 *
 * Two negotiation attempts, and only one of the four outcomes is "you got more
 * money" — a partial win moves the parts of a package a company can actually
 * move, and a badly made ask costs standing. Otherwise negotiating would be
 * free, and the one thing every graduate needs to learn about it is that it is
 * not.
 */

const lpa = (n) => `${Number(n).toFixed(1)} LPA`

/* --------------------------------------------------------------- review -- */

function Review({ offer, review }) {
  const entries = Object.entries(offer.review.scores)

  return (
    <Card className="mb-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
        End of internship review
      </p>
      <p className="mt-1.5 font-display text-[16px] font-semibold leading-snug">
        {offer.review.summary}
      </p>

      <div className="mt-4 space-y-3">
        {entries.map(([label, value], i) => (
          <div key={label}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[13px] text-dim">{label}</span>
              <span className="stat text-[13px] font-semibold">{value}</span>
            </div>
            <SkillBar value={value} delay={0.1 + i * 0.07} />
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-hair pt-3.5 text-[13.5px] leading-relaxed text-dim">
        {offer.review.feedback}
      </p>

      {review?.advocates?.length > 0 && (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-faint">
          {review.advocates.join(' and ')} would speak up for you. That is part of why this number
          is what it is.
        </p>
      )}
    </Card>
  )
}

/* ---------------------------------------------------------------- offer -- */

function Terms({ offer }) {
  const reduced = useReducedMotion()

  return (
    <Card hot className="mb-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-ember">
          <IconBriefcase size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[16px] font-semibold">{offer.title}</p>
          <p className="mt-0.5 text-[12.5px] text-faint">{offer.company}</p>
        </div>
      </div>

      <motion.div
        key={offer.total}
        initial={reduced ? false : { scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="my-5 text-center"
      >
        <p className="stat text-[42px] font-bold leading-none text-ember">{offer.total.toFixed(1)}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-faint">Total CTC, LPA</p>
      </motion.div>

      <dl className="space-y-2 text-[13.5px]">
        {[
          ['Fixed', lpa(offer.fixed)],
          ['Variable', lpa(offer.variable)],
          ...(offer.joiningBonus ? [['Joining bonus', lpa(offer.joiningBonus)]] : []),
          ['Location', offer.location],
          ['Working model', offer.workingModel],
          ['Joining date', offer.joiningDate],
          ['Probation', offer.probation],
        ].map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4">
            <dt className="text-faint">{k}</dt>
            <dd className="text-right text-dim">{v}</dd>
          </div>
        ))}
      </dl>

      {offer.benefits.length > 0 && (
        <div className="mt-4 border-t border-hair pt-3.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            Benefits
          </p>
          <ul className="space-y-1.5">
            {offer.benefits.map((b) => (
              <li key={b} className="flex gap-2 text-[13px] leading-relaxed text-dim">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ember" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

/* ---------------------------------------------------------- negotiation -- */

const RESULT_LABEL = {
  success: 'They moved',
  partial: 'They moved something else',
  none: 'No movement',
  backfire: 'That did not land',
}

function Round({ round, index }) {
  const reduced = useReducedMotion()
  const good = round.result === 'success'
  const bad = round.result === 'backfire'

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : index * 0.06, duration: 0.35 }}
    >
      <Card className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
          You said
        </p>
        <p className="mt-1.5 border-l-2 border-line pl-3 text-[13px] italic leading-relaxed text-faint">
          {round.message}
        </p>

        <div className="mt-3.5 flex items-center gap-2">
          <Pill active={good}>{RESULT_LABEL[round.result]}</Pill>
          {round.moved?.fixed > 0 && <Pill dot={false}>Fixed +{round.moved.fixed.toFixed(1)}</Pill>}
          {round.moved?.joiningBonus > 0 && (
            <Pill dot={false}>Bonus +{round.moved.joiningBonus.toFixed(1)}</Pill>
          )}
        </div>

        <p
          className={cx(
            'mt-3 text-[13.5px] leading-relaxed',
            bad ? 'text-ember-hi' : 'text-dim'
          )}
        >
          {round.reaction}
        </p>
      </Card>
    </motion.div>
  )
}

function Negotiate({ offer, maxRounds, onSent, busy, error, last }) {
  const [text, setText] = useState('')
  const taRef = useRef(null)

  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`
  }, [text])

  const left = maxRounds - offer.rounds.length
  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  if (left <= 0) return null

  return (
    <>
      <SectionLabel right={<span className="text-[12px] text-faint">{left} left</span>}>
        {offer.rounds.length ? 'Push again' : 'Negotiate'}
      </SectionLabel>

      <Card>
        <p className="text-[13px] leading-relaxed text-dim">
          Write what you would actually send. There is no one correct sentence — you are judged on
          how you ask, not whether you ask.
        </p>

        <div className="card mt-3.5 overflow-hidden p-0 focus-within:border-line">
          <textarea
            ref={taRef}
            rows={5}
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
            placeholder="Hi Hema — thanks for the offer…"
            className="w-full resize-none bg-transparent px-4 py-3.5 text-[14.5px] leading-relaxed outline-none placeholder:text-faint disabled:opacity-60"
          />
          <div className="flex items-center justify-between border-t border-hair px-4 py-2">
            <span className="stat text-[11px] text-faint">{words} words</span>
          </div>
        </div>

        {error && <p className="mt-3 text-[12.5px] text-ember-hi">{error}</p>}

        <Button
          className="mt-3.5 w-full"
          disabled={busy || text.trim().length < 20}
          onClick={() => {
            onSent(text)
            setText('')
          }}
        >
          {busy ? (
            <>
              <Spinner size={15} /> Waiting on their reply…
            </>
          ) : (
            'Send it'
          )}
        </Button>
      </Card>

      {last?.coaching && (
        <Card className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            What would have landed better
          </p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ember-hi">{last.coaching}</p>
        </Card>
      )}
    </>
  )
}

/* ------------------------------------------------------------- full-time -- */

function FullTime({ data, onPromote, busy, error }) {
  const p = data.promotion

  return (
    <>
      <PageHead eyebrow={`${Number(data.ctc).toFixed(1)} LPA`} title={data.jobTitle} />

      <Card className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
          Next grade
        </p>
        <p className="mt-1.5 font-display text-[17px] font-semibold">{p.next ?? 'Top of the ladder'}</p>

        {p.next && (
          <div className="mt-4 space-y-3">
            {p.requirements.map((r) => (
              <div key={r.label}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[13px] text-dim">{r.label}</span>
                  <span className={cx('stat text-[13px]', r.have >= r.need ? 'text-ember' : 'text-faint')}>
                    {r.have} / {r.need}
                  </span>
                </div>
                <SkillBar value={Math.min(100, (r.have / r.need) * 100)} />
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-[12.5px] text-ember-hi">{error}</p>}

        {p.ready ? (
          <Button className="mt-4 w-full" onClick={onPromote} disabled={busy}>
            {busy ? <Spinner size={15} /> : <IconCheck size={16} />} Take the promotion
          </Button>
        ) : (
          <p className="mt-4 text-[12.5px] leading-relaxed text-faint">
            Levels alone will not do it. Leadership is the gate, and it moves on how you handle
            people, not on how many levels you finish.
          </p>
        )}
      </Card>

      <Button as={Link} to="/tracks" size="lg" className="w-full">
        Keep working <IconArrowRight size={17} />
      </Button>
    </>
  )
}

/* ------------------------------------------------------------------ page -- */

export function Offer() {
  const navigate = useNavigate()
  const reload = useKnack((s) => s.load)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [last, setLast] = useState(null)
  const [accepted, setAccepted] = useState(null)

  const load = useCallback(async () => {
    try {
      setData(await api.offer())
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function negotiate(message) {
    setBusy(true)
    setError(null)
    try {
      const r = await api.negotiate(message)
      setLast(r)
      setData((d) => ({ ...d, offer: r.offer, roundsUsed: r.roundsUsed }))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function decide(accept) {
    setBusy(true)
    setError(null)
    try {
      const r = await api.decideOffer(accept)
      await reload()
      if (accept) setAccepted(r)
      else navigate('/career')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function promoteMe() {
    setBusy(true)
    setError(null)
    try {
      await api.promote()
      await load()
      await reload()
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
          <Spinner size={15} /> Loading…
        </div>
      </Page>
    )
  }

  if (!data) {
    return (
      <Page>
        <PageHead eyebrow="Not yet" title="Your offer" />
        <Card className="text-center">
          <p className="font-display text-[16px] font-semibold">Nothing on the table</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-dim">
            {error ?? 'Finish the internship first.'}
          </p>
          <Button as={Link} to="/career" variant="quiet" className="mt-4">
            Back to your career
          </Button>
        </Card>
      </Page>
    )
  }

  if (accepted) {
    return (
      <Page className="pb-12">
        <div className="mb-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
            Signed
          </p>
          <p className="stat mt-2 text-[42px] font-bold leading-none text-ember">
            {accepted.ctc.toFixed(1)}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-faint">LPA</p>
          <p className="mt-4 font-display text-[18px] font-semibold">{accepted.grade}</p>
          <p className="mt-1 text-[13.5px] text-dim">{accepted.offer.company}</p>
        </div>

        <Card className="mb-5">
          <p className="text-[13.5px] leading-relaxed text-dim">
            You are a full-time employee. The work continues — levels now count towards your next
            grade, and the gate for that is Leadership, not attendance.
          </p>
        </Card>

        <Button size="lg" className="w-full" onClick={() => setAccepted(null)}>
          See your job <IconArrowRight size={17} />
        </Button>
      </Page>
    )
  }

  if (data.phase === 'fulltime') {
    return (
      <Page className="pb-12">
        <FullTime data={data} onPromote={promoteMe} busy={busy} error={error} />
      </Page>
    )
  }

  const offer = data.offer
  const roundsLeft = data.maxRounds - offer.rounds.length

  return (
    <Page className="pb-12">
      <PageHead eyebrow={offer.company} title="Your offer">
        The internship is over. Here is the review, and here is the number.
      </PageHead>

      <Review offer={offer} review={data.review} />
      <Terms offer={offer} />

      {offer.rounds.length > 0 && (
        <>
          <SectionLabel>The conversation</SectionLabel>
          {offer.rounds.map((r, i) => (
            <Round key={i} round={r} index={i} />
          ))}
        </>
      )}

      <AnimatePresence>{last && <AttributeDeltas moved={last.attributes} />}</AnimatePresence>

      {last?.badges?.length > 0 && (
        <Card className="mt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            Badge unlocked
          </p>
          {last.badges.map((b) => (
            <p key={b.slug} className="text-[13.5px] leading-relaxed">
              <span className="font-medium text-ember-hi">{b.name}</span>
              <span className="text-dim"> — {b.why}</span>
            </p>
          ))}
        </Card>
      )}

      <div className="mt-5">
        <Negotiate
          offer={offer}
          maxRounds={data.maxRounds}
          onSent={negotiate}
          busy={busy}
          error={error}
          last={last}
        />
      </div>

      <div className="mt-6 space-y-3">
        <Button size="lg" className="w-full" onClick={() => decide(true)} disabled={busy}>
          Accept {lpa(offer.total)} <IconCheck size={17} />
        </Button>
        <Button variant="ghost" size="lg" className="w-full" onClick={() => decide(false)} disabled={busy}>
          Decline the offer
        </Button>
        {roundsLeft > 0 && (
          <p className="text-center text-[12px] leading-relaxed text-faint">
            You can push {roundsLeft === 1 ? 'once more' : `${roundsLeft} more times`} before you
            decide. Nothing is taken away for trying — but how you ask is scored.
          </p>
        )}
      </div>
    </Page>
  )
}
