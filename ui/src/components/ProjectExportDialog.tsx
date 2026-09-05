import { useState } from 'react'
import { X } from 'lucide-react'
import type { Edge, Node, Viewport } from '@xyflow/react'
import type { Project } from '../types'
import { buildInterchange, type InterchangeFormat, type InterchangeResult } from '../diagramInterchange'

type Props = { project: Project; nodes: Node[]; edges: Edge[]; viewport: Viewport; activeVariant?: string; onClose: () => void }
type ExportChoice = 'png' | 'svg' | 'markdown' | 'source' | 'clipboard'

export default function ProjectExportDialog({ project, nodes, edges, viewport, activeVariant, onClose }: Props) {
  const [selectionOnly, setSelectionOnly] = useState(false)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<InterchangeResult | null>(null)
  function prepare(format: InterchangeFormat) {
    try { setPreview(buildInterchange(format, nodes, edges, selectionOnly, activeVariant)); setMessage('') } catch (error) { setMessage((error as Error).message) }
  }

  async function runExport(format: ExportChoice) {
    setMessage('')
    try {
      const exports = await import('../diagramExport')
      if (format === 'clipboard') await exports.copyDiagramToClipboard({ ...project, canvasJson: JSON.stringify({ nodes, edges, viewport, activeVariant }) }, selectionOnly)
      else await exports.exportProject({ ...project, canvasJson: JSON.stringify({ nodes, edges, viewport, activeVariant }) }, format, selectionOnly)
      setMessage(format === 'clipboard' ? 'Diagram copied.' : 'Export created.')
    } catch (error) { setMessage((error as Error).message) }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">Download or copy</p><h2 id="export-title">Export project</h2></div><button className="modal-close" onClick={onClose} aria-label="Close export"><X /></button></header>
      <label className="selection-export"><input type="checkbox" checked={selectionOnly} onChange={(event) => { setSelectionOnly(event.target.checked); setPreview(null) }} /> Selection only</label>
      <div className="export-grid"><button onClick={() => void runExport('png')}><strong>PNG</strong><span>Raster image</span></button><button onClick={() => void runExport('svg')}><strong>SVG</strong><span>Vector image</span></button><button onClick={() => void runExport('markdown')}><strong>Markdown</strong><span>Documentation source</span></button><button onClick={() => void runExport('source')}><strong>Archly source</strong><span>Editable JSON</span></button><button onClick={() => void runExport('clipboard')}><strong>Copy image</strong><span>PNG to clipboard</span></button></div>
      <p className="fine-print">Clipboard image support depends on browser and permission settings. Download PNG if copying is unavailable.</p>
      {message && <p className="fine-print" role="status">{message}</p>}
      <div className="export-grid">{(['mermaid', 'plantuml', 'd2', 'metadata'] as const).map((format) => <button key={format} onClick={() => prepare(format)}>{format === 'metadata' ? 'Architecture metadata' : format === 'plantuml' ? 'PlantUML' : format === 'mermaid' ? 'Mermaid' : 'D2'}</button>)}</div>
      {preview && <section aria-label="Text export preview">
        {preview.warnings.map((warning) => <p key={warning} role="note">{warning}</p>)}
        <textarea aria-label="Exported diagram source" value={preview.text} readOnly rows={6} />
        <button onClick={() => { void import('../diagramExport').then((module) => module.downloadTextExport(preview.text, project.name, preview.extension)).catch((error: Error) => setMessage(error.message)) }}>Download text export</button>
        <button onClick={() => { void Promise.resolve().then(() => navigator.clipboard.writeText(preview.text)).then(() => setMessage('Source copied.')).catch(() => setMessage('Clipboard unavailable. Download the file instead.')) }}>Copy source</button>
      </section>}
    </section>
  </div>
}
