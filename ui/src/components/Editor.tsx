import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useEdgesState, useNodesState } from '@xyflow/react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import { common, createLowlight } from 'lowlight'
import {
  Bold, Code2, Heading1, Heading2, Italic, Link2, List, ListOrdered,
  Highlighter, Palette, Quote, Redo2, RotateCcw, SquareCode, Strikethrough, Undo2,
} from 'lucide-react'
import { ApiError, api } from '../api'
import type { CanvasData, Project } from '../types'
import CanvasWorkspace from './CanvasWorkspace'
import ThemeToggle from './ThemeToggle'

type View = 'canvas' | 'document' | 'split'
type Props = { token: string; initialProject: Project; onBack: (project: Project) => void }

const lowlight = createLowlight(common)
const textColors = ['#20222d', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#db2777']
const highlightColors = ['#fef3c7', '#fed7aa', '#fecaca', '#fbcfe8', '#ddd6fe', '#bfdbfe', '#bbf7d0', '#d1d5db']

function parseCanvas(value: string): CanvasData {
  try { return JSON.parse(value) as CanvasData } catch { return { nodes: [], edges: [] } }
}

export default function Editor({ token, initialProject, onBack }: Props) {
  const initialCanvas = parseCanvas(initialProject.canvasJson)
  const [project, setProject] = useState(initialProject)
  const [nodes, setNodes] = useNodesState(initialCanvas.nodes)
  const [edges, setEdges] = useEdgesState(initialCanvas.edges)
  const [view, setView] = useState<View>('split')
  const [documentWidth, setDocumentWidth] = useState(45)
  const [linkEditorOpen, setLinkEditorOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('https://')
  const [linkError, setLinkError] = useState('')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const latestProject = useRef(project)
  const editorBody = useRef<HTMLDivElement>(null)
  const saveInFlight = useRef(false)
  const changeVersion = useRef(0)
  const initialSaveSkipped = useRef(false)
  const conflictRetryUsed = useRef(false)

  useEffect(() => { latestProject.current = project }, [project])

  const richTextEditor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
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

  const flushSave = useCallback(async () => {
    if (saveInFlight.current) return
    saveInFlight.current = true
    const savingVersion = changeVersion.current
    let retryConflict = false

    try {
      const saved = await api.saveProject(token, latestProject.current)
      const merged = {
        ...latestProject.current,
        revision: saved.revision,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      }
      latestProject.current = merged
      setProject((current) => ({
        ...current,
        revision: saved.revision,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      }))
      conflictRetryUsed.current = false
      if (changeVersion.current === savingVersion) setSaveState('saved')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && !conflictRetryUsed.current) {
        conflictRetryUsed.current = true
        try {
          const serverProject = await api.getProject(token, latestProject.current.id)
          latestProject.current = {
            ...latestProject.current,
            revision: serverProject.revision,
            createdAt: serverProject.createdAt,
            updatedAt: serverProject.updatedAt,
          }
          retryConflict = true
          setSaveState('saving')
        } catch {
          setSaveState('error')
        }
      } else {
        setSaveState('error')
      }
    } finally {
      saveInFlight.current = false
      if (retryConflict || changeVersion.current > savingVersion) {
        queueMicrotask(() => void flushSave())
      }
    }
  }, [token])

  useEffect(() => {
    latestProject.current = {
      ...latestProject.current,
      name: project.name,
      markdown: project.markdown,
      canvasJson: JSON.stringify({ nodes, edges }),
    }
    if (!initialSaveSkipped.current) {
      initialSaveSkipped.current = true
      return
    }
    changeVersion.current += 1
    setSaveState('saving')
    const timer = window.setTimeout(() => void flushSave(), 900)
    return () => window.clearTimeout(timer)
  }, [nodes, edges, project.name, project.markdown, flushSave])

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
    setLinkUrl(currentUrl || 'https://')
    setLinkError('')
    setLinkEditorOpen(true)
  }

  function applyLink() {
    const url = linkUrl.trim()
    if (!richTextEditor || !url || url === 'https://') return
    try {
      const parsed = new URL(url)
      if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) throw new Error('Unsupported protocol')
    } catch {
      setLinkError('Enter a valid HTTP, HTTPS, or email link.')
      return
    }
    richTextEditor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    setLinkEditorOpen(false)
  }

  function removeLink() {
    richTextEditor?.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkEditorOpen(false)
  }

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <div className="editor-header-left">
          <button className="icon-button" onClick={() => onBack(latestProject.current)} aria-label="Back to projects">←</button>
          <input className="project-name" value={project.name} onChange={(event) => setProject({ ...project, name: event.target.value })} aria-label="Project name" />
        </div>
        <div className="view-switcher" aria-label="Editor view">
          {(['document', 'split', 'canvas'] as View[]).map((option) => (
            <button key={option} className={view === option ? 'active' : ''} onClick={() => setView(option)}>{option}</button>
          ))}
        </div>
        <div className="editor-header-right">
          <ThemeToggle />
          <span className={`save-state ${saveState}`}>{saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved'}</span>
        </div>
      </header>
      <div className="editor-body" ref={editorBody}>
        {showDocument && (
          <section className="document-panel" style={view === 'split' ? { flexBasis: `${documentWidth}%` } : undefined}>
            <div className="rich-text-toolbar" role="toolbar" aria-label="Document formatting">
              <button className={richTextEditor?.isActive('heading', { level: 1 }) ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1" aria-label="Heading 1"><Heading1 /></button>
              <button className={richTextEditor?.isActive('heading', { level: 2 }) ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2" aria-label="Heading 2"><Heading2 /></button>
              <span className="toolbar-divider" />
              <button className={richTextEditor?.isActive('bold') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleBold().run()} title="Bold" aria-label="Bold"><Bold /></button>
              <button className={richTextEditor?.isActive('italic') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleItalic().run()} title="Italic" aria-label="Italic"><Italic /></button>
              <button className={richTextEditor?.isActive('strike') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleStrike().run()} title="Strikethrough" aria-label="Strikethrough"><Strikethrough /></button>
              <details className="color-menu">
                <summary title="Text color" aria-label="Text color"><Palette /></summary>
                <div className="color-popover" aria-label="Text colors">
                  {textColors.map((color) => (
                    <button key={color} className="color-swatch" style={{ backgroundColor: color }} onClick={() => richTextEditor?.chain().focus().setColor(color).run()} title={color} aria-label={`Set text color ${color}`} />
                  ))}
                  <button className="color-clear" onClick={() => richTextEditor?.chain().focus().unsetColor().run()} title="Clear text color" aria-label="Clear text color"><RotateCcw /></button>
                </div>
              </details>
              <details className="color-menu">
                <summary title="Highlight color" aria-label="Highlight color"><Highlighter /></summary>
                <div className="color-popover" aria-label="Highlight colors">
                  {highlightColors.map((color) => (
                    <button key={color} className="color-swatch light" style={{ backgroundColor: color }} onClick={() => richTextEditor?.chain().focus().setHighlight({ color }).run()} title={color} aria-label={`Set highlight color ${color}`} />
                  ))}
                  <button className="color-clear" onClick={() => richTextEditor?.chain().focus().unsetHighlight().run()} title="Clear highlight" aria-label="Clear highlight"><RotateCcw /></button>
                </div>
              </details>
              <button className={richTextEditor?.isActive('code') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleCode().run()} title="Highlight selected text as inline code" aria-label="Inline code"><Code2 /></button>
              <span className="toolbar-divider" />
              <button className={richTextEditor?.isActive('bulletList') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleBulletList().run()} title="Bullet list" aria-label="Bullet list"><List /></button>
              <button className={richTextEditor?.isActive('orderedList') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleOrderedList().run()} title="Numbered list" aria-label="Numbered list"><ListOrdered /></button>
              <button className={richTextEditor?.isActive('blockquote') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleBlockquote().run()} title="Quote" aria-label="Quote"><Quote /></button>
              <button className={richTextEditor?.isActive('codeBlock') ? 'active' : ''} onClick={() => richTextEditor?.chain().focus().toggleCodeBlock().run()} title="Create a multiline syntax-highlighted code snippet" aria-label="Code snippet"><SquareCode /></button>
              <div className="link-menu">
                <button className={richTextEditor?.isActive('link') || linkEditorOpen ? 'active' : ''} onClick={editLink} title="Add or edit link" aria-label="Add or edit link"><Link2 /></button>
                {linkEditorOpen && (
                  <div className="link-popover" role="dialog" aria-label="Edit link" onKeyDown={(event) => event.key === 'Escape' && setLinkEditorOpen(false)}>
                    <label htmlFor="editor-link-url">Link URL</label>
                    <input
                      id="editor-link-url"
                      value={linkUrl}
                      onChange={(event) => { setLinkUrl(event.target.value); setLinkError('') }}
                      onKeyDown={(event) => event.key === 'Enter' && applyLink()}
                      placeholder="https://example.com"
                      autoFocus
                    />
                    {linkError && <p className="link-error" role="alert">{linkError}</p>}
                    <div className="link-actions">
                      {richTextEditor?.isActive('link') && <button className="remove-link" onClick={removeLink}>Remove</button>}
                      <button className="cancel-link" onClick={() => setLinkEditorOpen(false)}>Cancel</button>
                      <button className="apply-link" onClick={applyLink} disabled={!linkUrl.trim() || linkUrl.trim() === 'https://'}>Apply</button>
                    </div>
                  </div>
                )}
              </div>
              <span className="toolbar-spacer" />
              <button onClick={() => richTextEditor?.chain().focus().undo().run()} disabled={!richTextEditor?.can().undo()} title="Undo" aria-label="Undo"><Undo2 /></button>
              <button onClick={() => richTextEditor?.chain().focus().redo().run()} disabled={!richTextEditor?.can().redo()} title="Redo" aria-label="Redo"><Redo2 /></button>
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
            <CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} />
          </section>
        )}
      </div>
    </main>
  )
}
