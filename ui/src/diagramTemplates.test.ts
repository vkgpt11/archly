import { describe, expect, it } from 'vitest'
import { parseDiagramCode, diagramToCode } from './diagramCode'
import { expandDiagramTemplates } from './diagramTemplates'

describe('diagram templates', () => {
  it('expands multiple instances with defaults, nested boundaries, styles, and ports', () => {
    const source = `template Stack(name, cache="Sessions") {
  region zone "\${name}" {
    service api "\${name} API"
    redis db "\${cache}"
    api.bottom -> db.top : "cached reads"
    style api fill=#112233
    style-edge api->db routing=straight
  }
}
use Stack orders(name="Orders")
use Stack billing(name="Billing", cache="Billing cache")
orders__api -> billing__api`
    const result = parseDiagramCode(source)
    expect(result.nodes).toHaveLength(6)
    expect(result.nodes.find((node) => node.id === 'orders__api')).toMatchObject({ data: { label: 'Orders API', containerId: 'orders__zone', fill: '#112233' } })
    expect(result.nodes.find((node) => node.id === 'orders__db')?.data.label).toBe('Sessions')
    expect(result.nodes.find((node) => node.id === 'billing__db')?.data.label).toBe('Billing cache')
    expect(result.edges[0]).toMatchObject({ source: 'orders__api', target: 'orders__db', sourceHandle: 'bottom', targetHandle: 'top', data: { routing: 'straight' } })
    expect(parseDiagramCode(source)).toEqual(result)
    expect(parseDiagramCode(diagramToCode(result.nodes, result.edges)).nodes).toHaveLength(6)
  })

  it('allows forward declarations and nested template calls with scoped references', () => {
    const result = parseDiagramCode(`use Outer prod(name="Production")
template Outer(name) {
  use Inner child(name="\${name}")
  service gateway "Gateway"
  gateway -> child__api
}
template Inner(name) {
  service api "\${name} API"
}`)
    expect(result.nodes.map((node) => node.id)).toEqual(['prod__child__api', 'prod__gateway'])
    expect(result.edges[0]).toMatchObject({ source: 'prod__gateway', target: 'prod__child__api' })
  })

  it('does not namespace component kinds, property names, labels, or global references', () => {
    const result = parseDiagramCode(`service external "Outside"
template Example() {
  service service "service -> untouched"
  redis
  service -> redis
  redis -> external
  position service x=30 y=40
}
use Example one()`)
    expect(result.nodes[1]).toMatchObject({ id: 'one__service', position: { x: 30, y: 40 }, data: { kind: 'service', label: 'service -> untouched' } })
    expect(result.nodes[2]).toMatchObject({ id: 'one__redis', data: { iconId: 'redis' } })
    expect(result.edges[1].target).toBe('external')
  })

  it('scopes template-local variables and retains escaped quotes in parameters', () => {
    const result = parseDiagramCode(`let title = "Global"
template Example(name) {
  let title = "Local"
  service api "\${name} \${title}"
}
use Example one(name="A \\"quoted\\" name")
service last "\${title}"`)
    expect(result.nodes[0].data.label).toBe('A "quoted" name Local')
    expect(result.nodes[1].data.label).toBe('Global')
  })

  it('ignores braces and calls inside comments and quoted strings', () => {
    const result = parseDiagramCode(`template Example() {
  # } use Missing bad()
  service api "Literal { braces }"
}
use Example one()`)
    expect(result.nodes[0].data.label).toBe('Literal { braces }')
  })

  it('maps parser errors to the definition line and call chain', () => {
    expect(() => parseDiagramCode('template Bad() {\n  nonsense api "API"\n}\nuse Bad one()')).toThrow('Line 2: unknown component type “nonsense” (via Bad at line 4)')
    expect(() => parseDiagramCode('template Empty() {\n}\nservice api\napi -> missing')).toThrow('Line 4: unknown component “missing”')
  })

  it.each([
    ['use Missing one()', 'unknown template'],
    ['template A() {\nuse B b()\n}\ntemplate B() {\nuse A a()\n}\nuse A root()', 'recursive template call: A -> B -> A'],
    ['template A(name) {\nservice api\n}\nuse A one()', 'missing parameter “name”'],
    ['template A() {\n}\nuse A one(extra="x")', 'unknown parameter “extra”'],
    ['template A(name, name) {\n}', 'duplicate parameter'],
    ['template A() {\n}\ntemplate A() {\n}', 'duplicate template'],
    ['template A() {\n}\nuse A one()\nuse A one()', 'duplicate template instance'],
    ['template A() {\nservice api', 'unclosed template'],
    ['template A(name) {\n}\nuse A one(name=42)', 'expected named string parameters'],
    ['template A(name) {\n}\nuse A one(name="a",)', 'expected a comma'],
    ['template A(name) {\nservice api-${name}\n}\nuse A one(name="bad id")', 'identifier-safe'],
    ['template A() {\nservice api\n}\nservice one__api\nuse A one()', 'duplicate component id'],
  ])('rejects invalid template source: %s', (source, message) => {
    expect(() => parseDiagramCode(source)).toThrow(message)
  })

  it('bounds input and expansion work', () => {
    expect(() => expandDiagramTemplates(' '.repeat(1_000_001))).toThrow('1 MB limit')
    expect(() => expandDiagramTemplates(`template Empty() {\n}\n${Array.from({ length: 1001 }, (_, i) => `use Empty n${i}()`).join('\n')}`)).toThrow('call or nesting limit')
  })
})
