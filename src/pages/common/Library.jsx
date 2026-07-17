import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getComicsPageApi } from '../../services/api/ComicApi'
import { getMyReadingHistoryApi, deleteReadingHistoryComicApi } from '../../services/api/ReadingHistoryApi'
import { getMySavesApi, toggleSaveStatusApi } from '../../services/api/SaveApi'
import { getMyLikesApi, toggleLikeStatusApi } from '../../services/api/LikeApi'
import { useAuth } from '../../context/AuthContext'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import { toast } from 'react-toastify'
import '../../assets/style/reader/library.css'

// Import assets
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'

function Library() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn } = useAuth()
  const [loading, setLoading] = useState(true)

  // Sub-tabs state
  const [activeTab, setActiveTab] = useState('Saved')
  
  // Library lists stored in state for interactivity
  const [savedList, setSavedList] = useState([])
  const [likedList, setLikedList] = useState([])
  const [historyList, setHistoryList] = useState([])

  // Pagination for the library lists
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const ITEMS_PER_PAGE = 4

  // Auth guard: redirect to sign-in page if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/auth?mode=signin')
    } else {
      fetchLibraryData()
    }
  }, [isLoggedIn, navigate])

  const fetchLibraryData = async () => {
    try {
      setLoading(true)
      const [historyData, savesData, likesData] = await Promise.all([
        getMyReadingHistoryApi().catch(err => {
          console.error("Failed to fetch reading history:", err)
          return []
        }),
        getMySavesApi().catch(err => {
          console.error("Failed to fetch saves:", err)
          return []
        }),
        getMyLikesApi().catch(err => {
          console.error("Failed to fetch likes:", err)
          return []
        })
      ])
      
      setHistoryList(Array.isArray(historyData) ? historyData : [])
      setSavedList(Array.isArray(savesData) ? savesData : [])
      setLikedList(Array.isArray(likesData) ? likesData : [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load library data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (['Saved', 'Liked', 'History'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [location.search])

  // Reset page index on tab update
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  // Update total pages and total elements dynamically based on current tab list size
  useEffect(() => {
    const list = getActiveList()
    setTotalPages(Math.ceil(list.length / ITEMS_PER_PAGE) || 1)
    setTotalElements(list.length)
  }, [activeTab, savedList, likedList, historyList])

  // Helper to detect if cover is an emoji character
  const isEmoji = (str) => {
    if (!str) return false
    return !str.includes('/') && !str.includes('.') && str.trim().length <= 4
  }

  // Cover image helper
  const getCoverImage = (comic) => {
    if (comic.cover && typeof comic.cover === 'string') {
      return comic.cover
    }
    const title = (comic.title || '').toLowerCase()
    if (title.includes('action') || title.includes('battle')) return comicAction
    if (title.includes('adventure') || title.includes('dragon')) return comicAdventure
    if (title.includes('sci-fi') || title.includes('neon') || title.includes('cyber')) return comicScifi
    const fallbacks = [comicAction, comicAdventure, comicScifi]
    const idHash = typeof comic.id === 'string' ? comic.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : comic.id || 0
    return fallbacks[idHash % 3] || comicAction
  }

  // Action: delete / remove from library list
  const handleRemoveItem = async (id, event) => {
    event.stopPropagation() // Prevent card click navigation
    try {
      if (activeTab === 'Saved') {
        await toggleSaveStatusApi(id)
        setSavedList(prev => prev.filter(c => c.id !== id))
        toast.success('Removed from saved comics.')
      } else if (activeTab === 'Liked') {
        await toggleLikeStatusApi(id)
        setLikedList(prev => prev.filter(c => c.id !== id))
        toast.success('Unliked comic series.')
      } else {
        await deleteReadingHistoryComicApi(id)
        setHistoryList(prev => prev.filter(c => c.id !== id))
        toast.success('Cleared from reading history.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to remove item from library.')
    }
  }

  const handleClearAll = async () => {
    const list = getActiveList()
    if (list.length === 0) return

    const confirmClear = window.confirm(`Are you sure you want to clear all items in your ${activeTab.toLowerCase()} list?`)
    if (!confirmClear) return

    try {
      setLoading(true)
      if (activeTab === 'Saved') {
        await Promise.all(list.map(c => toggleSaveStatusApi(c.id)))
        setSavedList([])
        toast.success('Cleared all saved comics.')
      } else if (activeTab === 'Liked') {
        await Promise.all(list.map(c => toggleLikeStatusApi(c.id)))
        setLikedList([])
        toast.success('Cleared all liked comics.')
      } else {
        await Promise.all(list.map(c => deleteReadingHistoryComicApi(c.id)))
        setHistoryList([])
        toast.success('Cleared all reading history.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to clear some items. Please try again.')
      fetchLibraryData()
    } finally {
      setLoading(false)
    }
  }

  // Pick correct list depending on activeTab
  const getActiveList = () => {
    if (activeTab === 'Saved') return savedList
    if (activeTab === 'Liked') return likedList
    return historyList
  }

  const activeComics = getActiveList()
  // Client-side pagination
  const paginatedComics = activeComics.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <HomeLayout>
      <div className="home-sections-container" style={{ paddingTop: '40px' }}>
        <div className="home-section">
          {/* Header */}
          <div className="section-header" style={{ borderLeftColor: '#a855f7', marginBottom: '28px' }}>
            <div className="section-title-group">
              <h2 className="section-title">My Library</h2>
              <span className="section-subtitle">Track your followed titles, saved bookmarks, and reading progress</span>
            </div>
          </div>

          {/* ── HEADER STATS DASHBOARD ────────────────── */}
          <div className="lib-stats-grid">
            <div className="lib-stat-card">
              <div className="lib-stat-icon-wrapper">📖</div>
              <div className="lib-stat-info">
                <span className="lib-stat-label">Comics Read</span>
                <span className="lib-stat-value">{historyList.length}</span>
                <span className="lib-stat-subtext">+3 this week</span>
              </div>
            </div>
            <div className="lib-stat-card">
              <div className="lib-stat-icon-wrapper">👁️</div>
              <div className="lib-stat-info">
                <span className="lib-stat-label">Chapters Read</span>
                <span className="lib-stat-value">1,247</span>
                <span className="lib-stat-subtext">avg 26/comic</span>
              </div>
            </div>
            <div className="lib-stat-card">
              <div className="lib-stat-icon-wrapper">❤️</div>
              <div className="lib-stat-info">
                <span className="lib-stat-label">Liked</span>
                <span className="lib-stat-value">{likedList.length}</span>
                <span className="lib-stat-subtext">latest updates</span>
              </div>
            </div>
            <div className="lib-stat-card">
              <div className="lib-stat-icon-wrapper">💬</div>
              <div className="lib-stat-info">
                <span className="lib-stat-label">Comments Posted</span>
                <span className="lib-stat-value">183</span>
                <span className="lib-stat-subtext">+12 this month</span>
              </div>
            </div>
          </div>

          {/* ── BECOME A TRANSLATOR BANNER ─────────────── */}
          <div className="lib-translator-banner">
            <div className="lib-banner-left">
              <div className="lib-banner-icon">文</div>
              <div>
                <h3 className="lib-banner-title">Become a Translator</h3>
                <p className="lib-banner-desc">Join the translation community, earn income from your passion for comics</p>
              </div>
            </div>
            <div className="lib-banner-right">
              <div className="lib-banner-stat">
                <span className="lib-banner-stat-label">Avg Income</span>
                <span className="lib-banner-stat-value">$100 - 250/mo</span>
              </div>
              <div className="lib-banner-stat">
                <span className="lib-banner-stat-label">Groups</span>
                <span className="lib-banner-stat-value">127 groups</span>
              </div>
              <button className="lib-banner-btn" onClick={() => navigate('/policy')}>
                Learn More →
              </button>
            </div>
          </div>

          {/* ── SUB-TABS ROW ─────────────────── */}
          <div className="lib-tabs-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="lib-tabs-group">
              <div 
                className={`lib-tab-item ${activeTab === 'Saved' ? 'active' : ''}`}
                onClick={() => setActiveTab('Saved')}
              >
                Saved <span className="lib-tab-badge">{savedList.length}</span>
              </div>
              <div 
                className={`lib-tab-item ${activeTab === 'Liked' ? 'active' : ''}`}
                onClick={() => setActiveTab('Liked')}
              >
                Liked <span className="lib-tab-badge">{likedList.length}</span>
              </div>
              <div 
                className={`lib-tab-item ${activeTab === 'History' ? 'active' : ''}`}
                onClick={() => setActiveTab('History')}
              >
                Reading History <span className="lib-tab-badge">{historyList.length}</span>
              </div>
            </div>

            {activeComics.length > 0 && (
              <button
                onClick={handleClearAll}
                className="btn-hero-outline"
                style={{
                  padding: '6px 14px',
                  fontSize: '12.5px',
                  borderRadius: '16px',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontWeight: '600',
                  background: 'rgba(239, 68, 68, 0.05)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
                  e.currentTarget.style.borderColor = '#ef4444'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'
                }}
              >
                🗑️ Clear All
              </button>
            )}
          </div>

          {/* ── CONTENT CARDS GRID ─────────────────────── */}
          {loading ? (
            <div className="skeleton-comic-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton-comic-card">
                  <div className="skeleton-img skeleton-shimmer"></div>
                  <div className="skeleton-line skeleton-shimmer short" style={{ marginTop: '12px' }}></div>
                  <div className="skeleton-line skeleton-shimmer medium"></div>
                </div>
              ))}
            </div>
          ) : activeComics.length > 0 ? (
            <>
              <div className="lib-comics-list">
                {paginatedComics.map((comic) => (
                  <div 
                    key={comic.id} 
                    className="lib-comic-card"
                    onClick={() => navigate(`/comic/${comic.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {isEmoji(getCoverImage(comic)) ? (
                      <div className="lib-comic-cover-emoji-fallback">{getCoverImage(comic)}</div>
                    ) : (
                      <img 
                        src={getCoverImage(comic)} 
                        alt={comic.title} 
                        className="lib-comic-cover" 
                      />
                    )}
                    <div className="lib-comic-details">
                      <h4 className="lib-comic-title">{comic.title}</h4>
                      <p className="lib-comic-author">{comic.authorName || comic.author || 'Unknown Author'}</p>
                      
                      <div className="lib-comic-genres">
                        {(comic.genres && comic.genres.length > 0 ? comic.genres : ['Action']).slice(0, 2).map((g, idx) => (
                          <span key={idx} className="lib-comic-genre-tag">{g}</span>
                        ))}
                      </div>

                      <div className="lib-comic-meta">
                        {activeTab === 'History' ? (
                          <>
                            <span className="lib-comic-chapter">Ch.{comic.latestChapterNumber || comic.chapterCount || 1}</span>
                            <span className="lib-comic-status-text">
                              {comic.lastChapterUpdatedAt ? `Read ${formatTimeAgo(comic.lastChapterUpdatedAt)}` : 'Recently'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="lib-comic-chapter">Ch.{comic.latestChapterNumber || comic.chapterCount || parseInt(comic.chapters) || 0}</span>
                            <span className="lib-comic-status-dot"></span>
                            <span className="lib-comic-status-text">{comic.status || 'Ongoing'}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Remove action button */}
                    <button 
                      className="lib-comic-delete-btn"
                      onClick={(e) => handleRemoveItem(comic.id, e)}
                      title="Remove from List"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      background: currentPage === 1 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: currentPage === 1 ? '#64748b' : 'white',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                    Page <strong>{currentPage}</strong> of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      background: currentPage === totalPages ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: currentPage === totalPages ? '#64748b' : 'white',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                color: '#64748b'
              }}
            >
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📚</span>
              <h3 style={{ color: 'white', margin: '0 0 8px' }}>Library is Empty</h3>
              <p style={{ margin: 0, fontSize: '13.5px' }}>
                You haven't added any series to your {activeTab.toLowerCase()} list yet. Browse genres to discover new titles!
              </p>
            </div>
          )}
        </div>
      </div>
    </HomeLayout>
  )
}

export default Library
