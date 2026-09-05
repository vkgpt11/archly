import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { conflictStorageKey, createDraft, draftStorageKey, projectSyncStorageKey, storeDraft } from '../projectPersistence'
import type { Project } from '../types'
import type { Node, Viewport } from '@xyflow/react'
import Editor from './Editor'

const apiMocks = vi.hoisted(() => ({
  saveProject: vi.fn(),
  getProject: vi.fn(),
  listShares: vi.fn(),
  createShare: vi.fn(),
  revokeShare: vi.fn(),
}))

vi.mock('../api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api')>()
  return { ...original, api: { ...original.api, ...apiMocks } }
})

vi.mock('./CanvasWorkspace', () => ({
  default: ({ nodes, setNodes, onViewportChange }: {
    nodes: Node[]
    setNodes: (updater: (current: Node[]) => Node[]) => void
    onViewportChange?: (viewport: Viewport) => void
  }) => <div>Canvas workspace
    <button onClick={() => setNodes((current) => current.map((node) => ({ ...node, selected: true })))}>Select canvas node</button>
    <button onClick={() => onViewportChange?.({ x: 120, y: 80, zoom: 1.25 })}>Move viewport</button>
    <span>{nodes.filter((node) => node.selected).length} selected</span>
  </div>,
}))

const initialProject: Project = {
  id: 'project-1', name: 'Original', canvasJson: '{"nodes":[],"edges":[]}', markdown: '<p>Original</p>',
  revision: 0, createdAt: '2026-08-24T00:00:00Z', updatedAt: '2026-08-24T00:00:00Z',
}

