import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AccountManagement from '../../../../pages/admin/AccountManagement'
import * as AccountApi from '../../../../services/api/AccountApi'
import { toast } from 'react-toastify'

vi.mock('../../../../services/api/AccountApi', () => ({
  getAllAccountsApi: vi.fn(),
  registerStaffApi: vi.fn(),
  banUserApi: vi.fn(),
  unbanUserApi: vi.fn(),
  resetUserPasswordApi: vi.fn(),
  updateUserApi: vi.fn(),
  approveAuthorLicenseApi: vi.fn(),
  rejectAuthorLicenseApi: vi.fn(),
  reopenAuthorLicenseApi: vi.fn(),
}))

vi.mock('../../../../components/layout/AdminLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}))

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}))

vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

const apiPage = (data) => ({
  data,
  metadata: { totalPages: 1, totalElements: data.length },
})

const renderPage = () => render(
  <MemoryRouter>
    <AccountManagement />
  </MemoryRouter>,
)

describe('Admin account security and edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('surfaces a backend rate-limit response without mutating account status', async () => {
    AccountApi.getAllAccountsApi.mockResolvedValue(apiPage([
      { id: 'user-1', email: 'spam@test.com', username: 'spammy', fullName: 'Spam User', role: 'READER', status: 'Active' },
    ]))
    AccountApi.banUserApi.mockRejectedValueOnce({
      response: { status: 429, data: { message: 'Rate limit exceeded. Try again in 1 minute.' } },
    })

    renderPage()
    await screen.findByText('spam@test.com')
    fireEvent.click(screen.getByRole('button', { name: 'Ban' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Ban' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Rate limit exceeded. Try again in 1 minute.'))
    expect(document.querySelector('.status-badge')).toHaveTextContent('Active')
  })

  it('renders malformed identifiers without crashing', async () => {
    AccountApi.getAllAccountsApi.mockResolvedValue(apiPage([
      { id: null, email: 'null_id@test.com', username: 'null-user', role: 'READER', status: 'Active' },
      { id: 'not-a-real-uuid', email: 'bad_id@test.com', username: 'bad-user', role: 'READER', status: 'Active' },
    ]))

    renderPage()

    expect(await screen.findByText('null_id@test.com')).toBeInTheDocument()
    expect(screen.getByText('bad_id@test.com')).toBeInTheDocument()
  })

  it('does not expose a Ban action for Admin accounts', async () => {
    AccountApi.getAllAccountsApi.mockResolvedValue(apiPage([
      { id: 'admin-2', email: 'admin2@test.com', username: 'admin2', fullName: 'Second Admin', role: 'ADMIN', status: 'Active' },
    ]))

    renderPage()

    expect(await screen.findByText('Protected')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ban' })).not.toBeInTheDocument()
  })
})
