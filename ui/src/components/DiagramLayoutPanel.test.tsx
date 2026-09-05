import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DiagramLayoutPanel from './DiagramLayoutPanel'
import { parseDiagramCode } from '../diagramCode'
afterEach(cleanup)

describe('layout preview', () => {
  it('previews without mutation, then applies once', () => {
    const { nodes, edges } = parseDiagramCode('service a\nservice b\na -> b')
    const before = JSON.stringify(nodes)
    const apply = vi.fn(); const close = vi.fn()
    render(<DiagramLayoutPanel nodes={nodes} edges={edges} apply={apply} close={close} />)
    expect(screen.getByText('Apply layout')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Layout direction'), { target: { value: 'down' } })
    fireEvent.click(screen.getByText('Preview layout'))
    expect(screen.getByRole('img', { name: 'Layout preview' })).toBeInTheDocument()
    expect(JSON.stringify(nodes)).toBe(before)
    expect(apply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Apply layout'))
    expect(apply).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledOnce()
    expect(apply.mock.calls[0][0][1].position.y).toBeGreaterThan(apply.mock.calls[0][0][0].position.y)
  })
  it('cancels without applying and validates an empty selection', () => {
    const { nodes, edges } = parseDiagramCode('service a')
    const apply = vi.fn(); const close = vi.fn()
    render(<DiagramLayoutPanel nodes={nodes} edges={edges} apply={apply} close={close} />)
    fireEvent.change(screen.getByLabelText('Layout scope'), { target: { value: 'selection' } })
    fireEvent.click(screen.getByText('Preview layout'))
    expect(screen.getByRole('alert')).toHaveTextContent('Select at least one')
    fireEvent.click(screen.getByText('Cancel layout'))
    expect(apply).not.toHaveBeenCalled()
    expect(close).toHaveBeenCalledOnce()
  })
})
