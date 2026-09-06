import type { Edge, Node } from '@xyflow/react'
import type { CanvasData } from './types'
import { componentDefinitions } from './components/canvasCatalog'
import { defaultLayout, fitDiagramBoundaries, layoutDiagram } from './diagramLayout'
import { getComponentSize, type ArchitectureKind } from './components/canvasSizing'
import { validateDiagramRules } from './diagramRules'

export type AiGenerationMode = 'create' | 'edit' | 'selection' | 'explain'
export type AiGenerationContext = { currentCanvas?: string; documentation?: string; mode: AiGenerationMode; selectedSubsystem?: string }

export const aiPresets = [
  { id: 'custom', label: 'Custom', prompt: '' },
  { id: 'web', label: 'Web platform', prompt: 'Design a production web platform with frontend, APIs, identity, data, caching, observability and secure boundaries.' },
  { id: 'microservices', label: 'Microservices', prompt: 'Design an event-driven microservices platform with gateway, service ownership, queues, databases and observability.' },
  { id: 'multi-region', label: 'Multi-region', prompt: 'Design an active-active multi-region architecture with global routing, regional isolation, replication and failover.' },
  { id: 'data', label: 'Data platform', prompt: 'Design a modern batch and streaming data platform with ingestion, processing, storage, governance and analytics.' },
  { id: 'ai', label: 'AI / ML', prompt: 'Design a production AI platform with model access, retrieval, vector storage, evaluation, observability and safety controls.' },
]

export const catalogueForAi = () => JSON.stringify(componentDefinitions.map(({ label, kind, iconId, category, description }) => ({ label, kind, iconId: iconId || null, category: category || 'General', description })))

export function selectedSubsystem(nodes: Node[], edges: Edge[]) {
  const selected = nodes.filter(node => node.selected)
  if (!selected.length) return undefined
  const ids = new Set(selected.map(node => node.id))
  return JSON.stringify({ nodes: selected.map(compactNode), edges: edges.filter(edge => ids.has(edge.source) || ids.has(edge.target)).map(compactEdge) })
}

export function canvasContext(nodes: Node[], edges: Edge[]) {
  return JSON.stringify({ nodes: nodes.map(compactNode), edges: edges.map(compactEdge) })
}

const compactNode = (node: Node) => ({ id: node.id, label: node.data.label, kind: node.data.kind, iconId: node.data.iconId, containerId: node.data.containerId, boundaryType: node.data.boundaryType, provider: node.data.provider })
const compactEdge = (edge: Edge) => ({ id: edge.id, source: edge.source, target: edge.target, label: edge.label, ...edge.data })

export function prepareAiCanvas(canvas: CanvasData): CanvasData {
  const sized = canvas.nodes.map(node => {
    const size = getComponentSize(String(node.data.label || ''), String(node.data.kind || 'service') as ArchitectureKind)
    return { ...node, position: { ...node.position }, style: { ...node.style, width: size.width, height: size.height } }
  })
  const laidOut = layoutDiagram(sized, canvas.edges, { ...defaultLayout, direction: 'right', routing: 'smoothstep' })
  return { ...canvas, nodes: fitDiagramBoundaries(laidOut), edges: canvas.edges.map(edge => ({ ...edge, data: { routing: 'smoothstep', ...edge.data } })) }
}

export function analyzeArchitecture(canvas: CanvasData): string[] {
  const findings = validateDiagramRules(canvas.nodes, canvas.edges).map(item => `${item.severity.toUpperCase()}: ${item.message} ${item.remediation}`)
  if (!canvas.nodes.some(node => node.data.kind === 'container')) findings.push('No deployment or trust boundaries are shown.')
  if (canvas.edges.some(edge => !edge.data?.protocol && !edge.label)) findings.push('Some connections do not describe a protocol or purpose.')
  if (canvas.nodes.some(node => node.data.kind === 'database') && !canvas.nodes.some(node => /monitor|observ|telemetry|logging/i.test(String(node.data.label)))) findings.push('Operational observability is not represented.')
  if (!findings.length) findings.push('No obvious structural quality issues detected.')
  return findings
}
