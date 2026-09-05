import { describe, expect, it } from 'vitest'
import { parseDiagramCode } from './diagramCode'
import { buildInterchange } from './diagramInterchange'
import { canonicalCanvasJson, parseCanvasJson, serializeCanvas } from './projectPersistence'

const source = `service api "API"
database db "Primary"
connection query api -> db : "Query"
variant development {
  override api label="Development API" icon=redis fill=#ddeeff replica-count=2
  override-edge query label="Local query" protocol=HTTP port=8080 encrypted=false direction=bidirectional
  add cache local "Local cache"
  add connection warm api -> local : "Warm"
}
variant production {
  override api label="Production API" icon=aws-lambda replica-count=6
  override-edge query protocol=HTTPS port=443 encrypted=true
  remove db
  add aws-rds replica "Read replica"
  add connection query-prod api -> replica : "Query"
}`

describe('environment variants', () => {
  it('keeps base unchanged and applies independent overrides and additions', () => {
    const base = parseDiagramCode(source)
    expect(base.variants).toEqual(['development', 'production'])
    expect(base.nodes.map((node) => node.id)).toEqual(['api', 'db'])
    const development = parseDiagramCode(source, 'development')
    expect(development.nodes.find((node) => node.id === 'api')?.data).toMatchObject({ label: 'Development API', iconId: 'redis', fill: '#ddeeff', replicaCount: 2 })
    expect(development.nodes.some((node) => node.id === 'local')).toBe(true)
    expect(development.edges.find((edge) => edge.id === 'query')).toMatchObject({ label: 'Local query', data: { protocol: 'HTTP', port: '8080', encrypted: false, direction: 'bidirectional' } })
    expect(development.edges.find((edge) => edge.id === 'query')?.markerStart).toBeTruthy()
    const production = parseDiagramCode(source, 'production')
    expect(production.nodes.some((node) => node.id === 'db')).toBe(false)
    expect(production.nodes.find((node) => node.id === 'api')?.data).toMatchObject({ label: 'Production API', iconId: 'aws-lambda', replicaCount: 6 })
    expect(production.edges.map((edge) => edge.id)).toEqual(['query-prod'])
  })

  it('supports adding a nested boundary and its contents', () => {
    const result = parseDiagramCode(`service root\nvariant prod {\nadd region east "East" {\n  service worker "Worker"\n}\n}`, 'prod')
    expect(result.nodes.find((node) => node.id === 'worker')?.data.containerId).toBe('east')
  })

  it.each([
    ['unknown component', 'service a\nvariant bad {\noverride missing label=X\n}', 3],
    ['invalid enum', 'service a\nvariant bad {\noverride-edge missing protocol=FTP\n}', 3],
    ['invalid property', 'service a\nvariant bad {\noverride a script=true\n}', 3],
    ['invalid addition', 'service a\nvariant bad {\nadd nonsense x\n}', 3],
  ])('reports %s with variant and exact line while base remains valid', (_, input, line) => {
    expect(parseDiagramCode(input).nodes).toHaveLength(1)
    expect(() => parseDiagramCode(input, 'bad')).toThrow(`Line ${line}:`)
    expect(() => parseDiagramCode(input, 'bad')).toThrow('variant “bad”')
  })

  it('preserves source and active variant through persistence and exports the environment', () => {
    const result = parseDiagramCode(source, 'development')
    const saved = serializeCanvas(result.nodes, result.edges, undefined, source, 'development')
    expect(parseCanvasJson(saved)).toMatchObject({ diagramCode: source, activeVariant: 'development' })
    expect(parseCanvasJson(canonicalCanvasJson(saved))).toMatchObject({ diagramCode: source, activeVariant: 'development' })
    expect(JSON.parse(buildInterchange('metadata', result.nodes, result.edges, false, 'development').text).environment).toBe('development')
  })

  it('rejects duplicate, missing, malformed and unclosed variants', () => {
    expect(() => parseDiagramCode('variant a {\n}\nvariant a {\n}')).toThrow('duplicate variant')
    expect(() => parseDiagramCode('variant a {\nservice nope\n}')).toThrow('expected add')
    expect(() => parseDiagramCode('variant a {\nadd service x')).toThrow('unclosed variant')
    expect(() => parseDiagramCode('service a', 'missing')).toThrow('Unknown variant')
  })
})
