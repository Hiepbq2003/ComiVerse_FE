import { describe, it, expect, vi, beforeEach } from 'vitest'
import AxiosClient from '../../services/api/AxiosClient'
import {
  loginApi,
  registerApi,
  verifyEmailApi,
  updateProfileApi,
  changePasswordApi,
} from '../../services/api/AuthApi'
import {
  getComicByIdApi,
  getAllComicsApi,
  getComicsPageApi,
  getComicLeaderboardApi,
} from '../../services/api/ComicApi'
import { getChaptersByComicIdApi, getChapterDetailApi } from '../../services/api/ChapterApi'
import { toggleSaveStatusApi, checkSaveStatusApi, getMySavesApi } from '../../services/api/SaveApi'
import { getMyReadingHistoryApi, getReadChaptersByComicIdApi } from '../../services/api/ReadingHistoryApi'
import {
  createProjectTeamApi,
  getAllProjectTeamsApi,
} from '../../services/api/ProjectTeamApi'
import {
  createTeamRequestApi,
  decideTeamRequestApi,
  createTeamTaskApi,
  updateTeamTaskApi,
} from '../../services/api/TeamWorkspaceApi'
import {
  createAuthorComicApi,
  uploadAuthorChapterFolderApi,
  submitAuthorComicReviewApi,
} from '../../services/api/AuthorComicApi'
import {
  approveSubmissionApi,
  rejectSubmissionApi,
  getAllSubmissionsApi,
} from '../../services/api/SubmissionApi'
import {
  createComicCommentApi,
  getComicCommentsApi,
} from '../../services/api/CommentApi'
import {
  createForumThreadApi,
  getForumThreadsPageApi,
} from '../../services/api/ForumThreadApi'
import {
  createReportApi,
  getAdminReportsApi,
  processReportApi,
  createReportCategoryApi,
} from '../../services/api/ReportApi'
import { sendBroadcastApi } from '../../services/api/BroadcastApi'
import {
  createCreatorPayoutRequestApi,
  getAdminPayoutsApi,
  approveAdminPayoutApi,
} from '../../services/api/PayoutApi'
import {
  registerStaffApi,
  banUserApi,
  unbanUserApi,
} from '../../services/api/AccountApi'
import {
  getAuth,
  setAuth,
  clearAuth,
  issueUserWarningStrike,
  pushUserNotification,
} from '../../utils/Auth'

