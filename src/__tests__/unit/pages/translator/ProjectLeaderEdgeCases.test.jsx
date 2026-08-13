import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TranslatorDashboard from '../../../../pages/translator/TranslatorDashboard';
import * as AuthUtils from '../../../../utils/Auth';
import * as ProjectTeamApi from '../../../../services/api/ProjectTeamApi';

vi.mock('../../../../utils/Auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'leader-1', role: 'PROJECT_LEADER', fullName: 'Project Leader' } }),
  AuthProvider: ({ children }) => <>{children}</>,
}));

vi.mock('../../../../context/NotificationContext', () => ({
  useNotification: () => ({ unreadCount: 0, setUnreadCount: vi.fn(), fetchNotifications: vi.fn() })
}));

vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

vi.mock('../../../../services/api/ProjectTeamApi', () => ({
  getMyTeamsApi: vi.fn(),
  getMyProjectTeamsApi: vi.fn().mockResolvedValue([]),
  getAllProjectTeamsApi: vi.fn().mockResolvedValue([]),
  createTeamApi: vi.fn(),
  inviteMemberApi: vi.fn(),
  updateMemberRoleApi: vi.fn(),
  removeMemberApi: vi.fn(),
}));

const renderProjectLeaderDashboard = () => {
  return render(
    <MemoryRouter initialEntries={['/translator/overview']}>
      <Routes>
        <Route path="/translator/overview" element={<TranslatorDashboard />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Project Leader Edge Cases & Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthUtils.getAuth.mockReturnValue({
      token: 'fake-leader-token',
      user: { id: 'leader-1', role: 'PROJECT_LEADER', fullName: 'Project Leader' }
    });
  });

  describe('Team Management - Boundary & Invalid Data', () => {
    it('Should gracefully handle attempting to invite a malformed email address (Validation Bypass)', async () => {
      ProjectTeamApi.getAllProjectTeamsApi.mockResolvedValueOnce({
        data: [{
          id: 'team-1',
          name: 'The Translators',
          members: [
            { id: 'm1', user: { id: 'leader-1', username: 'leader' }, role: 'LEADER' }
          ]
        }]
      });

      renderProjectLeaderDashboard();
      
      // Wait for UI to load
      await waitFor(() => {
        expect(screen.getByText('The Translators')).toBeInTheDocument();
      });

      const inviteBtn = screen.getByRole('button', { name: /invite/i });
      fireEvent.click(inviteBtn);

      const emailInput = screen.getByPlaceholderText(/email address/i);
      const submitInvite = screen.getByRole('button', { name: /send invite/i });

      // Enter malicious XSS / malformed email
      const maliciousEmail = '"><script>alert(1)</script>@test.com';
      fireEvent.change(emailInput, { target: { value: maliciousEmail } });
      
      ProjectTeamApi.inviteMemberApi.mockRejectedValueOnce({
        response: { status: 400, data: { message: 'Invalid email format' } }
      });
      
      fireEvent.click(submitInvite);

      // Verify API was called and handles the 400 correctly without crashing
      await waitFor(() => {
        expect(ProjectTeamApi.inviteMemberApi).toHaveBeenCalledWith('team-1', maliciousEmail);
      });
    });
  });
});
