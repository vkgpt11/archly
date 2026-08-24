import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import type { Project } from '../types'
import Editor from './Editor'

const apiMocks = vi.hoisted(() => ({
  saveProject: vi.fn(),
  getProject: vi.fn(),
}))

vi.mock('../api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api')>()
  return { ...original, api: { ...original.api, ...apiMocks } }
})

vi.mock('./CanvasWorkspace', () => ({ default: () => <div>Canvas workspace</div> }))

const initialProject: Project = {
  id: 'project-1', name: 'Original', canvasJson: '{"nodes":[],"edges":[]}', markdown: '<p>Original</p>',
  revision: 0, createdAt: '2026-08-24T00:00:00Z', updatedAt: '2026-08-24T00:00:00Z',
}

describe('Editor conflict recovery', () => {
  beforeEach(() => {
    localStorage.clear()
    apiMocks.saveProject.mockReset()
    apiMocks.getProject.mockReset()
  })
  afterEach(cleanup)

  it('preserves the local draft and shows both versions after a stale save', async () => {
    const serverProject = { ...initialProject, name: 'Changed in Tab A', revision: 1, updatedAt: '2026-08-24T01:00:00Z' }
    apiMocks.saveProject.mockRejectedValue(new ApiError('Conflict', 409))
    apiMocks.getProject.mockResolvedValue(serverProject)

    render(<Editor token="token" initialProject={initialProject} onBack={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), { target: { value: 'Changed in Tab B' } })

    expect(await screen.findByRole('dialog', { name: 'This project changed in another tab' }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('Based on revision 0')).toBeInTheDocument()
    expect(screen.getByText('Revision 1')).toBeInTheDocument()
    expect(localStorage.getItem(`archly-project-draft:${initialProject.id}`)).toContain('Changed in Tab B')
    expect(localStorage.getItem(`archly-project-conflict:${initialProject.id}`)).toContain('Changed in Tab A')

    fireEvent.click(screen.getByRole('button', { name: 'Use server version' }))
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Project name' })).toHaveValue('Changed in Tab A'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('overwrites only after the user explicitly keeps the local version', async () => {
    const serverProject = { ...initialProject, name: 'Changed in Tab A', revision: 1, updatedAt: '2026-08-24T01:00:00Z' }
    apiMocks.saveProject
      .mockRejectedValueOnce(new ApiError('Conflict', 409))
      .mockImplementationOnce(async (_token: string, project: Project) => ({ ...project, revision: 2, updatedAt: '2026-08-24T02:00:00Z' }))
    apiMocks.getProject.mockResolvedValue(serverProject)

    render(<Editor token="token" initialProject={initialProject} onBack={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), { target: { value: 'Changed in Tab B' } })
    expect(await screen.findByRole('dialog', { name: 'This project changed in another tab' }, { timeout: 3000 })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Keep my version' }))

    await waitFor(() => expect(apiMocks.saveProject).toHaveBeenCalledTimes(2), { timeout: 3000 })
    expect(apiMocks.saveProject.mock.calls[1][1]).toMatchObject({ name: 'Changed in Tab B', revision: 1 })
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
