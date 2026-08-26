import { useEffect, useState } from 'react'
import { useEdgesState, useNodesState } from '@xyflow/react'
import { api } from '../api'
import { sanitizeRichText } from '../sanitizeRichText'
import type { CanvasData, SharedProject } from '../types'
import CanvasWorkspace from './CanvasWorkspace'
import Editor from './Editor'
import ThemeToggle from './ThemeToggle'

function parseCanvas(value: string): CanvasData {
  try { return JSON.parse(value) as CanvasData } catch { return { nodes: [], edges: [] } }
}

function ReadOnlyProject({ shared }: { shared: SharedProject }) {
  const canvas = parseCanvas(shared.project.canvasJson)
  const [nodes] = useNodesState(canvas.nodes)
  const [edges] = useEdgesState(canvas.edges)
  return <main className="shared-project-shell">
    <header><div><span className="brand-mark small">A</span><div><strong>{shared.project.name}</strong><small>Read-only shared architecture</small></div></div><ThemeToggle /></header>
    <div className="shared-project-content">
      <article className="shared-document" dangerouslySetInnerHTML={{ __html: sanitizeRichText(shared.project.markdown) }} />
      <section className="canvas-panel shared-readonly"><CanvasWorkspace nodes={nodes} edges={edges} setNodes={() => undefined} setEdges={() => undefined} viewport={canvas.viewport} /></section>
    </div>
  </main>
}

export default function SharedProjectView({ shareToken }: { shareToken: string }) {
  const [shared, setShared] = useState<SharedProject | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { api.getSharedProject(shareToken).then(setShared).catch((reason: Error) => setError(reason.message)) }, [shareToken])
  if (error) return <main className="shared-error"><h1>Share link unavailable</h1><p>{error}</p></main>
  if (!shared) return <main className="shared-error"><p>Loading shared project…</p></main>
  return shared.permission === 'EDIT'
    ? <Editor shareToken={shareToken} initialProject={shared.project} />
    : <ReadOnlyProject shared={shared} />
}
