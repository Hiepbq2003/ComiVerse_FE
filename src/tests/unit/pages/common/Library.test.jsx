import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Library from '../../../../pages/common/Library';
import { ThemeProvider } from '../../../../context/ThemeContext';
import { NotificationProvider } from '../../../../context/NotificationContext';
import { AuthProvider } from '../../../../context/AuthContext';
import * as SaveApi from '../../../../services/api/SaveApi';
import * as LikeApi from '../../../../services/api/LikeApi';
import * as ReadingHistoryApi from '../../../../services/api/ReadingHistoryApi';
import * as RatingApi from '../../../../services/api/RatingApi';
import * as AuthUtils from '../../../../utils/Auth';

vi.mock('../../../../services/api/SaveApi', () => ({
  getMySavesApi: vi.fn(),
  toggleSaveStatusApi: vi.fn()
}));
vi.mock('../../../../services/api/LikeApi', () => ({
  getMyLikesApi: vi.fn(),
  toggleLikeStatusApi: vi.fn()
}));
vi.mock('../../../../services/api/ReadingHistoryApi', () => ({
  getMyReadingHistoryApi: vi.fn(),
  deleteReadingHistoryComicApi: vi.fn()
}));
vi.mock('../../../../services/api/RatingApi', () => ({
  getUserRatingsApi: vi.fn(),
  deleteComicRatingApi: vi.fn()
}));
vi.mock('../../../../utils/Auth', () => ({
  getAuth: vi.fn()
}));
vi.mock('../../../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: () => ({ isLoggedIn: true })
  };
});
// Mock ConfirmModal
vi.mock('../../../../components/common/ConfirmModal', () => ({
  default: ({ isOpen, onConfirm }) => isOpen ? <div data-testid="confirm-modal"><button onClick={onConfirm}>Confirm Delete</button></div> : null
}));

const renderLibrary = (tab = 'Saved') => {
  return render(
    <MemoryRouter initialEntries={['/library?tab=' + tab]}>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/library" element={<Library />} />
            </Routes>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

const mockSavedList = [
  { id: '1', title: 'Saved Comic 1', imageUrl: 'saved1.jpg' }
];

describe('Reader - Library Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthUtils.getAuth.mockReturnValue({ token: 'test', user: { id: 'u1' } });
  });

  it('should load and display saved comics', async () => {
    SaveApi.getMySavesApi.mockResolvedValue(mockSavedList);
    LikeApi.getMyLikesApi.mockResolvedValue([]);
    ReadingHistoryApi.getMyReadingHistoryApi.mockResolvedValue([]);
    RatingApi.getUserRatingsApi.mockResolvedValue([]);
    
    renderLibrary('Saved');
    
    await waitFor(() => {
      expect(SaveApi.getMySavesApi).toHaveBeenCalled();
    });
    
    const title = await screen.findByText('Saved Comic 1', {}, { timeout: 3000 });
    expect(title).toBeInTheDocument();
  });
});
