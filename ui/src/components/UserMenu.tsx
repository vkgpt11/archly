import { useEffect, useRef, useState } from 'react'
import { ApiError, api, type AuthSession, type LlmSettings } from '../api'
import ThemeToggle from './ThemeToggle'
import { ArrowLeft, LayoutDashboard, LogOut, Settings } from 'lucide-react'

type Props = {
  token: string
  user: AuthSession
  adminMode?: boolean
  onSwitchMode?: () => void
  onSignOut: () => void
}

export default function UserMenu({ token, user, adminMode = false, onSwitchMode, onSignOut }: Props) {
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [llm, setLlm] = useState<LlmSettings | null>(null)
  const [model, setModel] = useState('gpt-4.1-mini')
  const [apiKey, setApiKey] = useState('')
  const [llmBusy, setLlmBusy] = useState(false)
  const [llmMessage, setLlmMessage] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const displayName = user.name?.trim() || user.email.split('@')[0]
  const initials = displayName.split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'U'

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    if (!settingsOpen || llm) return
    setLlmBusy(true)
    api.getLlmSettings(token).then((value) => { setLlm(value); setModel(value.model) })
      .catch((error: Error) => setLlmMessage(error.message)).finally(() => setLlmBusy(false))
  }, [llm, settingsOpen, token])

  async function saveLlm() {
    setLlmBusy(true); setLlmMessage('')
    try {
      const value = await api.saveLlmSettings(token, 'OPENAI', model.trim(), apiKey.trim() || undefined)
      setLlm(value); setApiKey(''); setLlmMessage('AI provider saved.')
    } catch (error) { setLlmMessage(error instanceof ApiError ? error.message : 'Could not save AI provider.') }
    finally { setLlmBusy(false) }
  }

  async function removeLlm() {
    setLlmBusy(true); setLlmMessage('')
    try { await api.deleteLlmSettings(token); setLlm({ provider: 'OPENAI', model: 'gpt-4.1-mini', hasApiKey: false, credentialStorageAvailable: llm?.credentialStorageAvailable ?? false }); setModel('gpt-4.1-mini'); setApiKey(''); setLlmMessage('AI provider removed.') }
    catch (error) { setLlmMessage((error as Error).message) } finally { setLlmBusy(false) }
  }

  return <div className="user-menu" ref={root}>
    <button className="user-menu-trigger" aria-label={`Account menu for ${displayName}`} aria-haspopup="menu" aria-expanded={open} onClick={() => { setOpen(value => !value); setSettingsOpen(false) }}>
      {user.picture && !imageFailed ? <img src={user.picture} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /> : <span aria-hidden="true">{initials}</span>}
    </button>
    {open && <div className="user-menu-popover" role="menu">
      <div className="user-menu-identity">
        <strong>{displayName}</strong><span>{user.email}</span>
        {user.isAdmin && <small>Administrator</small>}
      </div>
      {settingsOpen ? <div className="user-menu-settings">
        <button className="user-menu-back icon-text-button" onClick={() => setSettingsOpen(false)}><ArrowLeft />Settings</button>
        <div><span>Appearance</span><ThemeToggle /></div>
        <section className="user-llm-settings" aria-label="AI provider settings">
          <strong>AI provider</strong>
          <label>Provider<select value="OPENAI" disabled><option value="OPENAI">OpenAI</option></select></label>
          <label>Model<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="gpt-4.1-mini" maxLength={120} /></label>
          <label>API key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={llm?.hasApiKey ? 'Saved — enter to replace' : 'sk-…'} autoComplete="new-password" maxLength={512} /></label>
          {llm && !llm.credentialStorageAvailable && <p className="user-llm-warning">Credential storage is not configured by the administrator.</p>}
          {llmMessage && <p className="user-llm-message" role="status">{llmMessage}</p>}
          <div className="user-llm-actions">
            {llm?.hasApiKey && <button className="danger-button" onClick={() => void removeLlm()} disabled={llmBusy}>Remove</button>}
            <button className="primary-button compact" onClick={() => void saveLlm()} disabled={llmBusy || !model.trim() || (!apiKey.trim() && !llm?.hasApiKey)}>{llmBusy ? 'Saving…' : 'Save AI provider'}</button>
          </div>
        </section>
      </div> : <>
        <button role="menuitem" className="icon-text-button" onClick={() => setSettingsOpen(true)}><Settings />Settings</button>
        {user.isAdmin && onSwitchMode && <button role="menuitem" className="icon-text-button" onClick={() => { setOpen(false); onSwitchMode() }}><LayoutDashboard />{adminMode ? 'Switch to projects' : 'Switch to admin dashboard'}</button>}
        <button role="menuitem" className="user-menu-signout icon-text-button" onClick={onSignOut}><LogOut />Sign out</button>
      </>}
    </div>}
  </div>
}
