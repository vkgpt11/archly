import {
  Background, BackgroundVariant, BaseEdge, ConnectionMode, Controls, EdgeLabelRenderer, Handle, MarkerType,
  MiniMap, ReactFlow, ReactFlowProvider, Position, addEdge, applyEdgeChanges,
  applyNodeChanges, getBezierPath, getSmoothStepPath, getStraightPath, reconnectEdge, useReactFlow,
  type Connection, type Edge, type EdgeChange, type EdgeProps, type Node, type NodeChange, type NodeProps,
} from '@xyflow/react'
import {
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, AppWindow, Box, Boxes,
  ArrowLeft, ArrowRight, Braces, Cloud, Database, Expand, ExternalLink, FileText, Focus, Hand,
  LocateFixed, Lock, MessageSquareText, Minus, MousePointer2, Network, Plus, Redo2,
  Search, Server, Smartphone, Spline, Trash2, Undo2, Unlock, UserRound, Workflow, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  COMPONENT_TITLE_LIMIT, getComponentSize, getEdgeLabelWidth, truncateCanvasText,
  type ArchitectureKind,
} from './canvasSizing'

type CanvasTool = 'select' | 'pan' | 'connect'

type ArchitectureNodeData = {
  label?: string
  kind?: ArchitectureKind
  fill?: string
  border?: string
  textColor?: string
  locked?: boolean
}

type Snapshot = { nodes: Node[]; edges: Edge[] }
type Props = {
  nodes: Node[]
  edges: Edge[]
  setNodes: Dispatch<SetStateAction<Node[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
}

const componentDefinitions: Array<{ kind: ArchitectureKind; label: string; description: string }> = [
  { kind: 'service', label: 'Service / API', description: 'Backend or microservice' },
  { kind: 'web', label: 'Web application', description: 'Browser-based application' },
  { kind: 'mobile', label: 'Mobile application', description: 'iOS or Android client' },
  { kind: 'database', label: 'Database', description: 'Persistent data store' },
  { kind: 'cache', label: 'Cache', description: 'Fast temporary storage' },
  { kind: 'queue', label: 'Queue / Event bus', description: 'Asynchronous messaging' },
  { kind: 'storage', label: 'File storage', description: 'Object or file storage' },
  { kind: 'external', label: 'External system', description: 'Third-party dependency' },
  { kind: 'actor', label: 'User / Actor', description: 'Person or system actor' },
  { kind: 'container', label: 'Container', description: 'System or network boundary' },
  { kind: 'note', label: 'Note', description: 'Diagram annotation' },
  { kind: 'text', label: 'Text', description: 'Standalone label' },
]

const iconByKind = {
  service: Server, web: AppWindow, mobile: Smartphone, database: Database, cache: Braces,
  queue: Workflow, storage: Cloud, external: ExternalLink, actor: UserRound, container: Boxes,
  note: MessageSquareText, text: FileText,
}

function BidirectionalHandle({ position, id }: { position: Position; id: string }) {
  return <>
    <Handle type="source" position={position} id={id} />
    <Handle type="target" position={position} id={id} />
  </>
}

function ArchitectureNode({ id, data, selected }: NodeProps<Node<ArchitectureNodeData>>) {
  const { getNode, updateNode } = useReactFlow()
  const kind = data.kind || 'service'
  const Icon = iconByKind[kind]
  const label = data.label || ''
  const labelLength = label.length
  const iconDensity = labelLength > 24 ? 'icon-compact' : labelLength > 14 ? 'icon-medium' : 'icon-large'

  useEffect(() => {
    if (kind === 'container') return
    const current = getNode(id)
    const size = getComponentSize(label, kind, selected)
    if (current?.width === size.width && current?.height === size.height) return
    updateNode(id, { ...size, style: { ...current?.style, ...size } })
  }, [getNode, id, kind, label, selected, updateNode])

  function updateContent(nextLabel: string) {
    const current = getNode(id)
    const nextSize = kind === 'container' ? {} : getComponentSize(nextLabel, kind, selected)
    const nextStyle = kind === 'container' ? current?.style : { ...current?.style, ...nextSize }
    updateNode(id, { ...nextSize, data: { ...data, label: nextLabel }, style: nextStyle })
  }

  function toggleLock() {
    const locked = !data.locked
    updateNode(id, { draggable: !locked, data: { ...data, locked } })
  }

  return (
    <div
      className={`architecture-node architecture-node-${kind} ${iconDensity}${selected ? ' selected' : ''}${data.locked ? ' locked' : ''}`}
      style={{ background: data.fill, borderColor: data.border, color: data.textColor }}
    >
      {kind !== 'text' && <span className="component-kind-icon" aria-hidden="true"><Icon /></span>}
      <button
        className="component-lock nodrag nowheel"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => { event.stopPropagation(); toggleLock() }}
        title={data.locked ? 'Unlock component' : 'Lock component'}
        aria-label={data.locked ? 'Unlock component' : 'Lock component'}
      >{data.locked ? <Lock /> : <Unlock />}</button>
      <div className="architecture-node-copy">
        {selected ? <textarea className="nodrag nowheel" aria-label="Component name" value={label} onChange={(event) => updateContent(event.target.value)} onBlur={() => updateContent(label.trim() || 'Untitled component')} rows={2} /> : <strong title={data.label}>{truncateCanvasText(data.label || 'Untitled component', COMPONENT_TITLE_LIMIT)}</strong>}
      </div>
      {kind !== 'text' && kind !== 'note' && kind !== 'container' && (
        <>
          <BidirectionalHandle position={Position.Left} id="left" />
          <BidirectionalHandle position={Position.Right} id="right" />
          <BidirectionalHandle position={Position.Top} id="top" />
          <BidirectionalHandle position={Position.Bottom} id="bottom" />
        </>
      )}
    </div>
  )
}

