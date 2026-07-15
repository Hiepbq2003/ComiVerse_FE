import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthorLayout from '../../components/layout/AuthorLayout'
import {
  createAuthorComicApi,
  getAuthorChapterUploadStatusApi,
  getAuthorComicPackageUploadStatusApi,
  getAuthorComicsApi,
  uploadAuthorChapterZipApi,
  uploadAuthorComicPackageZipApi,
} from '../../services/api/AuthorComicApi'
import { uploadImageApi } from '../../services/api/UploadApi'

const GENRE_OPTIONS = [
  'Action',
  'Adventure',
  'Fantasy',
  'Romance',
  'Drama',
  'Mystery',
  'Cultivation',
  'Sci-Fi',
  'Comedy',
  'Horror',
]

const normalizeArrayResponse = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const normalizeGenres = (genres) => {
  if (Array.isArray(genres)) {
    return genres
      .map((genre) => (typeof genre === 'string' ? genre : genre?.name || genre?.title || genre?.label))
      .filter(Boolean)
  }
  if (typeof genres === 'string' && genres.trim()) {
    return genres.split(',').map((genre) => genre.trim()).filter(Boolean)
  }
  return []
}

const getComicId = (comic) => comic?.id || comic?.comicId || comic?._id

const getComicCover = (comic) => comic?.coverImageUrl || comic?.coverUrl || comic?.cover || comic?.thumbnail || ''

const getChapterCount = (comic) => (
  comic?.chapterCount ?? comic?.chapters ?? comic?.totalChapters ?? 0
)

const getViews = (comic) => comic?.views ?? comic?.viewCount ?? comic?.totalViews ?? 0

const formatPublicationStatus = (status) => {
  const value = (status || 'ONGOING').toString().toUpperCase()
  if (value === 'HIATUS' || value === 'PAUSED' || value === 'ON_HIATUS') return 'On Hiatus'
  if (value === 'COMPLETED' || value === 'COMPLETE') return 'Completed'
  if (value === 'ARCHIVED') return 'Archived'
  return 'Ongoing'
}

const formatModerationStatus = (status) => {
  const value = (status || 'SUBMITTED_FOR_REVIEW').toString().toUpperCase()
  if (value === 'APPROVED' || value === 'PUBLISHED') return '✓ Approved'
  if (value === 'HIDDEN' || value === 'UNPUBLISHED') return '👁 Hidden'
  if (value === 'REJECTED') return '✕ Rejected'
  if (value === 'DRAFT') return 'Draft'
  if (value === 'PREVIEW_READY') return 'Preview Ready'
  return '⏳ Pending Review'
}

const getModerationClass = (status) => {
  const value = (status || '').toString().toUpperCase()
  if (value === 'APPROVED' || value === 'PUBLISHED') return 'approved'
  if (value === 'HIDDEN' || value === 'UNPUBLISHED') return 'hidden'
  if (value === 'REJECTED') return 'rejected'
  if (value === 'DRAFT' || value === 'PREVIEW_READY') return 'draft'
  return 'pending'
}

const getPublicationClass = (status) => {
  const value = (status || 'ONGOING').toString().toUpperCase()
  if (value === 'COMPLETED' || value === 'COMPLETE') return 'completed'
  if (value === 'HIATUS' || value === 'PAUSED' || value === 'ON_HIATUS') return 'hiatus'
  return 'ongoing'
}

