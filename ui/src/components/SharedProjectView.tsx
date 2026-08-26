import { lazy, Suspense, useEffect, useState } from 'react'
import { useEdgesState, useNodesState } from '@xyflow/react'
import { api } from '../api'
import { sanitizeRichText } from '../sanitizeRichText'
import type { CanvasData, SharedProject } from '../types'
import ThemeToggle from './ThemeToggle'
import { parseCanvasJson } from '../projectPersistence'

const CanvasWorkspace = lazy(() => import('./CanvasWorkspace'))
const Editor = lazy(() => import('./Editor'))

function ReadOnlyCanvas({ shared, canvas }: { shared: SharedProject; canvas: CanvasData }) {
  const [nodes] = useNodesState(canvas.nodes)
  const [edges] = useEdgesState(canvas.edges)
  return <main className="shared-project-shell">
    <header><div><span className="brand-mark small">A</span><div><strong>{shared.project.name}</strong><small>Read-only shared architecture</small></div></div><ThemeToggle /></header>
    <div className="shared-project-content">
      <article className="shared-document" dangerouslySetInnerHTML={{ __html: sanitizeRichText(shared.project.markdown) }} />
      <section className="canvas-panel shared-readonly"><Suspense fallback={<p className="muted">Loading canvas…</p>}><CanvasWorkspace nodes={nodes} edges={edges} setNodes={() => undefined} setEdges={() => undefined} viewport={canvas.viewport} /></Suspense></section>
    </div>
  </main>
}

function ReadOnlyProject({ shared }: { shared: SharedProject }) {
  try {
    return <ReadOnlyCanvas shared={shared} canvas={parseCanvasJson(shared.project.canvasJson)} />
  } catch {
    return <main className="shared-error" role="alert"><h1>Canvas could not be loaded</h1><p>The shared project contains corrupt or unsupported canvas data. No empty replacement was created.</p></main>
  }
}

export default function SharedProjectView({ shareToken }: { shareToken: string }) {
  const [shared, setShared] = useState<SharedProject | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api.getSharedProject(shareToken).then(setShared).catch((reason: Error) => setError(reason.message)) }, [shareToken])
  if (error) return <main className="shared-error"><h1>Share link unavailable</h1><p>{error}</p></main>
  if (!shared) return <main className="shared-error"><p>Loading shared project…</p></main>
  return shared.permission === 'EDIT'
    ? <Suspense fallback={<main className="shared-error"><p>Loading editor…</p></main>}><Editor shareToken={shareToken} initialProject={shared.project} /></Suspense>
    : <ReadOnlyProject shared={shared} />
}
