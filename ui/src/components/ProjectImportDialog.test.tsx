import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ProjectImportDialog from './ProjectImportDialog'
import { createProjectPackage } from '../projectPortability'

const mocks = vi.hoisted(() => ({ importProject: vi.fn(), validateProjectImport: vi.fn(), getProject: vi.fn() }))
vi.mock('../api', () => ({ api: mocks }))
const project = { id: 'original', revision: 7, name: 'Original', markdown: '<p>Notes</p>', canvasJson: '{"nodes":[],"edges":[]}', createdAt: '', updatedAt: '' }
beforeEach(() => { vi.resetAllMocks(); mocks.validateProjectImport.mockResolvedValue(undefined); mocks.getProject.mockResolvedValue(project) })
afterEach(cleanup)
async function chooseFile() {
  const file = { size: 100, text: async () => JSON.stringify(createProjectPackage(project)) }
  fireEvent.change(screen.getByLabelText('Project backup file'), { target: { files: [file] } })
  await screen.findByRole('heading', { name: 'Original' })
}
it('previews and cancels without creating a project', async () => {
  const close = vi.fn()
  render(<ProjectImportDialog token="token" projects={[project]} onClose={close} onImported={vi.fn()} />)
  await chooseFile()
  expect(screen.getByText(/0 snapshots/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(close).toHaveBeenCalled()
  expect(mocks.importProject).not.toHaveBeenCalled()
})
it('defaults to an independent project and opens the persisted result', async () => {
  const imported = vi.fn(); mocks.importProject.mockResolvedValue({ ...project, id: 'new' })
  render(<ProjectImportDialog token="token" projects={[project]} onClose={vi.fn()} onImported={imported} />)
  await chooseFile()
  fireEvent.click(screen.getByRole('button', { name: 'Import project' }))
  await waitFor(() => expect(imported).toHaveBeenCalledWith(expect.objectContaining({ id: 'new' })))
  expect(mocks.importProject).toHaveBeenCalledWith('token', expect.objectContaining({ format: 'archly-project' }), undefined, undefined)
})
it('requires replacement confirmation and sends the reviewed revision', async () => {
  mocks.importProject.mockRejectedValue(new Error('Project changed. Reload and review before importing.'))
  render(<ProjectImportDialog token="token" projects={[project]} onClose={vi.fn()} onImported={vi.fn()} />)
  await chooseFile()
  fireEvent.change(screen.getByLabelText('Import destination'), { target: { value: 'original' } })
  const confirmation = await screen.findByRole('checkbox')
  expect(screen.getByRole('button', { name: 'Import project' })).toBeDisabled()
  fireEvent.click(confirmation)
  fireEvent.click(screen.getByRole('button', { name: 'Import project' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Project changed')
  expect(mocks.importProject).toHaveBeenCalledWith('token', expect.anything(), 'original', 7)
  expect(confirmation).not.toBeChecked()
})
it('shows validation failure without allowing import', async () => {
  mocks.validateProjectImport.mockRejectedValue(new Error('Invalid snapshot'))
  render(<ProjectImportDialog token="token" projects={[]} onClose={vi.fn()} onImported={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Project backup file'), { target: { files: [{ size: 100, text: async () => JSON.stringify(createProjectPackage(project)) }] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid snapshot')
  expect(screen.getByRole('button', { name: 'Import project' })).toBeDisabled()
  expect(mocks.importProject).not.toHaveBeenCalled()
})
