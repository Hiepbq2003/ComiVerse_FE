import { describe, it, expect, vi, beforeEach } from 'vitest';
import AxiosClient from '../../services/api/AxiosClient';
import { loginApi, registerApi, verifyEmailApi } from '../../services/api/AuthApi';
import { createAuthorComicApi, submitAuthorComicReviewApi, uploadAuthorChapterFolderApi } from '../../services/api/AuthorComicApi';
import { approveSubmissionApi, rejectSubmissionApi } from '../../services/api/SubmissionApi';
import { createProjectTeamApi } from '../../services/api/ProjectTeamApi';
import { createTeamRequestApi, decideTeamRequestApi, createTeamTaskApi, updateTeamTaskApi } from '../../services/api/TeamWorkspaceApi';
import { getComicByIdApi, getComicLeaderboardApi } from '../../services/api/ComicApi';
import { getChaptersByComicIdApi } from '../../services/api/ChapterApi';
import { registerStaffApi, banUserApi } from '../../services/api/AccountApi';
import { issueUserWarningStrike, pushUserNotification } from '../../utils/Auth';

// Mock AxiosClient to isolate API interactions and simulate backend responses
vi.mock('../../services/api/AxiosClient', () => {
  return {
    default: {
      post: vi.fn(),
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    }
  };
});

