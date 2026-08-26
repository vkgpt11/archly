import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '../types'
import Dashboard from './Dashboard'

const mocks = vi.hoisted(() => ({ listProjects: vi.fn(), createProject: vi.fn(), saveProject: vi.fn(), duplicateProject: vi.fn(), deleteProject: vi.fn(), organizeProject: vi.fn() }))
vi.mock('../api', () => ({ api: mocks }))
vi.mock('./Editor', () => ({ default: () => <div>Project editor</div> }))

const project: Project = { id: 'one', name: 'Payments', canvasJson: '{"nodes":[],"edges":[]}', markdown: '<p>Design</p>', revision: 0, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' }

describe('Dashboard project actions', () => {
  afterEach(cleanup)
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.listProjects.mockResolvedValue([project])
  })

  it('duplicates a project as a new dashboard entry', async () => {
    mocks.duplicateProject.mockResolvedValue({ ...project, id: 'copy', name: 'Payments — Copy' })
    render(<Dashboard token="token" onSignOut={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Duplicate' }))
    expect(await screen.findByText('Payments — Copy')).toBeInTheDocument()
    expect(mocks.duplicateProject).toHaveBeenCalledWith('token', 'one')
  })

  it('creates independent editable content from a selected template', async () => {
    mocks.createProject.mockResolvedValue({ ...project, id: 'new', name: 'Kubernetes deployment' })
    mocks.saveProject.mockImplementation((_token: string, value: Project) => Promise.resolve({ ...value, revision: 1 }))
    render(<Dashboard token="token" onSignOut={() => {}} />)
    fireEvent.click(await screen.findByRole('button', { name: '+ New project' }))
    fireEvent.click(screen.getByRole('button', { name: /Kubernetes deployment/ }))
    expect(await screen.findByText('Project editor')).toBeInTheDocument()
    const saved = mocks.saveProject.mock.calls[0][1] as Project
    expect(JSON.parse(saved.canvasJson).nodes).toHaveLength(4)
    expect(saved.markdown).toContain('Kubernetes deployment')
  })

  it('searches, filters, folders, and archives projects', async () => {
    const platform = { ...project, id: 'two', name: 'Platform', folder: 'Production' }
    mocks.listProjects.mockResolvedValue([project, platform])
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
    expect(mocks.organizeProject).toHaveBeenCalledWith('token', 'two', 'Production', true)
  })
})
