import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Login from '../../../pages/common/Login'

// Mock the AuthContext
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}))

// Mock the API calls
vi.mock('../../../services/api/AuthApi', () => ({
  loginApi: vi.fn(),
  getMeApi: vi.fn(),
}))

describe('Login Component Unit Tests', () => {
  it('renders username and password fields and sign in button', () => {
    render(
      <Login 
        onNavigate={vi.fn()}
        onVerificationRequired={vi.fn()}
        onLoginSuccess={vi.fn()}
        showAlert={vi.fn()}
        loading={false}
        setLoading={vi.fn()}
      />
    )

    expect(screen.getByPlaceholderText('Enter username or email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('displays validation errors if username or password is not provided', async () => {
    render(
      <Login 
        onNavigate={vi.fn()}
        onVerificationRequired={vi.fn()}
        onLoginSuccess={vi.fn()}
        showAlert={vi.fn()}
        loading={false}
        setLoading={vi.fn()}
      />
    )

    const signInButton = screen.getByRole('button', { name: /Sign In/i })
    fireEvent.click(signInButton)

    expect(await screen.findByText('Email or username is required.')).toBeInTheDocument()
    expect(await screen.findByText('Password is required.')).toBeInTheDocument()
  })
})
