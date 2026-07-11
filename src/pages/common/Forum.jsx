import { useState, useEffect } from 'react'
import HomeLayout from '../../components/layout/HomeLayout'
import { getForumThreadsPageApi, deleteForumThreadApi, createForumThreadApi, getAllForumThreadsApi } from '../../services/api/ForumThreadApi'
import { getAuth } from '../../utils/Auth'
import { toast } from 'react-toastify'
import '../../assets/style/reader/forum.css'

const formatTimeAgo = (createdAtString) => {
  if (!createdAtString) return 'Just now'
  const date = new Date(createdAtString)
  if (isNaN(date.getTime())) {
    return 'Just now'
  }
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const seconds = Math.floor(diffMs / 1000)
  
  // If the server time is ahead due to timezone differences, handle absolute values
  if (seconds < 0) {
    const absSeconds = Math.abs(seconds)
    if (absSeconds < 86400) {
      if (absSeconds < 60) return 'Just now'
      const minutes = Math.floor(absSeconds / 60)
      if (minutes < 60) return `${minutes}m ago`
      const hours = Math.floor(absSeconds / 60)
      return `${hours}h ago`
    }
    return 'Just now'
  }
  
  if (seconds < 60) {
    return 'Just now'
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  if (days === 1) {
    return '1 day ago'
  }
  return `${days} days ago`
}

function Forum() {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Navigation & Filter states
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [activeSortTab, setActiveSortTab] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [allThreadsForCounts, setAllThreadsForCounts] = useState([])
  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem('comiverse_forum_categories')
    return saved ? JSON.parse(saved) : []
  })
  const ITEMS_PER_PAGE = 5

  // Reset page when category or sorting tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, activeSortTab])

  // New Post Modal State
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [newPostForm, setNewPostForm] = useState({
    title: '',
    category: 'General',
    content: ''
  })

  // Categories list derived dynamically from database threads (synced with customCategories)
  const categoriesList = [
    { name: 'All' },
    ...Array.from(new Set([
      ...allThreadsForCounts.map(t => t.category || 'General'),
      ...customCategories
    ])).map(name => ({ name }))
  ]

  // Hover states for category selector
  const [hoveredCategory, setHoveredCategory] = useState(null)

  // Debounce search: reset page and re-fetch when search changes
  useEffect(() => {
    setCurrentPage(1)
    fetchThreads(1)
  }, [searchQuery])

  useEffect(() => {
    fetchThreads(currentPage)
  }, [currentPage])

  // State moved to top

  const fetchAllThreadsForCounts = async () => {
    try {
      const response = await getAllForumThreadsApi()
      const list = response.data || response || []
      setAllThreadsForCounts(list)
    } catch (err) {
      console.error('Failed to load thread counts:', err)
    }
  }

  useEffect(() => {
    fetchAllThreadsForCounts()
  }, [])

  const fetchThreads = async (page) => {
    const targetPage = page || currentPage
    try {
      setLoading(true)
      const response = await getForumThreadsPageApi(targetPage, ITEMS_PER_PAGE, searchQuery)
      // response = { data: [...], metadata: { page, size, totalElements, totalPages } }
      const list = response.data || []

      // Format DB threads
      const formattedDb = list.map(t => ({
        id: t.id,
        title: t.title || 'Untitled Thread',
        content: t.content || '',
        author: t.author || 'Guest User',
        category: t.category || 'General',
        views: t.views !== undefined && t.views !== null ? String(t.views) : '0',
        replies: t.replies ?? 0,
        likes: t.likes || 0,
        isLiked: false,
        timeAgo: formatTimeAgo(t.createdAt)
      }))

      setThreads(formattedDb)
      if (response.metadata) {
        setTotalPages(response.metadata.totalPages || 1)
        setTotalElements(response.metadata.totalElements || 0)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load forum thread posts.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Likes locally
  const handleToggleLike = (id, event) => {
    event.stopPropagation()
    setThreads(prev =>
      prev.map(t => {
        if (t.id === id) {
          return {
            ...t,
            likes: t.isLiked ? t.likes - 1 : t.likes + 1,
            isLiked: !t.isLiked
          }
        }
        return t
      })
    )
  }

  // Publish new thread post
  const handlePublishPost = async () => {
    if (!newPostForm.title.trim()) {
      toast.warn('Please enter a thread title.')
      return
    }
    if (!newPostForm.content.trim()) {
      toast.warn('Please enter thread description.')
      return
    }

    const auth = getAuth()
    const authorName = auth?.user?.fullName || auth?.user?.username || 'Guest User'

    try {
      setLoading(true)
      await createForumThreadApi({
        title: newPostForm.title.trim(),
        author: authorName,
        category: newPostForm.category,
        content: newPostForm.content.trim()
      })
      toast.success('Thread published successfully!')
      setShowNewPostModal(false)
      setNewPostForm({
        title: '',
        category: 'General',
        content: ''
      })
      // Refresh counts and list from database
      await fetchAllThreadsForCounts()
      await fetchThreads(1)
    } catch (err) {
      console.error(err)
      toast.error('Failed to publish discussion thread.')
    } finally {
      setLoading(false)
    }
  }

  // Count threads inside category
  const getCategoryCount = (catName) => {
    if (catName === 'All') return allThreadsForCounts.length
    return allThreadsForCounts.filter(t => (t.category || 'General') === catName).length
  }

  // Filter threads
  const getProcessedThreads = () => {
    let result = [...threads]

    // 1. Sidebar Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(t => t.category === selectedCategory)
    }

    // 2. Tab Sort Filter
    if (activeSortTab === 'Hot') {
      result = result.filter(t => t.isHot)
    } else if (activeSortTab === 'Announcements') {
      result = result.filter(t => t.isPinned || t.category === 'News')
    } else if (activeSortTab === 'New') {
      // Sort recently added first (by checking user-threads or id descending)
      result.sort((a, b) => String(b.id).localeCompare(String(a.id)))
    }

    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.content.toLowerCase().includes(q)
      )
    }

    return result
  }

  const processedThreads = getProcessedThreads()
  // Server handles pagination; client filters are applied on the current page's data
  const paginatedThreads = processedThreads

  return (
    <HomeLayout>
      <div className="home-sections-container" style={{ paddingTop: '40px' }}>
        <div className="home-section">
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            paddingBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <h2 className="section-title" style={{ margin: 0 }}>💬 Forum</h2>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                {totalElements} posts
              </span>
            </div>
            <button 
              className="mod-btn approve" 
              style={{ background: '#0f172a', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setShowNewPostModal(true)}
            >
              <span>+</span> New Post
            </button>
          </div>

          <div style={{ display: 'flex', gap: '32px' }}>
            {/* ── LEFT SIDEBAR (CATEGORIES & STATS) ───────── */}
            <aside style={{ width: '220px', flexShrink: 0 }}>
              <h4 style={{ color: 'white', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '8px' }}>
                Categories
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {categoriesList.map(cat => (
                  <div
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    onMouseEnter={() => setHoveredCategory(cat.name)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: selectedCategory === cat.name ? 'rgba(168, 85, 247, 0.1)' : hoveredCategory === cat.name ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                      color: selectedCategory === cat.name ? '#c084fc' : '#cbd5e1',
                      cursor: 'pointer',
                      fontWeight: selectedCategory === cat.name ? '600' : '500',
                      fontSize: '13px',
                      transition: 'all 0.2s ease',
                      borderLeft: selectedCategory === cat.name ? '3px solid #a855f7' : '3px solid transparent',
                      paddingLeft: selectedCategory === cat.name ? '12px' : '9px'
                    }}
                  >
                    <span>{cat.name}</span>
                    <span style={{ fontSize: '10.5px', color: selectedCategory === cat.name ? '#c084fc' : '#64748b' }}>
                      {getCategoryCount(cat.name)}
                    </span>
                  </div>
                ))}
              </div>


            </aside>

            {/* ── RIGHT MAIN CONTENT AREA ────────────────── */}
            <main style={{ flexGrow: 1 }}>
              {/* Sorter tabs & Search input row */}
              <div className="forum-search-row">
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexGrow: 1, paddingBottom: '1px' }}>
                  {['All', 'Hot', 'New', 'Announcements'].map(tab => (
                    <div
                      key={tab}
                      onClick={() => setActiveSortTab(tab)}
                      style={{
                        color: activeSortTab === tab ? 'white' : '#94a3b8',
                        fontSize: '13.5px',
                        fontWeight: '600',
                        padding: '8px 4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        borderBottom: '2px solid transparent',
                        borderBottomColor: activeSortTab === tab ? '#a855f7' : 'transparent'
                      }}
                    >
                      {tab}
                    </div>
                  ))}
                </div>

                {/* Search posts inside thread list */}
                <div className="forum-search-input-wrapper" style={{ width: '240px', flexGrow: 0 }}>
                  <input 
                    type="text" 
                    placeholder="Search posts..." 
                    className="forum-search-field"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '8px 12px 8px 34px' }}
                  />
                  <svg 
                    viewBox="0 0 24 24" 
                    width="14" 
                    height="14" 
                    fill="none" 
                    stroke="#64748b" 
                    strokeWidth="2.5" 
                    style={{ position: 'absolute', left: '12px', top: '11px' }}
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
              </div>

              {/* Threads list */}
              {loading ? (
                <div className="skeleton-forum-feed">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton-forum-card">
                      <div className="skeleton-forum-header">
                        <div className="skeleton-circle skeleton-shimmer" style={{ width: '24px', height: '24px' }}></div>
                        <div className="skeleton-line skeleton-shimmer short" style={{ height: '16px', margin: 0, width: '120px' }}></div>
                        <div className="skeleton-line skeleton-shimmer long" style={{ height: '16px', margin: 0, flex: 1 }}></div>
                      </div>
                      <div className="skeleton-line skeleton-shimmer long" style={{ marginTop: '12px' }}></div>
                      <div className="skeleton-line skeleton-shimmer medium"></div>
                    </div>
                  ))}
                </div>
              ) : processedThreads.length > 0 ? (
                <>
                  <div className="forum-threads-list">
                    {paginatedThreads.map((thread) => (
                      <div key={thread.id} className="forum-thread-card">
                        <div className="forum-thread-header">
                          {thread.isPinned && <span className="forum-badge pinned">Pinned</span>}
                          {thread.isHot && <span className="forum-badge hot">🔥 Hot</span>}
                          <span className="forum-badge category">{thread.category}</span>
                          <h4 className="forum-thread-title">{thread.title}</h4>
                        </div>

                        <p className="forum-thread-body">{thread.content}</p>

                        <div className="forum-thread-footer">
                          <div className="forum-thread-footer-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div className="forum-author-badge">
                              <div className="forum-avatar-placeholder">
                                {String(thread.author)[0].toUpperCase()}
                              </div>
                              <span className="forum-author-name">{thread.author}</span>
                            </div>
                            <span className="forum-time-posted">{thread.timeAgo}</span>
                          </div>

                          <div className="forum-thread-footer-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div className="forum-metric-item">
                              <span>👁️</span> {thread.views}
                            </div>
                            <div className="forum-metric-item">
                              <span>💬</span> {thread.replies}
                            </div>
                            <div 
                              className={`forum-metric-item ${thread.isLiked ? 'liked-active' : ''}`}
                              onClick={(e) => handleToggleLike(thread.id, e)}
                            >
                              <span>❤️</span> {thread.likes}
                            </div>
                          </div>
                        </div>
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
                  <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>💬</span>
                  <h3 style={{ color: 'white', margin: '0 0 8px' }}>No Posts Found</h3>
                  <p style={{ margin: 0, fontSize: '13.5px' }}>
                    There are no discussions matching your current category filter or search query. Start a new thread!
                  </p>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* ── MODAL: CREATE NEW FORUM POST ──────────────── */}
      {showNewPostModal && (
        <div className="mod-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="mod-modal-card" style={{ maxWidth: '560px' }}>
            <div className="mod-modal-header">
              <h3>Create New Discussion Thread</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowNewPostModal(false)}>×</button>
            </div>
            
            <div className="mod-modal-body">
              {/* Title */}
              <div className="forum-form-group">
                <label>Title *</label>
                <input 
                  type="text" 
                  className="forum-input-field" 
                  placeholder="Ask a question or share a thought..."
                  value={newPostForm.title}
                  onChange={(e) => setNewPostForm({ ...newPostForm, title: e.target.value })}
                  autoFocus
                />
              </div>

              {/* Category */}
              <div className="forum-form-group">
                <label>Category *</label>
                <select 
                  className="forum-select-field"
                  value={newPostForm.category}
                  onChange={(e) => setNewPostForm({ ...newPostForm, category: e.target.value })}
                >
                  {categoriesList.filter(c => c.name !== 'All').map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                  {categoriesList.length <= 1 && (
                    <option value="General">General</option>
                  )}
                </select>
              </div>

              {/* Description body */}
              <div className="forum-form-group">
                <label>Content *</label>
                <textarea 
                  className="forum-textarea-field" 
                  placeholder="Provide context, details or questions here..."
                  value={newPostForm.content}
                  onChange={(e) => setNewPostForm({ ...newPostForm, content: e.target.value })}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button 
                  className="mod-btn" 
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  onClick={() => setShowNewPostModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="mod-btn approve" 
                  onClick={handlePublishPost}
                >
                  Publish Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </HomeLayout>
  )
}

export default Forum
