import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { Button } from '../components/primitives'
import { Ring } from '../components/Ring'
import { IconArrowRight, IconFlame, IconCheck } from '../components/Icons'
import { useReducedMotion } from '../lib/ui'

const POINTS = [
  'Tell us where you are — year, target role, what you find hard',
  'Get scenarios written for that, not generic textbook cases',
  'Scored 1–10 with feedback that remembers your last attempt',
]

export function Home() {
  const user = useKnack((s) => s.user)
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const signedIn = !!user?.onboarded
  const returning = signedIn && (user?.totalQuests ?? 0) > 0
  const streak = user?.streak ?? 0

  // A live streak is the thing worth protecting, so it becomes the headline.
  const headline = !signedIn
    ? 'Soft skills, five minutes a day.'
    : !returning
      ? `You're set up, ${user.name.split(' ')[0]}.`
      : user.doneToday
        ? 'Today is done. Want another?'
        : streak > 0
          ? `Keep your streak alive — Day ${streak + 1}`
          : 'Pick it back up today.'

  const sub = !signedIn
    ? 'Knack gives engineering students the part of the job no course teaches: saying the hard thing, thinking under ambiguity, and using AI without trusting it blindly. Every scenario is written for your year, your target role, and the things you said you find hard.'
    : !returning
      ? 'Your first scenario is waiting, written for the profile you just filled in.'
      : user.doneToday
        ? `You are on a ${streak}-day run and ${user.level.xpToNext ? `${user.level.xpToNext} XP from ${user.level.nextName}` : 'at the top level'}. Extra quests still earn full XP.`
        : streak > 0
          ? 'One quest keeps it going. It takes about two minutes.'
          : 'One quest today starts a new streak.'

  const fade = (delay) => ({
    initial: reduced ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  })

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[520px] -translate-x-1/2 rounded-full opacity-[0.13] blur-[110px]"
        style={{ background: 'var(--color-ember)' }}
      />

      <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-10 pt-7 sm:px-6 sm:pt-12">
        <motion.div {...fade(0)} className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Ring value={1} size={26} stroke={3} duration={1.1} />
            <span className="font-display text-[17px] font-bold tracking-tight">Knack</span>
          </div>
          {!signedIn && (
            <Link
              to="/login"
              className="text-[13px] font-medium text-dim transition-colors hover:text-text"
            >
              Log in
            </Link>
          )}
        </motion.div>

        <div className="flex flex-1 flex-col justify-center py-10 sm:py-14">
          {returning && streak > 0 && (
            <motion.div
              {...fade(0.05)}
              className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-ember/30 bg-ember/10 px-3 py-1.5 text-[12px] font-medium text-ember-hi"
            >
              <IconFlame size={14} lit />
              {streak} day{streak === 1 ? '' : 's'} in a row
            </motion.div>
          )}

          <motion.h1
            {...fade(0.1)}
            className="font-display text-[34px] font-bold leading-[1.08] tracking-tight sm:text-[46px]"
          >
            {headline}
          </motion.h1>

          <motion.p {...fade(0.16)} className="mt-4 max-w-lg text-[15px] leading-relaxed text-dim">
            {sub}
          </motion.p>

          {!signedIn && (
            <motion.ul {...fade(0.22)} className="mt-7 space-y-2.5">
              {POINTS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-[14px] text-dim">
                  <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-ember/40 text-ember">
                    <IconCheck size={11} />
                  </span>
                  {p}
                </li>
              ))}
            </motion.ul>
          )}

          {returning && (
            <motion.div {...fade(0.22)} className="mt-7 flex items-center gap-6">
              {[
                { label: 'Total XP', value: user.xp },
                { label: 'Quests', value: user.totalQuests },
                { label: 'Readiness', value: user.readinessScore },
              ].map((s) => (
                <div key={s.label}>
                  <p className="stat text-2xl font-bold leading-none">{s.value}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-faint">{s.label}</p>
                </div>
              ))}
            </motion.div>
          )}

          <motion.div {...fade(0.3)} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => navigate(signedIn ? '/tracks' : '/signup')}
            >
              {signedIn ? (returning ? 'Start a quest' : 'Start my first quest') : 'Get started'}
              <IconArrowRight size={17} />
            </Button>

            {signedIn ? (
              <Link
                to="/dashboard"
                className="text-center text-[13px] font-medium text-dim underline-offset-4 transition-colors hover:text-text hover:underline sm:text-left"
              >
                Go to dashboard
              </Link>
            ) : (
              <p className="text-center text-[12.5px] text-faint sm:text-left">
                Free. Takes two minutes to set up.
              </p>
            )}
          </motion.div>
        </div>

        <motion.p {...fade(0.4)} className="text-[11px] leading-relaxed text-faint">
          Scenarios and scoring by Gemma&nbsp;4 via OpenRouter. Your data stays on this machine.
        </motion.p>
      </div>
    </main>
  )
}
