import { MarkerType, type Edge, type Node } from '@xyflow/react'
import { componentDefinitions } from './components/canvasCatalog'
import { connectionMetadata } from './diagramConnections'
import { edgeStylePatch, nodeStyleData, readDiagramOptions } from './diagramStyles'

export type DiagramVariant = { name: string; line: number; operations: VariantOperation[]; additionLines: number[] }
type VariantOperation = { kind: 'override' | 'override-edge' | 'remove' | 'remove-edge'; id: string; options: Record<string, string>; line: number }
export type VariantSource = { baseSource: string; effectiveSource: string; variants: DiagramVariant[]; activeVariant?: string }

const braceDelta = (value: string) => {
  let quoted = false; let escaped = false; let delta = 0
  for (const char of value) {
    if (escaped) { escaped = false; continue }
    if (char === '\\' && quoted) { escaped = true; continue }
    if (char === '"') { quoted = !quoted; continue }
    if (!quoted && char === '{') delta++
    if (!quoted && char === '}') delta--
  }
  return delta
}

/** Extracts top-level variant blocks while preserving one output line per source line. */
export function compileVariantSource(source: string, activeVariant?: string): VariantSource {
  const lines = source.split(/\r?\n/)
  const base = [...lines]
  const active = [...lines]
  const variants: DiagramVariant[] = []
  let variant: DiagramVariant | undefined
  let depth = 0
  let nestedAdditionDepth = 0
  for (let index = 0; index < lines.length; index++) {
    const text = lines[index].trim()
    if (!variant) {
      const match = text.match(/^variant\s+([A-Za-z][\w-]*)\s*\{$/)
      if (!match) continue
      if (variants.some((item) => item.name === match[1])) throw new Error(`Line ${index + 1}: duplicate variant “${match[1]}”`)
      variant = { name: match[1], line: index + 1, operations: [], additionLines: [] }
      variants.push(variant); depth = 1; nestedAdditionDepth = 0
      base[index] = ''; active[index] = ''
      continue
    }
    base[index] = ''; active[index] = ''
    const delta = braceDelta(lines[index])
    if (depth === 1 && text === '}') { variant = undefined; depth = 0; continue }
    const isActive = variant.name === activeVariant
    if (text && !/^(#|\/\/)/.test(text)) {
      const operation = text.match(/^(override-edge|override|remove-edge|remove)\s+("(?:\\.|[^"\\])*"|[A-Za-z][\w-]*)(?:\s+(.+))?$/)
      if (depth === 1 && operation) {
        const id = operation[2].startsWith('"') ? JSON.parse(operation[2]) as string : operation[2]
        let options: Record<string, string> = {}
        if (operation[1].startsWith('override')) {
          if (!operation[3]) throw new Error(`Line ${index + 1}: ${operation[1]} requires key=value properties in variant “${variant.name}”`)
          try { options = readDiagramOptions(operation[3]) } catch (error) { throw new Error(`Line ${index + 1}: ${(error as Error).message} in variant “${variant.name}”`) }
        } else if (operation[3]) throw new Error(`Line ${index + 1}: ${operation[1]} does not accept properties in variant “${variant.name}”`)
        variant.operations.push({ kind: operation[1] as VariantOperation['kind'], id, options, line: index + 1 })
      } else if (/^add\s+/.test(text)) {
        if (nestedAdditionDepth && depth > 1) throw new Error(`Line ${index + 1}: nested variant additions omit “add” inside their owning boundary`)
        if (isActive) active[index] = lines[index].replace(/^(\s*)add\s+/, '$1')
        variant.additionLines.push(index + 1)
        nestedAdditionDepth += delta
      } else if (nestedAdditionDepth > 0) {
        if (isActive) active[index] = lines[index]
        variant.additionLines.push(index + 1)
        nestedAdditionDepth += delta
      } else if (text !== '}') throw new Error(`Line ${index + 1}: expected add, override, override-edge, remove, or remove-edge in variant “${variant.name}”`)
    }
    depth += delta
    if (depth < 1) throw new Error(`Line ${index + 1}: unexpected closing brace in variant “${variant.name}”`)
  }
  if (variant) throw new Error(`Line ${variant.line}: unclosed variant “${variant.name}”`)
  if (activeVariant && !variants.some((item) => item.name === activeVariant)) throw new Error(`Unknown variant “${activeVariant}”`)
  return { baseSource: base.join('\n'), effectiveSource: (activeVariant ? active : base).join('\n'), variants, activeVariant }
}

function fail(variant: string, operation: VariantOperation, message: string): never {
  throw new Error(`Line ${operation.line}: ${message} in variant “${variant}”`)
}

export function applyDiagramVariant(nodes: Node[], edges: Edge[], variant?: DiagramVariant): { nodes: Node[]; edges: Edge[] } {
  if (!variant) return { nodes, edges }
  let nextNodes = structuredClone(nodes); let nextEdges = structuredClone(edges)
  for (const operation of variant.operations) {
    if (operation.kind === 'remove') {
      if (!nextNodes.some((node) => node.id === operation.id)) fail(variant.name, operation, `unknown component “${operation.id}”`)
      const removed = new Set([operation.id]); let changed = true
      while (changed) { changed = false; for (const node of nextNodes) if (removed.has(String(node.data.containerId)) && !removed.has(node.id)) { removed.add(node.id); changed = true } }
      nextNodes = nextNodes.filter((node) => !removed.has(node.id)); nextEdges = nextEdges.filter((edge) => !removed.has(edge.source) && !removed.has(edge.target))
      continue
    }
    if (operation.kind === 'remove-edge') {
      if (!nextEdges.some((edge) => edge.id === operation.id)) fail(variant.name, operation, `unknown connection “${operation.id}”`)
      nextEdges = nextEdges.filter((edge) => edge.id !== operation.id); continue
    }
    if (operation.kind === 'override') {
      const index = nextNodes.findIndex((node) => node.id === operation.id)
      if (index < 0) fail(variant.name, operation, `unknown component “${operation.id}”`)
      const allowed = ['kind', 'label', 'icon', 'replica-count', 'fill', 'border', 'text', 'description', 'shape', 'opacity', 'border-width', 'width', 'height', 'padding']
      for (const key of Object.keys(operation.options)) if (!allowed.includes(key)) fail(variant.name, operation, `unknown component override “${key}”`)
      const node = nextNodes[index]; const values = { ...operation.options }
      try {
        let kindPatch: Record<string, unknown> = {}
        if (values.kind) {
          const definition = componentDefinitions.find((item) => item.iconId === values.kind || item.kind === values.kind)
          if (!definition) fail(variant.name, operation, `unknown component type “${values.kind}”`)
          kindPatch = { kind: definition.kind, ...(definition.iconId ? { iconId: definition.iconId } : {}) }
        }
        const styleOptions = Object.fromEntries(Object.entries(values).filter(([key]) => !['kind', 'label', 'replica-count'].includes(key)))
        const style = nodeStyleData(styleOptions)
        const replicas = values['replica-count'] === undefined ? undefined : Number(values['replica-count'])
        if (replicas !== undefined && (!Number.isInteger(replicas) || replicas < 1 || replicas > 10000)) fail(variant.name, operation, 'replica-count must be an integer between 1 and 10000')
        const data: Record<string, unknown> = { ...node.data, ...kindPatch, ...style, ...(values.label !== undefined ? { label: values.label } : {}), ...(replicas !== undefined ? { replicaCount: replicas } : {}) }
        nextNodes[index] = { ...node, data, style: { ...node.style, ...(data.customWidth ? { width: Number(data.customWidth) } : {}), ...(data.customHeight ? { height: Number(data.customHeight) } : {}) } }
      } catch (error) { if ((error as Error).message.includes(' in variant ')) throw error; fail(variant.name, operation, (error as Error).message) }
      continue
    }
    const index = nextEdges.findIndex((edge) => edge.id === operation.id)
    if (index < 0) fail(variant.name, operation, `unknown connection “${operation.id}”`)
    const edge = nextEdges[index]
    const label = operation.options.label
    const metadataKeys = ['protocol', 'port', 'async', 'encrypted', 'direction', 'description']
    const styleKeys = ['color', 'width', 'line', 'routing', 'start', 'end']
    for (const key of Object.keys(operation.options)) if (key !== 'label' && !metadataKeys.includes(key) && !styleKeys.includes(key)) fail(variant.name, operation, `unknown connection override “${key}”`)
    try {
      const metadata = connectionMetadata(Object.fromEntries(Object.entries(operation.options).filter(([key]) => metadataKeys.includes(key))))
      const style = edgeStylePatch(Object.fromEntries(Object.entries(operation.options).filter(([key]) => styleKeys.includes(key))))
      let updated: Edge = { ...edge, ...(label !== undefined ? { label } : {}), ...style, data: { ...edge.data, ...metadata, ...style.data }, style: { ...edge.style, ...style.style } }
      if (metadata.direction) {
        updated = { ...updated, markerStart: ['reverse', 'bidirectional'].includes(String(metadata.direction)) ? { type: MarkerType.ArrowClosed } : undefined, markerEnd: ['forward', 'bidirectional'].includes(String(metadata.direction)) ? { type: MarkerType.ArrowClosed } : undefined }
      }
      nextEdges[index] = updated
    } catch (error) { fail(variant.name, operation, (error as Error).message) }
  }
  return { nodes: nextNodes, edges: nextEdges }
}
