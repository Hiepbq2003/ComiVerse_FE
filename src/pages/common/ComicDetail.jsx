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
import ReadingLanguageSelector from '../../components/common/ReadingLanguageSelector'

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
    if (chapters && chapters.length > 0) {
      // Find the first chapter (sorting by chapter number ascending)
      const sorted = [...chapters].sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber))
      const firstChap = sorted[0]
      const langQuery = selectedLanguage ? `?lang=${encodeURIComponent(selectedLanguage)}` : ''
      navigate(`/comic/${id}/chapter/${firstChap.id}${langQuery}`)
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

  const displayAuthor = comic.author || 'Unknown'
  const displayArtist = comic.artist || 'Unknown'
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

  return (
    <HomeLayout>
      {/* BACKGROUND BANNER */}
      <div
        className="comic-detail-hero"
        style={{
          position: 'relative',
          minHeight: '380px',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '40px 10%',
          overflow: 'hidden',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        {isEmoji(displayCover) ? (
          <div className="hero-banner-bg-emoji-fallback" style={{ zIndex: 0 }}>{displayCover}</div>
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${displayCover})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 25%',
              filter: 'brightness(0.15) blur(10px)',
              transform: 'scale(1.1)',
              zIndex: 0
            }}
          />
        )}
        <div
          className="detail-banner-gradient"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, var(--color-bg-dark) 0%, transparent 100%)',
            zIndex: 1
          }}
        />

        {/* COMIC MAIN METADATA CARD */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            gap: '40px',
            width: '100%',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          {/* Cover */}
          <div
            className="comic-detail-cover"
            style={{
              width: '200px',
              height: '280px',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.03)'
            }}
          >
            {isEmoji(displayCover) ? (
              <div style={{ fontSize: '7rem', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.2) 0%, rgba(13, 9, 25, 0.98) 100%)' }}>{displayCover}</div>
            ) : (
              <img src={displayCover} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>

          {/* Details */}
          <div style={{ flex: '1', minWidth: '300px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: '#c084fc',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}
              >
                {displayStatus}
              </span>
              {displayGenres.map((genre, idx) => (
                <span
                  key={idx}
                  className="detail-genre-tag"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  {genre}
                </span>
              ))}
            </div>

            <h1
              className="detail-title"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '42px',
                fontWeight: '700',
                margin: '0 0 8px',
                color: 'white',
                lineHeight: '1.2'
              }}
            >
              {displayTitle}
            </h1>

            <p className="detail-author-artist" style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: '15px' }}>
              Story by <strong style={{ color: 'white' }}>{displayAuthor}</strong>  •  Art by <strong style={{ color: 'white' }}>{displayArtist}</strong>
            </p>

            {/* Stats Row */}
            <div
              className="detail-stats-card"
              style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '24px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '12px 20px',
                borderRadius: '12px',
                width: 'max-content',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <span className="detail-stats-label" style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Rating</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>⭐ {displayRating}</span>
              </div>
              <div className="detail-stats-divider" style={{ width: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <span className="detail-stats-label" style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Views</span>
                <span className="detail-stats-value" style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>👁️ {displayViews}</span>
              </div>
              <div className="detail-stats-divider" style={{ width: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <span className="detail-stats-label" style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Likes</span>
                <span className="detail-stats-value" style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>❤️ {displayLikes}</span>
              </div>
              <div className="detail-stats-divider" style={{ width: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <span className="detail-stats-label" style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Bookmarks</span>
                <span className="detail-stats-value" style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>🔖 {displayBookmarks}</span>
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
                className="btn-hero-outline detail-action-btn"
                style={{ padding: '12px 24px', fontSize: '15px', borderColor: inLibrary ? '#10b981' : 'rgba(255, 255, 255, 0.15)', color: inLibrary ? '#10b981' : 'white' }}
              >
                {inLibrary ? '✓ Saved to Library' : '🔖 Add to Library'}
              </button>
              <button
                onClick={handleToggleLike}
                className="btn-hero-outline detail-action-btn"
                style={{
                  padding: '12px 24px',
                  fontSize: '15px',
                  borderColor: isLiked ? '#ec4899' : 'rgba(255, 255, 255, 0.15)',
                  color: isLiked ? '#ec4899' : 'white'
                }}
              >
                {isLiked ? '❤️ Liked' : '🤍 Like'}
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
      <div className="home-sections-container" style={{ padding: '40px 10%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '40px' }}>

          {/* Left Column: Description + Chapters / Reviews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

            {/* Synopsis */}
            <div className="detail-synopsis-card" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.03)', padding: '24px', borderRadius: '16px' }}>
              <h3 className="detail-section-title" style={{ margin: '0 0 12px', fontSize: '18px', color: 'white' }}>Synopsis</h3>
              <p className="detail-synopsis-text" style={{ margin: 0, fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6' }}>{displaySummary}</p>
            </div>

            {/* Tabs Selector */}
            <div
              className="detail-tabs-selector"
              style={{
                display: 'flex',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                gap: '24px'
              }}
            >
              <button
                onClick={() => setActiveTab('chapters')}
                className={`detail-tab-btn ${activeTab === 'chapters' ? 'active' : ''}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'chapters' ? '2px solid #a855f7' : '2px solid transparent',
                  color: activeTab === 'chapters' ? 'white' : '#94a3b8',
                  padding: '12px 8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Chapters ({chapters.length})
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`detail-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'comments' ? '2px solid #a855f7' : '2px solid transparent',
                  color: activeTab === 'comments' ? 'white' : '#94a3b8',
                  padding: '12px 8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
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
                {chapters.map((ch) => {
                  const chNumber = ch.chapterNumber || '0'
                  const chTitle = ch.title || `Chapter ${chNumber}`
                  const chViewsStr = formatViews(ch.viewCount || 0)
                  const chDateStr = formatTimeAgo(ch.createdAt)

                  const isRead = readChapterIds.includes(ch.id)

                  return (
                    <div
                      key={ch.id || ch.chapterNumber}
                      className={`detail-chapter-row ${isRead ? 'read' : ''}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 20px',
                        background: isRead ? 'rgba(168, 85, 247, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                        border: isRead ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        const langQuery = selectedLanguage ? `?lang=${encodeURIComponent(selectedLanguage)}` : ''
                        navigate(`/comic/${id}/chapter/${ch.id}${langQuery}`)
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.08)'
                        e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isRead ? 'rgba(168, 85, 247, 0.04)' : 'rgba(255, 255, 255, 0.02)'
                        e.currentTarget.style.borderColor = isRead ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.04)'
                      }}
                    >
                      <div>
                        <span className="detail-chapter-title" style={{
                          fontWeight: '600',
                          color: isRead ? '#c084fc' : 'white',
                          display: 'block',
                          fontSize: '14px'
                        }}>
                          {chTitle}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Views: {chViewsStr}</span>
                      </div>
                      <span className="detail-chapter-date" style={{ fontSize: '12px', color: '#94a3b8' }}>{chDateStr}</span>
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
            <div
              className="detail-info-card"
              style={{
                background: 'var(--reader-card-bg)',
                border: '1px solid var(--reader-card-border)',
                padding: '24px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <h3 className="detail-info-title" style={{ margin: 0, fontSize: '16px', color: 'white', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>Comic Info</h3>

              <div>
                <span className="detail-info-label" style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Author</span>
                <span className="detail-info-value" style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{displayAuthor}</span>
              </div>

              <div>
                <span className="detail-info-label" style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Artist</span>
                <span className="detail-info-value" style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{displayArtist}</span>
              </div>

              <div>
                <span className="detail-info-label" style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Original Language</span>
                <span className="detail-info-value" style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{displayLanguage}</span>
              </div>

              <div>
                <span className="detail-info-label" style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Status</span>
                <span className="detail-info-value" style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{displayStatus}</span>
              </div>

              <div>
                <span className="detail-info-label" style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Publish Date</span>
                <span className="detail-info-value" style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>Jan 12, 2025</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </HomeLayout>
  )
}

export default ComicDetail