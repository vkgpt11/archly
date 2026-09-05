import type { Node } from '@xyflow/react'
export const boundaryTypes = ['account', 'subscription', 'project', 'region', 'zone', 'vpc', 'vnet', 'subnet', 'cluster', 'namespace'] as const
const parents: Record<string, string[]> = {
  account: [], subscription: [], project: [], region: ['account', 'subscription', 'project'], zone: ['region'],
  vpc: ['account', 'region', 'project'], vnet: ['subscription', 'region'], subnet: ['vpc', 'vnet', 'zone'],
  cluster: ['account', 'subscription', 'project', 'region', 'zone', 'vpc', 'vnet', 'subnet'], namespace: ['cluster'],
}
const fixedProvider: Record<string, string> = { account: 'aws', subscription: 'azure', project: 'gcp', vnet: 'azure' }
export function validateBoundaries(nodes: Node[], lines = new Map<string, number>()) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const visited = new Set<string>()
  const visit = (node: Node, ancestors: Set<string>) => {
    if (visited.has(node.id)) return
    const fail = (message: string): never => { throw new Error(`Line ${lines.get(node.id) || 1}: ${message}`) }
    if (ancestors.has(node.id)) fail('cyclic boundary membership')
    const parent = byId.get(String(node.data.containerId))
    if (parent) visit(parent, new Set([...ancestors, node.id]))
    const type = String(node.data.boundaryType || '')
    const inherited = String(parent?.data.provider || '')
    const provider = String(node.data.provider || fixedProvider[type] || inherited || '')
    if (provider && !['aws', 'azure', 'gcp', 'kubernetes'].includes(provider)) fail('provider must be aws, azure, gcp, or kubernetes')
    if (fixedProvider[type] && provider !== fixedProvider[type]) fail(`${type} requires provider ${fixedProvider[type]}`)
    if (inherited && provider && inherited !== provider && provider !== 'kubernetes') fail('boundary provider conflicts with its parent')
    if (type && parent?.data.boundaryType && !parents[type]?.includes(String(parent.data.boundaryType))) fail(`${type} cannot be nested in ${parent.data.boundaryType}`)
    if (provider) node.data = { ...node.data, provider }
    visited.add(node.id)
  }
  nodes.forEach((node) => visit(node, new Set()))
}
