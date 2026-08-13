import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { COMIC_LANGUAGE_OPTIONS } from '../../constants/comicLanguages'
import '../../assets/style/author/comics.css'
import '../../assets/style/author/upload-guide.css'
import AuthorAppealModal from '../../components/author/AuthorAppealModal'
import {
  checkAuthorComicTitleExistsApi,
  createAuthorComicApi,
  getAuthorChapterUploadStatusApi,
  getAuthorComicsApi,
  submitAuthorComicReviewApi,
  uploadAuthorChapterFolderApi,
} from '../../services/api/AuthorComicApi'
import { uploadImageApi } from '../../services/api/UploadApi'
import { buildChapterFolderFormData, validateChapterFolder } from '../../utils/chapterFolderUpload'

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
  if (value === 'APPEALED') return '⚖️ Appealed'
  if (value === 'NEEDS_CHANGES') return 'Needs Changes'
  if (value === 'DRAFT') return 'Draft'
  return '⏳ Pending Review'
}

const getModerationClass = (status) => {
  const value = (status || '').toString().toUpperCase()
  if (['APPROVED', 'PUBLISHED'].includes(value)) return 'approved'
  if (['HIDDEN', 'UNPUBLISHED'].includes(value)) return 'hidden'
  if (['REJECTED', 'NEEDS_CHANGES'].includes(value)) return 'rejected'
  if (value === 'APPEALED') return 'appealed'
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

function CreateComicModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', summary: '', language: '', minimumAge: 13,
    publicationStatus: 'ONGOING', genres: [], coverFile: null, cover: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [checkingTitle, setCheckingTitle] = useState(false)
  const [error, setError] = useState('')

  const toggleGenre = (genre) => {
    setForm((current) => ({
      ...current,
      genres: current.genres.includes(genre)
        ? current.genres.filter((item) => item !== genre)
        : [...current.genres, genre],
    }))
  }

  const checkDuplicateTitle = async (showWarning = true) => {
    const title = form.title.trim()
    if (!title) return false

    setCheckingTitle(true)
    try {
      const exists = await checkAuthorComicTitleExistsApi(title)
      if (exists) {
        const message = `A comic named "${title}" already exists. Please choose another title.`
        setError(message)
        if (showWarning) toast.warning(message, { toastId: `duplicate-comic-${title.toLowerCase()}` })
        return true
      }
      return false
    } catch {
      // The backend create endpoint still performs the authoritative duplicate check.
      return false
    } finally {
      setCheckingTitle(false)
    }
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
    if (!form.coverFile && !form.cover.trim()) {
      setError('Please upload a cover image or provide a cover image URL.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      if (await checkDuplicateTitle(true)) {
        return
      }

      let cover = form.cover.trim()
      if (form.coverFile) {
        toast.info('Uploading cover image...')
        cover = await uploadImageApi(form.coverFile)
      }

      const createdComic = await createAuthorComicApi({
        title: form.title.trim(),
        summary: form.summary.trim(),
        language: form.language.trim(),
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
      if (err?.response?.status === 409) {
        toast.warning(message, { toastId: `duplicate-comic-${form.title.trim().toLowerCase()}` })
      }
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
              <input
                className="author-input"
                value={form.title}
                onChange={(event) => {
                  setForm({ ...form, title: event.target.value })
                  if (error?.includes('already exists')) setError('')
                }}
                onBlur={() => checkDuplicateTitle(true)}
              />
            </label>
            <label className="author-form-label">Original Language *
              <select className="author-input" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} required>
                <option value="" disabled>Select original language</option>
                {COMIC_LANGUAGE_OPTIONS.map((language) => <option key={language} value={language}>{language}</option>)}
              </select>
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
          <button type="submit" className="btn-author-action black" disabled={submitting}>{submitting ? 'Creating...' : checkingTitle ? 'Checking title...' : 'Create Draft'}</button>
        </div>
      </form>
    </div>
  )
}

function AddChapterModal({ comic, onClose, onUploaded }) {
  const [chapterNumber, setChapterNumber] = useState(String((Number(getChapterCount(comic)) || 0) + 1))
  const [title, setTitle] = useState('')
  const [folderFiles, setFolderFiles] = useState([])
  const [folderName, setFolderName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleFolderChange = (event) => {
    const result = validateChapterFolder(event.target.files)
    setFolderFiles(result.files)
    setFolderName(result.folderName)
    setError(result.error)
    if (result.chapterNumber) setChapterNumber(result.chapterNumber)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const result = validateChapterFolder(folderFiles)
    if (result.error) {
      setError(result.error)
      toast.warning(result.error)
      return
    }
    if (!chapterNumber.trim()) {
      const message = 'Chapter number is required.'
      setError(message)
      toast.warning(message)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      toast.info('Uploading chapter folder, please wait...')
      const task = await uploadAuthorChapterFolderApi(
        getComicId(comic),
        await buildChapterFolderFormData({ chapterNumber, chapterTitle: title, files: result.files }),
      )
      toast.success('Chapter folder accepted for processing.')
      onUploaded(task, comic)
      onClose()
    } catch (err) {
      const message = err?.response?.data?.message
        || (err?.response?.status === 409
          ? `Chapter ${chapterNumber.trim()} already exists in this comic.`
          : err?.message)
        || 'Could not upload chapter folder.'
      setError(message)
      toast.error(message, { toastId: `chapter-upload-error-${getComicId(comic)}-${chapterNumber.trim()}` })
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
              <input className="author-input" value={chapterNumber} onChange={(event) => setChapterNumber(event.target.value)} placeholder="1 or 1,5" />
            </label>
            <label className="author-form-label">Chapter Title
              <input className="author-input" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
          </div>
          <label className="author-upload-zone file-picker-zone">
            <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple webkitdirectory="" directory="" onChange={handleFolderChange} />
            <div className="author-upload-icon">⇧</div>
            <strong>{folderFiles.length ? `${folderName || 'Selected folder'} · ${folderFiles.length} pages` : 'Select chapter folder'}</strong>
            <span>Folder name can be anything. Images must be directly inside: 01.jpg, 02.jpg...</span>
          </label>
          <div className="author-alert info">Files are sorted naturally before upload. Maximum 200 images and 10MB per image.</div>
          {error && <div className="author-form-error">{error}</div>}
        </div>
        <div className="author-modal-actions">
          <button type="button" className="btn-author-action" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-author-action black" disabled={submitting}>{submitting ? 'Uploading...' : 'Upload Folder'}</button>
        </div>
      </form>
    </div>
  )
}
function enrichComicWithModeratorOverrides(comic) {
  // localStorage overrides removed for production readiness
  return comic;
}

function AuthorComics() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [comics, setComics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [chapterTarget, setChapterTarget] = useState(null)
  const [appealTarget, setAppealTarget] = useState(null)
  const [uploadTasks, setUploadTasks] = useState([])
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'rejected' | 'pending' | 'approved' | 'draft'
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('action_first') // 'action_first' | 'updated' | 'created' | 'title'
  const [reviewingId, setReviewingId] = useState(null)
  const comicsLoadedRef = useRef(false)

  const counts = useMemo(() => {
    let rejected = 0
    let pending = 0
    let approved = 0
    let draft = 0

    comics.forEach((comic) => {
      const status = (comic.moderationStatus || '').toString().toUpperCase()
      const isRejected = status === 'REJECTED' || (comic.rejectedChapterCount > 0) || comic.hasRejectedOverride
      const isPending = !isRejected && (status.includes('REVIEW') || status.includes('SUBMITTED') || status === 'APPEALED' || comic.isAppealed || (comic.pendingChapterCount > 0))
      const isApproved = !isRejected && !isPending && (status === 'APPROVED' || status === 'PUBLISHED')

      if (isRejected) rejected++
      else if (isPending) pending++
      else if (isApproved) approved++
      else draft++
    })

    return { all: comics.length, rejected, pending, approved, draft }
  }, [comics])

  const filteredAndSortedComics = useMemo(() => {
    let result = comics.filter((comic) => {
      const title = (comic.title || '').toLowerCase()
      if (searchQuery && !title.includes(searchQuery.toLowerCase().trim())) {
        return false
      }

      const status = (comic.moderationStatus || '').toString().toUpperCase()
      const isRejected = status === 'REJECTED' || (comic.rejectedChapterCount > 0) || comic.hasRejectedOverride
      const isPending = !isRejected && (status.includes('REVIEW') || status.includes('SUBMITTED') || status === 'APPEALED' || comic.isAppealed || (comic.pendingChapterCount > 0))
      const isApproved = !isRejected && !isPending && (status === 'APPROVED' || status === 'PUBLISHED')
      const isDraft = !isRejected && !isPending && !isApproved

      if (activeTab === 'rejected') return isRejected
      if (activeTab === 'pending') return isPending
      if (activeTab === 'approved') return isApproved
      if (activeTab === 'draft') return isDraft
      return true
    })

    return result.sort((a, b) => {
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '')
      }

      if (sortBy === 'created') {
        const dateA = new Date(a.createdAt || 0).getTime()
        const dateB = new Date(b.createdAt || 0).getTime()
        return dateB - dateA
      }

      if (sortBy === 'updated') {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime()
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime()
        return dateB - dateA
      }

      // Default: 'action_first' (Rejected first, then Pending, then by updatedAt)
      const statusA = (a.moderationStatus || '').toString().toUpperCase()
      const statusB = (b.moderationStatus || '').toString().toUpperCase()

      const isRejectedA = statusA === 'REJECTED' || (a.rejectedChapterCount > 0) || a.hasRejectedOverride
      const isRejectedB = statusB === 'REJECTED' || (b.rejectedChapterCount > 0) || b.hasRejectedOverride
      if (isRejectedA !== isRejectedB) return isRejectedA ? -1 : 1

      const isPendingA = !isRejectedA && (statusA.includes('REVIEW') || statusA.includes('SUBMITTED') || (a.pendingChapterCount > 0))
      const isPendingB = !isRejectedB && (statusB.includes('REVIEW') || statusB.includes('SUBMITTED') || (b.pendingChapterCount > 0))
      if (isPendingA !== isPendingB) return isPendingA ? -1 : 1

      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return dateB - dateA
    })
  }, [comics, activeTab, searchQuery, sortBy])

  const loadComics = async () => {
    setLoading(true)
    setError('')
    try {
      const rawComics = normalizeArrayResponse(await getAuthorComicsApi({ page: 1, size: 100 }))
      setComics(rawComics.map(enrichComicWithModeratorOverrides))
    } catch (err) {
      setError(err?.response?.data?.message || 'Cannot load author comics. Please check the backend and AUTHOR token.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!comicsLoadedRef.current) {
      comicsLoadedRef.current = true
      loadComics()
    }

    const handleAppealStateChange = () => {
      loadComics()
    }
    window.addEventListener('appealStateChanged', handleAppealStateChange)
    return () => {
      window.removeEventListener('appealStateChanged', handleAppealStateChange)
    }
  }, [])

  useEffect(() => {
    const isAppeal = searchParams.get('appeal') === 'true'
    const appealComicId = searchParams.get('appealComicId')
    if ((isAppeal || appealComicId) && comics.length > 0 && !appealTarget) {
      const matched = appealComicId
        ? comics.find((c) => (c.id || c.comicId) === appealComicId)
        : comics[0]
      if (matched) {
        setAppealTarget(matched)
        // Clear params immediately to prevent auto-reopen loop
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('appeal')
          next.delete('appealComicId')
          return next
        }, { replace: true })
      }
    }
  }, [comics, searchParams, appealTarget, setSearchParams])

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
        } else {
          const message = latest?.error || latest?.message || 'Upload processing failed.'
          toast.error(message, { toastId: `chapter-upload-task-error-${taskId}` })
        }
      } catch (err) {
        const message = err?.response?.data?.message || err?.message || 'Could not check upload status.'
        upsertUploadTask({ taskId, status: 'FAILED', error: message })
        toast.error(message, { toastId: `chapter-upload-task-error-${taskId}` })
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

  const dismissUploadTask = (taskId) => {
    setUploadTasks((current) => current.filter((task) => getTaskId(task) !== taskId))
  }

  const handlePushReview = async (comic) => {
    const comicId = getComicId(comic)
    if (!comicId) return
    setReviewingId(comicId)
    setError('')
    try {
      const updated = await submitAuthorComicReviewApi(comicId)
      setComics((current) => current.map((item) => getComicId(item) === comicId ? { 
        ...item, 
        ...(typeof updated === 'object' ? updated : {}),
        moderationStatus: 'SUBMITTED_FOR_REVIEW'
      } : item))
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
          <p>{loading ? 'Loading comics...' : `${comics.length} comics · ${counts.pending} pending review`}</p>
        </div>
        <button className="btn-author-action black large" onClick={() => setShowCreateModal(true)}>+ Create Comic</button>
      </div>

      {error && <div className="author-alert warning">{error}</div>}

      {uploadTasks.length > 0 && (
        <div className="author-upload-task-list">
          {uploadTasks.map((task) => {
            const taskId = getTaskId(task)
            const status = (task.status || 'queued').toString().toLowerCase()
            const isPending = ['queued', 'processing'].includes(status)

            return (
              <div className={`author-upload-task-card ${status}`} key={taskId}>
                <div className="author-upload-task-content">
                  <strong>{task.title || 'Chapter upload'}</strong>
                  <p>{task.error || task.message || 'Waiting for backend status...'}</p>
                </div>
                <div className="author-upload-task-actions">
                  <div className="author-upload-task-meta">
                    <span>{formatUploadStatus(task.status)}</span>
                    {isPending && <span className="author-upload-spinner" role="status" aria-label="Uploading" />}
                  </div>
                  <button
                    type="button"
                    className="author-upload-task-dismiss"
                    onClick={() => dismissUploadTask(taskId)}
                    aria-label="Dismiss upload notification"
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Filter Toolbar */}
      {!loading && !error && comics.length > 0 && (
        <div className="author-filter-toolbar">
          <div className="author-filter-tabs">
            <button
              className={`author-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All <span className="author-tab-count">{counts.all}</span>
            </button>

            <button
              className={`author-tab-btn ${activeTab === 'rejected' ? 'active rejected' : ''}`}
              onClick={() => setActiveTab('rejected')}
            >
              🔴 Needs Action <span className="author-tab-count">{counts.rejected}</span>
            </button>

            <button
              className={`author-tab-btn ${activeTab === 'pending' ? 'active pending' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              ⏳ Pending Review <span className="author-tab-count">{counts.pending}</span>
            </button>

            <button
              className={`author-tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
              onClick={() => setActiveTab('approved')}
            >
              ✓ Approved <span className="author-tab-count">{counts.approved}</span>
            </button>

            <button
              className={`author-tab-btn ${activeTab === 'draft' ? 'active' : ''}`}
              onClick={() => setActiveTab('draft')}
            >
              📝 Draft <span className="author-tab-count">{counts.draft}</span>
            </button>
          </div>

          <div className="author-filter-controls">
            <input
              type="text"
              className="author-search-input"
              placeholder="Search comics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <select
              className="author-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="action_first">Needs Action First</option>
              <option value="updated">Recently Updated</option>
              <option value="created">Newest Created</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      )}

      {!loading && !error && comics.length === 0 && (
        <div className="author-empty-state">
          <h2>No comics yet</h2>
          <p>Create a comic draft with its cover, then add chapters from the detail page.</p>
          <button className="btn-author-action black" onClick={() => setShowCreateModal(true)}>Create First Comic</button>
        </div>
      )}

      {!loading && !error && comics.length > 0 && filteredAndSortedComics.length === 0 && (
        <div className="author-empty-state small" style={{ marginTop: '20px' }}>
          <h3>No comics match your filter criteria</h3>
          <p>Try switching filter tabs or clearing your search query.</p>
        </div>
      )}

      <div className="author-comic-list">
        {filteredAndSortedComics.map((comic) => {
          const comicId = getComicId(comic)
          const moderationStatus = comic.moderationStatus
          const publicationStatus = comic.publicationStatus
          const genres = normalizeGenres(comic.genres)
          const cover = getComicCover(comic)
          const statusValue = (moderationStatus || 'DRAFT').toString().toUpperCase()
          const canPushReview = !['SUBMITTED_FOR_REVIEW', 'PUBLISHED', 'APPROVED'].includes(statusValue)
          const isAppealable = Boolean(comic.isModEdited) && !comic.isAppealed

          return (
            <article className="author-comic-list-card" key={comicId || comic.title}>
              <div className="author-comic-cover-box">{cover ? <img src={cover} alt={comic.title} loading="lazy" decoding="async" /> : <span>Cover</span>}</div>
              <div className="author-comic-card-main">
                <div className="author-comic-title-line">
                  <h2>{comic.title}</h2>
                  <span className={`author-status-badge ${getModerationClass(moderationStatus)}`}>{formatModerationStatus(moderationStatus)}</span>
                  {comic.rejectedChapterCount > 0 && (
                    <span className="author-status-badge error" title="Contains chapter(s) rejected by moderator">
                      🔴 {comic.rejectedChapterCount} Chapter{comic.rejectedChapterCount > 1 ? 's' : ''} Rejected
                    </span>
                  )}
                  {comic.pendingChapterCount > 0 && (
                    <span className="author-status-badge warning" title="Contains chapter(s) pending moderation">
                      ⏳ {comic.pendingChapterCount} Chapter{comic.pendingChapterCount > 1 ? 's' : ''} Pending
                    </span>
                  )}
                  <span className={`author-publication-badge ${getPublicationClass(publicationStatus)}`}>{formatPublicationStatus(publicationStatus)}</span>
                </div>
                <div className="author-comic-meta-line">
                  <span>📖 {getChapterCount(comic)} chapters</span><span>👁 {getViews(comic)} views</span>
                  <span>🌐 {comic.language || 'Unknown'}</span><span>🔞 {comic.minimumAge ?? 13}+</span><span>🕘 {formatDate(comic.updatedAt || comic.createdAt)}</span>
                </div>
                <p className="author-comic-card-summary">{comic.summary || 'No description has been added yet.'}</p>
                <div className="author-genre-pills">{genres.slice(0, 4).map((genre) => <span className="author-genre-pill" key={genre}>{genre}</span>)}</div>
              </div>
              <div className="author-comic-card-actions">
                <button className="btn-author-action black" onClick={() => navigate(`/author/comics/${comicId}`)}>View Details</button>
                <button className="btn-author-action" onClick={() => setChapterTarget(comic)}>+ Add Chapter</button>
                {isAppealable && (
                  <button className="btn-author-action appeal" onClick={() => setAppealTarget(comic)} title="Appeal moderation decision">
                    ⚖️ Appeal
                  </button>
                )}
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
      {appealTarget && (
        <AuthorAppealModal
          comic={appealTarget}
          onClose={() => {
            setAppealTarget(null)
            // Ensure URL params are cleared
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              next.delete('appeal')
              next.delete('appealComicId')
              return next
            }, { replace: true })
          }}
          onSubmitted={() => loadComics()}
        />
      )}
    </div>
  )
}

export default AuthorComics
