import { describe, expect, it } from 'vitest'
import { projectEmbeddedView } from './embedProjection'

const canvas = { nodes: [], edges: [], diagramCode: 'service api "API"\ndatabase db "Database"\napi -> db\nview dataflow public {\n include api\n}', diagramViewStates: { public: { positions: { api: { x: 42, y: 83 } } } } }
describe('stable published view', () => {
  it('compiles only the bound view and preserves its saved positions', () => {
    const result = projectEmbeddedView({ canvas, view: 'public', variant: '' })
    expect(result.nodes.map((node) => node.id)).toEqual(['api'])
    expect(result.nodes[0].position).toEqual({ x: 42, y: 83 })
    expect(result.edges).toEqual([])
    expect(result).not.toHaveProperty('diagramCode')
  })
  it('never substitutes a different view when the published view is deleted', () => {
    expect(() => projectEmbeddedView({ canvas, view: 'deleted', variant: '' })).toThrow()
  })
})
