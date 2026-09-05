import type { Edge, Node } from '@xyflow/react'

export type DiagramRuleId = 'no-public-database' | 'services-must-use-tls' | 'no-cross-boundary-connection-without-encryption' | 'no-orphan-component'
export type DiagramRuleSeverity = 'error' | 'warning' | 'info' | 'off'
export type DiagramRuleScope = 'component' | 'connection' | 'diagram'
export type DiagramRuleViolation = {
  ruleId: DiagramRuleId
  severity: Exclude<DiagramRuleSeverity, 'off'>
  message: string
  affectedSymbols: string[]
  location: { line: number; column: number; length: number }
  remediation: string
  scope: DiagramRuleScope
  suppressed?: boolean
  suppressionReason?: string
}
type RuleConfig = { severity?: DiagramRuleSeverity; suppressReason?: string }

export const diagramRules: Array<{ id: DiagramRuleId; severity: Exclude<DiagramRuleSeverity, 'off'>; scope: DiagramRuleScope; description: string }> = [
  { id: 'no-public-database', severity: 'error', scope: 'component', description: 'Databases and caches should not be directly exposed through public boundaries.' },
  { id: 'services-must-use-tls', severity: 'warning', scope: 'connection', description: 'HTTP-like service dependencies should declare encrypted=true.' },
  { id: 'no-cross-boundary-connection-without-encryption', severity: 'error', scope: 'connection', description: 'Connections crossing semantic boundaries should be encrypted.' },
  { id: 'no-orphan-component', severity: 'info', scope: 'component', description: 'Components should have at least one relationship unless intentionally standalone.' },
]

const severities: DiagramRuleSeverity[] = ['error', 'warning', 'info', 'off']
const ruleIds = new Set<DiagramRuleId>(diagramRules.map((rule) => rule.id))
const publicBoundaryLabels = /\b(public|internet|edge|dmz)\b/i

function wordLocation(source: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`\\b${escaped}\\b`))
  const index = match?.index ?? 0
  const prefix = source.slice(0, index)
  const line = prefix.split(/\r?\n/).length
  const column = prefix.length - Math.max(prefix.lastIndexOf('\n'), prefix.lastIndexOf('\r')) || 1
  return { line, column, length: word.length }
}

function readRuleConfig(source: string) {
  const configs = new Map<DiagramRuleId, RuleConfig>()
  source.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim()
    const match = line.match(/^rule\s+([A-Za-z][\w-]*)\s+(.+)$/)
    if (!match) return
    const id = match[1] as DiagramRuleId
    if (!ruleIds.has(id)) throw new Error(`Line ${index + 1}: unknown architecture rule “${match[1]}”`)
    const options = Object.fromEntries([...match[2].matchAll(/([A-Za-z][\w-]*)=(?:"((?:\\.|[^"\\])*)"|(\S+))/g)].map((item) => [item[1], item[2]?.replace(/\\"/g, '"') ?? item[3]]))
    for (const key of Object.keys(options)) if (!['severity', 'suppress'].includes(key)) throw new Error(`Line ${index + 1}: unknown rule property “${key}”`)
    const severity = options.severity as DiagramRuleSeverity | undefined
    if (severity && !severities.includes(severity)) throw new Error(`Line ${index + 1}: rule severity must be error, warning, info, or off`)
    if (options.suppress && options.suppress.trim().length < 3) throw new Error(`Line ${index + 1}: rule suppression requires a reason`)
    configs.set(id, { ...(severity ? { severity } : {}), ...(options.suppress ? { suppressReason: options.suppress } : {}) })
  })
  return configs
}

