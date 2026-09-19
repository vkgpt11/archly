import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ApiError } from '../api'
import { embedAssetUrl, getEmbed, type EmbeddedDiagram } from '../embedApi'
import ThemeToggle from './ThemeToggle'

const Diagram = lazy(() => import('./CanvasWorkspace').then((module) => ({ default: module.ReadOnlyDiagram })))

export default function DiagramEmbedView({ token }: { token: string }) {
  const [diagram, setDiagram] = useState<EmbeddedDiagram | null>(null)
  const [message, setMessage] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    let stopped = false
    let pending = false
    let controller: AbortController | null = null
    async function refresh() {
      if (pending || stopped || document.hidden) return
      pending = true
      controller = new AbortController()
      const requestController = controller
      const timeout = window.setTimeout(() => requestController.abort(), 15_000)
      try {
        const next = await getEmbed(token, requestController.signal)
        if (!active) return
        if (new URLSearchParams(window.location.search).get('edit') === '1') {
          window.location.replace(`/#/project/${encodeURIComponent(next.projectId)}`)
          return
        }
        setDiagram((current) => current?.revision === next.revision ? current : next)
        setMessage('')
      } catch (error) {
        if (!active) return
        if (error instanceof ApiError && [401, 403, 404, 410, 422].includes(error.status)) {
          stopped = true; setDiagram(null); setMessage(error.status === 422 ? 'The published view or environment is unavailable. Ask the owner to restore it or create a new embed.' : 'This embed is unavailable, expired, or revoked.')
        } else setMessage('Unable to refresh. Any diagram shown is the last loaded version. Retry or open Archly.')
      } finally { clearTimeout(timeout); pending = false }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 30_000)
    const visible = () => { if (!document.hidden) void refresh() }
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('focus', visible)
    return () => { active = false; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible) }
  }, [token, attempt])
  const nodes = useMemo(() => diagram?.canvas.nodes.map((node) => {
    const src = node.data?.imageSrc
    return typeof src === 'string' && src.startsWith('archly-asset:')
      ? { ...node, data: { ...node.data, imageSrc: embedAssetUrl(token, src.slice(13)) } } : node
  }) || [], [diagram, token])
  return <main className="diagram-embed-shell">
    <header><strong>Archly · Read-only diagram</strong><div>{diagram && <a href={`/#/project/${encodeURIComponent(diagram.projectId)}`} target="_blank" rel="noopener noreferrer">Open in edit mode</a>}<ThemeToggle /></div></header>
    {message && <div className="embed-status" role="alert">{message} <button onClick={() => setAttempt((value) => value + 1)}>Retry</button></div>}
    {diagram ? <><Suspense fallback={<p role="status">Loading diagram…</p>}><Diagram nodes={nodes} edges={diagram.canvas.edges} /></Suspense><footer>Latest saved diagram · View: {diagram.view || 'Architecture'} · Environment: {diagram.variant || 'Base'} · Revision {diagram.revision} · {new Date(diagram.updatedAt).toLocaleString()}</footer></> : !message && <p role="status">Loading saved diagram…</p>}
  </main>
}
