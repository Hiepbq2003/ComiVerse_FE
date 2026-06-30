import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AuthorLayout from '../../components/layout/AuthorLayout'
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicSciFi from '../../assets/comic_scifi.png'
import {
  getAuthorComicByIdApi,
  getAuthorComicChaptersApi,
  getAuthorComicMetricsApi,
  submitAuthorChapterReviewApi,
  uploadAuthorChapterZipApi,
} from '../../services/api/AuthorComicApi'

const MOCK_DETAILS = [
  {
    id: 1,
    title: 'New Life',
    description: 'A cultivator reborn in a new world seeks to reclaim his power.',
    coverImageUrl: comicAction,
    genres: ['Fantasy', 'Action'],
    chapterCount: 3,
    totalViews: '1.2M',
    revenue: '5.5Mđ',
    moderationStatus: 'APPROVED',
    publicationStatus: 'ONGOING',
  },
  {
    id: 2,
    title: 'Infinite Journey',
    description: 'An endless quest through dimensions to discover the ultimate truth of magic.',
    coverImageUrl: comicAdventure,
    genres: ['Adventure', 'Mystery'],
    chapterCount: 2,
    totalViews: '450K',
    revenue: '1.2Mđ',
    moderationStatus: 'PENDING_REVIEW',
    publicationStatus: 'ONGOING',
  },
  {
    id: 3,
    title: 'Shadow Path',
    description: 'A hidden path through ancient clans and forbidden techniques.',
    coverImageUrl: comicSciFi,
    genres: ['Drama', 'Cultivation'],
    chapterCount: 1,
    totalViews: '210K',
    revenue: '0.8Mđ',
    moderationStatus: 'HIDDEN',
    publicationStatus: 'HIATUS',
  },
]

const MOCK_CHAPTERS = {
  1: [
    { id: 101, chapterNumber: 1, title: 'Awakening', uploadedAt: 'Dec 20, 2024', views: '450K', status: 'APPROVED' },
    { id: 102, chapterNumber: 2, title: 'First Steps', uploadedAt: 'Dec 22, 2024', views: '380K', status: 'APPROVED' },
    { id: 103, chapterNumber: 3, title: 'The Gate', uploadedAt: 'Dec 28, 2024', views: '—', status: 'SUBMITTED_FOR_REVIEW' },
  ],
  2: [
    { id: 201, chapterNumber: 1, title: 'Dimensional Door', uploadedAt: 'Dec 18, 2024', views: '270K', status: 'APPROVED' },
    { id: 202, chapterNumber: 2, title: 'Broken Compass', uploadedAt: 'Dec 24, 2024', views: '—', status: 'SUBMITTED_FOR_REVIEW' },
  ],
  3: [
    { id: 301, chapterNumber: 1, title: 'Silent Clan', uploadedAt: 'Dec 10, 2024', views: '210K', status: 'HIDDEN' },
  ],
}

const normalizeArrayResponse = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

const normalizeGenres = (genres) => {
  if (Array.isArray(genres)) return genres
  if (typeof genres === 'string' && genres.trim()) {
    return genres.split(',').map((genre) => genre.trim()).filter(Boolean)
  }
  return []
}

const getComicId = (comic) => comic?.id || comic?.comicId || comic?._id

const getChapterId = (chapter) => chapter.id || chapter.chapterId || chapter._id

const getChapterNumber = (chapter) => chapter.chapterNumber ?? chapter.number ?? chapter.chapterNo ?? chapter.index

const getChapterTitle = (chapter) => chapter.title || chapter.chapterTitle || 'Untitled Chapter'

const getChapterCount = (comic) => comic?.chapterCount ?? comic?.chapters ?? comic?.totalChapters ?? 0

