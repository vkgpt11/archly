import { useState } from 'react'
import { X } from 'lucide-react'
import type { Edge, Node, Viewport } from '@xyflow/react'
import type { Project } from '../types'

type Props = { project: Project; nodes: Node[]; edges: Edge[]; viewport: Viewport; onClose: () => void }
type ExportChoice = 'png' | 'svg' | 'markdown' | 'source' | 'clipboard'

export default function ProjectExportDialog({ project, nodes, edges, viewport, onClose }: Props) {
  const [selectionOnly, setSelectionOnly] = useState(false)
  const [message, setMessage] = useState('')

  async function runExport(format: ExportChoice) {
    setMessage('')
    try {
      const exports = await import('../diagramExport')
      if (format === 'clipboard') await exports.copyDiagramToClipboard(selectionOnly)
      else await exports.exportProject({ ...project, canvasJson: JSON.stringify({ nodes, edges, viewport }) }, format, selectionOnly)
      setMessage(format === 'clipboard' ? 'Diagram copied.' : 'Export created.')
    } catch (error) { setMessage((error as Error).message) }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">Download or copy</p><h2 id="export-title">Export project</h2></div><button className="modal-close" onClick={onClose} aria-label="Close export"><X /></button></header>
      <label className="selection-export"><input type="checkbox" checked={selectionOnly} onChange={(event) => setSelectionOnly(event.target.checked)} /> Selection only</label>
      <div className="export-grid"><button onClick={() => void runExport('png')}><strong>PNG</strong><span>Raster image</span></button><button onClick={() => void runExport('svg')}><strong>SVG</strong><span>Vector image</span></button><button onClick={() => void runExport('markdown')}><strong>Markdown</strong><span>Documentation source</span></button><button onClick={() => void runExport('source')}><strong>Archly source</strong><span>Editable JSON</span></button><button onClick={() => void runExport('clipboard')}><strong>Copy image</strong><span>PNG to clipboard</span></button></div>
      {message && <p className="fine-print" role="status">{message}</p>}
    </section>
  </div>
}
