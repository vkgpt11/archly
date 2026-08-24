import type { Edge, Node } from '@xyflow/react'

export type ArchitectureTemplate = { id: string; name: string; description: string; nodes: Node[]; edges: Edge[] }

const node = (id: string, label: string, kind: string, x: number, y: number, iconId?: string): Node => ({
  id, type: 'architecture', position: { x, y }, data: { label, kind, iconId },
})
const edge = (id: string, source: string, target: string, label = 'depends on'): Edge => ({
  id, source, target, type: 'editable', label, data: { routing: 'smoothstep' },
})

export const architectureTemplates: ArchitectureTemplate[] = [
  { id: 'blank', name: 'Blank diagram', description: 'Start with an empty canvas.', nodes: [], edges: [] },
  { id: 'three-tier', name: 'Three-tier architecture', description: 'Web, application, and database tiers.',
    nodes: [node('web', 'Web application', 'web', 0, 80), node('api', 'Application service', 'service', 220, 80), node('db', 'PostgreSQL', 'database', 440, 80, 'postgresql')],
    edges: [edge('web-api', 'web', 'api', 'HTTPS'), edge('api-db', 'api', 'db', 'SQL')] },
  { id: 'microservices', name: 'Microservices architecture', description: 'Gateway, services, event stream, and data stores.',
    nodes: [node('gateway', 'API Gateway', 'service', 0, 100), node('orders', 'Orders service', 'service', 220, 20), node('payments', 'Payments service', 'service', 220, 180), node('events', 'Kafka', 'queue', 440, 100, 'kafka')],
    edges: [edge('g-o', 'gateway', 'orders'), edge('g-p', 'gateway', 'payments'), edge('o-e', 'orders', 'events', 'events'), edge('p-e', 'payments', 'events', 'events')] },
  { id: 'event-driven', name: 'Event-driven architecture', description: 'Producer, Kafka event bus, consumers, and cache.',
    nodes: [node('producer', 'Event producer', 'service', 0, 100), node('kafka', 'Kafka', 'queue', 220, 100, 'kafka'), node('consumer-a', 'Consumer A', 'service', 440, 20), node('consumer-b', 'Consumer B', 'service', 440, 180), node('redis', 'Redis', 'cache', 660, 100, 'redis')],
    edges: [edge('p-k', 'producer', 'kafka', 'publishes'), edge('k-a', 'kafka', 'consumer-a', 'subscribes'), edge('k-b', 'kafka', 'consumer-b', 'subscribes'), edge('b-r', 'consumer-b', 'redis')] },
  { id: 'kubernetes', name: 'Kubernetes deployment', description: 'Ingress, services, workloads, and persistent storage.',
    nodes: [node('ingress', 'Ingress', 'external', 0, 100, 'kubernetes'), node('service', 'Kubernetes Service', 'service', 220, 100, 'kubernetes'), node('pods', 'Application Pods', 'service', 440, 100, 'kubernetes'), node('db', 'PostgreSQL', 'database', 660, 100, 'postgresql')],
    edges: [edge('i-s', 'ingress', 'service', 'routes'), edge('s-p', 'service', 'pods', 'balances'), edge('p-d', 'pods', 'db', 'SQL')] },
]

export function templateCanvas(template: ArchitectureTemplate) {
  return JSON.stringify({ nodes: structuredClone(template.nodes), edges: structuredClone(template.edges) })
}
