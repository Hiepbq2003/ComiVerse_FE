import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import React from 'react'
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom'
import { toast } from 'react-toastify'

import AuthorComics from '../../../../pages/author/AuthorComics'
import * as AuthorComicApi from '../../../../services/api/AuthorComicApi'
import * as AuthorProfileApi from '../../../../services/api/AuthorProfileApi'

vi.mock('../../../../services/api/AuthorComicApi', () => ({
  checkAuthorComicTitleExistsApi: vi.fn(),
  createAuthorComicApi: vi.fn(),
  getAuthorChapterUploadStatusApi: vi.fn(),
  getAuthorComicsApi: vi.fn(),
  submitAuthorComicReviewApi: vi.fn(),
  uploadAuthorChapterFolderApi: vi.fn(),
}))

vi.mock('../../../../services/api/UploadApi', () => ({
  uploadImageApi: vi.fn(),
}))

vi.mock('../../../../services/api/AuthorProfileApi', () => ({
  getAuthorProfileApi: vi.fn(),
}))

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    success: vi.fn(),
    update: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('Integration Test: Author Comic Creation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AuthorProfileApi.getAuthorProfileApi.mockResolvedValue({
      licenseStatus: 'ACTIVE',
      canPublishComic: true,
    })

    AuthorComicApi.getAuthorComicsApi.mockResolvedValue({
      content: [],
    })

    AuthorComicApi.checkAuthorComicTitleExistsApi.mockResolvedValue(false)
  })

  const renderComponent = () => render(
    <MemoryRouter initialEntries={['/author/comics']}>
      <Routes>
        <Route
          path="/author/comics"
          element={<AuthorComics />}
        />
        <Route
          path="/author/comics/:id"
          element={<div>Comic Detail Page</div>}
        />
      </Routes>
    </MemoryRouter>,
  )

  it('creates a comic draft and navigates to its detail page', async () => {
    AuthorComicApi.createAuthorComicApi.mockResolvedValue({
      id: 'comic-123',
      title: 'My Epic Fantasy',
      summary: 'A great fantasy story.',
      language: 'English',
      minimumAge: 13,
      publicationStatus: 'ONGOING',
      moderationStatus: 'DRAFT',
      chapterCount: 0,
      genres: ['Fantasy', 'Action'],
      cover: 'https://example.com/cover.png',
    })

    renderComponent()

    expect(
      await screen.findByText('No comics yet'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Create First Comic',
      }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Create Comic Draft',
      }),
    ).toBeInTheDocument()

    fireEvent.change(
      screen.getByLabelText(/Title \*/i),
      {
        target: {
          value: 'My Epic Fantasy',
        },
      },
    )

    fireEvent.change(
      screen.getByLabelText(/Original Language \*/i),
      {
        target: {
          value: 'English',
        },
      },
    )

    fireEvent.change(
      screen.getByLabelText(/Description/i),
      {
        target: {
          value: 'A great fantasy story.',
        },
      },
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Fantasy',
      }),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Action',
      }),
    )

    fireEvent.change(
      screen.getByLabelText(/Or Cover Image URL/i),
      {
        target: {
          value: 'https://example.com/cover.png',
        },
      },
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Create Draft',
      }),
    )

    await waitFor(() => {
      expect(
        AuthorComicApi.checkAuthorComicTitleExistsApi,
      ).toHaveBeenCalledWith('My Epic Fantasy')
    })

    await waitFor(() => {
      expect(
        AuthorComicApi.createAuthorComicApi,
      ).toHaveBeenCalledWith({
        title: 'My Epic Fantasy',
        summary: 'A great fantasy story.',
        language: 'English',
        minimumAge: 13,
        publicationStatus: 'ONGOING',
        genres: ['Fantasy', 'Action'],
        cover: 'https://example.com/cover.png',
      })
    })

    expect(toast.success).toHaveBeenCalledWith(
      'Comic draft created successfully.',
    )

    expect(
      await screen.findByText('Comic Detail Page'),
    ).toBeInTheDocument()
  })
})