import { describe, expect, it } from 'vitest'
import { parseDiagramCode } from './diagramCode'
import { expandTypedVariables, resolveDiagramImports, type DiagramModule } from './diagramImports'

const modules: DiagramModule[] = [{
  id: 'modules/platform', version: '1.2.0', source: `
export let brand: colour = "#336699"
let privateValue: string = "hidden"
export template Worker(name) {
  service worker "\${name}"
}
export class node shared {
  fill: "#336699"
}
export service gateway "Gateway"
`,
}]

describe('typed variables and project modules', () => {
  it('substitutes string, number, boolean, colour, and list values safely', () => {
    const source = `let label: string = "Orders"
let replicas: number = 3
let enabled: boolean = true
let colour: colour = "#aabbcc"
let zones: list = ["a", "b"]
service api "\${label} \${replicas} \${enabled} \${zones}"
style api fill=\${colour}`
    const result = parseDiagramCode(source)
    expect(result.nodes[0].data.label).toBe('Orders 3 true a,b')
    expect(result.nodes[0].data.fill).toBe('#aabbcc')
  })

  it('imports only selected exported symbols at an exact project version', () => {
    const source = `import { Worker, shared, gateway, brand } from "modules/platform" version "1.2.0"
use Worker jobs(name="Jobs")
style gateway class=shared border=\${brand}`
    const result = parseDiagramCode(source, undefined, modules)
    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(['gateway', 'jobs__worker']))
    expect(result.nodes.find((node) => node.id === 'gateway')?.data.fill).toBe('#336699')
  })

  it('keeps unexported declarations private', () => {
    expect(() => resolveDiagramImports('import { privateValue } from "modules/platform"', modules)).toThrow('does not export')
  })

  it('reports missing modules, duplicate symbols, versions, and complete cycles', () => {
    expect(() => resolveDiagramImports('import { x } from "missing"', modules)).toThrow('missing project module')
    expect(() => resolveDiagramImports('import { brand } from "modules/platform" version "2"', modules)).toThrow('requires version')
    const cyclic = [
      { id: 'a', version: '1', source: 'import { bValue } from "b"\nexport let aValue = "a"' },
      { id: 'b', version: '1', source: 'import { aValue } from "a"\nexport let bValue = "b"' },
    ]
    expect(() => resolveDiagramImports('import { aValue } from "a"', cyclic)).toThrow('root -> a -> b -> a')
    expect(() => resolveDiagramImports('import { brand } from "modules/platform"\nimport { brand } from "other"', [...modules, { id: 'other', version: '1', source: 'export let brand = "x"' }])).toThrow('duplicate imported symbol')
  })

  it('rejects traversal, URLs, invalid types, and oversized lists', () => {
    expect(() => resolveDiagramImports('import { x } from "../secret"', modules)).toThrow('unsafe module identifier')
    expect(() => resolveDiagramImports('import { x } from "https://example.com/x"', modules)).toThrow('unsafe module identifier')
    expect(() => expandTypedVariables('let count: number = "three"')).toThrow('does not match')
    expect(() => expandTypedVariables(`let values: list = ${JSON.stringify(Array.from({ length: 101 }, (_, index) => String(index)))}`)).toThrow('does not match')
  })
})
