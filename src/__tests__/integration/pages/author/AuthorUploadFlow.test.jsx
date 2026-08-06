import {
  afterEach,
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
  within,
} from '@testing-library/react'
import React from 'react'
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom'
import { toast } from 'react-toastify'

import AuthorComicDetail from '../../../../pages/author/AuthorComicDetail'
import * as AuthorComicApi from '../../../../services/api/AuthorComicApi'

vi.mock('../../../../services/api/AuthorComicApi', () => ({
  deleteAuthorChapterApi: vi.fn(),
  deleteAuthorComicApi: vi.fn(),
  getAuthorChapterPreviewApi: vi.fn(),
  getAuthorChapterUploadStatusApi: vi.fn(),
  getAuthorComicByIdApi: vi.fn(),
  getAuthorComicChaptersApi: vi.fn(),
  getAuthorComicMetricsApi: vi.fn(),
  replaceAuthorChapterFolderApi: vi.fn(),
  submitAuthorChapterReviewApi: vi.fn(),
  submitAuthorComicReviewApi: vi.fn(),
  updateAuthorComicApi: vi.fn(),
  uploadAuthorChapterFolderApi: vi.fn(),
}))

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(() => 'chapter-upload-toast'),
    success: vi.fn(),
    update: vi.fn(),
    warning: vi.fn(),
  },
}))

const mockComic = {
  id: 'c1',
  title: 'My Hero Academy',
  language: 'English',
  minimumAge: 13,
  summary: 'Great hero manga.',
  genres: [
    {
      id: 'g1',
      name: 'Action',
    },
  ],
  moderationStatus: 'DRAFT',
  publicationStatus: 'ONGOING',
  chapterCount: 1,
  cover: 'mock-cover.jpg',
}

const mockChapters = [
  {
    id: 'chap-1',
    chapterNumber: '1',
    title: 'The Beginning',
    moderationStatus: 'DRAFT',
    pageCount: 2,
    pages: [],
  },
]

const mockMetrics = {
  chapterCount: 1,
  estimatedRevenue: 0,
  viewCount: 0,
}

const createFolderFile = ({
  content,
  name,
  relativePath,
}) => {
  const file = new File(
    [content],
    name,
    {
      type: 'image/jpeg',
    },
  )

  Object.defineProperty(
    file,
    'webkitRelativePath',
    {
      configurable: true,
      value: relativePath,
    },
  )

  return file
}

describe('Integration Test: Author Chapter Folder Upload Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    AuthorComicApi.getAuthorComicByIdApi.mockResolvedValue(mockComic)
    AuthorComicApi.getAuthorComicChaptersApi.mockResolvedValue(mockChapters)
    AuthorComicApi.getAuthorComicMetricsApi.mockResolvedValue(mockMetrics)

    // Prevent the background polling timer from continuing after this test.
    vi.spyOn(window, 'setTimeout').mockImplementation(() => 0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const renderComponent = () => render(
    <MemoryRouter initialEntries={['/author/comics/c1']}>
      <Routes>
        <Route
          path="/author/comics/:id"
          element={<AuthorComicDetail />}
        />
        <Route
          path="/author/comics/:id/preview/:chapterId"
          element={<div>Chapter Preview Page</div>}
        />
      </Routes>
    </MemoryRouter>,
  )

  it('uploads a chapter folder and submits the comic for review', async () => {
    AuthorComicApi.uploadAuthorChapterFolderApi.mockResolvedValue({
      taskId: 'upload-task-1',
      status: 'QUEUED',
    })

    AuthorComicApi.submitAuthorComicReviewApi.mockResolvedValue({
      id: 'c1',
      moderationStatus: 'SUBMITTED_FOR_REVIEW',
    })

    renderComponent()

    expect(
      await screen.findByText('The Beginning'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: '+ Add Chapter',
      }),
    )

    const modalHeading = await screen.findByRole(
      'heading',
      {
        name: 'Add Chapter',
      },
    )

    const modal = modalHeading.closest('form')

    expect(modal).not.toBeNull()

    fireEvent.change(
      within(modal).getByLabelText(/Chapter Title/i),
      {
        target: {
          value: 'A New Beginning',
        },
      },
    )

    const pageTwo = createFolderFile({
      content: 'page-two',
      name: '02.jpg',
      relativePath: 'Chapter 2/02.jpg',
    })

    const pageOne = createFolderFile({
      content: 'page-one',
      name: '01.jpg',
      relativePath: 'Chapter 2/01.jpg',
    })

    const folderInput = within(modal).getByLabelText(
      /Upload page folder/i,
    )

    fireEvent.change(
      folderInput,
      {
        target: {
          files: [
            pageTwo,
            pageOne,
          ],
        },
      },
    )

    expect(
      await within(modal).findByText(
        'Chapter 2 · 2 pages',
      ),
    ).toBeInTheDocument()

    fireEvent.click(
      within(modal).getByRole('button', {
        name: 'Upload Folder',
      }),
    )

    await waitFor(() => {
      expect(
        AuthorComicApi.uploadAuthorChapterFolderApi,
      ).toHaveBeenCalledTimes(1)
    })

    const [
      uploadedComicId,
      uploadedFormData,
    ] = AuthorComicApi
      .uploadAuthorChapterFolderApi
      .mock
      .calls[0]

    expect(uploadedComicId).toBe('c1')
    expect(uploadedFormData).toBeInstanceOf(FormData)
    expect(uploadedFormData.get('chapterNumber')).toBe('2')
    expect(uploadedFormData.get('title')).toBe('A New Beginning')

    expect(
      JSON.parse(
        uploadedFormData.get('relativePathsJson'),
      ),
    ).toEqual([
      'Chapter 2/01.jpg',
      'Chapter 2/02.jpg',
    ])

    expect(
      uploadedFormData
        .getAll('files')
        .map((file) => file.name),
    ).toEqual([
      '01.jpg',
      '02.jpg',
    ])

    expect(toast.info).toHaveBeenCalledWith(
      'Uploading chapter folder, please wait...',
    )

    expect(toast.success).toHaveBeenCalledWith(
      'Chapter folder accepted for processing.',
    )

    expect(toast.loading).toHaveBeenCalledWith(
      'Chapter background upload: Processing chapter folder...',
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Push Review',
      }),
    )

    await waitFor(() => {
      expect(
        AuthorComicApi.submitAuthorComicReviewApi,
      ).toHaveBeenCalledWith('c1')
    })

    expect(toast.success).toHaveBeenCalledWith(
      'Comic submitted for moderator review.',
    )
  })
})