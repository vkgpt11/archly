import type { Edge, Node } from '@xyflow/react'
import { numberOption, routingValue, diagramRoutings } from './diagramStyles'
export type LayoutOptions = { direction: 'right' | 'left' | 'down' | 'up'; horizontal: number; vertical: number; rank: number; routing: string; version: 1 }
export const defaultLayout: LayoutOptions = { direction: 'right', horizontal: 72, vertical: 72, rank: 72, routing: 'smoothstep', version: 1 }
export function readLayout(options: Record<string, string>, current: LayoutOptions): LayoutOptions {
  const next = { ...current }
  for (const [key, value] of Object.entries(options)) {
    if (key === 'direction') {
      if (!['left', 'right', 'up', 'down'].includes(value)) throw new Error('direction must be right, left, down, or up')
      next.direction = value as LayoutOptions['direction']
    } else if (key === 'routing') {
      next.routing = routingValue(value)
      if (!(diagramRoutings as readonly string[]).includes(next.routing)) throw new Error('unsupported layout routing')
    } else if (key === 'horizontal-spacing' || key === 'vertical-spacing' || key === 'rank-separation') {
      next[key === 'horizontal-spacing' ? 'horizontal' : key === 'vertical-spacing' ? 'vertical' : 'rank'] = numberOption(value, 16, 1000, key)
    } else throw new Error(`unknown layout property “${key}”`)
  }
  return next
}
const size = (node: Node, axis: 'width' | 'height') => Number(node.style?.[axis] || node[axis] || (axis === 'width' ? 82 : 42))
export function descendantIds(nodes: Node[], ids: Set<string>): Set<string> {
  const result = new Set(ids)
  let changed = true
  while (changed) {
    changed = false
    for (const node of nodes) if (result.has(String(node.data.containerId)) && !result.has(node.id)) { result.add(node.id); changed = true }
  }
  return result
}
export function fitDiagramBoundaries(nodes: Node[], pinned = new Map<string, number>()): Node[] {
  const result = nodes.map((node) => ({ ...node, position: { ...node.position }, style: { ...node.style } }))
  const fit = (parent: Node, ancestors: Set<string>) => {
    if (ancestors.has(parent.id)) throw new Error('Cyclic boundary membership')
    const children = result.filter((node) => node.data.containerId === parent.id)
    children.filter((node) => node.data.kind === 'container').forEach((node) => fit(node, new Set([...ancestors, parent.id])))
    if (!children.length) return
    const padding = Number(parent.data.padding || 48)
    const minX = Math.min(...children.map((node) => node.position.x)) - padding
    const minY = Math.min(...children.map((node) => node.position.y)) - padding
    if (pinned.has(parent.id) && (minX < parent.position.x || minY < parent.position.y)) throw new Error(`Line ${pinned.get(parent.id)}: pinned boundary “${parent.id}” cannot contain its children with the configured padding`)
    parent.position = { x: Math.min(parent.position.x, minX), y: Math.min(parent.position.y, minY) }
    parent.style = { ...parent.style, width: Math.max(Number(parent.data.customWidth || 280), ...children.map((node) => node.position.x + size(node, 'width') + padding - parent.position.x)), height: Math.max(Number(parent.data.customHeight || 180), ...children.map((node) => node.position.y + size(node, 'height') + padding - parent.position.y)) }
  }
  result.filter((node) => node.data.kind === 'container' && !node.data.containerId).forEach((node) => fit(node, new Set()))
  return result
}
export function layoutDiagram(nodes: Node[], edges: Pick<Edge, 'source' | 'target'>[], options: LayoutOptions): Node[] {
  const result = nodes.map((node) => ({ ...node, position: { ...node.position }, style: { ...node.style } }))
  const horizontal = options.direction === 'right' || options.direction === 'left'
  const reverse = options.direction === 'left' || options.direction === 'up'
  const move = (node: Node, x: number, y: number) => {
    const dx = x - node.position.x; const dy = y - node.position.y
    const ids = descendantIds(result, new Set([node.id]))
    for (const child of result.filter((item) => ids.has(item.id))) child.position = { x: child.position.x + dx, y: child.position.y + dy }
  }
  const scope = (parent?: Node, depth = 0) => {
    if (depth > 64) throw new Error('Boundary nesting exceeds 64 levels')
    const direct = result.filter((node) => node.data.containerId === parent?.id)
    direct.filter((node) => node.data.kind === 'container').forEach((node) => scope(node, depth + 1))
    const ids = new Set(direct.map((node) => node.id))
    const links = edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target) && edge.source !== edge.target)
    const ranks = new Map(direct.map((node, index) => [node.id, links.length ? 0 : index]))
    const pending = new Map(direct.map((node) => [node.id, links.filter((edge) => edge.target === node.id).length]))
    const queue = direct.filter((node) => pending.get(node.id) === 0).map((node) => node.id)
    for (const id of queue) for (const edge of links.filter((item) => item.source === id)) {
      ranks.set(edge.target, Math.max(ranks.get(edge.target)!, ranks.get(id)! + 1))
      pending.set(edge.target, pending.get(edge.target)! - 1)
      if (pending.get(edge.target) === 0) queue.push(edge.target)
    }
    const padding = parent ? Number(parent.data.padding || 48) : 0
    let cursor = padding
    for (const rank of [...new Set(ranks.values())].sort((a, b) => a - b)) {
      const members = direct.filter((node) => ranks.get(node.id) === rank)
      const extent = Math.max(...members.map((node) => size(node, horizontal ? 'width' : 'height')))
      let lane = padding
      for (const node of members) {
        move(node, horizontal ? cursor : lane, horizontal ? lane : cursor)
        lane += size(node, horizontal ? 'height' : 'width') + (horizontal ? options.vertical : options.horizontal)
      }
      cursor += extent + Math.max(options.rank, horizontal ? options.horizontal : options.vertical)
    }
    if (reverse) for (const node of direct) move(node, horizontal ? cursor - options.rank - node.position.x - size(node, 'width') + padding : node.position.x, horizontal ? node.position.y : cursor - options.rank - node.position.y - size(node, 'height') + padding)
    if (parent) {
      parent.position = { x: 0, y: 0 }
      parent.style = { ...parent.style, width: Math.max(Number(parent.data.customWidth || 280), ...direct.map((node) => node.position.x + size(node, 'width') + padding)), height: Math.max(Number(parent.data.customHeight || 180), ...direct.map((node) => node.position.y + size(node, 'height') + padding)) }
    }
  }
  scope()
  return result
}
