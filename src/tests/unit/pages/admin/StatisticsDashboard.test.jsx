import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StatisticsDashboard from '../../../../pages/admin/StatisticsDashboard'
import * as StatisticsApi from '../../../../services/api/AdminStatisticsApi'
import * as ExportUtils from '../../../../utils/exportToCsv'

vi.mock('../../../../services/api/AdminStatisticsApi', () => ({
  getAdminStatisticsApi: vi.fn(),
}))

vi.mock('../../../../utils/exportToCsv', () => ({
  exportToCsv: vi.fn(),
}))

vi.mock('../../../../components/layout/AdminLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

const statistics = {
  totalUsers: 130,
  activeUsers: 120,
  bannedUsers: 4,
  totalPublishedComics: 42,
  totalGenres: 12,
  pendingSubmissions: 7,
  roleCounts: {
    READER: 100,
    AUTHOR: 8,
    TRANSLATOR: 7,
    PROJECT_LEADER: 3,
    MODERATOR: 4,
    ADMIN: 2,
  },
  genres: [{ id: 'genre-1', name: 'Action', slug: 'action' }],
  generatedAt: '2026-08-23T00:00:00Z',
}

const renderDashboard = () => render(
  <MemoryRouter>
    <StatisticsDashboard />
  </MemoryRouter>,
)

describe('Admin Statistics Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a stable loading state while the aggregate request is pending', () => {
    StatisticsApi.getAdminStatisticsApi.mockImplementation(() => new Promise(() => {}))

    const { container } = renderDashboard()

    expect(screen.getByTestId('statistics-skeleton')).toBeInTheDocument()
    expect(container.querySelectorAll('.stats-dashboard-loading-block')).toHaveLength(8)
  })

  it('renders exact database totals and keeps Project Leaders separate', async () => {
    StatisticsApi.getAdminStatisticsApi.mockResolvedValueOnce(statistics)

    renderDashboard()

    expect(await screen.findByText('130')).toBeInTheDocument()
    expect(screen.getByText('Project Leaders')).toBeInTheDocument()
    expect(screen.getByText('3 accounts (2.4%)')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('✓ Connected')).toBeInTheDocument()
  })

  it('shows a retryable error instead of false green health statuses', async () => {
    StatisticsApi.getAdminStatisticsApi
      .mockRejectedValueOnce(new Error('Backend unavailable'))
      .mockResolvedValueOnce(statistics)

    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent('Backend unavailable')
    expect(screen.queryByText('✓ Connected')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(screen.getByText('130')).toBeInTheDocument())
    expect(StatisticsApi.getAdminStatisticsApi).toHaveBeenCalledTimes(2)
  })

  it('exports the aggregate statistics', async () => {
    StatisticsApi.getAdminStatisticsApi.mockResolvedValueOnce(statistics)
    renderDashboard()

    await screen.findByText('130')
    fireEvent.click(screen.getByRole('button', { name: /Export Report/i }))

    expect(ExportUtils.exportToCsv).toHaveBeenCalledOnce()
    expect(ExportUtils.exportToCsv.mock.calls[0][2]).toContainEqual([
      'Project Leader Accounts',
      3,
      'Role: PROJECT_LEADER',
    ])
  })
})
