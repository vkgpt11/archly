import { applyNodeChanges, type Edge, type Node, type NodeChange } from '@xyflow/react'
import { fitDiagramBoundaries } from '../diagramLayout'

export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

export function groupSelectedNodes(nodes: Node[], groupId: string): Node[] {
  return nodes.map((node) => node.selected ? { ...node, data: { ...node.data, groupId } } : node)
}

export function ungroupSelectedNodes(nodes: Node[]): Node[] {
  const groupIds = new Set(nodes.filter((node) => node.selected).map((node) => node.data?.groupId).filter(Boolean))
  if (!groupIds.size) return nodes
  return nodes.map((node) => groupIds.has(node.data?.groupId) ? { ...node, data: { ...node.data, groupId: undefined } } : node)
}

export function selectPersistentGroup(nodes: Node[], selectedNode: Node): Node[] {
  const groupId = selectedNode.data?.groupId
  if (!groupId) return nodes
  return nodes.map((node) => ({ ...node, selected: node.data?.groupId === groupId }))
}

export function applyGroupAwareNodeChanges(changes: NodeChange[], nodes: Node[]): Node[] {
  const expanded = [...changes]
  const changedIds = new Set(changes.filter((change) => change.type === 'position').map((change) => change.id))
  for (const change of changes) {
    if (change.type !== 'position' || !change.position) continue
    const moved = nodes.find((node) => node.id === change.id)
    const groupId = moved?.data?.groupId
    if (!moved || !groupId) continue
    const delta = { x: change.position.x - moved.position.x, y: change.position.y - moved.position.y }
    for (const member of nodes.filter((node) => node.data?.groupId === groupId && !changedIds.has(node.id))) {
      expanded.push({ type: 'position', id: member.id, dragging: change.dragging, position: { x: member.position.x + delta.x, y: member.position.y + delta.y } })
      changedIds.add(member.id)
    }
  }
  for (const change of changes) {
    if (change.type !== 'position' || !change.position) continue
    const moved = nodes.find((node) => node.id === change.id)
    if (moved?.data?.kind !== 'container') continue
    const delta = { x: change.position.x - moved.position.x, y: change.position.y - moved.position.y }
    const descendants = nodes.filter((node) => {
      let parentId = node.data?.containerId
      while (parentId) {
        if (parentId === moved.id) return true
        parentId = nodes.find((candidate) => candidate.id === parentId)?.data?.containerId
      }
      return false
    })
    for (const child of descendants.filter((node) => !changedIds.has(node.id))) {
      expanded.push({ type: 'position', id: child.id, dragging: change.dragging, position: { x: child.position.x + delta.x, y: child.position.y + delta.y } })
      changedIds.add(child.id)
    }
  }
  const next = applyNodeChanges(expanded, nodes)
  return changes.some((change) => change.type === 'position') && nodes.some((node) => node.data.boundaryType) ? fitDiagramBoundaries(next) : next
}

function nodeSize(node: Node) {
  return { width: Number(node.measured?.width || node.width || node.style?.width || 0), height: Number(node.measured?.height || node.height || node.style?.height || 0) }
}

export function assignNodeToContainingContainer(nodes: Node[], nodeId: string): Node[] {
  const moved = nodes.find((node) => node.id === nodeId)
  if (!moved) return nodes
  const size = nodeSize(moved)
  const center = { x: moved.position.x + size.width / 2, y: moved.position.y + size.height / 2 }
  const containers = nodes.filter((node) => node.id !== nodeId && node.data?.kind === 'container').filter((node) => {
    let parentId = node.data?.containerId
    while (parentId) {
      if (parentId === nodeId) return false
      parentId = nodes.find((candidate) => candidate.id === parentId)?.data?.containerId
    }
    const bounds = nodeSize(node)
    return center.x >= node.position.x && center.x <= node.position.x + bounds.width
      && center.y >= node.position.y && center.y <= node.position.y + bounds.height
  }).sort((a, b) => {
    const aSize = nodeSize(a); const bSize = nodeSize(b)
    return aSize.width * aSize.height - bSize.width * bSize.height
  })
  const containerId = containers[0]?.id
  return nodes.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, containerId } } : node)
}

export function moveSelectedCanvasNodes(nodes: Node[], dx: number, dy: number): Node[] {
  const changes: NodeChange[] = nodes.filter((node) => node.selected && !node.data?.locked).map((node) => ({ type: 'position', id: node.id, position: { x: node.position.x + dx, y: node.position.y + dy } }))
  return changes.length ? applyGroupAwareNodeChanges(changes, nodes) : nodes
}

