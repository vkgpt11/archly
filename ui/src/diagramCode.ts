import { MarkerType, type Edge, type Node } from '@xyflow/react'
import { getComponentSize, type ArchitectureKind } from './components/canvasSizing'
import { componentDefinitions } from './components/canvasCatalog'
import { expandDiagramTemplates } from './diagramTemplates'
import { expandDiagramBlocks } from './diagramBlocks'
import { edgeStyleOptions, edgeStylePatch, nodeStyleData, nodeStyleOptions, readDiagramOptions } from './diagramStyles'
import { defaultLayout, fitDiagramBoundaries, layoutDiagram, readLayout, type LayoutOptions } from './diagramLayout'
import { boundaryTypes, validateBoundaries } from './diagramBoundaries'
import { connectionMetadata, metadataOptions } from './diagramConnections'
import { applyDiagramVariant, compileVariantSource } from './diagramVariants'
import { expandTypedVariables, resolveDiagramImports, type DiagramModule } from './diagramImports'
import { applyDiagramView, compileDiagramViews } from './diagramViews'

const supportedKinds = new Set<ArchitectureKind>([
  'service', 'web', 'mobile', 'database', 'cache', 'queue', 'storage', 'external',
  'actor', 'container', 'note', 'text', 'custom',
])

const technologyTypes: Record<string, { kind: ArchitectureKind; label: string; iconId?: string }> = {
  ...Object.fromEntries(componentDefinitions
    .filter((definition) => definition.iconId)
    .flatMap((definition) => {
      const value = { kind: definition.kind, label: definition.label, iconId: definition.iconId }
      return [[definition.iconId!.toLowerCase(), value], [`icon-${definition.iconId!.toLowerCase()}`, value]]
    })),
  postgres: { kind: 'database', label: 'PostgreSQL', iconId: 'postgresql' },
}

export type DiagramCodeResult = { nodes: Node[]; edges: Edge[]; direction: LayoutOptions['direction']; variants: string[]; activeVariant?: string; views: { name: string; kind: 'dataflow' | 'sequence' }[]; activeView?: string }
type Port = 'left' | 'right' | 'top' | 'bottom'
type Definition = { kind: ArchitectureKind; label: string; iconId?: string; containerId?: string; region?: boolean; depth: number; fill?: string; border?: string; textColor?: string; description?: string; appearance?: Record<string, unknown> }