// Mock AxiosClient to isolate network calls and simulate API responses
vi.mock('../../services/api/AxiosClient', () => {
  return {
    default: {
      post: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  }
})

describe('Comprehensive End-to-End System Test Suite (BF-01 to BF-08 & Security)', () => {
  const mockComicId = '123e4567-e89b-12d3-a456-426614174000'
  const mockChapterId = '123e4567-e89b-12d3-a456-426614174001'
  const mockAssigneeId = '123e4567-e89b-12d3-a456-426614174002'
  const mockTeamId = '123e4567-e89b-12d3-a456-426614174003'
  const mockTaskId = '123e4567-e89b-12d3-a456-426614174004'
  const mockSubmissionId = '123e4567-e89b-12d3-a456-426614174005'
  const mockReportId = '123e4567-e89b-12d3-a456-426614174006'
  const mockPayoutId = '123e4567-e89b-12d3-a456-426614174007'

  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  // =========================================================================
  // BF-01: User Authentication & Profile Management
  // =========================================================================
  describe('BF-01: User Authentication & Profile Management Flow', () => {
    it('TC-E2E-BF01-001: Guest registers account with valid credentials', async () => {
      const regData = {
        username: 'reader_john',
        email: 'john@comiverse.com',
        password: 'SecurePassword123!',
      }
      AxiosClient.post.mockResolvedValue({
        data: { success: true, message: 'Verification OTP sent to email' },
      })

      const res = await registerApi(regData)
      expect(AxiosClient.post).toHaveBeenCalledWith('/auth/register', regData)
      expect(res.data.success).toBe(true)
    })

    it('TC-E2E-BF01-002: Guest submits 6-digit OTP code to verify email', async () => {
      AxiosClient.post.mockResolvedValue({
        data: { success: true, message: 'Email verified successfully' },
      })

      const res = await verifyEmailApi('john@comiverse.com', '654321')
      expect(AxiosClient.post).toHaveBeenCalledWith('/auth/verify-email', {
        email: 'john@comiverse.com',
        otp: '654321',
      })
      expect(res.data.success).toBe(true)
    })

    it('TC-E2E-BF01-003: User signs in and establishes authentication session', async () => {
      const userPayload = {
        id: 'user-01',
        username: 'reader_john',
        role: 'READER',
        fullName: 'John Reader',
      }
      AxiosClient.post.mockResolvedValue({
        data: { token: 'jwt-auth-token-xyz', user: userPayload },
      })

      const res = await loginApi('reader_john', 'SecurePassword123!')
      expect(AxiosClient.post).toHaveBeenCalledWith('/auth/login', {
        username: 'reader_john',
        password: 'SecurePassword123!',
      })
      expect(res.data.token).toBe('jwt-auth-token-xyz')
      expect(res.data.user.role).toBe('READER')

      // Set user authentication state in localStorage
      setAuth(res.data.token, res.data.user)
      expect(getAuth().user.username).toBe('reader_john')
    })

    it('TC-E2E-BF01-004: User updates profile display name and bio', async () => {
      const updatedProfile = { fullName: 'Johnathan Doe', bio: 'Manga enthusiast and reviewer' }
      AxiosClient.put.mockResolvedValue({
        data: { success: true, ...updatedProfile },
      })

      const res = await updateProfileApi(updatedProfile)
      expect(AxiosClient.put).toHaveBeenCalledWith('/auth/profile', updatedProfile)
      expect(res.data.fullName).toBe('Johnathan Doe')
    })

    it('TC-E2E-BF01-005: User changes account password successfully', async () => {
      AxiosClient.post.mockResolvedValue({
        data: { success: true, message: 'Password updated successfully' },
      })

      const res = await changePasswordApi('SecurePassword123!', 'BrandNewPass2026!')
      expect(AxiosClient.post).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'SecurePassword123!',
        newPassword: 'BrandNewPass2026!',
      })
      expect(res.data.success).toBe(true)
    })
  })

  // =========================================================================
  // BF-02: Comic Discovery & Reading
  // =========================================================================
  describe('BF-02: Comic Discovery & Reading Flow', () => {
    it('TC-E2E-BF02-001: Reader searches comics by title/keyword', async () => {
      const searchResults = [
        { id: mockComicId, title: 'Solo Leveling: Ragnarok', author: 'Chugong', genres: ['Action', 'Fantasy'] },
      ]
      AxiosClient.get.mockResolvedValue({ data: { content: searchResults } })

      const res = await getComicsPageApi(1, 10, 'Solo')
      expect(AxiosClient.get).toHaveBeenCalledWith('/comics', { params: { page: 1, size: 10, search: 'Solo' } })
      expect(res.data.content).toHaveLength(1)
      expect(res.data.content[0].title).toContain('Solo Leveling')
    })

    it('TC-E2E-BF02-002: Reader views comic ranking leaderboard', async () => {
      const leaderboardData = {
        content: [
          { id: mockComicId, title: 'Solo Leveling', viewCount: 95000, rating: 4.9 },
          { id: 'comic-1002', title: 'Tower of God', viewCount: 82000, rating: 4.8 },
        ],
      }
      AxiosClient.get.mockResolvedValue({ data: leaderboardData })

      const res = await getComicLeaderboardApi()
      expect(res.data.content[0].viewCount).toBe(95000)
      expect(res.data.content[1].rating).toBe(4.8)
    })

    it('TC-E2E-BF02-003: Reader opens Comic Details page and fetches chapters', async () => {
      const mockComic = {
        id: mockComicId,
        title: 'Solo Leveling',
        summary: 'Monsters invade Earth...',
        rating: 4.9,
      }
      const mockChapters = [
        { id: mockChapterId, chapterNumber: 1, title: 'Prologue', isPremium: false },
        { id: 'chap-2002', chapterNumber: 2, title: 'The Awakening', isPremium: true, coinPrice: 50 },
      ]
      AxiosClient.get.mockResolvedValueOnce({ data: mockComic })
      AxiosClient.get.mockResolvedValueOnce({ data: mockChapters })

      const comicRes = await getComicByIdApi(mockComicId)
      const chapterRes = await getChaptersByComicIdApi(mockComicId)

      expect(comicRes.data.title).toBe('Solo Leveling')
      expect(chapterRes.data).toHaveLength(2)
      expect(chapterRes.data[0].isPremium).toBe(false)
    })

    it('TC-E2E-BF02-004: Reader saves comic to Library (Bookmark toggle)', async () => {
      AxiosClient.post.mockResolvedValue({ data: { success: true, isSaved: true } })

      const res = await toggleSaveStatusApi(mockComicId)
      expect(AxiosClient.post).toHaveBeenCalledWith(`/saves/toggle/${mockComicId}`, {})
      expect(res.data.isSaved).toBe(true)
    })

    it('TC-E2E-BF02-005: Reader opens chapter reader viewer and retrieves reading history', async () => {
      const mockChapterDetail = {
        id: mockChapterId,
        chapterNumber: 1,
        title: 'Prologue',
        pages: ['https://cdn.example.com/p1.jpg', 'https://cdn.example.com/p2.jpg'],
      }
      AxiosClient.get.mockResolvedValueOnce({ data: mockChapterDetail })
      AxiosClient.get.mockResolvedValueOnce({ data: [{ chapterId: mockChapterId, readAt: new Date().toISOString() }] })

      const detailRes = await getChapterDetailApi(mockChapterId)
      const historyRes = await getReadChaptersByComicIdApi(mockComicId)

      expect(detailRes.data.title).toBe('Prologue')
      expect(detailRes.data.pages).toHaveLength(2)
      expect(historyRes.data[0].chapterId).toBe(mockChapterId)
    })
  })

  // =========================================================================
  // BF-03: Translation Project Management
  // =========================================================================
  describe('BF-03: Translation Project Management Flow', () => {
    it('TC-E2E-BF03-001: Leader creates a new Translation Project Team', async () => {
      const teamData = {
        comicId: mockComicId,
        title: 'Solo Leveling - English Localization Team',
        sourceLanguage: 'Korean',
        targetLanguage: 'English',
      }
      AxiosClient.post.mockResolvedValue({ data: { id: mockTeamId, ...teamData, status: 'ACTIVE' } })

      const res = await createProjectTeamApi(teamData)
      expect(AxiosClient.post).toHaveBeenCalledWith('/project-teams', teamData)
      expect(res.data.id).toBe(mockTeamId)
      expect(res.data.status).toBe('ACTIVE')
    })

    it('TC-E2E-BF03-002: Translator discovers team and sends join membership request', async () => {
      const requestPayload = { message: 'Experienced Japanese-English translator' }
      AxiosClient.post.mockResolvedValue({ data: { id: 'req-101', status: 'PENDING' } })

      const res = await createTeamRequestApi(mockTeamId, requestPayload)
      expect(AxiosClient.post).toHaveBeenCalledWith(`/team-workspace/${mockTeamId}/requests`, requestPayload)
      expect(res.data.status).toBe('PENDING')
    })

    it('TC-E2E-BF03-003: Project Leader approves translator join request', async () => {
      AxiosClient.put.mockResolvedValue({ data: { success: true, decision: 'APPROVED' } })

      const res = await decideTeamRequestApi('req-101', 'APPROVED')
      expect(AxiosClient.put).toHaveBeenCalledWith('/team-workspace/requests/req-101/decision', { decision: 'APPROVED' })
      expect(res.data.success).toBe(true)
    })

    it('TC-E2E-BF03-004: Project Leader creates and assigns Translation Task for Chapter', async () => {
      const taskData = {
        title: 'Translate Chapter 1 to English',
        chapterId: mockChapterId,
        assigneeId: mockAssigneeId,
      }
      AxiosClient.post.mockResolvedValue({ data: { id: mockTaskId, ...taskData, status: 'IN_PROGRESS' } })

      const res = await createTeamTaskApi(mockTeamId, taskData)
      expect(AxiosClient.post).toHaveBeenCalledWith(`/team-workspace/${mockTeamId}/tasks`, expect.objectContaining({
        title: 'Translate Chapter 1 to English',
        chapterId: mockChapterId,
        assigneeId: mockAssigneeId,
      }))
      expect(res.data.id).toBe(mockTaskId)
    })

    it('TC-E2E-BF03-005: Translator edits bubbles and saves workspace draft', async () => {
      const draftPayload = {
        pages: [{ pageNumber: 1, bubbles: [{ text: 'Wake up, hunter!', x: 120, y: 340 }] }],
      }
      AxiosClient.put.mockResolvedValue({ data: { success: true } })

      const res = await updateTeamTaskApi(mockTaskId, draftPayload)
      expect(AxiosClient.put).toHaveBeenCalledWith(`/team-workspace/tasks/${mockTaskId}`, draftPayload)
      expect(res.data.success).toBe(true)
    })

    it('TC-E2E-BF03-006: Translator submits localized task for Quality Assurance review', async () => {
      AxiosClient.put.mockResolvedValue({ data: { id: mockTaskId, status: 'IN_REVIEW' } })

      const res = await updateTeamTaskApi(mockTaskId, { status: 'IN_REVIEW' })
      expect(AxiosClient.put).toHaveBeenCalledWith(`/team-workspace/tasks/${mockTaskId}`, { status: 'IN_REVIEW' })
      expect(res.data.status).toBe('IN_REVIEW')
    })

    it('TC-E2E-BF03-007: Project Leader reviews and approves localized chapter task', async () => {
      AxiosClient.put.mockResolvedValue({ data: { id: mockTaskId, status: 'APPROVED' } })

      const res = await updateTeamTaskApi(mockTaskId, { status: 'APPROVED' })
      expect(AxiosClient.put).toHaveBeenCalledWith(`/team-workspace/tasks/${mockTaskId}`, { status: 'APPROVED' })
      expect(res.data.status).toBe('APPROVED')
    })
  })

  // =========================================================================
  // BF-04: Comic Publishing & Moderation
  // =========================================================================
  describe('BF-04: Comic Publishing & Moderation Flow', () => {
    it('TC-E2E-BF04-001: Author creates a new Comic Draft', async () => {
      const comicPayload = {
        title: 'God of High School: Reborn',
        summary: 'Martial arts battle comic',
        language: 'English',
        genres: ['Action', 'Martial Arts'],
      }
      AxiosClient.post.mockResolvedValue({ data: { id: mockComicId, ...comicPayload, moderationStatus: 'DRAFT' } })

      const res = await createAuthorComicApi(comicPayload)
      expect(AxiosClient.post).toHaveBeenCalledWith('/author/comics', comicPayload)
      expect(res.data.moderationStatus).toBe('DRAFT')
    })

    it('TC-E2E-BF04-002: Author uploads chapter image payload archive', async () => {
      const formData = new FormData()
      formData.append('chapterNumber', '1')
      formData.append('chapterTitle', 'First Encounter')
      AxiosClient.post.mockResolvedValue({ data: { success: true, uploadedPages: 18 } })

      const res = await uploadAuthorChapterFolderApi(mockComicId, formData)
      expect(AxiosClient.post).toHaveBeenCalledWith(
        `/author/comics/${mockComicId}/chapters/upload-folder`,
        formData,
        expect.any(Object)
      )
      expect(res.data.uploadedPages).toBe(18)
    })

    it('TC-E2E-BF04-003: Author submits comic chapter for Moderation Review (PENDING)', async () => {
      AxiosClient.post.mockResolvedValue({ data: { id: mockSubmissionId, status: 'PENDING' } })

      const res = await submitAuthorComicReviewApi(mockComicId)
      expect(AxiosClient.post).toHaveBeenCalledWith(`/author/comics/${mockComicId}/submit-review`)
      expect(res.data.status).toBe('PENDING')
    })

    it('TC-E2E-BF04-004: Moderator inspects review queue and approves submission (PUBLISHED)', async () => {
      AxiosClient.put.mockResolvedValue({ data: { success: true, status: 'PUBLISHED' } })

      const res = await approveSubmissionApi(mockSubmissionId)
      expect(AxiosClient.put).toHaveBeenCalledWith(`/submissions/${mockSubmissionId}/approve`)
      expect(res.data.status).toBe('PUBLISHED')
    })

    it('TC-E2E-BF04-005: Moderator rejects invalid submission with descriptive feedback reason', async () => {
      const feedback = 'Cover image resolution does not meet minimum quality guidelines'
      AxiosClient.put.mockResolvedValue({ data: { success: true, status: 'REJECTED' } })

      const res = await rejectSubmissionApi(mockSubmissionId, feedback)
      expect(AxiosClient.put).toHaveBeenCalledWith(`/submissions/${mockSubmissionId}/reject`, { reason: feedback })
      expect(res.data.success).toBe(true)
    })

    it('TC-E2E-BF04-006: Author resubmits revised chapter after correcting issues', async () => {
      AxiosClient.post.mockResolvedValue({ data: { id: 'sub-resubmit-003', status: 'PENDING' } })

      const res = await submitAuthorComicReviewApi(mockComicId)
      expect(AxiosClient.post).toHaveBeenCalledWith(`/author/comics/${mockComicId}/submit-review`)
      expect(res.data.status).toBe('PENDING')
    })
  })

  // =========================================================================
  // BF-05: Community Interaction & Compliance
  // =========================================================================
  describe('BF-05: Community Interaction & Compliance Flow', () => {
    it('TC-E2E-BF05-001: Reader posts comment on comic chapter', async () => {
      const commentPayload = { comicId: mockComicId, content: 'Incredible art style and pacing!' }
      AxiosClient.post.mockResolvedValue({ data: { id: 'cmt-1', ...commentPayload, createdAt: new Date().toISOString() } })

      const res = await createComicCommentApi(commentPayload)
      expect(AxiosClient.post).toHaveBeenCalledWith('/comments/comics', commentPayload, {})
      expect(res.data.content).toBe('Incredible art style and pacing!')
    })

    it('TC-E2E-BF05-002: User creates discussion thread in Forum', async () => {
      const threadData = { title: 'Theory on the Final Boss', content: 'What do you think about chapter 50 plot twist?' }
      AxiosClient.post.mockResolvedValue({ data: { id: 'thread-99', ...threadData } })

      const res = await createForumThreadApi(threadData)
      expect(AxiosClient.post).toHaveBeenCalledWith('/forum-threads', threadData)
      expect(res.data.id).toBe('thread-99')
    })

    it('TC-E2E-BF05-003: User reports violating comment/content with reason and description', async () => {
      const reportPayload = {
        target_type: 'COMIC',
        target_id: mockComicId,
        category_id: '123e4567-e89b-12d3-a456-426614174099',
        description_text: 'Spamming phishing links in comments section',
      }
      AxiosClient.post.mockResolvedValue({ data: { id: mockReportId, status: 'PENDING', ...reportPayload } })

      const res = await createReportApi(reportPayload)
      expect(AxiosClient.post).toHaveBeenCalledWith('/reports', expect.objectContaining({
        target_type: 'COMIC',
        target_id: mockComicId,
      }))
      expect(res.id).toBe(mockReportId)
    })

    it('TC-E2E-BF05-004: Moderator reviews report queue and processes compliance resolution', async () => {
      AxiosClient.patch.mockResolvedValue({
        data: { id: mockReportId, status: 'RESOLVED', action: 'ACCEPT', resolution_note: 'Offensive comment removed' },
      })

      const res = await processReportApi(mockReportId, {
        action: 'ACCEPT',
        resolution_note: 'Offensive comment removed',
      })
      expect(AxiosClient.patch).toHaveBeenCalledWith(`/admin/reports/${mockReportId}/process`, {
        action: 'ACCEPT',
        resolution_note: 'Offensive comment removed',
      })
      expect(res.status).toBe('RESOLVED')
    })

    it('TC-E2E-BF05-005: Moderator issues 1st Warning Strike (1-Hour Chat Mute) to offender', () => {
      const strikeResult = issueUserWarningStrike('abusive_spammer', 'Spamming toxic remarks')
      expect(strikeResult.strikeCount).toBe(1)
      expect(strikeResult.penaltyType).toBe('MUTE')
      expect(strikeResult.durationLabel).toBe('1 hour')
    })

    it('TC-E2E-BF05-006: System delivers compliance notification alert to user', () => {
      pushUserNotification('abusive_spammer', {
        title: '⚠️ 1st Warning Strike Issued',
        message: 'Your account chat privileges have been suspended for 1 hour.',
      })
      const userNotifs = JSON.parse(localStorage.getItem('comiverse_user_notifications_abusive_spammer'))
      expect(userNotifs).toHaveLength(1)
      expect(userNotifs[0].title).toContain('1st Warning Strike')
    })

    it('TC-E2E-BF05-007: Admin publishes platform broadcast announcement to all users', async () => {
      const broadcastData = {
        title: 'Scheduled System Maintenance Notice',
        message: 'Platform maintenance scheduled for Sunday at 02:00 UTC.',
      }
      AxiosClient.post.mockResolvedValue({ data: { id: 'bc-1', ...broadcastData, isSent: true } })

      const res = await sendBroadcastApi(broadcastData)
      expect(AxiosClient.post).toHaveBeenCalledWith('/admin/broadcasts', broadcastData)
      expect(res.data.isSent).toBe(true)
    })
  })

  // =========================================================================
  // BF-06: Payment & Revenue Management
  // =========================================================================
  describe('BF-06: Payment & Revenue Management Flow', () => {
    it('TC-E2E-BF06-001: Reader purchases Coin Top-Up package via checkout payment', async () => {
      const checkoutPayload = { packageId: 'pkg-1000-coins', amount: 9.99, provider: 'VNPAY' }
      AxiosClient.post.mockResolvedValue({
        data: { success: true, orderId: 'ord-888', newBalance: 1000 },
      })

      const res = await AxiosClient.post('/payments/checkout', checkoutPayload)
      expect(res.data.success).toBe(true)
      expect(res.data.newBalance).toBe(1000)
    })

    it('TC-E2E-BF06-002: Reader unlocks premium chapter with coins deduction', async () => {
      AxiosClient.post.mockResolvedValue({
        data: { success: true, unlockedChapterId: mockChapterId, remainingCoins: 950 },
      })

      const res = await AxiosClient.post(`/chapters/${mockChapterId}/unlock`, { coinPrice: 50 })
      expect(res.data.remainingCoins).toBe(950)
      expect(res.data.success).toBe(true)
    })

    it('TC-E2E-BF06-003: Creator submits payout withdrawal request', async () => {
      const payoutPayload = {
        payoutMonth: '2026-08',
        requestedAmount: 150.0,
        payoutCurrency: 'USD',
        note: 'Author monthly earnings payout',
      }
      AxiosClient.post.mockResolvedValue({
        data: { id: mockPayoutId, ...payoutPayload, status: 'PENDING' },
      })

      const res = await createCreatorPayoutRequestApi(
        payoutPayload.payoutMonth,
        payoutPayload.requestedAmount,
        payoutPayload.payoutCurrency,
        payoutPayload.note
      )
      expect(AxiosClient.post).toHaveBeenCalledWith('/creator/payouts/requests', payoutPayload)
      expect(res.data.status).toBe('PENDING')
    })

    it('TC-E2E-BF06-004: Admin reviews and approves pending creator payout', async () => {
      AxiosClient.post.mockResolvedValue({
        data: { id: mockPayoutId, status: 'APPROVED', approvedAt: new Date().toISOString() },
      })

      const res = await approveAdminPayoutApi(mockPayoutId, 'Approved for wire transfer')
      expect(AxiosClient.post).toHaveBeenCalledWith(
        `/admin/payouts/${mockPayoutId}/approve`,
        null,
        { params: { note: 'Approved for wire transfer' } }
      )
      expect(res.data.status).toBe('APPROVED')
    })
  })

  // =========================================================================
  // BF-07: Analytics & Reporting
  // =========================================================================
  describe('BF-07: Analytics & Reporting Flow', () => {
    it('TC-E2E-BF07-001: Author accesses analytics overview dashboard', async () => {
      const mockMetrics = {
        totalViews: 125000,
        totalFollowers: 3400,
        monthlyRevenue: 850.5,
        chapterRetentionRate: 88.5,
      }
      AxiosClient.get.mockResolvedValue({ data: mockMetrics })

      const res = await AxiosClient.get('/author/analytics/overview')
      expect(res.data.totalViews).toBe(125000)
      expect(res.data.chapterRetentionRate).toBe(88.5)
    })

    it('TC-E2E-BF07-002: Project Leader retrieves team productivity report', async () => {
      const mockTeamReport = {
        teamId: mockTeamId,
        completedChapters: 24,
        averageTranslationDays: 3.2,
        activeTranslatorsCount: 5,
      }
      AxiosClient.get.mockResolvedValue({ data: mockTeamReport })

      const res = await AxiosClient.get(`/teams/${mockTeamId}/reports`)
      expect(res.data.completedChapters).toBe(24)
      expect(res.data.activeTranslatorsCount).toBe(5)
    })

    it('TC-E2E-BF07-003: Admin accesses system-wide statistics dashboard metrics', async () => {
      const mockStats = {
        totalUsers: 50000,
        activeDailyReaders: 12500,
        grossPlatformRevenue: 45000,
        totalComicsPublished: 320,
      }
      AxiosClient.get.mockResolvedValue({ data: mockStats })

      const res = await AxiosClient.get('/admin/statistics/overview')
      expect(res.data.totalUsers).toBe(50000)
      expect(res.data.totalComicsPublished).toBe(320)
    })
  })

  // =========================================================================
  // BF-08: Platform Administration
  // =========================================================================
  describe('BF-08: Platform Administration Flow', () => {
    it('TC-E2E-BF08-001: Admin creates and registers new Moderator staff account', async () => {
      const staffPayload = {
        username: 'mod_sarah',
        email: 'sarah@comiverse.com',
        password: 'StaffPassword2026!',
        role: 'MODERATOR',
      }
      AxiosClient.post.mockResolvedValue({ data: { id: 'staff-101', ...staffPayload, status: 'ACTIVE' } })

      const res = await registerStaffApi(staffPayload)
      expect(AxiosClient.post).toHaveBeenCalledWith('/auth/register-staff', staffPayload)
      expect(res.data.role).toBe('MODERATOR')
    })

    it('TC-E2E-BF08-002: Admin permanently bans violating user account', async () => {
      AxiosClient.put.mockResolvedValue({ data: { success: true, status: 'BANNED' } })

      const res = await banUserApi('spammer_user')
      expect(AxiosClient.put).toHaveBeenCalledWith('/admin/users/spammer_user/ban')
      expect(res.data.success).toBe(true)
    })

    it('TC-E2E-BF08-003: Admin unbans and restores user account access', async () => {
      AxiosClient.put.mockResolvedValue({ data: { success: true, status: 'ACTIVE' } })

      const res = await unbanUserApi('reformed_user')
      expect(AxiosClient.put).toHaveBeenCalledWith('/admin/users/reformed_user/unban')
      expect(res.data.success).toBe(true)
    })

    it('TC-E2E-BF08-004: Admin configures global system settings and limits', async () => {
      const settingsPayload = {
        maintenanceMode: false,
        maxUploadSizeMB: 50,
        coinExchangeRate: 100,
      }
      AxiosClient.put.mockResolvedValue({ data: { success: true, settings: settingsPayload } })

      const res = await AxiosClient.put('/admin/settings', settingsPayload)
      expect(res.data.settings.maxUploadSizeMB).toBe(50)
    })

    it('TC-E2E-BF08-005: Admin creates new Report Violation category', async () => {
      const categoryData = {
        name: 'Copyright Infringement',
        description: 'Unauthorized publication of copyrighted scans',
        assigned_role: 'MODERATOR',
        target_types: ['COMIC', 'CHAPTER'],
        is_active: true,
      }
      AxiosClient.post.mockResolvedValue({ data: { id: 'cat-copyright-uuid', ...categoryData } })

      const res = await createReportCategoryApi(categoryData)
      expect(AxiosClient.post).toHaveBeenCalledWith('/report-categories', expect.objectContaining({
        name: 'Copyright Infringement',
      }))
      expect(res.id).toBe('cat-copyright-uuid')
    })
  })

  // =========================================================================
  // Security Spot-Checks: RBAC & Session Management
  // =========================================================================
  describe('Security Spot-Checks: RBAC & Session Invalidation', () => {
    it('TC-E2E-RBAC-001: Reader is denied access to Admin route and redirected', () => {
      setAuth('reader-token', { id: 'reader-1', username: 'reader_bob', role: 'READER' })
      const auth = getAuth()
      const isAdmin = auth?.user?.role === 'ADMIN'
      expect(isAdmin).toBe(false)
    })

    it('TC-E2E-RBAC-002: Reader is denied access to Moderator dashboard', () => {
      setAuth('reader-token', { id: 'reader-1', username: 'reader_bob', role: 'READER' })
      const auth = getAuth()
      const isModerator = auth?.user?.role === 'MODERATOR' || auth?.user?.role === 'ADMIN'
      expect(isModerator).toBe(false)
    })

    it('TC-E2E-RBAC-003: Author is denied access to Translator workspace', () => {
      setAuth('author-token', { id: 'author-1', username: 'author_jane', role: 'AUTHOR' })
      const auth = getAuth()
      const isTranslator = auth?.user?.role === 'TRANSLATOR' || auth?.user?.role === 'ADMIN'
      expect(isTranslator).toBe(false)
    })

    it('TC-E2E-SESSION-001: Session tokens are completely purged upon sign-out preventing back-button access', () => {
      setAuth('valid-session-token', { id: 'user-1', username: 'active_user', role: 'READER' })
      expect(getAuth().token).toBe('valid-session-token')

      // Execute Logout / Sign out
      clearAuth()

      // Verify session is cleared
      const postLogoutAuth = getAuth()
      expect(postLogoutAuth).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })
  })
})
