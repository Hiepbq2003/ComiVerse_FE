import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { toast } from 'react-toastify'
import ForumModeration from '../../../../pages/moderator/ForumModeration'
import * as ForumThreadApi from '../../../../services/api/ForumThreadApi'

vi.mock('../../../../services/api/ForumThreadApi', () => ({
  getAllForumThreadsApi: vi.fn(),
  deleteForumThreadApi: vi.fn(),
  updateForumThreadApi: vi.fn(),
}))
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('Forum Moderation - Testing Techniques', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn().mockReturnValue(true) // Mock confirm to always accept
    
    // Default mock response
    ForumThreadApi.getAllForumThreadsApi.mockResolvedValue([
      { id: 't1', title: 'Normal Thread', author: 'UserA', category: 'General', isPinned: false, isLocked: false, isReported: false },
      { id: 't2', title: 'Reported Spam', author: 'Spammer', category: 'General', isPinned: false, isLocked: false, isReported: true, reportReason: 'Spam' },
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. Equivalence Class Partitioning (ECP): Search Filter', () => {
    it('shows matching threads for valid search (Valid EC)', async () => {
      render(
        <MemoryRouter>
          <ForumModeration />
        </MemoryRouter>
      )
      
      await screen.findByText('Normal Thread')
      
      const searchInput = screen.getByPlaceholderText(/Search threads/i)
      fireEvent.change(searchInput, { target: { value: 'Spam' } })
      
      expect(screen.queryByText('Normal Thread')).not.toBeInTheDocument()
      expect(screen.getByText('Reported Spam')).toBeInTheDocument()
    })

    it('shows empty state for no-match search (Invalid EC)', async () => {
      render(
        <MemoryRouter>
          <ForumModeration />
        </MemoryRouter>
      )
      
      await screen.findByText('Normal Thread')
      
      const searchInput = screen.getByPlaceholderText(/Search threads/i)
      fireEvent.change(searchInput, { target: { value: 'Nonexistent Thread 12345' } })
      
      expect(screen.queryByText('Normal Thread')).not.toBeInTheDocument()
      expect(screen.getByText('No threads found')).toBeInTheDocument()
    })
  })

  describe('2. Decision Table: Thread Status Actions', () => {
    // Actions: Pin, Lock
    it('toggles pin state correctly based on current state', async () => {
      render(
        <MemoryRouter>
          <ForumModeration />
        </MemoryRouter>
      )
      await screen.findByText('Normal Thread')
      
      // Thread is unpinned. Click Pin.
      const pinBtns = screen.getAllByTitle('Pin Thread')
      fireEvent.click(pinBtns[0])
      
      await waitFor(() => {
        expect(ForumThreadApi.updateForumThreadApi).toHaveBeenCalledWith('t1', expect.objectContaining({ isPinned: true }))
      })
      expect(toast.info).toHaveBeenCalledWith('Thread "Normal Thread" pinned!')
    })

    it('toggles lock state correctly based on current state', async () => {
      ForumThreadApi.getAllForumThreadsApi.mockResolvedValue([
        { id: 't3', title: 'Locked Thread', author: 'UserA', category: 'General', isPinned: false, isLocked: true, isReported: false },
      ])
      
      render(
        <MemoryRouter>
          <ForumModeration />
        </MemoryRouter>
      )
      await screen.findByText('Locked Thread')
      
      // Thread is locked. Click Lock (which will unlock it).
      const lockBtns = screen.getAllByTitle('Lock Thread')
      fireEvent.click(lockBtns[0])
      
      await waitFor(() => {
        expect(ForumThreadApi.updateForumThreadApi).toHaveBeenCalledWith('t3', expect.objectContaining({ isLocked: false }))
      })
      expect(toast.info).toHaveBeenCalledWith('Thread "Locked Thread" unlocked!')
    })
  })

  describe('3. Error Guessing: Concurrency / State Conflicts', () => {
    it('handles 409 Conflict when another moderator already modified the thread', async () => {
      ForumThreadApi.updateForumThreadApi.mockRejectedValue({
        response: { status: 409 }
      })
      
      render(
        <MemoryRouter>
          <ForumModeration />
        </MemoryRouter>
      )
      await screen.findByText('Normal Thread')
      
      const pinBtns = screen.getAllByTitle('Pin Thread')
      fireEvent.click(pinBtns[0]) // Attempt to pin
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Thread was already modified by another moderator.')
      })
      // Should refetch threads to get latest state
      expect(ForumThreadApi.getAllForumThreadsApi).toHaveBeenCalledTimes(2)
    })

    it('handles 409 Conflict when another moderator already deleted the thread', async () => {
      ForumThreadApi.deleteForumThreadApi.mockRejectedValue({
        response: { status: 409 }
      })
      
      render(
        <MemoryRouter>
          <ForumModeration />
        </MemoryRouter>
      )
      await screen.findByText('Normal Thread')
      
      const deleteBtns = screen.getAllByTitle('Delete Thread')
      fireEvent.click(deleteBtns[0]) // Attempt to delete
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Thread was already deleted by another moderator.')
      })
    })
  })
})