describe('Editor conflict recovery', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    window.name = 'archly:tab-b'
    apiMocks.saveProject.mockReset()
    apiMocks.getProject.mockReset()
    apiMocks.listShares.mockReset()
    apiMocks.createShare.mockReset()
    apiMocks.revokeShare.mockReset()
  })
  afterEach(cleanup)

  it('surfaces invalid stored canvas data and does not overwrite it through autosave', async () => {
    render(<Editor initialProject={{ ...initialProject, canvasJson: 'not-json' }} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Canvas could not be loaded')
    expect(screen.getByRole('alert')).toHaveTextContent('automatic saving are disabled')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    expect(apiMocks.saveProject).not.toHaveBeenCalled()
  })

  it('preserves the local draft and shows both versions after a stale save', async () => {
    const serverProject = { ...initialProject, name: 'Changed in Tab A', revision: 1, updatedAt: '2026-08-24T01:00:00Z' }
    apiMocks.saveProject.mockRejectedValue(new ApiError('Conflict', 409))
    apiMocks.getProject.mockResolvedValue(serverProject)

    render(<Editor token="token" initialProject={initialProject} onBack={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), { target: { value: 'Changed in Tab B' } })

    expect(await screen.findByRole('dialog', { name: 'This project changed in another tab' }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('Based on revision 0')).toBeInTheDocument()
    expect(screen.getByText('Revision 1')).toBeInTheDocument()
    expect(sessionStorage.getItem(draftStorageKey(initialProject.id, 'tab-b'))).toContain('Changed in Tab B')
    expect(sessionStorage.getItem(conflictStorageKey(initialProject.id, 'tab-b'))).toContain('Changed in Tab A')

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

  it('does not save selection-only or viewport-only canvas changes', async () => {
    const withNode = { ...initialProject, canvasJson: '{"nodes":[{"id":"a","type":"architecture","position":{"x":0,"y":0},"data":{"kind":"service","label":"API"}}],"edges":[]}' }
    apiMocks.saveProject.mockResolvedValue({ ...withNode, revision: 1 })
    render(<Editor token="token" initialProject={withNode} onBack={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Select canvas node' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move viewport' }))
    await new Promise((resolve) => window.setTimeout(resolve, 1100))

    expect(apiMocks.saveProject).not.toHaveBeenCalled()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('detects another tab save before autosave and preserves each tab draft', async () => {
    const otherTabDraft = createDraft({ ...initialProject, name: 'Tab A draft' }, 'tab-a')
    storeDraft(otherTabDraft)
    const serverProject = { ...initialProject, name: 'Saved by Tab A', revision: 1, updatedAt: '2026-08-24T01:00:00Z' }
    apiMocks.getProject.mockResolvedValue(serverProject)
    apiMocks.saveProject.mockResolvedValue(serverProject)

    render(<Editor token="token" initialProject={initialProject} onBack={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), { target: { value: 'Unsaved Tab B draft' } })
    window.dispatchEvent(new StorageEvent('storage', {
      key: projectSyncStorageKey(initialProject.id),
      newValue: JSON.stringify({ projectId: initialProject.id, ownerId: 'tab-a', revision: 1, savedAt: '2026-08-24T01:00:00Z' }),
    }))

    expect(await screen.findByRole('dialog', { name: 'This project changed in another tab' })).toBeInTheDocument()
    expect(sessionStorage.getItem(draftStorageKey(initialProject.id, 'tab-a'))).toContain('Tab A draft')
    expect(sessionStorage.getItem(draftStorageKey(initialProject.id, 'tab-b'))).toContain('Unsaved Tab B draft')
    expect(apiMocks.saveProject).not.toHaveBeenCalled()
  })

  it('refreshes a clean tab when another tab saves a newer revision', async () => {
    const serverProject = { ...initialProject, name: 'Fresh server version', revision: 2, updatedAt: '2026-08-24T02:00:00Z' }
    apiMocks.getProject.mockResolvedValue(serverProject)
    render(<Editor token="token" initialProject={initialProject} onBack={vi.fn()} />)

    window.dispatchEvent(new StorageEvent('storage', {
      key: projectSyncStorageKey(initialProject.id),
      newValue: JSON.stringify({ projectId: initialProject.id, ownerId: 'tab-a', revision: 2, savedAt: '2026-08-24T02:00:00Z' }),
    }))

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Project name' })).toHaveValue('Fresh server version'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(apiMocks.saveProject).not.toHaveBeenCalled()
  })

  it('restores a local draft after refresh and saves it', async () => {
    storeDraft(createDraft({ ...initialProject, name: 'Recovered after refresh' }, 'tab-b'))
    apiMocks.saveProject.mockImplementation(async (_token: string, project: Project) => ({ ...project, revision: 1 }))

    render(<Editor token="token" initialProject={initialProject} onBack={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: 'Project name' })).toHaveValue('Recovered after refresh')
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument(), { timeout: 3000 })
    expect(apiMocks.saveProject).toHaveBeenCalledWith('token', expect.objectContaining({ name: 'Recovered after refresh' }))
    expect(sessionStorage.getItem(draftStorageKey(initialProject.id, 'tab-b'))).toBeNull()
  })

  it('keeps the local draft after a network failure and retries explicitly', async () => {
    apiMocks.saveProject
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockImplementationOnce(async (_token: string, project: Project) => ({ ...project, revision: 1 }))

    render(<Editor token="token" initialProject={initialProject} onBack={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), { target: { value: 'Network-safe draft' } })

    expect(await screen.findByText('Save failed', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(sessionStorage.getItem(draftStorageKey(initialProject.id, 'tab-b'))).toContain('Network-safe draft')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument(), { timeout: 3000 })
    expect(apiMocks.saveProject).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem(projectSyncStorageKey(initialProject.id))).toContain('"ownerId":"tab-b"')
  })

  it('creates and revokes server-managed share links', async () => {
    apiMocks.listShares.mockResolvedValue([])
    apiMocks.createShare.mockResolvedValue({ id: 'share-1', token: 'public-token', permission: 'READ', revoked: false, createdAt: '2026-08-26T00:00:00Z' })
    apiMocks.revokeShare.mockResolvedValue(undefined)
    render(<Editor token="token" initialProject={initialProject} onBack={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Share project' }))
    expect(await screen.findByRole('dialog', { name: 'Share project' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }))
    expect(await screen.findByLabelText('New share link')).toHaveValue(`${window.location.origin}/share/public-token`)
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }))
    await waitFor(() => expect(apiMocks.revokeShare).toHaveBeenCalledWith('token', initialProject.id, 'share-1'))
    expect(await screen.findByText('Revoked')).toBeInTheDocument()
  })

  it('offers every required export target and selection-only mode', async () => {
    render(<Editor token="token" initialProject={initialProject} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Export project' }))
    const dialog = await screen.findByRole('dialog', { name: 'Export project' })
    expect(within(dialog).getByText('PNG')).toBeInTheDocument()
    expect(within(dialog).getByText('SVG')).toBeInTheDocument()
    expect(within(dialog).getByText('Markdown')).toBeInTheDocument()
    expect(within(dialog).getByText('Archly source')).toBeInTheDocument()
    expect(within(dialog).getByText('Copy image')).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: 'Selection only' })).toBeInTheDocument()
  })
})
