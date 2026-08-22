import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PayoutManagement from '../../../../pages/admin/PayoutManagement'
import * as PayoutApi from '../../../../services/api/PayoutApi'

vi.mock('../../../../services/api/PayoutApi', () => ({
  getAdminPayoutsApi: vi.fn(),
  approveAdminPayoutApi: vi.fn(),
  rejectAdminPayoutApi: vi.fn(),
  payAdminPayoutApi: vi.fn(),
}))

vi.mock('../../../../components/layout/AdminLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const pendingPayout = {
  id: 'payout-1',
  userName: 'Author X',
  userEmail: 'author@example.com',
  role: 'AUTHOR',
  payoutMonth: '2026-08',
  amount: 25,
  amountUsd: 25,
  grossAmountUsd: 30,
  monthlyLimitUsd: 480,
  currency: 'USD',
  status: 'PENDING',
  requestedAt: '2026-08-20T10:00:00Z',
}

const responseFor = (status) => ({
  items: status === 'PENDING' ? [pendingPayout] : [],
  counts: { PENDING: 1, APPROVED: 0, PROCESSING: 0, PAID: 0, REJECTED: 0, FAILED: 0 },
  totals: { PENDING: 25 },
  totalsCurrency: 'USD',
  totalElements: status === 'PENDING' ? 1 : 0,
  totalPages: 1,
  size: 20,
})

const renderPage = () => render(
  <MemoryRouter>
    <PayoutManagement />
  </MemoryRouter>,
)

describe('Admin Payout Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    PayoutApi.getAdminPayoutsApi.mockImplementation(({ status }) => Promise.resolve(responseFor(status)))
  })

  it('loads API-shaped payout data and summary values', async () => {
    renderPage()

    expect(await screen.findByText('Author X')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pending (1)' })).toBeInTheDocument()
    expect(PayoutApi.getAdminPayoutsApi).toHaveBeenCalledWith({ status: 'PENDING', page: 0, size: 20 })
  })

  it('requests the selected server-side status filter', async () => {
    renderPage()
    await screen.findByText('Author X')

    fireEvent.click(screen.getByRole('button', { name: 'Approved (0)' }))

    await waitFor(() => expect(PayoutApi.getAdminPayoutsApi).toHaveBeenLastCalledWith({ status: 'APPROVED', page: 0, size: 20 }))
    expect(await screen.findByText('No payout requests match this filter.')).toBeInTheDocument()
  })

  it('approves a pending payout and refreshes the list', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Verified')
    PayoutApi.approveAdminPayoutApi.mockResolvedValueOnce({})
    renderPage()
    await screen.findByText('Author X')

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => expect(PayoutApi.approveAdminPayoutApi).toHaveBeenCalledWith('payout-1', 'Verified'))
    await waitFor(() => expect(PayoutApi.getAdminPayoutsApi).toHaveBeenCalledTimes(2))
  })
})
