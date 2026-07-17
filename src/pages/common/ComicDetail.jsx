import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getAuth } from '../../utils/Auth'
import { getComicByIdApi } from '../../services/api/ComicApi'
import { getChaptersByComicIdApi } from '../../services/api/ChapterApi'
import { checkLikeStatusApi, toggleLikeStatusApi } from '../../services/api/LikeApi'
import { checkSaveStatusApi, toggleSaveStatusApi } from '../../services/api/SaveApi'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import { toast } from 'react-toastify'
import { getReadChaptersByComicIdApi } from '../../services/api/ReadingHistoryApi'
import { isValidUuid } from '../../utils/uuid'

// Import assets
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'

function ComicDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('chapters')
  const [user, setUser] = useState(null)
  const [inLibrary, setInLibrary] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [comments, setComments] = useState([
    { id: 1, name: 'Alex Johnson', avatar: 'A', date: '2 hours ago', content: 'This series is absolutely stunning! The art style is amazing and the plot keeps getting better.', rating: 5 },
    { id: 2, name: 'Nguyen An', avatar: 'N', date: '1 day ago', content: 'The pacing in the latest chapter is a bit fast, but the fight scene was epic. Can’t wait for the next update.', rating: 4 },
    { id: 3, name: 'Elena Rostova', avatar: 'E', date: '3 days ago', content: 'Simply the best manhwa on this site. I highly recommend it to anyone who loves deep worldbuilding.', rating: 5 }
  ])

  // Backend integration states
  const [comic, setComic] = useState(null)
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMockData, setIsMockData] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [readChapterIds, setReadChapterIds] = useState([])

  // Spam prevention and state mapping refs
  const likeTimeoutRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const serverLikedRef = useRef(false)
  const serverSavedRef = useRef(false)

  // All comics data list for detail lookup (fallback)
  const comicsDb = {
    '1': {
      id: '1',
      title: 'Battle Chronicles',
      cover: comicAction,
      genres: ['Action', 'Fantasy', 'Adventure'],
      author: 'Ji-Woo Park',
      artist: 'Studio ComiVerse',
      chaptersCount: 184,
      views: '1.2M',
      bookmarks: '45.2K',
      rating: '4.9',
      status: 'Ongoing',
      tagline: 'An epic fantasy action-adventure following the legacy of the legendary warrior who shattered the heavens. Forces of darkness emerge, and a young apprentice must unlock the ancient power within.'
    },
    '2': {
      id: '2',
      title: 'Dragon Legacy',
      cover: comicAdventure,
      genres: ['Adventure', 'Fantasy'],
      author: 'Sarah Jenkins',
      artist: 'Team Dragon',
      chaptersCount: 372,
      views: '2.4M',
      bookmarks: '98.7K',
      rating: '4.8',
      status: 'Ongoing',
      tagline: 'The last dragon rider rises to save the kingdom from ancient ashes. Together with a young dragon hatchling, they must journey to the Edge of the World.'
    },
    '3': {
      id: '3',
      title: 'Neon Genesis',
      cover: comicScifi,
      genres: ['Sci-Fi', 'Action'],
      author: 'Kenji Sato',
      artist: 'NeoArt Studio',
      chaptersCount: 95,
      views: '850K',
      bookmarks: '31.4K',
      rating: '4.7',
      status: 'Completed',
      tagline: 'In a dystopian cyberpunk future, a rogue hacker discovers a secret AI that could either save humanity or wipe it out entirely. The neon streets are paved with danger.'
    },
    '4': {
      id: '4',
      title: 'Infinite Journey',
      cover: comicAdventure,
      genres: ['Adventure', 'Fantasy'],
      author: 'Marcus Aurelius',
      artist: 'Infinity Labs',
      chaptersCount: 120,
      views: '1.1M',
      bookmarks: '38.5K',
      rating: '4.8',
      status: 'Ongoing',
      tagline: 'An endless quest through dimensions to discover the ultimate truth of magic and science.'
    },
    '5': {
      id: '5',
      title: 'Solo Adventure',
      cover: comicAction,
      genres: ['Action', 'Fantasy'],
      author: 'Kim Min-Jae',
      artist: 'Solo Studio',
      chaptersCount: 45,
      views: '400K',
      bookmarks: '18.9K',
      rating: '4.6',
      status: 'Ongoing',
      tagline: 'Conquering dungeons alone to protect what matters most. In a world of guilds, one hunter goes solo.'
    },
    '6': {
      id: '6',
      title: 'Cyber Odyssey',
      cover: comicScifi,
      genres: ['Sci-Fi'],
      author: 'Liz Chen',
      artist: 'PixelWave',
      chaptersCount: 62,
      views: '320K',
      bookmarks: '12.4K',
      rating: '4.5',
      status: 'Ongoing',
      tagline: 'A space-opera journey across the galaxy to find the lost cradle of cybernetic life.'
    },
    '7': {
      id: '7',
      title: 'Shadow Legend',
      cover: comicAction,
      genres: ['Action', 'Fantasy'],
      author: 'Jin-Woo Sung',
      artist: 'Shadow Studio',
      chaptersCount: 88,
      views: '180K',
      bookmarks: '9.2K',
      rating: '4.4',
      status: 'Ongoing',
      tagline: 'The shadows rise to obey their monarch. Can he keep his humanity while wielding the power of death?'
    },
    '8': {
      id: '8',
      title: 'Sky Realm',
      cover: comicAdventure,
      genres: ['Adventure', 'Fantasy'],
      author: 'Aria Vance',
      artist: 'Nimbus',
      chaptersCount: 104,
      views: '210K',
      bookmarks: '11.5K',
      rating: '4.3',
      status: 'Completed',
      tagline: 'Floating islands, sky pirates, and a legendary treasure hidden in the eye of the eternal storm.'
    }
  }

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
    const fetchComicDetail = async () => {
      try {
        setLoading(true)

        if (!isValidUuid(id)) {
          const fallbackComic = comicsDb[id] || comicsDb['1']
          const mockChapters = []
          const totalCh = fallbackComic.chaptersCount || 10
          for (let i = totalCh; i >= 1; i--) {
            mockChapters.push({
              id: `mock-${i}`,
              chapterNumber: String(i),
              title: `Chapter ${i}: ${i === totalCh ? 'The Final Confrontation' : `Story Arc Part ${i}`}`,
              createdAt: new Date(Date.now() - (totalCh - i) * 24 * 60 * 60 * 1000).toISOString(),
              viewCount: Math.floor(Math.random() * 20000 + 5000)
            })
          }
          setComic(fallbackComic)
          setChapters(mockChapters)
          setInLibrary(false)
          setIsLiked(false)
          setReadChapterIds(['mock-1'])
          serverSavedRef.current = false
          serverLikedRef.current = false
          setIsMockData(true)
          return
        }
        
        // Check user login status at call time
        const auth = getAuth()
        const isLoggedIn = !!(auth && auth.user)

        // Perform parallel async API calls to prevent sequential blocking
        const [comicRes, chaptersRes, saveCheckRes, likeCheckRes, readHistoryRes] = await Promise.all([
          getComicByIdApi(id),
          getChaptersByComicIdApi(id),
          isLoggedIn ? checkSaveStatusApi(id) : Promise.resolve(null),
          isLoggedIn ? checkLikeStatusApi(id) : Promise.resolve(null),
          isLoggedIn ? getReadChaptersByComicIdApi(id) : Promise.resolve(null)
        ])

        const comicData = comicRes?.data || comicRes
        const chaptersData = chaptersRes?.data || chaptersRes || []
        
        // Save/Like check resolves to a boolean or object containing it
        const savedStatus = saveCheckRes?.data !== undefined ? saveCheckRes.data : !!saveCheckRes
        const likedStatus = likeCheckRes?.data !== undefined ? likeCheckRes.data : !!likeCheckRes
        const readHistoryData = readHistoryRes?.data || readHistoryRes || []

        setComic(comicData)
        setChapters(chaptersData)
        setInLibrary(savedStatus)
        setIsLiked(likedStatus)
        setReadChapterIds(readHistoryData)

        // Sync refs for debounce tracking
        serverSavedRef.current = savedStatus
        serverLikedRef.current = likedStatus

        setIsMockData(false)
      } catch (err) {
        console.error('API failed, using mock data:', err.message)
        
        // Fall back to mock data
        const fallbackComic = comicsDb[id] || comicsDb['1']
        setComic(fallbackComic)
        
        // Generate mock chapters list
        const mockChapters = []
        const totalCh = fallbackComic.chaptersCount || 10
        for (let i = totalCh; i >= 1; i--) {
          mockChapters.push({
            id: `mock-${i}`,
            chapterNumber: String(i),
            title: `Chapter ${i}: ${i === totalCh ? 'The Final Confrontation' : `Story Arc Part ${i}`}`,
            createdAt: new Date(Date.now() - (totalCh - i) * 24 * 60 * 60 * 1000).toISOString(),
            viewCount: Math.floor(Math.random() * 20000 + 5000)
          })
        }
        setChapters(mockChapters)
        setInLibrary(false)
        setIsLiked(false)
        setReadChapterIds(['mock-1']) // fallback highlight for mock chapter 1
        serverSavedRef.current = false
        serverLikedRef.current = false
        setIsMockData(true)
      } finally {
        setLoading(false)
      }
    }
    
    fetchComicDetail()
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

    if (isMockData) {
      serverSavedRef.current = next
      return
    }
    
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

    if (isMockData) {
      serverLikedRef.current = next
      return
    }
    
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

  const handlePostComment = (e) => {
    e.preventDefault()
    if (!commentInput.trim()) return
    if (!user) {
      navigate('/auth?mode=signin')
      return
    }

    const newComment = {
      id: Date.now(),
      name: user.fullName || user.username || 'You',
      avatar: (user.fullName || user.username || 'Y')[0].toUpperCase(),
      date: 'Just now',
      content: commentInput,
      rating: 5
    }

    setComments([newComment, ...comments])
    setCommentInput('')
  }

  const handleReadChapter1 = () => {
    if (chapters && chapters.length > 0) {
      // Find the first chapter (sorting by chapter number ascending)
      const sorted = [...chapters].sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber))
      const firstChap = sorted[0]
      navigate(`/comic/${id}/chapter/${firstChap.id}`)
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

  // Cover image fallback picker
  const getCoverImage = (coverPath, titleVal, comicId) => {
    if (coverPath && typeof coverPath === 'string') {
      if (coverPath.startsWith('data:image') || coverPath.startsWith('http://') || coverPath.startsWith('https://') || coverPath.startsWith('/')) {
        return coverPath
      }
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
  const displayStatus = comic.status ? (comic.status.charAt(0).toUpperCase() + comic.status.slice(1).toLowerCase()) : 'Ongoing'
  
  const displayGenres = comic.genres 
    ? comic.genres.map(g => typeof g === 'object' && g !== null ? g.name : g)
    : []
    
  const displayAuthor = comic.author || 'Unknown'
  const displayArtist = comic.artist || 'Unknown'
  
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
        <div
          className="comic-detail-hero-bg"
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
        <div
          className="comic-detail-hero-overlay"
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
              flexShrink: 0
            }}
          >
            <img src={displayCover} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  className="comic-detail-genre"
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
              className="comic-detail-title"
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

            <p className="comic-detail-byline" style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: '15px' }}>
              Story by <strong style={{ color: 'white' }}>{displayAuthor}</strong>  •  Art by <strong style={{ color: 'white' }}>{displayArtist}</strong>
            </p>

            {/* Stats Row */}
            <div
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
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Rating</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>⭐ {displayRating}</span>
              </div>
              <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Views</span>
                <span className="comic-detail-stat-value" style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>👁️ {displayViews}</span>
              </div>
              <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Likes</span>
                <span className="comic-detail-stat-value" style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>❤️ {displayLikes}</span>
              </div>
              <div style={{ width: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Bookmarks</span>
                <span className="comic-detail-stat-value" style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>🔖 {displayBookmarks}</span>
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
                className={`btn-hero-outline ${inLibrary ? 'is-saved' : ''}`}
                style={{ padding: '12px 24px', fontSize: '15px', borderColor: inLibrary ? '#10b981' : 'rgba(255, 255, 255, 0.15)', color: inLibrary ? '#10b981' : 'white' }}
              >
                {inLibrary ? '✓ Saved to Library' : '🔖 Add to Library'}
              </button>
              <button
                onClick={handleToggleLike}
                className={`btn-hero-outline ${isLiked ? 'is-liked' : ''}`}
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

          </div>
        </div>
      </div>

      {/* CONTENT BODY */}
      <div className="home-sections-container" style={{ padding: '40px 10%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '40px' }}>

          {/* Left Column: Description + Chapters / Reviews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

            {/* Synopsis */}
            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.03)', padding: '24px', borderRadius: '16px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: 'white' }}>Synopsis</h3>
              <p style={{ margin: 0, fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6' }}>{displaySummary}</p>
            </div>

            {/* Tabs Selector */}
            <div
              className="comic-detail-stats"
              style={{
                display: 'flex',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                gap: '24px'
              }}
            >
              <button
                onClick={() => setActiveTab('chapters')}
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
                Comments ({comments.length})
              </button>
            </div>

            {/* TAB CONTENT: CHAPTERS LIST */}
            {activeTab === 'chapters' && (
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
                      className={`comic-detail-chapter-row ${isRead ? 'is-read' : ''}`}
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
                      onClick={() => navigate(`/comic/${id}/chapter/${ch.id}`)}
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
                        <span style={{
                          fontWeight: '600',
                          color: isRead ? '#c084fc' : 'white',
                          display: 'block',
                          fontSize: '14px'
                        }}>
                          {chTitle}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Views: {chViewsStr}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>{chDateStr}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* TAB CONTENT: COMMENTS FEED */}
            {activeTab === 'comments' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Comment Form */}
                <form onSubmit={handlePostComment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <textarea
                    rows="3"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder={user ? "Share your thoughts about this comic..." : "Please log in to share your thoughts..."}
                    disabled={!user}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      color: 'white',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {user ? (
                      <button type="submit" className="btn-home-primary" style={{ padding: '8px 20px', fontSize: '13px' }}>
                        Post Comment
                      </button>
                    ) : (
                      <Link to="/auth?mode=signin" className="btn-home-primary" style={{ padding: '8px 20px', fontSize: '13px', textDecoration: 'none' }}>
                        Sign In to Comment
                      </Link>
                    )}
                  </div>
                </form>

                {/* Comments List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        display: 'flex',
                        gap: '16px',
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px'
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'var(--color-primary-grad)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          color: 'white',
                          fontSize: '14px',
                          flexShrink: 0
                        }}
                      >
                        {comment.avatar}
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <strong style={{ color: 'white', fontSize: '14px' }}>{comment.name}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{comment.date}</span>
                        </div>
                        <div style={{ color: '#fbbf24', fontSize: '11px', marginBottom: '6px' }}>
                          {'★'.repeat(comment.rating)}{'☆'.repeat(5 - comment.rating)}
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', lineHeight: '1.5' }}>{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Sidebar (About / Artist / Info) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              className="comic-detail-info-card"
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
              <h3 style={{ margin: 0, fontSize: '16px', color: 'white', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>Comic Info</h3>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Author</span>
                <span style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{displayAuthor}</span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Artist</span>
                <span style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{displayArtist}</span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Status</span>
                <span style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{displayStatus}</span>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Publish Date</span>
                <span style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>Jan 12, 2025</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </HomeLayout>
  )
}

export default ComicDetail
