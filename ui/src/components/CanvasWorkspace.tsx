import {
  Background, BackgroundVariant, Controls, Handle, MarkerType, MiniMap, ReactFlow,
  ReactFlowProvider, Position, addEdge, applyEdgeChanges, applyNodeChanges, useReactFlow,
  type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type NodeProps,
} from '@xyflow/react'
import {
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, AppWindow, Box, Boxes,
  Braces, Cloud, Database, Expand, ExternalLink, FileText, Focus, Hand, Layers3, LocateFixed,
  MessageSquareText, MousePointer2, Network, Plus, Redo2, Search, Server, Smartphone,
  Trash2, Undo2, UserRound, Workflow, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'

type CanvasTool = 'select' | 'pan' | 'connect'
type ArchitectureKind = 'service' | 'web' | 'mobile' | 'database' | 'cache' | 'queue' | 'storage' | 'external' | 'actor' | 'container' | 'note' | 'text'

export type ArchitectureNodeData = {
  label?: string
  subtitle?: string
  kind?: ArchitectureKind
  description?: string
  fill?: string
  border?: string
  textColor?: string
  documentationUrl?: string
  locked?: boolean
}

type Snapshot = { nodes: Node[]; edges: Edge[] }
type Props = {
  nodes: Node[]
  edges: Edge[]
  setNodes: Dispatch<SetStateAction<Node[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
}

const componentDefinitions: Array<{ kind: ArchitectureKind; label: string; subtitle: string }> = [
  { kind: 'service', label: 'Service / API', subtitle: 'Backend or microservice' },
  { kind: 'web', label: 'Web application', subtitle: 'Browser-based application' },
  { kind: 'mobile', label: 'Mobile application', subtitle: 'iOS or Android client' },
  { kind: 'database', label: 'Database', subtitle: 'Persistent data store' },
  { kind: 'cache', label: 'Cache', subtitle: 'Fast temporary storage' },
  { kind: 'queue', label: 'Queue / Event bus', subtitle: 'Asynchronous messaging' },
  { kind: 'storage', label: 'File storage', subtitle: 'Object or file storage' },
  { kind: 'external', label: 'External system', subtitle: 'Third-party dependency' },
  { kind: 'actor', label: 'User / Actor', subtitle: 'Person or system actor' },
  { kind: 'container', label: 'Container', subtitle: 'System or network boundary' },
  { kind: 'note', label: 'Note', subtitle: 'Diagram annotation' },
  { kind: 'text', label: 'Text', subtitle: 'Standalone label' },
]

const iconByKind = {
  service: Server, web: AppWindow, mobile: Smartphone, database: Database, cache: Braces,
  queue: Workflow, storage: Cloud, external: ExternalLink, actor: UserRound, container: Boxes,
  note: MessageSquareText, text: FileText,
}

function ArchitectureNode({ data, selected }: NodeProps<Node<ArchitectureNodeData>>) {
  const kind = data.kind || 'service'
  const Icon = iconByKind[kind]
  return (
    <div
      className={`architecture-node architecture-node-${kind}${selected ? ' selected' : ''}${data.locked ? ' locked' : ''}`}
      style={{ background: data.fill, borderColor: data.border, color: data.textColor }}
    >
      {kind !== 'text' && <Icon aria-hidden="true" />}
      <div className="architecture-node-copy">
        <strong>{data.label || 'Untitled component'}</strong>
        {data.subtitle && <span>{data.subtitle}</span>}
      </div>
      {kind !== 'text' && kind !== 'note' && kind !== 'container' && (
        <>
          <Handle type="target" position={Position.Left} />
          <Handle type="source" position={Position.Right} />
          <Handle type="target" position={Position.Top} id="top" />
          <Handle type="source" position={Position.Bottom} id="bottom" />
        </>
      )}
    </div>
  )
}

const nodeTypes = { architecture: ArchitectureNode }

function normalizedNode(node: Node): Node {
  if (node.type === 'architecture') return node
  return {
    ...node,
    type: 'architecture',
    data: { kind: 'service', label: String(node.data?.label || 'Service'), subtitle: 'Service' },
    style: undefined,
  }
}

function CanvasWorkspaceInner({ nodes, edges, setNodes, setEdges }: Props) {
  const flow = useReactFlow()
  const [tool, setTool] = useState<CanvasTool>('select')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [minimapVisible, setMinimapVisible] = useState(true)
  const [search, setSearch] = useState('')
  const [zoom, setZoom] = useState(100)
  const [historyVersion, setHistoryVersion] = useState(0)
  const undoStack = useRef<Snapshot[]>([])
  const redoStack = useRef<Snapshot[]>([])
  const clipboard = useRef<Snapshot>({ nodes: [], edges: [] })
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const dragSnapshot = useRef<Snapshot | null>(null)

  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])
  useEffect(() => {
    if (nodes.some((node) => node.type !== 'architecture')) setNodes((current) => current.map(normalizedNode))
  }, [nodes, setNodes])

  const selectedNodes = useMemo(() => nodes.filter((node) => node.selected), [nodes])
  const selectedEdges = useMemo(() => edges.filter((edge) => edge.selected), [edges])
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : undefined
  const selectedEdge = selectedEdges.length === 1 ? selectedEdges[0] : undefined

  function remember(snapshot: Snapshot = { nodes: nodesRef.current, edges: edgesRef.current }) {
    undoStack.current.push(structuredClone(snapshot))
    if (undoStack.current.length > 50) undoStack.current.shift()
    redoStack.current = []
    setHistoryVersion((value) => value + 1)
  }

  const restore = useCallback((snapshot: Snapshot) => {
    setNodes(structuredClone(snapshot.nodes))
    setEdges(structuredClone(snapshot.edges))
  }, [setEdges, setNodes])

  const undo = useCallback(() => {
    const previous = undoStack.current.pop()
    if (!previous) return
    redoStack.current.push(structuredClone({ nodes: nodesRef.current, edges: edgesRef.current }))
    restore(previous)
    setHistoryVersion((value) => value + 1)
  }, [restore])

  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(structuredClone({ nodes: nodesRef.current, edges: edgesRef.current }))
    restore(next)
    setHistoryVersion((value) => value + 1)
  }, [restore])

  function addComponent(kind: ArchitectureKind) {
    const definition = componentDefinitions.find((item) => item.kind === kind)!
    const viewportCenter = flow.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    const node: Node<ArchitectureNodeData> = {
      id: crypto.randomUUID(),
      type: 'architecture',
      position: { x: viewportCenter.x - 80, y: viewportCenter.y - 40 },
      data: {
        kind,
        label: definition.label,
        subtitle: definition.subtitle,
        fill: kind === 'note' ? '#fef3c7' : undefined,
      },
      style: kind === 'container' ? { width: 360, height: 240 } : kind === 'text' ? { width: 180 } : { width: 190 },
      zIndex: kind === 'container' ? -1 : 0,
    }
    remember()
    setNodes((current) => [...current.map((item) => ({ ...item, selected: false })), { ...node, selected: true }])
    setLibraryOpen(false)
  }

  function updateSelectedNode(patch: Partial<ArchitectureNodeData>) {
    if (!selectedNode) return
    remember()
    setNodes((current) => current.map((node) => node.id === selectedNode.id ? {
      ...node,
      draggable: patch.locked === undefined ? node.draggable : !patch.locked,
      data: { ...node.data, ...patch },
    } : node))
  }

  function updateSelectedEdge(patch: Partial<Edge>) {
    if (!selectedEdge) return
    remember()
    setEdges((current) => current.map((edge) => edge.id === selectedEdge.id ? { ...edge, ...patch } : edge))
  }

  function deleteSelection() {
    if (!selectedNodes.length && !selectedEdges.length) return
    remember()
    const ids = new Set(selectedNodes.map((node) => node.id))
    setNodes((current) => current.filter((node) => !ids.has(node.id)))
    setEdges((current) => current.filter((edge) => !edge.selected && !ids.has(edge.source) && !ids.has(edge.target)))
  }

  const copySelection = useCallback(() => {
    const copiedNodes = nodesRef.current.filter((node) => node.selected)
    const ids = new Set(copiedNodes.map((node) => node.id))
    clipboard.current = {
      nodes: structuredClone(copiedNodes),
      edges: structuredClone(edgesRef.current.filter((edge) => edge.selected || (ids.has(edge.source) && ids.has(edge.target)))),
    }
  }, [])

  const pasteSelection = useCallback(() => {
    if (!clipboard.current.nodes.length) return
    remember()
    const idMap = new Map(clipboard.current.nodes.map((node) => [node.id, crypto.randomUUID()]))
    const pastedNodes = clipboard.current.nodes.map((node) => ({
      ...node, id: idMap.get(node.id)!, selected: true,
      position: { x: node.position.x + 32, y: node.position.y + 32 },
    }))
    const pastedEdges = clipboard.current.edges
      .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
      .map((edge) => ({ ...edge, id: crypto.randomUUID(), source: idMap.get(edge.source)!, target: idMap.get(edge.target)!, selected: false }))
    setNodes((current) => [...current.map((node) => ({ ...node, selected: false })), ...pastedNodes])
    setEdges((current) => [...current.map((edge) => ({ ...edge, selected: false })), ...pastedEdges])
    clipboard.current = { nodes: pastedNodes, edges: pastedEdges }
  }, [setEdges, setNodes])

  const onConnect = useCallback((connection: Connection) => {
    remember()
    setEdges((current) => addEdge({
      ...connection,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      label: 'depends on',
    }, current))
  }, [setEdges])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current))
  }, [setNodes])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current))
  }, [setEdges])

  const align = (direction: 'horizontal' | 'vertical') => {
    if (selectedNodes.length < 2) return
    remember()
    if (direction === 'horizontal') {
      const y = selectedNodes.reduce((total, node) => total + node.position.y, 0) / selectedNodes.length
      setNodes((current) => current.map((node) => node.selected ? { ...node, position: { ...node.position, y } } : node))
    } else {
      const x = selectedNodes.reduce((total, node) => total + node.position.x, 0) / selectedNodes.length
      setNodes((current) => current.map((node) => node.selected ? { ...node, position: { ...node.position, x } } : node))
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, [contenteditable="true"]')) return
      const command = event.ctrlKey || event.metaKey
      if (event.key === 'Escape') { setTool('select'); setLibraryOpen(false); return }
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (command && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return }
      if (command && event.key.toLowerCase() === 'c') { event.preventDefault(); copySelection(); return }
      if (command && event.key.toLowerCase() === 'x') { event.preventDefault(); copySelection(); deleteSelection(); return }
      if (command && event.key.toLowerCase() === 'v') { event.preventDefault(); pasteSelection(); return }
      if (command && event.key.toLowerCase() === 'd') { event.preventDefault(); copySelection(); pasteSelection(); return }
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelection() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  const filteredComponents = componentDefinitions.filter((item) => `${item.label} ${item.subtitle}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="canvas-workspace">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={() => { dragSnapshot.current = structuredClone({ nodes: nodesRef.current, edges: edgesRef.current }) }}
        onNodeDragStop={() => { if (dragSnapshot.current) remember(dragSnapshot.current); dragSnapshot.current = null }}
        onMove={(_, viewport) => setZoom(Math.round(viewport.zoom * 100))}
        panOnDrag={tool === 'pan' ? true : [1]}
        nodesDraggable={tool !== 'pan'}
        nodesConnectable={tool === 'connect' || tool === 'select'}
        selectionOnDrag={tool === 'select'}
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={null}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
        {minimapVisible && <MiniMap pannable zoomable />}
        <Controls showZoom={false} showFitView={false} showInteractive={false} />
      </ReactFlow>

      <div className="canvas-toolbox" role="toolbar" aria-label="Canvas tools">
        <button className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')} title="Select (Esc)" aria-label="Select"><MousePointer2 /></button>
        <button className={tool === 'pan' ? 'active' : ''} onClick={() => setTool('pan')} title="Pan" aria-label="Pan"><Hand /></button>
        <span />
        <button className={libraryOpen ? 'active' : ''} onClick={() => setLibraryOpen((open) => !open)} title="Add component" aria-label="Add component"><Plus /></button>
        <button onClick={() => addComponent('text')} title="Add text" aria-label="Add text"><FileText /></button>
        <button onClick={() => addComponent('note')} title="Add note" aria-label="Add note"><MessageSquareText /></button>
        <button className={tool === 'connect' ? 'active' : ''} onClick={() => setTool('connect')} title="Connect components" aria-label="Connect components"><Network /></button>
        <button onClick={() => addComponent('container')} title="Add container" aria-label="Add container"><Box /></button>
        <span />
        <button onClick={deleteSelection} disabled={!selectedNodes.length && !selectedEdges.length} title="Delete selected" aria-label="Delete selected"><Trash2 /></button>
      </div>

      {libraryOpen && (
        <aside className="component-library" aria-label="Component library">
          <header><div><strong>Components</strong><span>Architecture building blocks</span></div><button onClick={() => setLibraryOpen(false)} aria-label="Close component library"><X /></button></header>
          <label className="canvas-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search components" autoFocus /></label>
          <div className="component-list">
            {filteredComponents.map((item) => {
              const Icon = iconByKind[item.kind]
              return <button key={item.kind} onClick={() => addComponent(item.kind)}><Icon /><span><strong>{item.label}</strong><small>{item.subtitle}</small></span><Plus /></button>
            })}
          </div>
        </aside>
      )}

      <div className="canvas-history" role="toolbar" aria-label="Canvas history and layout">
        <button onClick={undo} disabled={!undoStack.current.length} title="Undo" aria-label="Undo canvas change"><Undo2 /></button>
        <button onClick={redo} disabled={!redoStack.current.length} title="Redo" aria-label="Redo canvas change"><Redo2 /></button>
        {selectedNodes.length > 1 && <><span /><button onClick={() => align('horizontal')} title="Align horizontally" aria-label="Align horizontally"><AlignHorizontalDistributeCenter /></button><button onClick={() => align('vertical')} title="Align vertically" aria-label="Align vertically"><AlignVerticalDistributeCenter /></button></>}
        <i aria-hidden="true">{historyVersion}</i>
      </div>

      <div className="canvas-navigation" role="toolbar" aria-label="Canvas navigation">
        <button onClick={() => flow.zoomOut()} title="Zoom out" aria-label="Zoom out"><ZoomOut /></button>
        <button className="zoom-value" onClick={() => flow.zoomTo(1)} title="Reset zoom">{zoom}%</button>
        <button onClick={() => flow.zoomIn()} title="Zoom in" aria-label="Zoom in"><ZoomIn /></button>
        <span />
        <button onClick={() => flow.fitView({ padding: 0.2 })} title="Fit diagram" aria-label="Fit diagram"><Focus /></button>
        <button className={minimapVisible ? 'active' : ''} onClick={() => setMinimapVisible((visible) => !visible)} title="Toggle minimap" aria-label="Toggle minimap"><LocateFixed /></button>
        <button onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.querySelector('.canvas-panel')?.requestFullscreen()} title="Fullscreen" aria-label="Fullscreen"><Expand /></button>
      </div>

      {(selectedNode || selectedEdge) && inspectorOpen && (
        <aside className="canvas-inspector" aria-label="Properties inspector">
          <header><div><strong>Properties</strong><span>{selectedNode ? 'Component' : 'Connection'}</span></div><button onClick={() => setInspectorOpen(false)} aria-label="Close properties"><X /></button></header>
          {selectedNode && <NodeInspector node={selectedNode} update={updateSelectedNode} onDelete={deleteSelection} />}
          {selectedEdge && <EdgeInspector edge={selectedEdge} update={updateSelectedEdge} onDelete={deleteSelection} />}
        </aside>
      )}
      {(selectedNode || selectedEdge) && !inspectorOpen && <button className="open-inspector" onClick={() => setInspectorOpen(true)} title="Open properties" aria-label="Open properties"><Layers3 /></button>}
    </div>
  )
}

function NodeInspector({ node, update, onDelete }: { node: Node; update: (patch: Partial<ArchitectureNodeData>) => void; onDelete: () => void }) {
  const data = node.data as ArchitectureNodeData
  return <div className="inspector-fields">
    <label>Name<input value={data.label || ''} onChange={(event) => update({ label: event.target.value })} /></label>
    <label>Subtitle<input value={data.subtitle || ''} onChange={(event) => update({ subtitle: event.target.value })} /></label>
    <label>Description<textarea value={data.description || ''} onChange={(event) => update({ description: event.target.value })} rows={3} /></label>
    <label>Documentation URL<input value={data.documentationUrl || ''} onChange={(event) => update({ documentationUrl: event.target.value })} placeholder="https:// or #heading" /></label>
    <div className="inspector-colors">
      <label>Fill<input type="color" value={data.fill || '#ffffff'} onChange={(event) => update({ fill: event.target.value })} /></label>
      <label>Border<input type="color" value={data.border || '#68708a'} onChange={(event) => update({ border: event.target.value })} /></label>
      <label>Text<input type="color" value={data.textColor || '#20222d'} onChange={(event) => update({ textColor: event.target.value })} /></label>
    </div>
    <label className="inspector-check"><input type="checkbox" checked={Boolean(data.locked)} onChange={(event) => update({ locked: event.target.checked })} /> Lock component</label>
    <button className="danger-action" onClick={onDelete}><Trash2 /> Delete component</button>
  </div>
}

function EdgeInspector({ edge, update, onDelete }: { edge: Edge; update: (patch: Partial<Edge>) => void; onDelete: () => void }) {
  const color = String(edge.style?.stroke || '#68708a')
  return <div className="inspector-fields">
    <label>Label<input value={String(edge.label || '')} onChange={(event) => update({ label: event.target.value })} /></label>
    <label>Routing<select value={edge.type || 'smoothstep'} onChange={(event) => update({ type: event.target.value })}><option value="straight">Straight</option><option value="default">Curved</option><option value="smoothstep">Stepped</option></select></label>
    <label>Line style<select value={edge.style?.strokeDasharray ? 'dashed' : 'solid'} onChange={(event) => update({ style: { ...edge.style, strokeDasharray: event.target.value === 'dashed' ? '7 5' : undefined } })}><option value="solid">Solid</option><option value="dashed">Dashed</option></select></label>
    <label>Line color<input type="color" value={color} onChange={(event) => update({ style: { ...edge.style, stroke: event.target.value } })} /></label>
    <label className="inspector-check"><input type="checkbox" checked={Boolean(edge.markerEnd)} onChange={(event) => update({ markerEnd: event.target.checked ? { type: MarkerType.ArrowClosed } : undefined })} /> Direction arrow</label>
    <button className="danger-action" onClick={onDelete}><Trash2 /> Delete connection</button>
  </div>
}

export default function CanvasWorkspace(props: Props) {
  return <ReactFlowProvider><CanvasWorkspaceInner {...props} /></ReactFlowProvider>
}
