import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import '../../assets/style/author/comics.css'
import '../../assets/style/author/upload-guide.css'
import {
  createAuthorComicApi,
  getAuthorChapterUploadStatusApi,
  getAuthorComicsApi,
  submitAuthorComicReviewApi,
  uploadAuthorChapterZipApi,
} from '../../services/api/AuthorComicApi'
import { uploadImageApi } from '../../services/api/UploadApi'

const GENRE_OPTIONS = [
  'Action', 'Adventure', 'Fantasy', 'Romance', 'Drama',
  'Mystery', 'Cultivation', 'Sci-Fi', 'Comedy', 'Horror',
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
const getComicCover = (comic) => comic?.cover || ''
const getChapterCount = (comic) => comic?.chapterCount ?? 0
const getViews = (comic) => comic?.viewCount ?? 0
const getTaskId = (task) => task?.taskId || task?.id || task?.uploadTaskId
const isFinalUploadStatus = (status) => ['COMPLETED', 'FAILED'].includes((status || '').toString().toUpperCase())
const UPLOAD_POLL_INTERVAL_MS = 2500
const CHAPTER_ARCHIVE_NAME_REGEX = /^chapter\s+[1-9][0-9]*(?:[,.][0-9]+)?\.cbz$/i

const formatPublicationStatus = (status) => {
  const value = (status || 'ONGOING').toString().toUpperCase()
  if (value === 'HIATUS') return 'On Hiatus'
  if (['COMPLETED', 'COMPLETE'].includes(value)) return 'Completed'
  if (value === 'CANCEL') return 'Cancelled'
  return 'Ongoing'
}

const formatModerationStatus = (status) => {
  const value = (status || 'DRAFT').toString().toUpperCase()
  if (['APPROVED', 'PUBLISHED'].includes(value)) return '✓ Approved'
  if (['HIDDEN', 'UNPUBLISHED'].includes(value)) return '👁 Hidden'
  if (value === 'REJECTED') return '✕ Rejected'
  if (value === 'NEEDS_CHANGES') return 'Needs Changes'
  if (value === 'DRAFT') return 'Draft'
  return '⏳ Pending Review'
}

const getModerationClass = (status) => {
  const value = (status || '').toString().toUpperCase()
  if (['APPROVED', 'PUBLISHED'].includes(value)) return 'approved'
  if (['HIDDEN', 'UNPUBLISHED'].includes(value)) return 'hidden'
  if (['REJECTED', 'NEEDS_CHANGES'].includes(value)) return 'rejected'
  if (value === 'DRAFT') return 'draft'
  return 'pending'
}

const getPublicationClass = (status) => {
  const value = (status || 'ONGOING').toString().toUpperCase()
  if (['COMPLETED', 'COMPLETE'].includes(value)) return 'completed'
  if (value === 'HIATUS') return 'hiatus'
  return 'ongoing'
}

const formatDate = (value) => {
  if (!value) return 'Recently'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

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

function CreateComicModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', summary: '', minimumAge: 13,
    publicationStatus: 'ONGOING', genres: [], coverFile: null, cover: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const toggleGenre = (genre) => {
    setForm((current) => ({
      ...current,
      genres: current.genres.includes(genre)
        ? current.genres.filter((item) => item !== genre)
        : [...current.genres, genre],
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    if (!form.coverFile && !form.cover.trim()) {
      setError('Please upload a cover image or provide a cover image URL.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      let cover = form.cover.trim()
      if (form.coverFile) {
        toast.info('Uploading cover image...')
        cover = await uploadImageApi(form.coverFile)
      }

      const createdComic = await createAuthorComicApi({
        title: form.title.trim(),
        summary: form.summary.trim(),
        minimumAge: Number(form.minimumAge) || 0,
        publicationStatus: form.publicationStatus,
        genres: form.genres,
        cover,
      })

      toast.success('Comic draft created successfully.')
      onCreated(createdComic)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not create comic draft.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="author-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="author-modal author-comic-modal" onSubmit={handleSubmit}>
        <div className="author-modal-head">
          <div>
            <h2>Create Comic Draft</h2>
            <p>Enter comic information and upload only the cover. Chapters are added after creation.</p>
          </div>
          <button type="button" className="author-icon-btn ghost" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="author-modal-body">
          <div className="author-chapter-form-grid">
            <label className="author-form-label">Title *
              <input className="author-input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </label>
            <label className="author-form-label">Minimum Age
              <input className="author-input" type="number" min="0" max="21" value={form.minimumAge} onChange={(event) => setForm({ ...form, minimumAge: event.target.value })} />
            </label>
            <label className="author-form-label">Publication Status
              <select className="author-input" value={form.publicationStatus} onChange={(event) => setForm({ ...form, publicationStatus: event.target.value })}>
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="HIATUS">Hiatus</option>
                <option value="CANCEL">Cancelled</option>
              </select>
            </label>
          </div>

          <label className="author-form-label">Description
            <textarea className="author-input" rows="4" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
          </label>

          <div className="author-form-label">Genres
            <div className="author-genre-pills selectable">
              {GENRE_OPTIONS.map((genre) => (
                <button key={genre} type="button" className={`author-genre-pill ${form.genres.includes(genre) ? 'selected' : ''}`} onClick={() => toggleGenre(genre)}>
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <label className="author-upload-zone file-picker-zone">
            <input type="file" accept="image/*" onChange={(event) => setForm({ ...form, coverFile: event.target.files?.[0] || null })} />
            <div className="author-upload-icon">⇧</div>
            <strong>{form.coverFile ? form.coverFile.name : 'Select cover image'}</strong>
            <span>The image is uploaded to Cloudinary before the draft is created.</span>
          </label>

          <label className="author-form-label">Or Cover Image URL
            <input className="author-input" value={form.cover} onChange={(event) => setForm({ ...form, cover: event.target.value })} placeholder="https://.../cover.png" />
          </label>

          <div className="author-alert info">
            The comic is created with <strong>DRAFT</strong> status. Add at least one chapter before pressing Push Review.
          </div>
          {error && <div className="author-form-error">{error}</div>}
        </div>

        <div className="author-modal-actions">
          <button type="button" className="btn-author-action" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-author-action black" disabled={submitting}>{submitting ? 'Creating...' : 'Create Draft'}</button>
        </div>
      </form>
    </div>
  )
}

function AddChapterModal({ comic, onClose, onUploaded }) {
  const [chapterNumber, setChapterNumber] = useState(String((Number(getChapterCount(comic)) || 0) + 1))
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
    if (!CHAPTER_ARCHIVE_NAME_REGEX.test(zipFile.name)) {
      setError("Chapter archive name must be like 'Chapter 1.cbz' or 'Chapter 1,5.cbz'.")
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const task = await uploadAuthorChapterZipApi(
        getComicId(comic),
        buildChapterFormData({ chapterNumber, chapterTitle: title, zipFile }),
      )
      toast.success('Chapter accepted for processing.')
      onUploaded(task, comic)
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not upload chapter CBZ.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="author-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="author-modal author-chapter-modal" onSubmit={handleSubmit}>
        <div className="author-modal-head">
          <div><h2>Add Chapter</h2><p>{comic?.title}</p></div>
          <button type="button" className="author-icon-btn ghost" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="author-modal-body">
          <div className="author-chapter-form-grid">
            <label className="author-form-label">Chapter Number
              <input className="author-input" value={chapterNumber} onChange={(event) => setChapterNumber(event.target.value)} />
            </label>
            <label className="author-form-label">Chapter Title
              <input className="author-input" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
          </div>
          <label className="author-upload-zone file-picker-zone">
            <input type="file" accept=".cbz" onChange={(event) => setZipFile(event.target.files?.[0] || null)} />
            <div className="author-upload-icon">⇧</div>
            <strong>{zipFile ? zipFile.name : 'Select chapter CBZ'}</strong>
            <span>After processing, the chapter status becomes PREVIEW_READY.</span>
          </label>
          <div className="author-alert info">Upload rules are available from the comic detail page.</div>
          {error && <div className="author-form-error">{error}</div>}
        </div>
        <div className="author-modal-actions">
          <button type="button" className="btn-author-action" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-author-action black" disabled={submitting}>{submitting ? 'Uploading...' : 'Upload CBZ'}</button>
        </div>
      </form>
    </div>
  )
}

function AuthorComics() {
  const navigate = useNavigate()
  const [comics, setComics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [chapterTarget, setChapterTarget] = useState(null)
  const [uploadTasks, setUploadTasks] = useState([])
  const [reviewingId, setReviewingId] = useState(null)
  const comicsLoadedRef = useRef(false)

  const pendingReviewCount = useMemo(() => comics.filter((comic) => {
    const status = (comic.moderationStatus || '').toString().toUpperCase()
    return status.includes('REVIEW') || status.includes('SUBMITTED')
  }).length, [comics])

  const loadComics = async () => {
    setLoading(true)
    setError('')
    try {
      setComics(normalizeArrayResponse(await getAuthorComicsApi({ page: 1, size: 12 })))
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot load author comics. Please check the backend and AUTHOR token.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (comicsLoadedRef.current) return
    comicsLoadedRef.current = true
    loadComics()
  }, [])

  const upsertUploadTask = (task, extra = {}) => {
    const taskId = getTaskId(task)
    if (!taskId) return
    setUploadTasks((current) => {
      const next = { ...task, ...extra, taskId }
      return current.some((item) => getTaskId(item) === taskId)
        ? current.map((item) => (getTaskId(item) === taskId ? { ...item, ...next } : item))
        : [next, ...current]
    })
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
        if ((latest?.status || '').toString().toUpperCase() === 'COMPLETED') {
          setComics((current) => current.map((comic) => getComicId(comic) === comicId
            ? { ...comic, chapterCount: Number(getChapterCount(comic)) + 1 }
            : comic))
          toast.success('Chapter preview is ready.')
        }
      } catch (err) {
        upsertUploadTask({ taskId, status: 'FAILED', error: err?.message || 'Could not check upload status.' })
      }
    }
    window.setTimeout(poll, UPLOAD_POLL_INTERVAL_MS)
  }

  const handleCreated = (createdComic) => {
    setShowCreateModal(false)
    setComics((current) => [createdComic, ...current])
    const comicId = getComicId(createdComic)
    if (comicId) navigate(`/author/comics/${comicId}`, { state: { message: 'Comic draft created. Add a chapter, then push the comic for review.' } })
  }

  const handleChapterUploaded = (task, comic) => {
    const taskId = getTaskId(task)
    const comicId = getComicId(comic)
    if (!taskId || !comicId) return
    upsertUploadTask(task, { title: `Chapter upload · ${comic?.title || 'Comic'}`, comicId })
    pollChapterTask(comicId, taskId)
  }

  const handlePushReview = async (comic) => {
    const comicId = getComicId(comic)
    if (!comicId) return
    setReviewingId(comicId)
    setError('')
    try {
      const updated = await submitAuthorComicReviewApi(comicId)
      setComics((current) => current.map((item) => getComicId(item) === comicId ? { ...item, ...updated } : item))
      toast.success('Comic submitted for moderator review.')
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not submit comic for review.'
      setError(message)
      toast.warning(message)
    } finally {
      setReviewingId(null)
    }
  }

  return (
    <div className="author-comics-page">
      <div className="author-list-header-row">
        <div>
          <h1>My Comics</h1>
          <p>{loading ? 'Loading comics...' : `${comics.length} comics · ${pendingReviewCount} pending review`}</p>
        </div>
        <button className="btn-author-action black large" onClick={() => setShowCreateModal(true)}>+ Create Comic</button>
      </div>

      {error && <div className="author-alert warning">{error}</div>}

      {uploadTasks.length > 0 && (
        <div className="author-upload-task-list">
          {uploadTasks.map((task) => (
            <div className={`author-upload-task-card ${(task.status || 'queued').toString().toLowerCase()}`} key={getTaskId(task)}>
              <div><strong>{task.title || 'Chapter upload'}</strong><p>{task.error || task.message || 'Waiting for backend status...'}</p></div>
              <div className="author-upload-task-meta"><span>{formatUploadStatus(task.status)}</span><small>{task.progress ?? 0}%</small></div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && comics.length === 0 && (
        <div className="author-empty-state">
          <h2>No comics yet</h2>
          <p>Create a comic draft with its cover, then add chapters from the detail page.</p>
          <button className="btn-author-action black" onClick={() => setShowCreateModal(true)}>Create First Comic</button>
        </div>
      )}

      <div className="author-comic-list">
        {comics.map((comic) => {
          const comicId = getComicId(comic)
          const moderationStatus = comic.moderationStatus
          const publicationStatus = comic.publicationStatus
          const genres = normalizeGenres(comic.genres)
          const cover = getComicCover(comic)
          const statusValue = (moderationStatus || 'DRAFT').toString().toUpperCase()
          const canPushReview = !['SUBMITTED_FOR_REVIEW', 'PUBLISHED', 'APPROVED'].includes(statusValue)

          return (
            <article className="author-comic-list-card" key={comicId || comic.title}>
              <div className="author-comic-cover-box">{cover ? <img src={cover} alt={comic.title} loading="lazy" decoding="async" /> : <span>Cover</span>}</div>
              <div className="author-comic-card-main">
                <div className="author-comic-title-line">
                  <h2>{comic.title}</h2>
                  <span className={`author-status-badge ${getModerationClass(moderationStatus)}`}>{formatModerationStatus(moderationStatus)}</span>
                  <span className={`author-publication-badge ${getPublicationClass(publicationStatus)}`}>{formatPublicationStatus(publicationStatus)}</span>
                </div>
                <div className="author-comic-meta-line">
                  <span>📖 {getChapterCount(comic)} chapters</span><span>👁 {getViews(comic)} views</span>
                  <span>🔞 {comic.minimumAge ?? 13}+</span><span>🕘 {formatDate(comic.updatedAt || comic.createdAt)}</span>
                </div>
                <p className="author-comic-card-summary">{comic.summary || 'No description has been added yet.'}</p>
                <div className="author-genre-pills">{genres.slice(0, 4).map((genre) => <span className="author-genre-pill" key={genre}>{genre}</span>)}</div>
              </div>
              <div className="author-comic-card-actions">
                <button className="btn-author-action black" onClick={() => navigate(`/author/comics/${comicId}`)}>View Details</button>
                <button className="btn-author-action" onClick={() => setChapterTarget(comic)}>+ Add Chapter</button>
                {canPushReview && (
                  <button className="btn-author-action review" onClick={() => handlePushReview(comic)} disabled={reviewingId === comicId}>
                    {reviewingId === comicId ? 'Submitting...' : 'Push Review'}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {showCreateModal && <CreateComicModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />}
      {chapterTarget && <AddChapterModal comic={chapterTarget} onClose={() => setChapterTarget(null)} onUploaded={handleChapterUploaded} />}
    </div>
  )
}

export default AuthorComics