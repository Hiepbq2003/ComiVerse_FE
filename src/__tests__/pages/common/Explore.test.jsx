import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Explore from '../../../pages/common/Explore';
import { ThemeProvider } from '../../../context/ThemeContext';
import { NotificationProvider } from '../../../context/NotificationContext';
import { AuthProvider } from '../../../context/AuthContext';
import * as ComicApi from '../../../services/api/ComicApi';
import * as GenreApi from '../../../services/api/GenreApi';

vi.mock('../../../services/api/ComicApi', () => ({
  getExploreComicsApi: vi.fn()
}));

vi.mock('../../../services/api/GenreApi', () => ({
  getAllGenresApi: vi.fn()
}));

const mockGenres = [
  { id: '1', name: 'Action' },
  { id: '2', name: 'Fantasy' }
];

const mockComics = [
  { id: '1', title: 'Solo Leveling', views: 500, ratingAverage: 4.8, cover: 'cover1.jpg', chaptersCount: 100 },
  { id: '2', title: 'Omniscient Reader', views: 300, ratingAverage: 4.7, cover: 'cover2.jpg', chaptersCount: 80 }
];

const renderExplore = () => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <Explore />
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Reader - Explore Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch genres and comics on mount', async () => {
    GenreApi.getAllGenresApi.mockResolvedValue({ data: mockGenres });
    ComicApi.getExploreComicsApi.mockResolvedValue({ data: mockComics });

    renderExplore();

    await waitFor(() => {
      expect(GenreApi.getAllGenresApi).toHaveBeenCalled();
      expect(ComicApi.getExploreComicsApi).toHaveBeenCalled();
      expect(screen.getByText(/Solo Leveling/i)).toBeInTheDocument();
    });

    // Open Genres dropdown to see genres
    const genresHeader = screen.getByText('Genres');
    fireEvent.click(genresHeader.nextElementSibling);

    await waitFor(() => {
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Fantasy')).toBeInTheDocument();
    });
  });

  it('should handle pagination Next button', async () => {
    GenreApi.getAllGenresApi.mockResolvedValue({ data: [] });
    // Mock hasMore logic: Explore checks piHasMore based on response.hasMore
    ComicApi.getExploreComicsApi.mockResolvedValue({
      data: mockComics,
      hasMore: true,
      nextCursor: 'cursor-1'
    });

    renderExplore();

    await waitFor(() => {
      expect(screen.getByText(/Solo Leveling/i)).toBeInTheDocument();
    });
    
    const pageText = screen.getByText(/Page/i);
    expect(pageText).toHaveTextContent('Page 1');

    const nextBtn = pageText.nextElementSibling;
    expect(nextBtn).toBeEnabled();

    // Clear mocks so we can count cleanly for the Next page fetch
    ComicApi.getExploreComicsApi.mockClear();

    // Mock next page return
    ComicApi.getExploreComicsApi.mockResolvedValueOnce({
      data: [
        { id: '3', title: 'Tower of God' }
      ],
      hasMore: false
    });

    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(ComicApi.getExploreComicsApi).toHaveBeenCalled();
      expect(screen.getByText(/Tower of God/i)).toBeInTheDocument();
      expect(screen.getByText(/Page/i)).toHaveTextContent('Page 2');
    });
  });
});
