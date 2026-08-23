import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addEdge, Background, Controls, MiniMap, ReactFlow,
  useEdgesState, useNodesState, type Connection, type Node,
} from '@xyflow/react'
import ReactMarkdown from 'react-markdown'
import { api } from '../api'
import type { CanvasData, Project } from '../types'

type View = 'canvas' | 'document' | 'split'
type Props = { token: string; initialProject: Project; onBack: (project: Project) => void }

function parseCanvas(value: string): CanvasData {
  try { return JSON.parse(value) as CanvasData } catch { return { nodes: [], edges: [] } }
}

export default function Editor({ token, initialProject, onBack }: Props) {
  const initialCanvas = parseCanvas(initialProject.canvasJson)
  const [project, setProject] = useState(initialProject)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialCanvas.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialCanvas.edges)
  const [view, setView] = useState<View>('split')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const latestProject = useRef(project)

  useEffect(() => { latestProject.current = project }, [project])

  const onConnect = useCallback((connection: Connection) => setEdges((current) => addEdge(connection, current)), [setEdges])

  function addNode() {
    const node: Node = {
      id: crypto.randomUUID(),
      position: { x: 120 + nodes.length * 32, y: 100 + nodes.length * 24 },
      data: { label: `Service ${nodes.length + 1}` },
      style: { border: '1px solid #8b5cf6', borderRadius: 12, padding: 12, background: '#fff' },
    }
    setNodes((current) => [...current, node])
  }

  useEffect(() => {
    const next = {
      ...latestProject.current,
      name: project.name,
      markdown: project.markdown,
      canvasJson: JSON.stringify({ nodes, edges }),
    }
    latestProject.current = next
    setSaveState('saving')
    const timer = window.setTimeout(async () => {
      try {
        const saved = await api.saveProject(token, latestProject.current)
        latestProject.current = saved
        setProject(saved)
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 900)
    return () => window.clearTimeout(timer)
    // Project field changes update latestProject directly; canvas changes trigger persistence.
  }, [nodes, edges, project.name, project.markdown, token])

  const showCanvas = view !== 'document'
  const showDocument = view !== 'canvas'

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <button className="icon-button" onClick={() => onBack(latestProject.current)} aria-label="Back to projects">←</button>
        <input className="project-name" value={project.name} onChange={(event) => setProject({ ...project, name: event.target.value })} aria-label="Project name" />
        <div className="view-switcher" aria-label="Editor view">
          {(['document', 'split', 'canvas'] as View[]).map((option) => (
            <button key={option} className={view === option ? 'active' : ''} onClick={() => setView(option)}>{option}</button>
          ))}
        </div>
        <span className={`save-state ${saveState}`}>{saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved'}</span>
      </header>
      <div className="editor-body">
        {showDocument && (
          <section className="document-panel">
            <textarea value={project.markdown} onChange={(event) => setProject({ ...project, markdown: event.target.value })} aria-label="Markdown document" />
            <article className="markdown-preview"><ReactMarkdown>{project.markdown}</ReactMarkdown></article>
          </section>
        )}
        {showCanvas && (
          <section className="canvas-panel">
            <div className="canvas-toolbar"><button className="primary-button compact" onClick={addNode}>+ Add service</button></div>
            <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView>
              <Background gap={20} color="#d8dce7" /><MiniMap /><Controls />
            </ReactFlow>
          </section>
        )}
      </div>
    </main>
  )
}
