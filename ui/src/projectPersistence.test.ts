import type { Edge, Node } from '@xyflow/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Project } from './types'
import {
  canonicalCanvasJson, clearDraft, contentSignature, createDraft, draftRecovery, loadDraft, parseCanvasJson,
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
  it('preserves exact diagram source including comments and whitespace', () => {
    const source = 'direction down\n\n# Keep this comment\nservice api "API"\n'
    const serialized = serializeCanvas([], [], { x: 0, y: 0, zoom: 1 }, source)
    expect(parseCanvasJson(serialized).diagramCode).toBe(source)
    expect(parseCanvasJson(canonicalCanvasJson(serialized)).diagramCode).toBe(source)
  })

  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.name = '' })

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

  it('expires recovery drafts and removes legacy persistent copies', () => {
    const expired = { ...createDraft(project), expiresAt: '2020-01-01T00:00:00.000Z' }
    sessionStorage.setItem(`archly-project-draft:${project.id}:${expired.ownerId}`, JSON.stringify(expired))
    localStorage.setItem(`archly-project-conflict:old-project:old-tab`, '{"private":"content"}')
    expect(loadDraft(project.id, expired.ownerId)).toBeNull()
    expect(localStorage.getItem('archly-project-conflict:old-project:old-tab')).toBeNull()
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

  it('preserves connection waypoints across save and reload', () => {
    const edge: Edge = { id: 'a-a', source: 'a', target: 'a', data: { routing: 'smoothstep', waypoints: [{ x: 20, y: 30 }] } }
    const canvas = JSON.parse(serializeCanvas([], [edge]))
    expect(canvas.edges[0].data).toEqual({ routing: 'smoothstep', waypoints: [{ x: 20, y: 30 }] })
  })

  it('rejects malformed and unsupported canvas documents instead of converting them to empty diagrams', () => {
    expect(() => parseCanvasJson('not-json')).toThrow()
    expect(() => parseCanvasJson('[]')).toThrow('JSON object')
    expect(() => parseCanvasJson('{"schemaVersion":2,"nodes":[],"edges":[]}')).toThrow('not supported')
    expect(() => parseCanvasJson('{"schemaVersion":1,"nodes":{},"edges":[]}')).toThrow('must be arrays')
  })
})
