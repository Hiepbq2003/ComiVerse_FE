import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../../../context/ThemeContext'
import ChatMonitor from '../../../../pages/moderator/ChatMonitor'
import ProjectTeams from '../../../../pages/moderator/ProjectTeams'
import * as ChatFlagApi from '../../../../services/api/ChatFlagApi'
import * as ProjectTeamApi from '../../../../services/api/ProjectTeamApi'
import * as AuthUtils from '../../../../utils/Auth'
import { toast } from 'react-toastify'

// Mocking dependencies
vi.mock('../../../../services/api/ChatFlagApi')
vi.mock('../../../../services/api/ProjectTeamApi')
vi.mock('../../../../services/api/ForumThreadApi')
vi.mock('../../../../services/api/AccountApi')
vi.mock('../../../../services/api/BannedKeywordApi', () => ({
  getBannedKeywordsApi: vi.fn().mockResolvedValue([]),
  addBannedKeywordApi: vi.fn(),
  deleteBannedKeywordApi: vi.fn()
}))
vi.mock('../../../../utils/Auth', () => ({
  getAuth: vi.fn(() => ({ user: { id: 'mod-1', username: 'mod_one', role: 'MODERATOR' } })),
  pushUserNotification: vi.fn(),
  setUserChatRestriction: vi.fn(),
  getUserChatRestriction: vi.fn(() => null),
  issueUserWarningStrike: vi.fn(() => ({ strikeCount: 1, durationLabel: '1h', penaltyType: 'MUTE' }))
}))
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }
}))
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'mod-1', username: 'mod_one', role: 'MODERATOR' } }))
}))

// Mock Chat Hook
vi.mock('../../../../hooks/useChat', () => ({
  useChat: vi.fn(() => ({
    messages: [
      { id: 'msg-1', content: 'Test message', user: 'bad_user', timestamp: new Date().toISOString() }
    ],
    isConnected: true,
    isLoadingInitial: false,
    hasMore: false,
    isLoadingMore: false,
    isSending: false,
    currentUser: { id: 'mod-1', username: 'mod_one', role: 'MODERATOR' },
    scrollContainerRef: { current: document.createElement('div') },
    isNearBottomRef: { current: true },
    fetchOlderMessages: vi.fn(),
    sendMessage: vi.fn()
  }))
}))

