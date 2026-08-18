import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ModeratorDashboard from '../../../../pages/moderator/ModeratorDashboard';
import * as SubmissionApi from '../../../../services/api/SubmissionApi';
import * as ComicApi from '../../../../services/api/ComicApi';
import * as AuthorComicApi from '../../../../services/api/AuthorComicApi';
import * as ChapterApi from '../../../../services/api/ChapterApi';
import * as AccountApi from '../../../../services/api/AccountApi';
import { toast } from 'react-toastify';

// Mock contexts
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: true, user: { id: 'mod-1', role: 'MODERATOR', assignedLanguages: ['vietnamese', 'english'] } }),
  AuthProvider: ({ children }) => <>{children}</>,
}));
vi.mock('../../../../utils/Auth', () => ({
  getAuth: () => ({ user: { id: 'mod-1', role: 'MODERATOR', assignedLanguages: ['vietnamese', 'english'] } })
}));
vi.mock('../../../../context/NotificationContext', () => ({
  useNotification: () => ({ unreadCount: 0, setUnreadCount: vi.fn(), fetchNotifications: vi.fn(), notifications: [] })
}));
vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

// Mock APIs
vi.mock('../../../../services/api/SubmissionApi', () => ({
  getAllSubmissionsApi: vi.fn(),
  approveSubmissionApi: vi.fn(),
  rejectSubmissionApi: vi.fn(),
}));

vi.mock('../../../../services/api/ComicApi', () => ({
  getAllComicsApi: vi.fn(),
  getComicLeaderboardApi: vi.fn(),
  updateComicApi: vi.fn(),
  deleteComicApi: vi.fn(),
  getChaptersByComicIdApi: vi.fn(),
}));

vi.mock('../../../../services/api/AuthorComicApi', () => ({
  getAuthorComicChaptersApi: vi.fn(),
}));

vi.mock('../../../../services/api/ProjectTeamApi', () => ({
  getAllProjectTeamsApi: vi.fn(),
  createProjectTeamApi: vi.fn(),
  deleteProjectTeamApi: vi.fn(),
}));

vi.mock('../../../../services/api/GenreApi', () => ({
  getAllGenresApi: vi.fn(),
}));

vi.mock('../../../../services/api/ForumThreadApi', () => ({
  getAllForumThreadsApi: vi.fn(),
}));

vi.mock('../../../../services/api/ChatFlagApi', () => ({
  getAllChatFlagsApi: vi.fn(),
}));

vi.mock('../../../../services/api/ChapterApi', () => ({
  getChapterDetailApi: vi.fn(),
  approveChapterDirectApi: vi.fn(),
  getComicChaptersApi: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}));

const mockComics = [
  { id: 'c1', title: 'New Manga Project', language: 'English', moderationStatus: 'PUBLISHED' }
];

const mockSubmissions = [
  {
    id: 'sub-1',
    type: 'chapter',
    status: 'pending',
    title: 'New Manga Project',
    comicId: 'c1',
    chapter: 'Chapter 1',
    submittedBy: 'author1',
    timestamp: '2023-10-01T10:00:00Z',
    language: 'English',
    originalLanguage: 'English',
    targetLanguage: 'English',
    rawLanguage: 'English',
    chapterNumber: 1
  }
];

describe('Integration Test: Moderator Review Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    SubmissionApi.getAllSubmissionsApi.mockResolvedValue(mockSubmissions);
    ComicApi.getAllComicsApi.mockResolvedValue([]);
    ComicApi.getComicLeaderboardApi.mockResolvedValue({ content: [] });
    ComicApi.getChaptersByComicIdApi.mockResolvedValue([
      { id: 'chap-1', title: 'Chapter 1' }
    ]);
    AuthorComicApi.getAuthorComicChaptersApi.mockResolvedValue([
      { id: 'chap-1', title: 'Chapter 1' }
    ]);
    
    // Mock getChapterDetailApi so ReviewQueue can hydrate items successfully
    ChapterApi.getChapterDetailApi.mockResolvedValue({
      id: 'chap-1',
      title: 'Chapter 1',
      comicId: 'comic-1',
      pageImages: ['page1.jpg']
    });
    
    ChapterApi.getComicChaptersApi.mockResolvedValue([]);

    SubmissionApi.approveChapterDirectApi = vi.fn();
    SubmissionApi.approveChapterDirectApi.mockResolvedValue({ data: { success: true } });
  });

  const renderComponent = () => {
    // Initial route points directly to Review Queue
    return render(
      <MemoryRouter initialEntries={[{ pathname: '/moderator/review-queue', state: { activeNav: 'review-queue' } }]}>
        <Routes>
          <Route path="/moderator/:tab" element={<ModeratorDashboard />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('Should load pending submissions and allow moderator to approve one', async () => {
    renderComponent();

    // 1. Wait for submission to appear in the review queue table/list
    await waitFor(() => {
      expect(screen.getByText(/New Manga Project/i)).toBeInTheDocument();
    });

    // 2. Click Review Content
    const reviewBtn = await screen.findByRole('button', { name: /Review Content/i });
    fireEvent.click(reviewBtn);

    // 3. Modal opens, find the Approve All button
    const approveBtn = await screen.findByRole('button', { name: /Approve All/i });
    expect(approveBtn).toBeInTheDocument();

    // 4. Click Approve
    SubmissionApi.approveSubmissionApi.mockResolvedValue({ data: { success: true } });
    fireEvent.click(approveBtn);

    // 5. Verify the API call and success notification
    await waitFor(() => {
      expect(SubmissionApi.approveSubmissionApi).toHaveBeenCalledWith('sub-1');
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/approve/i));
    });
  });
});
