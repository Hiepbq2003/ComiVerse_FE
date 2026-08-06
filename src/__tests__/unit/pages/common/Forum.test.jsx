import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Forum from '../../../../pages/common/Forum';
import { ThemeProvider } from '../../../../context/ThemeContext';
import { NotificationProvider } from '../../../../context/NotificationContext';
import { AuthProvider } from '../../../../context/AuthContext';
import * as ForumThreadApi from '../../../../services/api/ForumThreadApi';
import * as AuthUtils from '../../../../utils/Auth';

vi.mock('../../../../services/api/ForumThreadApi', () => ({
  getForumThreadsPageApi: vi.fn(),
  deleteForumThreadApi: vi.fn(),
  createForumThreadApi: vi.fn(),
  getAllForumThreadsApi: vi.fn(),
  updateForumThreadApi: vi.fn(),
  getForumThreadByIdApi: vi.fn()
}));
vi.mock('../../../../services/api/ForumCommentApi', () => ({
  createForumCommentApi: vi.fn(),
  getForumCommentsApi: vi.fn()
}));
vi.mock('../../../../utils/Auth', () => ({
  getAuth: vi.fn()
}));
vi.mock('../../../../services/api/BannedKeywordApi', () => ({
  getBannedKeywordsApi: vi.fn().mockResolvedValue({ data: [] }),
}));

const mockThreads = [
  {
    id: 'thread-1',
    title: 'Discussing Solo Leveling',
    content: 'What do you guys think?',
    author: 'User1',
    createdAt: new Date().toISOString(),
    viewCount: 10,
    replyCount: 5,
    isPinned: true
  }
];

const renderForum = () => {
  return render(
    <MemoryRouter initialEntries={['/forum']}>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/forum" element={<Forum />} />
            </Routes>
          </NotificationProvider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('Reader - Forum Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AuthUtils.getAuth.mockReturnValue({ token: 'test', user: { id: 'u1' } });
  });

  it('should load and display forum threads', async () => {
    ForumThreadApi.getForumThreadsPageApi.mockResolvedValue({ data: mockThreads });
    
    renderForum();
    
    await waitFor(() => {
      expect(ForumThreadApi.getForumThreadsPageApi).toHaveBeenCalled();
    });
    
    const title = await screen.findByText('Discussing Solo Leveling', {}, { timeout: 3000 });
    expect(title).toBeInTheDocument();
  });
});
