import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import PayoutManagement from '../../../../pages/admin/PayoutManagement';

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

describe('Admin Payout Management Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <PayoutManagement />
      </MemoryRouter>
    );
  };

  it('Should render the initial payout list and summary stats', () => {
    renderComponent();

    // Verify summary cards
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Processing')).toBeInTheDocument();
    
    // Verify some mock items exist
    expect(screen.getByText('Author X')).toBeInTheDocument();
    expect(screen.getByText('PhoenixWriter')).toBeInTheDocument();
  });

  it('Should filter payouts when clicking filter tabs', () => {
    renderComponent();

    // Click "Completed"
    const completedTab = screen.getByRole('button', { name: /^Completed$/i });
    fireEvent.click(completedTab);

    // After filtering by Completed, "NoviceWriter" should be visible, but "PhoenixWriter" (Processing) shouldn't
    expect(screen.getByText('NoviceWriter')).toBeInTheDocument();
    expect(screen.queryByText('PhoenixWriter')).not.toBeInTheDocument();
  });

  it('Should open and close action modal when clicking action button', () => {
    renderComponent();

    const actionBtns = screen.getAllByRole('button', { name: /Action/i });
    expect(actionBtns.length).toBeGreaterThan(0);
    
    // Open action modal for first item
    fireEvent.click(actionBtns[0]);
    expect(screen.getByText(/Process Payout/i)).toBeInTheDocument();
    
    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Process Payout/i)).not.toBeInTheDocument();
  });
});
