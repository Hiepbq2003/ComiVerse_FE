import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ComicDetail from '../../../../pages/common/ComicDetail';
import { ThemeProvider } from '../../../../context/ThemeContext';
import { NotificationProvider } from '../../../../context/NotificationContext';
import { AuthProvider } from '../../../../context/AuthContext';
import * as ComicApi from '../../../../services/api/ComicApi';
import * as ChapterApi from '../../../../services/api/ChapterApi';
import * as LikeApi from '../../../../services/api/LikeApi';
import * as SaveApi from '../../../../services/api/SaveApi';
import * as ReadingHistoryApi from '../../../../services/api/ReadingHistoryApi';
import * as AuthUtils from '../../../../utils/Auth';

vi.mock('../../../../services/api/ComicApi', () => ({
  getComicByIdApi: vi.fn()
}));
vi.mock('../../../../services/api/ChapterApi', () => ({
  getChaptersByComicIdApi: vi.fn(),
  getComicTranslationLanguagesApi: vi.fn()
}));
vi.mock('../../../../services/api/LikeApi', () => ({
  checkLikeStatusApi: vi.fn(),
  toggleLikeStatusApi: vi.fn()
}));
vi.mock('../../../../services/api/SaveApi', () => ({
  checkSaveStatusApi: vi.fn(),
  toggleSaveStatusApi: vi.fn()
}));
vi.mock('../../../../services/api/ReadingHistoryApi', () => ({
  getReadChaptersByComicIdApi: vi.fn()
}));
vi.mock('../../../../utils/Auth', () => ({
  getAuth: vi.fn()
}));

const mockComic = {
  id: 'comic-123',
  title: 'Solo Leveling',
  author: 'Chugong',
  description: '10 years ago...',
  coverUrl: 'test.jpg',
  genres: ['Action', 'Fantasy'],
  views: 1000,
  rating: 4.8
};

const mockChapters = [
  { id: 'chap-1', title: 'Chapter 1', chapterNumber: 1, isPremium: false },
  { id: 'chap-2', title: 'Chapter 2', chapterNumber: 2, isPremium: true }
];

const renderComicDetail = () => {
  return render(
    <MemoryRouter initialEntries={['/comic/comic-123']}>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/comic/:id" element={<ComicDetail />} />
            </Routes>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Reader - ComicDetail Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthUtils.getAuth.mockReturnValue({ token: 'test-token', user: { id: 'u1' } });
  });

  it('should load comic data and display info', async () => {
    ComicApi.getComicByIdApi.mockResolvedValue({ data: mockComic });
    ChapterApi.getChaptersByComicIdApi.mockResolvedValue({ data: mockChapters });
    ChapterApi.getComicTranslationLanguagesApi.mockResolvedValue({ data: ['EN'] });
    LikeApi.checkLikeStatusApi.mockResolvedValue({ data: { hasLiked: false } });
    SaveApi.checkSaveStatusApi.mockResolvedValue({ data: { isSaved: false } });
    ReadingHistoryApi.getReadChaptersByComicIdApi.mockResolvedValue({ data: [] });

    renderComicDetail();

    await screen.findByText('Solo Leveling', {}, { timeout: 4000 });
    
    expect(ComicApi.getComicByIdApi).toHaveBeenCalledWith('comic-123', expect.any(Object));
    expect(screen.getAllByText('Chugong').length).toBeGreaterThan(0);
    
    // Test tabs / chapters render
    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    expect(screen.getByText('Chapter 2')).toBeInTheDocument();
  });

  it('should toggle like status', async () => {
    ComicApi.getComicByIdApi.mockResolvedValue({ data: mockComic });
    ChapterApi.getChaptersByComicIdApi.mockResolvedValue({ data: mockChapters });
    ChapterApi.getComicTranslationLanguagesApi.mockResolvedValue({ data: ['EN'] });
    ReadingHistoryApi.getReadChaptersByComicIdApi.mockResolvedValue({ data: [] });

    LikeApi.checkLikeStatusApi.mockResolvedValue({ data: { hasLiked: false } });
    SaveApi.checkSaveStatusApi.mockResolvedValue({ data: { isSaved: false } });

    LikeApi.toggleLikeStatusApi.mockResolvedValue({ data: { liked: true } });

    renderComicDetail();

    await screen.findByText('Solo Leveling', {}, { timeout: 4000 });

    const likeBtn = screen.getByRole('button', { name: /Like/i });
    expect(likeBtn).toBeInTheDocument();

    fireEvent.click(likeBtn);

    await waitFor(() => {
      expect(LikeApi.toggleLikeStatusApi).toHaveBeenCalledWith('comic-123');
    });
  });

  it('should not toggle like if unauthenticated', async () => {
    AuthUtils.getAuth.mockReturnValue(null); // Unauthenticated

    ComicApi.getComicByIdApi.mockResolvedValue({ data: mockComic });
    ChapterApi.getChaptersByComicIdApi.mockResolvedValue({ data: mockChapters });
    ChapterApi.getComicTranslationLanguagesApi.mockResolvedValue({ data: ['EN'] });
    LikeApi.checkLikeStatusApi.mockRejectedValue(new Error('Unauthorized')); // If called, but Auth checks usually skip
    SaveApi.checkSaveStatusApi.mockRejectedValue(new Error('Unauthorized'));

    renderComicDetail();

    await screen.findByText('Solo Leveling', {}, { timeout: 4000 });

    const likeBtn = screen.getByRole('button', { name: /Like/i });
    fireEvent.click(likeBtn);

    // Should not call toggleLikeStatusApi because user is not authenticated
    expect(LikeApi.toggleLikeStatusApi).not.toHaveBeenCalled();
  });
});
