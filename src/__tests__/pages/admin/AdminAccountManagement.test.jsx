import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../../context/ThemeContext'
import AccountManagement from '../../../pages/admin/AccountManagement'
import * as AccountApi from '../../../services/api/AccountApi'
import { toast } from 'react-toastify'

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ 
    isLoggedIn: true, 
    user: { id: 'admin-1', username: 'admin', role: 'ADMIN' }, 
    logout: vi.fn() 
  })),
  getAuth: vi.fn(() => ({ 
    user: { id: 'admin-1', username: 'admin', role: 'ADMIN' }
  }))
}))

vi.mock('../../../services/api/AccountApi', () => ({
  getAllAccountsApi: vi.fn(() => Promise.resolve({ data: [] })),
  registerStaffApi: vi.fn(),
  updateAccountRoleApi: vi.fn(),
  banUserApi: vi.fn(),
  unbanUserApi: vi.fn(),
  resetUserPasswordApi: vi.fn(),
  updateUserApi: vi.fn()
}))

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}))

vi.mock('../../../context/NotificationContext', () => ({
  useNotification: vi.fn(() => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    fetchNotifications: vi.fn()
  }))
}))

describe('Admin - Account Management Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    AccountApi.getAllAccountsApi.mockResolvedValue({
      data: [{ id: 'user1', username: 'testuser', email: 'test@example.com', role: 'READER', isBanned: false, createdAt: new Date().toISOString() }]
    })
  })

  it('Boundary & Equivalence Testing: Staff Creation Form Validation', async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AccountManagement />
        </ThemeProvider>
      </MemoryRouter>
    )

    // Wait for data load
    await screen.findByText('testuser')

    // Click + Create User Account
    const addStaffBtn = screen.getByRole('button', { name: /\+ Create User Account/i })
    fireEvent.click(addStaffBtn)

    // Wait for modal
    const modalTitle = await screen.findByText('Create User Account')
    expect(modalTitle).toBeTruthy()

    // 1. Boundary / Equivalence: Submit empty form (should show errors)
    const createBtn = screen.getByRole('button', { name: /^Create Account$/i })
    fireEvent.click(createBtn)

    // It should set form errors for username, email, password
    await screen.findByText('Username is required')
    await screen.findByText('Password is required')

    // 2. Boundary: Password too short (equivalence class: invalid length)
    const usernameInput = screen.getByPlaceholderText(/Enter username/i)
    const fullNameInput = screen.getByPlaceholderText(/Enter full name/i)
    const emailInput = screen.getByPlaceholderText(/staff@comiverse.com/i)
    const passwordInput = screen.getByPlaceholderText(/Min. 6 characters/i)

    fireEvent.change(usernameInput, { target: { value: 'newstaff' } })
    fireEvent.change(fullNameInput, { target: { value: 'New Staff Name' } })
    fireEvent.change(emailInput, { target: { value: 'staff@example.com' } })
    fireEvent.change(passwordInput, { target: { value: '123' } }) // Too short

    fireEvent.click(createBtn)

    // Still should show password error
    await screen.findByText('At least 6 characters')
    expect(AccountApi.registerStaffApi).not.toHaveBeenCalled()

    // 3. Equivalence: Valid form (should call API)
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123' } })
    
    AccountApi.registerStaffApi.mockResolvedValueOnce({ data: { success: true } })

    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(AccountApi.registerStaffApi).toHaveBeenCalledWith(expect.objectContaining({
        username: 'newstaff',
        email: 'staff@example.com',
        password: 'ValidPass123'
      }))
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Account "New Staff Name" created successfully!')
    })
  })
})
