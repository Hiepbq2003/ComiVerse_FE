import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthorLayout from '../../components/layout/AuthorLayout'
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicSciFi from '../../assets/comic_scifi.png'
import {
  createAuthorComicApi,
  getAuthorComicsApi,
  uploadAuthorChapterZipApi,
} from '../../services/api/AuthorComicApi'

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

const MOCK_COMICS = [
  {
    id: 1,
    title: 'New Life',
    description: 'A cultivator reborn in a new world seeks to reclaim his power.',
    coverImageUrl: comicAction,
    genres: ['Fantasy', 'Action'],
    chapterCount: 3,
    totalViews: '1.2M',
    revenue: '5.5Mđ',
    updatedAgo: '1 day ago',
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
    updatedAgo: '3 days ago',
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
    updatedAgo: '2 weeks ago',
    moderationStatus: 'HIDDEN',
    publicationStatus: 'HIATUS',
  },
]

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

const getComicId = (comic) => comic.id || comic.comicId || comic._id

const getComicCover = (comic, index = 0) => (
  comic.coverImageUrl || comic.coverUrl || comic.cover || [comicAction, comicAdventure, comicSciFi][index % 3]
)

const getChapterCount = (comic) => (
  comic.chapterCount ?? comic.chapters ?? comic.totalChapters ?? comic.pageCount ?? 0
)

const formatPublicationStatus = (status) => {
  const value = (status || 'ONGOING').toString().toUpperCase()
  if (value === 'HIATUS' || value === 'ON_HIATUS') return 'On Hiatus'
  if (value === 'COMPLETED') return 'Completed'
  return 'Ongoing'
}

const formatModerationStatus = (status) => {
  const value = (status || 'PENDING_REVIEW').toString().toUpperCase()
  if (value === 'APPROVED' || value === 'PUBLISHED') return '✓ Approved'
  if (value === 'HIDDEN' || value === 'UNPUBLISHED') return '👁 Hidden'
  if (value === 'REJECTED') return '✕ Rejected'
  if (value === 'DRAFT') return 'Draft'
  return '⏳ Pending Review'
}

const getModerationClass = (status) => {
  const value = (status || '').toString().toUpperCase()
  if (value === 'APPROVED' || value === 'PUBLISHED') return 'approved'
  if (value === 'HIDDEN' || value === 'UNPUBLISHED') return 'hidden'
  if (value === 'REJECTED') return 'rejected'
  if (value === 'DRAFT') return 'draft'
  return 'pending'
}

const getPublicationClass = (status) => {
  const value = (status || 'ONGOING').toString().toUpperCase()
  if (value === 'COMPLETED') return 'completed'
  if (value === 'HIATUS' || value === 'ON_HIATUS') return 'hiatus'
  return 'ongoing'
}

function CreateComicModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    genres: [],
    publicationStatus: 'ONGOING',
    coverImageUrl: '',
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (step === 1) {
      if (!form.title.trim()) {
        setError('Title is required.')
        return
      }
      setError('')
      setStep(2)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const created = await createAuthorComicApi({
        title: form.title.trim(),
        description: form.description.trim(),
        genres: form.genres,
        publicationStatus: form.publicationStatus,
        coverImageUrl: form.coverImageUrl.trim(),
      })
      onCreated(created)
      onClose()
    } catch (err) {
      setError('Could not create comic. Please check API/backend connection.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="author-modal-backdrop" role="presentation">
      <form className="author-modal author-comic-modal" onSubmit={handleSubmit}>
        <div className="author-modal-head">
          <div>
            <h2>Upload New Comic</h2>
            <p>Step {step} of 2</p>
          </div>
          <button type="button" className="author-icon-btn ghost" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="author-step-line">
          <span className="active" />
          <span className={step === 2 ? 'active' : ''} />
        </div>

        {step === 1 ? (
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

            <div className="author-form-label">
              Publication Status
              <div className="author-segmented">
                {[
                  ['ONGOING', 'Ongoing'],
                  ['COMPLETED', 'Completed'],
                  ['HIATUS', 'Hiatus'],
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
          </div>
        ) : (
          <div className="author-modal-body">
            <label className="author-form-label">
              Cover Image URL
              <input
                className="author-input"
                value={form.coverImageUrl}
                onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })}
                placeholder="https://.../cover.png"
              />
            </label>

            <div className="author-upload-zone muted">
              <div className="author-upload-icon">⇧</div>
              <strong>Cover image upload area</strong>
              <span>FE currently sends coverImageUrl. Connect this zone to your upload image API later.</span>
            </div>

            <div className="author-alert warning">
              ⚠ After submitting, your comic will be reviewed by a moderator before going public.
            </div>
          </div>
        )}

        {error && <div className="author-form-error">{error}</div>}

        <div className="author-modal-actions">
          {step === 2 && (
            <button type="button" className="btn-author-action" onClick={() => setStep(1)} disabled={submitting}>Back</button>
          )}
          <button type="button" className="btn-author-action" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-author-action black" disabled={submitting}>
            {step === 1 ? 'Next' : submitting ? 'Creating...' : 'Submit for Review'}
          </button>
        </div>
      </form>
    </div>
  )
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
            <span>Backend extracts images, sorts by filename, uploads images, then returns preview.</span>
          </div>
        </label>

        <div className="author-alert info">
          ℹ Chapter will be uploaded as preview first. Author submits it for moderator review after checking pages.
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

function AuthorComics() {
  const navigate = useNavigate()
  const [comics, setComics] = useState(MOCK_COMICS)
  const [loading, setLoading] = useState(true)
  const [usingMockData, setUsingMockData] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [chapterTarget, setChapterTarget] = useState(null)

  useEffect(() => {
    let mounted = true

    const loadComics = async () => {
      try {
        const response = await getAuthorComicsApi()
        const list = normalizeArrayResponse(response)
        if (mounted && list.length > 0) {
          setComics(list)
          setUsingMockData(false)
        } else if (mounted) {
          setUsingMockData(true)
        }
      } catch (err) {
        if (mounted) setUsingMockData(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadComics()

    return () => {
      mounted = false
    }
  }, [])

  const pendingReviewCount = useMemo(() => comics.filter((comic) => {
    const status = (comic.moderationStatus || comic.status || '').toString().toUpperCase()
    return status.includes('PENDING') || status.includes('REVIEW')
  }).length, [comics])

  const handleCreated = (createdComic) => {
    setComics((current) => [createdComic, ...current])
  }

  const handleChapterUploaded = (preview) => {
    const comicId = getComicId(chapterTarget)
    setComics((current) => current.map((comic) => (
      getComicId(comic) === comicId
        ? { ...comic, chapterCount: Number(getChapterCount(comic)) + 1, latestChapterPreview: preview }
        : comic
    )))
    navigate(`/author/comics/${comicId}`)
  }

  return (
    <AuthorLayout activeNav="comics">
      <div className="author-comics-page">
        <div className="author-list-header-row">
          <div>
            <h1>My Comics</h1>
            <p>
              {loading ? 'Loading comics...' : `${comics.length} comics · ${pendingReviewCount} pending review`}
              {usingMockData ? ' · sample data' : ''}
            </p>
          </div>
          <button className="btn-author-action black large" onClick={() => setShowCreateModal(true)}>
            + Upload New Comic
          </button>
        </div>

        <div className="author-comic-list">
          {comics.map((comic, index) => {
            const comicId = getComicId(comic)
            const moderationStatus = comic.moderationStatus || comic.status
            const publicationStatus = comic.publicationStatus || comic.comicStatus
            const genres = normalizeGenres(comic.genres)
            const cover = getComicCover(comic, index)

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
                    <span>👁 {comic.totalViews || comic.views || 0} views</span>
                    <span>💰 {comic.revenue || comic.totalRevenue || '0đ'}</span>
                    <span>🕘 {comic.updatedAgo || comic.updatedAt || comic.createdAt || 'Recently'}</span>
                  </div>

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
                  <button className="btn-author-action">
                    ✎ Edit Info
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
