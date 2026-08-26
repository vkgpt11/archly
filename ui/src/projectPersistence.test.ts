import type { Edge, Node } from '@xyflow/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Project } from './types'
import {
  canonicalCanvasJson, clearDraft, contentSignature, createDraft, draftRecovery, loadDraft,
  serializeCanvas, storeDraft,
} from './projectPersistence'

const project: Project = {
  id: 'project-1', name: 'Architecture', markdown: '<p>Draft</p>', revision: 4,
  createdAt: '2026-08-24T00:00:00Z', updatedAt: '2026-08-24T00:00:00Z',
  canvasJson: JSON.stringify({
    nodes: [{ id: 'a', type: 'architecture', position: { x: 10, y: 20 }, data: { kind: 'service', label: 'API' }, style: { width: 44, height: 52 } }],
    edges: [],
  }),
}

describe('project persistence', () => {
  beforeEach(() => { localStorage.clear(); window.name = '' })

  it('does not change durable canvas content for selection or measured edit dimensions', () => {
    const baseNode = JSON.parse(project.canvasJson).nodes[0] as Node
    const selectedNode: Node = {
      ...baseNode, selected: true, dragging: false, width: 44, height: 64,
      measured: { width: 44, height: 64 }, style: { width: 44, height: 64 },
    }
    const edge: Edge = { id: 'a-a', source: 'a', target: 'a' }

    expect(serializeCanvas([selectedNode], [{ ...edge, selected: true }]))
      .toBe(serializeCanvas([baseNode], [edge]))
  })

  it('stores and clears a revision-bound local draft', () => {
    const draft = createDraft(project)
    storeDraft(draft)
    expect(loadDraft(project.id)).toEqual(draft)
    clearDraft(project.id)
    expect(loadDraft(project.id)).toBeNull()
  })

  it('resumes a current draft but identifies a stale draft as a conflict', () => {
    const draft = { ...createDraft(project), markdown: '<p>Local change</p>' }
    expect(draftRecovery(draft, project)).toBe('resume')
    expect(draftRecovery(draft, { ...project, revision: 5 })).toBe('conflict')
    expect(draftRecovery(createDraft(project), project)).toBe('none')
  })

  it('uses canonical canvas content in signatures', () => {
    const signature = JSON.parse(contentSignature(project)) as { canvasJson: string }
    expect(signature.canvasJson).toBe(canonicalCanvasJson(project.canvasJson))
  })

  it('does not treat viewport-only changes as saveable content changes', () => {
    const movedViewport = { ...project, canvasJson: JSON.stringify({ ...JSON.parse(project.canvasJson), viewport: { x: 200, y: 100, zoom: 1.4 } }) }
    expect(contentSignature(movedViewport)).toBe(contentSignature(project))
  })

  it('preserves the viewport while removing transient selection state', () => {
    const canvas = JSON.parse(serializeCanvas(JSON.parse(project.canvasJson).nodes, [], { x: 120, y: -45, zoom: 1.35 }))
    expect(canvas.viewport).toEqual({ x: 120, y: -45, zoom: 1.35 })
    expect(JSON.parse(canonicalCanvasJson(JSON.stringify(canvas))).viewport).toEqual(canvas.viewport)
  })

  it('removes legacy manual connection waypoints from saved canvas data', () => {
    const edge: Edge = { id: 'a-a', source: 'a', target: 'a', data: { routing: 'smoothstep', waypoints: [{ x: 20, y: 30 }] } }
    const canvas = JSON.parse(serializeCanvas([], [edge]))
    expect(canvas.edges[0].data).toEqual({ routing: 'smoothstep' })
  })
})
