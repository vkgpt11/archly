import type { Edge, Node, Viewport } from '@xyflow/react'

export type CanvasData = { schemaVersion?: 1; nodes: Node[]; edges: Edge[]; viewport?: Viewport; diagramCode?: string }

export type Project = {
  id: string
  name: string
  canvasJson: string
  markdown: string
  folder?: string | null
  archived?: boolean
  revision: number
  createdAt: string
  updatedAt: string
}

export type ProjectSummary = Omit<Project, 'canvasJson' | 'markdown'>
export type ProjectPage = { items: ProjectSummary[]; page: number; size: number; totalItems: number; totalPages: number }

export type SharePermission = 'READ' | 'EDIT'
export type ShareLink = { id: string; token?: string; permission: SharePermission; revoked: boolean; createdAt: string; revokedAt?: string | null; expiresAt: string }
export type SharedProject = { project: Project; permission: SharePermission }
