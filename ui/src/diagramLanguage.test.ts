import { describe, expect, it } from 'vitest'
import { analyzeDiagram, completionsAt, formatDiagramSource, quickFixDiagram, renameDiagramSymbol, symbolOccurrences, tokenizeDiagram } from './diagramLanguage'

const source = `# service api in a comment
let title = "service api in a string"
template Stack(name) {
  service api "API"
  database db "Data"
  connection query api -> db
  style api fill=#ddeeff
}
use Stack orders(name="Orders")
variant prod {
  override api replica-count=3
  override-edge query protocol=HTTPS
}`

describe('diagram language intelligence', () => {
  it('highlights every required token category and invalid-line identifiers', () => {
    const tokens = tokenizeDiagram(`${source}\nstyle api opacity=0.5\n@bad`, 14)
    expect(new Set(tokens.map((token) => token.kind))).toEqual(new Set(['comment', 'keyword', 'identifier', 'operator', 'string', 'property', 'number', 'invalid']))
    expect(tokens.find((token) => token.value === 'api' && token.line === 14)?.kind).toBe('invalid')
  })

  it('indexes components, connections, templates, variables, variants and references', () => {
    const analysis = analyzeDiagram(source)
    expect(analysis.symbols.map(({ name, kind }) => `${kind}:${name}`)).toEqual(expect.arrayContaining(['variable:title', 'template:Stack', 'component:api', 'component:db', 'connection:query', 'variant:prod']))
    expect(symbolOccurrences(source, 'api').map((item) => item.line)).toEqual([4, 6, 7, 11])
  })

  it('renames semantic occurrences without touching comments or strings', () => {
    const offset = source.indexOf('api "API"')
    const renamed = renameDiagramSymbol(source, offset, 'gateway')
    expect(renamed.count).toBe(4)
    expect(renamed.source).toContain('# service api in a comment')
    expect(renamed.source).toContain('"service api in a string"')
    expect(renamed.source).toContain('service gateway "API"')
    expect(renamed.source).toContain('connection query gateway -> db')
    expect(() => renameDiagramSymbol(source, offset, 'not valid')).toThrow('Names must start')
  })

  it('keeps same-named symbol kinds isolated during rename', () => {
    const shared = 'let api = "Title"\nservice api "${api}"\nservice client\nconnection call client -> api'
    const componentOffset = shared.indexOf('api "${')
    const renamedComponent = renameDiagramSymbol(shared, componentOffset, 'backend').source
    expect(renamedComponent).toContain('let api = "Title"')
    expect(renamedComponent).toContain('service backend "${api}"')
    expect(renamedComponent).toContain('client -> backend')
    const variableOffset = shared.indexOf('api =')
    const renamedVariable = renameDiagramSymbol(shared, variableOffset, 'title').source
    expect(renamedVariable).toContain('let title = "Title"')
    expect(renamedVariable).toContain('service api "${title}"')
    expect(renamedVariable).toContain('client -> api')
  })

  it('provides contextual declarations, symbols, properties, enum values, templates and imports', () => {
    const symbols = analyzeDiagram(source).symbols
    expect(completionsAt('', 0, symbols)).toEqual(expect.arrayContaining(['service', 'import', 'Stack']))
    expect(completionsAt('use ', 4, symbols)).toContain('Stack')
    expect(completionsAt('style api ', 10, symbols)).toContain('fill=')
    expect(completionsAt('style-edge query ', 17, symbols)).toContain('protocol=')
    expect(completionsAt('metadata-edge query protocol=', 29, symbols)).toContain('HTTPS')
    expect(completionsAt('api -> ', 7, symbols)).toEqual(expect.arrayContaining(['api', 'db']))
  })

  it('formats deterministically while preserving comments and supports safe quick fixes', () => {
    const messy = '# keep me\nservice   api   "API"\nvariant prod {\n override api fill=#ddeeff\n}\n'
    const formatted = formatDiagramSource(messy)
    expect(formatDiagramSource(formatted)).toBe(formatted)
    expect(formatted).toContain('# keep me')
    expect(formatted).toContain('  override api fill=#ddeeff')
    expect(quickFixDiagram('api -> missing', 'Line 1: unknown component “api” in connection')?.source).toMatch(/^service api/)
    expect(quickFixDiagram('nonsense api', 'Line 1: unknown component type “nonsense”')?.source).toBe('service api')
  })

  it('analyzes the documented large-source scale with bounded linear work', () => {
    const large = Array.from({ length: 1000 }, (_, index) => `service node${index} "Node ${index}"`).join('\n')
    const start = performance.now(); const result = analyzeDiagram(large)
    expect(result.symbols).toHaveLength(1000)
    expect(performance.now() - start).toBeLessThan(1000)
  })
})