function EditableConnectionEdge(props: EdgeProps<Edge>) {
  const { setEdges, updateEdge } = useReactFlow()
  const routing = String(props.data?.routing || 'smoothstep')
  const pathArgs = {
    sourceX: props.sourceX, sourceY: props.sourceY, sourcePosition: props.sourcePosition,
    targetX: props.targetX, targetY: props.targetY, targetPosition: props.targetPosition,
  }
  const [path, labelX, labelY] = routing === 'straight'
    ? getStraightPath(pathArgs)
    : routing === 'default'
      ? getBezierPath(pathArgs)
      : getSmoothStepPath(pathArgs)
  const label = String(props.label || '')

  function selectThisEdge() {
    setEdges((current) => current.map((edge) => ({ ...edge, selected: edge.id === props.id })))
  }

  return <>
    <BaseEdge id={props.id} path={path} markerStart={props.markerStart} markerEnd={props.markerEnd} style={props.style} interactionWidth={20} />
    {(label || props.selected) && <EdgeLabelRenderer>
      <input
        className={`edge-inline-label nodrag nopan${props.selected ? ' selected' : ''}`}
        aria-label="Line text"
        value={label}
        onFocus={selectThisEdge}
        onPointerDown={(event) => { event.stopPropagation(); selectThisEdge() }}
        onChange={(event) => updateEdge(props.id, { label: event.target.value })}
        placeholder="Add label"
        style={{
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          width: `${getEdgeLabelWidth(label)}px`,
        }}
      />
    </EdgeLabelRenderer>}
  </>
}

function normalizedNode(node: Node): Node {
  if (node.type === 'architecture') return node
  return {
    ...node,
    type: 'architecture',
    data: { kind: 'service', label: String(node.data?.label || 'Service') },
    style: undefined,
  }
}

