import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../../../context/ThemeContext'
import ReviewQueue from '../../../../pages/moderator/ReviewQueue'

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ 
    isLoggedIn: true, 
    user: { id: 'mod-1', username: 'mod_one', role: 'MODERATOR', assignedLanguages: ['Japanese'] }, 
    logout: vi.fn() 
  }))
}))

vi.mock('../../../../context/NotificationContext', () => ({
  useNotification: vi.fn(() => ({ notifications: [], unreadCount: 0, fetchNotifications: vi.fn(), markAsRead: vi.fn() }))
}))

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() }
}))

// Decision Table:
// Conditions:
// C1: Comic Submission Status is 'pending'
// C2: Comic Submission Status is 'approved'
// C3: Comic Submission Status is 'rejected'
// Actions:
// A1: Show Approve Button
// A2: Show Reject Button

describe('Moderator Decision Table - Review Queue UI', () => {
  const renderQueue = (submissions) => {
    return render(
      <MemoryRouter>
        <ThemeProvider>
          <ReviewQueue submissions={submissions} />
        </ThemeProvider>
      </MemoryRouter>
    )
  }

  it('DT Rule 1: Pending Submission -> Shows Approve/Reject buttons', async () => {
    const submissions = [{
      id: 'sub1',
      title: 'Pending Comic',
      status: 'pending',
      language: 'Japanese',
      submittedBy: 'author1',
      timestamp: new Date().toISOString()
    }]
    
    renderQueue(submissions)
    
    await screen.findByText('Pending Comic')
    
    // Actions A1 & A2 should be True
    expect(screen.getByRole('button', { name: /Approve All/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reject All/i })).toBeInTheDocument()
  })

  it('DT Rule 2: Approved Submission -> Hides Approve/Reject buttons', async () => {
    const submissions = [{
      id: 'sub2',
      title: 'Approved Comic',
      status: 'approved',
      language: 'Japanese',
      submittedBy: 'author1',
      timestamp: new Date().toISOString()
    }]
    
    renderQueue(submissions)
    
    // Switch to Approved tab
    const approvedTab = screen.getByRole('button', { name: /Approved/i })
    fireEvent.click(approvedTab)
    
    await screen.findByText('Approved Comic')
    
    // Actions A1 & A2 should be False
    expect(screen.queryByRole('button', { name: /Approve All/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reject All/i })).not.toBeInTheDocument()
  })

  it('DT Rule 3: Rejected Submission -> Hides Approve/Reject buttons', async () => {
    const submissions = [{
      id: 'sub3',
      title: 'Rejected Comic',
      status: 'rejected',
      language: 'Japanese',
      submittedBy: 'author1',
      timestamp: new Date().toISOString()
    }]
    
    renderQueue(submissions)
    
    // Switch to Rejected tab
    const rejectedTab = screen.getByRole('button', { name: /Rejected/i })
    fireEvent.click(rejectedTab)
    
    await screen.findByText('Rejected Comic')
    
    // Actions A1 & A2 should be False
    expect(screen.queryByRole('button', { name: /Approve All/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reject All/i })).not.toBeInTheDocument()
  })
})
