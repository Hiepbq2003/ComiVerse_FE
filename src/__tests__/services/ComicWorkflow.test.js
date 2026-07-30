import { describe, it, expect, vi, beforeEach } from 'vitest';
import AxiosClient from '../../services/api/AxiosClient';
import { createAuthorComicApi, submitAuthorComicReviewApi, submitAuthorChapterReviewApi, uploadAuthorChapterZipApi } from '../../services/api/AuthorComicApi';
import { approveSubmissionApi, rejectSubmissionApi } from '../../services/api/SubmissionApi';
import { updateComicApi, getComicByIdApi, getComicLeaderboardApi } from '../../services/api/ComicApi';
import { createProjectTeamApi, updateProjectTeamApi } from '../../services/api/ProjectTeamApi';
import { createTeamRequestApi, decideTeamRequestApi, createTeamTaskApi } from '../../services/api/TeamWorkspaceApi';
import { getChaptersByComicIdApi } from '../../services/api/ChapterApi';

// Mock the AxiosClient so we don't make real network calls in a Unit Test
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

describe('Comic Complete Workflow E2E Integration Test', () => {
  const mockComicId = '123e4567-e89b-12d3-a456-426614174000';
  const mockSubmissionId = 'sub-9999-8888';
  const mockTeamId = '11111111-2222-3333-4444-555555555555';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Author: Creates a new comic draft', async () => {
    const comicData = {
      title: 'Graduation Project Demo',
      summary: 'A test comic for the demo',
      language: 'Vietnamese',
      genres: ['Action', 'Fantasy']
    };

    AxiosClient.post.mockResolvedValueOnce({ 
      data: { id: mockComicId, ...comicData, moderationStatus: 'DRAFT' } 
    });

    const response = await createAuthorComicApi(comicData);
    
    expect(AxiosClient.post).toHaveBeenCalledWith('/author/comics', comicData);
    expect(response.data.id).toBe(mockComicId);
    expect(response.data.moderationStatus).toBe('DRAFT');
  });

  it('2. Author: Submits the comic for moderation review', async () => {
    AxiosClient.post.mockResolvedValueOnce({ 
      data: { id: mockSubmissionId, status: 'PENDING' } 
    });

    const response = await submitAuthorComicReviewApi(mockComicId);

    expect(AxiosClient.post).toHaveBeenCalledWith(`/author/comics/${mockComicId}/submit-review`);
    expect(response.data.id).toBe(mockSubmissionId);
    expect(response.data.status).toBe('PENDING');
  });

  it('3. Moderator: Approves the comic submission', async () => {
    AxiosClient.put.mockResolvedValueOnce({ 
      data: { success: true, message: 'Approved' } 
    });

    const response = await approveSubmissionApi(mockSubmissionId);

    expect(AxiosClient.put).toHaveBeenCalledWith(`/submissions/${mockSubmissionId}/approve`);
    expect(response.data.success).toBe(true);
  });

  it('4. Admin (Comic Management): Edits and updates the comic information', async () => {
    const updateData = {
      title: 'Graduation Project Demo (Official)',
      publicationStatus: 'ONGOING',
      language: 'English'
    };

    AxiosClient.put.mockResolvedValueOnce({ 
      data: { id: mockComicId, ...updateData } 
    });

    const response = await updateComicApi(mockComicId, updateData);

    expect(AxiosClient.put).toHaveBeenCalledWith(
      `/comics/${mockComicId}`, 
      expect.objectContaining({
        title: 'Graduation Project Demo (Official)',
        status: 'ONGOING',
        publicationStatus: 'ONGOING'
      })
    );
    expect(response.data.title).toBe('Graduation Project Demo (Official)');
  });

  it('5. Admin / Moderator: Creates and assigns a Project Team for translation', async () => {
    const teamData = {
      comicId: mockComicId,
      title: 'Demo Translation Team',
      sourceLang: 'Vietnamese',
      targetLang: 'English',
      leaderId: 'user-leader-123'
    };

    AxiosClient.post.mockResolvedValueOnce({ 
      data: { id: mockTeamId, ...teamData } 
    });

    const response = await createProjectTeamApi(teamData);

    expect(AxiosClient.post).toHaveBeenCalledWith('/project-teams', teamData);
    expect(response.data.id).toBe(mockTeamId);
  });

  it('6. Moderator: Rejects the comic submission (Alternative Flow)', async () => {
    AxiosClient.put.mockResolvedValueOnce({ 
      data: { success: true, message: 'Rejected' } 
    });

    const rejectionReason = 'Comic does not meet our guidelines (too short).';
    const response = await rejectSubmissionApi(mockSubmissionId, rejectionReason);

    expect(AxiosClient.put).toHaveBeenCalledWith(
      `/submissions/${mockSubmissionId}/reject`, 
      { reason: rejectionReason }
    );
    expect(response.data.success).toBe(true);
  });

  it('7. Admin: Updates Project Team assignments (Alternative Flow)', async () => {
    const updatedTeamData = {
      title: 'Demo Translation Team (Updated)',
      leaderId: 'user-leader-456' // New leader
    };

    AxiosClient.put.mockResolvedValueOnce({ 
      data: { id: mockTeamId, ...updatedTeamData } 
    });

    const response = await updateProjectTeamApi(mockTeamId, updatedTeamData);

    expect(AxiosClient.put).toHaveBeenCalledWith(`/project-teams/${mockTeamId}`, updatedTeamData);
    expect(response.data.title).toBe('Demo Translation Team (Updated)');
    expect(response.data.leaderId).toBe('user-leader-456');
  });

  it('8. Scenario A: Author submits multiple chapters, Moderator approves only Chapter 1', async () => {
    const chapter1Id = 'chapter-111';
    const sub1Id = 'sub-c1';
    const sub2Id = 'sub-c2';

    // Author submits Chapter 1
    AxiosClient.post.mockResolvedValueOnce({ data: { id: sub1Id, status: 'PENDING' } });
    await submitAuthorChapterReviewApi(mockComicId, chapter1Id);
    expect(AxiosClient.post).toHaveBeenCalledWith(`/author/comics/${mockComicId}/chapters/${chapter1Id}/submit-review`);

    // Author submits Chapter 2
    AxiosClient.post.mockResolvedValueOnce({ data: { id: sub2Id, status: 'PENDING' } });
    await submitAuthorChapterReviewApi(mockComicId, 'chapter-222');
    
    // Moderator approves ONLY Chapter 1
    AxiosClient.put.mockResolvedValueOnce({ data: { success: true, message: 'Approved' } });
    const response = await approveSubmissionApi(sub1Id);
    
    expect(AxiosClient.put).toHaveBeenCalledWith(`/submissions/${sub1Id}/approve`);
    expect(response.data.success).toBe(true);
    // Chapter 2 submission stays in queue because we never called approveSubmissionApi for sub2Id.
  });

  it('9. Scenario B: Continuous Rejections & Resubmissions Loop', async () => {
    // 1. Mod rejects
    AxiosClient.put.mockResolvedValueOnce({ data: { success: true } });
    await rejectSubmissionApi(mockSubmissionId, 'Bad formatting');
    expect(AxiosClient.put).toHaveBeenCalledWith(`/submissions/${mockSubmissionId}/reject`, { reason: 'Bad formatting' });

    // 2. Author resubmits (without fixing)
    AxiosClient.post.mockResolvedValueOnce({ data: { id: 'sub-new-1', status: 'PENDING' } });
    await submitAuthorComicReviewApi(mockComicId);

    // 3. Mod rejects again (catches cheating)
    AxiosClient.put.mockResolvedValueOnce({ data: { success: true } });
    await rejectSubmissionApi('sub-new-1', 'You did not fix the formatting!');
    expect(AxiosClient.put).toHaveBeenCalledWith(`/submissions/sub-new-1/reject`, { reason: 'You did not fix the formatting!' });

    // 4. Author resubmits properly
    AxiosClient.post.mockResolvedValueOnce({ data: { id: 'sub-new-2', status: 'PENDING' } });
    await submitAuthorComicReviewApi(mockComicId);

    // 5. Mod approves
    AxiosClient.put.mockResolvedValueOnce({ data: { success: true } });
    await approveSubmissionApi('sub-new-2');
    expect(AxiosClient.put).toHaveBeenCalledWith(`/submissions/sub-new-2/approve`);
  });

  it('10. Scenario C: Translation Team & Workspace Management (Apply & Assign)', async () => {
    const requestId = 'req-123';

    // Translator applies to join the team
    const requestPayload = { message: 'I want to join!' };
    AxiosClient.post.mockResolvedValueOnce({ data: { id: requestId, ...requestPayload } });
    await createTeamRequestApi(mockTeamId, requestPayload);
    expect(AxiosClient.post).toHaveBeenCalledWith(`/team-workspace/${mockTeamId}/requests`, requestPayload);

    // Leader decides to approve
    AxiosClient.put.mockResolvedValueOnce({ data: { success: true } });
    await decideTeamRequestApi(requestId, 'APPROVED');
    expect(AxiosClient.put).toHaveBeenCalledWith(`/team-workspace/requests/${requestId}/decision`, { decision: 'APPROVED' });

    // Leader assigns task to the translator
    // Note: team task payload must have valid UUIDs for chapterId and assigneeIds if we follow TeamWorkspaceApi logic
    const validChapterId = '123e4567-e89b-12d3-a456-426614174001';
    const validAssigneeId = '123e4567-e89b-12d3-a456-426614174002';
    
    const taskData = {
      title: 'Translate Chapter 1',
      chapterId: validChapterId,
      assigneeIds: [validAssigneeId]
    };
    AxiosClient.post.mockResolvedValueOnce({ data: { id: 'task-1', ...taskData } });
    
    await createTeamTaskApi(mockTeamId, taskData);
    
    expect(AxiosClient.post).toHaveBeenCalledWith(`/team-workspace/${mockTeamId}/tasks`, expect.objectContaining({
      title: 'Translate Chapter 1',
      chapterId: validChapterId,
      assigneeIds: [validAssigneeId]
    }));
  });

  it('11. Scenario D: Full Flow & Image Integrity Check', async () => {
    // Assert that uploading a chapter properly handles FormData and headers
    const formData = new FormData();
    const fakeImage = new Blob(['fake image data'], { type: 'image/png' });
    formData.append('images', fakeImage, 'page1.png');
    formData.append('chapterTitle', 'Chapter 1: The Beginning');

    AxiosClient.post.mockResolvedValueOnce({ data: { success: true, uploadedFiles: 1 } });
    
    await uploadAuthorChapterZipApi(mockComicId, formData);
    
    expect(AxiosClient.post).toHaveBeenCalledWith(
      `/author/comics/${mockComicId}/chapters/upload-zip`,
      formData,
      expect.objectContaining({ timeout: 120000 })
    );
    // This confirms the API wrapper correctly passes the FormData structure
    // untouched to Axios, preventing "broken images" due to payload stripping.
  });

  it('12. Scenario E: Reader Access Flow (Comic details, Chapters, and Trending/Leaderboard)', async () => {
    // 1. Reader requests comic details
    AxiosClient.get.mockResolvedValueOnce({
      data: { id: mockComicId, title: 'Graduation Project Demo (Official)', status: 'ONGOING' }
    });
    const comicResponse = await getComicByIdApi(mockComicId);
    expect(AxiosClient.get).toHaveBeenCalledWith(`/comics/${mockComicId}`, expect.any(Object));
    expect(comicResponse.data.status).toBe('ONGOING');

    // 2. Reader requests list of chapters
    const mockChapters = [
      { id: 'chapter-111', title: 'Chapter 1' },
      { id: 'chapter-222', title: 'Chapter 2' }
    ];
    AxiosClient.get.mockResolvedValueOnce({ data: mockChapters });
    const chaptersResponse = await getChaptersByComicIdApi(mockComicId);
    expect(AxiosClient.get).toHaveBeenCalledWith(`/chapters/comic/${mockComicId}`, expect.any(Object));
    expect(chaptersResponse.data).toHaveLength(2);
    expect(chaptersResponse.data[0].id).toBe('chapter-111');

    // 3. System fetches Trending/Leaderboard to see if the comic is up
    const mockLeaderboard = {
      content: [
        { id: mockComicId, title: 'Graduation Project Demo (Official)', viewCount: 9999 }
      ]
    };
    AxiosClient.get.mockResolvedValueOnce({ data: mockLeaderboard });
    const leaderboardResponse = await getComicLeaderboardApi();
    expect(AxiosClient.get).toHaveBeenCalledWith('/comics/leaderboard', expect.any(Object));
    expect(leaderboardResponse.data.content[0].id).toBe(mockComicId);
  });
});
