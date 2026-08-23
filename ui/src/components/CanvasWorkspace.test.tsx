import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CanvasWorkspace from './CanvasWorkspace'
import { getComponentSize, truncateCanvasText } from './canvasSizing'
import { useState } from 'react'
import type { Edge, Node } from '@xyflow/react'

afterEach(cleanup)

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
  const [edges, setEdges] = useState<Edge[]>([{ id: 'a-b', source: 'a', target: 'b', selected: true }])
  return <div style={{ width: 1000, height: 700 }}><CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} /></div>
}

function UnselectedComponentHarness() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'service', type: 'architecture', position: { x: 0, y: 0 }, data: { label: 'API', kind: 'service' }, style: { width: 44, height: 52 } },
  ])
  const [edges, setEdges] = useState<Edge[]>([])
  return <div style={{ width: 1000, height: 700 }}><CanvasWorkspace nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} /></div>
}

describe('CanvasWorkspace', () => {
  it('sizes components according to their visible content', () => {
    const compact = getComponentSize('API', '', 'service')
    const expanded = getComponentSize('Customer identity and access service', 'OAuth and account lifecycle', 'service')
    expect(compact).toEqual({ width: 44, height: 52 })
    expect(expanded.width).toBeGreaterThan(compact.width)
    expect(expanded.width).toBeLessThanOrEqual(360)
    expect(expanded.height).toBeGreaterThan(compact.height)
    expect(getComponentSize('Boundary', '', 'container')).toEqual({ width: 360, height: 240 })
  })

  it('limits read-only text without changing the full value', () => {
    const fullTitle = 'Customer identity and access management service'
    expect(truncateCanvasText(fullTitle, 28)).toBe('Customer identity and acces…')
    expect(fullTitle).toBe('Customer identity and access management service')
  })

  it('adds a searchable component and edits it inline', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'database' } })
    expect(screen.getByRole('button', { name: /Database/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Database/ }))
    expect(screen.queryByRole('complementary', { name: 'Properties inspector' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Component name'), { target: { value: 'Orders Database' } })
    fireEvent.blur(screen.getByLabelText('Component name'))
    expect(screen.getByLabelText('Component name')).toHaveValue('Orders Database')
    expect(screen.getByLabelText('Component name').closest('.architecture-node')).toHaveClass('icon-medium')
    fireEvent.change(screen.getByLabelText('Component subtitle'), { target: { value: '' } })
    expect(screen.getByLabelText('Component subtitle')).toHaveValue('')
    expect(screen.getByLabelText('Component name').closest('.react-flow__node')).toHaveStyle({ width: '122px', height: '68px' })
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
    expect(screen.getByLabelText('Connection label')).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Properties inspector' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Connection label'), { target: { value: 'HTTPS' } })
    expect(screen.getByLabelText('Connection label')).toHaveValue('HTTPS')
  })

  it('reveals connection handles when connect mode is active', () => {
    const { container } = render(<UnselectedComponentHarness />)

    expect(container.querySelector('.canvas-workspace')).not.toHaveClass('connect-mode')
    expect(container.querySelectorAll('.react-flow__handle')).toHaveLength(4)
    expect(container.querySelector('[data-handleid="left"]')).toBeInTheDocument()
    expect(container.querySelector('[data-handleid="right"]')).toBeInTheDocument()
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
