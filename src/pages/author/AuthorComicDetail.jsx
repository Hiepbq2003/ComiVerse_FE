import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { COMIC_LANGUAGE_OPTIONS } from '../../constants/comicLanguages'
import '../../assets/style/author/comics.css'
import '../../assets/style/author/upload-guide.css'
import UploadGuideModal from '../../components/author/UploadGuideModal'
import {
  deleteAuthorChapterApi,
  deleteAuthorComicApi,
  getAuthorChapterPreviewApi,
  getAuthorChapterUploadStatusApi,
  getAuthorComicByIdApi,
  getAuthorComicChaptersApi,
  getAuthorComicMetricsApi,
  submitAuthorChapterReviewApi,
  submitAuthorComicReviewApi,
  updateAuthorComicApi,
  uploadAuthorChapterZipApi,
} from '../../services/api/AuthorComicApi'

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

const getComicCover = (comic) => comic?.cover || ''

const getChapterId = (chapter) => chapter?.id || chapter?.chapterId || chapter?._id

const getChapterNumber = (chapter) => chapter?.chapterNumber ?? chapter?.number ?? chapter?.chapterNo ?? chapter?.index

const getChapterTitle = (chapter) => chapter?.title || chapter?.chapterTitle || 'Untitled Chapter'

const getChapterCount = (comic) => comic?.chapterCount ?? 0

const getChapterViews = (chapter) => chapter?.views ?? chapter?.viewCount ?? chapter?.totalViews ?? '—'

const normalizePublicationStatusValue = (status) => {
  const value = (status || 'ONGOING').toString().replace(/[-\s]+/g, '_').toUpperCase()
  if (value === 'COMPLETED' || value === 'COMPLETE') return 'COMPLETED'
  if (value === 'HIATUS') return 'HIATUS'
  if (value === 'CANCEL') return 'CANCEL'
  return 'ONGOING'
}

const isCbzFile = (file) => {
  const name = file?.name?.toLowerCase() || ''
  return name.endsWith('.cbz')
}

const UPLOAD_POLL_INTERVAL_MS = 2500
const getTaskId = (task) => task?.taskId || task?.id || task?.uploadTaskId
const isFinalUploadStatus = (status) => ['COMPLETED', 'FAILED'].includes((status || '').toString().toUpperCase())

const formatUploadStatus = (status) => {
  const value = (status || 'QUEUED').toString().toUpperCase()
  if (value === 'COMPLETED') return 'Completed'
  if (value === 'FAILED') return 'Failed'
  if (value === 'PROCESSING') return 'Processing'
  return 'Queued'
}

const CHAPTER_ZIP_NAME_REGEX = /^chapter\s+[1-9][0-9]*(?:[,.][0-9]+)?\.cbz$/i

const isChapterZipName = (file) => CHAPTER_ZIP_NAME_REGEX.test(file?.name || '')

const getChapterNumberFromZipName = (file) => {
  const match = (file?.name || '').match(/^chapter\s+([1-9][0-9]*(?:[,.][0-9]+)?)\.cbz$/i)
  return match ? match[1] : ''
}

const validateChapterZip = (file) => {
  if (!file) return 'Please select a .cbz chapter file.'
  if (!isCbzFile(file)) return 'Chapter file must be a .cbz file.'

  if (!isChapterZipName(file)) {
    return "Chapter archive name must be like 'Chapter 1.cbz' or 'Chapter 1,5.cbz'."
  }

  return ''
}

const buildChapterFormData = ({ chapterNumber, chapterTitle, zipFile }) => {
  const formData = new FormData()
  formData.append('chapterNumber', chapterNumber)
  formData.append('title', chapterTitle || '')
  formData.append('zipFile', zipFile)
  return formData
}

const formatStatus = (status) => {
  const value = (status || 'DRAFT').toString().toUpperCase()
  if (value === 'APPROVED' || value === 'PUBLISHED') return '✓ Approved'
  if (value === 'HIDDEN' || value === 'UNPUBLISHED') return '👁 Hidden'
  if (value === 'REJECTED') return '✕ Rejected'
  if (value === 'DRAFT') return 'Draft'
  if (value === 'PREVIEW_READY') return 'Preview Ready'
  return '⏳ Pending'
}

