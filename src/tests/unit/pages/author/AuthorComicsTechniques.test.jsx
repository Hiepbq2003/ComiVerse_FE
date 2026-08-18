import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthorComics from '../../../../pages/author/AuthorComics'
import * as AuthorComicApi from '../../../../services/api/AuthorComicApi'
import * as UploadApi from '../../../../services/api/UploadApi'
import * as AuthorProfileApi from '../../../../services/api/AuthorProfileApi'

vi.mock('../../../../services/api/AuthorComicApi', () => ({
  checkAuthorComicTitleExistsApi: vi.fn(),
  createAuthorComicApi: vi.fn(),
  getAuthorChapterUploadStatusApi: vi.fn(),
  getAuthorComicsApi: vi.fn(),
  submitAuthorComicReviewApi: vi.fn(),
  uploadAuthorChapterZipApi: vi.fn(),
}))

vi.mock('../../../../services/api/UploadApi', () => ({
  uploadImageApi: vi.fn(),
}))

vi.mock('../../../../services/api/AuthorProfileApi', () => ({
  getAuthorProfileApi: vi.fn(),
}))

vi.mock('react-toastify', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

function renderAuthorComics() {
  return render(
    <MemoryRouter initialEntries={['/author/comics']}>
      <Routes>
        <Route path="/author/comics" element={<AuthorComics />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Author Comics - Testing Techniques', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AuthorProfileApi.getAuthorProfileApi.mockResolvedValue({
      licenseStatus: 'ACTIVE',
      canPublishComic: true,
    })
    AuthorComicApi.getAuthorComicsApi.mockResolvedValue([])
    AuthorComicApi.checkAuthorComicTitleExistsApi.mockResolvedValue(false)
    AuthorComicApi.getAuthorChapterUploadStatusApi.mockResolvedValue({
      taskId: 'task-1',
      status: 'COMPLETED',
      progress: 100,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. Equivalence Class Partitioning (ECP): Create Comic Required Fields', () => {
    it('shows error if Title is missing (Invalid EC)', async () => {
      renderAuthorComics()
      await screen.findByText('No comics yet')

      fireEvent.click(screen.getByRole('button', { name: '+ Create Comic' }))
      
      // Missing title, but provide language and cover
      fireEvent.change(screen.getByLabelText(/original language/i), { target: { value: 'Japanese' } })
      fireEvent.change(screen.getByLabelText(/or cover image url/i), { target: { value: 'http://test.com/cover.png' } })
      
      fireEvent.click(screen.getByRole('button', { name: 'Create Draft' }))
      
      expect(await screen.findByText('Title is required.')).toBeInTheDocument()
      expect(AuthorComicApi.createAuthorComicApi).not.toHaveBeenCalled()
    })

    it('shows error if Cover is missing (Invalid EC)', async () => {
      renderAuthorComics()
      await screen.findByText('No comics yet')

      fireEvent.click(screen.getByRole('button', { name: '+ Create Comic' }))
      
      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Valid Title' } })
      fireEvent.change(screen.getByLabelText(/original language/i), { target: { value: 'Japanese' } })
      
      // Do not upload file or provide URL
      fireEvent.click(screen.getByRole('button', { name: 'Create Draft' }))
      
      expect(await screen.findByText('Please upload a cover image or provide a cover image URL.')).toBeInTheDocument()
      expect(AuthorComicApi.createAuthorComicApi).not.toHaveBeenCalled()
    })
  })

  describe('2. Boundary Value Analysis (BVA): Minimum Age', () => {
    const testAges = [
      { age: '0', expected: 0 },
      { age: '1', expected: 1 },
      { age: '20', expected: 20 },
      { age: '21', expected: 21 },
    ]

    testAges.forEach(({ age, expected }) => {
      it(`handles minimum age input: ${age}`, async () => {
        AuthorComicApi.createAuthorComicApi.mockResolvedValue({ id: 'comic-1' })
        
        renderAuthorComics()
        await screen.findByText('No comics yet')

        fireEvent.click(screen.getByRole('button', { name: '+ Create Comic' }))
        
        fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Age Test Comic' } })
        fireEvent.change(screen.getByLabelText(/original language/i), { target: { value: 'English' } })
        fireEvent.change(screen.getByLabelText(/or cover image url/i), { target: { value: 'http://test.com/cover.png' } })
        
        // Input boundary age
        fireEvent.change(screen.getByLabelText(/minimum age/i), { target: { value: age } })
        
        fireEvent.click(screen.getByRole('button', { name: 'Create Draft' }))
        
        await waitFor(() => {
          expect(AuthorComicApi.createAuthorComicApi).toHaveBeenCalledWith(
            expect.objectContaining({ minimumAge: expected })
          )
        })
      })
    })
  })

  describe('3. Error Guessing: Malicious Inputs in Summary', () => {
    it('submits correctly even if summary contains XSS payload (Backend/Sanitizer must handle it, frontend passes it)', async () => {
      AuthorComicApi.createAuthorComicApi.mockResolvedValue({ id: 'comic-xss' })
      
      renderAuthorComics()
      await screen.findByText('No comics yet')

      fireEvent.click(screen.getByRole('button', { name: '+ Create Comic' }))
      
      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'XSS Test' } })
      fireEvent.change(screen.getByLabelText(/original language/i), { target: { value: 'English' } })
      fireEvent.change(screen.getByLabelText(/or cover image url/i), { target: { value: 'http://test.com/cover.png' } })
      
      const xssPayload = '"><script>alert("XSS")</script><img src=x onerror=alert(1)>'
      fireEvent.change(screen.getByLabelText(/description/i), { target: { value: xssPayload } })
      
      fireEvent.click(screen.getByRole('button', { name: 'Create Draft' }))
      
      await waitFor(() => {
        expect(AuthorComicApi.createAuthorComicApi).toHaveBeenCalledWith(
          expect.objectContaining({ summary: xssPayload })
        )
      })
    })
  })
})
