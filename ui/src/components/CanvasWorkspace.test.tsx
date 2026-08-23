import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CanvasWorkspace from './CanvasWorkspace'
import { useState } from 'react'
import type { Edge, Node } from '@xyflow/react'

function Harness() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
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
    expect(screen.getByRole('complementary', { name: 'Properties inspector' }).querySelector('input[aria-label="Name"]')).not.toBeInTheDocument()
  })
})
