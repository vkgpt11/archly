import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import Dashboard from './components/Dashboard'
import ThemeToggle from './components/ThemeToggle'

export default function App() {
  const [credential, setCredential] = useState<string | null>(null)
  const [error, setError] = useState('')
  const devBypassEnabled = import.meta.env.VITE_DEV_AUTH === 'true'

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
        <div className="google-button">
          <GoogleLogin
            onSuccess={(response) => response.credential && setCredential(response.credential)}
            onError={() => setError('Google sign-in failed. Please try again.')}
            useOneTap={false}
          />
        </div>
        {devBypassEnabled && (
          <button className="dev-bypass-button" onClick={() => setCredential('archly-local-dev')}>
            Continue as local developer
          </button>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <p className="fine-print">Archly V1 accepts personal @gmail.com accounts only.</p>
      </section>
    </main>
  )
}
