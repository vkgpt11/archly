import { describe, expect, it } from 'vitest'
import { MarkerType } from '@xyflow/react'
import { diagramToCode, parseDiagramCode } from './diagramCode'
import { descendantIds, layoutDiagram, defaultLayout } from './diagramLayout'
import { serializeCanvas, parseCanvasJson } from './projectPersistence'

describe('rich diagram styling', () => {
  it('supports classes, local precedence, blocks, icons and dimensions without changing component kind', () => {
    const source = `class node accent {
  fill: #112233
  border-width: 3
}
service api "API"
style api class=accent fill=#445566
style api {
  icon: redis
  shape: ellipse
  opacity: 0.5
  width: 200
  height: 100
  text: #ffffff
}`
    const result = parseDiagramCode(source)
    expect(result.nodes[0]).toMatchObject({ data: { kind: 'service', iconId: 'redis', fill: '#445566', borderWidth: 3, opacity: 0.5, shape: 'ellipse' }, style: { width: 200, height: 100 } })
    const restored = parseDiagramCode(diagramToCode(result.nodes, []))
    expect(restored.nodes[0].data).toEqual(result.nodes[0].data)
    expect(restored.nodes[0].style).toEqual(result.nodes[0].style)
  })
  it('retains dotted patterns, line widths, routing, and both arrowheads', () => {
    const result = parseDiagramCode(`service a\nservice b\na -> b\nstyle-edge a->b {\n  line: dotted\n  width: 4\n  start: arrow\n  end: none\n  routing: orthogonal\n}`)
    expect(result.edges[0]).toMatchObject({ style: { strokeDasharray: '2 4', strokeWidth: 4 }, markerStart: { type: MarkerType.Arrow }, markerEnd: undefined, data: { routing: 'orthogonal' } })
    const restored = parseDiagramCode(diagramToCode(result.nodes, result.edges))
    expect(restored.edges[0]).toEqual(result.edges[0])
  })
  it.each(['opacity=2', 'width=NaN', 'height=-1', 'border-width=13', 'fill=red', 'shape=script', 'icon=unknown', 'unknown=1', 'width=100 trailing'])('rejects unsafe or unsupported node values: %s', (options) => {
    expect(() => parseDiagramCode(`service api\nstyle api ${options}`)).toThrow('Line 2:')
  })
  it.each(['width=0', 'line=invalid', 'end=url(test)', 'color=red', 'routing=invalid'])('rejects unsupported edge values: %s', (options) => {
    expect(() => parseDiagramCode(`service a\nservice b\na -> b\nstyle-edge a->b ${options}`)).toThrow('Line 4:')
  })
  it('reports the original property line', () => {
    expect(() => parseDiagramCode('service a\nstyle a {\nopacity: 2\n}')).toThrow('Line 3: opacity')
  })
})

describe('automatic layout', () => {
  it.each(['right', 'left', 'up', 'down'] as const)('lays out nested content deterministically toward %s', (direction) => {
    const source = `layout {\ndirection: ${direction}\nhorizontal-spacing: 120\nvertical-spacing: 90\nrank-separation: 140\nrouting: orthogonal\n}\nregion r {\ncontainer c {\nservice a\nservice b\na -> b\n}\n}`
    const result = parseDiagramCode(source)
    const a = result.nodes.find((node) => node.id === 'a')!
    const b = result.nodes.find((node) => node.id === 'b')!
    expect(direction === 'right' ? b.position.x > a.position.x : direction === 'left' ? a.position.x > b.position.x : direction === 'down' ? b.position.y > a.position.y : a.position.y > b.position.y).toBe(true)
    expect(parseDiagramCode(source)).toEqual(result)
    expect(parseDiagramCode(diagramToCode(result.nodes, result.edges)).nodes).toEqual(result.nodes)
    for (const node of result.nodes.filter((item) => item.data.containerId)) {
      const parent = result.nodes.find((item) => item.id === node.data.containerId)!
      expect(node.position.x).toBeGreaterThanOrEqual(parent.position.x + 48)
      expect(node.position.y).toBeGreaterThanOrEqual(parent.position.y + 48)
      expect(node.position.x + Number(node.style!.width)).toBeLessThanOrEqual(parent.position.x + Number(parent.style!.width) - 48)
    }
  })
  it('retains explicit positions and rejects contradictory pinned boundaries', () => {
    expect(parseDiagramCode('service a\nposition a x=-200 y=80').nodes[0].position).toEqual({ x: -200, y: 80 })
    expect(() => parseDiagramCode('region r {\nservice a\n}\nposition r x=500 y=500\nposition a x=0 y=0')).toThrow('pinned boundary')
  })
  it('does not mutate input during preview and terminates on graph cycles', () => {
    const nodes = parseDiagramCode('service a\nservice b').nodes
    const original = structuredClone(nodes)
    layoutDiagram(nodes, [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }], defaultLayout)
    expect(nodes).toEqual(original)
  })
})

