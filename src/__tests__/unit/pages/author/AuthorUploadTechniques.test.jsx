import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AuthorComics from '../../../../pages/author/AuthorComics'
import * as AuthorComicApi from '../../../../services/api/AuthorComicApi'

vi.mock('../../../../services/api/AuthorComicApi', () => ({
  createAuthorComicApi: vi.fn(),
  getAuthorChapterUploadStatusApi: vi.fn(),
  getAuthorComicsApi: vi.fn(),
  submitAuthorComicReviewApi: vi.fn(),
  uploadAuthorChapterZipApi: vi.fn(),
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

describe('Author Upload - Testing Techniques', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AuthorComicApi.getAuthorComicsApi.mockResolvedValue([{
      id: 'comic-1',
      title: 'Upload Test Comic',
      chapterCount: 0,
      moderationStatus: 'DRAFT',
    }])
    AuthorComicApi.getAuthorChapterUploadStatusApi.mockResolvedValue({
      taskId: 'task-1',
      status: 'COMPLETED',
      progress: 100,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. Boundary Value Analysis (BVA): Chapter Number Input', () => {
    const testCases = [
      { input: '-1', valid: false },
      { input: '0', valid: false },
      { input: '0.5', valid: true },
      { input: '1', valid: true },
      { input: '999999', valid: true },
    ]

    testCases.forEach(({ input, valid }) => {
      it(`handles chapter number boundary: ${input} (Expected Valid: ${valid})`, async () => {
        AuthorComicApi.uploadAuthorChapterZipApi.mockResolvedValue({ taskId: 't1' })
        
        renderAuthorComics()
        await screen.findByText('Upload Test Comic')

        fireEvent.click(screen.getByRole('button', { name: /add chapter/i }))
        
        fireEvent.change(screen.getByLabelText(/chapter number/i), { target: { value: input } })
        
        const validFile = new File(['dummy'], 'Chapter 1.zip', { type: 'application/zip' })
        const fileInput = document.querySelector('input[type="file"][accept=".zip"]')
        fireEvent.change(fileInput, { target: { files: [validFile] } })
        
        fireEvent.click(screen.getByRole('button', { name: 'Upload ZIP' }))
        
        if (!valid) {
          expect(await screen.findByText(/Chapter number is required and must be a positive number/i)).toBeInTheDocument()
          expect(AuthorComicApi.uploadAuthorChapterZipApi).not.toHaveBeenCalled()
        } else {
          await waitFor(() => {
            expect(AuthorComicApi.uploadAuthorChapterZipApi).toHaveBeenCalled()
          })
        }
      })
    })
  })

  describe('2. Decision Table: ZIP File Upload Combinations', () => {
    // Variables: Valid Chapter Number, Valid File Selection, Valid File Name
    // Rule 1: Valid Num, Valid File, Valid Name => Success
    // Rule 2: Valid Num, Valid File, Invalid Name => Fail (Name Regex)
    // Rule 3: Valid Num, No File => Fail (Please select)
    // Rule 4: Invalid Num, Valid File, Valid Name => Fail (Chapter number invalid)

    const rules = [
      {
        desc: 'Rule 1: Valid all',
        chapNum: '1',
        fileName: 'Chapter 1.zip',
        fileSelected: true,
        expectedError: null,
      },
      {
        desc: 'Rule 2: Invalid Name (Missing "Chapter" prefix)',
        chapNum: '2',
        fileName: 'Volume 1.zip',
        fileSelected: true,
        expectedError: "Chapter archive name must be like 'Chapter 1.zip' or 'Chapter 1,5.zip'.",
      },
      {
        desc: 'Rule 3: No file selected',
        chapNum: '3',
        fileName: null,
        fileSelected: false,
        expectedError: 'Please select a .zip chapter file.',
      },
      {
        desc: 'Rule 4: Invalid Chapter Number (Empty)',
        chapNum: '',
        fileName: 'Chapter 4.zip',
        fileSelected: true,
        expectedError: 'Chapter number is required and must be a positive number.',
      }
    ]

    rules.forEach((rule) => {
      it(`evaluates ${rule.desc}`, async () => {
        AuthorComicApi.uploadAuthorChapterZipApi.mockResolvedValue({ taskId: 't2' })
        
        renderAuthorComics()
        await screen.findByText('Upload Test Comic')

        fireEvent.click(screen.getByRole('button', { name: /add chapter/i }))
        
        fireEvent.change(screen.getByLabelText(/chapter number/i), { target: { value: rule.chapNum } })
        
        if (rule.fileSelected) {
          const file = new File(['dummy'], rule.fileName, { type: 'application/zip' })
          const fileInput = document.querySelector('input[type="file"][accept=".zip"]')
          fireEvent.change(fileInput, { target: { files: [file] } })
        }
        
        fireEvent.click(screen.getByRole('button', { name: 'Upload ZIP' }))
        
        if (rule.expectedError) {
          expect(await screen.findByText(rule.expectedError)).toBeInTheDocument()
          expect(AuthorComicApi.uploadAuthorChapterZipApi).not.toHaveBeenCalled()
        } else {
          await waitFor(() => {
            expect(AuthorComicApi.uploadAuthorChapterZipApi).toHaveBeenCalled()
          })
        }
      })
    })
  })

  describe('3. Error Guessing: Abnormal File Inputs', () => {
    it('handles a 0-byte ZIP file safely (Assuming backend validation handles it, frontend passes it if name is valid)', async () => {
      AuthorComicApi.uploadAuthorChapterZipApi.mockResolvedValue({ taskId: 't3' })
      
      renderAuthorComics()
      await screen.findByText('Upload Test Comic')

      fireEvent.click(screen.getByRole('button', { name: /add chapter/i }))
      
      fireEvent.change(screen.getByLabelText(/chapter number/i), { target: { value: '1' } })
      
      const zeroByteFile = new File([], 'Chapter 1.zip', { type: 'application/zip' })
      // File size is 0, but valid name and extension
      const fileInput = document.querySelector('input[type="file"][accept=".zip"]')
      fireEvent.change(fileInput, { target: { files: [zeroByteFile] } })
      
      fireEvent.click(screen.getByRole('button', { name: 'Upload ZIP' }))
      
      await waitFor(() => {
        expect(AuthorComicApi.uploadAuthorChapterZipApi).toHaveBeenCalled()
      })
      // If we had frontend size validation, it would assert error here instead.
    })
  })
})
