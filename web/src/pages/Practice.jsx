import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { Card, Page, PageHead, Pill, SectionLabel, Spinner } from '../components/primitives'
import { Avatar } from '../components/Avatar'
import { IconArrowRight, IconBriefcase, IconSpeech } from '../components/Icons'
import { relativeDate } from '../lib/ui'

/**
 * The practice room.
 *
 * Everything here is the real thing with the stakes removed: same panel, same
 * interviewer, same debrief, but no XP, no attribute movement, no phase gate.
 *
 * That is the whole point rather than a convenience. A trainee who knows their
 * Leadership score is watching will play the safe line, and playing the safe
 * line is precisely the habit this is meant to break. You cannot practise
 * disagreeing with the room while something is at stake.
 */

function Mode({ to, icon: Icon, title, blurb, meta, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link to={to} className="card card-tap group flex items-start gap-4 p-5">
        <span className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-tile border border-line bg-raised text-dim transition-colors group-hover:border-ember/40 group-hover:text-ember">
          <Icon size={19} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[16px] font-semibold">{title}</span>
          <span className="mt-1 block text-[13px] leading-relaxed text-dim">{blurb}</span>
          {meta && <span className="mt-2 block text-[12px] text-faint">{meta}</span>}
        </span>
        <IconArrowRight
          size={17}
          className="mt-3 shrink-0 text-faint transition-colors group-hover:text-ember"
        />
      </Link>
    </motion.div>
  )
}

export function Practice() {
  const navigate = useNavigate()
  const [gd, setGd] = useState(null)
  const [iv, setIv] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [g, i] = await Promise.allSettled([api.gd(), api.interview()])
    if (g.status === 'fulfilled') setGd(g.value)
    if (i.status === 'fulfilled') setIv(i.value)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <Page>
        <div className="flex items-center gap-2 text-[13px] text-faint">
          <Spinner size={15} /> Opening the practice room…
        </div>
      </Page>
    )
  }

  const history = [
    ...(gd?.history ?? []).map((h) => ({ ...h, kind: 'Discussion', label: h.topic })),
    ...(iv?.history ?? []).map((h) => ({ ...h, kind: `Round ${h.level}`, label: h.verdict })),
  ]
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, 6)

  return (
    <Page className="pb-12">
      <PageHead eyebrow="No score, no pressure" title="Practice">
        The same panel and the same interviewer as the real thing, with nothing
        riding on it. You get the full debrief — no XP, no attribute changes, no rounds unlocked.
      </PageHead>

      <div className="space-y-3">
        <Mode
          index={0}
          to="/gd?practice=1"
          icon={IconSpeech}
          title="Mock group discussion"
          blurb="Five candidates around a table, ten minutes, a moderator and a panel watching. Speak to people by name, or decide not to speak at all."
          meta={
            gd
              ? `${gd.totalBeats} exchanges · 25 topics in rotation${gd.best !== null ? ` · your best so far ${gd.best}/10` : ''}`
              : null
          }
        />

        <Mode
          index={1}
          to="/interview?practice=1"
          icon={IconBriefcase}
          title="Mock interview"
          blurb="Any of the five rounds, on demand. Questions come from your resume where you have one — and here you can sit round four before you have earned it."
          meta={iv ? `${iv.maxLevel} rounds · ${iv.questionsPerRound} questions each · ${iv.role}` : null}
        />
      </div>

      {gd?.panel?.length > 0 && (
        <div className="mt-7">
          <SectionLabel>Who is in the discussion room</SectionLabel>
          <Card className="divide-y divide-hair p-0">
            {gd.panel.map((p, i) => (
              <div key={p.name} className="flex items-start gap-3 px-4 py-3">
                <Avatar name={p.name} value={null} size={32} stroke={0} delay={i * 0.04} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium">
                    {p.name} <span className="text-faint">· {p.trait}</span>
                  </p>
                  {p.how && (
                    <p className="mt-0.5 text-[12px] leading-relaxed text-dim">{p.how}</p>
                  )}
                </div>
              </div>
            ))}
          </Card>
          <p className="mt-3 text-center text-[12px] leading-relaxed text-faint">
            They talk to each other, they interrupt, and they will answer you by name if you
            address one of them.
          </p>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-7">
          <SectionLabel>Recent runs</SectionLabel>
          <Card className="divide-y divide-hair p-0">
            {history.map((h) => (
              <div key={`${h.kind}-${h.id}`} className="flex items-center gap-3 px-4 py-3">
                <span className="shrink-0">
                  <Pill dot={false}>{h.kind}</Pill>
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-dim">{h.label}</span>
                <span className="shrink-0 text-[11px] text-faint">{relativeDate(h.timestamp)}</span>
                <span className="stat w-9 shrink-0 text-right text-[12.5px] text-text">
                  {h.score}/10
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}

      <Card className="mt-7">
        <p className="text-[13px] leading-relaxed text-dim">
          Want it to count? The same discussion and the same rounds sit inside{' '}
          <Link to="/career" className="text-ember-hi underline-offset-2 hover:underline">
            your career
          </Link>
          , where clearing them moves you to the next phase.
        </p>
      </Card>
    </Page>
  )
}
