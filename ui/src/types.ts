import type { Edge, Node } from '@xyflow/react'

export type CanvasData = { nodes: Node[]; edges: Edge[] }

export type Project = {
  id: string
  name: string
  canvasJson: string
  markdown: string
  revision: number
  createdAt: string
  updatedAt: string
}
