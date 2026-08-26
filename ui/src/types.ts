import type { Edge, Node, Viewport } from '@xyflow/react'

export type CanvasData = { nodes: Node[]; edges: Edge[]; viewport?: Viewport }

export type Project = {
  id: string
  name: string
  canvasJson: string
  markdown: string
  revision: number
  createdAt: string
  updatedAt: string
}
