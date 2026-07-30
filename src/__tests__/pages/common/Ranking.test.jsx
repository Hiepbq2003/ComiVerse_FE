import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Ranking from '../../../pages/common/Ranking';
import { ThemeProvider } from '../../../context/ThemeContext';
import { NotificationProvider } from '../../../context/NotificationContext';
import { AuthProvider } from '../../../context/AuthContext';
import * as ComicApi from '../../../services/api/ComicApi';

vi.mock('../../../services/api/ComicApi', () => ({
  getComicLeaderboardApi: vi.fn()
}));

const mockComics = [
  { id: '1', title: 'Solo Leveling', views: 500, ratingAverage: 4.8, cover: 'cover1.jpg', chaptersCount: 100, trend: 'up' },
  { id: '2', title: 'Omniscient Reader', views: 300, ratingAverage: 4.7, cover: 'cover2.jpg', chaptersCount: 80, trend: 'stable' }
];

const renderRanking = () => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <Ranking />
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Reader - Ranking Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch leaderboard and render comics on mount', async () => {
    ComicApi.getComicLeaderboardApi.mockResolvedValue({ data: mockComics });

    renderRanking();

    await waitFor(() => {
      expect(ComicApi.getComicLeaderboardApi).toHaveBeenCalledWith(
        { timeframe: 'day' },
        expect.any(Object)
      );
      expect(screen.getByText(/Solo Leveling/i)).toBeInTheDocument();
      expect(screen.getByText(/Omniscient Reader/i)).toBeInTheDocument();
    });
  });

  it('should fetch with new timeframe when a tab is clicked', async () => {
    ComicApi.getComicLeaderboardApi.mockResolvedValue({ data: mockComics });

    renderRanking();

    await waitFor(() => {
      expect(ComicApi.getComicLeaderboardApi).toHaveBeenCalled();
    });

    const weeklyTab = screen.getByText('Weekly');
    
    // Clear mocks before interaction to isolate the call
    ComicApi.getComicLeaderboardApi.mockClear();

    fireEvent.click(weeklyTab);

    await waitFor(() => {
      expect(ComicApi.getComicLeaderboardApi).toHaveBeenCalledWith(
        { timeframe: 'week' },
        expect.any(Object)
      );
    });
  });
});
