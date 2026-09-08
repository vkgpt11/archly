import { canonicalCanvasJson, parseCanvasJson, serializeCanvas, type ProjectContent } from './projectPersistence'
import { sanitizeRichText } from './sanitizeRichText'

export const MAX_PACKAGE_BYTES = 12_000_000
export type ProjectPackage = { format: 'archly-project'; version: 1; scope: 'full' | 'selection'; project: ProjectContent }

export function createProjectPackage(project: ProjectContent, selectionOnly = false): ProjectPackage {
  let canvasJson = canonicalCanvasJson(project.canvasJson)
  if (selectionOnly) {
    const canvas = parseCanvasJson(project.canvasJson)
    const ids = new Set(canvas.nodes.filter(node => node.selected).map(node => node.id))
    for (const edge of canvas.edges.filter(edge => edge.selected)) { ids.add(edge.source); ids.add(edge.target) }
    if (!ids.size) throw new Error('Select at least one component or connection before exporting the selection.')
    const parents = new Map(canvas.nodes.map(node => [node.id, node.parentId]))
    for (const id of ids) { const parent = parents.get(id); if (parent) ids.add(parent) }
    canvasJson = serializeCanvas(canvas.nodes.filter(node => ids.has(node.id)), canvas.edges.filter(edge => ids.has(edge.source) && ids.has(edge.target)), canvas.viewport)
  }
  return { format: 'archly-project', version: 1, scope: selectionOnly ? 'selection' : 'full', project: { name: project.name, canvasJson, markdown: selectionOnly ? '' : project.markdown } }
}

function bounded(value: unknown, depth = 0): void {
  if (depth > 24) throw new Error('Package nesting exceeds 24 levels.')
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Package contains an unsafe property.')
    bounded(child, depth + 1)
  }
}

export function parseProjectPackage(text: string): { package: ProjectPackage; warnings: string[]; counts: { nodes: number; edges: number; modules: number; views: number; snapshots: number; images: number } } {
  if (new TextEncoder().encode(text).length > MAX_PACKAGE_BYTES) throw new Error('Choose a project package smaller than 12 MB.')
  let input
  try { input = JSON.parse(text) } catch { throw new Error('This file is not valid JSON. Choose an Archly project backup.') }
  bounded(input)
  if (!input || !['archly-project', 'archly-diagram'].includes(input.format)) throw new Error('Unsupported format. Choose an Archly project backup.')
  if (input.version !== 1) throw new Error('Unsupported package version. Update Archly or export with version 1.')
  const warnings: string[] = []
  if (input.format === 'archly-diagram') warnings.push('Legacy export: omitted DSL, modules, views or snapshots cannot be recovered from this file.')
  else if (!['full', 'selection'].includes(input.scope)) throw new Error('Package scope must be full or selection.')
  if (input.scope === 'selection') warnings.push('Partial selection: this is not a complete project backup.')
  const source = input.project
  if (!source || typeof source.name !== 'string' || !source.name.trim() || source.name.length > 120 || typeof source.markdown !== 'string' || source.markdown.length > 6_000_000) throw new Error('Project name or documentation is invalid or too large.')
  const raw = input.format === 'archly-diagram' ? JSON.stringify(source.canvas) : source.canvasJson
  if (typeof raw !== 'string' || raw.length > 2_000_000) throw new Error('Canvas must be JSON text smaller than 2 million characters.')
  const canvas = parseCanvasJson(raw)
  bounded(canvas)
  function graph(nodes: typeof canvas.nodes, edges: typeof canvas.edges) {
    if (nodes.length > 5000 || edges.length > 10000) throw new Error('Maximum 5,000 nodes and 10,000 edges per diagram.')
    const ids = new Set<string>()
    for (const node of nodes) {
      if (!node || typeof node.id !== 'string' || !node.id || ids.has(node.id) || !node.data || typeof node.data !== 'object' || !Number.isFinite(node.position?.x) || !Number.isFinite(node.position?.y)) throw new Error('Invalid or duplicate diagram node.')
      ids.add(node.id)
    }
    const parents = new Map(nodes.map(node => [node.id, node.parentId]))
    for (const node of nodes) {
      const seen = new Set([node.id]); let parent = node.parentId
      while (parent) { if (!ids.has(parent) || seen.has(parent)) throw new Error('Missing or cyclic parent container reference.'); seen.add(parent); parent = parents.get(parent) }
    }
    const edgeIds = new Set<string>()
    for (const edge of edges) {
      if (!edge || typeof edge.id !== 'string' || !edge.id || edgeIds.has(edge.id) || !ids.has(edge.source) || !ids.has(edge.target)) throw new Error('Invalid connection or missing endpoint.')
      edgeIds.add(edge.id)
    }
  }
  graph(canvas.nodes, canvas.edges)
  for (const snapshot of canvas.diagramSnapshots || []) graph(snapshot.nodes, snapshot.edges)
  const markdown = sanitizeRichText(source.markdown)
  if (markdown !== source.markdown) warnings.push('Unsupported or unsafe document markup will be sanitized.')
  const images = (markdown.match(/<img\b/gi) || []).length
  if (/src=["']https?:/i.test(markdown)) warnings.push('Remote images still require their original host; only embedded images are self-contained.')
  return { package: { format: 'archly-project', version: 1, scope: input.scope === 'selection' ? 'selection' : 'full', project: { name: source.name, markdown, canvasJson: canonicalCanvasJson(raw) } }, warnings,
    counts: { nodes: canvas.nodes.length, edges: canvas.edges.length, modules: canvas.diagramModules?.length || 0, views: Object.keys(canvas.diagramViewStates || {}).length, snapshots: canvas.diagramSnapshots?.length || 0, images } }
}
