import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AuthorComics from '../../../../pages/author/AuthorComics';
import * as AuthorComicApi from '../../../../services/api/AuthorComicApi';
import { toast } from 'react-toastify';

// Mock contexts
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'author-1', role: 'AUTHOR' } }),
  AuthProvider: ({ children }) => <>{children}</>,
}));
vi.mock('../../../../context/NotificationContext', () => ({
  useNotification: () => ({ unreadCount: 0, setUnreadCount: vi.fn(), fetchNotifications: vi.fn(), notifications: [] })
}));
vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

vi.mock('../../../../services/api/AuthorComicApi', () => ({
  getAuthorComicsApi: vi.fn(),
  createAuthorComicApi: vi.fn(),
  getAuthorChapterUploadStatusApi: vi.fn(),
  submitAuthorComicReviewApi: vi.fn(),
  uploadAuthorChapterZipApi: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
}));

describe('Integration Test: Author Comic Creation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default fetch returns empty list
    AuthorComicApi.getAuthorComicsApi.mockResolvedValueOnce({
      content: []
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <AuthorComics />
      </MemoryRouter>
    );
  };

  it('Should successfully execute the comic creation flow', async () => {
    renderComponent();
    
    // Wait for the empty state to render after fetching
    expect(await screen.findByText('No comics yet')).toBeInTheDocument();

    // 1. Click 'Create First Comic' to open modal
    const createBtn = screen.getByText('Create First Comic');
    fireEvent.click(createBtn);

    // Verify modal opened
    expect(await screen.findByText('Create Comic Draft')).toBeInTheDocument();

    // 2. Fill Details
    // Title
    const titleInputs = screen.getAllByRole('textbox').filter(el => el.closest('label')?.textContent.includes('Title'));
    // We just want the one inside Title * label, or select by placeholder/value etc. But input has no placeholder, so we can use Label Text
    const titleInput = screen.getByLabelText(/Title \*/i);
    fireEvent.change(titleInput, { target: { value: 'My Epic Fantasy' } });

    // Language
    const langSelect = screen.getByLabelText(/Original Language \*/i);
    fireEvent.change(langSelect, { target: { value: 'English' } });

    // Description
    const descInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descInput, { target: { value: 'A great fantasy story.' } });

    // 3. Select Genres (e.g. Fantasy, Action)
    const fantasyBtn = screen.getByRole('button', { name: 'Fantasy' });
    fireEvent.click(fantasyBtn);
    const actionBtn = screen.getByRole('button', { name: 'Action' });
    fireEvent.click(actionBtn);

    // 4. Provide Cover Image URL
    const coverUrlInput = screen.getByLabelText(/Or Cover Image URL/i);
    fireEvent.change(coverUrlInput, { target: { value: 'https://example.com/cover.png' } });

    // 5. Submit form
    AuthorComicApi.createAuthorComicApi.mockResolvedValueOnce({
      id: 'comic-123',
      title: 'My Epic Fantasy',
      genres: ['Fantasy', 'Action']
    });

    // To verify that the comic list is refreshed after creation, we need to mock getAuthorComicsApi again
    AuthorComicApi.getAuthorComicsApi.mockResolvedValueOnce({
      content: [{
        id: 'comic-123',
        title: 'My Epic Fantasy',
        moderationStatus: 'DRAFT',
        publicationStatus: 'ONGOING',
        chapterCount: 0,
        genres: ['Fantasy', 'Action'],
        language: 'ENGLISH'
      }]
    });

    const createDraftBtn = screen.getByText('Create Draft');
    fireEvent.click(createDraftBtn);

    // Verify API called with correct payload
    await waitFor(() => {
      expect(AuthorComicApi.createAuthorComicApi).toHaveBeenCalledWith({
        title: 'My Epic Fantasy',
        summary: 'A great fantasy story.',
        language: 'English',
        minimumAge: 13,
        publicationStatus: 'ONGOING',
        genres: ['Fantasy', 'Action'],
        cover: 'https://example.com/cover.png'
      });
      expect(toast.success).toHaveBeenCalledWith('Comic draft created successfully.');
    });

    // 6. Verify the new comic appears in the dashboard (refetched)
    expect(await screen.findByText('My Epic Fantasy')).toBeInTheDocument();
  });
});