function CanvasWorkspaceInner({ nodes, edges, setNodes, setEdges }: Props) {
  const flow = useReactFlow()
  const stableNodeTypes = useMemo(() => ({ architecture: ArchitectureNode }), [])
  const stableEdgeTypes = useMemo(() => ({ editable: EditableConnectionEdge }), [])
  const [tool, setTool] = useState<CanvasTool>('select')
  const [libraryOpen, setLibraryOpen] = useState(false)
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
  useEffect(() => {
    if (edges.some((edge) => edge.type !== 'editable')) {
      setEdges((current) => current.map((edge) => ({
        ...edge,
        type: 'editable',
        data: { ...edge.data, routing: edge.type === 'straight' || edge.type === 'default' || edge.type === 'smoothstep' ? edge.type : 'smoothstep' },
      })))
    }
  }, [edges, setEdges])

  const selectedNodes = useMemo(() => nodes.filter((node) => node.selected), [nodes])
  const selectedEdges = useMemo(() => edges.filter((edge) => edge.selected), [edges])
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
    const size = getComponentSize(definition.label, kind)
    const viewportCenter = flow.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    const node: Node<ArchitectureNodeData> = {
      id: crypto.randomUUID(),
      type: 'architecture',
      position: { x: viewportCenter.x - 80, y: viewportCenter.y - 40 },
      data: {
        kind,
        label: definition.label,
      },
      style: size,
      zIndex: kind === 'container' ? -1 : 0,
    }
    remember()
    setNodes((current) => [...current.map((item) => ({ ...item, selected: false })), { ...node, selected: true }])
    setLibraryOpen(false)
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
      type: 'editable',
      data: { routing: 'smoothstep' },
      markerEnd: { type: MarkerType.ArrowClosed },
      label: 'depends on',
    }, current))
  }, [setEdges])

  function onReconnect(oldEdge: Edge, connection: Connection) {
    remember()
    setEdges((current) => reconnectEdge(oldEdge, connection, current))
  }

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

  const filteredComponents = componentDefinitions.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className={`canvas-workspace${tool === 'connect' ? ' connect-mode' : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={stableNodeTypes}
        edgeTypes={stableEdgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onNodeDragStart={() => { dragSnapshot.current = structuredClone({ nodes: nodesRef.current, edges: edgesRef.current }) }}
        onNodeDragStop={() => { if (dragSnapshot.current) remember(dragSnapshot.current); dragSnapshot.current = null }}
        onMove={(_, viewport) => setZoom(Math.round(viewport.zoom * 100))}
        panOnDrag={tool === 'pan' ? true : [1]}
        nodesDraggable={tool !== 'pan'}
        nodesConnectable={tool === 'connect' || tool === 'select'}
        edgesReconnectable={tool !== 'pan'}
        reconnectRadius={18}
        elevateEdgesOnSelect
        connectionMode={ConnectionMode.Loose}
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
              return <button key={item.kind} onClick={() => addComponent(item.kind)}><Icon /><span><strong>{item.label}</strong><small>{item.description}</small></span><Plus /></button>
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

      {selectedEdge && <ConnectionToolbar edge={selectedEdge} update={updateSelectedEdge} onDelete={deleteSelection} />}

    </div>
  )
}

function ConnectionToolbar({ edge, update, onDelete }: { edge: Edge; update: (patch: Partial<Edge>) => void; onDelete: () => void }) {
  const color = String(edge.style?.stroke || '#68708a')
  const width = Number(edge.style?.strokeWidth || 2)
  const routing = String(edge.data?.routing || 'smoothstep')
  return <div className="connection-toolbar" role="toolbar" aria-label="Connection formatting">
    <label className="connection-color" title="Line color" aria-label="Line color"><span style={{ background: color }} /><input type="color" value={color} onChange={(event) => update({ style: { ...edge.style, stroke: event.target.value } })} /></label>
    <label className="connection-select" title="Connection routing"><Spline /><select aria-label="Connection routing" value={routing} onChange={(event) => update({ data: { ...edge.data, routing: event.target.value } })}><option value="straight">Straight</option><option value="default">Curved</option><option value="smoothstep">Stepped</option></select></label>
    <label className="connection-select line-width" title="Line weight"><Minus /><select aria-label="Line weight" value={width} onChange={(event) => update({ style: { ...edge.style, strokeWidth: Number(event.target.value) } })}><option value="1">Thin</option><option value="2">Regular</option><option value="3">Bold</option><option value="5">Heavy</option></select></label>
    <span className="connection-divider" />
    <button className={edge.markerStart ? 'active' : ''} onClick={() => update({ markerStart: edge.markerStart ? undefined : { type: MarkerType.ArrowClosed } })} title="Toggle start arrow" aria-label="Toggle start arrow"><ArrowLeft /></button>
    <button className={edge.markerEnd ? 'active' : ''} onClick={() => update({ markerEnd: edge.markerEnd ? undefined : { type: MarkerType.ArrowClosed } })} title="Toggle end arrow" aria-label="Toggle end arrow"><ArrowRight /></button>
    <button className={edge.style?.strokeDasharray ? 'active dashed-line' : 'dashed-line'} onClick={() => update({ style: { ...edge.style, strokeDasharray: edge.style?.strokeDasharray ? undefined : '7 5' } })} title="Toggle dashed line" aria-label="Toggle dashed line">•••</button>
    <span className="connection-divider" />
    <input className="connection-label-input" aria-label="Connection label" value={String(edge.label || '')} onChange={(event) => update({ label: event.target.value })} placeholder="Add label" />
    <button className="connection-delete" onClick={onDelete} title="Delete connection" aria-label="Delete connection"><Trash2 /></button>
  </div>
}

export default function CanvasWorkspace(props: Props) {
  return <ReactFlowProvider><CanvasWorkspaceInner {...props} /></ReactFlowProvider>
}
