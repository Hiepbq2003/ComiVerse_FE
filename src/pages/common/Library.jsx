import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getComicsPageApi } from '../../services/api/ComicApi'
import { getMyReadingHistoryApi, deleteReadingHistoryComicApi } from '../../services/api/ReadingHistoryApi'
import { getMySavesApi, toggleSaveStatusApi } from '../../services/api/SaveApi'
import { getMyLikesApi, toggleLikeStatusApi } from '../../services/api/LikeApi'
import { getUserRatingsApi, deleteComicRatingApi } from '../../services/api/RatingApi'
import { getAllProjectTeamsApi } from '../../services/api/ProjectTeamApi'
import { useAuth } from '../../context/AuthContext'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import { toast } from 'react-toastify'
import ConfirmModal from '../../components/common/ConfirmModal'
import { Trash2 } from 'lucide-react'
import '../../assets/style/reader/library.css'

function Library() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn, user } = useAuth()
  const [loading, setLoading] = useState(true)

  const userRole = typeof user?.role === 'string' 
    ? user.role 
    : (user?.role?.roleName || user?.roleName || 'READER');
  const isReader = !userRole || userRole.toUpperCase() === 'READER' || userRole.toUpperCase() === 'USER';

  // Sub-tabs state
  const [activeTab, setActiveTab] = useState('Saved')
  
  // Library lists stored in state for interactivity
  const [savedList, setSavedList] = useState([])
  const [likedList, setLikedList] = useState([])
  const [historyList, setHistoryList] = useState([])
  const [ratedList, setRatedList] = useState([])
  const [groupsCount, setGroupsCount] = useState(0)

  // Unified Delete Confirmation Modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    comicId: null,
    comicTitle: '',
    targetTab: ''
  })

  // Pagination for the library lists
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const ITEMS_PER_PAGE = 4

  const handleTabClick = (tabName) => {
    navigate(`/library?tab=${tabName}`, { replace: true })
  }

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
      const [historyData, savesData, likesData, ratingsData, projectTeamsData] = await Promise.all([
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
        }),
        getUserRatingsApi().catch(err => {
          console.error("Failed to fetch user ratings:", err)
          return []
        }),
        getAllProjectTeamsApi().catch(err => {
          console.error("Failed to fetch project teams:", err)
          return []
        })
      ])
      
      setHistoryList(Array.isArray(historyData) ? historyData : [])
      setSavedList(Array.isArray(savesData) ? savesData : [])
      setLikedList(Array.isArray(likesData) ? likesData : [])
      setRatedList(Array.isArray(ratingsData) ? ratingsData : (ratingsData?.data || []))

      const teamsList = Array.isArray(projectTeamsData) 
        ? projectTeamsData 
        : (projectTeamsData?.data || [])
      setGroupsCount(teamsList.length)
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
    if (['Saved', 'Liked', 'History', 'Rated'].includes(tab)) {
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
  }, [activeTab, savedList, likedList, historyList, ratedList])

  // Helper to detect if cover is an emoji character
  const isEmoji = (str) => {
    if (!str) return false
    return !str.includes('/') && !str.includes('.') && str.trim().length <= 4
  }

  // Cover image helper
  const getCoverImage = (comic) => {
    return comic.cover || comic.coverImage || comic.coverImageUrl || '';
  }

  // Action: Open popup confirm modal before deletion
  const requestRemoveItem = (id, title, event) => {
    if (event) event.stopPropagation()
    setDeleteModal({
      isOpen: true,
      comicId: id,
      comicTitle: title || 'this series',
      targetTab: activeTab
    })
  }

  // Action: Execute actual deletion after user confirms in popup modal
  const handleConfirmDelete = async () => {
    const id = deleteModal.comicId
    const tab = deleteModal.targetTab || activeTab

    setDeleteModal(prev => ({ ...prev, isOpen: false }))
    
    // Save previous state for rollback
    const previousSaved = [...savedList]
    const previousLiked = [...likedList]
    const previousHistory = [...historyList]
    const previousRated = [...ratedList]

    // Update state optimistically
    if (tab === 'Saved') {
      setSavedList(prev => prev.filter(c => (c.comic?.id || c.id) !== id))
    } else if (tab === 'Liked') {
      setLikedList(prev => prev.filter(c => (c.comic?.id || c.id) !== id))
    } else if (tab === 'Rated') {
      setRatedList(prev => prev.filter(c => (c.comic?.id || c.id) !== id))
    } else {
      setHistoryList(prev => prev.filter(c => (c.comic?.id || c.id) !== id))
    }

    try {
      if (tab === 'Saved') {
        await toggleSaveStatusApi(id)
        toast.success('Removed from Saved list.')
      } else if (tab === 'Liked') {
        await toggleLikeStatusApi(id)
        toast.success('Unliked comic series.')
      } else if (tab === 'Rated') {
        await deleteComicRatingApi(id)
        toast.success('Removed rating score.')
      } else {
        await deleteReadingHistoryComicApi(id)
        toast.success('Removed from reading history.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to remove item. Please try again!')
      // Rollback state on failure
      if (tab === 'Saved') {
        setSavedList(previousSaved)
      } else if (tab === 'Liked') {
        setLikedList(previousLiked)
      } else if (tab === 'Rated') {
        setRatedList(previousRated)
      } else {
        setHistoryList(previousHistory)
      }
    }
  }

  // Pick correct list depending on activeTab
  const getActiveList = () => {
    if (activeTab === 'Saved') return savedList
    if (activeTab === 'Liked') return likedList
    if (activeTab === 'Rated') return ratedList
    return historyList
  }

  const activeComics = getActiveList()
  // Client-side pagination
  const paginatedComics = activeComics.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  // Get localized tab name for confirm message
  const getTabLabel = (tab) => {
    switch (tab) {
      case 'Saved': return 'Saved list'
      case 'Liked': return 'Liked list'
      case 'Rated': return 'Rated list'
      case 'History': default: return 'Reading history'
    }
  }

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

          {/* ── HEADER STATS DASHBOARD (SAVED, LIKED, READ, RATED) ────────────────── */}
          <div className="lib-stats-grid">
            <div
              className={`lib-stat-card ${activeTab === 'Saved' ? 'active-stat-card' : ''}`}
              onClick={() => handleTabClick('Saved')}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div className="lib-stat-icon-wrapper">🔖</div>
              <div className="lib-stat-info">
                <span className="lib-stat-label">Saved</span>
                <span className="lib-stat-value">{savedList.length}</span>
                <span className="lib-stat-subtext">Bookmarked titles</span>
              </div>
            </div>

            <div
              className={`lib-stat-card ${activeTab === 'Liked' ? 'active-stat-card' : ''}`}
              onClick={() => handleTabClick('Liked')}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div className="lib-stat-icon-wrapper">❤️</div>
              <div className="lib-stat-info">
                <span className="lib-stat-label">Liked</span>
                <span className="lib-stat-value">{likedList.length}</span>
                <span className="lib-stat-subtext">Favorites list</span>
              </div>
            </div>

            <div
              className={`lib-stat-card ${activeTab === 'History' ? 'active-stat-card' : ''}`}
              onClick={() => handleTabClick('History')}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div className="lib-stat-icon-wrapper">📖</div>
              <div className="lib-stat-info">
                <span className="lib-stat-label">Read</span>
                <span className="lib-stat-value">{historyList.length}</span>
                <span className="lib-stat-subtext">Reading history</span>
              </div>
            </div>

            <div
              className={`lib-stat-card ${activeTab === 'Rated' ? 'active-stat-card' : ''}`}
              onClick={() => handleTabClick('Rated')}
              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div className="lib-stat-icon-wrapper">⭐</div>
              <div className="lib-stat-info">
                <span className="lib-stat-label">Rated</span>
                <span className="lib-stat-value">{ratedList.length}</span>
                <span className="lib-stat-subtext">Star rated comics</span>
              </div>
            </div>
          </div>

          {/* ── BECOME A TRANSLATOR BANNER ─────────────── */}
          {isReader && (
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
                  <span className="lib-banner-stat-value">
                    {groupsCount > 0 ? `${groupsCount} ${groupsCount === 1 ? 'group' : 'groups'}` : '0 groups'}
                  </span>
                </div>
                <button className="lib-banner-btn" onClick={() => navigate('/translator-register')}>
                  Learn More →
                </button>
              </div>
            </div>
          )}

          {/* ── SUB-TABS ROW ─────────────────── */}
          <div className="lib-tabs-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="lib-tabs-group">
              <div 
                className={`lib-tab-item ${activeTab === 'Saved' ? 'active' : ''}`}
                onClick={() => handleTabClick('Saved')}
              >
                Saved
              </div>
              <div 
                className={`lib-tab-item ${activeTab === 'Liked' ? 'active' : ''}`}
                onClick={() => handleTabClick('Liked')}
              >
                Liked
              </div>
              <div 
                className={`lib-tab-item ${activeTab === 'History' ? 'active' : ''}`}
                onClick={() => handleTabClick('History')}
              >
                Reading History
              </div>
              <div 
                className={`lib-tab-item ${activeTab === 'Rated' ? 'active' : ''}`}
                onClick={() => handleTabClick('Rated')}
              >
                ⭐ Rated
              </div>
            </div>
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
                {paginatedComics.map((item) => {
                  const actualComic = item.comic || item;
                  const comicId = actualComic.id;
                  const comicTitle = actualComic.title || '';
                  const comicCover = getCoverImage(actualComic);
                  const comicAuthor = actualComic.authorName || actualComic.author || 'Unknown Author';
                  const comicGenres = actualComic.genres && actualComic.genres.length > 0 ? actualComic.genres : ['Action'];
                  const comicChapter = item.latestChapterNumber || actualComic.latestChapterNumber || actualComic.chapterCount || parseInt(actualComic.chapters) || 0;
                  const lastReadTime = item.lastChapterUpdatedAt || actualComic.lastChapterUpdatedAt;
                  const comicStatus = actualComic.publicationStatus || 'ONGOING';

                  return (
                    <div 
                      key={item.id || comicId} 
                      className="lib-comic-card"
                      onClick={() => navigate(`/comic/${comicId}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {isEmoji(comicCover) ? (
                        <div className="lib-comic-cover-emoji-fallback">{comicCover}</div>
                      ) : (
                        <img 
                          src={comicCover} 
                          alt={comicTitle} 
                          className="lib-comic-cover" 
                        />
                      )}
                      <div className="lib-comic-details">
                        <h4 className="lib-comic-title">{comicTitle}</h4>
                        <p className="lib-comic-author">{comicAuthor}</p>
                        
                        <div className="lib-comic-genres">
                          {comicGenres.slice(0, 2).map((g, idx) => {
                            const genreName = typeof g === 'object' && g !== null ? g.name : g;
                            return <span key={idx} className="lib-comic-genre-tag">{genreName}</span>;
                          })}
                        </div>

                        <div className="lib-comic-meta">
                          {activeTab === 'History' ? (
                            <>
                              <span className="lib-comic-chapter">Ch.{comicChapter || 1}</span>
                              <span className="lib-comic-status-text">
                                {lastReadTime ? `Read ${formatTimeAgo(lastReadTime)}` : 'Recently'}
                              </span>
                            </>
                          ) : activeTab === 'Rated' ? (
                            <>
                              <span className="lib-comic-chapter" style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                                ⭐ {item.score || item.userScore || actualComic.ratingAverage || 5} / 5
                              </span>
                              <span className="lib-comic-status-dot"></span>
                              <span className="lib-comic-status-text">Your Rating</span>
                            </>
                          ) : (
                            <>
                              <span className="lib-comic-chapter">Ch.{comicChapter}</span>
                              <span className="lib-comic-status-dot"></span>
                              <span className="lib-comic-status-text">{comicStatus}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Remove action button */}
                      <button 
                        className="lib-comic-delete-btn"
                        onClick={(e) => requestRemoveItem(comicId, comicTitle, e)}
                        title="Remove from list"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
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

      {/* Unified Popup Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Confirm Library Removal"
        message={`Are you sure you want to remove "${deleteModal.comicTitle}" from your ${getTabLabel(deleteModal.targetTab)}?`}
        confirmText="Remove Now"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
      />
    </HomeLayout>
  )
}

export default Library
