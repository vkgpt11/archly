import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import CanvasWorkspace from './CanvasWorkspace'
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

describe('CanvasWorkspace', () => {
  it('adds a searchable component and edits its properties', () => {
    render(<Harness />)

    fireEvent.click(screen.getByRole('button', { name: 'Add component' }))
    fireEvent.change(screen.getByPlaceholderText('Search components'), { target: { value: 'database' } })
    expect(screen.getByRole('button', { name: /Database/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Database/ }))
    expect(screen.getByRole('complementary', { name: 'Properties inspector' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Component name'), { target: { value: 'Orders Database' } })
    fireEvent.blur(screen.getByLabelText('Component name'))
    expect(screen.getByLabelText('Component name')).toHaveValue('Orders Database')
    expect(screen.getByLabelText('Component name').closest('.architecture-node')).toHaveClass('icon-medium')
    expect(screen.getByLabelText('Lock component')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Properties inspector' }).querySelector('input[aria-label="Name"]')).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Properties inspector' }).querySelector('input[type="checkbox"]')).not.toBeInTheDocument()

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
})
