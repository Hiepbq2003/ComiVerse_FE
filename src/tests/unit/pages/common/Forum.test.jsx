import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Forum from '../../../../pages/common/Forum';
import { ThemeProvider } from '../../../../context/ThemeContext';
import { NotificationProvider } from '../../../../context/NotificationContext';
import { AuthProvider } from '../../../../context/AuthContext';
import * as ForumThreadApi from '../../../../services/api/ForumThreadApi';
import * as ForumCommentApi from '../../../../services/api/ForumCommentApi';
import * as UploadApi from '../../../../services/api/UploadApi';
import * as AuthUtils from '../../../../utils/Auth';

vi.mock('../../../../services/api/ForumThreadApi', () => ({
  getForumThreadsPageApi: vi.fn(),
  deleteForumThreadApi: vi.fn(),
  createForumThreadApi: vi.fn(),
  getAllForumThreadsApi: vi.fn(),
  updateForumThreadApi: vi.fn(),
  getForumThreadByIdApi: vi.fn(),
  incrementForumThreadViewApi: vi.fn(),
  toggleForumThreadLikeApi: vi.fn(),
  toggleForumThreadFollowApi: vi.fn(),
  reportForumThreadApi: vi.fn()
}));
vi.mock('../../../../services/api/ForumCommentApi', () => ({
  createForumCommentApi: vi.fn(),
  getForumCommentsApi: vi.fn(),
  toggleForumCommentLikeApi: vi.fn(),
  updateForumCommentApi: vi.fn(),
  deleteForumCommentApi: vi.fn()
}));
vi.mock('../../../../services/api/ForumCategoryApi', () => ({
  getForumCategoriesApi: vi.fn().mockResolvedValue([
    { id: 'category-general', name: 'General', color: '#94a3b8' }
  ])
}));
vi.mock('../../../../services/api/UploadApi', () => ({
  uploadImageApi: vi.fn()
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

const renderForum = (initialPath = '/forum') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/forum" element={<Forum />} />
              <Route path="/forum/thread/:threadId" element={<Forum />} />
              <Route path="/auth" element={<div>Sign-in target</div>} />
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
    ForumThreadApi.getAllForumThreadsApi.mockResolvedValue([]);
    ForumThreadApi.incrementForumThreadViewApi.mockResolvedValue({ success: true });
    ForumThreadApi.toggleForumThreadLikeApi.mockResolvedValue({ liked: true, likes: 1 });
    ForumThreadApi.toggleForumThreadFollowApi.mockResolvedValue({ following: true });
    ForumCommentApi.getForumCommentsApi.mockResolvedValue([]);
  });

  it('should load and display forum threads', async () => {
    ForumThreadApi.getForumThreadsPageApi.mockResolvedValue({
      data: [{ ...mockThreads[0], isFollowedByCurrentUser: true }],
    });
    
    renderForum();
    
    await waitFor(() => {
      expect(ForumThreadApi.getForumThreadsPageApi).toHaveBeenCalled();
    });
    
    const title = await screen.findByText('Discussing Solo Leveling', {}, { timeout: 3000 });
    expect(title).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
  });

  it('restores the persisted thread like count and user state after a direct reload', async () => {
    ForumThreadApi.getForumThreadsPageApi.mockResolvedValue({ data: [], metadata: {} });
    ForumThreadApi.getForumThreadByIdApi.mockResolvedValue({
      ...mockThreads[0],
      likes: 9,
      isLikedByCurrentUser: true,
    });

    renderForum('/forum/thread/thread-1');

    const likeButton = await screen.findByRole('button', { name: /9 likes/i });
    expect(likeButton).toHaveClass('liked-active');
  });

  it('restores and persists thread tracking through the backend API', async () => {
    ForumThreadApi.getForumThreadsPageApi.mockResolvedValue({ data: [], metadata: {} });
    ForumThreadApi.getForumThreadByIdApi.mockResolvedValue({
      ...mockThreads[0],
      isFollowedByCurrentUser: true,
    });
    ForumThreadApi.toggleForumThreadFollowApi.mockResolvedValue({ following: false });

    renderForum('/forum/thread/thread-1');

    const followButton = await screen.findByRole('button', { name: 'Following' });
    expect(followButton).toHaveClass('is-following');
    expect(followButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(followButton);
    fireEvent.click(await screen.findByRole('button', { name: /Not Tracking/i }));

    await waitFor(() => {
      expect(ForumThreadApi.toggleForumThreadFollowApi).toHaveBeenCalledWith('thread-1');
      expect(screen.getByRole('button', { name: 'Not Tracking' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });
  });

  it('persists a thread like through the backend API', async () => {
    ForumThreadApi.getForumThreadsPageApi.mockResolvedValue({
      data: [{ ...mockThreads[0], likes: 4, isLikedByCurrentUser: false }],
      metadata: {},
    });
    ForumThreadApi.toggleForumThreadLikeApi.mockResolvedValue({ liked: true, likes: 5 });

    renderForum();

    const threadTitle = await screen.findByText('Discussing Solo Leveling');
    const threadCard = threadTitle.closest('.forum-thread-card-stv');
    const likeButton = threadCard.querySelector('.forum-card-action-btn');
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(ForumThreadApi.toggleForumThreadLikeApi).toHaveBeenCalledWith('thread-1');
      expect(likeButton).toHaveTextContent('5');
      expect(likeButton).toHaveClass('liked-active');
    });
  });

  it('rolls back an optimistic thread like when the API request fails', async () => {
    ForumThreadApi.getForumThreadsPageApi.mockResolvedValue({
      data: [{ ...mockThreads[0], likes: 4, isLikedByCurrentUser: false }],
      metadata: {},
    });
    ForumThreadApi.toggleForumThreadLikeApi.mockRejectedValue(new Error('network unavailable'));

    renderForum();

    const threadTitle = await screen.findByText('Discussing Solo Leveling');
    const likeButton = threadTitle.closest('.forum-thread-card-stv').querySelector('.forum-card-action-btn');
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(likeButton).toHaveTextContent('4');
      expect(likeButton).not.toHaveClass('liked-active');
      expect(likeButton).not.toBeDisabled();
    });
  });

  it('uploads a post image and stores only its Cloudinary URL', async () => {
    ForumThreadApi.getForumThreadsPageApi.mockResolvedValue({ data: [], metadata: {} });
    ForumThreadApi.createForumThreadApi.mockResolvedValue({ id: 'thread-new' });
    UploadApi.uploadImageApi.mockResolvedValue('https://res.cloudinary.com/comiverse/forum/post.png');
    const { container } = renderForum();

    fireEvent.click(await screen.findByRole('button', { name: /Create Discussion/i }));
    fireEvent.change(screen.getByPlaceholderText(/Ask a question/i), {
      target: { value: 'Forum image test' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Provide context/i), {
      target: { value: 'Image is uploaded before publishing.' }
    });
    const file = new File(['image'], 'post.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [file] }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish Post' }));

    await waitFor(() => expect(UploadApi.uploadImageApi).toHaveBeenCalledWith(file));
    expect(ForumThreadApi.createForumThreadApi).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining('https://res.cloudinary.com/comiverse/forum/post.png')
    }));
    expect(ForumThreadApi.createForumThreadApi.mock.calls[0][0].content).not.toContain('data:image');
  });

  it('sends guests to sign in before creating a discussion', async () => {
    AuthUtils.getAuth.mockReturnValue(null);
    ForumThreadApi.getForumThreadsPageApi.mockResolvedValue({ data: [], metadata: {} });

    renderForum();
    fireEvent.click(await screen.findByRole('button', { name: /Create Discussion/i }));

    expect(await screen.findByText('Sign-in target')).toBeInTheDocument();
  });

  it('uploads a reply image and posts the resulting URL', async () => {
    ForumThreadApi.getForumThreadsPageApi.mockResolvedValue({ data: mockThreads, metadata: {} });
    ForumThreadApi.getAllForumThreadsApi.mockResolvedValue(mockThreads);
    ForumCommentApi.createForumCommentApi.mockResolvedValue({
      id: 'comment-new',
      content: '<img src="https://res.cloudinary.com/comiverse/forum/reply.png">'
    });
    UploadApi.uploadImageApi.mockResolvedValue('https://res.cloudinary.com/comiverse/forum/reply.png');
    const { container } = renderForum();

    fireEvent.click(await screen.findByText('Discussing Solo Leveling'));
    await screen.findByTitle('Attach Image');
    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(['image'], 'reply.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(container.querySelector('.forum-editor-toolbar-stv .mod-btn.approve'));

    await waitFor(() => expect(UploadApi.uploadImageApi).toHaveBeenCalledWith(file));
    expect(ForumCommentApi.createForumCommentApi).toHaveBeenCalledWith(
      'thread-1',
      expect.objectContaining({
        content: expect.stringContaining('https://res.cloudinary.com/comiverse/forum/reply.png')
      })
    );
  });
});
