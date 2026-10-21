import { Component } from 'react'

/**
 * The last line of defence. React unmounts the whole tree when a render throws,
 * which leaves nothing but the black page behind it. This catches that and says
 * what went wrong, with a way back, instead of a blank screen.
 */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[knack] render failed', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="grid min-h-dvh place-items-center bg-ink px-6">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-xl font-bold">Something broke on this screen</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-dim">
            Your progress is saved on the server. Reloading usually gets you back.
          </p>
          <p className="mt-3 break-words text-[12px] leading-relaxed text-faint">{String(error.message ?? error)}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" className="btn-candy btn-orange px-5 py-2.5" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button type="button" className="btn-candy btn-dark px-5 py-2.5" onClick={() => window.location.assign('/dashboard')}>
              Home
            </button>
          </div>
        </div>
      </div>
    )
  }
}