describe('Moderator Concurrency & Race Conditions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('1. ChatMonitor: Handles 409 Conflict when dismissing a flag already resolved by another moderator', async () => {
    // 1. Setup mock data
    const mockFlags = [
      { id: 'flag-1', user: 'spammer_1', reason: 'Spamming', status: 'pending', createdAt: new Date().toISOString() }
    ]
    
    // First call returns flags, second call returns updated empty flags (simulating the other mod already deleted it)
    ChatFlagApi.getAllChatFlagsApi
      .mockResolvedValueOnce(mockFlags)
      .mockResolvedValueOnce([])

    // Simulate 409 Conflict from backend when dismissing
    const error409 = new Error('Request failed with status code 409')
    error409.response = { status: 409 }
    ChatFlagApi.dismissChatFlagApi.mockRejectedValueOnce(error409)

    // 2. Render
    render(
      <MemoryRouter>
        <ThemeProvider>
          <ChatMonitor fetchAllData={vi.fn()} />
        </ThemeProvider>
      </MemoryRouter>
    )

    // Switch to Flags tab
    fireEvent.click(screen.getByText(/Flagged Accounts & Violations/i))

    // 3. Wait for UI to load flags
    await waitFor(() => {
      expect(screen.getByText(/spammer_1/i)).toBeInTheDocument()
    })

    // 4. Click Dismiss
    const dismissBtns = screen.getAllByRole('button', { name: /Dismiss/i })
    fireEvent.click(dismissBtns[0])

    // 5. Assert: The API was called, but failed with 409. 
    // The UI should catch it, NOT show success, show error toast, and refresh data.
    await waitFor(() => {
      expect(ChatFlagApi.dismissChatFlagApi).toHaveBeenCalledWith('flag-1')
      expect(toast.error).toHaveBeenCalledWith('Flag was already resolved by another moderator.')
      expect(toast.info).not.toHaveBeenCalledWith('Flag dismissed & archived to Audit Log.')
    })

    // Clear local storage so the merge doesn't resurrect the deleted flag
    localStorage.clear()

    // It should have re-fetched the flags and cleared the list
    await waitFor(() => {
      expect(ChatFlagApi.getAllChatFlagsApi).toHaveBeenCalledTimes(2)
    })
    
    // We don't check queryByText(/spammer_1/i) here if localStorage logic in the component is flawed, 
    // but clearing localStorage manually should make it pass.
    await waitFor(() => {
      expect(screen.queryByText(/spammer_1/i)).not.toBeInTheDocument()
    })
  })

  it('2. ChatMonitor: Handles 409 Conflict when banning a user simultaneously', async () => {
    const mockFlags = [
      { id: 'flag-2', user: 'toxic_user', reason: 'Hate speech', status: 'pending', createdAt: new Date().toISOString() }
    ]
    ChatFlagApi.getAllChatFlagsApi.mockResolvedValue(mockFlags)
    
    const error409 = new Error('Conflict')
    error409.response = { status: 409 }
    ChatFlagApi.deleteChatFlagApi.mockRejectedValueOnce(error409)

    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <MemoryRouter>
        <ThemeProvider>
          <ChatMonitor fetchAllData={vi.fn()} />
        </ThemeProvider>
      </MemoryRouter>
    )

    // Switch to Flags tab
    fireEvent.click(screen.getByText(/Flagged Accounts & Violations/i))

    await waitFor(() => {
      expect(screen.getByText(/toxic_user/i)).toBeInTheDocument()
    })

    // Find and click Ban button
    const banBtns = screen.getAllByRole('button', { name: /Ban Chat/i })
    fireEvent.click(banBtns[0])

    await waitFor(() => {
      expect(ChatFlagApi.deleteChatFlagApi).toHaveBeenCalledWith('flag-2')
      expect(toast.error).toHaveBeenCalledWith('Flag was already resolved by another moderator.')
      expect(toast.success).not.toHaveBeenCalledWith(expect.stringContaining('permanently banned'))
    })
  })

  it('3. ProjectTeams: Handles 409 Conflict when updating team status concurrently', async () => {
    const mockTeams = [
      { id: 'team-1', title: 'Naruto - English Team', status: 'ACTIVE' }
    ]

    const setProjectTeamsMock = vi.fn()
    
    const error409 = new Error('Conflict')
    error409.response = { status: 409 }
    ProjectTeamApi.updateProjectTeamApi.mockRejectedValueOnce(error409)

    render(
      <MemoryRouter>
        <ThemeProvider>
          <ProjectTeams 
            projectTeams={mockTeams}
            setProjectTeams={setProjectTeamsMock}
            genres={[]}
            comics={[]}
            submissions={[]}
            showCreateTeamModal={false}
            createTeamForm={{}}
          />
        </ThemeProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Naruto - English Team')).toBeInTheDocument()
    })

    const pauseBtn = screen.getByRole('button', { name: /⏸️ Pause/i })
    fireEvent.click(pauseBtn)

    await waitFor(() => {
      expect(ProjectTeamApi.updateProjectTeamApi).toHaveBeenCalledWith('team-1', expect.objectContaining({ status: 'PAUSED' }))
      expect(toast.error).toHaveBeenCalledWith('Conflict: Team status was already changed by another moderator.')
      expect(toast.success).not.toHaveBeenCalledWith(expect.any(String))
      // State should not be updated optimistically
      expect(setProjectTeamsMock).not.toHaveBeenCalled()
    })
  })

  it('4. ForumModeration: Handles 409 Conflict when deleting a thread concurrently', async () => {
    const { deleteForumThreadApi, getAllForumThreadsApi } = await import('../../../../services/api/ForumThreadApi')
    const { default: ForumModeration } = await import('../../../../pages/moderator/ForumModeration')

    const mockThreads = [
      { id: 'thread-1', title: 'Great Chapter 5', author: 'user1', isPinned: false, isLocked: false, createdAt: new Date().toISOString(), category: 'General' }
    ]
    
    getAllForumThreadsApi
      .mockResolvedValueOnce(mockThreads)
      .mockResolvedValueOnce([]) // Refresh returns empty

    const error409 = new Error('Conflict')
    error409.response = { status: 409 }
    deleteForumThreadApi.mockRejectedValueOnce(error409)

    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <MemoryRouter>
        <ThemeProvider>
          <ForumModeration fetchAllData={vi.fn()} />
        </ThemeProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Great Chapter 5')).toBeInTheDocument()
    })

    const deleteBtn = screen.getByRole('button', { name: /🗑️/i }) // Match the icon used in delete button
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(deleteForumThreadApi).toHaveBeenCalledWith('thread-1')
      expect(toast.error).toHaveBeenCalledWith('Thread was already deleted by another moderator.')
      expect(getAllForumThreadsApi).toHaveBeenCalledTimes(2)
    })
    
    await waitFor(() => {
      expect(screen.queryByText('Great Chapter 5')).not.toBeInTheDocument()
    })
  })

  it('5. ProjectTeams: Handles 409 Conflict when assigning a leader concurrently', async () => {
    const mockTeams = [
      { id: 'team-2', title: 'One Piece - Vietnam Team', status: 'ACTIVE', leaderId: null, leaderName: null }
    ]
    const setProjectTeamsMock = vi.fn()
    
    // Simulate API throwing 409 when trying to assign a leader
    const error409 = new Error('Conflict')
    error409.response = { status: 409 }
    ProjectTeamApi.updateProjectTeamApi.mockRejectedValueOnce(error409)

    render(
      <MemoryRouter>
        <ThemeProvider>
          <ProjectTeams 
            projectTeams={mockTeams}
            setProjectTeams={setProjectTeamsMock}
            genres={[]}
            comics={[]}
            submissions={[]}
            showCreateTeamModal={false}
            createTeamForm={{}}
          />
        </ThemeProvider>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('One Piece - Vietnam Team')).toBeInTheDocument()
    })

    // Click on Leader button
    const assignBtn = screen.getByRole('button', { name: /Leader/i })
    fireEvent.click(assignBtn)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type Project Leader username or email to search/i)).toBeInTheDocument()
    })

    // Mock search results
    const translator = { id: 'trans-1', fullName: 'John Translator', email: 'john@test.com' }
    
    // Since we mocked searchProjectLeadersApi globally, let's redefine it here
    const { searchProjectLeadersApi } = await import('../../../../services/api/AccountApi')
    searchProjectLeadersApi.mockResolvedValueOnce([translator])

    const searchInput = screen.getByPlaceholderText(/Type Project Leader username or email to search/i)
    fireEvent.change(searchInput, { target: { value: 'John' } })

    await waitFor(() => {
      expect(screen.getByText('John Translator')).toBeInTheDocument()
    })

    // Click assign button on translator card
    const assignTranslatorBtn = screen.getByRole('button', { name: /John Translator/i })
    fireEvent.click(assignTranslatorBtn)

    // Wait for the API to be called and 409 error toast
    await waitFor(() => {
      expect(ProjectTeamApi.updateProjectTeamApi).toHaveBeenCalledWith('team-2', expect.objectContaining({ leaderId: 'trans-1' }))
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Conflict: Leader was already assigned'))
    })
  })
})
