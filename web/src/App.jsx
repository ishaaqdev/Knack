import { useEffect } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useKnack } from './store/useKnack'
import { AppShell } from './components/AppShell'
import { Button, Spinner } from './components/primitives'
import { Home } from './pages/Home'
import { Login, Signup } from './pages/Auth'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { TrackSelect } from './pages/TrackSelect'
import { QuestSession } from './pages/QuestSession'
import { Feedback } from './pages/Feedback'
import { Profile } from './pages/Profile'

function Boot({ children }) {
  const { loading, error, load } = useKnack()

  useEffect(() => {
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink text-faint">
        <Spinner size={22} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink px-6">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-xl font-bold">Can’t reach the Knack server</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-dim">{error}</p>
          <p className="mt-3 text-[12.5px] leading-relaxed text-faint">
            Start it with <span className="text-dim">npm run dev</span> from the project root — the
            API should be listening on port 5174.
          </p>
          <Button className="mt-5" onClick={load}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return children
}

/** Signed in and onboarded, or you get bounced to the right place. */
function Protected() {
  const user = useKnack((s) => s.user)
  const location = useLocation()

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!user.onboarded) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Boot>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />

          <Route element={<Protected />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tracks" element={<TrackSelect />} />
              <Route path="/quest/:trackId" element={<QuestSession />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Boot>
    </BrowserRouter>
  )
}
