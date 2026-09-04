import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CanvasWorkspace from './CanvasWorkspace'
import { alignCanvasNodes, applyGroupAwareNodeChanges, arrangeCanvasNodes, assignNodeToContainingContainer, distributeCanvasNodes, moveSelectedCanvasNodes, reorderSelectedCanvasNodes, selectPersistentGroup } from './canvasInteractions'
import { clearNodeSelection, selectOnlyEdge } from './canvasSelection'
import { getComponentSize, getEdgeLabelWidth, truncateCanvasText } from './canvasSizing'
import { useState } from 'react'
import type { Edge, Node } from '@xyflow/react'

afterEach(() => { cleanup(); localStorage.clear() })

function Harness() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  return <div style={{ width: 1000, height: 700 }}><CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} /></div>
}

function ConnectionHarness() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'a', type: 'architecture', position: { x: 0, y: 0 }, data: { label: 'Web', kind: 'web' } },
    { id: 'b', type: 'architecture', position: { x: 300, y: 0 }, data: { label: 'API', kind: 'service' } },
  ])
  const [edges, setEdges] = useState<Edge[]>([{ id: 'a-b', source: 'a', target: 'b', selected: true, label: 'depends on' }])
  return <div style={{ width: 1000, height: 700 }}>
    <CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} />
    <output data-testid="edge-state">{JSON.stringify(edges)}</output>
  </div>
}

function UnselectedComponentHarness() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'service', type: 'architecture', position: { x: 0, y: 0 }, data: { label: 'API', kind: 'service' }, style: { width: 44, height: 52 } },
  ])
  const [edges, setEdges] = useState<Edge[]>([])
  return <div style={{ width: 1000, height: 700 }}><CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} /></div>
}

function SelectedComponentHarness() {
  const size = getComponentSize('API', 'service')
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'service', type: 'architecture', position: { x: 0, y: 0 }, selected: true,
      data: { label: 'API', kind: 'service' }, style: size },
  ])
  const [edges, setEdges] = useState<Edge[]>([])
  return <div style={{ width: 1000, height: 700 }}><CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} /></div>
}

function GroupHarness() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'a', type: 'architecture', position: { x: 0, y: 0 }, selected: true, data: { label: 'Web', kind: 'web' } },
    { id: 'b', type: 'architecture', position: { x: 200, y: 0 }, selected: true, data: { label: 'API', kind: 'service' } },
  ])
  const [edges, setEdges] = useState<Edge[]>([
    { id: 'a-b', source: 'a', target: 'b', type: 'editable', label: 'HTTPS' },
  ])
  return <div style={{ width: 1000, height: 700 }}>
    <output data-testid="group-state">{JSON.stringify({ nodes, edges })}</output>
    <CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} />
  </div>
}

function VariantHarness() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [source, setSource] = useState('')
  const [activeVariant, setActiveVariant] = useState('')
  return <div style={{ width: 1000, height: 700 }}>
    <CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} diagramCode={source} onDiagramCodeChange={setSource} activeVariant={activeVariant} onActiveVariantChange={setActiveVariant} />
    <output data-testid="variant-state">{JSON.stringify({ source, activeVariant, labels: nodes.map((node) => node.data.label) })}</output>
  </div>
}

function BidirectionalHarness() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'api', type: 'architecture', position: { x: 10, y: 20 }, selected: true, data: { label: 'API', kind: 'service' } },
  ])
  const [edges, setEdges] = useState<Edge[]>([])
  const [diagramCode, setDiagramCode] = useState('# original formatting\nservice api "API"\nposition api x=10 y=20')
  return <div style={{ width: 1000, height: 700 }}>
    <CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} diagramCode={diagramCode} onDiagramCodeChange={setDiagramCode} />
    <output data-testid="diagram-source">{diagramCode}</output>
  </div>
}

