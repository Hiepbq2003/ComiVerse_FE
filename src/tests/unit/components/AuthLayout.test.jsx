import React from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthLayout from '../../../components/layout/AuthLayout'
import { AuthProvider } from '../../../context/AuthContext'
import { ThemeProvider } from '../../../context/ThemeContext'

function renderAuthLayout({ isWide = false } = {}) {
  return render(
    <AuthProvider>
      <ThemeProvider>
        <MemoryRouter>
          <AuthLayout isWide={isWide}>
            <div>Auth content</div>
          </AuthLayout>
        </MemoryRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}

describe('AuthLayout', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('theme', 'dark')
    document.documentElement.classList.remove('light', 'dark')
  })

  it('shows the ComiVerse logo in the wide sign-up layout', () => {
    renderAuthLayout({ isWide: true })

    const logoLink = screen.getByRole('link', { name: 'ComiVerse home' })
    expect(logoLink).toBeInTheDocument()
    expect(logoLink).not.toHaveClass('auth-topbar-logo--compact')
  })

  it('switches the shared theme from dark to light', async () => {
    renderAuthLayout()

    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('light')
      expect(localStorage.getItem('theme')).toBe('light')
    })
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument()
  })
})
