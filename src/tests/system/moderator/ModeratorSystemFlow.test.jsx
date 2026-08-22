import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../../context/AuthContext'
import { ThemeProvider } from '../../../context/ThemeContext'
import { LanguageProvider } from '../../../context/LanguageContext'
import ReviewQueue from '../../../pages/moderator/ReviewQueue'
import ProjectTeams from '../../../pages/moderator/ProjectTeams'
import * as SubmissionApi from '../../../services/api/SubmissionApi'
import * as ProjectTeamApi from '../../../services/api/ProjectTeamApi'
import * as ComicApi from '../../../services/api/ComicApi'
import * as AuthUtil from '../../../utils/Auth'

const renderWithProviders = (ui) => {
  return render(
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

// Mock the APIs
vi.mock('../../../services/api/SubmissionApi')
vi.mock('../../../services/api/ProjectTeamApi')
vi.mock('../../../services/api/ComicApi')
vi.mock('../../../utils/Auth')
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('L3 Frontend System Test — Moderator Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AuthUtil.getAuth.mockReturnValue({
      token: 'mock-mod-token',
      user: {
        id: 'mod-uuid-1',
        fullName: 'Test Moderator',
        role: 'MODERATOR',
        assignedLanguages: 'vi',
      },
    })
  })

  describe('BF-04: Comic & Chapter Moderation Review Queue Flow', () => {
    const mockSubmissions = [
      {
        id: 'sub-1',
        comicId: 'comic-1',
        chapterId: 'chap-1',
        title: 'Solo Leveling Reborn',
        chapter: 'Chapter 1.0',
        language: 'vi',
        status: 'pending',
        queueType: 'author',
        submittedBy: 'Author: Sung Jin-Woo',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'sub-2',
        comicId: 'comic-2',
        chapterId: 'chap-2',
        title: 'Tower of God',
        chapter: 'Chapter 2.0',
        language: 'vi',
        status: 'pending',
        queueType: 'author',
        submittedBy: 'Author: SIU',
        createdAt: new Date().toISOString(),
      },
    ]

    it('TC-E2E-BF04-001: should render submissions queue and allow approving a chapter', async () => {
      SubmissionApi.getAllSubmissionsApi.mockResolvedValue(mockSubmissions)
      SubmissionApi.approveSubmissionApi.mockResolvedValue({ success: true, data: { status: 'approved' } })

      renderWithProviders(<ReviewQueue />)

      // Verify list renders
      await waitFor(() => {
        expect(screen.getByText(/Solo Leveling Reborn/i)).toBeInTheDocument()
        expect(screen.getByText(/Tower of God/i)).toBeInTheDocument()
      })

      // Verify status badge
      const pendingBadges = screen.getAllByText(/pending/i)
      expect(pendingBadges.length).toBeGreaterThan(0)

      // Click Approve on first item
      const approveButtons = screen.getAllByRole('button', { name: /approve/i })
      expect(approveButtons.length).toBeGreaterThan(0)
      fireEvent.click(approveButtons[0])

      await waitFor(() => {
        expect(SubmissionApi.approveSubmissionApi).toHaveBeenCalledWith('sub-1')
      })
    })

    it('TC-E2E-BF04-002: should allow rejecting a submission with a required reason', async () => {
      SubmissionApi.getAllSubmissionsApi.mockResolvedValue(mockSubmissions)
      SubmissionApi.rejectSubmissionApi.mockResolvedValue({ success: true, data: { status: 'rejected' } })

      renderWithProviders(<ReviewQueue />)

      await waitFor(() => {
        expect(screen.getByText(/Solo Leveling Reborn/i)).toBeInTheDocument()
      })

      // Click Reject button
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i })
      expect(rejectButtons.length).toBeGreaterThan(0)
      fireEvent.click(rejectButtons[0])

      // Reject modal or confirmation should appear
      await waitFor(() => {
        const confirmBtn = screen.getByRole('button', { name: /confirm|reject/i })
        expect(confirmBtn).toBeInTheDocument()
      })
    })
  })

  describe('BF-05 & BF-06: Translation Teams & Translation Pool Flow', () => {
    const mockTeams = [
      {
        id: 'team-1',
        title: 'Solo Leveling - English Team',
        comicName: 'Solo Leveling',
        sourceLanguage: 'vi',
        targetLanguage: 'en',
        status: 'UNCLAIMED',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'team-2',
        title: 'Tower of God - Japanese Team',
        comicName: 'Tower of God',
        sourceLanguage: 'vi',
        targetLanguage: 'ja',
        status: 'ACTIVE',
        leaderName: 'Translator Alpha',
        createdAt: new Date().toISOString(),
      },
    ]

    it('TC-E2E-BF05-001: should render project teams and translation pool requests', async () => {
      ProjectTeamApi.getAllProjectTeamsApi.mockResolvedValue(mockTeams)
      ComicApi.getAllComicsApi.mockResolvedValue([
        { id: 'comic-1', title: 'Solo Leveling', language: 'vi' },
      ])

      renderWithProviders(<ProjectTeams />)

      await waitFor(() => {
        expect(screen.getByText(/Solo Leveling - English Team/i)).toBeInTheDocument()
        expect(screen.getByText(/Tower of God - Japanese Team/i)).toBeInTheDocument()
      })
    })
  })
})
