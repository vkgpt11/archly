import { MarkerType, type Edge, type Node } from '@xyflow/react'

export type DiagramViewKind = 'dataflow' | 'sequence'
export type DiagramView = { name: string; kind: DiagramViewKind; line: number; body: { text: string; line: number }[] }
export type DiagramViewState = { positions: Record<string, { x: number; y: number }>; viewport?: { x: number; y: number; zoom: number } }

const id = '[A-Za-z][\\w-]*'

export function compileDiagramViews(source: string) {
  const lines = source.split(/\r?\n/)
  const root: string[] = []
  const views: DiagramView[] = []
  for (let index = 0; index < lines.length; index++) {
    const header = lines[index].trim().match(new RegExp(`^view\\s+(dataflow|sequence)\\s+(${id})\\s*\\{$`))
    if (!header) {
      if (/^\s*view\b/.test(lines[index])) throw new Error(`Line ${index + 1}: expected view dataflow|sequence Name {`)
      root.push(lines[index]); continue
    }
    if (views.some((view) => view.name === header[2])) throw new Error(`Line ${index + 1}: duplicate view “${header[2]}”`)
    const body: DiagramView['body'] = []; let depth = 1
    while (depth && ++index < lines.length) {
      const text = lines[index]
      const structural = /^\s*(#|\/\/)/.test(text) ? '' : text.replace(/"(?:\\.|[^"\\])*"/g, '')
      depth += (structural.match(/\{/g) || []).length - (structural.match(/\}/g) || []).length
      if (depth) body.push({ text, line: index + 1 })
      else if (text.trim() !== '}') throw new Error(`Line ${index + 1}: view closing brace must be on its own line`)
    }
    if (depth) throw new Error(`Line ${index + 1}: unclosed view “${header[2]}”`)
    views.push({ name: header[2], kind: header[1] as DiagramViewKind, line: index + 1 - body.length - 1, body })
    // Preserve source line numbering for diagnostics from the shared model.
    root.push(...Array.from({ length: body.length + 2 }, () => ''))
  }
  return { baseSource: root.join('\n'), views }
}

function definitionLines(source: string) {
  const result = new Map<string, number>()
  source.split(/\r?\n/).forEach((line, index) => {
    const match = line.trim().match(new RegExp(`^(?!(?:view|style|position|boundary|connection|layout|direction|let|use|template|class|variant)\\b)${id}\\s+(${id})(?:\\s|$)`))
    if (match) result.set(match[1], index + 1)
  })
  return result
}

function fail(view: DiagramView, line: number, message: string): never {
  throw new Error(`Line ${line}: ${message} in ${view.kind} view “${view.name}” (declared at line ${view.line})`)
}

function requireComponent(view: DiagramView, componentId: string, nodes: Map<string, Node>, lines: Map<string, number>, line: number) {
  if (!nodes.has(componentId)) fail(view, line, `unknown shared component “${componentId}”`)
  return lines.get(componentId)
}

export function applyDiagramView(nodes: Node[], edges: Edge[], source: string, view?: DiagramView) {
  if (!view) return { nodes, edges }
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const declarations = definitionLines(source)
  if (view.kind === 'dataflow') {
    const included = new Set<string>(); const excluded = new Set<string>()
    const annotations = new Map<string, Record<string, unknown>>()
    for (const item of view.body) {
      const text = item.text.trim(); if (!text || /^(#|\/\/)/.test(text)) continue
      const selection = text.match(/^(include|exclude)\s+(.+)$/)
      if (selection) {
        for (const name of selection[2].split(/[\s,]+/).filter(Boolean)) {
          requireComponent(view, name, byId, declarations, item.line)
          ;(selection[1] === 'include' ? included : excluded).add(name)
        }
        continue
      }
      const data = text.match(new RegExp(`^data\\s+(${id})\\s+(.+)$`))
      if (data) {
        requireComponent(view, data[1], byId, declarations, item.line)
        const options = Object.fromEntries([...data[2].matchAll(/([\w-]+)=("(?:\\.|[^"\\])*"|\S+)/g)].map((match) => [match[1], match[2].startsWith('"') ? JSON.parse(match[2]) : match[2]]))
        for (const key of Object.keys(options)) if (!['classification', 'store', 'processing', 'trust-boundary'].includes(key)) fail(view, item.line, `unknown data-flow property “${key}”`)
        if (options.store && !['true', 'false'].includes(String(options.store))) fail(view, item.line, 'store must be true or false')
        annotations.set(data[1], { dataClassification: options.classification, dataStore: options.store === 'true', processingStep: options.processing, trustBoundary: options['trust-boundary'] })
        continue
      }
      fail(view, item.line, 'expected include, exclude, or data annotation')
    }
    const visible = new Set(nodes.filter((node) => (!included.size || included.has(node.id)) && !excluded.has(node.id)).map((node) => node.id))
    return {
      nodes: nodes.filter((node) => visible.has(node.id)).map((node) => ({ ...node, data: { ...node.data, ...annotations.get(node.id), diagramView: view.name, diagramViewKind: view.kind } })),
      edges: edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target)),
    }
  }

  const participants = new Set<string>(); const messages: Edge[] = []; const notes = new Map<string, string[]>(); const activations = new Map<string, { action: string; order: number }[]>()
  const groups: string[] = []; let order = 0; let eventOrder = 0
  for (const item of view.body) {
    const text = item.text.trim(); if (!text || /^(#|\/\/)/.test(text)) continue
    const group = text.match(/^alt\s+(.+?)\s*\{$/)
    if (group) { groups.push(group[1].replace(/^"|"$/g, '')); continue }
    if (text === '}') { if (!groups.length) fail(view, item.line, 'unexpected alternative closing brace'); groups.pop(); continue }
    const participant = text.match(new RegExp(`^participant\\s+(${id})$`))
    if (participant) { requireComponent(view, participant[1], byId, declarations, item.line); participants.add(participant[1]); continue }
    const activation = text.match(new RegExp(`^(activate|deactivate)\\s+(${id})$`))
    if (activation) { requireComponent(view, activation[2], byId, declarations, item.line); activations.set(activation[2], [...(activations.get(activation[2]) || []), { action: activation[1], order: ++eventOrder }]); continue }
    const note = text.match(new RegExp(`^note\\s+(${id})\\s+("(?:\\\\.|[^"\\\\])*")$`))
    if (note) { requireComponent(view, note[1], byId, declarations, item.line); notes.set(note[1], [...(notes.get(note[1]) || []), JSON.parse(note[2])]); continue }
    const message = text.match(new RegExp(`^(message|return)\\s+(${id})\\s*->\\s*(${id})\\s*:\\s*("(?:\\\\.|[^"\\\\])*")(?:\\s+(sync|async))?$`))
    if (message) {
      requireComponent(view, message[2], byId, declarations, item.line); requireComponent(view, message[3], byId, declarations, item.line)
      participants.add(message[2]); participants.add(message[3]); order++; eventOrder++
      messages.push({ id: `view-${view.name}-${order}`, source: message[2], target: message[3], type: 'editable', label: JSON.parse(message[4]), markerEnd: { type: MarkerType.ArrowClosed }, data: { sequenceOrder: order, messageType: message[1], async: message[5] === 'async', alternative: groups.at(-1), diagramView: view.name } })
      continue
    }
    fail(view, item.line, 'expected participant, message, return, activation, note, or alt block')
  }
  if (groups.length) fail(view, view.body.at(-1)?.line || view.line, 'unclosed alternative block')
  const selected = [...participants].map((name, index) => {
    const node = byId.get(name)!
    return { ...node, position: { x: index * 240, y: 40 }, data: { ...node.data, sequenceActivations: activations.get(name) || [], sequenceNotes: notes.get(name) || [], diagramView: view.name, diagramViewKind: view.kind } }
  })
  return { nodes: selected, edges: messages }
}

export function applyViewState(nodes: Node[], state?: DiagramViewState) {
  return state ? nodes.map((node) => state.positions[node.id] ? { ...node, position: state.positions[node.id] } : node) : nodes
}
