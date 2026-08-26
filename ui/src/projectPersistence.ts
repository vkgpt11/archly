import type { Edge, Node, Viewport } from '@xyflow/react'
import type { CanvasData, Project } from './types'
import { getComponentSize, type ArchitectureKind } from './components/canvasSizing'

export type ProjectContent = Pick<Project, 'name' | 'canvasJson' | 'markdown'>

export type ProjectDraft = ProjectContent & {
  projectId: string
  baseRevision: number
  storedAt: string
}

export type ConflictBackup = {
  detectedAt: string
  local: ProjectDraft
  server: Project
}

const draftKey = (projectId: string) => `archly-project-draft:${projectId}`
const conflictKey = (projectId: string) => `archly-project-conflict:${projectId}`

function parseCanvas(value: string): CanvasData {
  try { return JSON.parse(value) as CanvasData } catch { return { nodes: [], edges: [] } }
}

function durableNode(node: Node): Node {
  const durable = { ...node }
  delete durable.selected
  delete durable.dragging
  delete durable.measured
  delete durable.width
  delete durable.height
  const kind = String(node.data?.kind || 'service') as ArchitectureKind
  if (node.type !== 'architecture' || kind === 'container') return durable
  const size = getComponentSize(String(node.data?.label || ''), kind)
  return { ...durable, style: { ...node.style, ...size } }
}

function durableEdge(edge: Edge): Edge {
  const durable = { ...edge }
  delete durable.selected
  if (durable.data && 'waypoints' in durable.data) {
    const data = { ...durable.data }
    delete data.waypoints
    durable.data = data
  }
  return durable
}

export function serializeCanvas(nodes: Node[], edges: Edge[], viewport?: Viewport): string {
  return JSON.stringify({ nodes: nodes.map(durableNode), edges: edges.map(durableEdge), ...(viewport ? { viewport } : {}) })
}

export function canonicalCanvasJson(value: string): string {
  const canvas = parseCanvas(value)
  return serializeCanvas(canvas.nodes, canvas.edges, canvas.viewport)
}

export function contentSignature(content: ProjectContent): string {
  return JSON.stringify({
    name: content.name,
    canvasJson: canonicalCanvasJson(content.canvasJson),
    markdown: content.markdown,
  })
}

export function createDraft(project: Project): ProjectDraft {
  return {
    projectId: project.id,
    baseRevision: project.revision,
    name: project.name,
    canvasJson: canonicalCanvasJson(project.canvasJson),
    markdown: project.markdown,
    storedAt: new Date().toISOString(),
  }
}

export function loadDraft(projectId: string): ProjectDraft | null {
  try {
    const value = localStorage.getItem(draftKey(projectId))
    if (!value) return null
    const draft = JSON.parse(value) as ProjectDraft
    return draft.projectId === projectId && Number.isInteger(draft.baseRevision) ? draft : null
  } catch { return null }
}

export function storeDraft(draft: ProjectDraft): void {
  localStorage.setItem(draftKey(draft.projectId), JSON.stringify(draft))
}

export function clearDraft(projectId: string): void {
  localStorage.removeItem(draftKey(projectId))
}

export function storeConflictBackup(local: ProjectDraft, server: Project): void {
  const backup: ConflictBackup = { detectedAt: new Date().toISOString(), local, server }
  localStorage.setItem(conflictKey(local.projectId), JSON.stringify(backup))
}

export function draftRecovery(draft: ProjectDraft | null, server: Project): 'none' | 'resume' | 'conflict' {
  if (!draft || contentSignature(draft) === contentSignature(server)) return 'none'
  return draft.baseRevision === server.revision ? 'resume' : 'conflict'
}
