import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthorComicDetail from '../../../../pages/author/AuthorComicDetail';
import * as AuthorComicApi from '../../../../services/api/AuthorComicApi';
import { toast } from 'react-toastify';

// Mock contexts
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: true, user: { id: 'author-1', role: 'AUTHOR' } }),
  AuthProvider: ({ children }) => <>{children}</>,
}));
vi.mock('../../../../utils/Auth', () => ({
  getAuth: () => ({ user: { id: 'author-1', role: 'AUTHOR' } })
}));
vi.mock('../../../../context/NotificationContext', () => ({
  useNotification: () => ({ unreadCount: 0, setUnreadCount: vi.fn(), fetchNotifications: vi.fn(), notifications: [] })
}));
vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

vi.mock('../../../../services/api/AuthorComicApi', () => ({
  getAuthorComicByIdApi: vi.fn(),
  getAuthorComicChaptersApi: vi.fn(),
  getAuthorComicMetricsApi: vi.fn(),
  uploadAuthorChapterZipApi: vi.fn(),
  submitAuthorComicReviewApi: vi.fn(),
  submitAuthorChapterReviewApi: vi.fn(),
  updateAuthorComicApi: vi.fn(),
  deleteAuthorComicApi: vi.fn(),
  deleteAuthorChapterApi: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

const mockComic = {
  id: 'c1',
  title: 'My Hero Academy',
  language: 'English',
  minAge: 13,
  description: 'Great hero manga.',
  genres: [{ id: 'g1', name: 'Action' }],
  moderationStatus: 'DRAFT',
  coverImageUrl: 'mock-cover.jpg'
};

const mockChapters = [
  { id: 'chap-1', chapterNumber: 1, title: 'The Beginning', moderationStatus: 'DRAFT', pages: [] }
];

const mockMetrics = {
  totalViews: 0,
  averageRating: 0,
  totalBookmarks: 0
};

describe('Integration Test: Author Chapter Upload & Submit Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthorComicApi.getAuthorComicByIdApi.mockResolvedValue(mockComic);
    AuthorComicApi.getAuthorComicChaptersApi.mockResolvedValue(mockChapters);
    AuthorComicApi.getAuthorComicMetricsApi.mockResolvedValue(mockMetrics);
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/author/comics/c1']}>
        <Routes>
          <Route path="/author/comics/:id" element={<AuthorComicDetail />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('Should successfully execute chapter upload and submit comic for review', async () => {
    renderComponent();

    // 1. Wait for comic to load
    await waitFor(() => {
      expect(screen.getAllByText('My Hero Academy').length).toBeGreaterThan(0);
    });

    // 2. Open chapter upload modal (trigger upload guide first if exists, or direct file select)
    // Wait for chapters list
    await waitFor(() => {
      expect(screen.getAllByText('The Beginning').length).toBeGreaterThan(0);
    });

    // 3. Find the Push Review button for the comic
    const submitBtn = await screen.findByRole('button', { name: /Push Review/i });
    expect(submitBtn).toBeInTheDocument();

    // 4. Click Push Review
    AuthorComicApi.submitAuthorComicReviewApi.mockResolvedValue({ message: 'Comic submitted successfully' });
    fireEvent.click(submitBtn);

    // 5. Verify API was called and success toast was shown
    await waitFor(() => {
      expect(AuthorComicApi.submitAuthorComicReviewApi).toHaveBeenCalledWith('c1');
    });
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Comic submitted for moderator review.'));
    });
  });
});
