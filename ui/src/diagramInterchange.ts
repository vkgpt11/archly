import type { Edge, Node } from '@xyflow/react'
import { serializeCanvas } from './projectPersistence'
import { validateDiagramRules } from './diagramRules'

export type InterchangeFormat = 'mermaid' | 'plantuml' | 'd2' | 'metadata'
export type InterchangeResult = { text: string; extension: string; warnings: string[] }
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, stable(item)]))
  return value
}
const json = (value: unknown) => JSON.stringify(stable(value)).replace(/[\u2028\u2029]/g, (char) => `\\u${char.charCodeAt(0).toString(16)}`)
const id = (value: string) => `n_${Array.from(value).map((char) => char.codePointAt(0)!.toString(16)).join('_')}`
const mermaidLabel = (value: unknown) => String(value ?? '').replace(/[^\p{L}\p{N} .,!?_-]/gu, (char) => `#${char.codePointAt(0)};`)
const plantLabel = (value: unknown) => String(value ?? '').replace(/[^\p{L}\p{N} .,!?_-]/gu, (char) => `<U+${char.codePointAt(0)!.toString(16).padStart(4, '0')}>`)
const safeColor = (value: unknown) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : undefined

export function buildInterchange(format: InterchangeFormat, originalNodes: Node[], originalEdges: Edge[], selectionOnly = false, environment?: string): InterchangeResult {
  const selected = new Set(originalNodes.filter((node) => node.selected).map((node) => node.id))
  if (selectionOnly) originalEdges.filter((edge) => edge.selected).forEach((edge) => { selected.add(edge.source); selected.add(edge.target) })
  const nodes = (selectionOnly ? originalNodes.filter((node) => selected.has(node.id)) : originalNodes).map((node) => ({ ...node, data: { ...node.data } })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  const ids = new Set(nodes.map((node) => node.id))
  if (ids.size !== nodes.length) throw new Error('Cannot export duplicate component IDs')
  if (selectionOnly && !nodes.length) throw new Error('Select at least one component or connection.')
  const edges = originalEdges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  const warnings: string[] = []
  if (edges.length !== originalEdges.length && !selectionOnly) warnings.push('Dangling connections are excluded from the rendered graph; original connections remain in metadata.')
  nodes.forEach((node) => { if (!ids.has(String(node.data.containerId))) delete node.data.containerId })
  const durable = JSON.parse(serializeCanvas(nodes, edges)) as { nodes: Node[]; edges: Edge[] }
  const validationSource = [...nodes.map((node) => `${node.data.kind || 'service'} ${node.id}`), ...edges.map((edge) => `connection ${edge.id} ${edge.source} -> ${edge.target}`)].join('\n')
  const diagnostics = validateDiagramRules(nodes, edges, validationSource).filter((item) => !item.suppressed)
  const metadata = { format: 'archly-interchange', version: 1, view: 'architecture', environment: environment || null, provenance: { generator: 'Archly', source: 'canvas' }, validation: { status: diagnostics.some((item) => item.severity === 'error') ? 'failed' : diagnostics.length ? 'warnings' : 'passed', diagnostics }, ...durable, ...(warnings.length ? { originalConnections: originalEdges } : {}) }
  if (format === 'metadata') return { text: `${json(metadata)}\n`, extension: 'archly-metadata.json', warnings }
  warnings.push('Only labels, hierarchy, connection direction and basic colours are rendered in this format. Exact positions, icons, port handles, routing, advanced styles, and semantic metadata are preserved in the embedded Archly metadata comment, not in the destination rendering.')
  const prefix = format === 'mermaid' ? '%%' : format === 'plantuml' ? "'" : '#'
  const lines = [`${prefix} archly-metadata: ${json(metadata)}`]
  if (format === 'mermaid') lines.push('flowchart LR')
  if (format === 'plantuml') lines.push('@startuml', 'left to right direction')
  if (format === 'd2') lines.push('direction: right')
  const paths = new Map<string, string>()
  const emitted = new Set<string>()
  const emit = (parent?: string, indent = '', path = '') => {
    for (const node of nodes.filter((node) => node.data.containerId === parent)) {
      if (emitted.has(node.id)) throw new Error('Cyclic container membership cannot be exported')
      emitted.add(node.id)
      const alias = id(node.id)
      const fullPath = path ? `${path}.${alias}` : alias
      paths.set(node.id, fullPath)
      const group = node.data.kind === 'container'
      const label = node.data.label || node.id
      const fill = safeColor(node.data.fill)
      if (format === 'mermaid') lines.push(`${indent}${group ? `subgraph ${alias}["${mermaidLabel(label)}"]` : `${alias}["${mermaidLabel(label)}"]`}`)
      if (format === 'plantuml') lines.push(`${indent}${group ? 'package' : 'rectangle'} "${plantLabel(label)}" as ${alias}${fill ? ` ${fill}` : ''}${group ? ' {' : ''}`)
      if (format === 'd2') lines.push(`${indent}${alias}: ${JSON.stringify(String(label))} {`, `${indent}  shape: rectangle`, ...(fill ? [`${indent}  style.fill: "${fill}"`] : []))
      if (group) emit(node.id, `${indent}  `, fullPath)
      if (format === 'd2' || group) lines.push(`${indent}${format === 'mermaid' ? 'end' : '}'}`)
      if (format === 'mermaid') {
        const options = [fill && `fill:${fill}`, safeColor(node.data.border) && `stroke:${node.data.border}`, safeColor(node.data.textColor) && `color:${node.data.textColor}`].filter(Boolean)
        if (options.length) lines.push(`style ${alias} ${options.join(',')}`)
      }
    }
  }
  emit()
  if (emitted.size !== nodes.length) throw new Error('Cyclic or invalid container membership cannot be exported')
  for (const edge of edges) {
    const from = format === 'd2' ? paths.get(edge.source) : id(edge.source)
    const to = format === 'd2' ? paths.get(edge.target) : id(edge.target)
    const start = Boolean(edge.markerStart); const end = Boolean(edge.markerEnd)
    const arrow = format === 'mermaid' ? start && end ? '<-->' : start ? '<--' : end ? '-->' : '---' : start && end ? '<->' : start ? '<-' : end ? '->' : '--'
    if (format === 'mermaid') lines.push(`${from} ${arrow}${edge.label ? `|"${mermaidLabel(edge.label)}"|` : ''} ${to}`)
    if (format === 'plantuml') lines.push(`${from} ${arrow} ${to}${edge.label ? ` : ${plantLabel(edge.label)}` : ''}`)
    if (format === 'd2') lines.push(`${from} ${arrow} ${to}${edge.label ? `: ${JSON.stringify(String(edge.label))}` : ''}`)
  }
  if (format === 'plantuml') lines.push('@enduml')
  return { text: `${lines.join('\n')}\n`, extension: { mermaid: 'mmd', plantuml: 'puml', d2: 'd2' }[format], warnings }
}
