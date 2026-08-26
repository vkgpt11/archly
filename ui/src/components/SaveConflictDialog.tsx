import type { Project } from '../types'
import type { ProjectDraft } from '../projectPersistence'

type SaveConflict = { local: ProjectDraft; server: Project }
type Props = { conflict: SaveConflict; onRetry: () => void; onUseServer: () => void; onKeepLocal: () => void }

export default function SaveConflictDialog({ conflict, onRetry, onUseServer, onKeepLocal }: Props) {
  return <div className="conflict-backdrop">
    <section className="conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
      <p className="eyebrow">Save conflict</p>
      <h2 id="conflict-title">This project changed in another tab</h2>
      <p>Your local draft and the latest server version are both preserved in this browser. Choose which version should become active.</p>
      <div className="conflict-versions">
        <article><strong>Your local draft</strong><span>Based on revision {conflict.local.baseRevision}</span><small>Stored {new Date(conflict.local.storedAt).toLocaleString()}</small></article>
        <article><strong>Latest server version</strong><span>Revision {conflict.server.revision}</span><small>Saved {new Date(conflict.server.updatedAt).toLocaleString()}</small></article>
      </div>
      <div className="conflict-actions">
        <button onClick={onRetry}>Retry original save</button>
        <button onClick={onUseServer}>Use server version</button>
        <button className="primary-button compact" onClick={onKeepLocal}>Keep my version</button>
      </div>
      <small className="conflict-note">Keeping your version explicitly saves it over the current server version. A recovery copy of both versions remains in browser recovery storage.</small>
    </section>
  </div>
}
