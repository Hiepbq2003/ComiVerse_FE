import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthorComics from '../../../pages/author/AuthorComics'
import * as AuthorComicApi from '../../../services/api/AuthorComicApi'
import * as UploadApi from '../../../services/api/UploadApi'

vi.mock('../../../services/api/AuthorComicApi', () => ({
  createAuthorComicApi: vi.fn(),
  getAuthorChapterUploadStatusApi: vi.fn(),
  getAuthorComicsApi: vi.fn(),
  submitAuthorComicReviewApi: vi.fn(),
  uploadAuthorChapterZipApi: vi.fn(),
}))

vi.mock('../../../services/api/UploadApi', () => ({
  uploadImageApi: vi.fn(),
}))

vi.mock('react-toastify', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

const draftComic = {
  id: 'comic-1',
  title: 'Moonblade Chronicle',
  summary: 'A test comic owned by the signed-in author.',
  language: 'Japanese',
  minimumAge: 13,
  publicationStatus: 'ONGOING',
  moderationStatus: 'DRAFT',
  chapterCount: 1,
  viewCount: 25,
  genres: ['Action', 'Fantasy'],
  cover: 'https://cdn.example.com/moonblade.jpg',
}

function renderAuthorComics() {
  return render(
    <MemoryRouter initialEntries={['/author/comics']}>
      <Routes>
        <Route path="/author/comics" element={<AuthorComics />} />
        <Route path="/author/comics/:id" element={<div>Comic detail route</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Author My Comics workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AuthorComicApi.getAuthorComicsApi.mockResolvedValue([])
    AuthorComicApi.getAuthorChapterUploadStatusApi.mockResolvedValue({
      taskId: 'task-1',
      status: 'COMPLETED',
      progress: 100,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads and displays comics belonging to the author', async () => {
    AuthorComicApi.getAuthorComicsApi.mockResolvedValue([draftComic])

    renderAuthorComics()

    expect(await screen.findByText('Moonblade Chronicle')).toBeInTheDocument()
    expect(AuthorComicApi.getAuthorComicsApi).toHaveBeenCalledWith({
      page: 1,
      size: 100,
    })
    expect(screen.getByText(/1 comics/i)).toBeInTheDocument()
    expect(screen.getByText(/1 chapters/i)).toBeInTheDocument()
  })

  it('uploads a cover and creates a comic draft from entered information', async () => {
    const coverFile = new File(['cover-bytes'], 'moonblade-cover.png', {
      type: 'image/png',
    })
    const createdComic = {
      ...draftComic,
      id: 'comic-created',
      chapterCount: 0,
    }
    UploadApi.uploadImageApi.mockResolvedValue(
      'https://cdn.example.com/uploaded-cover.png',
    )
    AuthorComicApi.createAuthorComicApi.mockResolvedValue(createdComic)

    renderAuthorComics()
    await screen.findByText('No comics yet')

    fireEvent.click(screen.getByRole('button', { name: '+ Create Comic' }))
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: '  Moonblade Chronicle  ' },
    })
    fireEvent.change(screen.getByLabelText(/original language/i), {
      target: { value: 'Japanese' },
    })
    fireEvent.change(screen.getByLabelText(/minimum age/i), {
      target: { value: '16' },
    })
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: '  A swordswoman protects the moon kingdom.  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Action' }))

    const coverInput = document.querySelector('input[type="file"][accept="image/*"]')
    fireEvent.change(coverInput, { target: { files: [coverFile] } })
    expect(screen.getByText('moonblade-cover.png')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create Draft' }))

    await waitFor(() => {
      expect(UploadApi.uploadImageApi).toHaveBeenCalledWith(coverFile)
      expect(AuthorComicApi.createAuthorComicApi).toHaveBeenCalledWith({
        title: 'Moonblade Chronicle',
        summary: 'A swordswoman protects the moon kingdom.',
        language: 'Japanese',
        minimumAge: 16,
        publicationStatus: 'ONGOING',
        genres: ['Action'],
        cover: 'https://cdn.example.com/uploaded-cover.png',
      })
    })
    expect(toast.info).toHaveBeenCalledWith('Uploading cover image...')
    expect(toast.success).toHaveBeenCalledWith(
      'Comic draft created successfully.',
    )
    expect(await screen.findByText('Comic detail route')).toBeInTheDocument()
  })

  it('validates the required comic fields before calling upload APIs', async () => {
    renderAuthorComics()
    await screen.findByText('No comics yet')

    fireEvent.click(screen.getByRole('button', { name: '+ Create Comic' }))
    fireEvent.change(screen.getByLabelText(/original language/i), {
      target: { value: 'English' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Draft' }))

    expect(await screen.findByText('Title is required.')).toBeInTheDocument()
    expect(UploadApi.uploadImageApi).not.toHaveBeenCalled()
    expect(AuthorComicApi.createAuthorComicApi).not.toHaveBeenCalled()
  })

  it('uploads a correctly named ZIP chapter with the expected FormData', async () => {
    AuthorComicApi.getAuthorComicsApi.mockResolvedValue([draftComic])
    AuthorComicApi.uploadAuthorChapterZipApi.mockResolvedValue({
      taskId: 'task-1',
      status: 'QUEUED',
      progress: 0,
    })
    const realSetTimeout = window.setTimeout.bind(window)
    const timeoutSpy = vi
      .spyOn(window, 'setTimeout')
      .mockImplementation((callback, delay, ...args) => {
        if (delay === 2500) return 0
        return realSetTimeout(callback, delay, ...args)
      })
    const chapterFile = new File(['zip-bytes'], 'Chapter 2.zip', {
      type: 'application/zip',
    })

    renderAuthorComics()
    await screen.findByText('Moonblade Chronicle')
    fireEvent.click(screen.getByRole('button', { name: /add chapter/i }))

    fireEvent.change(screen.getByLabelText(/chapter number/i), {
      target: { value: '2' },
    })
    fireEvent.change(screen.getByLabelText(/chapter title/i), {
      target: { value: 'Moonlit Duel' },
    })
    const chapterInput = document.querySelector('input[type="file"][accept=".zip"]')
    fireEvent.change(chapterInput, { target: { files: [chapterFile] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload ZIP' }))

    await waitFor(() => {
      expect(AuthorComicApi.uploadAuthorChapterZipApi).toHaveBeenCalledTimes(1)
    })
    const [comicId, formData] =
      AuthorComicApi.uploadAuthorChapterZipApi.mock.calls[0]
    expect(comicId).toBe('comic-1')
    expect(formData).toBeInstanceOf(FormData)
    expect(formData.get('chapterNumber')).toBe('2')
    expect(formData.get('title')).toBe('Moonlit Duel')
    expect(formData.get('zipFile')).toBe(chapterFile)
    expect(toast.success).toHaveBeenCalledWith(
      'Chapter accepted for processing.',
    )
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2500)
  })

  it('rejects an incorrectly named chapter archive before upload', async () => {
    AuthorComicApi.getAuthorComicsApi.mockResolvedValue([draftComic])
    const invalidFile = new File(['zip-bytes'], 'moonblade.zip', {
      type: 'application/zip',
    })

    renderAuthorComics()
    await screen.findByText('Moonblade Chronicle')
    fireEvent.click(screen.getByRole('button', { name: /add chapter/i }))
    const chapterInput = document.querySelector('input[type="file"][accept=".zip"]')
    fireEvent.change(chapterInput, { target: { files: [invalidFile] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload ZIP' }))

    expect(
      await screen.findByText(/chapter archive name must be like/i),
    ).toBeInTheDocument()
    expect(AuthorComicApi.uploadAuthorChapterZipApi).not.toHaveBeenCalled()
  })

  it('submits a draft comic to moderator review and updates its state', async () => {
    AuthorComicApi.getAuthorComicsApi.mockResolvedValue([draftComic])
    AuthorComicApi.submitAuthorComicReviewApi.mockResolvedValue({
      moderationStatus: 'SUBMITTED_FOR_REVIEW',
    })

    renderAuthorComics()
    await screen.findByText('Moonblade Chronicle')
    fireEvent.click(screen.getByRole('button', { name: 'Push Review' }))

    await waitFor(() => {
      expect(AuthorComicApi.submitAuthorComicReviewApi).toHaveBeenCalledWith(
        'comic-1',
      )
    })
    expect(toast.success).toHaveBeenCalledWith(
      'Comic submitted for moderator review.',
    )
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Push Review' }),
      ).not.toBeInTheDocument()
    })
  })
})