const formatModerationStatus = (status) => {
  const value = (status || 'PENDING_REVIEW').toString().toUpperCase()
  if (value === 'APPROVED' || value === 'PUBLISHED') return '✓ Approved'
  if (value === 'HIDDEN' || value === 'UNPUBLISHED') return '👁 Hidden'
  if (value === 'REJECTED') return '✕ Rejected'
  if (value === 'DRAFT') return 'Draft'
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

function AddChapterModal({ comic, onClose, onUploaded }) {
  const [chapterNumber, setChapterNumber] = useState((Number(getChapterCount(comic)) || 0) + 1)
  const [title, setTitle] = useState('')
  const [zipFile, setZipFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!zipFile) {
      setError('Please select a .zip chapter file.')
      return
    }

    const formData = new FormData()
    formData.append('chapterNumber', chapterNumber)
    formData.append('title', title)
    formData.append('zipFile', zipFile)

    setSubmitting(true)
    setError('')
    try {
      const preview = await uploadAuthorChapterZipApi(getComicId(comic), formData)
      onUploaded(preview)
      onClose()
    } catch (err) {
      setError('Could not upload ZIP. Please check API/backend connection.')
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
              type="number"
              min="1"
              value={chapterNumber}
              onChange={(event) => setChapterNumber(event.target.value)}
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
          Upload Pages (.zip) *
          <div className="author-upload-zone file-picker-zone">
            <input
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={(event) => setZipFile(event.target.files?.[0] || null)}
            />
            <div className="author-upload-icon">⇧</div>
            <strong>{zipFile ? zipFile.name : 'Drop chapter ZIP or select file'}</strong>
            <span>PNG/JPG images are sorted by filename automatically after backend extracts the ZIP.</span>
          </div>
        </label>

        <div className="author-alert info">
          ℹ Chapter will be created as preview first. Submit it for moderator review after checking the pages.
        </div>

        {error && <div className="author-form-error">{error}</div>}

        <div className="author-modal-actions">
          <button type="button" className="btn-author-action" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-author-action black" disabled={submitting}>
            {submitting ? 'Uploading...' : 'Upload ZIP'}
          </button>
        </div>
      </form>
    </div>
  )
}

function AuthorComicDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [comic, setComic] = useState(null)
  const [chapters, setChapters] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [usingMockData, setUsingMockData] = useState(false)
  const [showAddChapter, setShowAddChapter] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    let mounted = true

    const loadDetail = async () => {
      setLoading(true)
      setActionMessage('')
      try {
        const [comicResponse, chaptersResponse, metricsResponse] = await Promise.allSettled([
          getAuthorComicByIdApi(id),
          getAuthorComicChaptersApi(id),
          getAuthorComicMetricsApi(id),
        ])

        if (!mounted) return

        const nextComic = comicResponse.status === 'fulfilled' ? comicResponse.value : null
        const nextChapters = chaptersResponse.status === 'fulfilled' ? normalizeArrayResponse(chaptersResponse.value) : []
        const nextMetrics = metricsResponse.status === 'fulfilled' ? metricsResponse.value : null

        if (nextComic) {
          setComic(nextComic)
          setChapters(nextChapters)
          setMetrics(nextMetrics)
          setUsingMockData(false)
        } else {
          const fallbackComic = MOCK_DETAILS.find((item) => String(item.id) === String(id)) || MOCK_DETAILS[0]
          setComic(fallbackComic)
          setChapters(MOCK_CHAPTERS[fallbackComic.id] || [])
          setMetrics(null)
          setUsingMockData(true)
        }
      } catch (err) {
        if (!mounted) return
        const fallbackComic = MOCK_DETAILS.find((item) => String(item.id) === String(id)) || MOCK_DETAILS[0]
        setComic(fallbackComic)
        setChapters(MOCK_CHAPTERS[fallbackComic.id] || [])
        setMetrics(null)
        setUsingMockData(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadDetail()

    return () => {
      mounted = false
    }
  }, [id])

  const summary = useMemo(() => ({
    chapters: metrics?.chapterCount ?? getChapterCount(comic),
    views: metrics?.totalViews ?? comic?.totalViews ?? comic?.views ?? '0',
    revenue: metrics?.revenue ?? metrics?.totalRevenue ?? comic?.revenue ?? comic?.totalRevenue ?? '0đ',
  }), [comic, metrics])

  const handleChapterUploaded = (preview) => {
    const newChapter = {
      id: preview?.id || preview?.chapterId || `preview-${Date.now()}`,
      chapterNumber: preview?.chapterNumber || Number(summary.chapters) + 1,
      title: preview?.title || 'Preview chapter',
      uploadedAt: new Date().toISOString(),
      views: '—',
      status: preview?.status || 'PREVIEW_READY',
    }
    setChapters((current) => [...current, newChapter])
    setComic((current) => ({ ...current, chapterCount: Number(getChapterCount(current)) + 1 }))
    setActionMessage('ZIP uploaded. Preview is ready; submit it for moderator review after checking pages.')
  }

  const handleSubmitForReview = async (chapter) => {
    const chapterId = getChapterId(chapter)
    try {
      await submitAuthorChapterReviewApi(getComicId(comic), chapterId)
      setChapters((current) => current.map((item) => (
        getChapterId(item) === chapterId
          ? { ...item, status: 'SUBMITTED_FOR_REVIEW' }
          : item
      )))
      setActionMessage('Chapter submitted for moderator review.')
    } catch (err) {
      setActionMessage('Could not submit chapter. Please check API/backend connection.')
    }
  }

  if (loading) {
    return (
      <AuthorLayout activeNav="comics">
        <div className="author-empty-state">Loading comic detail...</div>
      </AuthorLayout>
    )
  }

  if (!comic) {
    return (
      <AuthorLayout activeNav="comics">
        <div className="author-empty-state">
          <h2>Comic not found</h2>
          <button className="btn-author-action black" onClick={() => navigate('/author/comics')}>Back to My Comics</button>
        </div>
      </AuthorLayout>
    )
  }

  const cover = comic.coverImageUrl || comic.coverUrl || comic.cover
  const genres = normalizeGenres(comic.genres)
  const moderationStatus = comic.moderationStatus || comic.status

  return (
    <AuthorLayout activeNav="comics">
      <div className="author-comic-detail-page">
        <div className="author-detail-breadcrumb">
          <Link to="/author/comics">← Back to My Comics</Link>
          <span>/</span>
          <strong>{comic.title}</strong>
          {usingMockData && <em>sample data</em>}
        </div>

        <section className="author-detail-hero">
          <div className="author-detail-cover">
            {cover ? <img src={cover} alt={comic.title} /> : <span>Cover</span>}
          </div>

          <div className="author-detail-info">
            <div className="author-detail-title-row">
              <h1>{comic.title}</h1>
              <span className={`author-status-badge ${getStatusClass(moderationStatus)}`}>
                {formatModerationStatus(moderationStatus)}
              </span>
            </div>

            <p>{comic.description || comic.tagline || 'No description has been added yet.'}</p>

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
            </div>
          </div>
        </section>

        {actionMessage && <div className="author-alert info detail-message">{actionMessage}</div>}

        <section className="author-chapter-section-card">
          <div className="author-chapter-section-head">
            <h2>Chapters ({chapters.length})</h2>
            <button className="btn-author-action black" onClick={() => setShowAddChapter(true)}>
              + Add Chapter
            </button>
          </div>

          <div className="author-table-scroll">
            <table className="author-chapter-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Uploaded</th>
                  <th>Views</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((chapter) => {
                  const status = chapter.status || chapter.moderationStatus
                  const canSubmit = status?.toString().toUpperCase() === 'PREVIEW_READY'
                  return (
                    <tr key={getChapterId(chapter)}>
                      <td className="chapter-no">Ch.{getChapterNumber(chapter)}</td>
                      <td>{getChapterTitle(chapter)}</td>
                      <td>{formatDate(chapter.uploadedAt || chapter.createdAt || chapter.submittedAt)}</td>
                      <td>{chapter.views || chapter.totalViews || '—'}</td>
                      <td>
                        <span className={`author-status-badge ${getStatusClass(status)}`}>
                          {formatModerationStatus(status)}
                        </span>
                      </td>
                      <td>
                        <div className="author-table-actions">
                          {canSubmit ? (
                            <button className="btn-table-action" onClick={() => handleSubmitForReview(chapter)}>
                              Submit Review
                            </button>
                          ) : (status || '').toString().toUpperCase() === 'APPROVED' ? (
                            <button className="btn-table-action">Hide</button>
                          ) : null}
                          <button className="btn-table-icon" title="Edit chapter">✎</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showAddChapter && (
        <AddChapterModal
          comic={comic}
          onClose={() => setShowAddChapter(false)}
          onUploaded={handleChapterUploaded}
        />
      )}
    </AuthorLayout>
  )
}

export default AuthorComicDetail
