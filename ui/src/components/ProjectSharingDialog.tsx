import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../api'
import type { ShareLink, SharePermission } from '../types'
import { embedSnippets } from '../embedApi'

type Props = { token: string; projectId: string; onClose: () => void }

export default function ProjectSharingDialog({ token, projectId, onClose }: Props) {
  const [shares, setShares] = useState<ShareLink[]>([])
  const [permission, setPermission] = useState<SharePermission>('READ')
  const [newShareUrl, setNewShareUrl] = useState('')
  const [message, setMessage] = useState('')
  const [embed, setEmbed] = useState<{ id: string; token: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const dialog = useRef<HTMLElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.querySelector<HTMLElement>('button')?.focus()
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab') return
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, a[href]') || [])
      const first = items[0]; const last = items.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keyboard)
    return () => { document.removeEventListener('keydown', keyboard); previous?.focus() }
  }, [onClose])

  async function createEmbed() {
    setCreating(true); setMessage('')
    try {
      const created = await api.createShare(token, projectId, 'EMBED')
      setShares((current) => [created, ...current])
      if (created.token) setEmbed({ id: created.id, token: created.token })
    } catch (error) { setMessage((error as Error).message) }
    finally { setCreating(false) }
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setMessage('Copied.') }
    catch { setMessage('Clipboard unavailable. Select and copy the text manually.') }
  }

  useEffect(() => {
    let active = true
    api.listShares(token, projectId).then((listed) => {
      if (!active) return
      setShares((current) => {
        const currentIds = new Set(current.map((share) => share.id))
        return [...current, ...listed.filter((share) => !currentIds.has(share.id))]
      })
    }).catch((error: Error) => { if (active) setMessage(error.message) })
    return () => { active = false }
  }, [projectId, token])

  async function createShare() {
    setMessage('')
    try {
      const created = await api.createShare(token, projectId, permission)
      setShares((current) => [created, ...current])
      setNewShareUrl(`${window.location.origin}/share/${created.token}`)
    } catch (error) { setMessage((error as Error).message) }
  }

  async function revokeShare(share: ShareLink) {
    try {
      await api.revokeShare(token, projectId, share.id)
      setShares((current) => current.map((item) => item.id === share.id ? { ...item, revoked: true } : item))
      if (embed?.id === share.id) setEmbed(null)
    } catch (error) { setMessage((error as Error).message) }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section ref={dialog} className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">Project access</p><h2 id="share-title">Share project</h2></div><button className="modal-close" onClick={onClose} aria-label="Close sharing"><X /></button></header>
      <div className="share-create"><select aria-label="Share permission" value={permission} onChange={(event) => setPermission(event.target.value as SharePermission)}><option value="READ">Anyone with link can view</option><option value="EDIT">Anyone with link can edit</option></select><button className="primary-button compact" onClick={() => void createShare()}>Create link</button></div>
      {newShareUrl && <div className="created-share"><input aria-label="New share link" readOnly value={newShareUrl} /><button onClick={() => void copy(newShareUrl)}>Copy</button></div>}
      <section className="embed-publication" aria-labelledby="embed-publication-title">
        <h3 id="embed-publication-title">Embed in documentation</h3>
        <p>Anyone with this link can view the latest saved diagram, including future saved changes. A private Notion or wiki page does not protect a copied embed link. Editing still requires sign-in and project permission.</p>
        <p>Publishes the view and environment currently saved in the project. Save first to choose a different view. This link keeps that scope when you navigate elsewhere. Source code, documentation, and snapshot history are excluded.</p>
        <button disabled={creating} onClick={() => void createEmbed()}>{creating ? 'Creating…' : 'Enable read-only embed'}</button>
        {embed && Object.entries(embedSnippets(embed.token)).map(([format, value]) => <div className="embed-snippet" key={format}><label htmlFor={`embed-${format}`}>{format === 'url' ? 'Notion / viewer URL' : format === 'iframe' ? 'Wiki / iframe embed' : 'Markdown image and link'}</label><textarea id={`embed-${format}`} readOnly value={value} rows={format === 'url' ? 2 : 4} /><button onClick={() => void copy(value)}>Copy {format}</button></div>)}
        {embed && <a href={embedSnippets(embed.token).url} target="_blank" rel="noopener noreferrer">Preview read-only embed</a>}
        <p className="fine-print">Interactive viewers check for updates every 30 seconds while visible. Markdown hosts may cache older images; opening Archly shows the current saved diagram. Revoking stops future access, but cannot recall downloaded or cached copies. Save copied links securely: their tokens cannot be retrieved later.</p>
      </section>
      <div className="share-list">{shares.map((share) => <article key={share.id}><div><strong>{share.permission === 'EMBED' ? 'Diagram embed' : share.permission === 'EDIT' ? 'Editable link' : 'Read-only link'}</strong><small>{share.revoked ? 'Revoked' : new Date(share.expiresAt).getTime() <= Date.now() ? 'Expired' : `Expires ${new Date(share.expiresAt).toLocaleDateString()}`}</small></div>{!share.revoked && <button className="danger-link" onClick={() => void revokeShare(share)}>Revoke</button>}</article>)}</div>
      {message && <p className="fine-print" role="status">{message}</p>}
    </section>
  </div>
}
