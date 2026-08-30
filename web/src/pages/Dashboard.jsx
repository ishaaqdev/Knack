import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { Button, Card, Empty, Page, Pill, SectionLabel, SkillBar } from '../components/primitives'
import { Gauge } from '../components/Ring'
import { Insight } from '../components/Insight'
import { CountUp } from '../components/CountUp'
import { TRACK_ICONS, IconArrowRight, IconBriefcase, IconCheck, IconFlame } from '../components/Icons'
import { relativeDate, useReducedMotion } from '../lib/ui'

/* ------------------------------------------------------- today's status --- */

function TodayCard({ user }) {
  const navigate = useNavigate()
  const evening = new Date().getHours() >= 18
  const done = user.doneToday

  const state = done
    ? {
        tone: 'done',
        title: `Today’s quest is done.`,
        body:
          user.streak > 1
            ? `Day ${user.streak} logged. Come back tomorrow to make it ${user.streak + 1}.`
            : 'Streak started. Tomorrow is what turns it into a habit.',
        cta: 'Do another anyway',
      }
    : user.streak > 0 && evening
      ? {
          tone: 'risk',
          title: `Your ${user.streak}-day streak ends tonight.`,
          body: 'One quest keeps it alive. It takes about two minutes.',
          cta: 'Save the streak',
        }
      : user.streak > 0
        ? {
            tone: 'open',
            title: `Day ${user.streak + 1} is waiting.`,
            body: `Finish one quest to extend your streak${user.nextStreakBonus ? ` and earn a +${user.nextStreakBonus} XP bonus` : ''}.`,
            cta: 'Start today’s quest',
          }
        : {
            tone: 'open',
            title: user.totalQuests ? 'No streak running.' : 'Your first quest takes two minutes.',
            body: user.totalQuests
              ? 'One quest today starts a new one. Streaks are the whole point.'
              : 'Pick a track, read the scenario, write how you would respond. That is it.',
            cta: user.totalQuests ? 'Start a quest' : 'Start my first quest',
          }

  const risk = state.tone === 'risk'
  const done_ = state.tone === 'done'

  return (
    <Card
      className={`relative overflow-hidden ${risk ? 'border-ember/30' : ''}`}
    >
      {risk && (
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--color-ember)' }}
        />
      )}

      <div className="relative flex items-start gap-3.5">
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
            done_
              ? 'border-ember/40 bg-ember/12 text-ember'
              : risk
                ? 'border-ember/40 text-ember'
                : 'border-line text-faint'
          }`}
        >
          {done_ ? <IconCheck size={17} /> : <IconFlame size={17} lit={risk} />}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[17px] font-semibold leading-snug">{state.title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-dim">{state.body}</p>
        </div>
      </div>

      {/* Exactly one action — never leave the user wondering what to click. */}
      <Button
        size="lg"
        variant={done_ ? 'quiet' : 'primary'}
        className="mt-4 w-full"
        onClick={() => navigate('/tracks')}
      >
        {state.cta}
        <IconArrowRight size={17} />
      </Button>
    </Card>
  )
}

/* ------------------------------------------------------------- readiness -- */

function ReadinessCard({ user }) {
  const reduced = useReducedMotion()
  const r = user.readinessScore
  const verdict =
    r >= 75 ? 'Interview-ready' : r >= 50 ? 'Coming together' : r >= 25 ? 'Early days' : 'Just started'

  return (
    <Card className="flex flex-col items-center py-7">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
        Professional Readiness
      </p>

      <Gauge value={r / 100} size={172} stroke={9}>
        <div className="flex flex-col items-center">
          <CountUp to={r} from={0} duration={1.2} className="stat text-[52px] font-bold leading-none" />
          <motion.span
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-1 text-[11px] font-medium tracking-wide text-ember"
          >
            {verdict}
          </motion.span>
        </div>
      </Gauge>

      <p className="-mt-2 max-w-[15rem] text-center text-[12px] leading-relaxed text-faint">
        The average of your three track scores. Breadth counts — an untouched track holds it down.
      </p>
    </Card>
  )
}

/* ------------------------------------------------------------- page ------- */

export function Dashboard() {
  const user = useKnack((s) => s.user)
  if (!user) return null

  const interview = user.interview ?? { totalRuns: 0, cleared: 0, unlocked: 1, maxLevel: 5, readiness: 0 }

  return (
    <Page>
      <div className="mb-5">
        <p className="text-[13px] text-faint">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="mt-0.5 font-display text-[26px] font-bold tracking-tight">
          {user.name === 'Trainee' ? 'Your dashboard' : `Hey, ${user.name.split(' ')[0]}`}
        </h1>
      </div>

      <div className="space-y-4">
        <TodayCard user={user} />
        <Insight insight={user.insight} compact />
        <ReadinessCard user={user} />

        {/* tracks */}
        <section>
          <SectionLabel
            right={
              <Link
                to="/tracks"
                className="text-[12px] font-medium text-dim transition-colors hover:text-ember"
              >
                All tracks
              </Link>
            }
          >
            Skill by track
          </SectionLabel>

          <Card className="space-y-4">
            {user.tracks.map((t, i) => {
              const Icon = TRACK_ICONS[t.id]
              return (
                <Link key={t.id} to={`/quest/${t.id}`} className="group block">
                  <div className="mb-2 flex items-center gap-2.5">
                    <span className="text-faint transition-colors group-hover:text-ember">
                      <Icon size={16} />
                    </span>
                    <span className="flex-1 truncate text-[13.5px] font-medium">{t.name}</span>
                    {t.attempts === 0 && <Pill dot={false}>New</Pill>}
                    <span className="stat text-[13.5px] font-semibold text-dim">{t.score}</span>
                  </div>
                  <SkillBar value={t.score} delay={0.1 + i * 0.08} />
                </Link>
              )
            })}
          </Card>
        </section>

        {/* interview prep — its own progression, so its own entry point */}
        <section>
          <SectionLabel>Interview prep</SectionLabel>
          <Link to="/interview" className="card flex items-center gap-3.5 p-5 hover:border-dim">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ember/40 text-ember">
              <IconBriefcase size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[15px] font-semibold">
                {interview.totalRuns === 0
                  ? 'Sit a mock interview'
                  : `Round ${Math.min(interview.unlocked, interview.maxLevel)} of ${interview.maxLevel}`}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
                {interview.totalRuns === 0
                  ? 'Five rounds, questions written from your resume.'
                  : `${interview.cleared} cleared · readiness ${interview.readiness}`}
              </p>
            </div>
            <IconArrowRight size={17} className="shrink-0 text-faint" />
          </Link>
        </section>

        {/* recent */}
        <section>
          <SectionLabel
            right={
              user.recent.length > 0 && (
                <Link
                  to="/profile"
                  className="text-[12px] font-medium text-dim transition-colors hover:text-ember"
                >
                  Full history
                </Link>
              )
            }
          >
            Recent activity
          </SectionLabel>

          {user.recent.length === 0 ? (
            <Empty
              title="Nothing here yet"
              body="Your first quest takes two minutes. Finish one and it shows up here."
              action={
                <Button as={Link} to="/tracks">
                  Start a quest <IconArrowRight size={16} />
                </Button>
              }
            />
          ) : (
            <Card className="divide-y divide-hair p-0">
              {user.recent.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="stat grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-[13px] font-semibold text-ember">
                    {a.score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{a.trackName}</p>
                    <p className="text-[11px] text-faint">{relativeDate(a.timestamp)}</p>
                  </div>
                  <span className="stat shrink-0 text-[12px] font-semibold text-dim">
                    +{a.xpAwarded}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </Page>
  )
}
