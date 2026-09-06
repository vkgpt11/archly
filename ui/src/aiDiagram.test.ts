import { describe, expect, it } from 'vitest'
import { analyzeArchitecture, prepareAiCanvas } from './aiDiagram'

describe('AI diagram integration', () => {
  it('uses the native layout engine and fits generated boundaries', () => {
    const canvas = prepareAiCanvas({ nodes: [
      { id: 'region', type: 'architecture', position: { x: 0, y: 0 }, data: { label: 'AWS Region', kind: 'container', boundaryType: 'region' } },
      { id: 'api', type: 'architecture', position: { x: 0, y: 0 }, data: { label: 'API', kind: 'service', containerId: 'region' } },
      { id: 'db', type: 'architecture', position: { x: 0, y: 0 }, data: { label: 'PostgreSQL', kind: 'database', containerId: 'region' } },
    ], edges: [{ id: 'api-db', source: 'api', target: 'db', data: { protocol: 'SQL', encrypted: true } }] })
    expect(canvas.nodes.find(node => node.id === 'db')?.position.x).toBeGreaterThan(canvas.nodes.find(node => node.id === 'api')!.position.x)
    expect(Number(canvas.nodes.find(node => node.id === 'region')?.style?.width)).toBeGreaterThan(250)
  })

  it('reports architecture-rule quality findings', () => {
    const findings = analyzeArchitecture({ nodes: [{ id: 'api', position: { x: 0, y: 0 }, data: { label: 'API', kind: 'service' } }], edges: [] })
    expect(findings.join(' ')).toMatch(/no incoming or outgoing connections/i)
  })
})
