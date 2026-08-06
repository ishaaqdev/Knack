import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useKnack } from '../store/useKnack'
import { Button, Spinner } from '../components/primitives'
import { Ring } from '../components/Ring'
import { IconArrowRight } from '../components/Icons'
import { cx, useReducedMotion } from '../lib/ui'

function Field({ label, hint, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12.5px] font-medium text-dim">{label}</span>
        {hint && <span className="text-[11px] text-faint">{hint}</span>}
      </span>
      <input
        {...props}
        className={cx(
          'w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-text',
          'outline-none transition-colors placeholder:text-faint focus:border-ember'
        )}
      />
    </label>
  )
}

/** Shared shell for both signup and login — same layout, different copy. */
function AuthShell({ mode }) {
  const isSignup = mode === 'signup'
  const signup = useKnack((s) => s.signup)
  const login = useKnack((s) => s.login)
  const user = useKnack((s) => s.user)
  const navigate = useNavigate()
  const location = useLocation()
  const reduced = useReducedMotion()

  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (user) return <Navigate to={user.onboarded ? '/dashboard' : '/onboarding'} replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const next = isSignup ? await signup(form) : await login(form)
      navigate(next?.onboarded ? '/dashboard' : '/onboarding', { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const fade = (delay) => ({
    initial: reduced ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  })

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[380px] w-[480px] -translate-x-1/2 rounded-full opacity-[0.12] blur-[110px]"
        style={{ background: 'var(--color-ember)' }}
      />

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
        <motion.div {...fade(0)}>
          <Link to="/" className="mb-8 flex w-fit items-center gap-2.5">
            <Ring value={1} size={24} stroke={3} duration={1} />
            <span className="font-display text-[16px] font-bold tracking-tight">Knack</span>
          </Link>
        </motion.div>

        <motion.h1 {...fade(0.06)} className="font-display text-[30px] font-bold leading-tight tracking-tight">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </motion.h1>
        <motion.p {...fade(0.1)} className="mt-2 text-[14px] leading-relaxed text-dim">
          {isSignup
            ? 'Two minutes of setup, then scenarios written for where you actually are.'
            : 'Pick up where you left off.'}
        </motion.p>

        <motion.form {...fade(0.16)} onSubmit={submit} className="mt-7 space-y-3.5">
          {isSignup && (
            <Field
              label="Your name"
              name="name"
              autoComplete="name"
              placeholder="Ishaaq"
              value={form.name}
              onChange={set('name')}
              maxLength={40}
            />
          )}

          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={set('email')}
          />

          <Field
            label="Password"
            hint={isSignup ? 'min 8 characters' : undefined}
            name="password"
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            required
            placeholder="••••••••"
            value={form.password}
            onChange={set('password')}
          />

          {error && (
            <p className="text-[12.5px] leading-relaxed text-ember-hi" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? (
              <Spinner size={16} />
            ) : (
              <>
                {isSignup ? 'Create account' : 'Log in'} <IconArrowRight size={17} />
              </>
            )}
          </Button>
        </motion.form>

        <motion.p {...fade(0.24)} className="mt-6 text-center text-[13px] text-dim">
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <Link
            to={isSignup ? '/login' : '/signup'}
            className="font-medium text-ember underline-offset-4 hover:underline"
          >
            {isSignup ? 'Log in' : 'Create one'}
          </Link>
        </motion.p>

        <motion.p {...fade(0.3)} className="mt-8 text-center text-[11px] leading-relaxed text-faint">
          Passwords are hashed with scrypt. Your progress stays on this machine —
          nothing is shared with anyone.
        </motion.p>
      </div>
    </main>
  )
}

export const Signup = () => <AuthShell mode="signup" />
export const Login = () => <AuthShell mode="login" />
