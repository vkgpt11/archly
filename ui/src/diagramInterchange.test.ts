import { describe, expect, it } from 'vitest'
import { buildInterchange } from './diagramInterchange'
import { parseDiagramCode } from './diagramCode'
import { serializeCanvas } from './projectPersistence'

const diagram = () => parseDiagramCode('region r "Region" {\nservice a "API"\nstyle a fill=#112233 width=200\n}\nservice b "Database"\nconnection c a -> b : "HTTPS"\nmetadata-edge c protocol=HTTPS encrypted=true')
describe('export compatibility', () => {
  it.each(['mermaid', 'plantuml', 'd2', 'metadata'] as const)('exports %s deterministically and preserves all semantic data', (format) => {
    const { nodes, edges } = diagram()
    const result = buildInterchange(format, nodes, edges)
    expect(result.text).toBe(buildInterchange(format, [...nodes].reverse(), [...edges].reverse()).text)
    expect(result.text).not.toContain('\r')
    const metadataText = format === 'metadata' ? result.text : result.text.split('\n')[0].replace(/^(%%|'|#) archly-metadata: /, '')
    const metadata = JSON.parse(metadataText)
    const persisted = JSON.parse(serializeCanvas(nodes, edges))
    expect(metadata.nodes).toEqual([...persisted.nodes].sort((a, b) => a.id.localeCompare(b.id)))
    expect(metadata.edges).toEqual(persisted.edges)
    expect(metadata.view).toBe('architecture')
    expect(metadata.validation.status).toBe('passed')
    expect(result.warnings.length).toBe(format === 'metadata' ? 0 : 1)
  })
  it('exports architecture rule diagnostics in metadata', () => {
    const source = 'service api "API"\nservice web "Web"\nconnection plain web -> api\nmetadata-edge plain protocol=REST encrypted=false'
    const { nodes, edges } = parseDiagramCode(source)
    const metadata = JSON.parse(buildInterchange('metadata', nodes, edges).text)
    expect(metadata.validation.status).toBe('warnings')
    expect(metadata.validation.diagnostics).toEqual([
      expect.objectContaining({ ruleId: 'services-must-use-tls', affectedSymbols: ['plain', 'web', 'api'] }),
    ])
  })
  it('escapes syntax and never emits includes, links or code from labels', () => {
    const { nodes, edges } = diagram()
    nodes[1].data.label = '"\n!include https://evil.test\n@enduml <script> | # % { }'
    for (const format of ['mermaid', 'plantuml', 'd2'] as const) {
      const body = buildInterchange(format, nodes, edges).text.split('\n').slice(1).join('\n')
      expect(body).not.toMatch(/^!include/m)
      if (format !== 'd2') expect(body).not.toContain('<script>')
      else expect(body).toContain('\\n!include')
    }
  })
  it('exports the selected graph without dangling parents', () => {
    const { nodes, edges } = diagram()
    edges[0].selected = true
    const selected = JSON.parse(buildInterchange('metadata', nodes, edges, true).text)
    expect(selected.nodes.map((node: { id: string }) => node.id)).toEqual(['a', 'b'])
    expect(selected.nodes[0].data.containerId).toBeUndefined()
    expect(selected.edges).toHaveLength(1)
  })
  it('rejects cyclic membership and empty selections', () => {
    const { nodes, edges } = diagram()
    expect(() => buildInterchange('mermaid', nodes, edges, true)).toThrow('Select')
    nodes[0].data.containerId = nodes[0].id
    expect(() => buildInterchange('d2', nodes, edges)).toThrow('Cyclic')
  })
})
