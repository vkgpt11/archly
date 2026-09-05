import { useState } from 'react'
import type { Edge, Node } from '@xyflow/react'
import { defaultLayout, descendantIds, fitDiagramBoundaries, layoutDiagram, type LayoutOptions } from '../diagramLayout'

export default function DiagramLayoutPanel({ nodes, edges, apply, close }: { nodes: Node[]; edges: Edge[]; apply: (nodes: Node[]) => void; close: () => void }) {
  const [options, setOptions] = useState<LayoutOptions>({ ...defaultLayout, ...nodes[0]?.data.diagramLayout as Partial<LayoutOptions> })
  const [scope, setScope] = useState('all')
  const [preview, setPreview] = useState<Node[] | null>(null)
  const [error, setError] = useState('')
  const change = (patch: Partial<LayoutOptions>) => { setOptions({ ...options, ...patch }); setPreview(null) }
  function prepare() {
    try {
      const ids = scope === 'all' ? new Set(nodes.map((node) => node.id)) : descendantIds(nodes, new Set(nodes.filter((node) => node.selected).map((node) => node.id)))
      if (!ids.size) throw new Error('Select at least one component or boundary.')
      const subset = nodes.filter((node) => ids.has(node.id)).map((node) => ({ ...node, data: { ...node.data, diagramLayout: options, containerId: ids.has(String(node.data.containerId)) ? node.data.containerId : undefined } }))
      const arranged = layoutDiagram(subset, edges, options)
      const offset = scope === 'all' ? { x: 0, y: 0 } : { x: Math.min(...subset.map((node) => node.position.x)), y: Math.min(...subset.map((node) => node.position.y)) }
      const byId = new Map(arranged.map((node) => [node.id, node]))
      setPreview(fitDiagramBoundaries(nodes.map((node) => {
        const next = byId.get(node.id)
        return next ? { ...next, position: { x: next.position.x + offset.x, y: next.position.y + offset.y }, data: { ...next.data, containerId: node.data.containerId } } : node
      })))
      setError('')
    } catch (failure) { setError((failure as Error).message) }
  }
  const minX = Math.min(0, ...(preview || []).map((node) => node.position.x))
  const minY = Math.min(0, ...(preview || []).map((node) => node.position.y))
  const width = Math.max(1, ...(preview || []).map((node) => node.position.x + Number(node.style?.width || 82) - minX))
  const height = Math.max(1, ...(preview || []).map((node) => node.position.y + Number(node.style?.height || 42) - minY))
  return <aside className="canvas-properties" aria-label="Automatic layout">
    <header><strong>Automatic layout</strong><button onClick={close} aria-label="Close layout">×</button></header>
    <label>Scope<select aria-label="Layout scope" value={scope} onChange={(event) => { setScope(event.target.value); setPreview(null) }}><option value="all">Whole canvas</option><option value="selection">Selection / selected boundary</option></select></label>
    <label>Direction<select aria-label="Layout direction" value={options.direction} onChange={(event) => change({ direction: event.target.value as LayoutOptions['direction'] })}>{['right', 'left', 'down', 'up'].map((value) => <option key={value}>{value}</option>)}</select></label>
    {(['horizontal', 'vertical', 'rank'] as const).map((key) => <label key={key}>{key} spacing<input aria-label={`Layout ${key} spacing`} type="number" min="16" max="1000" value={options[key]} onChange={(event) => { if (event.target.value && event.target.validity.valid) change({ [key]: Number(event.target.value) }) }} /></label>)}
    <p>Applying replaces saved positions in this scope. Preview does not change or save the canvas.</p>
    <button onClick={prepare}>Preview layout</button>
    {error && <p role="alert">{error}</p>}
    {preview && <svg role="img" aria-label="Layout preview" viewBox={`${minX - 10} ${minY - 10} ${width + 20} ${height + 20}`} width="240" height="160">{preview.map((node) => <rect key={node.id} x={node.position.x} y={node.position.y} width={Number(node.style?.width || 82)} height={Number(node.style?.height || 42)} fill={node.data.kind === 'container' ? 'none' : '#dbeafe'} stroke="#2563eb"><title>{String(node.data.label)}</title></rect>)}</svg>}
    <button disabled={!preview} onClick={() => { if (preview) apply(preview); close() }}>Apply layout</button>
    <button onClick={close}>Cancel layout</button>
  </aside>
}
