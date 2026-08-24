import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useEdgesState, useNodesState } from '@xyflow/react'
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type NodeViewProps } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import Image from '@tiptap/extension-image'
import { common, createLowlight } from 'lowlight'
import {
  Bold, Code2, Heading1, Heading2, Italic, Link2, List, ListOrdered,
  Highlighter, ImagePlus, Palette, Quote, Redo2, RotateCcw, SquareCode, Strikethrough, Undo2,
} from 'lucide-react'
import { ApiError, api } from '../api'
import type { CanvasData, Project } from '../types'
import { sanitizeRichText } from '../sanitizeRichText'
import {
  canonicalCanvasJson, clearDraft, contentSignature, createDraft, draftRecovery, loadDraft,
  serializeCanvas, storeConflictBackup, storeDraft, type ProjectDraft,
} from '../projectPersistence'
import CanvasWorkspace from './CanvasWorkspace'
import ThemeToggle from './ThemeToggle'

type View = 'canvas' | 'document' | 'split'
type Props = { token: string; initialProject: Project; onBack: (project: Project) => void }
type SaveState = 'saved' | 'saving' | 'error' | 'offline' | 'conflict'
type SaveConflict = { local: ProjectDraft; server: Project }

const lowlight = createLowlight(common)
const textColors = ['#20222d', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#db2777']
const highlightColors = ['#fef3c7', '#fed7aa', '#fecaca', '#fbcfe8', '#ddd6fe', '#bfdbfe', '#bbf7d0', '#d1d5db']
const MAX_SCREENSHOT_BYTES = 2 * 1024 * 1024
const screenshotTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

function ResizableImageNode({ node, selected, updateAttributes }: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [width, setWidth] = useState<number | null>(() => Number(node.attrs.width) || null)
  useEffect(() => setWidth(Number(node.attrs.width) || null), [node.attrs.width])

  const beginResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const image = imageRef.current
    if (!image) return
    const startX = event.clientX
    const startWidth = image.getBoundingClientRect().width
    const maxWidth = image.closest('.rich-text-content')?.clientWidth || 1600
    let finalWidth = startWidth
    const move = (moveEvent: PointerEvent) => {
      finalWidth = Math.round(Math.min(maxWidth, Math.max(120, startWidth + moveEvent.clientX - startX)))
      setWidth(finalWidth)
    }
    const finish = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      updateAttributes({ width: finalWidth })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish, { once: true })
  }

  const setPreset = (nextWidth: number | null) => {
    setWidth(nextWidth)
    updateAttributes({ width: nextWidth })
  }

  return <NodeViewWrapper className={`resizable-image-node${selected ? ' selected' : ''}`}>
    <img ref={imageRef} src={node.attrs.src} alt={node.attrs.alt || 'Screenshot'} title={node.attrs.title || undefined} style={width ? { width } : undefined} />
    {selected && <div className="image-size-controls" contentEditable={false}>
      <button onClick={() => setPreset(320)} aria-label="Small image">S</button>
      <button onClick={() => setPreset(640)} aria-label="Medium image">M</button>
      <button onClick={() => setPreset(2000)} aria-label="Full width image">Full</button>
    </div>}
    {selected && <button className="image-resize-handle" contentEditable={false} onPointerDown={beginResize} aria-label="Resize image" title="Drag to resize" />}
  </NodeViewWrapper>
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const value = Number(element.getAttribute('width'))
          return Number.isFinite(value) && value >= 120 && value <= 2000 ? value : null
        },
        renderHTML: (attributes) => attributes.width ? { width: attributes.width } : {},
      },
    }
  },
  addNodeView() { return ReactNodeViewRenderer(ResizableImageNode) },
})

function readScreenshot(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!screenshotTypes.has(file.type)) return reject(new Error('Use a PNG, JPEG, or WebP image.'))
    if (file.size > MAX_SCREENSHOT_BYTES) return reject(new Error('Screenshot must be 2 MB or smaller.'))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read this screenshot.'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

function parseCanvas(value: string): CanvasData {
  try { return JSON.parse(value) as CanvasData } catch { return { nodes: [], edges: [] } }
}

