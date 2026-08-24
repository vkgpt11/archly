import type { Edge, Node } from '@xyflow/react'

export function clearNodeSelection(nodes: Node[]): Node[] {
  return nodes.map((node) => node.selected ? { ...node, selected: false } : node)
}

export function selectOnlyEdge(edges: Edge[], edgeId: string): Edge[] {
  return edges.map((edge) => ({ ...edge, selected: edge.id === edgeId }))
}
