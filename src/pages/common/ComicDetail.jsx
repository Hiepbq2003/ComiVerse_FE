import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getAuth } from '../../utils/Auth'
import axios from 'axios'
import { getComicByIdApi } from '../../services/api/ComicApi'
import { getChaptersByComicIdApi, getComicTranslationLanguagesApi } from '../../services/api/ChapterApi'
import { checkLikeStatusApi, toggleLikeStatusApi } from '../../services/api/LikeApi'
import { checkSaveStatusApi, toggleSaveStatusApi } from '../../services/api/SaveApi'
import { getComicCommentsApi } from '../../services/api/CommentApi'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import { toast } from 'react-toastify'
import { getReadChaptersByComicIdApi } from '../../services/api/ReadingHistoryApi'
import CommentSection from '../../components/common/CommentSection'
import StarRating from '../../components/common/StarRating'
import SubscriptionPlanModal from '../../components/common/SubscriptionPlanModal'
import '../../assets/style/reader/comic-detail.css'
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

        let comicData = comicRes?.data || comicRes
        const chaptersData = chaptersRes?.data || chaptersRes || []
        const languagesData = languagesRes?.data || languagesRes || []

        // Save/Like check resolves to a boolean or object containing it
        const savedStatus = saveCheckRes?.data !== undefined ? saveCheckRes.data : !!saveCheckRes
        const likedStatus = likeCheckRes?.data !== undefined ? likeCheckRes.data : !!likeCheckRes
        const readHistoryData = readHistoryRes?.data || readHistoryRes || []

        try {
          // Attempt to merge from override if it's a new submission
          const subsStr = localStorage.getItem('comiverse_moderator_submissions_override');
          if (subsStr) {
            const subs = JSON.parse(subsStr);
            const override = subs.find(s => String(s.comicId || s.id) === String(id));
            if (override) {
              comicData = { ...comicData, ...override, genres: override.genres || override.genre || comicData?.genres || [] };
            }
          }
          // Attempt to merge from Moderator/Author edits
          const localEdit = localStorage.getItem('comiverse_local_comic_' + id);
          if (localEdit) {
            const parsedEdit = JSON.parse(localEdit);
            comicData = { ...comicData, ...parsedEdit, genres: parsedEdit.genres || parsedEdit.genre || comicData?.genres || [] };
          }
        } catch(e) {}

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
    if (id) {
      getComicCommentsApi(id, '', 1, 10).catch(() => {})
    }

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

  const hasInternalChapterAccess = ['ADMIN', 'MODERATOR', 'AUTHOR', 'TRANSLATOR', 'PROJECT_LEADER']
    .includes((user?.role || '').toUpperCase())

  const openChapter = (chapter) => {
    if (!chapter) return

    if (chapter.isPremium && !user?.premiumActive && !hasInternalChapterAccess) {
      if (!user) {
        toast.info('Please sign in and upgrade to Premium to read this chapter.')
        navigate('/auth?mode=signin')
      } else {
        setShowSubscriptionModal(true)
      }
      return
    }

    const langQuery = selectedLanguage ? `?lang=${encodeURIComponent(selectedLanguage)}` : ''
    navigate(`/comic/${id}/chapter/${chapter.id}${langQuery}`)
  }

  const handleReadChapter1 = () => {
    if (chapters && chapters.length > 0) {
      // Find the first chapter (sorting by chapter number ascending)
      const sorted = [...chapters].sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber))
      openChapter(sorted[0])
    } else {
      toast.warning('No chapters available for this comic yet.')
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

  // Cover image helper
  const getCoverImage = (coverPath, titleVal, comicId) => {
    return coverPath || '';
  }

  const displayCover = getCoverImage(comic.cover, comic.title, comic.id)
  const displayTitle = comic.title || 'Untitled Comic'
  const publicationStatus = comic.publicationStatus || 'ONGOING'
  const displayStatus = publicationStatus.charAt(0).toUpperCase() + publicationStatus.slice(1).toLowerCase()

  const parseGenresList = (input) => {
    if (!input) return [];
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          return parseGenresList(JSON.parse(trimmed));
        } catch (e) {}
      }
      return trimmed.split(',').map(s => s.trim().replace(/^['"\[\]]+|['"\[\]]+$/g, '')).filter(Boolean);
    }
    if (Array.isArray(input)) {
      let result = [];
      input.forEach(item => {
        if (typeof item === 'string') {
          result.push(...parseGenresList(item));
        } else if (typeof item === 'object' && item !== null) {
          const name = item.name || item.genreName || item.title || item.label || item.genre?.name || item.category?.name || '';
          if (name) result.push(String(name).trim());
        } else if (item) {
          result.push(String(item).trim());
        }
      });
      return Array.from(new Set(result));
    }
    if (typeof input === 'object' && input !== null) {
      const name = input.name || input.genreName || input.title || input.label || input.genre?.name || input.category?.name || '';
      if (name) return [String(name).trim()];
    }
    return [];
  };

  const parsedGenres = parseGenresList(
    comic.genres || comic.genre || comic.categories || comic.genreNames || comic.tags
  );
  const displayGenres = parsedGenres.length > 0 ? parsedGenres : ['Fantasy'];

  let rawDisplayAuthor = comic.authorName || (typeof comic.author === 'object' ? (comic.author?.displayName || comic.author?.fullName || comic.author?.username) : comic.author) || (typeof comic.user === 'object' ? (comic.user?.fullName || comic.user?.username) : comic.user) || comic.creatorName || comic.submittedBy || user?.fullName || 'Unknown Author';
  
  if (typeof rawDisplayAuthor === 'string') {
    rawDisplayAuthor = rawDisplayAuthor.replace(/^(Author:\s*)+/gi, '').trim();
  }
  const displayAuthor = rawDisplayAuthor;

  const displayLanguage = comic.language || comic.rawLanguage || 'Unknown'

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

  return (
    <HomeLayout>
      {/* CINEMATIC HERO SECTION */}
      <div className="comic-detail-hero-section">
        {!isEmoji(displayCover) && (
          <div
            className="hero-backdrop-img"
            style={{ backgroundImage: `url(${displayCover})` }}
          />
        )}
        <div className="hero-backdrop-overlay" />

        <div className="comic-detail-hero-content">
          {/* Details */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <button onClick={() => navigate(-1)} className="hero-back-btn">
              ← Back
            </button>

            <div className="hero-badges-row">
              <span className="hero-status-badge">{displayStatus}</span>
              {displayGenres.map((genre, idx) => (
                <span key={idx} className="hero-genre-tag">
                  {genre}
                </span>
              ))}
            </div>

            <h1 className="hero-comic-title">{displayTitle}</h1>

            <p className="hero-comic-credits">
              Author: <strong>{displayAuthor}</strong>
            </p>

            {/* Glassmorphism Stats Bar */}
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
              <button onClick={handleReadChapter1} className="hero-btn-primary">
                ▶ Read Chapter 1
              </button>
              <button
                onClick={handleAddToLibrary}
                className={`hero-btn-glass ${inLibrary ? 'active-saved' : ''}`}
              >
                {inLibrary ? '✓ Saved in Library' : '🔖 Add to Library'}
              </button>
              <button
                onClick={handleToggleLike}
                className={`hero-btn-glass ${isLiked ? 'active-liked' : ''}`}
              >
                {isLiked ? '❤️ Liked' : '🤍 Like'}
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

          {/* Cover */}
          <div className="comic-detail-cover-wrapper">
            {isEmoji(displayCover) ? (
              <div style={{ fontSize: '7rem', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.2) 0%, rgba(13, 9, 25, 0.98) 100%)' }}>{displayCover}</div>
            ) : (
              <img src={displayCover} alt={displayTitle} />
            )}
          </div>
        </div>
      </div>

      {/* CONTENT BODY SECTION */}
      <div className="comic-detail-body-container">
        <div className="comic-detail-main-grid">

          {/* Left Column: Synopsis + Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Synopsis */}
            <div className="detail-synopsis-card">
              <h3 className="detail-section-title">📖 Synopsis</h3>
              <p className="detail-synopsis-text">{displaySummary}</p>
            </div>

            {/* Tabs Selector */}
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
                  <div className="chapter-controls-bar">
                    <label htmlFor="comic-reading-language" style={{ fontSize: '13px', fontWeight: '600' }}>
                      🌐 Reading Language:
                    </label>
                    <select
                      id="comic-reading-language"
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="chapter-lang-select"
                    >
                      <option value="" style={{ color: '#111', background: '#fff' }}>Original</option>
                      {availableLanguages.map((lang) => (
                        <option key={lang} value={lang} style={{ color: '#111', background: '#fff' }}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="detail-chapters-list">
                  {chapters.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', opacity: 0.7 }}>
                      No chapters available yet for this comic.
                    </div>
                  ) : (
                    chapters.map((ch) => {
                      const chNumber = ch.chapterNumber || '0'
                      const chTitle = ch.title || `Chapter ${chNumber}`
                      const chViewsStr = formatViews(ch.viewCount || 0)
                      const chDateStr = formatTimeAgo(ch.createdAt)

                      const isRead = readChapterIds.includes(ch.id)

                      return (
                        <div
                          key={ch.id || ch.chapterNumber}
                          className={`detail-chapter-card ${isRead ? 'read' : ''}`}
                          onClick={() => openChapter(ch)}
                        >
                          <div>
                            <span className="detail-chapter-name">
                              {chTitle}
                              {ch.isPremium && (
                                <span
                                  className="premium-status-pill"
                                  style={{
                                    marginLeft: '8px',
                                    padding: '2px 7px',
                                    borderRadius: '999px',
                                    background: 'rgba(245, 158, 11, 0.14)',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    color: '#fbbf24',
                                    fontSize: '10px',
                                    verticalAlign: 'middle'
                                  }}
                                >
                                  🔒 PREMIUM
                                </span>
                              )}
                              {isRead && <span className="read-status-pill">✓ READ</span>}
                            </span>
                            <span style={{ fontSize: '12px', opacity: 0.75 }}>Views: {chViewsStr}</span>
                          </div>
                          <span className="detail-chapter-meta">{chDateStr}</span>
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

          {/* Right Column: Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="detail-sidebar-info-card">
              <h3 className="detail-section-title" style={{ fontSize: '16px', borderBottom: '1px solid var(--reader-border, rgba(255, 255, 255, 0.08))', paddingBottom: '10px' }}>
                Information
              </h3>

              <div>
                <span className="info-item-label">Author</span>
                <span className="info-item-val">{displayAuthor}</span>
              </div>

              <div>
                <span className="info-item-label">Original Language</span>
                <span className="info-item-val">{displayLanguage}</span>
              </div>

              <div>
                <span className="info-item-label">Status</span>
                <span className="info-item-val">{displayStatus}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <SubscriptionPlanModal
        open={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </HomeLayout>
  )
}

export default ComicDetail