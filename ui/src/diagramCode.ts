import { MarkerType, type Edge, type Node } from '@xyflow/react'
import { getComponentSize, type ArchitectureKind } from './components/canvasSizing'
import { componentDefinitions } from './components/canvasCatalog'

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

export type DiagramCodeResult = { nodes: Node[]; edges: Edge[]; direction: 'right' | 'down' }
type Port = 'left' | 'right' | 'top' | 'bottom'
type Definition = { kind: ArchitectureKind; label: string; iconId?: string; containerId?: string; region?: boolean; depth: number; fill?: string; border?: string; textColor?: string; description?: string }

function unquote(value: string) {
  const trimmed = value.trim()
  return trimmed.startsWith('"') && trimmed.endsWith('"')
    ? trimmed.slice(1, -1).replace(/\\"/g, '"')
    : trimmed
}

export function parseDiagramCode(source: string): DiagramCodeResult {
  const definitions = new Map<string, Definition>()
  const connections: { source: string; target: string; sourcePort?: Port; targetPort?: Port; label: string; line: number }[] = []
  const containers: string[] = []
  const variables = new Map<string, string>()
  const nodeStyles: { id: string; options: Record<string, string>; line: number }[] = []
  const edgeStyles: { source: string; target: string; options: Record<string, string>; line: number }[] = []
  const positions: { id: string; x: number; y: number; line: number }[] = []
  let direction: 'right' | 'down' = 'right'

  source.split(/\r?\n/).forEach((rawLine, index) => {
    let line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('//')) return
    const variableMatch = line.match(/^let\s+([A-Za-z][\w-]*)\s*=\s*(.+)$/)
    if (variableMatch) { variables.set(variableMatch[1], unquote(variableMatch[2])); return }
    line = line.replace(/\$\{([A-Za-z][\w-]*)\}/g, (_, name: string) => {
      if (!variables.has(name)) throw new Error(`Line ${index + 1}: unknown variable “${name}”`)
      return variables.get(name)!
    })
    const readOptions = (value: string) => Object.fromEntries([...value.matchAll(/([\w-]+)=("(?:\\"|[^"])*"|\S+)/g)].map((match) => [match[1], unquote(match[2])]))
    const nodeStyleMatch = line.match(/^style\s+([A-Za-z][\w-]*)\s+(.+)$/i)
    if (nodeStyleMatch) { nodeStyles.push({ id: nodeStyleMatch[1], options: readOptions(nodeStyleMatch[2]), line: index + 1 }); return }
    const edgeStyleMatch = line.match(/^style-edge\s+([A-Za-z][\w-]*)\s*->\s*([A-Za-z][\w-]*)\s+(.+)$/i)
    if (edgeStyleMatch) { edgeStyles.push({ source: edgeStyleMatch[1], target: edgeStyleMatch[2], options: readOptions(edgeStyleMatch[3]), line: index + 1 }); return }
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
    const directionMatch = line.match(/^direction\s+(right|down)$/i)
    if (directionMatch) { direction = directionMatch[1].toLowerCase() as 'right' | 'down'; return }

    const blockMatch = line.match(/^(region|container)\s+([A-Za-z][\w-]*)(?:\s+(.+?))?\s*\{$/i)
    if (blockMatch) {
      const id = blockMatch[2]
      if (definitions.has(id)) throw new Error(`Line ${index + 1}: duplicate component id “${id}”`)
      definitions.set(id, {
        kind: 'container', label: blockMatch[3] ? unquote(blockMatch[3]) : id,
        containerId: containers.at(-1), region: blockMatch[1].toLowerCase() === 'region', depth: containers.length,
      })
      containers.push(id)
      return
    }

    const edgeMatch = line.match(/^([A-Za-z][\w-]*)(?:\.(left|right|top|bottom))?\s*->\s*([A-Za-z][\w-]*)(?:\.(left|right|top|bottom))?(?:\s*:\s*(.+))?$/i)
    if (edgeMatch) {
      connections.push({
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

    const regionMatch = line.match(/^region\s+([A-Za-z][\w-]*)(?:\s+(.+))?$/i)
    if (regionMatch) {
      const id = regionMatch[1]
      if (definitions.has(id)) throw new Error(`Line ${index + 1}: duplicate component id “${id}”`)
      definitions.set(id, {
        kind: 'container', label: regionMatch[2] ? unquote(regionMatch[2]) : id,
        containerId: containers.at(-1), region: true, depth: containers.length,
      })
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

  const validColor = (value: string) => /^#[\da-f]{6}$/i.test(value)
  for (const item of nodeStyles) {
    const definition = definitions.get(item.id)
    if (!definition) throw new Error(`Line ${item.line}: unknown component “${item.id}”`)
    for (const key of ['fill', 'border', 'text'] as const) if (item.options[key] && !validColor(item.options[key])) throw new Error(`Line ${item.line}: ${key} must be a six-digit hex color`)
    Object.assign(definition, { fill: item.options.fill, border: item.options.border, textColor: item.options.text, description: item.options.description })
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
  const nodes: Node[] = [...definitions.entries()].map(([id, definition]) => {
    const componentLevel = level.get(id) || 0
    const scopeLevel = `${definition.containerId || 'root'}:${componentLevel}`
    const lane = laneByLevel.get(scopeLevel) || 0
    laneByLevel.set(scopeLevel, lane + 1)
    const size = getComponentSize(definition.label, definition.kind)
    return {
      id, type: 'architecture',
      position: direction === 'right' ? { x: componentLevel * 220, y: lane * 120 } : { x: lane * 180, y: componentLevel * 140 },
      data: { kind: definition.kind, label: definition.label, iconId: definition.iconId, containerId: definition.containerId, region: definition.region, fill: definition.fill, border: definition.border, textColor: definition.textColor, description: definition.description }, style: size,
      zIndex: definition.kind === 'container' ? -10 + definition.depth : 0,
    } satisfies Node
  })

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const descendantsOf = (containerId: string) => nodes.filter((node) => {
    let parent = definitions.get(node.id)?.containerId
    while (parent) {
      if (parent === containerId) return true
      parent = definitions.get(parent)?.containerId
    }
    return false
  })
  const shift = (containerId: string, dx: number, dy: number) => descendantsOf(containerId).forEach((node) => {
    node.position = { x: node.position.x + dx, y: node.position.y + dy }
  })
  const layoutScope = (parentId?: string) => {
    const direct = nodes.filter((node) => definitions.get(node.id)?.containerId === parentId)
    direct.filter((node) => node.data.kind === 'container').forEach((node) => layoutScope(node.id))
    let cursor = parentId ? 48 : 0
    direct.forEach((node) => {
      const old = node.position
      const next = direction === 'right' ? { x: cursor, y: parentId ? 56 : 0 } : { x: parentId ? 48 : 0, y: cursor }
      node.position = next
      if (node.data.kind === 'container') shift(node.id, next.x - old.x, next.y - old.y)
      const width = Number(node.style?.width || node.width || 82)
      const height = Number(node.style?.height || node.height || 42)
      cursor += (direction === 'right' ? width : height) + 72
    })
    if (!parentId) return
    const parent = nodeById.get(parentId)!
    const children = descendantsOf(parentId)
    const maxX = Math.max(280, ...children.map((node) => node.position.x + Number(node.style?.width || node.width || 82) + 48))
    const maxY = Math.max(180, ...children.map((node) => node.position.y + Number(node.style?.height || node.height || 42) + 48))
    parent.position = { x: 0, y: 0 }
    parent.style = { ...parent.style, width: maxX, height: maxY }
  }
  layoutScope()
  for (const item of positions) {
    const node = nodeById.get(item.id)
    if (!node) throw new Error(`Line ${item.line}: unknown component “${item.id}”`)
    node.position = { x: item.x, y: item.y }
  }
  const edges = connections.map((connection, index) => {
    const directive = edgeStyles.find((item) => item.source === connection.source && item.target === connection.target)
    if (directive?.options.color && !validColor(directive.options.color)) throw new Error(`Line ${directive.line}: color must be a six-digit hex color`)
    const routing = directive?.options.routing || 'smoothstep'
    if (!['straight', 'default', 'smoothstep'].includes(routing)) throw new Error(`Line ${directive!.line}: routing must be straight, default, or smoothstep`)
    return {
      id: `code-edge-${index}-${connection.source}-${connection.target}`,
      source: connection.source, target: connection.target, type: 'editable', label: connection.label,
      sourceHandle: connection.sourcePort || (direction === 'right' ? 'right' : 'bottom'),
      targetHandle: connection.targetPort || (direction === 'right' ? 'left' : 'top'),
      data: { routing }, style: { stroke: directive?.options.color, strokeDasharray: directive?.options.line === 'dashed' ? '7 5' : undefined }, markerEnd: { type: MarkerType.ArrowClosed },
    } satisfies Edge
  })
  for (const directive of edgeStyles) if (!connections.some((edge) => edge.source === directive.source && edge.target === directive.target)) throw new Error(`Line ${directive.line}: unknown connection “${directive.source} -> ${directive.target}”`)
  return { nodes, edges, direction }
}

export function diagramToCode(nodes: Node[], edges: Edge[]): string {
  const lines = ['direction right', '']
  const aliases = new Map(nodes.map((node, index) => [node.id, /^[A-Za-z][\w-]*$/.test(node.id) ? node.id : `component${index + 1}`]))
  const emitNodes = (containerId?: string, indent = '') => nodes.filter((node) => String(node.data?.containerId || '') === String(containerId || '')).forEach((node) => {
    const children = nodes.some((item) => item.data?.containerId === node.id)
    const kind = node.data?.region ? 'region' : String(node.data?.iconId || node.data?.kind || 'service')
    const label = String(node.data?.label || node.id).replace(/"/g, '\\"')
    if (node.data?.kind === 'container' && children) {
      lines.push(`${indent}${kind} ${aliases.get(node.id)} "${label}" {`)
      emitNodes(node.id, `${indent}  `)
      lines.push(`${indent}}`)
    } else lines.push(`${indent}${kind} ${aliases.get(node.id)} "${label}"`)
  })
  emitNodes()
  const styledNodes = nodes.filter((node) => node.data?.fill || node.data?.border || node.data?.textColor || node.data?.description)
  if (styledNodes.length) lines.push('')
  styledNodes.forEach((node) => {
    const options = [node.data?.fill && `fill=${node.data.fill}`, node.data?.border && `border=${node.data.border}`, node.data?.textColor && `text=${node.data.textColor}`, node.data?.description && `description="${String(node.data.description).replace(/"/g, '\\"')}"`].filter(Boolean)
    lines.push(`style ${aliases.get(node.id)} ${options.join(' ')}`)
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
    if (source && target) lines.push(`${source}${sourcePort} -> ${target}${targetPort}${label ? ` : "${label}"` : ''}`)
  }
  const styledEdges = edges.filter((edge) => edge.style?.stroke || edge.style?.strokeDasharray || edge.data?.routing && edge.data.routing !== 'smoothstep')
  if (styledEdges.length) lines.push('')
  styledEdges.forEach((edge) => {
    const source = aliases.get(edge.source); const target = aliases.get(edge.target)
    if (!source || !target) return
    const options = [edge.style?.stroke && `color=${edge.style.stroke}`, edge.style?.strokeDasharray && 'line=dashed', edge.data?.routing && edge.data.routing !== 'smoothstep' && `routing=${edge.data.routing}`].filter(Boolean)
    lines.push(`style-edge ${source}->${target} ${options.join(' ')}`)
  })
  return lines.join('\n')
}
