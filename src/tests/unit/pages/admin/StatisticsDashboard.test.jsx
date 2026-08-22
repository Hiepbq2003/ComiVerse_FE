import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import StatisticsDashboard from '../../../../pages/admin/StatisticsDashboard';
import * as AccountApi from '../../../../services/api/AccountApi';
import * as ComicApi from '../../../../services/api/ComicApi';
import * as GenreApi from '../../../../services/api/GenreApi';
import * as SubmissionApi from '../../../../services/api/SubmissionApi';
import * as ExportUtils from '../../../../utils/exportToCsv';

vi.mock('../../../../services/api/AccountApi', () => ({
  getAllAccountsApi: vi.fn(),
}));

vi.mock('../../../../services/api/ComicApi', () => ({
  getAllComicsApi: vi.fn(),
}));

vi.mock('../../../../services/api/GenreApi', () => ({
  getAllGenresApi: vi.fn(),
}));

vi.mock('../../../../services/api/SubmissionApi', () => ({
  getAllSubmissionsApi: vi.fn(),
}));

vi.mock('../../../../utils/exportToCsv', () => ({
  exportToCsv: vi.fn(),
}));

// Mock AuthContext and NotificationContext for AdminLayout
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin-1', role: 'ADMIN', fullName: 'Super Admin' } }),
  AuthProvider: ({ children }) => <>{children}</>,
}));

vi.mock('../../../../context/NotificationContext', () => ({
  useNotification: () => ({ unreadCount: 0, setUnreadCount: vi.fn(), fetchNotifications: vi.fn(), notifications: [] })
}));

vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

describe('Admin Statistics Dashboard Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <MemoryRouter>
        <StatisticsDashboard />
      </MemoryRouter>
    );
  };

  it('Should render skeleton loaders initially while fetching data', () => {
    // Return unresolved promises to freeze the loading state
    AccountApi.getAllAccountsApi.mockImplementation(() => new Promise(() => {}));
    ComicApi.getAllComicsApi.mockImplementation(() => new Promise(() => {}));
    GenreApi.getAllGenresApi.mockImplementation(() => new Promise(() => {}));
    SubmissionApi.getAllSubmissionsApi.mockImplementation(() => new Promise(() => {}));

    const { container } = renderDashboard();
    
    // Check if skeleton loaders are present
    expect(container.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(0);
  });

  it('Should successfully load and display dashboard statistics (Happy Path)', async () => {
    AccountApi.getAllAccountsApi.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, role: 'USER' },
          { id: 2, role: 'AUTHOR' },
          { id: 3, role: 'ADMIN' }
        ]
      }
    });

    ComicApi.getAllComicsApi.mockResolvedValueOnce({
      data: {
        data: [
          { id: 101, title: 'Comic 1', views: 500, rating: 4.5 },
          { id: 102, title: 'Comic 2', views: 1500, rating: 4.0 }
        ]
      }
    });

    GenreApi.getAllGenresApi.mockResolvedValueOnce({
      data: [
        { id: 1, name: 'Action' },
        { id: 2, name: 'Romance' }
      ]
    });

    SubmissionApi.getAllSubmissionsApi.mockResolvedValueOnce({
      data: {
        data: [
          { id: 201, status: 'PENDING' },
          { id: 202, status: 'APPROVED' }
        ]
      }
    });

    renderDashboard();

    // The data should eventually render
    await waitFor(() => {
      // Look for metrics based on mocked data. For example, 3 total users.
      // We expect the dashboard to aggregate counts.
      expect(screen.getByText('3')).toBeInTheDocument(); // 3 Total Users
    });
  });

  it('Should handle CSV export click', async () => {
    AccountApi.getAllAccountsApi.mockResolvedValueOnce({ data: { data: [] } });
    ComicApi.getAllComicsApi.mockResolvedValueOnce({ data: { data: [] } });
    GenreApi.getAllGenresApi.mockResolvedValueOnce({ data: [] });
    SubmissionApi.getAllSubmissionsApi.mockResolvedValueOnce({ data: { data: [] } });

    renderDashboard();

    await waitFor(() => {
      expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);

    expect(ExportUtils.exportToCsv).toHaveBeenCalled();
  });
});