export default function Editor({ token, initialProject, onBack }: Props) {
  const [recovery] = useState(() => {
    const draft = loadDraft(initialProject.id)
    const mode = draftRecovery(draft, initialProject)
    return { draft, mode, content: mode === 'none' ? initialProject : draft! }
  })
  const initialCanvas = parseCanvas(recovery.content.canvasJson)
  const [project, setProject] = useState({
    ...initialProject,
    name: recovery.content.name,
    markdown: sanitizeRichText(recovery.content.markdown),
    canvasJson: canonicalCanvasJson(recovery.content.canvasJson),
  })
  const [nodes, setNodes] = useNodesState(initialCanvas.nodes)
  const [edges, setEdges] = useEdgesState(initialCanvas.edges)
  const [view, setView] = useState<View>('split')
  const [documentWidth, setDocumentWidth] = useState(45)
  const [linkEditorOpen, setLinkEditorOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('https://')
  const [linkError, setLinkError] = useState('')
  const [imageError, setImageError] = useState('')
  const [saveState, setSaveState] = useState<SaveState>(recovery.mode === 'conflict' ? 'conflict' : recovery.mode === 'resume' ? 'saving' : 'saved')
  const [conflict, setConflict] = useState<SaveConflict | null>(() => recovery.mode === 'conflict' ? { local: recovery.draft!, server: initialProject } : null)
  const latestProject = useRef(project)
  const editorBody = useRef<HTMLDivElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const saveInFlight = useRef(false)
  const saveQueued = useRef(false)
  const lastSavedSignature = useRef(contentSignature({ ...initialProject, canvasJson: canonicalCanvasJson(initialProject.canvasJson) }))
  const conflictActive = conflict !== null

  useEffect(() => { latestProject.current = project }, [project])

  const richTextEditor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      ResizableImage.configure({ allowBase64: true }),
    ],
    content: sanitizeRichText(recovery.content.markdown),
    editorProps: {
      attributes: {
        class: 'rich-text-content',
        'aria-label': 'Design documentation',
      },
      handlePaste: (view, event) => {
        const file = Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith('image/'))
        if (!file) return false
        event.preventDefault()
        setImageError('')
        void readScreenshot(file).then((src) => {
          const node = view.state.schema.nodes.image.create({ src, alt: 'Pasted screenshot' })
          view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView())
        }).catch((error: Error) => setImageError(error.message))
        return true
      },
    },
    onUpdate: ({ editor }) => {
      setProject((current) => ({ ...current, markdown: sanitizeRichText(editor.getHTML()) }))
    },
  })

  const insertScreenshot = async (file?: File) => {
    if (!file || !richTextEditor) return
    setImageError('')
    try {
      const src = await readScreenshot(file)
      richTextEditor.chain().focus().setImage({ src, alt: 'Screenshot' }).run()
    } catch (error) {
      setImageError((error as Error).message)
    } finally {
      if (imageInput.current) imageInput.current.value = ''
    }
  }

  const flushSave = useCallback(async () => {
    if (saveInFlight.current) { saveQueued.current = true; return }
    if (conflictActive) return
    const candidate = latestProject.current
    const candidateSignature = contentSignature(candidate)
    if (candidateSignature === lastSavedSignature.current) {
      clearDraft(candidate.id)
      setSaveState('saved')
      return
    }
    saveInFlight.current = true
    saveQueued.current = false
    setSaveState('saving')

    try {
      const saved = await api.saveProject(token, candidate)
      const merged = {
        ...latestProject.current,
        revision: saved.revision,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      }
      latestProject.current = merged
      lastSavedSignature.current = candidateSignature
      setProject((current) => ({
        ...current,
        revision: saved.revision,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt,
      }))
      if (contentSignature(latestProject.current) === candidateSignature) {
        clearDraft(saved.id)
        setSaveState('saved')
      } else {
        saveQueued.current = true
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        try {
          const serverProject = await api.getProject(token, latestProject.current.id)
          const local = createDraft(candidate)
          storeDraft(local)
          storeConflictBackup(local, serverProject)
          setConflict({ local, server: serverProject })
          setSaveState('conflict')
        } catch {
          setSaveState('error')
        }
      } else {
        setSaveState(navigator.onLine ? 'error' : 'offline')
      }
    } finally {
      saveInFlight.current = false
      if (saveQueued.current) window.setTimeout(() => void flushSave(), 0)
    }
  }, [conflictActive, token])

  useEffect(() => {
    latestProject.current = {
      ...latestProject.current,
      name: project.name,
      markdown: project.markdown,
      canvasJson: serializeCanvas(nodes, edges),
    }
    const signature = contentSignature(latestProject.current)
    if (signature === lastSavedSignature.current) {
      clearDraft(project.id)
      if (!conflictActive) setSaveState('saved')
      return
    }
    const draft = createDraft(latestProject.current)
    storeDraft(draft)
    if (conflictActive) {
      setConflict((current) => current && contentSignature(current.local) !== signature ? { ...current, local: draft } : current)
      setSaveState('conflict')
      return
    }
    setSaveState(navigator.onLine ? 'saving' : 'offline')
    const timer = window.setTimeout(() => void flushSave(), 900)
    return () => window.clearTimeout(timer)
  }, [nodes, edges, project.id, project.name, project.markdown, conflictActive, flushSave])

  useEffect(() => {
    const retryWhenOnline = () => { if (!conflictActive) void flushSave() }
    window.addEventListener('online', retryWhenOnline)
    return () => window.removeEventListener('online', retryWhenOnline)
  }, [conflictActive, flushSave])

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

  function useServerVersion() {
    if (!conflict) return
    const server = {
      ...conflict.server,
      canvasJson: canonicalCanvasJson(conflict.server.canvasJson),
      markdown: sanitizeRichText(conflict.server.markdown),
    }
    const canvas = parseCanvas(server.canvasJson)
    latestProject.current = server
    lastSavedSignature.current = contentSignature(server)
    richTextEditor?.commands.setContent(server.markdown, false)
    setNodes(canvas.nodes)
    setEdges(canvas.edges)
    setProject(server)
    clearDraft(server.id)
    setConflict(null)
    setSaveState('saved')
  }

  function keepLocalVersion() {
    if (!conflict) return
    latestProject.current = {
      ...latestProject.current,
      revision: conflict.server.revision,
      createdAt: conflict.server.createdAt,
      updatedAt: conflict.server.updatedAt,
    }
    setProject((current) => ({
      ...current,
      revision: conflict.server.revision,
      createdAt: conflict.server.createdAt,
      updatedAt: conflict.server.updatedAt,
    }))
    setConflict(null)
    setSaveState('saving')
  }

  function retryStaleSave() {
    setConflict(null)
    setSaveState('saving')
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
          <span className={`save-state ${saveState}`}>{saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : saveState === 'offline' ? 'Offline' : saveState === 'conflict' ? 'Conflict' : 'Saved'}</span>
          {(saveState === 'error' || saveState === 'offline') && <button className="save-retry" onClick={() => void flushSave()}>Retry</button>}
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
              <button onClick={() => imageInput.current?.click()} title="Insert screenshot" aria-label="Insert screenshot"><ImagePlus /></button>
              <input ref={imageInput} className="screenshot-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void insertScreenshot(event.target.files?.[0])} />
              {imageError && <span className="screenshot-error" role="alert">{imageError}</span>}
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
      {conflict && (
        <div className="conflict-backdrop">
          <section className="conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
            <p className="eyebrow">Save conflict</p>
            <h2 id="conflict-title">This project changed in another tab</h2>
            <p>Your local draft and the latest server version are both preserved in this browser. Choose which version should become active.</p>
            <div className="conflict-versions">
              <article><strong>Your local draft</strong><span>Based on revision {conflict.local.baseRevision}</span><small>Stored {new Date(conflict.local.storedAt).toLocaleString()}</small></article>
              <article><strong>Latest server version</strong><span>Revision {conflict.server.revision}</span><small>Saved {new Date(conflict.server.updatedAt).toLocaleString()}</small></article>
            </div>
            <div className="conflict-actions">
              <button onClick={retryStaleSave}>Retry original save</button>
              <button onClick={useServerVersion}>Use server version</button>
              <button className="primary-button compact" onClick={keepLocalVersion}>Keep my version</button>
            </div>
            <small className="conflict-note">Keeping your version explicitly saves it over the current server version. A recovery copy of both versions remains in local browser storage.</small>
          </section>
        </div>
      )}
    </main>
  )
}
