import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '../types'
import { ApiError } from '../api'
import Dashboard from './Dashboard'

const mocks = vi.hoisted(() => ({ listProjects: vi.fn(), listProjectFolders: vi.fn(), createProjectFolder: vi.fn(), getProject: vi.fn(), createProject: vi.fn(), saveProject: vi.fn(), duplicateProject: vi.fn(), deleteProject: vi.fn(), organizeProject: vi.fn() }))
vi.mock('../api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api')>()
  return { ...original, api: mocks }
})
vi.mock('./Editor', () => ({ default: () => <div>Project editor</div> }))
vi.mock('../admin/AdminDashboard', () => ({ default: () => <div>Administration dashboard</div> }))

const project: Project = { id: 'one', name: 'Payments', canvasJson: '{"nodes":[],"edges":[]}', markdown: '<p>Design</p>', revision: 0, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }

describe('Dashboard project actions', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); window.location.hash = '' })
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.listProjects.mockResolvedValue({ items: [project], page: 0, size: 100, totalItems: 1, totalPages: 1 })
    mocks.listProjectFolders.mockResolvedValue([])
    mocks.createProjectFolder.mockImplementation((_token: string, name: string) => Promise.resolve({ name }))
    mocks.getProject.mockResolvedValue(project)
    mocks.deleteProject.mockResolvedValue(undefined)
  })

  it('opens administration from a direct hash route and follows hash navigation', async () => {
    window.location.hash = '#/admin'
    render(<Dashboard token="token" isAdmin onSignOut={() => {}} />)
    expect(await screen.findByText('Administration dashboard')).toBeInTheDocument()
    window.location.hash = ''
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(await screen.findByRole('heading', { name: 'Architecture projects' })).toBeInTheDocument()
  })

  it('duplicates a project as a new dashboard entry', async () => {
    mocks.duplicateProject.mockResolvedValue({ ...project, id: 'copy', name: 'Payments — Copy' })
    render(<Dashboard token="token" onSignOut={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate' }))
    expect(await screen.findByText('Payments — Copy')).toBeInTheDocument()
    expect(mocks.duplicateProject).toHaveBeenCalledWith('token', 'one')
  })

  it('creates and displays an empty persistent folder', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Production')
    mocks.createProjectFolder.mockResolvedValue({ name: 'Production' })
    render(<Dashboard token="token" onSignOut={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'New folder' }))
    expect(await screen.findByRole('option', { name: 'Production' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Project folder' })).toHaveValue('Production')
    expect(mocks.createProjectFolder).toHaveBeenCalledWith('token', 'Production')
  })

  it('creates independent editable content from a selected template', async () => {
    mocks.createProject.mockResolvedValue({ ...project, id: 'new', name: 'Kubernetes deployment' })
    mocks.saveProject.mockImplementation((_token: string, value: Project) => Promise.resolve({ ...value, revision: 1 }))
    render(<Dashboard token="token" onSignOut={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'New project' }))
    fireEvent.click(screen.getByRole('button', { name: /Kubernetes deployment/ }))
    expect(await screen.findByText('Project editor')).toBeInTheDocument()
    const saved = mocks.saveProject.mock.calls[0][1] as Project
    expect(JSON.parse(saved.canvasJson).nodes).toHaveLength(4)
    expect(saved.markdown).toContain('Kubernetes deployment')
  })

  it('searches, filters, folders, and archives projects', async () => {
    const platform = { ...project, id: 'two', name: 'Platform', folder: 'Production' }
    mocks.listProjects.mockResolvedValue({ items: [project, platform], page: 0, size: 100, totalItems: 2, totalPages: 1 })
    mocks.organizeProject.mockResolvedValue({ ...platform, archived: true })
    render(<Dashboard token="token" onSignOut={() => {}} />)

    const search = await screen.findByRole('searchbox', { name: 'Search projects' })
    fireEvent.change(search, { target: { value: 'Platform' } })
    expect(screen.getByText('Platform')).toBeInTheDocument()
    expect(screen.queryByText('Payments')).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Project folder'), { target: { value: 'Production' } })
    expect(screen.getByText('Platform')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    expect(mocks.organizeProject).toHaveBeenCalledWith('token', 'two', 'Production', true, 0)
  })

  it('reloads the latest project summary after an organization conflict', async () => {
    const latest = { ...project, revision: 2, folder: 'Latest folder' }
    mocks.organizeProject.mockRejectedValue(new ApiError('Conflict', 409))
    mocks.getProject.mockResolvedValue(latest)
    render(<Dashboard token="token" onSignOut={() => {}} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('changed elsewhere')
    expect(mocks.getProject).toHaveBeenCalledWith('token', 'one')
  })

  it('confirms project deletion in-app and removes it only after the API succeeds', async () => {
    render(<Dashboard token="token" onSignOut={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete “Payments”?')
    fireEvent.click(screen.getByRole('button', { name: 'Delete project' }))
    expect(mocks.deleteProject).toHaveBeenCalledWith('token', 'one')
    expect(await screen.findByText('Create your first architecture')).toBeInTheDocument()
  })

  it('keeps the project and reports an API deletion failure', async () => {
    mocks.deleteProject.mockRejectedValue(new Error('Delete request failed'))
    render(<Dashboard token="token" onSignOut={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete project' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Delete request failed')
    expect(screen.getByText('Payments')).toBeInTheDocument()
  })
})