describe('cloud boundaries', () => {
  it('retains typed boundaries, identifiers and inherited provider', () => {
    const result = parseDiagramCode('account a "AWS" {\nregion r {\nvpc v {\nsubnet s {\ncluster k {\nnamespace n {\nservice api\n}\n}\n}\n}\n}\n}\nboundary a identifier="123456789"')
    expect(result.nodes.find((node) => node.id === 'n')?.data).toMatchObject({ boundaryType: 'namespace', provider: 'aws', containerId: 'k' })
    const restored = parseDiagramCode(diagramToCode(result.nodes, []))
    expect(restored.nodes.map((node) => node.data)).toEqual(result.nodes.map((node) => node.data))
    expect(descendantIds(result.nodes, new Set(['v'])).size).toBe(5)
  })
  it.each(['namespace n {\nsubnet s\n}', 'subscription s {\nvpc v\n}', 'account a\nboundary a provider=azure'])('rejects incompatible nesting/providers', (source) => {
    expect(() => parseDiagramCode(source)).toThrow('Line')
  })
  it('supports Azure, GCP and standalone omitted parent context', () => {
    expect(parseDiagramCode('subscription s {\nregion r {\nvnet v {\nsubnet sn\n}\n}\n}').nodes.at(-1)?.data.provider).toBe('azure')
    expect(parseDiagramCode('project p {\nregion r\n}').nodes[1].data.provider).toBe('gcp')
    expect(parseDiagramCode('namespace standalone').nodes[0].data.boundaryType).toBe('namespace')
  })
})

describe('connection semantics', () => {
  it('preserves independent metadata and stable IDs on parallel edges and persistence', () => {
    const result = parseDiagramCode(`service a\nservice b\nconnection "first" a -> b : "one"\nconnection "second" a -> b : "two"\nmetadata-edge first {\nprotocol: HTTPS\nport: 443\nasync: false\nencrypted: true\ndirection: bidirectional\ndescription: "A secure connection"\n}\nmetadata-edge second protocol=TCP port=8000-8100 async=true encrypted=false\nstyle-edge first color=#112233\nstyle-edge second color=#445566`)
    expect(result.edges[0]).toMatchObject({ id: 'first', data: { protocol: 'HTTPS', port: '443', async: false, encrypted: true, description: 'A secure connection' }, style: { stroke: '#112233' }, markerStart: { type: MarkerType.ArrowClosed } })
    expect(result.edges[1]).toMatchObject({ id: 'second', data: { protocol: 'TCP', async: true, encrypted: false }, style: { stroke: '#445566' } })
    expect(parseDiagramCode(diagramToCode(result.nodes, result.edges)).edges).toEqual(result.edges)
    expect(parseCanvasJson(serializeCanvas(result.nodes, result.edges)).edges).toEqual(result.edges)
    const reconnected = { ...result.edges[0], target: 'a' }
    expect(parseDiagramCode(diagramToCode(result.nodes, [reconnected])).edges[0].id).toBe('first')
  })
  it.each(['port=0', 'port=65536', 'port=9000-100', 'port=abc', 'async=maybe', 'encrypted=yes', 'protocol=unknown', 'direction=outward'])('rejects invalid metadata %s', (options) => {
    expect(() => parseDiagramCode(`service a\nconnection c a -> a\nmetadata-edge c ${options}`)).toThrow('Line 3:')
  })
  it('scopes named connections inside templates', () => {
    const result = parseDiagramCode('template A() {\nservice a\nconnection c a -> a\nmetadata-edge c protocol=HTTPS\n}\nuse A one()\nuse A two()')
    expect(result.edges.map((edge) => edge.id)).toEqual(['one__c', 'two__c'])
    expect(result.edges[1]).toMatchObject({ source: 'two__a', target: 'two__a', data: { protocol: 'HTTPS' } })
  })
})
