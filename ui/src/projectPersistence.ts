import type { Edge, Node, Viewport } from '@xyflow/react'
import type { CanvasData, Project } from './types'
import { getComponentSize, type ArchitectureKind } from './components/canvasSizing'

export type ProjectContent = Pick<Project, 'name' | 'canvasJson' | 'markdown'>

export type ProjectDraft = ProjectContent & {
  projectId: string
  ownerId: string
  baseRevision: number
  storedAt: string
}

export type ConflictBackup = {
  detectedAt: string
  local: ProjectDraft
  server: Project
}

export type ProjectSaveSignal = { projectId: string; ownerId: string; revision: number; savedAt: string }

const legacyDraftKey = (projectId: string) => `archly-project-draft:${projectId}`
const legacyConflictKey = (projectId: string) => `archly-project-conflict:${projectId}`
export const draftStorageKey = (projectId: string, ownerId = currentTabId()) => `${legacyDraftKey(projectId)}:${ownerId}`
export const conflictStorageKey = (projectId: string, ownerId = currentTabId()) => `${legacyConflictKey(projectId)}:${ownerId}`

export function currentTabId(): string {
  const prefix = 'archly:'
  if (window.name.startsWith(prefix) && window.name.length > prefix.length) return window.name.slice(prefix.length)
  const created = crypto.randomUUID()
  window.name = `${prefix}${created}`
  return created
}

export const projectSyncStorageKey = (projectId: string) => `archly-project-sync:${projectId}`

export function publishProjectSaved(projectId: string, ownerId: string, revision: number): void {
  const signal: ProjectSaveSignal = { projectId, ownerId, revision, savedAt: new Date().toISOString() }
  localStorage.setItem(projectSyncStorageKey(projectId), JSON.stringify(signal))
}

export function readProjectSaveSignal(event: StorageEvent, projectId: string, ownerId: string): ProjectSaveSignal | null {
  if (event.key !== projectSyncStorageKey(projectId) || !event.newValue) return null
  try {
    const signal = JSON.parse(event.newValue) as ProjectSaveSignal
    return signal.projectId === projectId && signal.ownerId !== ownerId && Number.isInteger(signal.revision) ? signal : null
  } catch { return null }
}

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
  const canvas = parseCanvas(content.canvasJson)
  return JSON.stringify({
    name: content.name,
    canvasJson: serializeCanvas(canvas.nodes, canvas.edges),
    markdown: content.markdown,
  })
}

export function createDraft(project: Project, ownerId = currentTabId()): ProjectDraft {
  return {
    projectId: project.id,
    ownerId,
    baseRevision: project.revision,
    name: project.name,
    canvasJson: canonicalCanvasJson(project.canvasJson),
    markdown: project.markdown,
    storedAt: new Date().toISOString(),
  }
}

export function loadDraft(projectId: string, ownerId = currentTabId()): ProjectDraft | null {
  try {
    const value = localStorage.getItem(draftStorageKey(projectId, ownerId)) || localStorage.getItem(legacyDraftKey(projectId))
    if (!value) return null
    const draft = JSON.parse(value) as ProjectDraft
    return draft.projectId === projectId && Number.isInteger(draft.baseRevision)
      ? { ...draft, ownerId: draft.ownerId || ownerId }
      : null
  } catch { return null }
}

export function storeDraft(draft: ProjectDraft): void {
  localStorage.setItem(draftStorageKey(draft.projectId, draft.ownerId), JSON.stringify(draft))
}

export function clearDraft(projectId: string, ownerId = currentTabId()): void {
  localStorage.removeItem(draftStorageKey(projectId, ownerId))
  localStorage.removeItem(legacyDraftKey(projectId))
}

export function storeConflictBackup(local: ProjectDraft, server: Project): void {
  const backup: ConflictBackup = { detectedAt: new Date().toISOString(), local, server }
  localStorage.setItem(conflictStorageKey(local.projectId, local.ownerId), JSON.stringify(backup))
}

export function draftRecovery(draft: ProjectDraft | null, server: Project): 'none' | 'resume' | 'conflict' {
  if (!draft || contentSignature(draft) === contentSignature(server)) return 'none'
  return draft.baseRevision === server.revision ? 'resume' : 'conflict'
}
