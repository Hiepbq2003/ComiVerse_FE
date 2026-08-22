import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../../../context/ThemeContext'
import ProjectTeams from '../../../../pages/moderator/ProjectTeams'
import * as ProjectTeamApi from '../../../../services/api/ProjectTeamApi'
import { toast } from 'react-toastify'

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ 
    isLoggedIn: true, 
    user: { id: 'mod-1', username: 'mod_one', role: 'MODERATOR' }, 
    logout: vi.fn() 
  })),
  getAuth: vi.fn(() => ({ 
    user: { id: 'mod-1', username: 'mod_one', role: 'MODERATOR' }
  }))
}))

vi.mock('../../../../services/api/ProjectTeamApi', () => ({
  updateProjectTeamApi: vi.fn(),
  getTranslatorsApi: vi.fn(() => Promise.resolve({ data: [] }))
}))

vi.mock('../../../../services/api/AccountApi', () => ({
  searchProjectLeadersApi: vi.fn(() => Promise.resolve([{ id: 'trans1', username: 'trans_user', fullName: 'Translator User', initials: 'TU' }]))
}))

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}))

describe('Moderator - Notifications & Forwarding Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  it('Sends proper notification when assigning/forwarding a team leader', async () => {
    const mockTeams = [{
      id: 'team1',
      title: 'Action Comics',
      comicName: 'Action Comics',
      sourceLang: 'Japanese',
      targetLang: 'English',
      members: 0,
      leaderId: null
    }]

    ProjectTeamApi.updateProjectTeamApi.mockResolvedValueOnce({ data: { success: true } })

    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')

    render(
      <MemoryRouter>
        <ThemeProvider>
          <ProjectTeams 
            projectTeams={mockTeams} 
            setProjectTeams={vi.fn()} 
            createTeamForm={{ comicName: '', title: '', targetLang: '', sourceLang: '' }}
            setCreateTeamForm={vi.fn()}
          />
        </ThemeProvider>
      </MemoryRouter>
    )

    // Wait for teams to render
    await screen.findAllByText('Action Comics')

    // Click Assign Leader
    const assignBtn = screen.getByRole('button', { name: /Leader/i })
    fireEvent.click(assignBtn)

    // Search for translator
    const searchInput = await screen.findByPlaceholderText(/Type Project Leader/i)
    fireEvent.change(searchInput, { target: { value: 'trans1' } })

    // Wait for results
    // We mock the translator name as "Translator User"
    const selectBtn = await screen.findByText('Translator User')
    
    // Confirm assignment
    fireEvent.click(selectBtn)

    await waitFor(() => {
      expect(ProjectTeamApi.updateProjectTeamApi).toHaveBeenCalledWith('team1', expect.any(Object))
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Translator User assigned as Group Leader!')
    })

    // Verify localStorage notification was set
    const notifKey = 'comiverse_user_notifications_trans1'
    const notifRaw = localStorage.getItem(notifKey)
    expect(notifRaw).toBeTruthy()
    
    const notifs = JSON.parse(notifRaw)
    expect(notifs).toHaveLength(1)
    expect(notifs[0].message).toContain('Action Comics')
    expect(notifs[0].message).toContain('Japanese')
    expect(notifs[0].message).toContain('English')

    // Verify dispatchEvent was called
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'notification:refresh' }))
  })
})
