import { MarkerType, type Edge, type Node } from '@xyflow/react'
import { componentDefinitions } from './components/canvasCatalog'

export const diagramShapes = ['rectangle', 'rounded', 'ellipse'] as const
export const diagramRoutings = ['straight', 'default', 'smoothstep', 'orthogonal'] as const
export function routingValue(value: string) {
  return ({ curved: 'default', 'smooth-step': 'smoothstep' } as Record<string, string>)[value] || value
}
export function numberOption(value: string, min: number, max: number, name: string) {
  const number = Number(value)
  if (!value.trim() || !Number.isFinite(number) || number < min || number > max) throw new Error(`${name} must be between ${min} and ${max}`)
  return number
}
export function readDiagramOptions(source: string): Record<string, string> {
  const result: Record<string, string> = {}
  let remaining = source.trim()
  while (remaining) {
    const match = remaining.match(/^([\w-]+)=("(?:\\.|[^"\\])*"|[^\s]+)(?:\s+|$)/)
    if (!match) throw new Error('expected key=value options (quote values containing spaces)')
    if (Object.hasOwn(result, match[1])) throw new Error(`duplicate property “${match[1]}”`)
    result[match[1]] = match[2].startsWith('"') ? JSON.parse(match[2]) as string : match[2]
    remaining = remaining.slice(match[0].length).trim()
  }
  return result
}
function allowed(options: Record<string, string>, keys: string[]) {
  for (const key of Object.keys(options)) if (!keys.includes(key)) throw new Error(`unknown style property “${key}”`)
}
function color(value: string, name: string) {
  if (!/^#[\da-f]{6}$/i.test(value)) throw new Error(`${name} must be a six-digit hex color`)
  return value
}
export function nodeStyleData(options: Record<string, string>): Record<string, unknown> {
  allowed(options, ['fill', 'border', 'text', 'description', 'icon', 'shape', 'opacity', 'border-width', 'width', 'height', 'padding'])
  const data: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(options)) {
    if (['fill', 'border', 'text'].includes(key)) data[key === 'text' ? 'textColor' : key] = color(value, key)
    if (key === 'description') data.description = value
    if (key === 'icon') {
      if (!componentDefinitions.some((item) => item.iconId === value)) throw new Error(`unknown icon “${value}”`)
      data.iconId = value
    }
    if (key === 'shape') {
      if (!(diagramShapes as readonly string[]).includes(value)) throw new Error('shape must be rectangle, rounded, or ellipse')
      data.shape = value
    }
    if (key === 'opacity') data.opacity = numberOption(value, 0, 1, key)
    if (key === 'border-width') data.borderWidth = numberOption(value, 0, 12, key)
    if (key === 'width') data.customWidth = numberOption(value, 32, 4000, key)
    if (key === 'height') data.customHeight = numberOption(value, 24, 4000, key)
    if (key === 'padding') data.padding = numberOption(value, 8, 200, key)
  }
  return data
}
export function edgeStylePatch(options: Record<string, string>): Partial<Edge> {
  allowed(options, ['color', 'width', 'line', 'routing', 'start', 'end'])
  const patch: Partial<Edge> = { style: {}, data: {} }
  if (options.color !== undefined) patch.style!.stroke = color(options.color, 'color')
  if (options.width !== undefined) patch.style!.strokeWidth = numberOption(options.width, 0.5, 12, 'width')
  if (options.line !== undefined) {
    if (!['solid', 'dashed', 'dotted'].includes(options.line)) throw new Error('line must be solid, dashed, or dotted')
    patch.style!.strokeDasharray = options.line === 'dashed' ? '7 5' : options.line === 'dotted' ? '2 4' : undefined
  }
  if (options.routing !== undefined) {
    const routing = routingValue(options.routing)
    if (!(diagramRoutings as readonly string[]).includes(routing)) throw new Error('routing must be straight, curved, smooth-step, or orthogonal')
    patch.data!.routing = routing
  }
  for (const name of ['start', 'end'] as const) if (options[name] !== undefined) {
    if (!['none', 'arrow', 'closed'].includes(options[name])) throw new Error(`${name} must be none, arrow, or closed`)
    patch[name === 'start' ? 'markerStart' : 'markerEnd'] = options[name] === 'none' ? undefined : { type: options[name] === 'arrow' ? MarkerType.Arrow : MarkerType.ArrowClosed }
  }
  return patch
}
export function nodeStyleOptions(node: Node) {
  const data = node.data
  return Object.entries({ fill: data.fill, border: data.border, text: data.textColor, description: data.description, icon: data.iconId,
    shape: data.shape, opacity: data.opacity, 'border-width': data.borderWidth, width: data.customWidth, height: data.customHeight, padding: data.padding,
  }).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${key}=${typeof value === 'string' && /\s|["\\]/.test(value) ? JSON.stringify(value) : value}`).join(' ')
}
export function edgeStyleOptions(edge: Edge) {
  const marker = (value: Edge['markerEnd']) => !value ? 'none' : typeof value === 'object' && value.type === MarkerType.Arrow ? 'arrow' : 'closed'
  return Object.entries({ color: edge.style?.stroke, width: edge.style?.strokeWidth, line: edge.style?.strokeDasharray === '2 4' ? 'dotted' : edge.style?.strokeDasharray ? 'dashed' : 'solid', routing: edge.data?.routing || 'smoothstep', start: marker(edge.markerStart), end: marker(edge.markerEnd) })
    .filter(([, value]) => value !== undefined).map(([key, value]) => `${key}=${value}`).join(' ')
}