describe('CanvasWorkspace', () => {
  it('selects environment variants, identifies the active environment, and preserves the last valid canvas', async () => {
    render(<VariantHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Diagram as code' }))
    const source = `service api "Base API"\nvariant production {\noverride api label="Production API"\n}\nvariant broken {\noverride missing label=Nope\n}`
    fireEvent.change(screen.getByRole('textbox', { name: 'Diagram code' }), { target: { value: source } })
    fireEvent.click(screen.getByRole('button', { name: 'Draw diagram' }))
    expect(screen.getByLabelText('Active environment')).toHaveTextContent('Base')
    fireEvent.change(screen.getByLabelText('Diagram environment'), { target: { value: 'production' } })
    expect(screen.getByLabelText('Active environment')).toHaveTextContent('production')
    expect(screen.getByText('Production API', { exact: true })).toBeInTheDocument()
    expect(screen.getByTestId('variant-state')).toHaveTextContent('"activeVariant":"production"')
    fireEvent.change(screen.getByLabelText('Diagram environment'), { target: { value: 'broken' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Line 6: unknown component “missing” in variant “broken”')
    expect(screen.getByText('Production API', { exact: true })).toBeInTheDocument()
    expect(screen.getByLabelText('Active environment')).toHaveTextContent('production')
    expect(JSON.parse(screen.getByTestId('variant-state').textContent || '{}').source).toBe(source)
  })
  it('draws a diagram from code and keeps invalid code from replacing the canvas', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Diagram as code' }))
    const editor = screen.getByLabelText('Diagram code')
    fireEvent.change(editor, { target: { value: 'web client "Web"\nservice api "API"\nclient -> api : "HTTPS"' } })
    fireEvent.click(screen.getByRole('button', { name: 'Draw diagram' }))
    expect(screen.getAllByText('Web')).toHaveLength(1)
    expect(screen.getAllByText('API')).toHaveLength(1)
    fireEvent.change(editor, { target: { value: 'api -> missing' } })
    fireEvent.click(screen.getByRole('button', { name: 'Draw diagram' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Line 1: unknown component “api”')
    expect(container.querySelector('.diagram-code-lines .error')).toHaveTextContent('1')
    expect(screen.getByText('API')).toBeInTheDocument()
  })

  it('synchronizes canvas edits to code and preserves source formatting after a code redraw', async () => {
    render(<BidirectionalHarness />)
    fireEvent.change(screen.getByLabelText('Component name'), { target: { value: 'Orders API' } })
    await waitFor(() => expect(screen.getByTestId('diagram-source')).toHaveTextContent('service api "Orders API"'))
    expect(screen.getByTestId('diagram-source')).toHaveTextContent('position api x=10 y=20')

    fireEvent.click(screen.getByRole('button', { name: 'Diagram as code' }))
    const exactSource = '# keep this comment\n\nservice api "Billing API"\nposition api x=44 y=55'
    fireEvent.change(screen.getByLabelText('Diagram code'), { target: { value: exactSource } })
    fireEvent.click(screen.getByRole('button', { name: 'Draw diagram' }))
    await waitFor(() => expect(screen.getByText('Billing API')).toBeInTheDocument())
    expect(screen.getByTestId('diagram-source').textContent).toBe(exactSource)
    expect(screen.getByLabelText('Diagram code')).toHaveValue(exactSource)
  })

  it('shows a line number for every diagram-code line', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Diagram as code' }))
    fireEvent.change(screen.getByLabelText('Diagram code'), { target: { value: 'direction right\n\nservice api "API"' } })
    expect([...container.querySelectorAll('.diagram-code-lines span')].map((line) => line.textContent)).toEqual(['1', '2', '3'])
  })

  it('provides accessible completion, symbol navigation, rename, formatting, commands, and quick fixes', async () => {
    render(<VariantHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Diagram as code' }))
    const editor = screen.getByLabelText('Diagram code') as HTMLTextAreaElement
    const source = '# api stays in comment\nservice api "api stays in string"\ndatabase db\nconnection query api -> db'
    fireEvent.change(editor, { target: { value: source } })
    const reference = source.lastIndexOf('api')
    editor.setSelectionRange(reference, reference)
    fireEvent.select(editor)
    expect(screen.getByLabelText('Symbol information')).toHaveTextContent('component')
    fireEvent.click(screen.getByRole('button', { name: 'Definition' }))
    await waitFor(() => expect(editor.selectionStart).toBe(source.indexOf('api "')))
    fireEvent.click(screen.getByRole('button', { name: 'References' }))
    expect(within(screen.getByLabelText('Symbol references')).getAllByRole('button')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))
    fireEvent.change(screen.getByLabelText('New symbol name'), { target: { value: 'gateway' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply rename' }))
    expect(editor.value).toContain('# api stays in comment')
    expect(editor.value).toContain('"api stays in string"')
    expect(editor.value).toContain('service gateway')
    expect(editor.value).toContain('query gateway -> db')
    fireEvent.change(editor, { target: { value: `${editor.value}\n` } })
    editor.setSelectionRange(editor.value.length, editor.value.length)
    fireEvent.select(editor)
    fireEvent.keyDown(editor, { key: ' ', ctrlKey: true })
    expect(screen.getByRole('listbox', { name: 'Code completions' })).toBeInTheDocument()
    expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'import' })).toBeInTheDocument()
    fireEvent.keyDown(editor, { key: 'Escape' })
    fireEvent.keyDown(editor, { key: 'p', ctrlKey: true, shiftKey: true })
    expect(screen.getByRole('dialog', { name: 'Diagram command palette' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Format document' }))
    expect(screen.getByText('Formatted document while preserving comments.')).toBeInTheDocument()
    fireEvent.change(editor, { target: { value: 'api -> missing' } })
    fireEvent.click(screen.getByRole('button', { name: 'Draw diagram' }))
    fireEvent.click(screen.getByRole('button', { name: /Quick fix: Declare api/ }))
    expect(editor.value).toMatch(/^service api/)
  })

  it('inserts reusable template examples with unique names and draws their instances', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Diagram as code' }))
    fireEvent.click(screen.getByRole('button', { name: 'Insert template example' }))
    fireEvent.click(screen.getByRole('button', { name: 'Insert template example' }))
    expect((screen.getByLabelText('Diagram code') as HTMLTextAreaElement).value).toContain('template ServiceStack2(')
    fireEvent.click(screen.getByRole('button', { name: 'Draw diagram' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getAllByText('Orders API')).toHaveLength(2)
    expect((screen.getByLabelText('Diagram code') as HTMLTextAreaElement).value).toContain('use ServiceStack2 servicestack2(')
  })

  it('searches the shorthand reference and inserts a unique component declaration', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Diagram as code' }))
    fireEvent.click(screen.getByRole('button', { name: /Component reference/ }))
    fireEvent.change(screen.getByLabelText('Search component shorthands'), { target: { value: 'lambda' } })
    fireEvent.click(screen.getByRole('button', { name: /aws-lambda.*Lambda/i }))
    expect((screen.getByLabelText('Diagram code') as HTMLTextAreaElement).value).toContain('aws-lambda awsLambda "AWS Lambda"')
  })


  it('exposes active canvas tools without relying on color alone', () => {
    render(<Harness />)
    const select = screen.getByRole('button', { name: 'Select' })
    const pan = screen.getByRole('button', { name: 'Pan' })
    expect(select).toHaveAttribute('aria-pressed', 'true')
    expect(select).toHaveClass('active')
    expect(pan).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(pan)
    expect(pan).toHaveAttribute('aria-pressed', 'true')
    expect(pan).toHaveClass('active')
    expect(select).toHaveAttribute('aria-pressed', 'false')
  })

  it('configures grid visibility and snapping independently', () => {
    const { container } = render(<Harness />)
    const grid = screen.getByRole('button', { name: 'Toggle grid' })
    const snap = screen.getByRole('button', { name: 'Toggle snap to grid' })
    expect(grid).toHaveAttribute('aria-pressed', 'true')
    expect(snap).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('.react-flow__background')).toBeInTheDocument()
    fireEvent.click(grid)
    expect(grid).toHaveAttribute('aria-pressed', 'false')
    expect(snap).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('.react-flow__background')).not.toBeInTheDocument()
    fireEvent.click(snap)
    expect(snap).toHaveAttribute('aria-pressed', 'false')
  })

  it('sizes components according to their visible content', () => {
    const compact = getComponentSize('API', 'service')
    const expanded = getComponentSize('Customer identity and access service', 'service')
    expect(compact).toEqual({ width: 52, height: 42 })
    expect(expanded.width).toBeGreaterThan(compact.width)
    expect(expanded.width).toBeLessThanOrEqual(82)
    expect(expanded.height).toBeGreaterThan(compact.height)
    expect(getComponentSize('Boundary', 'container')).toEqual({ width: 360, height: 240 })
  })

  it('limits read-only text without changing the full value', () => {
    const fullTitle = 'Customer identity and access management service'
    expect(truncateCanvasText(fullTitle, 28)).toBe('Customer identity and acces…')
    expect(fullTitle).toBe('Customer identity and access management service')
  })

  it('keeps arrow labels compact around their text', () => {
    expect(getEdgeLabelWidth('')).toBe(42)
    expect(getEdgeLabelWidth('HTTPS')).toBe(28)
    expect(getEdgeLabelWidth('A very long connection label that should be capped')).toBeLessThanOrEqual(132)
  })

  it('adds a searchable component and edits it inline', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'database' } })
    const databaseCard = screen.getByText('SQL Database', { selector: 'strong' }).closest('button')!
    expect(databaseCard).toBeInTheDocument()

    fireEvent.click(databaseCard)
    expect(screen.queryByRole('complementary', { name: 'Properties inspector' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
    expect(screen.getByRole('complementary', { name: 'Properties inspector' })).toBeInTheDocument()
    expect(screen.getByLabelText('Component name').closest('.architecture-node')).toHaveClass('architecture-node-database')

    fireEvent.change(screen.getByLabelText('Component name'), { target: { value: 'Orders Database' } })
    fireEvent.blur(screen.getByLabelText('Component name'))
    expect(screen.getByLabelText('Component name')).toHaveValue('Orders Database')
    expect(screen.getByLabelText('Component name').closest('.architecture-node')).toHaveClass('icon-first')
    expect(screen.queryByLabelText('Component subtitle')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Component name')).toHaveAttribute('rows', '1')
    expect(screen.getByLabelText('Component name').closest('.react-flow__node')).toHaveStyle({ width: '82px', height: '42px' })
    fireEvent.change(screen.getByLabelText('Component name'), { target: { value: 'Orders\nDatabase' } })
    expect(screen.getByLabelText('Component name')).toHaveValue('Orders Database')
    expect(screen.getByLabelText('Component name').closest('.react-flow__node')).toHaveStyle({ height: '42px' })
    expect(screen.getByLabelText('Lock component')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Lock component'))
    expect(screen.getByLabelText('Unlock component')).toBeInTheDocument()
  })

  it('shows connection formatting in a separate toolbar', () => {
    render(<ConnectionHarness />)

    expect(screen.getByRole('toolbar', { name: 'Connection formatting' })).toBeInTheDocument()
    expect(screen.getByLabelText('Connection routing')).toBeInTheDocument()
    expect(screen.getByLabelText('Line weight')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle start arrow')).toBeInTheDocument()
    expect(screen.getByLabelText('Toggle end arrow')).toBeInTheDocument()
    expect(screen.queryByLabelText('Add bend point')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Connection label')).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Properties inspector' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
    const inspector = screen.getByRole('complementary', { name: 'Properties inspector' })
    expect(within(inspector).getByLabelText('Connection property label')).toHaveValue('depends on')
    expect(within(inspector).getByLabelText('Connection property routing')).toHaveValue('smoothstep')
    expect(within(inspector).getByLabelText('Connection direction')).toHaveValue('none')
    expect(within(inspector).getByLabelText('Connection line style')).toHaveValue('solid')
    expect(within(inspector).getByLabelText('Connection property color')).toHaveValue('#68708a')
    fireEvent.change(screen.getByLabelText('Connection label'), { target: { value: 'HTTPS' } })
    expect(screen.getByLabelText('Connection label')).toHaveValue('HTTPS')
  })

  it('opens component properties by double-clicking its icon or body', () => {
    const { container } = render(<SelectedComponentHarness />)
    expect(screen.queryByRole('complementary', { name: 'Properties inspector' })).not.toBeInTheDocument()
    fireEvent.doubleClick(container.querySelector('.component-kind-icon')!)
    const inspector = screen.getByRole('complementary', { name: 'Properties inspector' })
    expect(inspector).toBeInTheDocument()
    expect(within(inspector).getByText('Component').closest('.property-heading')).not.toBeNull()
    expect(within(inspector).getByRole('button', { name: 'Close properties' })).toHaveClass('property-close')
    fireEvent.click(screen.getByRole('button', { name: 'Close properties' }))
    fireEvent.doubleClick(container.querySelector('.architecture-node')!)
    expect(screen.getByRole('complementary', { name: 'Properties inspector' })).toBeInTheDocument()
  })

  it('adds a dedicated user-defined custom component type', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'user defined' } })
    fireEvent.click(screen.getByRole('button', { name: /Custom Component/ }))
    expect(screen.getByLabelText('Component name')).toHaveValue('Custom Component')
    expect(screen.getByLabelText('Component name').closest('.architecture-node')).toHaveClass('architecture-node-custom')
    expect(container.querySelector('.architecture-node-custom .component-kind-icon .lucide-shapes')).toBeInTheDocument()
  })

  it('edits all required component properties', () => {
    render(<SelectedComponentHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
    const inspector = screen.getByRole('complementary', { name: 'Properties inspector' })
    fireEvent.change(within(inspector).getByLabelText('Component property title'), { target: { value: 'Orders' } })
    fireEvent.change(within(inspector).getByLabelText('Component description'), { target: { value: 'Stores customer orders' } })
    fireEvent.change(within(inspector).getByLabelText('Component type'), { target: { value: 'database' } })
    fireEvent.change(within(inspector).getByLabelText('Component icon'), { target: { value: 'postgresql' } })
    fireEvent.change(within(inspector).getByLabelText('Component fill color'), { target: { value: '#112233' } })
    fireEvent.change(within(inspector).getByLabelText('Component border color'), { target: { value: '#445566' } })
    fireEvent.change(within(inspector).getByLabelText('Component text color'), { target: { value: '#ddeeff' } })
    expect(screen.getByLabelText('Component name')).toHaveValue('Orders')
    expect(screen.getByLabelText('Component name').closest('.architecture-node')).toHaveClass('architecture-node-database')
    expect(screen.getByLabelText('Component name').closest('.architecture-node')).toHaveStyle({ background: '#112233', borderColor: '#445566', color: '#ddeeff' })
    expect(within(inspector).getByLabelText('Component description')).toHaveValue('Stores customer orders')
  })

  it('edits a boundary title and appearance', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add container' }))
    fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
    const inspector = screen.getByRole('complementary', { name: 'Properties inspector' })
    fireEvent.change(within(inspector).getByLabelText('Component property title'), { target: { value: 'Production VPC' } })
    fireEvent.change(within(inspector).getByLabelText('Component fill color'), { target: { value: '#102030' } })
    fireEvent.change(within(inspector).getByLabelText('Component border color'), { target: { value: '#405060' } })
    fireEvent.change(within(inspector).getByLabelText('Component text color'), { target: { value: '#f0f1f2' } })
    const boundary = screen.getByLabelText('Component name').closest('.architecture-node')
    expect(screen.getByLabelText('Component name')).toHaveValue('Production VPC')
    expect(boundary).toHaveClass('architecture-node-container')
    expect(boundary).toHaveStyle({ background: '#102030', borderColor: '#405060', color: '#f0f1f2' })
  })

  it('adds a library component by dragging it onto the canvas', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    const transfer = {
      effectAllowed: '',
      types: ['application/x-archly-component'],
      values: new Map<string, string>(),
      setData(type: string, value: string) { this.values.set(type, value) },
      getData(type: string) { return this.values.get(type) || '' },
    }
    const service = screen.getByRole('button', { name: /Service \/ API:/ })
    fireEvent.dragStart(service, { dataTransfer: transfer })
    expect(transfer.effectAllowed).toBe('copy')
    fireEvent.dragOver(container.querySelector('.react-flow')!, { dataTransfer: transfer })
    fireEvent.drop(container.querySelector('.react-flow')!, { dataTransfer: transfer, clientX: 500, clientY: 350 })
    expect(screen.getByLabelText('Component name')).toHaveValue('Service / API')
  })

  it('shows recently used components when the library is reopened', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: /Service \/ API:/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'Recent' }))
    expect(screen.getByRole('button', { name: /Service \/ API:/ })).toBeInTheDocument()
  })

  it('searches technology aliases and persists a selectable icon', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'apache event stream' } })
    fireEvent.click(screen.getByRole('button', { name: /Kafka/ }))
    expect(screen.getByLabelText('Component name')).toHaveValue('Kafka')
    fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
    expect(screen.getByLabelText('Component icon')).toHaveValue('kafka')
    fireEvent.change(screen.getByLabelText('Component icon'), { target: { value: 'kubernetes' } })
    expect(screen.getByLabelText('Component icon')).toHaveValue('kubernetes')
  })

  it('groups the optimized catalog and finds high-value architecture aliases', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    const categories = screen.getByLabelText('Component categories')
    expect(categories).toHaveTextContent('AllGeneralAWSAzureGoogle CloudOperations - CD/CIAI / ML')
    expect(categories).not.toHaveTextContent('Containers')
    expect(categories).not.toHaveTextContent('Documentation')
    fireEvent.click(screen.getByRole('button', { name: 'General' }))
    expect(screen.getByText('Monolith', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Serverless Function', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Background Worker', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Scheduled Job', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByText('Kubernetes Cluster', { selector: 'strong' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Platform/ }))
    expect(screen.getByText('Kubernetes Cluster', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Networking/ }))
    expect(screen.getByText('API Gateway', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Reverse Proxy', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Security/ }))
    expect(screen.getByText('Secrets Manager', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Firewall / WAF', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByText('CI/CD Pipeline', { selector: 'strong' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Operations - CD/CI' }))
    expect(screen.getByText('Monitoring', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('CI/CD Pipeline', { selector: 'strong' })).toBeInTheDocument()
    for (const label of [
      'Jenkins', 'GitHub Actions', 'GitLab CI', 'Argo CD', 'Terraform', 'Ansible', 'Helm',
      'Prometheus', 'Grafana', 'OpenTelemetry', 'PagerDuty',
    ]) expect(screen.getByText(label, { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'General' }))
    fireEvent.click(screen.getByRole('button', { name: /Data/ }))
    expect(screen.getByText('PostgreSQL', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Search Engine', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Data Warehouse', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Messaging/ }))
    expect(screen.getByText('Kafka', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Message Queue', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Communication/ }))
    expect(screen.getByText('Email', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Notification', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Slack', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Microsoft Teams', { selector: 'strong' })).toBeInTheDocument()
    for (const label of ['SMS', 'Push Notification', 'Webhook', 'Microsoft Outlook', 'Gmail', 'Twilio', 'SendGrid', 'Discord']) {
      expect(screen.getByText(label, { selector: 'strong' })).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole('button', { name: /Utilities/ }))
    expect(screen.getByText('Boundary', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByText('Database', { selector: 'strong' })).not.toBeInTheDocument()
    expect(screen.queryByText('File storage', { selector: 'strong' })).not.toBeInTheDocument()
    expect(screen.queryByText('Queue / Event bus', { selector: 'strong' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'cloudfront' } })
    expect(screen.getByText('CDN', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByText('Amazon Web Services', { selector: 'strong' })).not.toBeInTheDocument()
  })

  it('adds a monolith with its dedicated component icon', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'General' }))
    fireEvent.click(screen.getByText('Monolith', { selector: 'strong' }).closest('button')!)

    fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
    expect(screen.getByLabelText('Component icon')).toHaveValue('monolith')
    expect(container.querySelector('.component-kind-icon .lucide-box')).toBeInTheDocument()
  })

  it('adds CI/CD and SRE tools with stable branded icon IDs', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'argocd' } })
    fireEvent.click(screen.getByText('Argo CD', { selector: 'strong' }).closest('button')!)

    fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
    expect(screen.getByLabelText('Component icon')).toHaveValue('argo-cd')
    expect(container.querySelector('.component-kind-icon svg')).toBeInTheDocument()
  })

  it('adds communication tools with stable branded icon IDs', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'slack' } })
    fireEvent.click(screen.getByText('Slack', { selector: 'strong' }).closest('button')!)

    fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
    expect(screen.getByLabelText('Component icon')).toHaveValue('slack')
    expect(container.querySelector('.component-kind-icon svg')).toBeInTheDocument()
  })

  it('organizes the complete AI stack into dedicated collapsible groups', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'AI / ML' }))

    expect(screen.getByText('AI Agent', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('RAG Pipeline', { selector: 'strong' })).toBeInTheDocument()
    for (const [group, labels] of [
      ['Model Providers', ['OpenAI', 'Anthropic Claude', 'Google Gemini', 'Meta Llama', 'Mistral AI', 'Cohere', 'Hugging Face']],
      ['Agent Frameworks', ['LangChain', 'LangGraph', 'LlamaIndex', 'Semantic Kernel', 'CrewAI']],
      ['Vector Data', ['Pinecone', 'Weaviate', 'Milvus', 'Qdrant', 'Chroma', 'pgvector']],
      ['Inference', ['vLLM', 'Ollama', 'Hugging Face Inference', 'NVIDIA NIM', 'NVIDIA Triton', 'Text Generation Inference', 'SGLang']],
      ['Observability', ['LangSmith', 'MLflow', 'Weights & Biases', 'Arize Phoenix', 'Helicone', 'Promptfoo']],
    ] as const) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${group} \\d+$`) }))
      for (const label of labels) expect(screen.getByText(label, { selector: 'strong' })).toBeInTheDocument()
    }
  })

  it('adds cloud-native AI services to their provider categories', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'AWS' }))
    expect(screen.getByText('Amazon Bedrock', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon SageMaker AI', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Azure' }))
    expect(screen.getByText('Azure OpenAI', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Azure AI Foundry', { selector: 'strong' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Google Cloud' }))
    expect(screen.getByText('Google Vertex AI', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Google Gemini API', { selector: 'strong' })).toBeInTheDocument()
  })

  it('keeps catalog labels and selectable icon IDs unique', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    const labels = screen.getAllByRole('button')
      .map((button) => button.querySelector('strong')?.textContent)
      .filter((label): label is string => Boolean(label))
    expect(new Set(labels).size).toBe(labels.length)

    fireEvent.click(screen.getByText('Monolith', { selector: 'strong' }).closest('button')!)
    fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
    const iconValues = Array.from((screen.getByLabelText('Component icon') as HTMLSelectElement).options)
      .map((option) => option.value)
      .filter(Boolean)
    expect(new Set(iconValues).size).toBe(iconValues.length)
  })

  it('uses visually distinct SQL and NoSQL component icons', () => {
    const sqlView = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'SQL Database' } })
    fireEvent.click(screen.getByText('SQL Database', { selector: 'strong' }).closest('button')!)
    expect(sqlView.container.querySelector('.component-kind-icon .lucide-database')).toBeInTheDocument()
    sqlView.unmount()

    const noSqlView = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'NoSQL Database' } })
    fireEvent.click(screen.getByText('NoSQL Database', { selector: 'strong' }).closest('button')!)
    expect(noSqlView.container.querySelector('.component-kind-icon .lucide-braces')).toBeInTheDocument()
  })

  it('provides AWS services with official architecture icons', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'AWS' }))
    expect(screen.getByText('AWS Lambda', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon DynamoDB', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon ECS', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('AWS Fargate', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon EC2', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon S3', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon RDS', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon SQS', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon SNS', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon API Gateway', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon CloudFront', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Amazon EKS', { selector: 'strong' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('Amazon DynamoDB', { selector: 'strong' }).closest('button')!)
    fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
    expect(screen.getByLabelText('Component icon')).toHaveValue('aws-dynamodb')
    expect(container.querySelector('.component-kind-icon title')?.textContent).toContain('Amazon-DynamoDB')
  })

  it('provides recognizable Azure service icons with stable icon IDs', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'Azure' }))

    for (const label of [
      'Azure Function', 'Azure App Service', 'Azure Virtual Machine', 'Azure Storage Account',
      'Azure Cosmos DB', 'Azure Service Bus', 'Azure Kubernetes Service', 'Azure Key Vault',
      'Azure Application Gateway',
    ]) expect(screen.getByText(label, { selector: 'strong' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('Azure Cosmos DB', { selector: 'strong' }).closest('button')!)
    fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
    expect(screen.getByLabelText('Component icon')).toHaveValue('azure-cosmos-db')
    expect(container.querySelector('.component-kind-icon svg')).toBeInTheDocument()
  })

  it('provides recognizable Google Cloud service icons with stable icon IDs', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.click(screen.getByRole('button', { name: 'Google Cloud' }))

    for (const label of [
      'GCP Pub/Sub', 'Compute Engine', 'Cloud Run', 'Cloud Functions', 'Cloud Storage', 'Cloud SQL',
      'Firestore', 'Google Kubernetes Engine', 'BigQuery', 'Cloud Load Balancing',
    ]) expect(screen.getByText(label, { selector: 'strong' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('Google Kubernetes Engine', { selector: 'strong' }).closest('button')!)
    fireEvent.click(screen.getByRole('button', { name: 'Properties' }))
    expect(screen.getByLabelText('Component icon')).toHaveValue('gcp-gke')
    expect(container.querySelector('.component-kind-icon svg')).toBeInTheDocument()
  })

  it('undoes and redoes a connection label edit as one action', () => {
    render(<ConnectionHarness />)
    const label = screen.getByLabelText('Connection label')

    fireEvent.focus(label)
    fireEvent.change(label, { target: { value: 'HTTPS' } })
    fireEvent.blur(label)
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(screen.getByLabelText('Connection label')).toHaveValue('depends on')

    fireEvent.keyDown(document, { key: 'y', ctrlKey: true })
    expect(screen.getByLabelText('Connection label')).toHaveValue('HTTPS')
  })

  it('restores a component title and its automatic size together', () => {
    render(<SelectedComponentHarness />)
    const title = screen.getByLabelText('Component name')
    const node = title.closest('.react-flow__node')
    expect(node).toHaveStyle({ width: '52px', height: '42px' })

    fireEvent.focus(title)
    fireEvent.change(title, { target: { value: 'Customer identity and access service' } })
    fireEvent.blur(title)
    expect(node).not.toHaveStyle({ width: '52px' })

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(screen.getByLabelText('Component name')).toHaveValue('API')
    expect(screen.getByLabelText('Component name').closest('.react-flow__node')).toHaveStyle({ width: '52px', height: '42px' })

    fireEvent.keyDown(document, { key: 'z', ctrlKey: true, shiftKey: true })
    expect(screen.getByLabelText('Component name')).toHaveValue('Customer identity and access service')
  })

  it('undoes lock and connection formatting mutations independently', () => {
    const component = render(<SelectedComponentHarness />)
    fireEvent.click(screen.getByLabelText('Lock component'))
    expect(screen.getByLabelText('Unlock component')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(screen.getByLabelText('Lock component')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'y', ctrlKey: true })
    expect(screen.getByLabelText('Unlock component')).toBeInTheDocument()
    component.unmount()

    const { container } = render(<ConnectionHarness />)
    fireEvent.change(screen.getByLabelText('Connection routing'), { target: { value: 'straight' } })
    expect(screen.getByLabelText('Connection routing')).toHaveValue('straight')
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(screen.getByLabelText('Connection routing')).toHaveValue('smoothstep')
    fireEvent.keyDown(document, { key: 'y', ctrlKey: true })
    expect(screen.getByLabelText('Connection routing')).toHaveValue('straight')

    const lineColor = container.querySelector<HTMLInputElement>('.connection-color input')!
    fireEvent.change(lineColor, { target: { value: '#ff0000' } })
    expect(lineColor).toHaveValue('#ff0000')
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(container.querySelector('.connection-color input')).toHaveValue('#68708a')
    fireEvent.keyDown(document, { key: 'y', ctrlKey: true })
    expect(container.querySelector('.connection-color input')).toHaveValue('#ff0000')

    fireEvent.click(screen.getByLabelText('Toggle start arrow'))
    expect(screen.getByLabelText('Toggle start arrow')).toHaveClass('active')
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    expect(screen.getByLabelText('Toggle start arrow')).not.toHaveClass('active')
  })

  it('creates and removes persistent group membership', () => {
    render(<GroupHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Group selected components' }))

    let state = JSON.parse(screen.getByTestId('group-state').textContent!)
    expect(state.nodes[0].data.groupId).toBeTruthy()
    expect(state.nodes[1].data.groupId).toBe(state.nodes[0].data.groupId)
    expect(JSON.parse(JSON.stringify(state)).nodes[0].data.groupId).toBe(state.nodes[0].data.groupId)
    expect(screen.getByRole('button', { name: 'Ungroup selected components' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ungroup selected components' }))
    state = JSON.parse(screen.getByTestId('group-state').textContent!)
    expect(state.nodes.every((node: Node) => !node.data.groupId)).toBe(true)
  })

  it('locks and unlocks a multi-selection as one action', () => {
    render(<GroupHarness />)
    fireEvent.click(screen.getByRole('button', { name: 'Lock selected components' }))
    let state = JSON.parse(screen.getByTestId('group-state').textContent!)
    expect(state.nodes.every((node: Node) => node.data.locked && node.draggable === false)).toBe(true)
    expect(screen.getByRole('button', { name: 'Unlock selected components' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
    state = JSON.parse(screen.getByTestId('group-state').textContent!)
    expect(state.nodes.every((node: Node) => !node.data.locked)).toBe(true)
  })

  it('selects every member when one persistent group member is selected', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: { groupId: 'group-1' } },
      { id: 'b', position: { x: 0, y: 0 }, data: { groupId: 'group-1' } },
      { id: 'c', position: { x: 0, y: 0 }, selected: true, data: {} },
    ]
    expect(selectPersistentGroup(nodes, nodes[0]).map((node) => Boolean(node.selected)))
      .toEqual([true, true, false])
  })

  it('moves every group member when one member is dragged', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 10, y: 20 }, data: { groupId: 'group-1' } },
      { id: 'b', position: { x: 50, y: 80 }, data: { groupId: 'group-1' } },
      { id: 'c', position: { x: 0, y: 0 }, data: {} },
    ]
    const moved = applyGroupAwareNodeChanges([
      { type: 'position', id: 'a', position: { x: 30, y: 50 }, dragging: true },
    ], nodes)
    expect(moved.map((node) => node.position)).toEqual([
      { x: 30, y: 50 }, { x: 70, y: 110 }, { x: 0, y: 0 },
    ])
  })

  it('moves selected unlocked nodes with arrow-key increments', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 10, y: 20 }, selected: true, data: {} },
      { id: 'b', position: { x: 30, y: 40 }, selected: true, data: { locked: true } },
    ]
    expect(moveSelectedCanvasNodes(nodes, 1, -10).map((node) => node.position)).toEqual([
      { x: 11, y: 10 }, { x: 30, y: 40 },
    ])
  })

  it('assigns container ownership and moves owned children with their container', () => {
    const nodes: Node[] = [
      { id: 'container', position: { x: 0, y: 0 }, data: { kind: 'container' }, style: { width: 300, height: 200 } },
      { id: 'child', position: { x: 50, y: 60 }, data: {}, style: { width: 80, height: 40 } },
    ]
    const assigned = assignNodeToContainingContainer(nodes, 'child')
    expect(assigned[1].data.containerId).toBe('container')
    const moved = applyGroupAwareNodeChanges([{ type: 'position', id: 'container', position: { x: 20, y: 30 } }], assigned)
    expect(moved[1].position).toEqual({ x: 70, y: 90 })
    const outside = assignNodeToContainingContainer(moved.map((node) => node.id === 'child' ? { ...node, position: { x: 400, y: 400 } } : node), 'child')
    expect(outside[1].data.containerId).toBeUndefined()
  })

  it('moves every nested descendant when a region moves', () => {
    const nodes: Node[] = [
      { id: 'region', position: { x: 0, y: 0 }, data: { kind: 'container' }, style: { width: 500, height: 400 } },
      { id: 'vpc', position: { x: 40, y: 50 }, data: { kind: 'container', containerId: 'region' }, style: { width: 350, height: 250 } },
      { id: 'api', position: { x: 90, y: 110 }, data: { kind: 'service', containerId: 'vpc' }, style: { width: 60, height: 42 } },
    ]
    const moved = applyGroupAwareNodeChanges([{ type: 'position', id: 'region', position: { x: 100, y: 80 } }], nodes)
    expect(moved.find((node) => node.id === 'vpc')?.position).toEqual({ x: 140, y: 130 })
    expect(moved.find((node) => node.id === 'api')?.position).toEqual({ x: 190, y: 190 })
  })

  it('assigns nested containers without creating containment cycles', () => {
    const nodes: Node[] = [
      { id: 'region', position: { x: 0, y: 0 }, data: { kind: 'container' }, style: { width: 500, height: 400 } },
      { id: 'vpc', position: { x: 50, y: 50 }, data: { kind: 'container' }, style: { width: 300, height: 220 } },
      { id: 'child', position: { x: 100, y: 100 }, data: { kind: 'service', containerId: 'vpc' }, style: { width: 60, height: 42 } },
    ]
    const nested = assignNodeToContainingContainer(nodes, 'vpc')
    expect(nested.find((node) => node.id === 'vpc')?.data.containerId).toBe('region')
    const cycleAttempt = assignNodeToContainingContainer(nested.map((node) => node.id === 'region' ? { ...node, position: { x: 70, y: 70 }, style: { width: 120, height: 100 } } : node), 'region')
    expect(cycleAttempt.find((node) => node.id === 'region')?.data.containerId).toBeUndefined()
  })

  it('brings selected nodes forward and sends them backward', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, selected: true, zIndex: 1, data: {} },
      { id: 'b', position: { x: 0, y: 0 }, zIndex: 4, data: {} },
    ]
    expect(reorderSelectedCanvasNodes(nodes, 'front')[0].zIndex).toBe(5)
    expect(reorderSelectedCanvasNodes(nodes, 'back')[0].zIndex).toBe(0)
  })

  it('arranges by connection direction, preserves locks, and distributes evenly', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 300, y: 200 }, selected: true, data: {} },
      { id: 'b', position: { x: 10, y: 20 }, selected: true, data: {} },
      { id: 'c', position: { x: 50, y: 60 }, selected: true, data: { locked: true } },
    ]
    const arranged = arrangeCanvasNodes(nodes, [{ id: 'a-b', source: 'a', target: 'b' }], 'horizontal')
    expect(arranged.find((node) => node.id === 'b')!.position.x).toBeGreaterThan(arranged.find((node) => node.id === 'a')!.position.x)
    expect(arranged.find((node) => node.id === 'c')!.position).toEqual({ x: 50, y: 60 })

    const distributed = distributeCanvasNodes([
      { id: 'a', position: { x: 0, y: 0 }, selected: true, data: {} },
      { id: 'b', position: { x: 80, y: 0 }, selected: true, data: {} },
      { id: 'c', position: { x: 300, y: 0 }, selected: true, data: {} },
    ], 'horizontal')
    expect(distributed.map((node) => node.position.x)).toEqual([0, 150, 300])
  })

  it('aligns left, center, right, top, middle, and bottom using node bounds', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 10, y: 20 }, selected: true, data: {}, style: { width: 40, height: 30 } },
      { id: 'b', position: { x: 100, y: 90 }, selected: true, data: {}, style: { width: 80, height: 50 } },
    ]
    expect(alignCanvasNodes(nodes, 'left').map((node) => node.position.x)).toEqual([10, 10])
    expect(alignCanvasNodes(nodes, 'right').map((node) => node.position.x)).toEqual([140, 100])
    expect(alignCanvasNodes(nodes, 'center').map((node) => node.position.x)).toEqual([65, 45])
    expect(alignCanvasNodes(nodes, 'top').map((node) => node.position.y)).toEqual([20, 20])
    expect(alignCanvasNodes(nodes, 'bottom').map((node) => node.position.y)).toEqual([110, 90])
    expect(alignCanvasNodes(nodes, 'middle').map((node) => node.position.y)).toEqual([60, 50])
  })

  it('duplicates a group with remapped membership and internal connection', () => {
    render(<GroupHarness />)
    expect(screen.getByRole('toolbar', { name: 'Selection actions' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Group selected components' }))
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate selected' }))

    const state = JSON.parse(screen.getByTestId('group-state').textContent!)
    expect(state.nodes).toHaveLength(4)
    expect(state.edges).toHaveLength(2)
    const groups = new Map<string, Node[]>()
    for (const node of state.nodes as Node[]) {
      const groupId = String(node.data.groupId)
      const members = groups.get(groupId) || []
      groups.set(groupId, [...members, node])
    }
    expect(groups.size).toBe(2)
    expect([...groups.values()].map((members) => members.length)).toEqual([2, 2])
    for (const edge of state.edges as Edge[]) {
      const source = state.nodes.find((node: Node) => node.id === edge.source)
      const target = state.nodes.find((node: Node) => node.id === edge.target)
      expect(source.data.groupId).toBe(target.data.groupId)
    }
  })

  it('switches selection from a component to only the requested connection', () => {
    const nodes: Node[] = [
      { id: 'a', position: { x: 0, y: 0 }, data: {}, selected: true },
      { id: 'b', position: { x: 0, y: 0 }, data: {} },
    ]
    const edges: Edge[] = [
      { id: 'a-b', source: 'a', target: 'b' },
      { id: 'b-a', source: 'b', target: 'a', selected: true },
    ]

    expect(clearNodeSelection(nodes).every((node) => !node.selected)).toBe(true)
    expect(selectOnlyEdge(edges, 'a-b').map(({ id, selected }) => ({ id, selected }))).toEqual([
      { id: 'a-b', selected: true },
      { id: 'b-a', selected: false },
    ])
  })

  it('reveals connection handles when connect mode is active', () => {
    const { container } = render(<UnselectedComponentHarness />)

    expect(container.querySelector('.canvas-workspace')).not.toHaveClass('connect-mode')
    expect(container.querySelectorAll('.react-flow__handle')).toHaveLength(8)
    expect(container.querySelector('.source[data-handleid="left"]')).toBeInTheDocument()
    expect(container.querySelector('.target[data-handleid="left"]')).toBeInTheDocument()
    expect(container.querySelector('.source[data-handleid="right"]')).toBeInTheDocument()
    expect(container.querySelector('.target[data-handleid="right"]')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Connect components' }))
    expect(container.querySelector('.canvas-workspace')).toHaveClass('connect-mode')
  })

  it('locks a component without entering edit mode', () => {
    render(<UnselectedComponentHarness />)

    fireEvent.pointerDown(screen.getByLabelText('Lock component'))
    fireEvent.click(screen.getByLabelText('Lock component'))

    expect(screen.getByLabelText('Unlock component')).toBeInTheDocument()
    expect(screen.queryByLabelText('Component name')).not.toBeInTheDocument()
  })
})
