import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../api'
import type { ShareLink, SharePermission } from '../types'

type Props = { token: string; projectId: string; onClose: () => void }

export default function ProjectSharingDialog({ token, projectId, onClose }: Props) {
  const [shares, setShares] = useState<ShareLink[]>([])
  const [permission, setPermission] = useState<SharePermission>('READ')
  const [newShareUrl, setNewShareUrl] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.listShares(token, projectId).then(setShares).catch((error: Error) => setMessage(error.message))
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
    } catch (error) { setMessage((error as Error).message) }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">Project access</p><h2 id="share-title">Share project</h2></div><button className="modal-close" onClick={onClose} aria-label="Close sharing"><X /></button></header>
      <div className="share-create"><select aria-label="Share permission" value={permission} onChange={(event) => setPermission(event.target.value as SharePermission)}><option value="READ">Anyone with link can view</option><option value="EDIT">Anyone with link can edit</option></select><button className="primary-button compact" onClick={() => void createShare()}>Create link</button></div>
      {newShareUrl && <div className="created-share"><input aria-label="New share link" readOnly value={newShareUrl} /><button onClick={() => void navigator.clipboard.writeText(newShareUrl)}>Copy</button></div>}
      <div className="share-list">{shares.map((share) => <article key={share.id}><div><strong>{share.permission === 'EDIT' ? 'Editable link' : 'Read-only link'}</strong><small>{share.revoked ? 'Revoked' : `Expires ${new Date(share.expiresAt).toLocaleDateString()}`}</small></div>{!share.revoked && <button className="danger-link" onClick={() => void revokeShare(share)}>Revoke</button>}</article>)}</div>
      {message && <p className="fine-print" role="status">{message}</p>}
    </section>
  </div>
}
