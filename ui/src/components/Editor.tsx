import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  addEdge, Background, Controls, MiniMap, ReactFlow,
  useEdgesState, useNodesState, type Connection, type Node,
} from '@xyflow/react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
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
  const [documentWidth, setDocumentWidth] = useState(45)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const latestProject = useRef(project)
  const editorBody = useRef<HTMLDivElement>(null)

  useEffect(() => { latestProject.current = project }, [project])

  const richTextEditor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
    ],
    content: initialProject.markdown,
    editorProps: {
      attributes: {
        class: 'rich-text-content',
        'aria-label': 'Design documentation',
      },
    },
    onUpdate: ({ editor }) => {
      setProject((current) => ({ ...current, markdown: editor.getHTML() }))
    },
  })

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

  function resizeFromClientX(clientX: number) {
    const bounds = editorBody.current?.getBoundingClientRect()
    if (!bounds) return
    const nextWidth = ((clientX - bounds.left) / bounds.width) * 100
    setDocumentWidth(Math.min(80, Math.max(20, nextWidth)))
  }

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    const onMove = (moveEvent: PointerEvent) => resizeFromClientX(moveEvent.clientX)
    const onEnd = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onEnd)
      document.body.classList.remove('resizing-panels')
    }
    document.body.classList.add('resizing-panels')
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onEnd)
  }

  function editLink() {
    if (!richTextEditor) return
    const currentUrl = richTextEditor.getAttributes('link').href as string | undefined
    const url = window.prompt('Enter a URL', currentUrl || 'https://')
    if (url === null) return
    if (url.trim() === '') {
      richTextEditor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    richTextEditor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

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
      <div className="editor-body" ref={editorBody}>
        {showDocument && (
          <section className="document-panel" style={view === 'split' ? { flexBasis: `${documentWidth}%` } : undefined}>
            <div className="rich-text-toolbar" role="toolbar" aria-label="Document formatting">
              <button className={richTextEditor?.isActive('heading', { level: 1 }) ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</button>
              <button className={richTextEditor?.isActive('heading', { level: 2 }) ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</button>
              <span className="toolbar-divider" />
              <button className={richTextEditor?.isActive('bold') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleBold().run()} title="Bold"><strong>B</strong></button>
              <button className={richTextEditor?.isActive('italic') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleItalic().run()} title="Italic"><em>I</em></button>
              <button className={richTextEditor?.isActive('strike') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleStrike().run()} title="Strikethrough"><s>S</s></button>
              <button className={richTextEditor?.isActive('code') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleCode().run()} title="Inline code">&lt;/&gt;</button>
              <span className="toolbar-divider" />
              <button className={richTextEditor?.isActive('bulletList') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleBulletList().run()} title="Bullet list">• List</button>
              <button className={richTextEditor?.isActive('orderedList') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleOrderedList().run()} title="Numbered list">1. List</button>
              <button className={richTextEditor?.isActive('blockquote') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleBlockquote().run()} title="Quote">Quote</button>
              <button className={richTextEditor?.isActive('codeBlock') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleCodeBlock().run()} title="Code block">Code block</button>
              <button className={richTextEditor?.isActive('link') ? 'active' : ''} onClick={editLink} title="Add or edit link">Link</button>
              <span className="toolbar-spacer" />
              <button onClick={() => richTextEditor?.chain().focus().undo().run()} disabled={!richTextEditor?.can().undo()} title="Undo">↶</button>
              <button onClick={() => richTextEditor?.chain().focus().redo().run()} disabled={!richTextEditor?.can().redo()} title="Redo">↷</button>
            </div>
            <EditorContent editor={richTextEditor} className="rich-text-editor" />
          </section>
        )}
        {view === 'split' && (
          <div
            className="panel-resizer"
            role="separator"
            aria-label="Resize document and canvas"
            aria-orientation="vertical"
            aria-valuemin={20}
            aria-valuemax={80}
            aria-valuenow={Math.round(documentWidth)}
            tabIndex={0}
            onPointerDown={startResize}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') setDocumentWidth((width) => Math.max(20, width - 5))
              if (event.key === 'ArrowRight') setDocumentWidth((width) => Math.min(80, width + 5))
            }}
          ><span /></div>
        )}
        {showCanvas && (
          <section className="canvas-panel" style={view === 'split' ? { flexBasis: `${100 - documentWidth}%` } : undefined}>
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
