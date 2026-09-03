import type { Edge, Node, Viewport } from '@xyflow/react'
import type { CanvasData, Project } from './types'
import { getComponentSize, type ArchitectureKind } from './components/canvasSizing'

export type ProjectContent = Pick<Project, 'name' | 'canvasJson' | 'markdown'>

export type ProjectDraft = ProjectContent & {
  projectId: string
  ownerId: string
  baseRevision: number
  storedAt: string
  expiresAt?: string
}

export type ConflictBackup = {
  detectedAt: string
  local: ProjectDraft
  server: Project
}

export type ProjectSaveSignal = { projectId: string; ownerId: string; revision: number; savedAt: string }

const legacyDraftKey = (projectId: string) => `archly-project-draft:${projectId}`
const legacyConflictKey = (projectId: string) => `archly-project-conflict:${projectId}`
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const draftStore = () => sessionStorage
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

export function parseCanvasJson(value: string): CanvasData {
  const canvas = JSON.parse(value) as Partial<CanvasData> | null
  if (!canvas || typeof canvas !== 'object' || Array.isArray(canvas)) throw new Error('Canvas data must be a JSON object.')
  if (canvas.schemaVersion !== undefined && canvas.schemaVersion !== 1) throw new Error('This canvas schema version is not supported.')
  if (!Array.isArray(canvas.nodes) || !Array.isArray(canvas.edges)) throw new Error('Canvas nodes and edges must be arrays.')
  return canvas as CanvasData
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
  return { ...durable, style: { ...node.style, width: Number(node.data.customWidth || size.width), height: Number(node.data.customHeight || size.height) } }
}

function durableEdge(edge: Edge): Edge {
  const durable = { ...edge }
  delete durable.selected
  return durable
}

export function serializeCanvas(nodes: Node[], edges: Edge[], viewport?: Viewport, diagramCode?: string): string {
  return JSON.stringify({ schemaVersion: 1, nodes: nodes.map(durableNode), edges: edges.map(durableEdge), ...(viewport ? { viewport } : {}), ...(diagramCode !== undefined ? { diagramCode } : {}) })
}

export function canonicalCanvasJson(value: string): string {
  const canvas = parseCanvasJson(value)
  return serializeCanvas(canvas.nodes, canvas.edges, canvas.viewport, canvas.diagramCode)
}

export function contentSignature(content: ProjectContent): string {
  const canvas = parseCanvasJson(content.canvasJson)
  return JSON.stringify({
    name: content.name,
    canvasJson: serializeCanvas(canvas.nodes, canvas.edges, undefined, canvas.diagramCode),
    markdown: content.markdown,
  })
}

export function createDraft(project: Project, ownerId = currentTabId()): ProjectDraft {
  const now = Date.now()
  return {
    projectId: project.id,
    ownerId,
    baseRevision: project.revision,
    name: project.name,
    canvasJson: canonicalCanvasJson(project.canvasJson),
    markdown: project.markdown,
    storedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + DRAFT_TTL_MS).toISOString(),
  }
}

export function loadDraft(projectId: string, ownerId = currentTabId()): ProjectDraft | null {
  try {
    const key = draftStorageKey(projectId, ownerId)
    const legacyValue = localStorage.getItem(legacyDraftKey(projectId))
    const value = draftStore().getItem(key) || legacyValue
    localStorage.removeItem(legacyDraftKey(projectId))
    cleanupExpiredRecoveryData()
    if (!value) return null
    const draft = JSON.parse(value) as ProjectDraft
    const expiresAt = draft.expiresAt ? Date.parse(draft.expiresAt) : Date.parse(draft.storedAt) + DRAFT_TTL_MS
    if (draft.projectId !== projectId || !Number.isInteger(draft.baseRevision) || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      draftStore().removeItem(key); localStorage.removeItem(legacyDraftKey(projectId)); return null
    }
    return { ...draft, ownerId: draft.ownerId || ownerId, expiresAt: new Date(expiresAt).toISOString() }
  } catch { return null }
}

export function storeDraft(draft: ProjectDraft): boolean {
  try { draftStore().setItem(draftStorageKey(draft.projectId, draft.ownerId), JSON.stringify(draft)); return true }
  catch {
    cleanupExpiredRecoveryData()
    try { draftStore().setItem(draftStorageKey(draft.projectId, draft.ownerId), JSON.stringify(draft)); return true } catch { return false }
  }
}

export function clearDraft(projectId: string, ownerId = currentTabId()): void {
  draftStore().removeItem(draftStorageKey(projectId, ownerId))
  draftStore().removeItem(conflictStorageKey(projectId, ownerId))
  localStorage.removeItem(legacyDraftKey(projectId))
}

export function storeConflictBackup(local: ProjectDraft, server: Project): void {
  const backup: ConflictBackup = { detectedAt: new Date().toISOString(), local, server }
  const key = conflictStorageKey(local.projectId, local.ownerId)
  try { draftStore().setItem(key, JSON.stringify(backup)) }
  catch { cleanupExpiredRecoveryData(); try { draftStore().setItem(key, JSON.stringify(backup)) } catch { /* Recovery remains in memory. */ } }
}

export function cleanupExpiredRecoveryData(now = Date.now()): void {
  for (let index = localStorage.length - 1; index >= 0; index--) {
    const key = localStorage.key(index)
    if (key?.startsWith('archly-project-draft:') || key?.startsWith('archly-project-conflict:')) localStorage.removeItem(key)
  }
  for (let index = draftStore().length - 1; index >= 0; index--) {
    const key = draftStore().key(index)
    if (!key || (!key.startsWith('archly-project-draft:') && !key.startsWith('archly-project-conflict:'))) continue
    try {
      const value = JSON.parse(draftStore().getItem(key) || '{}') as ProjectDraft | ConflictBackup
      const draft = 'local' in value ? value.local : value
      const expiry = draft.expiresAt ? Date.parse(draft.expiresAt) : Date.parse(draft.storedAt) + DRAFT_TTL_MS
      if (!Number.isFinite(expiry) || expiry <= now) draftStore().removeItem(key)
    } catch { draftStore().removeItem(key) }
  }
}

export function draftRecovery(draft: ProjectDraft | null, server: Project): 'none' | 'resume' | 'conflict' {
  if (!draft) return 'none'
  try {
    if (contentSignature(draft) === contentSignature(server)) return 'none'
  } catch {
    return 'none'
  }
  return draft.baseRevision === server.revision ? 'resume' : 'conflict'
}