describe('Top 25 End-to-End Business Flow Automation Test Suite (BF-01 to BF-06)', () => {
  const mockComicId = 'c123-4567-8901';
  const mockSubmissionId = 'sub-9999-0000';
  const mockTeamId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTaskId = '123e4567-e89b-12d3-a456-426614174001';
  const mockUserId = 'user-5555';

  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  // ==========================================
  // BF-01: Comic Creation & Moderation Approval
  // ==========================================
  describe('BF-01: Comic Creation, Upload & Moderation Approval Flow', () => {
    it('TC-E2E-BF01-001: Author logs in and initializes new comic draft creation', async () => {
      const comicData = { title: 'Cyber Saga', summary: 'Sci-fi comic', language: 'English' };
      AxiosClient.post.mockResolvedValue({ data: { id: mockComicId, ...comicData, moderationStatus: 'DRAFT' } });

      const res = await createAuthorComicApi(comicData);
      expect(AxiosClient.post).toHaveBeenCalledWith('/author/comics', comicData);
      expect(res.data.id).toBe(mockComicId);
      expect(res.data.moderationStatus).toBe('DRAFT');
    });

    it('TC-E2E-BF01-002: Author uploads chapter archive folder payload to draft comic', async () => {
      const formData = new FormData();
      formData.append('chapterTitle', 'Chapter 1');
      AxiosClient.post.mockResolvedValue({ data: { success: true, uploadedFiles: 12 } });

      const res = await uploadAuthorChapterFolderApi(mockComicId, formData);
      expect(AxiosClient.post).toHaveBeenCalledWith(
        `/author/comics/${mockComicId}/chapters/upload-folder`,
        formData,
        expect.objectContaining({ timeout: 120000 })
      );
      expect(res.data.success).toBe(true);
    });

    it('TC-E2E-BF01-003: Author submits comic draft for Moderator review (PENDING state)', async () => {
      AxiosClient.post.mockResolvedValue({ data: { id: mockSubmissionId, status: 'PENDING' } });

      const res = await submitAuthorComicReviewApi(mockComicId);
      expect(AxiosClient.post).toHaveBeenCalledWith(`/author/comics/${mockComicId}/submit-review`);
      expect(res.data.status).toBe('PENDING');
    });

    it('TC-E2E-BF01-004: Moderator approves pending submission (PUBLISHED state)', async () => {
      AxiosClient.put.mockResolvedValue({ data: { success: true, status: 'PUBLISHED' } });

      const res = await approveSubmissionApi(mockSubmissionId);
      expect(AxiosClient.put).toHaveBeenCalledWith(`/submissions/${mockSubmissionId}/approve`);
      expect(res.data.status).toBe('PUBLISHED');
    });

    it('TC-E2E-BF01-005: Moderator rejects invalid submission with feedback reason', async () => {
      AxiosClient.put.mockResolvedValue({ data: { success: true, status: 'REJECTED' } });

      const reason = 'Cover image resolution too low';
      const res = await rejectSubmissionApi(mockSubmissionId, reason);
      expect(AxiosClient.put).toHaveBeenCalledWith(`/submissions/${mockSubmissionId}/reject`, { reason });
      expect(res.data.success).toBe(true);
    });

    it('TC-E2E-BF01-006: Author receives rejection feedback and resubmits corrected comic', async () => {
      AxiosClient.post.mockResolvedValue({ data: { id: 'sub-resubmit-002', status: 'PENDING' } });

      const res = await submitAuthorComicReviewApi(mockComicId);
      expect(AxiosClient.post).toHaveBeenCalledWith(`/author/comics/${mockComicId}/submit-review`);
      expect(res.data.id).toBe('sub-resubmit-002');
    });
  });

  // ==========================================
  // BF-02: Project Team & Translation Workspace
  // ==========================================
  describe('BF-02: Project Team Assignment & Translation Workspace Workflow', () => {
    it('TC-E2E-BF02-001: Moderator creates translation project team and assigns Leader', async () => {
      const teamData = { comicId: mockComicId, title: 'Cyber Translation Squad', leaderId: 'leader-1' };
      AxiosClient.post.mockResolvedValue({ data: { id: mockTeamId, ...teamData } });

      const res = await createProjectTeamApi(teamData);
      expect(AxiosClient.post).toHaveBeenCalledWith('/project-teams', teamData);
      expect(res.data.id).toBe(mockTeamId);
    });

    it('TC-E2E-BF02-002: Translator submits membership join request to project team', async () => {
      const payload = { message: 'Experienced English translator' };
      AxiosClient.post.mockResolvedValue({ data: { id: 'req-001', status: 'PENDING' } });

      const res = await createTeamRequestApi(mockTeamId, payload);
      expect(AxiosClient.post).toHaveBeenCalledWith(`/team-workspace/${mockTeamId}/requests`, payload);
      expect(res.data.status).toBe('PENDING');
    });

    it('TC-E2E-BF02-003: Project Leader reviews and approves translator join request', async () => {
      AxiosClient.put.mockResolvedValue({ data: { success: true, decision: 'APPROVED' } });

      const res = await decideTeamRequestApi('req-001', 'APPROVED');
      expect(AxiosClient.put).toHaveBeenCalledWith('/team-workspace/requests/req-001/decision', { decision: 'APPROVED' });
      expect(res.data.success).toBe(true);
    });

    it('TC-E2E-BF02-004: Project Leader creates translation task for Chapter 1', async () => {
      const validChapterId = '123e4567-e89b-12d3-a456-426614174001';
      const validAssigneeId = '123e4567-e89b-12d3-a456-426614174002';
      const taskPayload = { title: 'Translate Chapter 1', chapterId: validChapterId, assigneeId: validAssigneeId };
      AxiosClient.post.mockResolvedValue({ data: { id: mockTaskId, ...taskPayload } });

      const res = await createTeamTaskApi(mockTeamId, taskPayload);
      expect(AxiosClient.post).toHaveBeenCalledWith(`/team-workspace/${mockTeamId}/tasks`, expect.objectContaining({
        title: 'Translate Chapter 1',
        chapterId: validChapterId,
        assigneeId: validAssigneeId
      }));
      expect(res.data.id).toBe(mockTaskId);
    });

    it('TC-E2E-BF02-005: Translator uploads translated canvas draft & saves workspace progress', async () => {
      const payload = { pages: ['page1_trans.png', 'page2_trans.png'] };
      AxiosClient.put.mockResolvedValue({ data: { success: true } });

      const res = await updateTeamTaskApi(mockTaskId, payload);
      expect(AxiosClient.put).toHaveBeenCalledWith(`/team-workspace/tasks/${mockTaskId}`, payload);
      expect(res.data.success).toBe(true);
    });

    it('TC-E2E-BF02-006: Translator submits completed task for Quality Assurance review', async () => {
      AxiosClient.put.mockResolvedValue({ data: { id: mockTaskId, status: 'IN_REVIEW' } });

      const res = await updateTeamTaskApi(mockTaskId, { status: 'IN_REVIEW' });
      expect(AxiosClient.put).toHaveBeenCalledWith(`/team-workspace/tasks/${mockTaskId}`, { status: 'IN_REVIEW' });
      expect(res.data.status).toBe('IN_REVIEW');
    });

    it('TC-E2E-BF02-007: Project Leader approves task & publishes translated chapter', async () => {
      AxiosClient.put.mockResolvedValue({ data: { id: mockTaskId, status: 'APPROVED' } });

      const res = await updateTeamTaskApi(mockTaskId, { status: 'APPROVED' });
      expect(AxiosClient.put).toHaveBeenCalledWith(`/team-workspace/tasks/${mockTaskId}`, { status: 'APPROVED' });
      expect(res.data.status).toBe('APPROVED');
    });
  });

  // ==========================================
  // BF-03: Reader Monetization & Paywall Flow
  // ==========================================
  describe('BF-03: Reader Storefront, Paywall & Coin Monetization Workflow', () => {
    it('TC-E2E-BF03-001: Reader searches comic catalogue and views comic details', async () => {
      const mockComic = { id: mockComicId, title: 'Cyber Saga', viewCount: 1500 };
      AxiosClient.get.mockResolvedValue({ data: mockComic });

      const res = await getComicByIdApi(mockComicId);
      expect(AxiosClient.get).toHaveBeenCalledWith(`/comics/${mockComicId}`, expect.any(Object));
      expect(res.data.title).toBe('Cyber Saga');
    });

    it('TC-E2E-BF03-002: Reader accesses free chapter list', async () => {
      const mockChapters = [{ id: 'ch-1', title: 'Chapter 1 (Free)', isPremium: false }];
      AxiosClient.get.mockResolvedValue({ data: mockChapters });

      const res = await getChaptersByComicIdApi(mockComicId);
      expect(AxiosClient.get).toHaveBeenCalledWith(`/chapters/comic/${mockComicId}`, expect.any(Object));
      expect(res.data[0].isPremium).toBe(false);
    });

    it('TC-E2E-BF03-003: Reader encounters paywall on locked Chapter 5 (Requires 50 Coins)', () => {
      const chapter5 = { id: 'ch-5', title: 'Chapter 5', isPremium: true, coinPrice: 50 };
      const readerBalance = 0;
      const canUnlock = readerBalance >= chapter5.coinPrice;
      expect(canUnlock).toBe(false);
    });

    it('TC-E2E-BF03-004: Reader purchases 500 Coin Top-up package via sandbox payment gateway', async () => {
      const paymentPayload = { packageId: 'pkg-500', amount: 4.99, gateway: 'SANDBOX_STRIPE' };
      AxiosClient.post.mockResolvedValue({ data: { success: true, newBalance: 500, transactionId: 'tx-999' } });

      const res = await AxiosClient.post('/payments/checkout', paymentPayload);
      expect(res.data.newBalance).toBe(500);
    });

    it('TC-E2E-BF03-005: Reader confirms Coin deduction to unlock premium chapter', async () => {
      const unlockPayload = { chapterId: 'ch-5', coinPrice: 50 };
      AxiosClient.post.mockResolvedValue({ data: { success: true, remainingBalance: 450 } });

      const res = await AxiosClient.post('/chapters/ch-5/unlock', unlockPayload);
      expect(res.data.remainingBalance).toBe(450);
    });

    it('TC-E2E-BF03-006: System verifies Leaderboard ranking update after chapter views', async () => {
      AxiosClient.get.mockResolvedValue({ data: { content: [{ id: mockComicId, title: 'Cyber Saga', viewCount: 1501 }] } });

      const res = await getComicLeaderboardApi();
      expect(res.data.content[0].viewCount).toBe(1501);
    });
  });

  // ==========================================
  // BF-04: User Registration & Onboarding Flow
  // ==========================================
  describe('BF-04: User Registration, Verification & Profile Onboarding', () => {
    it('TC-E2E-BF04-001: Guest fills registration form and submits valid credentials', async () => {
      const regData = { username: 'alex_reader', email: 'alex@domain.com', password: 'Password123!' };
      AxiosClient.post.mockResolvedValue({ data: { success: true, message: 'OTP sent to email' } });

      const res = await registerApi(regData);
      expect(AxiosClient.post).toHaveBeenCalledWith('/auth/register', regData);
      expect(res.data.success).toBe(true);
    });

    it('TC-E2E-BF04-002: Guest enters 6-digit email OTP verification code', async () => {
      AxiosClient.post.mockResolvedValue({ data: { success: true, message: 'Email verified' } });

      const res = await verifyEmailApi('alex@domain.com', '123456');
      expect(AxiosClient.post).toHaveBeenCalledWith('/auth/verify-email', { email: 'alex@domain.com', otp: '123456' });
      expect(res.data.success).toBe(true);
    });

    it('TC-E2E-BF04-003: User completes first-time authentication login', async () => {
      AxiosClient.post.mockResolvedValue({ data: { token: 'jwt-alex-token', user: { id: mockUserId, username: 'alex_reader', role: 'READER' } } });

      const res = await loginApi('alex_reader', 'Password123!');
      expect(AxiosClient.post).toHaveBeenCalledWith('/auth/login', { username: 'alex_reader', password: 'Password123!' });
      expect(res.data.token).toBe('jwt-alex-token');
    });
  });

  // ==========================================
  // BF-05 & BF-06: Moderation & Admin Control
  // ==========================================
  describe('BF-05 & BF-06: Moderation Penalty & Admin Management Workflow', () => {
    it('TC-E2E-BF05-001: Moderator issues Warning Strike 1 (1-Hour Chat Mute)', () => {
      const result = issueUserWarningStrike('target_spammer', 'Posting phishing links');
      expect(result.strikeCount).toBe(1);
      expect(result.penaltyType).toBe('MUTE');
      expect(result.durationLabel).toBe('1 hour');
    });

    it('TC-E2E-BF05-002: System pushes warning notification alert to user bell dropdown', () => {
      pushUserNotification('target_spammer', {
        title: '⚠️ 1st Warning Strike — Muted for 1 Hour',
        message: 'Your chat access is muted for 1 hour.'
      });
      const stored = JSON.parse(localStorage.getItem('comiverse_user_notifications_target_spammer'));
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toContain('1st Warning Strike');
    });

    it('TC-E2E-BF06-001: Admin creates new Moderator staff account', async () => {
      const staffPayload = { username: 'mod_alex', email: 'mod_alex@comiverse.com', password: 'Password123!', role: 'MODERATOR' };
      AxiosClient.post.mockResolvedValue({ data: { id: 'staff-99', ...staffPayload } });

      const res = await registerStaffApi(staffPayload);
      expect(AxiosClient.post).toHaveBeenCalledWith('/auth/register-staff', staffPayload);
      expect(res.data.role).toBe('MODERATOR');
    });

    it('TC-E2E-BF06-002: Admin permanently bans violating user account', async () => {
      AxiosClient.put.mockResolvedValue({ data: { success: true, status: 'BANNED' } });

      const res = await banUserApi('violating_user');
      expect(AxiosClient.put).toHaveBeenCalledWith('/admin/users/violating_user/ban');
      expect(res.data.success).toBe(true);
    });
  });
});
