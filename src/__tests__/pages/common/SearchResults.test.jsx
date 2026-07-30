import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SearchResults from '../../../pages/common/SearchResults';
import { ThemeProvider } from '../../../context/ThemeContext';
import { NotificationProvider } from '../../../context/NotificationContext';
import { AuthProvider } from '../../../context/AuthContext';
import * as SubscriptionApi from '../../../services/api/SubscriptionApi';
import * as AuthUtils from '../../../utils/Auth';

vi.mock('../../../services/api/SubscriptionApi', () => ({
  getCheckoutStatusApi: vi.fn()
}));
vi.mock('../../../utils/Auth', () => ({
  getAuth: vi.fn()
}));
vi.mock('../../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: () => ({ refreshSubscription: vi.fn(), user: { id: 'u1' } })
  };
});

const renderSearchResults = () => {
  return render(
    <MemoryRouter initialEntries={['/search?session_id=123']}>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/search" element={<SearchResults />} />
            </Routes>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Reader - SearchResults Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthUtils.getAuth.mockReturnValue({ token: 'test', user: { id: 'u1' } });
  });

  it('should load and display checkout status', async () => {
    SubscriptionApi.getCheckoutStatusApi.mockResolvedValue({ paymentStatus: 'PAID', premiumActive: true });
    
    renderSearchResults();
    
    await waitFor(() => {
      expect(SubscriptionApi.getCheckoutStatusApi).toHaveBeenCalled();
    });
    
    const title = await screen.findByText('Premium activated', {}, { timeout: 3000 });
    expect(title).toBeInTheDocument();
  });
});
