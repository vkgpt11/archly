import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import AdminDashboard from './AdminDashboard'

const mocks = vi.hoisted(() => ({ adminSummary: vi.fn(), adminTimeSeries: vi.fn(), adminUsers: vi.fn() }))
vi.mock('../api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api')>()
  return { ...original, api: mocks }
})

describe('AdminDashboard', () => {
  afterEach(cleanup)
  beforeEach(() => {
    Object.values(mocks).forEach(mock => mock.mockReset())
    mocks.adminSummary.mockResolvedValue({ period: '30d', timezone: 'UTC', start: '2026-08-01T00:00:00Z', end: '2026-08-29T00:00:00Z', users: { total: 12, newUsers: 3, active: 8 }, diagrams: { current: 24, archived: 2, created: 7, deleted: 1, perActiveUser: .88 }, conversion: { firstDiagramPercent: 50, firstSavePercent: 40 } })
    mocks.adminTimeSeries.mockResolvedValue({ metric: 'diagrams-created', timezone: 'UTC', buckets: [{ date: '2026-08-28', value: 2 }] })
    mocks.adminUsers.mockResolvedValue({ items: [{ id: 'one', maskedEmail: 'a***@gmail.com', firstLoginAt: '2026-08-01T00:00:00Z', lastLoginAt: '2026-08-28T00:00:00Z', projectCount: 3 }], page: 0, size: 25, totalItems: 1, totalPages: 1 })
  })

  it('renders aggregate metrics and masked users', async () => {
    render(<AdminDashboard token="token" onBack={() => {}} />)
    expect(await screen.findByText('12')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('a***@gmail.com')).toBeInTheDocument()
    expect(screen.getByText(/aggregate activity in UTC/i)).toBeInTheDocument()
  })

  it('reloads metrics for a selected period', async () => {
    render(<AdminDashboard token="token" onBack={() => {}} />)
    await screen.findByText('12')
    fireEvent.click(screen.getByRole('button', { name: '7d' }))
    expect(mocks.adminSummary).toHaveBeenLastCalledWith('token', '7d')
  })

  it('shows a clear forbidden state', async () => {
    mocks.adminSummary.mockRejectedValue(new ApiError('Forbidden', 403))
    render(<AdminDashboard token="token" onBack={() => {}} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('does not have administrator access')
  })
})
