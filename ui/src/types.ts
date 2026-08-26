import type { Edge, Node, Viewport } from '@xyflow/react'

export type CanvasData = { nodes: Node[]; edges: Edge[]; viewport?: Viewport }

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

export type SharePermission = 'READ' | 'EDIT'
export type ShareLink = { id: string; token?: string; permission: SharePermission; revoked: boolean; createdAt: string; revokedAt?: string | null }
export type SharedProject = { project: Project; permission: SharePermission }