function unquote(value: string) {
  const trimmed = value.trim()
  return trimmed.startsWith('"') && trimmed.endsWith('"')
    ? trimmed.slice(1, -1).replace(/\\"/g, '"')
    : trimmed
}

export function parseDiagramCode(source: string, activeVariant?: string, modules: DiagramModule[] = [], activeView?: string): DiagramCodeResult {
  const composed = resolveDiagramImports(source, modules)
  const viewCompilation = compileDiagramViews(composed)
  const selectedView = activeView ? viewCompilation.views.find((view) => view.name === activeView) : undefined
  if (activeView && !selectedView) throw new Error(`Unknown view “${activeView}”`)
  const compiled = compileVariantSource(viewCompilation.baseSource, activeVariant)
  const templated = expandDiagramTemplates(compiled.effectiveSource)
  const variableLines = expandTypedVariables(templated.map((line) => line.text).join('\n')).split('\n')
  const expanded = expandDiagramBlocks(templated.map((line, index) => ({ ...line, text: variableLines[index] })))
  try {
    const result = parseExpandedDiagramCode(expanded.map((line) => line.text).join('\n'))
    const variant = compiled.variants.find((item) => item.name === activeVariant)
    const applied = applyDiagramVariant(result.nodes, result.edges, variant)
    const viewed = applyDiagramView(fitDiagramBoundaries(applied.nodes), applied.edges, viewCompilation.baseSource, selectedView)
    return { ...result, ...viewed, variants: compiled.variants.map((item) => item.name), ...(activeVariant ? { activeVariant } : {}), views: viewCompilation.views.map(({ name, kind }) => ({ name, kind })), ...(activeView ? { activeView } : {}) }
  } catch (error) {
    if (!(error instanceof Error)) throw error
    const match = error.message.match(/^Line (\d+): (.*)$/)
    const origin = match ? expanded[Number(match[1]) - 1] : undefined
    if (!origin) throw error
    const sourceVariant = compiled.variants.find((item) => item.additionLines.includes(origin.line))
    throw new Error(`Line ${origin.line}: ${match![2]}${sourceVariant && !match![2].includes(' in variant ') ? ` in variant “${sourceVariant.name}”` : ''}${origin.calls.length ? ` (via ${origin.calls.join(' -> ')})` : ''}`)
  }
}

function parseExpandedDiagramCode(source: string): DiagramCodeResult {
  const definitions = new Map<string, Definition>()
  const connections: { id?: string; source: string; target: string; sourcePort?: Port; targetPort?: Port; label: string; line: number }[] = []
  const containers: string[] = []
  const variables = new Map<string, string>()
  const nodeStyles: { id: string; options: Record<string, string>; line: number }[] = []
  const edgeStyles: { id?: string; source?: string; target?: string; options: Record<string, string>; line: number }[] = []
  const metadata: { id: string; options: Record<string, string>; line: number }[] = []
  const positions: { id: string; x: number; y: number; line: number }[] = []
  const boundaries: { id: string; options: Record<string, string>; line: number }[] = []
  const definitionLines = new Map<string, number>()
  let direction: LayoutOptions['direction'] = 'right'
  let layout = { ...defaultLayout }

  source.split(/\r?\n/).forEach((rawLine, index) => {
    let line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('//')) return
    const variableMatch = line.match(/^let\s+([A-Za-z][\w-]*)\s*=\s*(.+)$/)
    if (variableMatch) { variables.set(variableMatch[1], unquote(variableMatch[2])); return }
    line = line.replace(/\$\{([A-Za-z][\w-]*)\}/g, (_, name: string) => {
      if (!variables.has(name)) throw new Error(`Line ${index + 1}: unknown variable “${name}”`)
      return variables.get(name)!
    })
    const readOptions = (value: string) => {
      try { return readDiagramOptions(value) } catch (error) { throw new Error(`Line ${index + 1}: ${(error as Error).message}`) }
    }
    const layoutMatch = line.match(/^layout\s+(.+)$/)
    if (layoutMatch) {
      try { layout = readLayout(readOptions(layoutMatch[1]), layout); direction = layout.direction } catch (error) { throw new Error(`Line ${index + 1}: ${(error as Error).message}`) }
      return
    }
    const boundaryMetadata = line.match(/^boundary\s+([A-Za-z][\w-]*)\s+(.+)$/)
    if (boundaryMetadata) { boundaries.push({ id: boundaryMetadata[1], options: readOptions(boundaryMetadata[2]), line: index + 1 }); return }
    const ruleMatch = line.match(/^rule\s+([A-Za-z][\w-]*)\s+(.+)$/)
    if (ruleMatch) { readOptions(ruleMatch[2]); return }
    const nodeStyleMatch = line.match(/^style\s+([A-Za-z][\w-]*)\s+(.+)$/i)
    if (nodeStyleMatch) { nodeStyles.push({ id: nodeStyleMatch[1], options: readOptions(nodeStyleMatch[2]), line: index + 1 }); return }
    const edgeStyleMatch = line.match(/^style-edge\s+([A-Za-z][\w-]*)\s*->\s*([A-Za-z][\w-]*)\s+(.+)$/i)
    if (edgeStyleMatch) { edgeStyles.push({ source: edgeStyleMatch[1], target: edgeStyleMatch[2], options: readOptions(edgeStyleMatch[3]), line: index + 1 }); return }
    const identifiedStyle = line.match(/^(style-edge|metadata-edge)\s+("(?:\\.|[^"\\])*"|[A-Za-z][\w-]*)\s+(.+)$/)
    if (identifiedStyle) {
      const id = identifiedStyle[2].startsWith('"') ? JSON.parse(identifiedStyle[2]) as string : identifiedStyle[2]
      const directive = { id, options: readOptions(identifiedStyle[3]), line: index + 1 }
      if (identifiedStyle[1] === 'style-edge') edgeStyles.push(directive)
      else metadata.push(directive)
      return
    }
    const positionMatch = line.match(/^position\s+([A-Za-z][\w-]*)\s+(.+)$/i)
    if (positionMatch) {
      const options = readOptions(positionMatch[2])
      const x = Number(options.x)
      const y = Number(options.y)
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`Line ${index + 1}: position requires numeric x and y values`)
      positions.push({ id: positionMatch[1], x, y, line: index + 1 })
      return
    }
    if (line === '}') {
      if (!containers.length) throw new Error(`Line ${index + 1}: unexpected closing brace`)
      containers.pop()
      return
    }
    const directionMatch = line.match(/^direction\s+(right|left|up|down)$/i)
    if (directionMatch) { direction = directionMatch[1].toLowerCase() as LayoutOptions['direction']; layout.direction = direction; return }

    const blockMatch = line.match(/^(account|subscription|project|region|zone|vpc|vnet|subnet|cluster|namespace|container)\s+([A-Za-z][\w-]*)(?:\s+(.+?))?\s*\{$/i)
    if (blockMatch) {
      const id = blockMatch[2]
      if (definitions.has(id)) throw new Error(`Line ${index + 1}: duplicate component id “${id}”`)
      definitionLines.set(id, index + 1)
      definitions.set(id, {
        kind: 'container', label: blockMatch[3] ? unquote(blockMatch[3]) : id,
        containerId: containers.at(-1), region: blockMatch[1].toLowerCase() === 'region', depth: containers.length,
        appearance: blockMatch[1] === 'container' ? {} : { boundaryType: blockMatch[1].toLowerCase() },
      })
      containers.push(id)
      return
    }

    const identifiedConnection = line.match(/^connection\s+("(?:\\.|[^"\\])*"|[A-Za-z][\w-]*)\s+(.+)$/)
    const connectionId = identifiedConnection ? identifiedConnection[1].startsWith('"') ? JSON.parse(identifiedConnection[1]) as string : identifiedConnection[1] : undefined
    if (connectionId !== undefined && (!connectionId || connectionId.length > 200 || /[\r\n]/.test(connectionId))) throw new Error(`Line ${index + 1}: connection id must contain 1–200 characters without newlines`)
    const edgeMatch = (identifiedConnection?.[2] || line).match(/^([A-Za-z][\w-]*)(?:\.(left|right|top|bottom))?\s*->\s*([A-Za-z][\w-]*)(?:\.(left|right|top|bottom))?(?:\s*:\s*(.+))?$/i)
    if (edgeMatch) {
      connections.push({
        id: connectionId,
        source: edgeMatch[1], sourcePort: edgeMatch[2]?.toLowerCase() as Port | undefined,
        target: edgeMatch[3], targetPort: edgeMatch[4]?.toLowerCase() as Port | undefined,
        label: edgeMatch[5] ? unquote(edgeMatch[5]) : '', line: index + 1,
      })
      return
    }

    const shorthandMatch = line.match(/^([A-Za-z][\w-]*)$/)
    if (shorthandMatch) {
      const token = shorthandMatch[1]
      const normalized = token.toLowerCase()
      const technology = technologyTypes[normalized]
      const kind = supportedKinds.has(normalized as ArchitectureKind) ? normalized as ArchitectureKind : technology?.kind
      if (!kind) throw new Error(`Line ${index + 1}: unknown component type “${token}”`)
      if (definitions.has(token)) throw new Error(`Line ${index + 1}: duplicate component id “${token}”`)
      definitions.set(token, { kind, label: technology?.label || token[0].toUpperCase() + token.slice(1), iconId: technology?.iconId, containerId: containers.at(-1), depth: containers.length })
      return
    }

    const regionMatch = line.match(/^(account|subscription|project|region|zone|vpc|vnet|subnet|cluster|namespace)\s+([A-Za-z][\w-]*)(?:\s+(.+))?$/i)
    if (regionMatch) {
      const id = regionMatch[2]
      if (definitions.has(id)) throw new Error(`Line ${index + 1}: duplicate component id “${id}”`)
      definitions.set(id, {
        kind: 'container', label: regionMatch[3] ? unquote(regionMatch[3]) : id,
        containerId: containers.at(-1), region: regionMatch[1].toLowerCase() === 'region', depth: containers.length,
        appearance: { boundaryType: regionMatch[1].toLowerCase() },
      })
      definitionLines.set(id, index + 1)
      return
    }

    const nodeMatch = line.match(/^([A-Za-z][\w-]*)\s+([A-Za-z][\w-]*)(?:\s+(.+))?$/)
    if (!nodeMatch) throw new Error(`Line ${index + 1}: expected a component or connection`)
    const type = nodeMatch[1].toLowerCase()
    const technology = technologyTypes[type]
    const kind = supportedKinds.has(type as ArchitectureKind) && !type.startsWith('icon-') ? type as ArchitectureKind : technology?.kind
    if (!kind) throw new Error(`Line ${index + 1}: unknown component type “${nodeMatch[1]}”`)
    const id = nodeMatch[2]
    if (definitions.has(id)) throw new Error(`Line ${index + 1}: duplicate component id “${id}”`)
    definitions.set(id, { kind, label: nodeMatch[3] ? unquote(nodeMatch[3]) : technology?.label || id, iconId: technology?.iconId, containerId: containers.at(-1), depth: containers.length })
  })

  if (containers.length) throw new Error(`Unclosed ${definitions.get(containers.at(-1)!)?.region ? 'region' : 'container'} “${containers.at(-1)}”`)

  for (const item of boundaries) {
    const definition = definitions.get(item.id)
    if (!definition || definition.kind !== 'container') throw new Error(`Line ${item.line}: unknown boundary “${item.id}”`)
    for (const key of Object.keys(item.options)) if (!['provider', 'identifier', 'type'].includes(key)) throw new Error(`Line ${item.line}: unknown boundary property “${key}”`)
    if (item.options.type && !(boundaryTypes as readonly string[]).includes(item.options.type)) throw new Error(`Line ${item.line}: unsupported boundary type`)
    definition.appearance = { ...definition.appearance, ...(item.options.provider ? { provider: item.options.provider } : {}), ...(item.options.identifier !== undefined ? { boundaryIdentifier: item.options.identifier } : {}), ...(item.options.type ? { boundaryType: item.options.type } : {}) }
    definitionLines.set(item.id, item.line)
  }

  for (const item of nodeStyles) {
    const definition = definitions.get(item.id)
    if (!definition) throw new Error(`Line ${item.line}: unknown component “${item.id}”`)
    try { definition.appearance = { ...definition.appearance, ...nodeStyleData(item.options) } } catch (error) { throw new Error(`Line ${item.line}: ${(error as Error).message}`) }
  }

  for (const connection of connections) {
    if (!definitions.has(connection.source)) throw new Error(`Line ${connection.line}: unknown component “${connection.source}” in connection`)
    if (!definitions.has(connection.target)) throw new Error(`Line ${connection.line}: unknown component “${connection.target}” in connection`)
  }

  const incoming = new Map([...definitions.keys()].map((id) => [id, 0]))
  connections.forEach(({ target }) => incoming.set(target, (incoming.get(target) || 0) + 1))
  const level = new Map([...definitions.keys()].map((id) => [id, 0]))
  const queue = [...definitions.keys()].filter((id) => incoming.get(id) === 0)
  for (const id of queue) {
    const nextLevel = (level.get(id) || 0) + 1
    connections.filter(({ source }) => source === id).forEach(({ target }) => {
      level.set(target, Math.max(level.get(target) || 0, nextLevel))
      incoming.set(target, (incoming.get(target) || 1) - 1)
      if (incoming.get(target) === 0) queue.push(target)
    })
  }

  const laneByLevel = new Map<string, number>()
  let nodes: Node[] = [...definitions.entries()].map(([id, definition]) => {
    const componentLevel = level.get(id) || 0
    const scopeLevel = `${definition.containerId || 'root'}:${componentLevel}`
    const lane = laneByLevel.get(scopeLevel) || 0
    laneByLevel.set(scopeLevel, lane + 1)
    const size = getComponentSize(definition.label, definition.kind)
    return {
      id, type: 'architecture',
      position: direction === 'right' ? { x: componentLevel * 220, y: lane * 120 } : { x: lane * 180, y: componentLevel * 140 },
      data: { kind: definition.kind, label: definition.label, iconId: definition.iconId, containerId: definition.containerId, region: definition.region, diagramLayout: layout, ...definition.appearance }, style: { width: Number(definition.appearance?.customWidth || size.width), height: Number(definition.appearance?.customHeight || size.height) },
      zIndex: definition.kind === 'container' ? -10 + definition.depth : 0,
    } satisfies Node
  })

  validateBoundaries(nodes, definitionLines)
  nodes = layoutDiagram(nodes, connections, layout)
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  for (const item of positions) {
    const node = nodeById.get(item.id)
    if (!node) throw new Error(`Line ${item.line}: unknown component “${item.id}”`)
    node.position = { x: item.x, y: item.y }
  }
  nodes = fitDiagramBoundaries(nodes, new Map(positions.map((item) => [item.id, item.line])))
  const usedEdgeIds = new Set<string>()
  const edges = connections.map((connection, index) => {
    const id = connection.id || `code-edge-${index}-${connection.source}-${connection.target}`
    if (usedEdgeIds.has(id)) throw new Error(`Line ${connection.line}: duplicate connection id “${id}”`)
    usedEdgeIds.add(id)
    let edge: Edge = {
      id,
      source: connection.source, target: connection.target, type: 'editable', label: connection.label,
      sourceHandle: connection.sourcePort || ({ right: 'right', left: 'left', down: 'bottom', up: 'top' })[direction],
      targetHandle: connection.targetPort || ({ right: 'left', left: 'right', down: 'top', up: 'bottom' })[direction],
      data: { routing: layout.routing }, style: {}, markerEnd: { type: MarkerType.ArrowClosed },
    }
    for (const directive of metadata.filter((item) => item.id === id)) {
      try { edge.data = { ...edge.data, ...connectionMetadata(directive.options) } } catch (error) { throw new Error(`Line ${directive.line}: ${(error as Error).message}`) }
    }
    if (edge.data?.direction) {
      edge.markerStart = ['reverse', 'bidirectional'].includes(String(edge.data.direction)) ? { type: MarkerType.ArrowClosed } : undefined
      edge.markerEnd = ['forward', 'bidirectional'].includes(String(edge.data.direction)) ? { type: MarkerType.ArrowClosed } : undefined
    }
    for (const directive of edgeStyles.filter((item) => item.id ? item.id === id : item.source === connection.source && item.target === connection.target)) {
      try {
        const patch = edgeStylePatch(directive.options)
        edge = { ...edge, ...patch, style: { ...edge.style, ...patch.style }, data: { ...edge.data, ...patch.data } }
      } catch (error) { throw new Error(`Line ${directive.line}: ${(error as Error).message}`) }
    }
    return edge
  })
  for (const directive of edgeStyles) if (!edges.some((edge) => directive.id ? edge.id === directive.id : edge.source === directive.source && edge.target === directive.target)) throw new Error(`Line ${directive.line}: unknown connection “${directive.id || `${directive.source} -> ${directive.target}`}”`)
  for (const directive of metadata) if (!usedEdgeIds.has(directive.id)) throw new Error(`Line ${directive.line}: unknown connection “${directive.id}”`)
  return { nodes, edges, direction, variants: [], views: [] }
}

