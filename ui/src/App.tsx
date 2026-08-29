import { lazy, Suspense, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import ThemeToggle from './components/ThemeToggle'
import { ApiError, api, type AuthSession } from './api'

const Dashboard = lazy(() => import('./components/Dashboard'))
const SharedProjectView = lazy(() => import('./components/SharedProjectView'))
const loading = <main className="shared-error"><p>Loading Archly…</p></main>

type Props = { googleEnabled?: boolean }

export default function App({ googleEnabled = true }: Props) {
  const shareToken = window.location.pathname.match(/^\/share\/([^/]+)$/)?.[1]
  const [credential, setCredential] = useState<string | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [error, setError] = useState('')
  const [authenticating, setAuthenticating] = useState(false)
  const devBypassEnabled = import.meta.env.VITE_DEV_AUTH === 'true'

  const authenticate = async (token: string) => {
    setError('')
    setAuthenticating(true)
    try {
      const verifiedSession = await api.validateSession(token)
      setSession(verifiedSession)
      setCredential(token)
    } catch (failure) {
      setCredential(null)
      setSession(null)
      setError(token === 'archly-local-dev'
        ? 'Local developer sign-in failed. Start the API with ARCHLY_AUTH_DEV_BYPASS=true and try again.'
        : failure instanceof ApiError && failure.status === 401
          ? 'Only verified personal @gmail.com accounts are supported. Google Workspace and other email domains cannot sign in.'
          : 'Could not verify your Google account. Please try again.')
    } finally {
      setAuthenticating(false)
    }
  }

  if (shareToken) return <Suspense fallback={loading}><SharedProjectView shareToken={decodeURIComponent(shareToken)} /></Suspense>

  if (credential && session) {
    return <Suspense fallback={loading}><Dashboard token={credential} isAdmin={session.isAdmin} onSignOut={() => { setCredential(null); setSession(null) }} /></Suspense>
  }

  return (
    <main className="sign-in-shell">
      <div className="sign-in-theme"><ThemeToggle /></div>
      <section className="sign-in-card">
        <div className="brand-mark" aria-hidden="true">A</div>
        <p className="eyebrow">Technical design, in one place</p>
        <h1>Build systems people understand.</h1>
        <p className="lede">Create architecture diagrams and the documents that explain them.</p>
        {googleEnabled && (
          <div className="google-button">
            <GoogleLogin
              onSuccess={(response) => response.credential && void authenticate(response.credential)}
              onError={() => setError('Google sign-in failed. Please try again.')}
              useOneTap={false}
            />
          </div>
        )}
        {devBypassEnabled && (
          <button className="dev-bypass-button" disabled={authenticating}
            onClick={() => void authenticate('archly-local-dev')}>
            {authenticating ? 'Verifying account…' : 'Continue as local developer'}
          </button>
        )}
        {authenticating && !devBypassEnabled && <p className="fine-print" role="status">Verifying your Google account…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <p className="fine-print">Archly V1 accepts personal @gmail.com accounts only.</p>
      </section>
    </main>
  )
}
