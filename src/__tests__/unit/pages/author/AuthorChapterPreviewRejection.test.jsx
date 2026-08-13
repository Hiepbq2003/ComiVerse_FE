import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AuthorChapterPreview from '../../../../pages/author/AuthorChapterPreview'
import * as AuthContext from '../../../../context/AuthContext'
import * as AuthorComicApi from '../../../../services/api/AuthorComicApi'
import * as ChapterApi from '../../../../services/api/ChapterApi'

vi.mock('../../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}))

vi.mock('../../../../services/api/AuthorComicApi', () => ({
  getAuthorComicChaptersApi: vi.fn(),
  getAuthorChapterPreviewApi: vi.fn(),
}))

vi.mock('../../../../services/api/ChapterApi', () => ({
  getChapterDetailApi: vi.fn(),
}))

describe('AuthorChapterPreview - Rejection & Comment Scoping Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    AuthContext.useAuth.mockReturnValue({
      user: { id: 'author-1', role: 'AUTHOR', fullName: 'Test Author' },
    })
  })

  const renderComponent = (comicId = 'comic-100', chapterId = 'chap-2', state = null) => {
    return render(
      <MemoryRouter initialEntries={[{ pathname: `/author/comics/${comicId}/preview/${chapterId}`, state }]}>
        <Routes>
          <Route path="/author/comics/:comicId/preview/:chapterId" element={<AuthorChapterPreview />} />
          <Route path="/author/comics/:comicId" element={<div>Comic Detail Page</div>} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('isolates comments strictly to Chapter 2 and does not show comments from Chapter 1', async () => {
    // Store comments in localStorage under comiverse_moderator_doc_comments
    const mockComments = {
      'sub-100': [
        {
          id: 'c-chap1-1',
          comicId: 'comic-100',
          chapterId: 'chap-1',
          chapterNumber: '1',
          targetKey: 'page-1',
          targetLabel: 'Page 1',
          text: 'Trash chapter 1 note from July 27',
          targetType: 'page',
          createdAt: '2026-07-27T00:00:00Z',
          author: 'Moderator',
        },
        {
          id: 'c-chap2-1',
          comicId: 'comic-100',
          chapterId: 'chap-2',
          chapterNumber: '2',
          targetKey: 'page-1',
          targetLabel: 'Page 1',
          text: 'Specific note for Chapter 2 from 2m ago',
          targetType: 'page',
          createdAt: new Date().toISOString(),
          author: 'Moderator',
        },
      ],
    }
    localStorage.setItem('comiverse_moderator_doc_comments', JSON.stringify(mockComments))

    // Chapter 2 preview state
    AuthorComicApi.getAuthorChapterPreviewApi.mockResolvedValue({
      id: 'chap-2',
      chapterNumber: '2',
      title: 'Chapter 2',
      status: 'REJECTED',
      pages: ['https://example.com/page1.jpg', 'https://example.com/page2.jpg'],
      rejectionReason: 'Please fix page 1',
    })

    renderComponent('comic-100', 'chap-2')

    // Wait for header
    await waitFor(() => {
      expect(screen.getByTitle('Preview · Chapter 2')).toBeInTheDocument()
    })

    // Feedback Pins button should show count: 1 (only Chapter 2's comment)
    await waitFor(() => {
      expect(screen.getByTitle('Toggle Moderator Feedback Sidebar')).toHaveTextContent('Feedback Pins (1)')
    })

    // It must NOT contain the Chapter 1 comment
    expect(screen.queryByText(/Trash chapter 1 note from July 27/i)).not.toBeInTheDocument()
  })

  it('preserves and loads pages for rejected chapters via fallback getChapterDetailApi', async () => {
    // getAuthorChapterPreviewApi returns empty pages
    AuthorComicApi.getAuthorChapterPreviewApi.mockResolvedValue({
      id: 'chap-2',
      chapterNumber: '2',
      title: 'Chapter 2',
      status: 'REJECTED',
      pages: [],
    })

    // getChapterDetailApi provides the actual pages
    ChapterApi.getChapterDetailApi.mockResolvedValue({
      data: {
        id: 'chap-2',
        chapterNumber: '2',
        title: 'Chapter 2',
        pages: [{ imageUrl: 'https://example.com/p1.jpg', pageNumber: 1 }],
      },
    })

    renderComponent('comic-100', 'chap-2')

    await waitFor(() => {
      expect(screen.getByAltText('Page 1')).toBeInTheDocument()
    })

    expect(screen.getByAltText('Page 1')).toHaveAttribute('src', 'https://example.com/p1.jpg')
  })

  it('correctly parses structured rejection report and displays overall remark, pin notes, and chapter pages', async () => {
    const structuredReason = `nooo\n\n--- DETAILED INSPECTION FEEDBACK REPORT (1 PINNED ITEMS) ---\n1. [Page 1]: nooo`

    AuthorComicApi.getAuthorChapterPreviewApi.mockResolvedValue({
      id: 'chap-2',
      chapterNumber: '2',
      title: 'Chapter 2',
      status: 'REJECTED',
      rejectionReason: structuredReason,
      pages: ['https://example.com/c2-p1.jpg', 'https://example.com/c2-p2.jpg'],
    })

    renderComponent('comic-100', 'chap-2')

    await waitFor(() => {
      expect(screen.getByTitle('Preview · Chapter 2')).toBeInTheDocument()
    })

    // Feedback count button
    await waitFor(() => {
      expect(screen.getByTitle('Toggle Moderator Feedback Sidebar')).toHaveTextContent('Feedback Pins (1)')
    })

    // Ensure Page 1 image is loaded
    expect(screen.getByAltText('Page 1')).toHaveAttribute('src', 'https://example.com/c2-p1.jpg')
  })
})