export function diagramToCode(nodes: Node[], edges: Edge[]): string {
  const layout = (nodes.find((node) => node.data.diagramLayout)?.data.diagramLayout as LayoutOptions | undefined) || defaultLayout
  const lines = [`direction ${layout.direction}`, `layout horizontal-spacing=${layout.horizontal} vertical-spacing=${layout.vertical} rank-separation=${layout.rank} routing=${layout.routing}`, '']
  const aliases = new Map(nodes.map((node, index) => [node.id, /^[A-Za-z][\w-]*$/.test(node.id) ? node.id : `component${index + 1}`]))
  const emitNodes = (containerId?: string, indent = '') => nodes.filter((node) => String(node.data?.containerId || '') === String(containerId || '')).forEach((node) => {
    const children = nodes.some((item) => item.data?.containerId === node.id)
    const kind = String(node.data?.boundaryType || (node.data?.region ? 'region' : node.data?.kind || 'service'))
    const label = String(node.data?.label || node.id).replace(/"/g, '\\"')
    if (node.data?.kind === 'container' && children) {
      lines.push(`${indent}${kind} ${aliases.get(node.id)} "${label}" {`)
      emitNodes(node.id, `${indent}  `)
      lines.push(`${indent}}`)
    } else lines.push(`${indent}${kind} ${aliases.get(node.id)} "${label}"`)
  })
  emitNodes()
  nodes.filter((node) => node.data.boundaryType).forEach((node) => {
    const options = [node.data.provider && `provider=${node.data.provider}`, node.data.boundaryIdentifier !== undefined && `identifier=${JSON.stringify(node.data.boundaryIdentifier)}`].filter(Boolean)
    if (options.length) lines.push(`boundary ${aliases.get(node.id)} ${options.join(' ')}`)
  })
  const styledNodes = nodes.filter((node) => nodeStyleOptions(node))
  if (styledNodes.length) lines.push('')
  styledNodes.forEach((node) => {
    lines.push(`style ${aliases.get(node.id)} ${nodeStyleOptions(node)}`)
  })
  if (nodes.length) lines.push('')
  const coordinate = (value: number) => String(Math.round(value * 100) / 100)
  nodes.forEach((node) => lines.push(`position ${aliases.get(node.id)} x=${coordinate(node.position.x)} y=${coordinate(node.position.y)}`))
  if (edges.length) lines.push('')
  for (const edge of edges) {
    const label = String(edge.label || '').replace(/"/g, '\\"')
    const source = aliases.get(edge.source)
    const target = aliases.get(edge.target)
    const sourcePort = edge.sourceHandle ? `.${edge.sourceHandle}` : ''
    const targetPort = edge.targetHandle ? `.${edge.targetHandle}` : ''
    if (source && target) lines.push(`connection ${JSON.stringify(edge.id)} ${source}${sourcePort} -> ${target}${targetPort}${label ? ` : "${label}"` : ''}`)
  }
  const styledEdges = edges
  if (styledEdges.length) lines.push('')
  styledEdges.forEach((edge) => {
    const source = aliases.get(edge.source); const target = aliases.get(edge.target)
    if (!source || !target) return
    lines.push(`style-edge ${JSON.stringify(edge.id)} ${edgeStyleOptions(edge)}`)
    const metadata = metadataOptions(edge.data)
    if (metadata) lines.push(`metadata-edge ${JSON.stringify(edge.id)} ${metadata}`)
  })
  return lines.join('\n')
}
