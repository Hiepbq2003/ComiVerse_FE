import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ChapterDetail from '../../../../pages/common/ChapterDetail';
import { ThemeProvider } from '../../../../context/ThemeContext';
import { NotificationProvider } from '../../../../context/NotificationContext';
import { AuthProvider } from '../../../../context/AuthContext';
import * as ComicApi from '../../../../services/api/ComicApi';
import * as ChapterApi from '../../../../services/api/ChapterApi';
import * as AuthUtils from '../../../../utils/Auth';

vi.mock('../../../../services/api/ComicApi', () => ({
  getComicByIdApi: vi.fn()
}));
vi.mock('../../../../services/api/ChapterApi', () => ({
  getChaptersByComicIdApi: vi.fn(),
  getChapterDetailApi: vi.fn(),
  getChapterTranslationsApi: vi.fn()
}));
vi.mock('../../../../utils/Auth', () => ({
  getAuth: vi.fn()
}));
vi.mock('../../../../hooks/useReaderSecurity', () => ({
  default: vi.fn()
}));
vi.mock('../../../../components/common/ComicPageCanvas', () => ({
  default: ({ src }) => <div data-testid="mock-canvas">{src}</div>
}));

const mockComicId = '12345678-1234-1234-1234-123456789012';
const mockChap1 = '11111111-1111-1111-1111-111111111111';
const mockChap2 = '22222222-2222-2222-2222-222222222222';

const mockComic = {
  id: mockComicId,
  title: 'Solo Leveling'
};

const mockChapters = [
  { id: mockChap1, chapterNumber: 1, isPremium: false },
  { id: mockChap2, chapterNumber: 2, isPremium: false }
];

const mockChapterDetail = {
  id: mockChap1,
  chapterNumber: 1,
  title: 'Test Title',
  isPremium: false,
  images: ['page1.jpg', 'page2.jpg']
};

const renderChapterDetail = () => {
  return render(
    <MemoryRouter initialEntries={['/comic/' + mockComicId + '/chapter/' + mockChap1]}>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/comic/:comicId/chapter/:chapterId" element={<ChapterDetail />} />
            </Routes>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Reader - ChapterDetail Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthUtils.getAuth.mockReturnValue({ token: 'test-token', user: { id: 'u1' } });
  });

  it('should load chapter pages and display them', async () => {
    ComicApi.getComicByIdApi.mockResolvedValue({ data: mockComic });
    ChapterApi.getChaptersByComicIdApi.mockResolvedValue({ data: mockChapters });
    ChapterApi.getChapterDetailApi.mockResolvedValue({ data: mockChapterDetail });
    ChapterApi.getChapterTranslationsApi.mockResolvedValue({ data: [] });

    renderChapterDetail();

    await waitFor(() => {
      expect(ComicApi.getComicByIdApi).toHaveBeenCalledWith(mockComicId);
      expect(ChapterApi.getChapterDetailApi).toHaveBeenCalledWith(mockChap1);
    });

    const pages = await screen.findAllByTestId('mock-canvas', {}, { timeout: 3000 });
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveTextContent('page1.jpg');
    expect(pages[1]).toHaveTextContent('page2.jpg');
  });

  it('should navigate between chapters', async () => {
    ComicApi.getComicByIdApi.mockResolvedValue({ data: mockComic });
    ChapterApi.getChaptersByComicIdApi.mockResolvedValue({ data: mockChapters });
    ChapterApi.getChapterDetailApi.mockResolvedValue({ data: mockChapterDetail });
    ChapterApi.getChapterTranslationsApi.mockResolvedValue({ data: [] });

    renderChapterDetail();

    const nextBtn = await screen.findByRole('button', { name: /Next Chapter/i }, { timeout: 3000 });
    expect(nextBtn).toBeInTheDocument();
  });
});
