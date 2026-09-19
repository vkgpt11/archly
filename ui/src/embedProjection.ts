import { parseDiagramCode } from './diagramCode'
import { applyViewState } from './diagramViews'
import type { CanvasData } from './types'

export type ProjectionInput = { canvas: CanvasData; view: string; variant: string }
export function projectEmbeddedView({ canvas, view, variant }: ProjectionInput) {
  if (!canvas.diagramCode?.trim()) throw new Error('The published diagram source is unavailable.')
  const result = parseDiagramCode(canvas.diagramCode, variant || undefined, canvas.diagramModules, view || undefined)
  return { schemaVersion: 1, nodes: applyViewState(result.nodes, canvas.diagramViewStates?.[view]), edges: result.edges }
}

// This page receives private input only inside the isolated renderer's browser context.
// It has no API, credentials, stored data, network imports, or cross-window messaging.
declare global { interface Window { archlyProject?: typeof projectEmbeddedView } }
window.archlyProject = projectEmbeddedView