function nodeKind(node: Node) { return String(node.data?.kind || '') }
function boundaryName(node?: Node) { return node ? String(node.data?.boundaryIdentifier || node.data?.label || node.id) : '' }
function containerId(node: Node) {
  const value = node.data?.containerId
  return typeof value === 'string' ? value : undefined
}
function isPublic(node: Node, byId: Map<string, Node>) {
  let current: Node | undefined = node
  const seen = new Set<string>()
  while (current) {
    if (seen.has(current.id)) return false
    seen.add(current.id)
    if (publicBoundaryLabels.test(boundaryName(current))) return true
    const parentId: string | undefined = containerId(current)
    current = parentId ? byId.get(String(parentId)) : undefined
  }
  return false
}
function boundaryRoot(node: Node, byId: Map<string, Node>) {
  let current: Node | undefined = node
  let semantic = ''
  const seen = new Set<string>()
  while (current) {
    if (seen.has(current.id)) break
    seen.add(current.id)
    if (current.data?.boundaryType || current.data?.provider) semantic = current.id
    const parentId: string | undefined = containerId(current)
    current = parentId ? byId.get(String(parentId)) : undefined
  }
  return semantic || String(node.data?.containerId || '')
}
function edgeEncrypted(edge: Edge) { return edge.data?.encrypted === true || String(edge.data?.protocol || '').toUpperCase() === 'HTTPS' || String(edge.data?.protocol || '').toUpperCase() === 'GRPC' }

export function validateDiagramRules(nodes: Node[], edges: Edge[], source = ''): DiagramRuleViolation[] {
  const configs = readRuleConfig(source)
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const connected = new Set<string>()
  edges.forEach((edge) => { connected.add(edge.source); connected.add(edge.target) })
  const violations: DiagramRuleViolation[] = []
  const push = (violation: Omit<DiagramRuleViolation, 'severity' | 'suppressed' | 'suppressionReason'> & { defaultSeverity: Exclude<DiagramRuleSeverity, 'off'> }) => {
    const config = configs.get(violation.ruleId)
    const severity = config?.severity ?? violation.defaultSeverity
    if (severity === 'off') return
    violations.push({
      ruleId: violation.ruleId,
      severity,
      message: violation.message,
      affectedSymbols: violation.affectedSymbols,
      location: violation.location,
      remediation: violation.remediation,
      scope: violation.scope,
      ...(config?.suppressReason ? { suppressed: true, suppressionReason: config.suppressReason } : {}),
    })
  }
  for (const node of nodes) {
    const kind = nodeKind(node)
    if (['database', 'cache'].includes(kind) && isPublic(node, byId)) push({
      ruleId: 'no-public-database', defaultSeverity: 'error', scope: 'component', affectedSymbols: [node.id],
      location: wordLocation(source, node.id), message: `${String(node.data?.label || node.id)} is inside a public boundary.`,
      remediation: 'Move the data store into a private boundary or mark a documented suppression with a reason.',
    })
    if (kind !== 'container' && !connected.has(node.id)) push({
      ruleId: 'no-orphan-component', defaultSeverity: 'info', scope: 'component', affectedSymbols: [node.id],
      location: wordLocation(source, node.id), message: `${String(node.data?.label || node.id)} has no incoming or outgoing connections.`,
      remediation: 'Add a connection or suppress this rule if the component is intentionally standalone.',
    })
  }
  for (const edge of edges) {
    const sourceNode = byId.get(edge.source)
    const targetNode = byId.get(edge.target)
    const symbols = [edge.id, edge.source, edge.target].filter(Boolean)
    if (['HTTP', 'REST'].includes(String(edge.data?.protocol || '').toUpperCase()) && !edgeEncrypted(edge)) push({
      ruleId: 'services-must-use-tls', defaultSeverity: 'warning', scope: 'connection', affectedSymbols: symbols,
      location: wordLocation(source, edge.id || edge.source), message: `${String(edge.label || edge.id)} should declare encrypted=true.`,
      remediation: 'Use HTTPS/GRPC or add metadata-edge with encrypted=true.',
    })
    if (sourceNode && targetNode && boundaryRoot(sourceNode, byId) !== boundaryRoot(targetNode, byId) && !edgeEncrypted(edge)) push({
      ruleId: 'no-cross-boundary-connection-without-encryption', defaultSeverity: 'error', scope: 'connection', affectedSymbols: symbols,
      location: wordLocation(source, edge.id || edge.source), message: `${String(edge.label || edge.id)} crosses boundaries without encryption metadata.`,
      remediation: 'Set encrypted=true on the connection metadata or document a suppression reason.',
    })
  }
  return violations.sort((a, b) => a.location.line - b.location.line || a.ruleId.localeCompare(b.ruleId)).slice(0, 200)
}
