import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminLayout from '../../../components/layout/AdminLayout'

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  toggleTheme: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}))

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      fullName: 'System Administrator',
      avatarUrl: 'https://cdn.example.com/admin.jpg',
    },
    isLoggedIn: true,
    logout: mocks.logout,
  }),
}))

vi.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: mocks.toggleTheme }),
}))

vi.mock('../../../context/NotificationContext', () => ({
  useNotification: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: mocks.markAsRead,
    markAllAsRead: mocks.markAllAsRead,
  }),
}))

vi.mock('../../../components/common/AIPopover', () => ({
  AIPopover: () => <button type="button" aria-label="Notifications" />,
}))

vi.mock('../../../components/common/LogoIcon', () => ({
  default: () => <span>ComiVerse</span>,
}))

const renderLayout = () => render(
  <MemoryRouter initialEntries={['/admin/statistics']}>
    <AdminLayout activeNav="statistics"><div>Admin content</div></AdminLayout>
  </MemoryRouter>,
)

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the authenticated Admin avatar in the portal topbar', () => {
    const { container } = renderLayout()

    const avatar = container.querySelector('.admin-topbar-avatar img')
    expect(avatar).toHaveAttribute('src', 'https://cdn.example.com/admin.jpg')
    expect(screen.getByText('System Administrator')).toBeInTheDocument()
  })

  it('requires confirmation and does not dismiss when the backdrop is clicked', () => {
    renderLayout()

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    const dialog = screen.getByRole('dialog')
    expect(mocks.logout).not.toHaveBeenCalled()

    fireEvent.click(dialog)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mocks.logout).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }))
    expect(mocks.logout).toHaveBeenCalledOnce()
  })
})
