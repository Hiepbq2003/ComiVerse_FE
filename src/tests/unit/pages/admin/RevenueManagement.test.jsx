import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RevenueManagement from '../../../../pages/admin/RevenueManagement'
import * as SubscriptionApi from '../../../../services/api/SubscriptionApi'
import * as ExportUtils from '../../../../utils/exportToCsv'

vi.mock('../../../../services/api/SubscriptionApi', () => ({
  getAdminPaymentStatisticsApi: vi.fn(),
  getAdminPaymentLogsApi: vi.fn()
}))

vi.mock('../../../../utils/exportToCsv', () => ({
  exportToCsv: vi.fn()
}))

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', role: 'ADMIN', fullName: 'Super Admin' },
    isLoggedIn: true,
    logout: vi.fn()
  })
}))

vi.mock('../../../../context/NotificationContext', () => ({
  useNotification: () => ({
    unreadCount: 0,
    notifications: [],
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn()
  })
}))

vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() })
}))

const statistics = {
  period: {
    from: '2026-07-05',
    to: '2026-08-03',
    previousFrom: '2026-06-05',
    previousTo: '2026-07-04',
    currency: 'VND',
    zoneId: 'Asia/Ho_Chi_Minh'
  },
  summary: {
    totalTransactions: 20,
    paidPayments: 12,
    uniquePayingUsers: 10,
    pendingPayments: 2,
    failedPayments: 3,
    expiredPayments: 2,
    refundedPayments: 1,
    grossRevenue: 1500000,
    averageOrderValue: 125000,
    successRate: 72.5,
    activeSubscriptions: 18,
    revenueChangePercent: 15.5,
    paidPaymentsChangePercent: 9.1
  },
  dailySeries: [
    { date: '2026-08-02', revenue: 500000, paidPayments: 4, failedPayments: 1, expiredPayments: 0 },
    { date: '2026-08-03', revenue: 1000000, paidPayments: 8, failedPayments: 2, expiredPayments: 2 }
  ],
  statusBreakdown: [
    { status: 'PAID', count: 12, attemptedAmount: 1500000, percentage: 60 },
    { status: 'PENDING', count: 2, attemptedAmount: 158000, percentage: 10 },
    { status: 'FAILED', count: 3, attemptedAmount: 237000, percentage: 15 },
    { status: 'EXPIRED', count: 2, attemptedAmount: 158000, percentage: 10 },
    { status: 'REFUNDED', count: 1, attemptedAmount: 79000, percentage: 5 }
  ],
  planBreakdown: [
    {
      planId: 'plan-monthly',
      planCode: 'MONTHLY',
      planName: 'Premium Monthly',
      paidPayments: 12,
      revenue: 1500000,
      revenueSharePercent: 100
    }
  ],
  availableCurrencies: ['VND'],
  generatedAt: '2026-08-03T12:00:00Z'
}

const logs = {
  content: [
    {
      id: 'payment-1',
      createdAt: '2026-08-03T11:00:00Z',
      userEmail: 'reader@example.com',
      planCode: 'MONTHLY',
      planName: 'Premium Monthly',
      amount: 79000,
      currency: 'VND',
      status: 'PAID'
    }
  ]
}

describe('Admin payment statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderDashboard = () => render(
    <MemoryRouter>
      <RevenueManagement />
    </MemoryRouter>
  )

  it('renders skeletons while payment data is loading', () => {
    SubscriptionApi.getAdminPaymentStatisticsApi.mockImplementation(() => new Promise(() => {}))
    SubscriptionApi.getAdminPaymentLogsApi.mockImplementation(() => new Promise(() => {}))

    const { container } = renderDashboard()

    expect(container.querySelectorAll('.payment-loading-block').length).toBeGreaterThan(0)
  })

  it('shows verified statistics, plan performance, and recent payments', async () => {
    SubscriptionApi.getAdminPaymentStatisticsApi.mockResolvedValue(statistics)
    SubscriptionApi.getAdminPaymentLogsApi.mockResolvedValue(logs)

    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Payment Statistics' })).toBeInTheDocument()
    expect(screen.getByText('72.5%')).toBeInTheDocument()
    expect(screen.getAllByText('Premium Monthly').length).toBeGreaterThan(0)
    expect(screen.getByText('reader@example.com')).toBeInTheDocument()
    expect(screen.getByText('+15.5% vs previous period')).toBeInTheDocument()
  })

  it('reloads statistics when the reporting period changes', async () => {
    SubscriptionApi.getAdminPaymentStatisticsApi.mockResolvedValue(statistics)
    SubscriptionApi.getAdminPaymentLogsApi.mockResolvedValue(logs)
    renderDashboard()

    await screen.findByRole('heading', { name: 'Payment Statistics' })
    fireEvent.change(screen.getByLabelText('Period'), { target: { value: '7' } })

    await waitFor(() => {
      expect(SubscriptionApi.getAdminPaymentStatisticsApi).toHaveBeenLastCalledWith(
        expect.objectContaining({ days: 7, zoneId: 'Asia/Ho_Chi_Minh' })
      )
    })
  })

  it('exports the server-backed daily series', async () => {
    SubscriptionApi.getAdminPaymentStatisticsApi.mockResolvedValue(statistics)
    SubscriptionApi.getAdminPaymentLogsApi.mockResolvedValue(logs)
    renderDashboard()

    const exportButton = await screen.findByRole('button', { name: /Export CSV/i })
    fireEvent.click(exportButton)

    expect(ExportUtils.exportToCsv).toHaveBeenCalledWith(
      expect.stringContaining('ComiVerse_Payment_Statistics'),
      expect.any(Array),
      expect.arrayContaining([expect.arrayContaining(['Daily', '2026-08-03'])])
    )
  })

  it('shows a retry state when the statistics endpoint fails', async () => {
    SubscriptionApi.getAdminPaymentStatisticsApi.mockRejectedValue(new Error('Backend unavailable'))
    SubscriptionApi.getAdminPaymentLogsApi.mockResolvedValue({ content: [] })
    renderDashboard()

    expect(await screen.findByText('Payment statistics are unavailable')).toBeInTheDocument()
    expect(screen.getByText('Backend unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