const getStatusClass = (status) => {
  const value = (status || '').toString().toUpperCase()
  if (value === 'APPROVED' || value === 'PUBLISHED') return 'approved'
  if (value === 'HIDDEN' || value === 'UNPUBLISHED') return 'hidden'
  if (value === 'REJECTED') return 'rejected'
  if (value === 'DRAFT' || value === 'PREVIEW_READY') return 'draft'
  return 'pending'
}

const formatDate = (value) => {
  if (!value) return '—'
  if (typeof value === 'string' && value.includes(',')) return value

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') return '0đ'
  if (typeof value === 'number') return `${value.toLocaleString('vi-VN')}đ`
  return value
}

function ZipPackagingGuideMini({ onOpenGuide }) {
  return (
    <div className="author-upload-guide-card compact">
      <strong>Chapter CBZ format</strong>
      <ul>
        <li>File name must be <code>Chapter 1.cbz</code> or <code>Chapter 1,5.cbz</code>.</li>
        <li>Inside the CBZ must be page images directly at root: <code>01.jpg</code>, <code>02.jpg</code>.</li>
        <li>No wrapper folder, nested archive, PDF, TXT, PSD, README, or hidden files. Each image max 10MB.</li>
      </ul>
      <button type="button" className="author-guide-link" onClick={onOpenGuide}>Read full guide</button>
    </div>
  )
}

