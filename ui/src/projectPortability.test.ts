import { describe, expect, it } from 'vitest'
import { createProjectPackage, parseProjectPackage, MAX_PACKAGE_BYTES } from './projectPortability'
import { serializeCanvas } from './projectPersistence'

const nodes = [{ id: 'group', position: { x: 1, y: 2 }, data: { kind: 'container', label: 'Group' } }, { id: 'api', parentId: 'group', position: { x: 3, y: 4 }, data: { label: 'API' }, selected: true }]
const edges = [{ id: 'edge', source: 'group', target: 'api', data: { protocol: 'HTTPS' } }]
const source = '# exact source\r\nservice api "API"\r\n'
const project = { name: 'Portable', markdown: '<h1>Design</h1><p>Notes</p>', canvasJson: serializeCanvas(nodes, edges, { x: 10, y: 20, zoom: 0.8 }, source, 'prod', [{ id: 'shared', version: '1.2', source: '# module' }], 'flow', { flow: { positions: { api: { x: 5, y: 6 } } } }, [{ name: 'Before', createdAt: '2026-09-08T00:00:00Z', nodes, edges, diagramCode: source }]) }

describe('project backup portability', () => {
  it('round trips all durable content without ownership or server metadata', () => {
    const backup = createProjectPackage({ ...project, ...{ id: 'private', shareToken: 'secret', revision: 9 } })
    expect(JSON.stringify(backup)).not.toContain('secret')
    const restored = parseProjectPackage(JSON.stringify(backup))
    expect(restored.package.project).toEqual(project)
    expect(restored.counts).toMatchObject({ modules: 1, views: 1, snapshots: 1, nodes: 2 })
    expect(JSON.parse(restored.package.project.canvasJson).diagramCode).toBe(source)
  })
  it('includes selection parents and selected connection endpoints with no dangling edges', () => {
    const backup = createProjectPackage({ ...project, canvasJson: JSON.stringify({ nodes, edges }) }, true)
    const parsed = parseProjectPackage(JSON.stringify(backup))
    expect(parsed.package.scope).toBe('selection')
    expect(parsed.counts.nodes).toBe(2)
    expect(parsed.package.project.markdown).toBe('')
    expect(parsed.warnings).toContain('Partial selection: this is not a complete project backup.')
  })
  it('migrates legacy exports with an explicit fidelity warning', () => {
    const parsed = parseProjectPackage(JSON.stringify({ format: 'archly-diagram', version: 1, project: { name: 'Legacy', markdown: '', canvas: { nodes: [], edges: [] } } }))
    expect(parsed.warnings[0]).toContain('Legacy')
    expect(parsed.package.format).toBe('archly-project')
  })
  it('rejects corrupt, future, oversized, deeply nested and dangling input', () => {
    expect(() => parseProjectPackage('{')).toThrow('valid JSON')
    expect(() => parseProjectPackage(JSON.stringify({ ...createProjectPackage(project), version: 2 }))).toThrow('version')
    expect(() => parseProjectPackage(' '.repeat(MAX_PACKAGE_BYTES + 1))).toThrow('12 MB')
    const bad = createProjectPackage(project)
    bad.project.canvasJson = JSON.stringify({ nodes, edges: [{ ...edges[0], target: 'missing' }] })
    expect(() => parseProjectPackage(JSON.stringify(bad))).toThrow('endpoint')
    bad.project.canvasJson = JSON.stringify({ nodes: [{ ...nodes[0], parentId: 'group' }], edges: [] })
    expect(() => parseProjectPackage(JSON.stringify(bad))).toThrow('cyclic')
    expect(() => parseProjectPackage('{"extra":' + '['.repeat(26) + '0' + ']'.repeat(26) + '}')).toThrow('nesting')
  })
  it('sanitizes executable document content before preview and import', () => {
    const backup = createProjectPackage({ ...project, markdown: '<script>alert(1)</script><p>Safe</p>' })
    expect(parseProjectPackage(JSON.stringify(backup)).package.project.markdown).toBe('<p>Safe</p>')
  })
})
