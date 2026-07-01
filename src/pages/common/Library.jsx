import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getComicsPageApi } from '../../services/api/ComicApi'
import { toast } from 'react-toastify'
import '../../assets/style/reader/library.css'

// Import assets
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'

function Library() {
  const navigate = useNavigate()
  const location = useLocation()
  const [comics, setComics] = useState([])
  const [loading, setLoading] = useState(true)

  // Sub-tabs state
  const [activeTab, setActiveTab] = useState('Saved')
  
  // Library lists stored in state for interactivity
  const [savedList, setSavedList] = useState([])
  const [followingList, setFollowingList] = useState([])
  const [historyList, setHistoryList] = useState([])

  // Pagination for the library lists
  const [sortOption, setSortOption] = useState('Recently Saved')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const ITEMS_PER_PAGE = 4

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (['Saved', 'Following', 'History'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [location.search])

  // Reset page index on tab or filter update
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, sortOption])

  useEffect(() => {
    fetchComics()
  }, [currentPage])

  const fetchComics = async () => {
    try {
      setLoading(true)
      const response = await getComicsPageApi(currentPage, ITEMS_PER_PAGE)
      // response = { data: [...], metadata: { page, size, totalElements, totalPages } }
      const list = response.data || []
      setComics(list)

      // Distribute fetched page data into tab lists
      setSavedList(list)
      setFollowingList(list)

      // Reading History: augment with simulated read progress
      const hist = list.map((c, idx) => ({
        ...c,
        lastReadCh: 10 + idx * 12,
        readTime: `${idx + 1} day${idx !== 0 ? 's' : ''} ago`
      }))
      setHistoryList(hist)

      if (response.metadata) {
        setTotalPages(response.metadata.totalPages || 1)
        setTotalElements(response.metadata.totalElements || 0)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load library catalog.')
    } finally {
      setLoading(false)
    }
  }

  // Cover image helper
  const getCoverImage = (comic) => {
    if (comic.cover && typeof comic.cover === 'string' && comic.cover.startsWith('data:image')) {
      return comic.cover
    }
    const title = (comic.title || '').toLowerCase()
    if (title.includes('action') || title.includes('battle')) return comicAction
    if (title.includes('adventure') || title.includes('dragon')) return comicAdventure
    if (title.includes('sci-fi') || title.includes('neon') || title.includes('cyber')) return comicScifi
    const fallbacks = [comicAction, comicAdventure, comicScifi]
    return fallbacks[comic.id % 3] || comicAction
  }

  // Action: delete / remove from library list
  const handleRemoveItem = (id, event) => {
    event.stopPropagation() // Prevent card click navigation
    if (activeTab === 'Saved') {
      setSavedList(prev => prev.filter(c => c.id !== id))
      toast.success('Removed from saved comics.')
    } else if (activeTab === 'Following') {
      setFollowingList(prev => prev.filter(c => c.id !== id))
      toast.success('Unfollowed comic series.')
    } else {
      setHistoryList(prev => prev.filter(c => c.id !== id))
      toast.success('Cleared from reading history.')
    }
  }

  // Pick correct list depending on activeTab
  const getActiveList = () => {
    let currentList = []
    if (activeTab === 'Saved') currentList = savedList
    else if (activeTab === 'Following') currentList = followingList
    else currentList = historyList

    // Apply sort option if needed (deterministic for simulation)
    if (sortOption === 'A-Z') {
      return [...currentList].sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    }
    return currentList
  }

  const activeComics = getActiveList()
  // Server handles pagination; paginatedComics is the current page's data
  const paginatedComics = activeComics

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
                <span className="lib-stat-value">48</span>
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
              <div className="lib-stat-icon-wrapper">🔖</div>
              <div className="lib-stat-info">
                <span className="lib-stat-label">Following</span>
                <span className="lib-stat-value">{followingList.length}</span>
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
              <button className="lib-banner-btn" onClick={() => navigate('/auth')}>
                Learn More →
              </button>
            </div>
          </div>

          {/* ── SUB-TABS ROW & SORTERS ─────────────────── */}
          <div className="lib-tabs-row">
            <div className="lib-tabs-group">
              <div 
                className={`lib-tab-item ${activeTab === 'Saved' ? 'active' : ''}`}
                onClick={() => setActiveTab('Saved')}
              >
                Saved <span className="lib-tab-badge">{savedList.length}</span>
              </div>
              <div 
                className={`lib-tab-item ${activeTab === 'Following' ? 'active' : ''}`}
                onClick={() => setActiveTab('Following')}
              >
                Following <span className="lib-tab-badge">{followingList.length}</span>
              </div>
              <div 
                className={`lib-tab-item ${activeTab === 'History' ? 'active' : ''}`}
                onClick={() => setActiveTab('History')}
              >
                Reading History <span className="lib-tab-badge">{historyList.length}</span>
              </div>
            </div>

            <div className="lib-sort-group">
              <button 
                className={`lib-sort-btn ${sortOption === 'Recently Saved' ? 'active' : ''}`}
                onClick={() => setSortOption('Recently Saved')}
              >
                {activeTab === 'History' ? 'Recently Read' : 'Recently Saved'}
              </button>
              <button 
                className={`lib-sort-btn ${sortOption === 'Recently Updated' ? 'active' : ''}`}
                onClick={() => setSortOption('Recently Updated')}
              >
                Recently Updated
              </button>
              <button 
                className={`lib-sort-btn ${sortOption === 'A-Z' ? 'active' : ''}`}
                onClick={() => setSortOption('A-Z')}
              >
                A-Z
              </button>
            </div>
          </div>

          {/* ── CONTENT CARDS GRID ─────────────────────── */}
          {loading ? (
            <div className="moderator-empty-state" style={{ padding: '80px 0' }}>
              <p>Loading library items...</p>
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
                    <img 
                      src={getCoverImage(comic)} 
                      alt={comic.title} 
                      className="lib-comic-cover" 
                    />
                    <div className="lib-comic-details">
                      <h4 className="lib-comic-title">{comic.title}</h4>
                      <p className="lib-comic-author">{comic.author || 'Unknown Author'}</p>
                      
                      <div className="lib-comic-genres">
                        {(comic.genres || ['Action']).slice(0, 2).map((g, idx) => (
                          <span key={idx} className="lib-comic-genre-tag">{g}</span>
                        ))}
                      </div>

                      <div className="lib-comic-meta">
                        {activeTab === 'History' ? (
                          <>
                            <span className="lib-comic-chapter">Ch.{comic.lastReadCh || 1}</span>
                            <span className="lib-comic-status-text">Read {comic.readTime}</span>
                          </>
                        ) : (
                          <>
                            <span className="lib-comic-chapter">Ch.{parseInt(comic.chapters) || 120}</span>
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
