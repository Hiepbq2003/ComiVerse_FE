import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import TranslatorDashboard from '../../../../pages/translator/TranslatorDashboard';
import * as ProjectTeamApi from '../../../../services/api/ProjectTeamApi';
import * as TeamWorkspaceApi from '../../../../services/api/TeamWorkspaceApi';
import * as AuthUtils from '../../../../utils/Auth';

vi.mock('../../../../services/api/ProjectTeamApi', () => ({
  getAllProjectTeamsApi: vi.fn(),
  getMyProjectTeamsApi: vi.fn(),
  updateProjectTeamApi: vi.fn(),
}));

vi.mock('../../../../services/api/TeamWorkspaceApi', () => ({
  getTeamTasksApi: vi.fn(),
  getTeamChaptersApi: vi.fn(),
}));

vi.mock('../../../../utils/Auth', () => ({
  getAuth: vi.fn(),
}));

// Mock Context Providers
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'translator-1', role: 'TRANSLATOR', fullName: 'Translator User' } }),
  AuthProvider: ({ children }) => <>{children}</>,
}));

vi.mock('../../../../context/NotificationContext', () => ({
  useNotification: () => ({ unreadCount: 0, setUnreadCount: vi.fn(), fetchNotifications: vi.fn(), notifications: [] })
}));

vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

describe('Translator Dashboard Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthUtils.getAuth.mockReturnValue({
      user: { id: 'translator-1', role: 'TRANSLATOR', fullName: 'Translator User' }
    });
  });

  const renderDashboard = () => {
    return render(
      <MemoryRouter>
        <TranslatorDashboard />
      </MemoryRouter>
    );
  };

  it('Should successfully load and display translation dashboard data', async () => {
    ProjectTeamApi.getAllProjectTeamsApi.mockResolvedValueOnce([
      { id: 'team-1', name: 'Alpha Team', leaderId: 'translator-1', comicId: 'comic-1' }
    ]);

    TeamWorkspaceApi.getTeamTasksApi.mockResolvedValueOnce([
      { id: 'task-1', title: 'Translate Chapter 1', status: 'IN_PROGRESS' }
    ]);

    TeamWorkspaceApi.getTeamChaptersApi.mockResolvedValueOnce([
      { id: 'chap-1', title: 'Chapter 1', status: 'PUBLISHED' }
    ]);

    renderDashboard();

    // Verify stats and projects render
    // 1 Team, 1 Task IN_PROGRESS, 1 Chapter PUBLISHED
    const alphaTeams = await screen.findAllByText(/Alpha Team/i);
    expect(alphaTeams.length).toBeGreaterThan(0);
    expect(await screen.findByText(/Translate Chapter 1/i)).toBeInTheDocument();
  });
});
