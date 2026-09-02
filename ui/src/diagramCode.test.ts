import { describe, expect, it } from 'vitest'
import { diagramToCode, parseDiagramCode } from './diagramCode'
import { componentDefinitions } from './components/canvasCatalog'

const supportedKindNames = new Set(['service', 'web', 'mobile', 'database', 'cache', 'queue', 'storage', 'external', 'actor', 'container', 'note', 'text', 'custom'])

describe('diagram code', () => {
  it('parses components and labeled connections', () => {
    const result = parseDiagramCode('direction right\nweb app "Web app"\nservice api "API"\ndatabase db "Postgres"\napp -> api : "HTTPS"\napi -> db')
    expect(result.nodes).toHaveLength(3)
    expect(result.nodes[1]).toMatchObject({ id: 'api', data: { kind: 'service', label: 'API' } })
    expect(result.nodes[2].position.x).toBeGreaterThan(result.nodes[1].position.x)
    expect(result.edges[0]).toMatchObject({ source: 'app', target: 'api', label: 'HTTPS' })
    expect(result.edges[0]).toMatchObject({ sourceHandle: 'right', targetHandle: 'left' })
  })

  it('supports explicit connection points and vertical defaults', () => {
    const explicit = parseDiagramCode('service api "API"\nqueue jobs "Jobs"\napi.bottom -> jobs.top')
    expect(explicit.edges[0]).toMatchObject({ sourceHandle: 'bottom', targetHandle: 'top' })

    const vertical = parseDiagramCode('direction down\nweb app "Web"\nservice api "API"\napp -> api')
    expect(vertical.edges[0]).toMatchObject({ sourceHandle: 'bottom', targetHandle: 'top' })
  })

  it('accepts cache and Redis shorthand or named components', () => {
    const result = parseDiagramCode('cache\nredis sessions "Session Cache"\nservice api "API"\napi -> cache\napi -> sessions')
    expect(result.nodes[0]).toMatchObject({ id: 'cache', data: { kind: 'cache', label: 'Cache' } })
    expect(result.nodes[1]).toMatchObject({ id: 'sessions', data: { kind: 'cache', label: 'Session Cache', iconId: 'redis' } })
    expect(result.edges).toHaveLength(2)
  })

  it('accepts every icon id in the component catalog as shorthand', () => {
    for (const definition of componentDefinitions.filter((item) => item.iconId)) {
      const shorthand = supportedKindNames.has(definition.iconId!) ? `icon-${definition.iconId}` : definition.iconId!
      const result = parseDiagramCode(`${shorthand} component "Custom label"`)
      expect(result.nodes[0], definition.iconId).toMatchObject({
        data: { kind: definition.kind, label: 'Custom label', iconId: definition.iconId },
      })
    }
  })

  it('creates nested regions and containers with persistent membership', () => {
    const result = parseDiagramCode(`region east "AWS · us-east-1" {
  container vpc "Production VPC" {
    aws-lambda api "Orders API"
    aws-rds db "Orders DB"
    api -> db
  }
}`)
    const region = result.nodes.find((node) => node.id === 'east')!
    const vpc = result.nodes.find((node) => node.id === 'vpc')!
    const api = result.nodes.find((node) => node.id === 'api')!
    expect(region.data).toMatchObject({ kind: 'container', region: true })
    expect(vpc.data).toMatchObject({ kind: 'container', containerId: 'east' })
    expect(api.data).toMatchObject({ containerId: 'vpc', iconId: 'aws-lambda' })
    expect(Number(region.style?.width)).toBeGreaterThan(Number(vpc.style?.width))
    expect(Number(vpc.style?.width)).toBeGreaterThan(Number(api.style?.width))
    expect(diagramToCode(result.nodes, result.edges)).toContain('region east "AWS · us-east-1" {')
  })

  it('reports unmatched region braces', () => {
    expect(() => parseDiagramCode('region east "East" {\nservice api "API"')).toThrow('Unclosed region “east”')
    expect(() => parseDiagramCode('}')).toThrow('unexpected closing brace')
  })

  it('round-trips an empty standalone region', () => {
    const original = parseDiagramCode('region east "AWS · us-east-1"')
    expect(original.nodes[0].data).toMatchObject({ kind: 'container', region: true })
    expect(() => parseDiagramCode(diagramToCode(original.nodes, original.edges))).not.toThrow()
  })

  it('supports variables, node appearance, descriptions, and edge styling', () => {
    const result = parseDiagramCode(`let apiLabel = "Orders API"
service api "\${apiLabel}"
database db "Orders DB"
api -> db : "SQL"
style api fill=#112233 border=#445566 text=#ddeeff description="Handles orders"
style-edge api->db color=#ff5500 line=dashed routing=straight`)
    expect(result.nodes[0].data).toMatchObject({ label: 'Orders API', fill: '#112233', border: '#445566', textColor: '#ddeeff', description: 'Handles orders' })
    expect(result.edges[0]).toMatchObject({ data: { routing: 'straight' }, style: { stroke: '#ff5500', strokeDasharray: '7 5' } })
    const serialized = diagramToCode(result.nodes, result.edges)
    expect(serialized).toContain('style api fill=#112233 border=#445566 text=#ddeeff description="Handles orders"')
    expect(serialized).toContain('style-edge api->db color=#ff5500 line=dashed routing=straight')
  })

  it('reports invalid references without producing a partial diagram', () => {
    expect(() => parseDiagramCode('service api "API"\napi -> missing')).toThrow('Line 2: unknown component “missing”')
  })

  it('serializes an existing canvas into editable source', () => {
    const source = diagramToCode(
      [{ id: 'api', position: { x: 0, y: 0 }, data: { kind: 'service', label: 'API' } }],
      [],
    )
    expect(source).toContain('service api "API"')
    expect(source).toContain('position api x=0 y=0')
  })

  it('round-trips exact canvas positions', () => {
    const source = diagramToCode(
      [{ id: 'api', position: { x: 123.456, y: -78.9 }, data: { kind: 'service', label: 'API' } }],
      [],
    )
    expect(parseDiagramCode(source).nodes[0].position).toEqual({ x: 123.46, y: -78.9 })
  })

  it('validates position directives', () => {
    expect(() => parseDiagramCode('service api "API"\nposition missing x=1 y=2')).toThrow('unknown component “missing”')
    expect(() => parseDiagramCode('service api "API"\nposition api x=left y=2')).toThrow('position requires numeric x and y values')
  })

  it('creates valid aliases for generated canvas ids', () => {
    const source = diagramToCode(
      [
        { id: '8b2-id', position: { x: 0, y: 0 }, data: { kind: 'web', label: 'Web' } },
        { id: '9c3-id', position: { x: 0, y: 0 }, data: { kind: 'service', label: 'API' } },
      ],
      [{ id: 'edge', source: '8b2-id', target: '9c3-id' }],
    )
    expect(source).toContain('web component1 "Web"')
    expect(source).toContain('component1 -> component2')
    expect(() => parseDiagramCode(source)).not.toThrow()
  })
})