const formatDate = (value) => {
  if (!value) return 'Recently'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const isComicPackageZipFile = (file) => {
  const name = file?.name?.toLowerCase() || ''
  return name.endsWith('.zip')
}

const isChapterCbzFile = (file) => {
  const name = file?.name?.toLowerCase() || ''
  return name.endsWith('.cbz')
}

const CHAPTER_ARCHIVE_NAME_REGEX = /^chapter\s+[1-9][0-9]*(?:[,.][0-9]+)?\.cbz$/i

const UPLOAD_POLL_INTERVAL_MS = 2500
const COMICS_PER_PAGE = 12
const isFinalUploadStatus = (status) => ['COMPLETED', 'FAILED'].includes((status || '').toString().toUpperCase())
const getTaskId = (task) => task?.taskId || task?.id || task?.uploadTaskId

const formatUploadStatus = (status) => {
  const value = (status || 'QUEUED').toString().toUpperCase()
  if (value === 'COMPLETED') return 'Completed'
  if (value === 'FAILED') return 'Failed'
  if (value === 'PROCESSING') return 'Processing'
  return 'Queued'
}

const buildChapterFormData = ({ chapterNumber, chapterTitle, zipFile }) => {
  const formData = new FormData()
  formData.append('chapterNumber', chapterNumber)
  formData.append('title', chapterTitle || '')
  formData.append('zipFile', zipFile)
  return formData
}

function ZipPackagingGuide({ onOpenGuide }) {
  return (
    <div className="author-upload-guide-card">
      <div>
        <strong>Comic package ZIP rules</strong>
        <p>Upload Comic uses one outer ZIP containing many chapter CBZ files.</p>
      </div>
      <ul>
        <li>Outer file: <code>TenTruyen.zip</code>.</li>
        <li>Required: <code>TenTruyen.zip/Chapter 1.cbz</code>, <code>TenTruyen.zip/Chapter 2.cbz</code>.</li>
        <li>Do not wrap chapter CBZ files in another folder inside the outer ZIP.</li>
        <li>Inside each chapter CBZ: page images directly at root like <code>01.jpg</code>, <code>02.jpg</code>.</li>
        <li>Do not put page images directly in the outer comic package archive.</li>
      </ul>
      <button type="button" className="author-guide-link" onClick={onOpenGuide}>Open full upload guide</button>
    </div>
  )
}


function ChapterZipPackagingGuide({ onOpenGuide }) {
  return (
    <div className="author-upload-guide-card">
      <div>
        <strong>Chapter CBZ rules</strong>
        <p>Add Chapter uses one CBZ containing page images directly at root.</p>
      </div>
      <ul>
        <li>File: <code>Chapter 2.cbz</code>.</li>
        <li>Inside CBZ: <code>01.jpg</code>, <code>02.jpg</code>, <code>03.jpg</code>.</li>
        <li>Do not put another archive or wrapper folder inside a chapter CBZ.</li>
        <li>Do not include PDF, TXT, PSD, README, hidden files, or <code>__MACOSX</code>.</li>
      </ul>
      <button type="button" className="author-guide-link" onClick={onOpenGuide}>Open full upload guide</button>
    </div>
  )
}

function buildComicPackageFormData({ title, slug, description, minimumAge, genres, publicationStatus, coverImageUrl, comicPackageZip }) {
  const formData = new FormData()
  formData.append('title', title || '')
  formData.append('slug', slug || '')
  formData.append('description', description || '')
  formData.append('minimumAge', minimumAge ?? 13)
  formData.append('publicationStatus', publicationStatus || 'ONGOING')
  formData.append('coverImageUrl', coverImageUrl || '')
  genres.forEach((genre) => formData.append('genres', genre))
  formData.append('comicZip', comicPackageZip)
  return formData
}

function CreateComicModal({ onClose, onCreated, onOpenGuide }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    minimumAge: 13,
    genres: [],
    publicationStatus: 'ONGOING',
    coverImageUrl: '',
    coverFile: null,
    comicPackageZip: null,
  })
  const [error, setError] = useState('')

  const toggleGenre = (genre) => {
    setForm((current) => ({
      ...current,
      genres: current.genres.includes(genre)
        ? current.genres.filter((item) => item !== genre)
        : [...current.genres, genre],
    }))
  }

  const goNext = () => {
    if (step === 1 && !form.title.trim()) {
      setError('Title is required.')
      return
    }
    if (step === 1 && (Number(form.minimumAge) < 0 || Number(form.minimumAge) > 21)) {
      setError('Minimum age must be between 0 and 21.')
      return
    }
    if (step === 3 && form.comicPackageZip && !isComicPackageZipFile(form.comicPackageZip)) {
      setError('Comic package must be an outer .zip file.')
      return
    }
    setError('')
    setStep((current) => Math.min(current + 1, 3))
  }

  const handleCreateRealComic = async () => {
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    if (Number(form.minimumAge) < 0 || Number(form.minimumAge) > 21) {
      setError('Minimum age must be between 0 and 21.')
      return
    }
    if (form.comicPackageZip && !isComicPackageZipFile(form.comicPackageZip)) {
      setError('Comic package must be an outer .zip file.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      let coverImageUrl = form.coverImageUrl.trim()
      if (form.coverFile) {
        coverImageUrl = await uploadImageApi(form.coverFile)
      }

      const minimumAgeValue = form.minimumAge === '' ? 13 : Number(form.minimumAge)

      if (form.comicPackageZip) {
        const packageTask = await uploadAuthorComicPackageZipApi(
          buildComicPackageFormData({
            title: form.title.trim(),
            slug: form.slug.trim(),
            description: form.description.trim(),
            minimumAge: minimumAgeValue,
            genres: form.genres,
            publicationStatus: form.publicationStatus,
            coverImageUrl,
            comicPackageZip: form.comicPackageZip,
          }),
        )
        onCreated(null, null, packageTask)
        onClose()
        return
      }

      const createdComic = await createAuthorComicApi({
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        minimumAge: minimumAgeValue,
        genres: form.genres,
        publicationStatus: form.publicationStatus,
        coverImageUrl,
      })

      const comicId = getComicId(createdComic)
      onCreated(createdComic, null, null)
      onClose()
      if (comicId) {
        navigate(`/author/comics/${comicId}`, {
          state: { message: 'Comic created and submitted for moderator review.' },
        })
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not create comic. Please check API/backend connection.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (step < 3) {
      goNext()
      return
    }
    await handleCreateRealComic()
  }

  return (
    <div className="author-modal-backdrop" role="presentation">
      <form className="author-modal author-comic-modal" onSubmit={handleSubmit}>
        <div className="author-modal-head">
          <div>
            <h2>Upload New Comic</h2>
            <p>Step {step} of 3 · real API upload</p>
          </div>
          <button type="button" className="author-icon-btn ghost" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="author-step-line three-step">
          <span className="active" />
          <span className={step >= 2 ? 'active' : ''} />
          <span className={step === 3 ? 'active' : ''} />
        </div>

        {step === 1 && (
          <div className="author-modal-body">
            <label className="author-form-label">
              Title *
              <input
                className="author-input"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="New Life"
              />
            </label>

            <label className="author-form-label">
              Slug
              <input
                className="author-input"
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                placeholder="new-life"
              />
              <span className="author-field-hint">Optional. Leave empty to let backend generate it from title.</span>
            </label>

            <label className="author-form-label">
              Minimum Age
              <input
                className="author-input"
                type="number"
                min="0"
                max="21"
                value={form.minimumAge}
                onChange={(event) => setForm({ ...form, minimumAge: event.target.value })}
                placeholder="13"
              />
            </label>

            <label className="author-form-label">
              Description
              <textarea
                className="author-textarea"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Write a short synopsis for readers and moderators."
              />
            </label>

            <div className="author-form-label">
              Genres
              <div className="author-genre-pills selectable">
                {GENRE_OPTIONS.map((genre) => (
                  <button
                    type="button"
                    key={genre}
                    className={`author-genre-pill ${form.genres.includes(genre) ? 'selected' : ''}`}
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="author-modal-body">
            <div className="author-form-label">
              Publication Status
              <div className="author-segmented">
                {[
                  ['ONGOING', 'Ongoing'],
                  ['COMPLETED', 'Completed'],
                  ['PAUSED', 'Paused'],
                  ['ARCHIVED', 'Archived'],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={form.publicationStatus === value ? 'active' : ''}
                    onClick={() => setForm({ ...form, publicationStatus: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="author-form-label">
              Cover Image File
              <div className="author-upload-zone file-picker-zone">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={(event) => setForm({ ...form, coverFile: event.target.files?.[0] || null })}
                />
                <div className="author-upload-icon">⇧</div>
                <strong>{form.coverFile ? form.coverFile.name : 'Select cover image'}</strong>
                <span>Recommended for real upload. Backend stores it on Cloudinary through /upload/image.</span>
              </div>
            </label>

            <label className="author-form-label">
              Or Cover Image URL
              <input
                className="author-input"
                value={form.coverImageUrl}
                onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })}
                placeholder="https://.../cover.png"
              />
            </label>

            <div className="author-alert warning">
              ⚠ On the next step, you can either create only the comic profile or attach a full comic package ZIP.
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="author-modal-body">
            <div className="author-alert info">
              Upload Comic accepts a full comic package. The outer ZIP is named after the comic and contains chapter CBZ files.
            </div>

            <label className="author-form-label">
              Comic Package ZIP
              <div className="author-upload-zone file-picker-zone">
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  onChange={(event) => setForm({ ...form, comicPackageZip: event.target.files?.[0] || null })}
                />
                <div className="author-upload-icon">⇧</div>
                <strong>{form.comicPackageZip ? form.comicPackageZip.name : 'Optional: select full comic package ZIP'}</strong>
                <span>Example: TenTruyen.zip contains Chapter 1.cbz and Chapter 2.cbz directly. Leave empty to create only the comic profile.</span>
              </div>
            </label>
            <ZipPackagingGuide onOpenGuide={onOpenGuide} />
          </div>
        )}

        {error && <div className="author-form-error">{error}</div>}

        <div className="author-modal-actions">
          {step > 1 && (
            <button type="button" className="btn-author-action" onClick={() => setStep(step - 1)} disabled={submitting}>Back</button>
          )}
          <button type="button" className="btn-author-action" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-author-action black" disabled={submitting}>
            {step < 3 ? 'Next' : submitting ? 'Sending file...' : form.comicPackageZip ? 'Upload Comic Package' : 'Create Comic Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}

function AddChapterModal({ comic, onClose, onUploaded, onOpenGuide }) {
  const [chapterNumber, setChapterNumber] = useState((Number(getChapterCount(comic)) || 0) + 1)
  const [title, setTitle] = useState('')
  const [zipFile, setZipFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!zipFile) {
      setError('Please select a .cbz chapter file.')
      return
    }
    if (!isChapterCbzFile(zipFile)) {
      setError('Chapter file must be a .cbz file.')
      return
    }
    if (!CHAPTER_ARCHIVE_NAME_REGEX.test(zipFile.name || '')) {
      setError("Chapter archive name must be like 'Chapter 1.cbz' or 'Chapter 1,5.cbz'.")
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const uploadTask = await uploadAuthorChapterZipApi(
        getComicId(comic),
        buildChapterFormData({ chapterNumber, chapterTitle: title, zipFile }),
      )
      onUploaded(uploadTask, comic)
      onClose()
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not upload CBZ. Please check API/backend connection.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="author-modal-backdrop" role="presentation">
      <form className="author-modal author-chapter-modal" onSubmit={handleSubmit}>
        <div className="author-modal-head">
          <div>
            <h2>Add Chapter</h2>
            <p>{comic.title}</p>
          </div>
          <button type="button" className="author-icon-btn ghost" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="author-chapter-form-grid">
          <label className="author-form-label">
            Chapter # *
            <input
              className="author-input"
              type="text"
              value={chapterNumber}
              onChange={(event) => setChapterNumber(event.target.value)}
              placeholder="1 or 1,5"
            />
          </label>

          <label className="author-form-label">
            Chapter Title
            <input
              className="author-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Optional title"
            />
          </label>
        </div>

        <label className="author-form-label">
          Upload Pages (.cbz) *
          <div className="author-upload-zone file-picker-zone">
            <input
              type="file"
              accept=".cbz,application/vnd.comicbook+zip,application/x-cbz"
              onChange={(event) => setZipFile(event.target.files?.[0] || null)}
            />
            <div className="author-upload-icon">⇧</div>
            <strong>{zipFile ? zipFile.name : 'Drop chapter CBZ or select file'}</strong>
            <span>Backend extracts root images from CBZ, sorts by filename, uploads images to Cloudinary, then returns preview.</span>
          </div>
        </label>

        <ChapterZipPackagingGuide onOpenGuide={onOpenGuide} />

        <div className="author-alert info">
          ℹ Chapter is uploaded as preview first. Open the comic detail page and submit it for moderator review after checking pages.
        </div>

        {error && <div className="author-form-error">{error}</div>}

        <div className="author-modal-actions">
          <button type="button" className="btn-author-action" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-author-action black" disabled={submitting}>
            {submitting ? 'Sending file...' : 'Upload CBZ'}
          </button>
        </div>
      </form>
    </div>
  )
}

function AuthorComics() {
  const navigate = useNavigate()
  const location = useLocation()
  const [comics, setComics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUploadGuide, setShowUploadGuide] = useState(Boolean(location.state?.openUploadGuide))
  const [chapterTarget, setChapterTarget] = useState(null)
  const [uploadTasks, setUploadTasks] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  const loadComics = async (page = currentPage) => {
    setLoading(true)
    setError('')
    try {
      const response = await getAuthorComicsApi({ page, size: COMICS_PER_PAGE })
      const normalizedComics = normalizeArrayResponse(response)
      const metadata = response?.metadata || {}
      const nextTotalPages = Math.max(1, Number(metadata.totalPages) || 1)

      setComics(normalizedComics)
      setTotalPages(nextTotalPages)
      setTotalElements(Number(metadata.totalElements) || normalizedComics.length)

      if (page > nextTotalPages) {
        setCurrentPage(nextTotalPages)
      }
    } catch (error) {
      console.error('Load author comics failed:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      })

      const status = error.response?.status

      if (status === 401) {
        setError('Phiên đăng nhập đã hết hạn hoặc thiếu token. Vui lòng đăng nhập lại.')
      } else if (status === 403) {
        setError('Tài khoản của bạn không có quyền AUTHOR.')
      } else if (status === 404) {
        setError('Không tìm thấy API author comics. Kiểm tra endpoint backend.')
      } else if (status >= 500) {
        setError('Backend đang lỗi khi tải danh sách truyện của author.')
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        setError('Không kết nối được backend. Kiểm tra backend có chạy không, proxy Vite, CORS hoặc baseURL.')
      } else {
        setError('Không thể tải danh sách truyện author.')
      }
    }finally {
    setLoading(false)
  }
}

useEffect(() => {
  loadComics(currentPage)
}, [currentPage])

const pendingReviewCount = useMemo(() => comics.filter((comic) => {
  const status = (comic.moderationStatus || comic.status || '').toString().toUpperCase()
  return status.includes('PENDING') || status.includes('REVIEW') || status.includes('SUBMITTED')
}).length, [comics])

const upsertUploadTask = (task, extra = {}) => {
  const taskId = getTaskId(task)
  if (!taskId) return

  setUploadTasks((current) => {
    const nextTask = { ...extra, ...task, taskId }
    const exists = current.some((item) => getTaskId(item) === taskId)
    if (exists) {
      return current.map((item) => (getTaskId(item) === taskId ? { ...item, ...nextTask } : item))
    }
    return [nextTask, ...current]
  })
}

const pollComicPackageTask = (taskId) => {
  const poll = async () => {
    try {
      const latest = await getAuthorComicPackageUploadStatusApi(taskId)
      upsertUploadTask(latest)

      if (!isFinalUploadStatus(latest?.status)) {
        window.setTimeout(poll, UPLOAD_POLL_INTERVAL_MS)
        return
      }

      if (latest?.status === 'COMPLETED') {
        const createdComic = latest?.comicPackage?.comic || latest?.comic
        const comicId = getComicId(createdComic)
        if (createdComic) {
          setComics((current) => {
            const exists = current.some((comic) => getComicId(comic) === comicId)
            return exists ? current.map((comic) => (getComicId(comic) === comicId ? createdComic : comic)) : [createdComic, ...current]
          })
        }
        if (comicId) {
          navigate(`/author/comics/${comicId}`, {
            state: { message: latest?.message || 'Comic package processed. Preview chapters before submitting them for review.' },
          })
        }
      }
    } catch (err) {
      upsertUploadTask({ taskId, status: 'FAILED', error: err?.message || 'Could not check upload status.' })
    }
  }

  window.setTimeout(poll, UPLOAD_POLL_INTERVAL_MS)
}

const pollChapterTask = (comicId, taskId) => {
  const poll = async () => {
    try {
      const latest = await getAuthorChapterUploadStatusApi(comicId, taskId)
      upsertUploadTask(latest)

      if (!isFinalUploadStatus(latest?.status)) {
        window.setTimeout(poll, UPLOAD_POLL_INTERVAL_MS)
        return
      }

      if (latest?.status === 'COMPLETED') {
        const preview = latest?.chapter
        setComics((current) => current.map((comic) => (
          getComicId(comic) === comicId
            ? { ...comic, chapterCount: Number(getChapterCount(comic)) + 1, chapters: Number(getChapterCount(comic)) + 1, latestChapterPreview: preview }
            : comic
        )))
        navigate(`/author/comics/${comicId}`, {
          state: { message: 'Chapter CBZ processed. Submit it for moderator review after checking preview pages.' },
        })
      }
    } catch (err) {
      upsertUploadTask({ taskId, status: 'FAILED', error: err?.message || 'Could not check upload status.' })
    }
  }

  window.setTimeout(poll, UPLOAD_POLL_INTERVAL_MS)
}

const handleCreated = (createdComic, _chapterPreview, uploadTask) => {
  const taskId = getTaskId(uploadTask)
  if (taskId) {
    upsertUploadTask(uploadTask, { title: 'Comic package upload' })
    pollComicPackageTask(taskId)
    return
  }

  if (createdComic) {
    setComics((current) => [createdComic, ...current].slice(0, COMICS_PER_PAGE))
    setTotalElements((current) => current + 1)
    if (totalElements > 0 && totalElements % COMICS_PER_PAGE === 0) {
      setTotalPages((current) => current + 1)
    }
    setCurrentPage(1)
  }
}

const handleChapterUploaded = (uploadTask, targetComic = chapterTarget) => {
  const taskId = getTaskId(uploadTask)
  const comicId = getComicId(targetComic)
  if (!taskId || !comicId) return

  upsertUploadTask(uploadTask, {
    title: `Chapter upload · ${targetComic?.title || 'Comic'}`,
    comicId,
  })
  pollChapterTask(comicId, taskId)
}

  return (
    <AuthorLayout activeNav="comics">
      <div className="author-comics-page">
        <div className="author-list-header-row">
          <div>
            <h1>My Comics</h1>
            <p>{loading ? 'Loading comics...' : `${comics.length} comics · ${pendingReviewCount} pending review`}</p>
          </div>
          <div className="author-header-actions">
            <Link className="btn-author-action" to="/author/upload-guide">Upload Guide</Link>
            <button className="btn-author-action black large" onClick={() => setShowCreateModal(true)}>
              + Upload New Comic
            </button>
          </div>
        </div>

      {error && <div className="author-alert warning">{error}</div>}

      {uploadTasks.length > 0 && (
        <div className="author-upload-task-list">
          {uploadTasks.map((task) => {
            const statusValue = (task.status || 'QUEUED').toString().toLowerCase()
            return (
              <div className={`author-upload-task-card ${statusValue}`} key={getTaskId(task)}>
                <div>
                  <strong>{task.title || task.type || 'Upload task'}</strong>
                  <p>{task.error || task.message || 'Waiting for backend status...'}</p>
                </div>
                <div className="author-upload-task-meta">
                  <span>{formatUploadStatus(task.status)}</span>
                  <small>{task.progress ?? 0}%</small>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && comics.length === 0 && (
        <div className="author-empty-state">
          <h2>No real comics yet</h2>
          <p>Create your first comic profile, upload a real cover image, then upload a chapter CBZ.</p>
          <button className="btn-author-action black" onClick={() => setShowCreateModal(true)}>Create First Comic</button>
        </div>
      )}

      <div className="author-comic-list">
        {comics.map((comic) => {
          const comicId = getComicId(comic)
          const moderationStatus = comic.moderationStatus || comic.status
          const publicationStatus = comic.publicationStatus || comic.comicStatus
          const genres = normalizeGenres(comic.genres)
          const cover = getComicCover(comic)

          return (
            <article className="author-comic-list-card" key={comicId || comic.title}>
              <div className="author-comic-cover-box">
                {cover ? <img src={cover} alt={comic.title} /> : <span>Cover</span>}
              </div>

              <div className="author-comic-card-main">
                <div className="author-comic-title-line">
                  <h2>{comic.title}</h2>
                  <span className={`author-status-badge ${getModerationClass(moderationStatus)}`}>
                    {formatModerationStatus(moderationStatus)}
                  </span>
                  <span className={`author-publication-badge ${getPublicationClass(publicationStatus)}`}>
                    {formatPublicationStatus(publicationStatus)}
                  </span>
                </div>

                <div className="author-comic-meta-line">
                  <span>📖 {getChapterCount(comic)} chapters</span>
                  <span>👁 {getViews(comic)} views</span>
                  <span>💰 {comic.revenue || comic.totalRevenue || '0đ'}</span>
                  <span>🔞 {comic.minimumAge ?? 13}+</span>
                  <span>🕘 {formatDate(comic.updatedAt || comic.createdAt)}</span>
                </div>

                <p className="author-comic-card-summary">{comic.description || comic.summary || 'No description has been added yet.'}</p>

                <div className="author-genre-pills">
                  {genres.slice(0, 4).map((genre) => (
                    <span className="author-genre-pill" key={genre}>{genre}</span>
                  ))}
                </div>
              </div>

                <div className="author-comic-card-actions">
                  <button className="btn-author-action black" onClick={() => navigate(`/author/comics/${comicId}`)}>
                    View Details
                  </button>
                  <button className="btn-author-action" onClick={() => setChapterTarget(comic)}>
                    + Add Chapter
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {showCreateModal && (
        <CreateComicModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}

      {chapterTarget && (
        <AddChapterModal
          comic={chapterTarget}
          onClose={() => setChapterTarget(null)}
          onUploaded={handleChapterUploaded}
        />
      )}
    </AuthorLayout>
  )
}

export default AuthorComics
