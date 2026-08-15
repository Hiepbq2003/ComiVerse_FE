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
      {/* BACKGROUND BANNER */}
      <div className="comic-detail-hero comic-detail-wrapper">
        {isEmoji(displayCover) ? (
          <div className="hero-banner-bg-emoji-fallback" style={{ zIndex: 0 }}>{displayCover}</div>
        ) : (
          <div
            className="hero-banner-bg-img"
            style={{ backgroundImage: `url(${displayCover})` }}
          />
        )}
        <div className="hero-banner-gradient" />

        {/* COMIC MAIN METADATA CARD */}
        <div className="comic-detail-main-card">
          {/* Cover */}
          <div className="comic-detail-cover">
            {isEmoji(displayCover) ? (
              <div style={{ fontSize: '7rem', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.2) 0%, var(--reader-bg) 100%)' }}>{displayCover}</div>
            ) : (
              <img src={displayCover} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>

          {/* Details */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span className="detail-status-badge">
                {displayStatus}
              </span>
              {displayGenres.map((genre, idx) => (
                <span key={idx} className="detail-genre-tag">
                  {genre}
                </span>
              ))}
            </div>

            <h1 className="detail-title">
              {displayTitle}
            </h1>

            <p className="detail-author-artist">
              Story by <strong>{displayAuthor}</strong>  •  Art by <strong>{displayArtist}</strong>
            </p>

            {/* Stats Row */}
            <div className="detail-stats-card">
              <div style={{ textAlign: 'center' }}>
                <span className="detail-stats-label">Rating</span>
                <span className="detail-stats-value" style={{ color: '#fbbf24' }}>⭐ {displayRating}</span>
              </div>
              <div className="detail-stats-divider" />
              <div style={{ textAlign: 'center' }}>
                <span className="detail-stats-label">Views</span>
                <span className="detail-stats-value">👁️ {displayViews}</span>
              </div>
              <div className="detail-stats-divider" />
              <div style={{ textAlign: 'center' }}>
                <span className="detail-stats-label">Likes</span>
                <span className="detail-stats-value">❤️ {displayLikes}</span>
              </div>
              <div className="detail-stats-divider" />
              <div style={{ textAlign: 'center' }}>
                <span className="detail-stats-label">Bookmarks</span>
                <span className="detail-stats-value">🔖 {displayBookmarks}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={handleReadChapter1}
                className="btn-home-primary"
                style={{ padding: '12px 30px', fontSize: '15px' }}
              >
                Read Chapter 1
              </button>
              <button
                onClick={handleAddToLibrary}
                className="detail-action-btn"
                style={{ borderColor: inLibrary ? 'var(--reader-green)' : '', color: inLibrary ? 'var(--reader-green)' : '' }}
              >
                {inLibrary ? '✓ Saved to Library' : '🔖 Add to Library'}
              </button>
              <button
                onClick={handleToggleLike}
                className="detail-action-btn"
                style={{ borderColor: isLiked ? 'var(--reader-pink)' : '', color: isLiked ? 'var(--reader-pink)' : '' }}
              >
                {isLiked ? '❤️ Liked' : '🤍 Like'}
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="detail-action-btn"
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                title="Report issues with this comic or upload"
              >
                <Flag size={16} /> Report
              </button>
            </div>

            {/* Interactive Star Rating */}
            <div style={{ marginTop: '20px' }}>
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

      {/* CONTENT BODY */}
      <div className="home-sections-container comic-detail-wrapper" style={{ padding: '40px 10%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '40px' }}>

          {/* Left Column: Description + Chapters / Reviews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

            {/* Synopsis */}
            <div className="detail-synopsis-card">
              <h3 className="detail-section-title">Synopsis</h3>
              <p className="detail-synopsis-text">{displaySummary}</p>
            </div>

            {/* Tabs Selector */}
            <div className="detail-tabs-selector">
              <button
                onClick={() => setActiveTab('chapters')}
                className={`detail-tab-btn ${activeTab === 'chapters' ? 'active' : ''}`}
              >
                Chapters ({chapters.length})
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`detail-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
              >
                Comments
              </button>
            </div>

            {/* TAB CONTENT: CHAPTERS LIST */}
            {activeTab === 'chapters' && (
              <div>
                {availableLanguages.length > 0 && (
                  <ReadingLanguageSelector
                    languages={availableLanguages}
                    selectedLanguage={selectedLanguage}
                    onChange={setSelectedLanguage}
                  />
                )}

                <div
                  className="comic-detail-chapter-list"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '600px',
                    overflowY: 'auto',
                    paddingRight: '8px'
                  }}
                >
                {visibleChapters.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '14px', padding: '24px 8px', margin: 0 }}>
                    {selectedLanguage
                      ? 'No translated chapters are available in this language yet. Try Original, or wait until the translation is published.'
                      : 'No chapters available for this comic yet.'}
                  </p>
                ) : visibleChapters.map((ch) => {
                  const chNumber = ch.chapterNumber || '0'
                  const chTitle = ch.title || `Chapter ${chNumber}`
                  const chViewsStr = formatViews(ch.viewCount || 0)
                  const chDateStr = formatTimeAgo(ch.createdAt)

                  const isRead = readChapterIds.includes(ch.id)
                  const isPremium = Boolean(ch.isPremium === true || ch.isPremium === 'true' || ch.isPremium === 1)

                  return (
                    <div
                      key={ch.id || ch.chapterNumber}
                      className={`detail-chapter-row ${isRead ? 'read' : ''} ${isPremium ? 'premium' : ''}`}
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
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isPremium
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'rgba(168, 85, 247, 0.08)'
                        e.currentTarget.style.borderColor = isPremium
                          ? 'rgba(245, 158, 11, 0.55)'
                          : 'rgba(168, 85, 247, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isRead
                          ? 'rgba(168, 85, 247, 0.04)'
                          : isPremium
                          ? 'rgba(245, 158, 11, 0.05)'
                          : 'rgba(255, 255, 255, 0.02)'
                        e.currentTarget.style.borderColor = isRead
                          ? 'rgba(168, 85, 247, 0.25)'
                          : isPremium
                          ? '1px solid rgba(245, 158, 11, 0.3)'
                          : 'rgba(255, 255, 255, 0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="detail-chapter-title" style={{
                          fontWeight: '600',
                          color: isRead ? '#c084fc' : 'white',
                          fontSize: '14px'
                        }}>
                          {chTitle}
                        </span>

                        {isPremium && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#ffffff',
                            padding: '2px 9px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
                            letterSpacing: '0.3px'
                          }}>
                            🔒 Premium
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Views: {chViewsStr}</span>
                        <span className="detail-chapter-date" style={{ fontSize: '12px', color: '#94a3b8' }}>{chDateStr}</span>
                      </div>
                    </div>
                  )
                })}
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

          {/* Right Column: Sidebar (About / Artist / Info) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="detail-info-card">
              <h3 className="detail-section-title" style={{ borderBottom: '1px solid var(--reader-border)', paddingBottom: '12px' }}>Comic Info</h3>
              <div className="detail-info-item">
                <span>Author</span>
                <strong>{displayAuthor}</strong>
              </div>
              <div className="detail-info-item">
                <span>Artist</span>
                <strong>{displayArtist}</strong>
              </div>
              <div className="detail-info-item">
                <span>Original Language</span>
                <strong>{displayLanguage}</strong>
              </div>
              <div className="detail-info-item">
                <span>Status</span>
                <strong>{displayStatus}</strong>
              </div>
              <div className="detail-info-item">
                <span>Publish Date</span>
                <strong>Jan 12, 2025</strong>
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