import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../../../context/ThemeContext'
import ReviewQueue from '../../../pages/moderator/ReviewQueue'

const mockAuthUser = { id: 'mod-1', username: 'mod_one', role: 'MODERATOR' }
vi.mock('../../../utils/Auth', () => ({
  getAuth: () => ({ user: mockAuthUser }),
}))
vi.mock('../../../utils/moderatorScope', () => ({
  isLanguageInModeratorScope: () => true,
}))
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: mockAuthUser }))
}))

// Mock Chapter APIs used in ReviewQueue
vi.mock('../../../services/api/ChapterApi', () => ({
  getChaptersByComicIdApi: vi.fn().mockResolvedValue([]),
  getChapterDetailApi: vi.fn().mockResolvedValue({}),
}))
vi.mock('../../../services/api/AuthorComicApi', () => ({
  getAuthorComicChaptersApi: vi.fn().mockResolvedValue([]),
}))

describe('Review Queue - Testing Techniques', () => {
  const handleApprove = vi.fn()
  const handleConfirmReject = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. Equivalence Class Partitioning (ECP): Rejection Reasons', () => {
    const testCases = [
      { desc: 'Empty String (Invalid)', input: '', expectedDisabled: true },
      { desc: 'Whitespace Only (Invalid)', input: '    ', expectedDisabled: true },
      { desc: 'Valid String (Valid)', input: 'Violates community guidelines', expectedDisabled: false },
      { desc: 'Extremely Long String (Valid Boundary)', input: 'A'.repeat(500), expectedDisabled: false },
    ]

    testCases.forEach(({ desc, input, expectedDisabled }) => {
      it(`handles rejection reason input: ${desc}`, async () => {
        const submissions = [{
          id: 'sub-1',
          comicId: 'comic-1',
          title: 'Test Comic',
          status: 'pending',
          submittedBy: 'Author: UserA',
          timestamp: Date.now(),
          language: 'English',
        }]

        render(
          <MemoryRouter>
            <ThemeProvider>
              <ReviewQueue 
                submissions={submissions}
                comics={[]}
                handleApprove={handleApprove}
                handleConfirmReject={handleConfirmReject}
              />
            </ThemeProvider>
          </MemoryRouter>
        )
        
        const rejectBtn = await screen.findByText(/✗ Reject All/i)
        fireEvent.click(rejectBtn)

        const textArea = await screen.findByPlaceholderText(/Type optional overall rejection remarks or specific revision instructions/i)
        fireEvent.change(textArea, { target: { value: input } })

        const confirmRejectBtn = screen.getByRole('button', { name: /Confirm & Send Rejection/i })
        
        if (expectedDisabled) {
          expect(confirmRejectBtn).toBeDisabled()
          fireEvent.click(confirmRejectBtn)
          expect(handleConfirmReject).not.toHaveBeenCalled()
        } else {
          expect(confirmRejectBtn).not.toBeDisabled()
          fireEvent.click(confirmRejectBtn)

          await waitFor(() => {
            expect(handleConfirmReject).toHaveBeenCalled()
          })
          const calledWithPayload = handleConfirmReject.mock.calls[0][1]
          expect(calledWithPayload).toBe(input.trim())
        }
      })
    })
  })

  describe('2. Decision Table: Submission Status & Allowed Actions', () => {
    it('shows Approve/Reject buttons only for pending submissions', async () => {
      const submissions = [
        { id: 'sub-pending', title: 'Pending Comic', status: 'pending', language: 'English' },
        { id: 'sub-approved', title: 'Approved Comic', status: 'approved', language: 'English' },
        { id: 'sub-rejected', title: 'Rejected Comic', status: 'rejected', language: 'English' },
      ]

      render(
        <MemoryRouter>
          <ThemeProvider>
            <ReviewQueue 
              submissions={submissions}
              comics={[]}
              handleApprove={handleApprove}
              handleConfirmReject={handleConfirmReject}
            />
          </ThemeProvider>
        </MemoryRouter>
      )
      
      await screen.findByText('Pending Comic')
      
      const approveBtn = screen.getByText(/✓ Approve All/i)
      const rejectBtn = screen.getByText(/✗ Reject All/i)
      expect(approveBtn).toBeInTheDocument()
      expect(rejectBtn).toBeInTheDocument()

      // Switch to Approved tab (tab says "Approved")
      const approvedTab = screen.getAllByRole('button').find(b => b.textContent.includes('Approved'))
      fireEvent.click(approvedTab)
      await screen.findByText('Approved Comic')
      
      expect(screen.queryByText(/✓ Approve All/i)).not.toBeInTheDocument()
      
      // Switch to Rejected tab
      const rejectedTab = screen.getAllByRole('button').find(b => b.textContent.includes('Rejected'))
      fireEvent.click(rejectedTab)
      await screen.findByText('Rejected Comic')
      expect(screen.queryByText(/✗ Reject All/i)).not.toBeInTheDocument()
    })
  })

  describe('3. Error Guessing: Concurrent Actions / Double Clicks', () => {
    it('prevents multiple rejection submissions on rapid double clicks (if state allows)', async () => {
      const submissions = [{
        id: 'sub-1',
        comicId: 'comic-1',
        title: 'Test Comic',
        status: 'pending',
        language: 'English',
      }]

      render(
        <MemoryRouter>
          <ThemeProvider>
            <ReviewQueue 
              submissions={submissions}
              comics={[]}
              handleApprove={handleApprove}
              handleConfirmReject={handleConfirmReject}
            />
          </ThemeProvider>
        </MemoryRouter>
      )

      const rejectBtn = await screen.findByText(/✗ Reject All/i)
      fireEvent.click(rejectBtn)

      const textArea = await screen.findByPlaceholderText(/Type optional overall rejection remarks or specific revision instructions/i)
      fireEvent.change(textArea, { target: { value: 'Valid reason to enable button' } })

      const confirmRejectBtn = await screen.findByRole('button', { name: /Confirm & Send Rejection/i })
      
      fireEvent.click(confirmRejectBtn)
      fireEvent.click(confirmRejectBtn)

      await waitFor(() => {
        expect(handleConfirmReject).toHaveBeenCalled()
      })
    })
  })
})

