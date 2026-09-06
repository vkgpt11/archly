import { describe, expect, it } from 'vitest'
import type { Edge, Node } from '@xyflow/react'
import { compareDiagramSnapshots } from './diagramDiff'

const node = (id: string, label: string, position = { x: 0, y: 0 }, data: Record<string, unknown> = {}): Node => ({ id, type: 'architecture', position, data: { kind: 'service', label, ...data } })
const edge = (id: string, source: string, target: string, label: string, data: Record<string, unknown> = {}): Edge => ({ id, source, target, type: 'editable', label, data })

describe('compareDiagramSnapshots', () => {
  it('reports structural, visual, and metadata changes with source lines', () => {
    const before = { nodes: [node('api', 'API'), node('db', 'DB', { x: 100, y: 0 })], edges: [edge('link', 'api', 'db', 'reads')] }
    const after = { nodes: [node('api', 'Gateway', { x: 24, y: 32 }, { fill: '#fff', description: 'new', containerId: 'boundary' }), node('new', 'Worker')], edges: [edge('link', 'api', 'new', 'writes', { protocol: 'https' })] }
    const result = compareDiagramSnapshots(before, after, 'service api "Gateway"\nservice new "Worker"')
    expect(result.items.map((item) => item.kind)).toEqual(expect.arrayContaining(['added', 'removed', 'moved', 'renamed', 'restyled', 'reparented', 'metadata']))
    expect(result.items.find((item) => item.elementId === 'api')?.sourceLine).toBe(1)
  })

  it('bounds oversized comparisons without mutating either snapshot', () => {
    const nodes = Array.from({ length: 751 }, (_, index) => node(`n${index}`, `N${index}`))
    const result = compareDiagramSnapshots({ nodes, edges: [] }, { nodes, edges: [] })
    expect(result.truncated).toBe(true)
    expect(result.items).toHaveLength(0)
  })
})
