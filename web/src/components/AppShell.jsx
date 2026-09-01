import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { IconHome, IconQuest, IconSpeech, IconBriefcase, IconUser } from './Icons'
import { cx } from '../lib/ui'

const NAV = [
  { to: '/dashboard', label: 'Home', Icon: IconHome },
  { to: '/tracks', label: 'Quest', Icon: IconQuest },
  { to: '/practice', label: 'Practice', Icon: IconSpeech },
  { to: '/career', label: 'Career', Icon: IconBriefcase },
  { to: '/profile', label: 'Profile', Icon: IconUser },
]

/** Mobile only — no sidebar anywhere, per the design constraints. */
function BottomNav() {
  return (
    <nav className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-hair bg-ink/92 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-2xl">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cx(
                'relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[9.5px] font-medium transition-colors',
                isActive ? 'text-ember' : 'text-faint hover:text-dim'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-ember shadow-[0_0_10px_var(--color-ember)]" />
                )}
                <Icon size={21} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

/** Top-only navigation on desktop. */
function DeskNav() {
  return (
    <div className="hidden border-b border-hair bg-ink md:block">
      <div className="mx-auto flex max-w-2xl gap-1 px-6">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'border-ember text-text'
                  : 'border-transparent text-faint hover:text-dim'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export function AppShell() {
  const { pathname } = useLocation()
  // The quest and feedback flows are focus modes — nav would invite bailing out.
  // A discussion and an interview are performances — nav would invite bailing.
  const focusMode =
    pathname.startsWith('/quest') || pathname.startsWith('/feedback') || pathname.startsWith('/gd')

  return (
    <div className="min-h-dvh bg-ink">
      <Header />
      {!focusMode && <DeskNav />}
      {/* Keyed so each route remounts and replays its own entry animation. */}
      <Outlet key={pathname} />
      {!focusMode && <BottomNav />}
    </div>
  )
}
