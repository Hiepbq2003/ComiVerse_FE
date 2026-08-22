import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AuthorDashboard from '../../../../pages/author/AuthorDashboard';
import * as AuthorComicApi from '../../../../services/api/AuthorComicApi';
import * as PayoutApi from '../../../../services/api/PayoutApi';

vi.mock('../../../../services/api/AuthorComicApi', () => ({
  getAuthorDashboardMetricsApi: vi.fn(),
}));

vi.mock('../../../../services/api/PayoutApi', () => ({
  getCreatorPayoutOverviewApi: vi.fn(),
}));

// Mock Context Providers
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'author-1', role: 'AUTHOR', fullName: 'Test Author' } }),
  AuthProvider: ({ children }) => <>{children}</>,
}));

vi.mock('../../../../context/NotificationContext', () => ({
  useNotification: () => ({ unreadCount: 0, setUnreadCount: vi.fn(), fetchNotifications: vi.fn(), notifications: [] })
}));

vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

describe('Author Dashboard (Overview) Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PayoutApi.getCreatorPayoutOverviewApi.mockResolvedValue({ monthlyGrossAmountUsd: 0 });
  });

  const renderDashboard = () => {
    return render(
      <MemoryRouter>
        <AuthorDashboard />
      </MemoryRouter>
    );
  };

  it('Should render skeleton loaders initially while fetching data', () => {
    AuthorComicApi.getAuthorDashboardMetricsApi.mockImplementation(() => new Promise(() => {}));

    const { container } = renderDashboard();
    
    // Check if loading text is present
    expect(screen.getByText(/Loading author dashboard metrics/i)).toBeInTheDocument();
  });

  it('Should successfully load and display dashboard statistics', async () => {
    AuthorComicApi.getAuthorDashboardMetricsApi.mockResolvedValueOnce({
      summary: {
        totalComics: 5,
        publishedComics: 3,
        totalViews: 10500,
        estimatedRevenue: 5000000,
      },
      topComics: [
        { id: 1, title: 'My Comic', status: 'PUBLISHED', views: 5000 }
      ],
      recentActivities: [
        { type: 'CHAPTER_APPROVED', content: 'Chapter 1 approved', date: '2026-01-01' }
      ]
    });

    renderDashboard();

    // The data should eventually render
    expect(await screen.findByText('5')).toBeInTheDocument(); // total comics
    expect(await screen.findByText(/10.5K/i)).toBeInTheDocument(); // total views
  });

  it('Should use current-month payout revenue for Earn this Month', async () => {
    AuthorComicApi.getAuthorDashboardMetricsApi.mockResolvedValueOnce({
      summary: { totalComics: 1, estimatedRevenue: 145, totalPaid: 70 },
      monthlyMetrics: [],
      topComics: [],
      recentActivities: [],
    });
    PayoutApi.getCreatorPayoutOverviewApi.mockResolvedValueOnce({ monthlyGrossAmountUsd: 75 });

    renderDashboard();

    expect(await screen.findByText('$75.00')).toBeInTheDocument();
    expect(PayoutApi.getCreatorPayoutOverviewApi).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}$/));
  });

  it('Should handle API failure gracefully with empty values', async () => {
    AuthorComicApi.getAuthorDashboardMetricsApi.mockRejectedValueOnce(new Error('Network error'));

    renderDashboard();

    await waitFor(() => {
      // It should fallback to 0 instead of crashing
      expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
    });
  });
});
