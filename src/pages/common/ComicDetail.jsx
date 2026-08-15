import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getAuth } from '../../utils/Auth'
import axios from 'axios'
import { getComicByIdApi } from '../../services/api/ComicApi'
import { getChaptersByComicIdApi, getComicTranslationLanguagesApi } from '../../services/api/ChapterApi'
import { checkLikeStatusApi, toggleLikeStatusApi } from '../../services/api/LikeApi'
import { checkSaveStatusApi, toggleSaveStatusApi } from '../../services/api/SaveApi'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import { toast } from 'react-toastify'
import { getReadChaptersByComicIdApi } from '../../services/api/ReadingHistoryApi'
import CommentSection from '../../components/common/CommentSection'
import StarRating from '../../components/common/StarRating'
import ReadingLanguageSelector, { chapterHasLanguage, normalizeLanguageCode } from '../../components/common/ReadingLanguageSelector'
import { useAuth } from '../../context/AuthContext'
import SubscriptionPlanModal from '../../components/common/SubscriptionPlanModal'
import ReportSubmitModal from '../../components/report/ReportSubmitModal'
import { Flag } from 'lucide-react'
import '../../assets/style/reader/comic-detail.css'

// Import assets
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'

function ComicDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const targetCommentIdFromUrl = searchParams.get('comment')

  const [activeTab, setActiveTab] = useState('chapters')
  const [user, setUser] = useState(null)
  const [inLibrary, setInLibrary] = useState(false)

  // Backend integration states
  const [comic, setComic] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMockData, setIsMockData] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [readChapterIds, setReadChapterIds] = useState([])
  const [availableLanguages, setAvailableLanguages] = useState([])
  const [selectedLanguage, setSelectedLanguage] = useState('') // '' = original (no overlay)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  const { user: authUser, isLoggedIn } = useAuth()

  // Spam prevention and state mapping refs
  const likeTimeoutRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const serverLikedRef = useRef(false)
  const serverSavedRef = useRef(false)


  // Helper to format views
  const formatViews = (count) => {
    if (count === undefined || count === null) return '0'
    const num = Number(count)
    if (isNaN(num)) return String(count)
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return String(num)
  }

  // Get current user on mount
  useEffect(() => {
    const auth = getAuth()
    if (auth && auth.user) {
      setUser(auth.user)
    }
  }, [])

  // Load details from API or fall back to mock
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const fetchComicDetail = async () => {
      try {
        setLoading(true)

        // Check user login status at call time
        const auth = getAuth()
        const isLoggedIn = !!(auth && auth.user)

        // Perform parallel async API calls to prevent sequential blocking
        const [comicRes, chaptersRes, saveCheckRes, likeCheckRes, readHistoryRes, languagesRes] = await Promise.all([
          getComicByIdApi(id, { signal }),
          getChaptersByComicIdApi(id, { signal }),
          isLoggedIn ? checkSaveStatusApi(id, { signal }) : Promise.resolve(null),
          isLoggedIn ? checkLikeStatusApi(id, { signal }) : Promise.resolve(null),
          isLoggedIn ? getReadChaptersByComicIdApi(id, { signal }) : Promise.resolve(null),
          getComicTranslationLanguagesApi(id, { signal }).catch(() => ({ data: [] }))
        ])

        const comicData = comicRes?.data || comicRes
        const chaptersData = chaptersRes?.data || chaptersRes || []
        const languagesData = languagesRes?.data || languagesRes || []

        // Save/Like check resolves to a boolean or object containing it
        const savedStatus = saveCheckRes?.data !== undefined ? saveCheckRes.data : !!saveCheckRes
        const likedStatus = likeCheckRes?.data !== undefined ? likeCheckRes.data : !!likeCheckRes
        const readHistoryData = readHistoryRes?.data || readHistoryRes || []

        setComic(comicData)
        setChapters(chaptersData)
        setInLibrary(savedStatus)
        setIsLiked(likedStatus)
        setReadChapterIds(readHistoryData)
        setAvailableLanguages(Array.isArray(languagesData) ? languagesData : [])

        // Sync refs for debounce tracking
        serverSavedRef.current = savedStatus
        serverLikedRef.current = likedStatus

        setIsMockData(false)
      } catch (err) {
        if (err.name !== 'CanceledError' && !axios.isCancel(err)) {
          console.error('API failed:', err.message)
          setComic(null)
          setChapters([])
          setInLibrary(false)
          setIsLiked(false)
          setReadChapterIds([])
          setAvailableLanguages([])
          serverSavedRef.current = false
          serverLikedRef.current = false
          setIsMockData(false)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchComicDetail()

    return () => {
      controller.abort()
    }
  }, [id, user])

  const handleAddToLibrary = () => {
    if (!user) {
      navigate('/auth?mode=signin')
      return
    }

    const next = !inLibrary
    setInLibrary(next)

    // Update save count on screen immediately
    setComic(prevComic => {
      if (!prevComic) return prevComic
      const diff = next ? 1 : -1
      const currentCount = Number(prevComic.saveCount || 0)
      return {
        ...prevComic,
        saveCount: Math.max(0, currentCount + diff)
      }
    })

    // Clear any pending toggle API call to enforce 1s debounce
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (next !== serverSavedRef.current) {
          await toggleSaveStatusApi(id)
          serverSavedRef.current = next
        }
      } catch (err) {
        console.error('Failed to toggle save status:', err)
        toast.error('Failed to update library status!')
        // Revert local state on failure
        setInLibrary(serverSavedRef.current)
        setComic(prevComic => {
          if (!prevComic) return prevComic
          const adjust = (serverSavedRef.current ? 1 : 0) - (next ? 1 : 0)
          const baseCount = Number(prevComic.saveCount || 0)
          return {
            ...prevComic,
            saveCount: Math.max(0, baseCount + adjust)
          }
        })
      }
    }, 1000)
  }

  const handleToggleLike = () => {
    if (!user) {
      navigate('/auth?mode=signin')
      return
    }

    const next = !isLiked
    setIsLiked(next)

    // Update like count on screen immediately
    setComic(prevComic => {
      if (!prevComic) return prevComic
      const diff = next ? 1 : -1
      const currentCount = Number(prevComic.likeCount || 0)
      return {
        ...prevComic,
        likeCount: Math.max(0, currentCount + diff)
      }
    })

    // Clear any pending toggle API call to enforce 1s debounce
    if (likeTimeoutRef.current) {
      clearTimeout(likeTimeoutRef.current)
    }

    likeTimeoutRef.current = setTimeout(async () => {
      try {
        if (next !== serverLikedRef.current) {
          await toggleLikeStatusApi(id)
          serverLikedRef.current = next
        }
      } catch (err) {
        console.error('Failed to toggle like status:', err)
        toast.error('Failed to update like status!')
        // Revert local state on failure
        setIsLiked(serverLikedRef.current)
        setComic(prevComic => {
          if (!prevComic) return prevComic
          const adjust = (serverLikedRef.current ? 1 : 0) - (next ? 1 : 0)
          const baseCount = Number(prevComic.likeCount || 0)
          return {
            ...prevComic,
            likeCount: Math.max(0, baseCount + adjust)
          }
        })
      }
    }, 1000)
  }

  // Auto switch tab if navigated from notification for a comment
  useEffect(() => {
    if (targetCommentIdFromUrl) {
      setActiveTab('comments')
    }
  }, [targetCommentIdFromUrl])

  const handleReadChapter1 = () => {
    const filteredChapters = chapters.filter(ch => chapterHasLanguage(ch, selectedLanguage))
      
    if (filteredChapters && filteredChapters.length > 0) {
      // Find the first chapter (sorting by chapter number ascending)
      const sorted = [...filteredChapters].sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber))
      const firstChap = sorted[0]
      const langQuery = selectedLanguage ? `?lang=${encodeURIComponent(normalizeLanguageCode(selectedLanguage) || selectedLanguage)}` : ''
      navigate(`/comic/${id}/chapter/${firstChap.id}${langQuery}`)
    } else {
      toast.warning(selectedLanguage
        ? 'No translated chapters are available in this language yet.'
        : 'No chapters available for this comic yet.')
    }
  }

  if (loading || !comic) {
    return (
      <HomeLayout>
        <div style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
          <div className="search-spinner" style={{ margin: '0 auto 16px', borderLeftColor: '#a855f7' }}></div>
          <p>Loading comic details...</p>
        </div>
      </HomeLayout>
    )
  }

  // Helper to detect if cover is an emoji character
  const isEmoji = (str) => {
    if (!str) return false
    return !str.includes('/') && !str.includes('.') && str.trim().length <= 4
  }

  // Cover image fallback picker
  const getCoverImage = (coverPath, titleVal, comicId) => {
    if (coverPath && typeof coverPath === 'string') {
      return coverPath
    }
    const t = (titleVal || '').toLowerCase()
    if (t.includes('action') || t.includes('battle')) return comicAction
    if (t.includes('adventure') || t.includes('dragon')) return comicAdventure
    if (t.includes('sci-fi') || t.includes('neon') || t.includes('cyber')) return comicScifi
    // Default fallback cycling
    const fallbacks = [comicAction, comicAdventure, comicScifi]
    const idHash = typeof comicId === 'string' ? comicId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : comicId || 0
    return fallbacks[idHash % 3] || comicAction
  }

  const displayCover = getCoverImage(comic.cover, comic.title, comic.id)
  const displayTitle = comic.title || 'Untitled Comic'
  const publicationStatus = comic.publicationStatus || 'ONGOING'
  const displayStatus = publicationStatus.charAt(0).toUpperCase() + publicationStatus.slice(1).toLowerCase()

  const displayGenres = comic.genres
    ? comic.genres.map(g => typeof g === 'object' && g !== null ? g.name : g)
    : []

  // ComicDTO exposes the creator profile name as `authorName`, resolved by the
  // backend from ComicEntity.authorId -> AuthorEntity.displayName. The current
  // domain model has no separate artist relation, so both Author and Artist
  // intentionally display the same Author profile display name. Keep the old
  // `author` fallback only for legacy/mock payloads.
  const resolvedAuthorDisplayName =
    comic.authorName ||
    comic.authorDisplayName ||
    (typeof comic.author === 'object' ? comic.author?.displayName : comic.author) ||
    'Unknown'

  const displayAuthor = resolvedAuthorDisplayName
  const displayArtist = resolvedAuthorDisplayName
  const displayLanguage = comic.language || 'Unknown'

  const displayRating = comic.ratingAverage !== undefined
    ? comic.ratingAverage.toFixed(1)
    : (comic.rating || '0.0')

  const displayViews = comic.viewCount !== undefined
    ? formatViews(comic.viewCount)
    : (comic.views || '0')

  const displayBookmarks = comic.saveCount !== undefined
    ? formatViews(comic.saveCount)
    : (comic.bookmarks || '0')

  const displayLikes = comic.likeCount !== undefined
    ? formatViews(comic.likeCount)
    : (comic.likes || '0')

  const displaySummary = comic.summary || comic.tagline || 'No synopsis available.'
  const visibleChapters = chapters.filter((ch) => chapterHasLanguage(ch, selectedLanguage))
  const chapterLangQuery = selectedLanguage
    ? `?lang=${encodeURIComponent(normalizeLanguageCode(selectedLanguage) || selectedLanguage)}`
    : ''

  return (
    <HomeLayout>
      {/* HERO BANNER SECTION */}
      <div className="comic-detail-hero-section">
        {/* Blurred Backdrop Image */}
        {displayCover && !isEmoji(displayCover) && (
          <div
            className="hero-backdrop-img"
            style={{ backgroundImage: `url(${displayCover})` }}
          />
        )}
        <div className="hero-backdrop-overlay" />

        {/* HERO CONTENT */}
        <div className="comic-detail-hero-content">
          {/* Cover */}
          <div className="comic-detail-cover-wrapper">
            {isEmoji(displayCover) ? (
              <div className="comic-detail-emoji-cover">{displayCover}</div>
            ) : (
              <img src={displayCover} alt={displayTitle} />
            )}
          </div>

          {/* Info Block */}
          <div className="hero-info-block">
            {/* Badges Row */}
            <div className="hero-badges-row">
              <span className="hero-status-badge">
                {displayStatus}
              </span>
              {displayGenres.map((genre, idx) => (
                <span key={idx} className="detail-genre-tag">
                  {genre}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="hero-comic-title">
              {displayTitle}
            </h1>

            {/* Credits */}
            <p className="hero-comic-credits">
              Story by <strong>{displayAuthor}</strong> • Art by <strong>{displayArtist}</strong>
            </p>

            {/* Stats Bar */}
            <div className="hero-stats-glass-bar">
              <div className="hero-stat-item">
                <span className="hero-stat-label">Rating</span>
                <span className="hero-stat-val rating">⭐ {displayRating}</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <span className="hero-stat-label">Views</span>
                <span className="hero-stat-val">👁️ {displayViews}</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <span className="hero-stat-label">Likes</span>
                <span className="hero-stat-val">❤️ {displayLikes}</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat-item">
                <span className="hero-stat-label">Bookmarks</span>
                <span className="hero-stat-val">🔖 {displayBookmarks}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="hero-actions-group">
              <button
                onClick={handleReadChapter1}
                className="hero-btn-primary"
              >
                <span>📖</span> Read Chapter 1
              </button>
              <button
                onClick={handleAddToLibrary}
                className={`hero-btn-glass ${inLibrary ? 'active-saved' : ''}`}
              >
                {inLibrary ? '✓ Saved to Library' : '🔖 Add to Library'}
              </button>
              <button
                onClick={handleToggleLike}
                className={`hero-btn-glass ${isLiked ? 'active-liked' : ''}`}
              >
                {isLiked ? '❤️ Liked' : '🤍 Like'}
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="hero-btn-glass hero-btn-report"
                title="Report issues with this comic or upload"
              >
                <Flag size={16} /> Report
              </button>
            </div>

            {/* Interactive Star Rating */}
            <div className="hero-rating-box">
              <StarRating
                comicId={id}
                user={user}
                initialRatingAverage={comic.ratingAverage}
                initialRatingCount={comic.ratingCount}
                initialUserScore={comic.userScore}
                onRatingChange={(updatedRating) => {
                  setComic(prev => prev ? {
                    ...prev,
                    ratingAverage: updatedRating.ratingAverage,
                    ratingCount: updatedRating.ratingCount,
                    userScore: updatedRating.userScore
                  } : prev)
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BODY CONTENT */}
      <div className="comic-detail-body-container">
        <div className="comic-detail-main-grid">

          {/* Left Column: Description + Chapters / Comments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

            {/* Synopsis */}
            <div className="detail-synopsis-card">
              <h3 className="detail-section-title">
                <span>📖</span> Synopsis
              </h3>
              <p className="detail-synopsis-text">{displaySummary}</p>
            </div>

            {/* Tabs Selector */}
            <div>
              <div className="detail-tabs-header">
                <button
                  onClick={() => setActiveTab('chapters')}
                  className={`detail-tab-button ${activeTab === 'chapters' ? 'active' : ''}`}
                >
                  Chapters ({chapters.length})
                </button>
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`detail-tab-button ${activeTab === 'comments' ? 'active' : ''}`}
                >
                  Comments
                </button>
              </div>

              {/* TAB CONTENT: CHAPTERS LIST */}
              {activeTab === 'chapters' && (
                <div>
                  {availableLanguages.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <ReadingLanguageSelector
                        languages={availableLanguages}
                        selectedLanguage={selectedLanguage}
                        onChange={setSelectedLanguage}
                      />
                    </div>
                  )}

                  <div className="detail-chapters-list">
                    {visibleChapters.length === 0 ? (
                      <div className="detail-no-chapters">
                        <p style={{ margin: 0 }}>
                          {selectedLanguage
                            ? 'No translated chapters are available in this language yet. Try Original, or wait until the translation is published.'
                            : 'No chapters available for this comic yet.'}
                        </p>
                      </div>
                    ) : (
                      visibleChapters.map((ch) => {
                        const chNumber = ch.chapterNumber || '0'
                        const chTitle = ch.title || `Chapter ${chNumber}`
                        const chViewsStr = formatViews(ch.viewCount || 0)
                        const chDateStr = formatTimeAgo(ch.createdAt)

                        const isRead = readChapterIds.includes(ch.id)
                        const isPremium = Boolean(ch.isPremium === true || ch.isPremium === 'true' || ch.isPremium === 1)

                        return (
                          <div
                            key={ch.id || ch.chapterNumber}
                            className={`detail-chapter-card ${isRead ? 'read' : ''} ${isPremium ? 'premium' : ''}`}
                            onClick={() => {
                              if (isPremium) {
                                const auth = getAuth()
                                const activeUser = authUser || auth?.user || user
                                const loggedIn = isLoggedIn || !!(auth && auth.user && auth.token)

                                if (!loggedIn || !activeUser) {
                                  toast.info('Please sign in to read this Premium chapter.')
                                  navigate('/auth?mode=signin', { state: { from: location } })
                                  return
                                }

                                const roleStr = String(activeUser.role || activeUser.roleName || activeUser.role?.roleName || '').toUpperCase()
                                const isVip = Boolean(
                                  activeUser.premiumActive ||
                                  activeUser.isVip ||
                                  activeUser.isPremium ||
                                  roleStr === 'ADMIN' ||
                                  roleStr === 'MODERATOR'
                                )

                                if (!isVip) {
                                  setShowSubscriptionModal(true)
                                  return
                                }
                              }

                              const langQuery = chapterLangQuery
                              navigate(`/comic/${id}/chapter/${ch.id}${langQuery}`)
                            }}
                          >
                            <div className="detail-chapter-name">
                              {isRead && <span className="read-status-pill">Read</span>}
                              <span>{chTitle}</span>
                              {isPremium && (
                                <span className="premium-badge-pill">
                                  🔒 Premium
                                </span>
                              )}
                            </div>

                            <div className="detail-chapter-meta">
                              <span>👁️ {chViewsStr}</span>
                              <span className="detail-chapter-date">{chDateStr}</span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: COMMENTS FEED */}
              {activeTab === 'comments' && (
                <CommentSection
                  targetType="comic"
                  targetId={id}
                  user={user}
                  targetCommentIdFromUrl={targetCommentIdFromUrl}
                />
              )}
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <div>
            <div className="detail-sidebar-info-card">
              <h3 className="detail-section-title">
                <span>ℹ️</span> Comic Info
              </h3>
              <div className="detail-info-list">
                <div className="detail-info-item">
                  <span className="info-item-label">Author</span>
                  <span className="info-item-val">{displayAuthor}</span>
                </div>
                <div className="detail-info-item">
                  <span className="info-item-label">Artist</span>
                  <span className="info-item-val">{displayArtist}</span>
                </div>
                <div className="detail-info-item">
                  <span className="info-item-label">Original Language</span>
                  <span className="info-item-val">{displayLanguage}</span>
                </div>
                <div className="detail-info-item">
                  <span className="info-item-label">Publication Status</span>
                  <span className="info-item-val">{displayStatus}</span>
                </div>
                <div className="detail-info-item">
                  <span className="info-item-label">Total Chapters</span>
                  <span className="info-item-val">{chapters.length} Chapters</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <SubscriptionPlanModal
        open={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
      <ReportSubmitModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="COMIC"
        targetId={id}
        targetTitle={comic?.title || 'Comic Series'}
      />
    </HomeLayout>
  )
}

export default ComicDetail