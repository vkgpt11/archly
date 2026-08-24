import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import Dashboard from './components/Dashboard'
import ThemeToggle from './components/ThemeToggle'
import { ApiError, api } from './api'

type Props = { googleEnabled?: boolean }

export default function App({ googleEnabled = true }: Props) {
  const [credential, setCredential] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [authenticating, setAuthenticating] = useState(false)
  const devBypassEnabled = import.meta.env.VITE_DEV_AUTH === 'true'

  const authenticate = async (token: string) => {
    setError('')
    setAuthenticating(true)
    try {
      await api.validateSession(token)
      setCredential(token)
    } catch (failure) {
      setCredential(null)
      setError(failure instanceof ApiError && failure.status === 401
        ? 'Only verified personal @gmail.com accounts are supported. Google Workspace and other email domains cannot sign in.'
        : 'Could not verify your Google account. Please try again.')
    } finally {
      setAuthenticating(false)
    }
  }

  if (credential) {
    return <Dashboard token={credential} onSignOut={() => setCredential(null)} />
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
