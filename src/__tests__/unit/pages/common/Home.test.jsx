import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../../../../pages/common/Home';
import { ThemeProvider } from '../../../../context/ThemeContext';
import { NotificationProvider } from '../../../../context/NotificationContext';
import { AuthProvider } from '../../../../context/AuthContext';
import * as ComicApi from '../../../../services/api/ComicApi';
import * as ChapterApi from '../../../../services/api/ChapterApi';

vi.mock('../../../../services/api/ComicApi', () => ({
  getExploreComicsApi: vi.fn(),
  getComicRecommendationsApi: vi.fn(),
  getComicLeaderboardApi: vi.fn()
}));

vi.mock('../../../../services/api/ChapterApi', () => ({
  getChaptersByComicIdApi: vi.fn()
}));

const mockComics = [
  { id: '1', title: 'Solo Leveling', views: 500, ratingAverage: 4.8, cover: 'cover1.jpg', chaptersCount: 100 },
  { id: '2', title: 'Omniscient Reader', views: 300, ratingAverage: 4.7, cover: 'cover2.jpg', chaptersCount: 80 }
];

const renderHome = () => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <Home />
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Reader - Home Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render default spotlight and fetch initial APIs', async () => {
    ComicApi.getComicRecommendationsApi.mockResolvedValue({ data: [] });
    ComicApi.getComicLeaderboardApi.mockResolvedValue({ data: [] });
    ComicApi.getExploreComicsApi.mockResolvedValue({ data: [] });

    renderHome();

    // Verify APIs are called on mount
    await waitFor(() => {
      expect(ComicApi.getComicLeaderboardApi).toHaveBeenCalled();
      expect(ComicApi.getComicRecommendationsApi).toHaveBeenCalled();
      expect(ComicApi.getExploreComicsApi).toHaveBeenCalled();
    });

    // The DEFAULT_SPOTLIGHT has title 'Welcome to ComiVerse'
    expect(screen.getByText('Welcome to ComiVerse')).toBeInTheDocument();
  });

  it('Error Guessing: Should not crash if APIs fail and fallback safely', async () => {
    // Force API failures
    ComicApi.getComicRecommendationsApi.mockRejectedValue(new Error('Network Error'));
    ComicApi.getComicLeaderboardApi.mockRejectedValue(new Error('Network Error'));
    ComicApi.getExploreComicsApi.mockRejectedValue(new Error('Network Error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHome();

    await waitFor(() => {
      expect(screen.getByText('Welcome to ComiVerse')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});
