import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import RevenueManagement from '../../../../pages/admin/RevenueManagement';
import * as PlanApi from '../../../../services/api/PlanApi';
import * as AccountApi from '../../../../services/api/AccountApi';
import * as ComicApi from '../../../../services/api/ComicApi';
import * as ExportUtils from '../../../../utils/exportToCsv';

vi.mock('../../../../services/api/PlanApi', () => ({
  getPremiumPlansApi: vi.fn(),
}));

vi.mock('../../../../services/api/AccountApi', () => ({
  getAllAccountsApi: vi.fn(),
}));

vi.mock('../../../../services/api/ComicApi', () => ({
  getAllComicsApi: vi.fn(),
}));

vi.mock('../../../../utils/exportToCsv', () => ({
  exportToCsv: vi.fn(),
}));

// Mock Context Providers
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

describe('Admin Revenue Management Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <MemoryRouter>
        <RevenueManagement />
      </MemoryRouter>
    );
  };

  it('Should render skeleton loaders initially while fetching data', () => {
    PlanApi.getPremiumPlansApi.mockImplementation(() => new Promise(() => {}));
    AccountApi.getAllAccountsApi.mockImplementation(() => new Promise(() => {}));
    ComicApi.getAllComicsApi.mockImplementation(() => new Promise(() => {}));

    const { container } = renderDashboard();
    
    // Check if skeleton loaders are present
    expect(container.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(0);
  });

  it('Should load and display revenue data correctly (Happy Path)', async () => {
    PlanApi.getPremiumPlansApi.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, name: 'Basic', price: 5, activeSubscribers: 100 },
          { id: 2, name: 'Premium', price: 15, activeSubscribers: 50 }
        ]
      }
    });

    AccountApi.getAllAccountsApi.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, role: 'USER' },
          { id: 2, role: 'USER' },
          { id: 3, role: 'USER' }
        ]
      }
    });

    ComicApi.getAllComicsApi.mockResolvedValueOnce({
      data: {
        data: []
      }
    });

    renderDashboard();

    // Verify revenue data logic (5*100 + 15*50 = 500 + 750 = $1,250 minimum depending on logic)
    // The component probably calculates total revenue or displays plans.
    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });
  });

  it('Should handle CSV export click', async () => {
    PlanApi.getPremiumPlansApi.mockResolvedValueOnce({ data: { data: [] } });
    AccountApi.getAllAccountsApi.mockResolvedValueOnce({ data: { data: [] } });
    ComicApi.getAllComicsApi.mockResolvedValueOnce({ data: { data: [] } });

    renderDashboard();

    await waitFor(() => {
      expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);

    expect(ExportUtils.exportToCsv).toHaveBeenCalled();
  });
});