function AddChapterModal({ comic, onClose, onUploaded, onOpenGuide }) {
  const [chapterNumber, setChapterNumber] = useState(String((Number(getChapterCount(comic)) || 0) + 1))
  const [title, setTitle] = useState('')
  const [zipFile, setZipFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()

    const zipError = validateChapterZip(zipFile)
    if (zipError) {
      setError(zipError)
      toast.warning(zipError)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      toast.info('Uploading chapter CBZ, please wait...')
      const uploadTask = await uploadAuthorChapterZipApi(
        getComicId(comic),
        buildChapterFormData({ chapterNumber, chapterTitle: title, zipFile }),
      )

      onUploaded(uploadTask)
      toast.success('Chapter uploaded successfully!')
      onClose()
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not upload CBZ. Please check API/backend connection.'
      setError(message)
      toast.error(message)
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
              onChange={(event) => {
                const file = event.target.files?.[0] || null
                setZipFile(file)

                const numberFromFile = getChapterNumberFromZipName(file)
                if (numberFromFile) {
                  setChapterNumber(numberFromFile)
                }

                const zipError = validateChapterZip(file)
                setError(zipError)
              }}
            />
            <div className="author-upload-icon">⇧</div>
            <strong>{zipFile ? zipFile.name : 'Drop chapter CBZ or select file'}</strong>
            <span>Example: Chapter 1.cbz or Chapter 1,5.cbz. Put images directly inside the CBZ: 01.jpg, 02.jpg.</span>
          </div>
        </label>

        <ZipPackagingGuideMini onOpenGuide={onOpenGuide} />

        <div className="author-alert info">
          ℹ Chapter will be created as preview first. Submit it for moderator review after checking pages.
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

function EditComicModal({ comic, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: comic?.title || '',
    summary: comic?.summary || '',
    language: comic?.language && comic.language !== 'Unknown' ? comic.language : '',
    cover: getComicCover(comic),
    minimumAge: comic?.minimumAge ?? 13,
    publicationStatus: normalizePublicationStatusValue(comic?.publicationStatus),
    genres: normalizeGenres(comic?.genres).join(', '),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }

    if (!form.language.trim()) {
      setError('Comic language is required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim(),
        language: form.language.trim(),
        cover: form.cover.trim(),
        minimumAge: Number(form.minimumAge) || 0,
        publicationStatus: form.publicationStatus,
        genres: form.genres
          .split(',')
          .map((genre) => genre.trim())
          .filter(Boolean),
      }

      const updated = await updateAuthorComicApi(getComicId(comic), payload)
      onSaved(updated || payload)
      onClose()
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not update comic information.'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="author-modal-backdrop" role="presentation">
      <form className="author-modal author-chapter-modal" onSubmit={handleSubmit}>
        <div className="author-modal-head">
          <div>
            <h2>Edit Comic Info</h2>
            <p>Update comic information, then submit it manually when ready.</p>
          </div>
          <button type="button" className="author-icon-btn ghost" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="author-chapter-form-grid">
          <label className="author-form-label">
            Title *
            <input className="author-input" value={form.title} onChange={(event) => updateField('title', event.target.value)} />
          </label>


          <label className="author-form-label">
            Original Language *
            <select className="author-input" value={form.language} onChange={(event) => updateField('language', event.target.value)} required>
              <option value="" disabled>Select original language</option>
              {COMIC_LANGUAGE_OPTIONS.map((language) => <option key={language} value={language}>{language}</option>)}
            </select>
          </label>

          <label className="author-form-label">
            Minimum Age
            <input className="author-input" type="number" min="0" max="21" value={form.minimumAge} onChange={(event) => updateField('minimumAge', event.target.value)} />
          </label>

          <label className="author-form-label">
            Publication Status
            <select className="author-input" value={form.publicationStatus} onChange={(event) => updateField('publicationStatus', event.target.value)}>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="HIATUS">Hiatus</option>
              <option value="CANCEL">Cancelled</option>
            </select>
          </label>
        </div>

        <label className="author-form-label">
          Cover Image URL
          <input className="author-input" value={form.cover} onChange={(event) => updateField('cover', event.target.value)} />
        </label>

        <label className="author-form-label">
          Genres
          <input className="author-input" value={form.genres} onChange={(event) => updateField('genres', event.target.value)} placeholder="Action, Fantasy" />
        </label>

        <label className="author-form-label">
          Description
          <textarea className="author-input" rows="4" value={form.summary} onChange={(event) => updateField('summary', event.target.value)} />
        </label>

        <div className="author-alert info">
          Changes are saved to the comic. Use Push Review manually when the comic and at least one chapter are ready.
        </div>

        {error && <div className="author-form-error">{error}</div>}

        <div className="author-modal-actions">
          <button type="button" className="btn-author-action" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-author-action black" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ChapterPreviewPanel({ preview, onClose }) {
  const pages = normalizeArrayResponse(preview?.pages)
  if (!preview) return null

  return (
    <section className="author-preview-section-card">
      <div className="author-chapter-section-head">
        <div>
          <h2>Preview · Chapter {getChapterNumber(preview)}</h2>
          <p>{pages.length} pages returned from backend upload.</p>
        </div>
        <button className="btn-author-action" onClick={onClose}>Close Preview</button>
      </div>

      {pages.length === 0 ? (
        <div className="author-empty-state small">No page URL was returned for this chapter.</div>
      ) : (
        <div className="author-page-preview-grid">
          {pages.map((page) => (
            <figure key={page.id || page.pageNumber || page.imageUrl}>
              <img src={page.imageUrl} alt={`Page ${page.pageNumber}`} />
              <figcaption>Page {page.pageNumber}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  )
}

function AuthorComicDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [comic, setComic] = useState(null)
  const [chapters, setChapters] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddChapter, setShowAddChapter] = useState(false)
  const [showEditComic, setShowEditComic] = useState(false)
  const [showUploadGuide, setShowUploadGuide] = useState(false)
  const [actionMessage, setActionMessage] = useState(location.state?.message || '')
  const [preview, setPreview] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [uploadTask, setUploadTask] = useState(null)
  const [submittingComic, setSubmittingComic] = useState(false)

  const loadDetail = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [comicResponse, chaptersResponse, metricsResponse] = await Promise.allSettled([
        getAuthorComicByIdApi(id),
        getAuthorComicChaptersApi(id, { page: 1, size: 100 }),
        getAuthorComicMetricsApi(id),
      ])

      if (comicResponse.status !== 'fulfilled') {
        throw comicResponse.reason
      }

      setComic(comicResponse.value)
      setChapters(chaptersResponse.status === 'fulfilled' ? normalizeArrayResponse(chaptersResponse.value) : [])
      setMetrics(metricsResponse.status === 'fulfilled' ? metricsResponse.value : null)
    } catch {
      setComic(null)
      setChapters([])
      setMetrics(null)
      setError('Cannot load this comic. Please check that it belongs to the logged-in author and backend is running.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const summary = useMemo(() => ({
    chapters: metrics?.chapterCount ?? getChapterCount(comic),
    views: metrics?.viewCount ?? comic?.viewCount ?? '0',
    revenue: formatMoney(metrics?.estimatedRevenue ?? metrics?.revenue ?? metrics?.totalRevenue ?? comic?.revenue ?? comic?.totalRevenue),
  }), [comic, metrics])

  const appendUploadedChapter = (uploadedPreview) => {
    const newChapter = {
      ...uploadedPreview,
      id: getChapterId(uploadedPreview) || `preview-${Date.now()}`,
      chapterNumber: getChapterNumber(uploadedPreview) || String(Number(summary.chapters) + 1),
      title: uploadedPreview?.title || 'Preview chapter',
      createdAt: uploadedPreview?.createdAt || new Date().toISOString(),
      status: uploadedPreview?.status || 'PREVIEW_READY',
    }

    setChapters((current) => [...current, newChapter])
    setComic((current) => ({
      ...current,
      chapterCount: Number(getChapterCount(current)) + 1,
    }))
    setPreview(uploadedPreview)
  }

  const pollChapterUploadTask = (taskId) => {
    const poll = async () => {
      try {
        const latest = await getAuthorChapterUploadStatusApi(id, taskId)
        setUploadTask(latest)

        if (!isFinalUploadStatus(latest?.status)) {
          window.setTimeout(poll, UPLOAD_POLL_INTERVAL_MS)
          return
        }

        if (latest?.status === 'COMPLETED') {
          if (latest?.chapter) {
            appendUploadedChapter(latest.chapter)
          }
          setActionMessage('CBZ processed. Preview is ready; submit it for moderator review after checking pages.')
        } else {
          setActionMessage(latest?.error || 'Upload processing failed.')
        }
      } catch (err) {
        setUploadTask({ taskId, status: 'FAILED', error: err?.message || 'Could not check upload status.' })
        setActionMessage('Could not check upload status.')
      }
    }

    window.setTimeout(poll, UPLOAD_POLL_INTERVAL_MS)
  }

  const handleChapterUploaded = (task) => {
    const taskId = getTaskId(task)
    if (!taskId) return

    setUploadTask(task)
    setActionMessage('Chapter CBZ accepted. Backend is processing it in the background.')
    pollChapterUploadTask(taskId)
  }

  const handleOpenPreview = async (chapter) => {
    const chapterId = getChapterId(chapter)
    setActionLoadingId(chapterId)
    setActionMessage('')

    try {
      const data = await getAuthorChapterPreviewApi(getComicId(comic), chapterId)
      setPreview(data)
    } catch {
      setActionMessage('Could not load chapter preview. Please check API/backend connection.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSubmitForReview = async (chapter) => {
    const chapterId = getChapterId(chapter)
    setActionLoadingId(chapterId)
    setActionMessage('')

    try {
      const response = await submitAuthorChapterReviewApi(getComicId(comic), chapterId)

      setChapters((current) => current.map((item) => (
        getChapterId(item) === chapterId
          ? { ...item, status: response?.status || 'SUBMITTED_FOR_REVIEW' }
          : item
      )))

      setActionMessage(response?.message || 'Chapter submitted for moderator review.')
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not submit chapter. Please check API/backend connection.'
      setActionMessage(message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSubmitComicForReview = async () => {
    if (chapters.length < 1) {
      const message = 'Add at least one chapter before pushing this comic for review.'
      setActionMessage(message)
      toast.warning(message)
      return
    }

    setSubmittingComic(true)
    setActionMessage('')
    try {
      const updatedComic = await submitAuthorComicReviewApi(getComicId(comic))
      setComic((current) => ({ ...current, ...updatedComic }))
      const message = 'Comic submitted for moderator review.'
      setActionMessage(message)
      toast.success(message)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not submit comic for review.'
      setActionMessage(message)
      toast.warning(message)
    } finally {
      setSubmittingComic(false)
    }
  }

  const handleComicUpdated = (updatedComic) => {
    setComic((current) => ({
      ...current,
      ...updatedComic,
      moderationStatus: updatedComic?.moderationStatus || current?.moderationStatus,
    }))
    setActionMessage('Comic information updated successfully.')
  }

  const handleDeleteComic = async () => {
    if (!window.confirm('Delete this comic and all of its chapters?')) return

    setActionMessage('')
    try {
      await deleteAuthorComicApi(getComicId(comic))
      navigate('/author/comics', { state: { message: 'Comic deleted successfully.' } })
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not delete comic.'
      setActionMessage(message)
    }
  }

  const handleDeleteChapter = async (chapter) => {
    const chapterId = getChapterId(chapter)
    if (!window.confirm(`Permanently delete Chapter ${getChapterNumber(chapter)}? This action cannot be undone.`)) return

    setActionLoadingId(chapterId)
    setActionMessage('')

    try {
      await deleteAuthorChapterApi(getComicId(comic), chapterId)
      setChapters((current) => current.filter((item) => getChapterId(item) !== chapterId))
      setComic((current) => ({
        ...current,
        chapterCount: Math.max(0, Number(getChapterCount(current)) - 1),
      }))
      setActionMessage('Chapter permanently deleted.')
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not delete chapter.'
      setActionMessage(message)
    } finally {
      setActionLoadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="author-empty-state">Loading comic detail...</div>
    )
  }

  if (error) {
    return (
      <div className="author-empty-state">
        <h2>Comic not found or API unavailable</h2>
        <p>{error}</p>
        <button className="btn-author-action black" onClick={() => navigate('/author/comics')}>Back to My Comics</button>
      </div>
    )
  }

  const cover = getComicCover(comic)
  const genres = normalizeGenres(comic?.genres)
  const moderationStatus = comic?.moderationStatus || comic?.approvalStatus || 'DRAFT'

  return (
    <>
      <div className="author-comic-detail-page">
        <div className="author-detail-breadcrumb">
          <Link to="/author/comics">← Back to My Comics</Link>
          <span>/</span>
          <strong>{comic.title}</strong>
        </div>

        <section className="author-detail-hero">
          <div className="author-detail-cover">
            {cover ? <img src={cover} alt={comic.title} /> : <span>Cover</span>}
          </div>

          <div className="author-detail-info">
            <div className="author-detail-title-row">
              <h1>{comic.title}</h1>
              <span className={`author-status-badge ${getStatusClass(moderationStatus)}`}>
                {formatStatus(moderationStatus)}
              </span>
              <button className="btn-author-action" onClick={() => setShowEditComic(true)}>Edit Info</button>
              {!['SUBMITTED_FOR_REVIEW', 'PUBLISHED', 'APPROVED'].includes(moderationStatus?.toString().toUpperCase()) && (
                <button className="btn-author-action review" onClick={handleSubmitComicForReview} disabled={submittingComic}>
                  {submittingComic ? 'Submitting...' : 'Push Review'}
                </button>
              )}
              <button className="btn-author-action danger" onClick={handleDeleteComic}>Delete Comic</button>
            </div>

            <p>{comic.summary || 'No description has been added yet.'}</p>

            <div className="author-genre-pills">
              {genres.map((genre) => (
                <span className="author-genre-pill" key={genre}>{genre}</span>
              ))}
            </div>

            <div className="author-detail-stats-grid">
              <div className="author-detail-stat-card">
                <span>Chapters</span>
                <strong>{summary.chapters}</strong>
              </div>
              <div className="author-detail-stat-card">
                <span>Total Views</span>
                <strong>{summary.views}</strong>
              </div>
              <div className="author-detail-stat-card">
                <span>Revenue</span>
                <strong>{summary.revenue}</strong>
              </div>
              <div className="author-detail-stat-card">
                <span>Original Language</span>
                <strong>{comic.language || 'Unknown'}</strong>
              </div>
              <div className="author-detail-stat-card">
                <span>Minimum Age</span>
                <strong>{comic.minimumAge ?? 13}+</strong>
              </div>
            </div>
          </div>
        </section>

        {actionMessage && <div className="author-alert info detail-message">{actionMessage}</div>}
        {uploadTask && (
          <div className={`author-upload-task-card ${(uploadTask.status || 'queued').toString().toLowerCase()} detail-message`}>
            <div>
              <strong>Chapter background upload</strong>
              <p>{uploadTask.error || uploadTask.message || 'Waiting for backend status...'}</p>
            </div>
            <div className="author-upload-task-meta">
              <span>{formatUploadStatus(uploadTask.status)}</span>
              <small>{uploadTask.progress ?? 0}%</small>
            </div>
          </div>
        )}

        <ChapterPreviewPanel preview={preview} onClose={() => setPreview(null)} />

        <section className="author-chapter-section-card">
          <div className="author-chapter-section-head">
            <div>
              <h2>Chapters ({chapters.length})</h2>
              <p>Upload CBZ, preview pages, then submit each chapter for moderator review.</p>
            </div>
            <div className="author-header-actions">
              <button className="btn-author-action" type="button" onClick={() => setShowUploadGuide(true)}>Upload Guide</button>
              <button className="btn-author-action black" onClick={() => setShowAddChapter(true)}>
                + Add Chapter
              </button>
            </div>
          </div>

          {chapters.length === 0 ? (
            <div className="author-empty-state small">
              <h3>No chapters yet</h3>
              <p>Upload your first CBZ file to create real chapter pages.</p>
            </div>
          ) : (
            <div className="author-table-scroll">
              <table className="author-chapter-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Uploaded</th>
                    <th>Pages</th>
                    <th>Views</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {chapters.map((chapter) => {
                    const status = chapter.status || chapter.moderationStatus
                    const statusValue = status?.toString().toUpperCase()
                    const canSubmit = statusValue === 'PREVIEW_READY' || statusValue === 'DRAFT'
                    const chapterId = getChapterId(chapter)
                    const busy = actionLoadingId === chapterId

                    return (
                      <tr key={chapterId}>
                        <td className="chapter-no">Ch.{getChapterNumber(chapter)}</td>
                        <td>{getChapterTitle(chapter)}</td>
                        <td>{formatDate(chapter.uploadedAt || chapter.createdAt || chapter.submittedAt)}</td>
                        <td>{chapter.pageCount ?? normalizeArrayResponse(chapter.pages).length ?? '—'}</td>
                        <td>{getChapterViews(chapter)}</td>
                        <td>
                          <span className={`author-status-badge ${getStatusClass(status)}`}>
                            {formatStatus(status)}
                          </span>
                        </td>
                        <td>
                          <div className="author-table-actions">
                            <button className="btn-table-action" onClick={() => handleOpenPreview(chapter)} disabled={busy}>
                              {busy ? 'Loading...' : 'Preview'}
                            </button>

                            {canSubmit && (
                              <button className="btn-table-action" onClick={() => handleSubmitForReview(chapter)} disabled={busy}>
                                {busy ? 'Submitting...' : 'Submit Review'}
                              </button>
                            )}

                            <button className="btn-table-action danger" onClick={() => handleDeleteChapter(chapter)} disabled={busy}>
                              {busy ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showAddChapter && (
        <AddChapterModal
          comic={comic}
          onClose={() => setShowAddChapter(false)}
          onUploaded={handleChapterUploaded}
          onOpenGuide={() => setShowUploadGuide(true)}
        />
      )}

      {showEditComic && (
        <EditComicModal
          comic={comic}
          onClose={() => setShowEditComic(false)}
          onSaved={handleComicUpdated}
        />
      )}

      {showUploadGuide && <UploadGuideModal onClose={() => setShowUploadGuide(false)} />}
    </>
  )
}

export default AuthorComicDetail
