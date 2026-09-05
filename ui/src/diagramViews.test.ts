import { describe, expect, it } from 'vitest'
import { parseDiagramCode } from './diagramCode'
import { applyViewState, compileDiagramViews } from './diagramViews'
import { renameDiagramSymbol } from './diagramLanguage'

const source = `service client "Client"
service api "API"
database db "Database"
queue events "Events"
client -> api : "request"
api -> db : "query"

view dataflow sensitive {
  include api db events
  exclude events
  data api classification=confidential processing="validate" trust-boundary=internal
  data db classification=restricted store=true
}

view sequence checkout {
  participant client
  participant api
  participant db
  message client -> api : "Create order" sync
  activate api
  alt "cache miss" {
    message api -> db : "Insert" async
    return db -> api : "Created"
  }
  note api "Validates the order"
  deactivate api
}`

describe('sequence and data-flow views', () => {
  it('defines multiple named views over one shared component model', () => {
    const result = parseDiagramCode(source)
    expect(result.views).toEqual([{ name: 'sensitive', kind: 'dataflow' }, { name: 'checkout', kind: 'sequence' }])
    expect(result.nodes).toHaveLength(4)
  })

  it('filters and annotates data-flow components and connections', () => {
    const result = parseDiagramCode(source, undefined, [], 'sensitive')
    expect(result.nodes.map((node) => node.id)).toEqual(['api', 'db'])
    expect(result.nodes.find((node) => node.id === 'api')?.data).toMatchObject({ dataClassification: 'confidential', processingStep: 'validate', trustBoundary: 'internal' })
    expect(result.nodes.find((node) => node.id === 'db')?.data.dataStore).toBe(true)
    expect(result.edges).toHaveLength(1)
  })

  it('renders ordered sequence messages, returns, async calls, notes, and alternatives', () => {
    const result = parseDiagramCode(source, undefined, [], 'checkout')
    expect(result.nodes.map((node) => node.id)).toEqual(['client', 'api', 'db'])
    expect(result.nodes.find((node) => node.id === 'api')?.data.sequenceNotes).toEqual(['Validates the order'])
    expect(result.edges.map((edge) => edge.data?.sequenceOrder)).toEqual([1, 2, 3])
    expect(result.edges[1].data).toMatchObject({ async: true, alternative: 'cache miss' })
    expect(result.edges[2].data?.messageType).toBe('return')
  })

  it('renames shared component references in every view', () => {
    const offset = source.indexOf('api "API"')
    const renamed = renameDiagramSymbol(source, offset, 'gateway').source
    expect(renamed).toContain('data gateway classification=')
    expect(renamed).toContain('participant gateway')
    expect(renamed).toContain('message client -> gateway')
    expect(renamed).not.toMatch(/\bapi\b/)
  })

  it('applies independent stored positions without changing shared metadata', () => {
    const result = parseDiagramCode(source, undefined, [], 'checkout')
    const positioned = applyViewState(result.nodes, { positions: { api: { x: 900, y: 500 } } })
    expect(positioned.find((node) => node.id === 'api')?.position).toEqual({ x: 900, y: 500 })
    expect(positioned.find((node) => node.id === 'api')?.data.label).toBe('API')
  })

  it('reports both the source line and referencing view while preserving compilation boundaries', () => {
    const invalid = `${source}\nview dataflow broken {\n include missing\n}`
    expect(() => parseDiagramCode(invalid, undefined, [], 'broken')).toThrow(/Line \d+: unknown shared component “missing” in dataflow view “broken” \(declared at line \d+\)/)
    expect(() => compileDiagramViews('view sequence a {\nparticipant api')).toThrow('unclosed view')
  })
})
