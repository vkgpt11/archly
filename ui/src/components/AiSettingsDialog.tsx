import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Eye, EyeOff, KeyRound, TestTube2, Trash2, X } from 'lucide-react'
import { ApiError, api, type LlmSettings } from '../api'
import ThemeToggle from './ThemeToggle'

type Props = { token: string; open: boolean; onClose: () => void }
const settingsSignalKey = 'archly:llm-settings-changed'

export default function AiSettingsDialog({ token, open, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [settings, setSettings] = useState<LlmSettings | null>(null)
  const [model, setModel] = useState('gpt-4.1-mini')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [state, setState] = useState<'idle' | 'loading' | 'saving' | 'testing' | 'removing'>('idle')
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const load = useCallback(async () => {
    setState('loading'); setMessage(null)
    try { const value = await api.getLlmSettings(token); setSettings(value); setModel(value.model) }
    catch (error) { setMessage({ kind: 'error', text: (error as Error).message }) }
    finally { setState('idle') }
  }, [token])

  useEffect(() => {
    if (!open) { if (dialog.current?.open) dialog.current.close(); return }
    returnFocus.current = document.activeElement as HTMLElement
    dialog.current?.showModal(); void load(); window.setTimeout(() => closeButton.current?.focus(), 0)
  }, [load, open])
  useEffect(() => { const refresh = (event: StorageEvent) => { if (open && event.key === settingsSignalKey) void load() }; window.addEventListener('storage', refresh); return () => window.removeEventListener('storage', refresh) }, [load, open])

  function finishClose() { setApiKey(''); setShowKey(false); setConfirmRemove(false); setMessage(null); onClose(); window.setTimeout(() => returnFocus.current?.focus(), 0) }
  function broadcastChange() {
    try { localStorage.setItem(settingsSignalKey, `${Date.now()}:${crypto.randomUUID()}`) } catch { /* Settings still saved when storage is unavailable. */ }
  }
  async function save() { setState('saving'); setMessage(null); try { const value = await api.saveLlmSettings(token, 'OPENAI', model.trim(), apiKey.trim() || undefined); setSettings(value); setApiKey(''); setShowKey(false); setMessage({ kind: 'success', text: 'OpenAI connection saved.' }); broadcastChange() } catch (error) { setMessage({ kind: 'error', text: error instanceof ApiError ? error.message : 'Could not save the connection.' }) } finally { setState('idle') } }
  async function testConnection() { setState('testing'); setMessage(null); try { await api.testLlmSettings(token, model.trim(), apiKey.trim() || undefined); if (!apiKey.trim()) setSettings(await api.getLlmSettings(token)); setMessage({ kind: 'success', text: 'Connection successful.' }) } catch (error) { setMessage({ kind: 'error', text: error instanceof ApiError ? error.message : 'Connection test failed.' }) } finally { setState('idle') } }
  async function remove() { setState('removing'); setMessage(null); try { await api.deleteLlmSettings(token); setSettings(settings && { ...settings, model: 'gpt-4.1-mini', hasApiKey: false, apiKeyHint: null, updatedAt: null, lastSuccessfulUseAt: null, lastErrorCode: null }); setModel('gpt-4.1-mini'); setApiKey(''); setConfirmRemove(false); setMessage({ kind: 'success', text: 'OpenAI connection removed.' }); broadcastChange() } catch (error) { setMessage({ kind: 'error', text: (error as Error).message }) } finally { setState('idle') } }

  const busy = state !== 'idle'
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return
    const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
    if (!elements.length) return
    const first = elements[0]; const last = elements[elements.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }

  return <dialog ref={dialog} className="account-settings-dialog" aria-labelledby="account-settings-title" aria-describedby="account-settings-description" onKeyDown={trapFocus} onCancel={(event) => { event.preventDefault(); if (!busy) finishClose() }}>
    <header className="account-settings-header"><div><h2 id="account-settings-title">Settings</h2><p id="account-settings-description">Manage appearance and your private AI connection.</p></div><button ref={closeButton} className="account-settings-close" onClick={finishClose} disabled={busy} aria-label="Close settings"><X /></button></header>
    <div className="account-settings-body">
      <section className="account-settings-appearance" aria-labelledby="appearance-title"><div><h3 id="appearance-title">Appearance</h3><p>Choose a light or dark workspace.</p></div><ThemeToggle /></section>
      <section className="user-llm-settings" aria-labelledby="ai-settings-title"><div><h3 id="ai-settings-title">AI connection</h3><p>Use your own OpenAI API key for diagram generation.</p></div>
        {state === 'loading' && <p className="settings-loading" role="status">Loading AI connection…</p>}
        {message && <p className={`user-llm-message ${message.kind}`} role={message.kind === 'error' ? 'alert' : 'status'} aria-live="polite">{message.text}</p>}
        {!settings && state === 'idle' && <button type="button" onClick={() => void load()}>Try again</button>}
        {settings && !settings.credentialStorageAvailable && <div className="account-settings-notice" role="alert"><strong>Secure credential storage is unavailable</strong><p>Ask the administrator to configure it before connecting OpenAI.</p></div>}
        {settings?.credentialStorageAvailable && <>
          <div className="account-settings-provider"><span>Provider</span><strong>OpenAI</strong><span className={settings.hasApiKey ? 'connected' : ''}>{settings.hasApiKey ? 'Connected' : 'Not connected'}</span></div>
          {settings.hasApiKey && <dl className="llm-metadata"><div><dt>Saved key</dt><dd>{settings.apiKeyHint || 'Configured'}</dd></div><div><dt>Updated</dt><dd>{settings.updatedAt ? new Date(settings.updatedAt).toLocaleString() : 'Unknown'}</dd></div><div><dt>Last successful use</dt><dd>{settings.lastSuccessfulUseAt ? new Date(settings.lastSuccessfulUseAt).toLocaleString() : 'Not yet'}</dd></div>{settings.lastErrorCode && <div><dt>Last status</dt><dd>{settings.lastErrorCode.replaceAll('_', ' ').toLowerCase()}</dd></div>}</dl>}
          <label htmlFor="llm-model">Model</label><input id="llm-model" value={model} disabled={busy} onChange={event => setModel(event.target.value)} maxLength={120} />
          <label htmlFor="llm-api-key">API key</label><div className="secret-input"><input id="llm-api-key" type={showKey ? 'text' : 'password'} value={apiKey} disabled={busy} onChange={event => setApiKey(event.target.value)} placeholder={settings.hasApiKey ? 'Enter a new key to replace it' : 'Paste your OpenAI API key'} autoComplete="new-password" maxLength={512} /><button type="button" onClick={() => setShowKey(value => !value)} aria-label={showKey ? 'Hide API key' : 'Show API key'}>{showKey ? <EyeOff /> : <Eye />}</button></div>
          <p className="field-help">Saved keys are encrypted and never displayed again.</p>
          {confirmRemove && <div className="remove-confirmation" role="alertdialog" aria-labelledby="remove-ai-title"><strong id="remove-ai-title">Remove this AI connection?</strong><p>Diagram generation will stop until a new key is saved.</p><div><button onClick={() => setConfirmRemove(false)} disabled={busy}>Cancel</button><button className="danger-button" onClick={() => void remove()} disabled={busy}><Trash2 />{state === 'removing' ? 'Removing…' : 'Remove connection'}</button></div></div>}
          <div className="user-llm-actions">{settings.hasApiKey && !confirmRemove && <button onClick={() => setConfirmRemove(true)} disabled={busy}><Trash2 />Remove</button>}<button onClick={() => void testConnection()} disabled={busy || !model.trim() || (!apiKey.trim() && !settings.hasApiKey)}><TestTube2 />{state === 'testing' ? 'Testing…' : 'Test connection'}</button><button className="primary-button compact" onClick={() => void save()} disabled={busy || !model.trim() || (!apiKey.trim() && !settings.hasApiKey)}><KeyRound />{state === 'saving' ? 'Saving…' : 'Save'}</button></div>
        </>}
      </section>
    </div>
  </dialog>
}