export function reorderSelectedCanvasNodes(nodes: Node[], direction: 'front' | 'back'): Node[] {
  const selected = nodes.filter((node) => node.selected)
  if (!selected.length) return nodes
  const zValues = nodes.map((node) => Number(node.zIndex || 0))
  const zIndex = direction === 'front' ? Math.max(...zValues) + 1 : Math.min(...zValues) - 1
  return nodes.map((node) => node.selected ? { ...node, zIndex } : node)
}

export function equalizeSelectedCanvasNodes(nodes: Node[], dimension: 'width' | 'height'): Node[] {
  const selected = nodes.filter((node) => node.selected && !node.data?.locked)
  if (selected.length < 2) return nodes
  const value = Math.max(...selected.map((node) => Number(node.measured?.[dimension] || node[dimension] || node.style?.[dimension] || 0)))
  return nodes.map((node) => !selected.some((selectedNode) => selectedNode.id === node.id) ? node : {
    ...node,
    [dimension]: value,
    style: { ...node.style, [dimension]: value },
    data: { ...node.data, manualSize: true },
  })
}

export function alignCanvasNodes(nodes: Node[], alignment: Alignment): Node[] {
  const selected = nodes.filter((node) => node.selected)
  if (selected.length < 2) return nodes
  const width = (node: Node) => Number(node.measured?.width || node.width || node.style?.width || 0)
  const height = (node: Node) => Number(node.measured?.height || node.height || node.style?.height || 0)
  const value = alignment === 'left' ? Math.min(...selected.map((node) => node.position.x))
    : alignment === 'right' ? Math.max(...selected.map((node) => node.position.x + width(node)))
    : alignment === 'center' ? selected.reduce((sum, node) => sum + node.position.x + width(node) / 2, 0) / selected.length
    : alignment === 'top' ? Math.min(...selected.map((node) => node.position.y))
    : alignment === 'bottom' ? Math.max(...selected.map((node) => node.position.y + height(node)))
    : selected.reduce((sum, node) => sum + node.position.y + height(node) / 2, 0) / selected.length
  return nodes.map((node) => !node.selected ? node : { ...node, position: alignment === 'left' ? { ...node.position, x: value }
    : alignment === 'right' ? { ...node.position, x: value - width(node) }
    : alignment === 'center' ? { ...node.position, x: value - width(node) / 2 }
    : alignment === 'top' ? { ...node.position, y: value }
    : alignment === 'bottom' ? { ...node.position, y: value - height(node) }
    : { ...node.position, y: value - height(node) / 2 } })
}

export function arrangeCanvasNodes(nodes: Node[], edges: Edge[], direction: 'horizontal' | 'vertical'): Node[] {
  const candidates = nodes.filter((node) => node.selected && !node.data?.locked)
  if (candidates.length < 2) return nodes
  const ids = new Set(candidates.map((node) => node.id))
  const rank = new Map(candidates.map((node) => [node.id, 0]))
  for (let pass = 0; pass < candidates.length; pass++) {
    let changed = false
    for (const edge of edges.filter((item) => ids.has(item.source) && ids.has(item.target))) {
      const next = Math.min(candidates.length - 1, (rank.get(edge.source) || 0) + 1)
      if (next > (rank.get(edge.target) || 0)) { rank.set(edge.target, next); changed = true }
    }
    if (!changed) break
  }
  const originX = Math.min(...candidates.map((node) => node.position.x))
  const originY = Math.min(...candidates.map((node) => node.position.y))
  const lanes = new Map<number, number>()
  return nodes.map((node) => {
    if (!ids.has(node.id)) return node
    const level = rank.get(node.id) || 0
    const lane = lanes.get(level) || 0
    lanes.set(level, lane + 1)
    return { ...node, position: direction === 'horizontal' ? { x: originX + level * 200, y: originY + lane * 120 } : { x: originX + lane * 180, y: originY + level * 120 } }
  })
}

export function distributeCanvasNodes(nodes: Node[], direction: 'horizontal' | 'vertical'): Node[] {
  const selected = nodes.filter((node) => node.selected && !node.data?.locked).sort((a, b) => direction === 'horizontal' ? a.position.x - b.position.x : a.position.y - b.position.y)
  if (selected.length < 3) return nodes
  const first = direction === 'horizontal' ? selected[0].position.x : selected[0].position.y
  const last = direction === 'horizontal' ? selected.at(-1)!.position.x : selected.at(-1)!.position.y
  const spacing = (last - first) / (selected.length - 1)
  const positions = new Map(selected.map((node, index) => [node.id, first + spacing * index]))
  return nodes.map((node) => !positions.has(node.id) ? node : ({ ...node, position: direction === 'horizontal' ? { ...node.position, x: positions.get(node.id)! } : { ...node.position, y: positions.get(node.id)! } }))
}
