import { Link } from 'react-router-dom'
import { Card, Pill, SectionLabel, SkillBar } from './primitives'
import { IconArrowRight } from './Icons'

/**
 * What Knack has learned about you, from the numbers it keeps.
 *
 * This is the structured half of the personalisation (the other half is the
 * paragraph in Insight). Every figure here is a rolling mean of your last few
 * answers on one thing, stored in the database and rewritten after each mock,
 * discussion and interview round. It is shown in full because a profile you
 * cannot see is a black box, and because a number you can see is one you can
 * argue with by practising.
 */

const tone = (v) => (v >= 70 ? 'high' : v >= 50 ? 'ember' : 'low')

export function NextStep({ next, className }) {
  if (!next) return null
  return (
    <Card className={className} hot>
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ember">Knack suggests</p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-text">{next.text}</p>
      <Link
        to={next.to}
        className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-extrabold text-ember-hi hover:text-text"
      >
        Go <IconArrowRight size={15} />
      </Link>
    </Card>
  )
}

export function TrainingProfile({ training }) {
  if (!training) return null
  const { mock, gd, next } = training
  const hasAny = mock.topics.length > 0 || gd.dimensions.length > 0

  return (
    <div className="space-y-3.5">
      <SectionLabel>What Knack has learned about you</SectionLabel>

      {!hasAny ? (
        <Card>
          <p className="text-[13.5px] leading-relaxed text-dim">
            Nothing yet. Do a mock interview or a group discussion and this fills in: which kinds of questions you
            handle well, which ones cost you marks, and how you behave in a room. It is kept in the database on this
            machine and it shapes the next questions you are given.
          </p>
        </Card>
      ) : (
        <>
          {mock.topics.length > 0 && (
            <Card className="space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">
                  Interview topics
                </p>
                <span className="text-[11.5px] text-faint">{mock.answered} mock answers</span>
              </div>
              {mock.topics.slice(0, 8).map((t) => (
                <div key={t.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] font-bold capitalize text-dim">{t.label}</span>
                    <span className="flex items-center gap-2">
                      {t.trend !== 0 && (
                        <span className={t.trend > 0 ? 'text-[11px] font-bold text-ember-hi' : 'text-[11px] font-bold text-faint'}>
                          {t.trend > 0 ? '+' : ''}
                          {t.trend}
                        </span>
                      )}
                      <span className="stat text-[13px] font-bold">{t.value}</span>
                    </span>
                  </div>
                  <SkillBar value={t.value} tone={tone(t.value)} height={8} />
                </div>
              ))}
              {mock.weak.length > 0 && (
                <p className="pt-1 text-[12.5px] leading-relaxed text-faint">
                  The next mock leans on{' '}
                  <span className="font-bold text-ember-hi">{mock.weak.map((w) => w.label).join(', ')}</span> until
                  those come up.
                </p>
              )}
            </Card>
          )}

          {gd.dimensions.length > 0 && (
            <Card>
              <p className="mb-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-faint">
                In a group discussion
              </p>
              <div className="flex flex-wrap gap-2">
                {gd.dimensions.map((d) => (
                  <Pill key={d.key} active={d.value >= 60} dot={false}>
                    <span className="capitalize">{d.label}</span> {d.value}
                  </Pill>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <NextStep next={next} />
    </div>
  )
}
