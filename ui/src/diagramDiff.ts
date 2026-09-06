import type { Edge, Node } from '@xyflow/react'

export type DiagramDiffKind = 'added' | 'removed' | 'moved' | 'renamed' | 'restyled' | 'reparented' | 'metadata'
export type DiagramDiffItem = {
  id: string
  elementId: string
  elementType: 'component' | 'connection'
  kind: DiagramDiffKind
  label: string
  detail: string
  sourceLine?: number
}
export type DiagramSnapshot = { name: string; revision?: number; nodes: Node[]; edges: Edge[]; createdAt: string; diagramCode?: string }
export type DiagramDiffResult = { items: DiagramDiffItem[]; truncated: boolean }

const MAX_DIFF_ELEMENTS = 1500
const MAX_DIFF_ITEMS = 500
const styleKeys = ['fill', 'border', 'textColor', 'shape', 'opacity', 'borderWidth', 'customWidth', 'customHeight', 'padding']
const metadataKeys = ['kind', 'iconId', 'description', 'protocol', 'port', 'async', 'encrypted', 'direction', 'routing', 'dataClassification', 'dataStore', 'processingStep', 'trustBoundary']

function valueOf(value: unknown) { return JSON.stringify(value ?? null) }
function labelOf(item: Node | Edge) { return 'source' in item ? String(item.label || item.id) : String(item.data?.label || item.id) }
function sourceLine(source: string, id: string) {
  if (!source) return undefined
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`\\b${escaped}\\b`))
  if (!match || match.index === undefined) return undefined
  return source.slice(0, match.index).split(/\r?\n/).length
}
function moved(a: Node, b: Node) { return Math.round(a.position.x) !== Math.round(b.position.x) || Math.round(a.position.y) !== Math.round(b.position.y) }
function changed(keys: string[], before: Record<string, unknown> | undefined, after: Record<string, unknown> | undefined) {
  return keys.some((key) => valueOf(before?.[key]) !== valueOf(after?.[key]))
}

export function compareDiagramSnapshots(before: Pick<DiagramSnapshot, 'nodes' | 'edges'>, after: Pick<DiagramSnapshot, 'nodes' | 'edges'>, source = ''): DiagramDiffResult {
  const tooLarge = before.nodes.length + before.edges.length + after.nodes.length + after.edges.length > MAX_DIFF_ELEMENTS
  const items: DiagramDiffItem[] = []
  if (tooLarge) return { items: [], truncated: true }
  const beforeNodes = new Map(before.nodes.map((node) => [node.id, node]))
  const afterNodes = new Map(after.nodes.map((node) => [node.id, node]))
  const beforeEdges = new Map(before.edges.map((edge) => [edge.id, edge]))
  const afterEdges = new Map(after.edges.map((edge) => [edge.id, edge]))
  const push = (item: Omit<DiagramDiffItem, 'id' | 'sourceLine'>) => {
    if (items.length >= MAX_DIFF_ITEMS) return
    items.push({ ...item, id: `${item.kind}:${item.elementType}:${item.elementId}:${items.length}`, sourceLine: sourceLine(source, item.elementId) })
  }
  for (const [id, node] of afterNodes) if (!beforeNodes.has(id)) push({ elementId: id, elementType: 'component', kind: 'added', label: labelOf(node), detail: 'Component was added.' })
  for (const [id, node] of beforeNodes) if (!afterNodes.has(id)) push({ elementId: id, elementType: 'component', kind: 'removed', label: labelOf(node), detail: 'Component was removed.' })
  for (const [id, afterNode] of afterNodes) {
    const beforeNode = beforeNodes.get(id)
    if (!beforeNode) continue
    if (moved(beforeNode, afterNode)) push({ elementId: id, elementType: 'component', kind: 'moved', label: labelOf(afterNode), detail: `Moved from ${Math.round(beforeNode.position.x)},${Math.round(beforeNode.position.y)} to ${Math.round(afterNode.position.x)},${Math.round(afterNode.position.y)}.` })
    if (labelOf(beforeNode) !== labelOf(afterNode)) push({ elementId: id, elementType: 'component', kind: 'renamed', label: labelOf(afterNode), detail: `Renamed from "${labelOf(beforeNode)}".` })
    if (String(beforeNode.data?.containerId || '') !== String(afterNode.data?.containerId || '')) push({ elementId: id, elementType: 'component', kind: 'reparented', label: labelOf(afterNode), detail: 'Boundary membership changed.' })
    if (changed(styleKeys, beforeNode.data as Record<string, unknown>, afterNode.data as Record<string, unknown>) || valueOf(beforeNode.style) !== valueOf(afterNode.style)) push({ elementId: id, elementType: 'component', kind: 'restyled', label: labelOf(afterNode), detail: 'Visual styling changed.' })
    if (changed(metadataKeys, beforeNode.data as Record<string, unknown>, afterNode.data as Record<string, unknown>)) push({ elementId: id, elementType: 'component', kind: 'metadata', label: labelOf(afterNode), detail: 'Component metadata changed.' })
  }
  for (const [id, edge] of afterEdges) if (!beforeEdges.has(id)) push({ elementId: id, elementType: 'connection', kind: 'added', label: labelOf(edge), detail: 'Connection was added.' })
  for (const [id, edge] of beforeEdges) if (!afterEdges.has(id)) push({ elementId: id, elementType: 'connection', kind: 'removed', label: labelOf(edge), detail: 'Connection was removed.' })
  for (const [id, afterEdge] of afterEdges) {
    const beforeEdge = beforeEdges.get(id)
    if (!beforeEdge) continue
    if (beforeEdge.source !== afterEdge.source || beforeEdge.target !== afterEdge.target) push({ elementId: id, elementType: 'connection', kind: 'reparented', label: labelOf(afterEdge), detail: 'Connection endpoints changed.' })
    if (labelOf(beforeEdge) !== labelOf(afterEdge)) push({ elementId: id, elementType: 'connection', kind: 'renamed', label: labelOf(afterEdge), detail: `Connection label changed from "${labelOf(beforeEdge)}".` })
    if (valueOf(beforeEdge.style) !== valueOf(afterEdge.style) || valueOf(beforeEdge.markerStart) !== valueOf(afterEdge.markerStart) || valueOf(beforeEdge.markerEnd) !== valueOf(afterEdge.markerEnd)) push({ elementId: id, elementType: 'connection', kind: 'restyled', label: labelOf(afterEdge), detail: 'Connection style changed.' })
    if (changed(metadataKeys, beforeEdge.data as Record<string, unknown>, afterEdge.data as Record<string, unknown>)) push({ elementId: id, elementType: 'connection', kind: 'metadata', label: labelOf(afterEdge), detail: 'Connection metadata changed.' })
  }
  return { items, truncated: items.length >= MAX_DIFF_ITEMS }
}
