import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import '../../assets/style/moderator/forum-moderation.css'
import { 
  getAllForumThreadsApi, 
  deleteForumThreadApi, 
  updateForumThreadApi 
} from '../../services/api/ForumThreadApi'
import { toast } from 'react-toastify'
import ModernButton from '../../components/common/ModernButton'

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

function ForumModeration({ loading: parentLoading = false, fetchAllData }) {
  const [activeTab, setActiveTab] = useState('threads') // 'threads' | 'reports' | 'categories'
  const [threads, setThreads] = useState([])
  const [localLoading, setLocalLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Local state for dynamically added custom categories (persisted in localStorage)
  const [customCategories, setCustomCategories] = useState(() => {
    const saved = localStorage.getItem('comiverse_forum_categories')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('comiverse_forum_categories', JSON.stringify(customCategories))
  }, [customCategories])
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')

  // Modals
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null) // index
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#3b82f6')
  const [editCatName, setEditCatName] = useState('')

  useEffect(() => {
    fetchThreads()
  }, [])

  const fetchThreads = async () => {
    try {
      setLocalLoading(true)
      const data = await getAllForumThreadsApi()
      
      // Ensure all fields have defaults to prevent null checks
      const mapped = (data || []).map((t) => ({
        ...t,
        isPinned: t.isPinned ?? false,
        isLocked: t.isLocked ?? false,
        isReported: t.isReported ?? false,
        reportReason: t.reportReason ?? '',
        replies: t.replies ?? 0,
        timeLabel: formatTimeAgo(t.createdAt)
      }))
      setThreads(mapped)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load forum threads!')
    } finally {
      setLocalLoading(false)
    }
  }

  // ── THREAD ACTIONS ─────────────────────────────────
  const togglePin = async (id) => {
    if (submitting) return
    const thread = threads.find(t => t.id === id)
    if (!thread) return
    try {
      setSubmitting(true)
      const nextState = !thread.isPinned
      await updateForumThreadApi(id, {
        ...thread,
        isPinned: nextState
      })
      setThreads(prev => prev.map(t => t.id === id ? { ...t, isPinned: nextState } : t))
      fetchAllData?.()
      toast.info(nextState ? `Thread "${thread.title}" pinned!` : `Thread "${thread.title}" unpinned!`)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.status === 409 ? 'Thread was already modified by another moderator.' : 'Failed to update pin state in DB!')
      fetchThreads()
    } finally {
      setSubmitting(false)
    }
  }

  const toggleLock = async (id) => {
    if (submitting) return
    const thread = threads.find(t => t.id === id)
    if (!thread) return
    try {
      setSubmitting(true)
      const nextState = !thread.isLocked
      await updateForumThreadApi(id, {
        ...thread,
        isLocked: nextState
      })
      setThreads(prev => prev.map(t => t.id === id ? { ...t, isLocked: nextState } : t))
      fetchAllData?.()
      toast.info(nextState ? `Thread "${thread.title}" locked!` : `Thread "${thread.title}" unlocked!`)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.status === 409 ? 'Thread was already modified by another moderator.' : 'Failed to update lock state in DB!')
      fetchThreads()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteThread = async (id, title) => {
    if (submitting) return
    if (window.confirm(`Are you sure you want to delete the thread "${title}"?`)) {
      try {
        setSubmitting(true)
        await deleteForumThreadApi(id)
        setThreads(prev => prev.filter(t => t.id !== id))
        fetchAllData?.()
        toast.success(`Thread "${title}" deleted successfully.`)
      } catch (err) {
        console.error(err)
        toast.error(err.response?.status === 409 ? 'Thread was already deleted by another moderator.' : 'Failed to delete thread!')
        fetchThreads()
      } finally {
        setSubmitting(false)
      }
    }
  }

  // ── REPORT ACTIONS ─────────────────────────────────
  const handleResolveReport = async (threadId) => {
    if (submitting) return
    const thread = threads.find(t => t.id === threadId)
    if (!thread) return
    try {
      setSubmitting(true)
      await updateForumThreadApi(threadId, {
        ...thread,
        isReported: false,
        reportReason: ''
      })
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, isReported: false, reportReason: '' } : t))
      fetchAllData?.()
      toast.success('Report resolved successfully.')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.status === 409 ? 'Report was already actioned by another moderator.' : 'Failed to resolve report!')
      fetchThreads()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDismissReport = async (threadId) => {
    if (submitting) return
    const thread = threads.find(t => t.id === threadId)
    if (!thread) return
    try {
      setSubmitting(true)
      await updateForumThreadApi(threadId, {
        ...thread,
        isReported: false,
        reportReason: ''
      })
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, isReported: false, reportReason: '' } : t))
      fetchAllData?.()
      toast.success('Report dismissed.')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.status === 409 ? 'Report was already actioned by another moderator.' : 'Failed to dismiss report!')
      fetchThreads()
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveReportThread = async (threadId, title) => {
    if (submitting) return
    if (window.confirm(`Are you sure you want to remove the reported thread "${title}"?`)) {
      try {
        setSubmitting(true)
        await deleteForumThreadApi(threadId)
        setThreads(prev => prev.filter(t => t.id !== threadId))
        fetchAllData?.()
        toast.success('Reported thread removed successfully.')
      } catch (err) {
        console.error(err)
        toast.error(err.response?.status === 409 ? 'Report was already actioned by another moderator.' : 'Failed to remove thread!')
        fetchThreads()
      } finally {
        setSubmitting(false)
      }
    }
  }

  // ── CATEGORY ACTIONS ───────────────────────────────
  const handleAddCategory = () => {
    if (submitting) return
    if (!newCatName.trim()) return
    const name = newCatName.trim()
    try {
      setSubmitting(true)
      if (!customCategories.includes(name)) {
        setCustomCategories(prev => [...prev, name])
      }
      fetchAllData?.()
      setNewCatName('')
      setShowAddCategoryModal(false)
      toast.success('New category added locally!')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditCategory = async () => {
    if (submitting) return
    if (!editCatName.trim() || editingCategory === null) return
    const oldName = categoriesList[editingCategory].name
    const newName = editCatName.trim()
    
    try {
      setSubmitting(true)
      // Update all threads in DB that match the old category name
      const threadsToUpdate = threads.filter(t => t.category === oldName)
      await Promise.all(threadsToUpdate.map(t => 
        updateForumThreadApi(t.id, { ...t, category: newName })
      ))
      
      // Update custom list if it was a local add
      setCustomCategories(prev => prev.map(c => c === oldName ? newName : c))
      await fetchThreads()
      fetchAllData?.()
      toast.success(`Category renamed to "${newName}".`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to rename category on database threads!')
    } finally {
      setEditingCategory(null)
      setEditCatName('')
      setSubmitting(false)
    }
  }

  const handleDeleteCategory = async (index, name) => {
    if (submitting) return
    if (window.confirm(`Are you sure you want to delete the category "${name}"? Threads under this category will become uncategorized.`)) {
      try {
        setSubmitting(true)
        // Set category to blank for all matching threads in DB
        const threadsToUpdate = threads.filter(t => t.category === name)
        await Promise.all(threadsToUpdate.map(t => 
          updateForumThreadApi(t.id, { ...t, category: '' })
        ))
        
        setCustomCategories(prev => prev.filter(c => c !== name))
        await fetchThreads()
        fetchAllData?.()
        toast.success(`Category "${name}" deleted.`)
      } catch (err) {
        console.error(err)
        toast.error('Failed to clear category on database threads!')
      } finally {
        setSubmitting(false)
      }
    }
  }

  // ── DYNAMIC CATEGORY RESOLUTION (DB DRIVEN) ────────
  const allCategoryNames = Array.from(new Set([
    ...threads.map(t => t.category || 'General'),
    ...customCategories
  ]))

  const categoriesList = allCategoryNames.map(catName => {
    const count = threads.filter(t => (t.category || 'General') === catName).length
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1']
    const hash = catName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const color = colors[hash % colors.length]
    return {
      name: catName,
      threadsCount: count,
      color
    }
  })

  // ── DYNAMIC REPORTS RESOLUTION (DB DRIVEN) ─────────
  const reportsList = threads.filter(t => t.isReported)

  // Filtering for threads list
  const filteredThreads = threads.filter(t => {
    const matchesSearch = !searchQuery.trim() || t.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) || t.author.toLowerCase().includes(searchQuery.toLowerCase().trim())
    const matchesCategory = categoryFilter === 'All Categories' || t.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="fade-in">
      <div className="moderator-page-header">
        <h1>Forum Moderation</h1>
        <p>Moderate community board threads, resolve report flags, and manage forum categories.</p>
      </div>

      {/* TABS HEADER */}
      <div className="mod-forum-tabs">
        <button 
          className={`mod-forum-tab-btn ${activeTab === 'threads' ? 'active' : ''}`}
          onClick={() => setActiveTab('threads')}
        >
          💬 All Threads
        </button>
        <button 
          className={`mod-forum-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          🚩 Reports
          {reportsList.length > 0 && <span className="mod-forum-badge red">{reportsList.length}</span>}
        </button>
        <button 
          className={`mod-forum-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          # Categories
        </button>
      </div>

      {/* VIEW: ALL THREADS */}
      {activeTab === 'threads' && (
        <div className="forum-tab-content">
          <div className="forum-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="forum-section-title">
              Forum Threads 
              <span className="forum-title-count">{filteredThreads.length} threads total</span>
            </h2>
            
            <div className="forum-filters-bar" style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="text"
                className="moderator-select forum-search"
                placeholder="Search threads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '220px', outline: 'none' }}
              />
              <select 
                className="moderator-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option>All Categories</option>
                {categoriesList.map(c => <option key={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {(parentLoading || localLoading) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-line skeleton-shimmer" style={{ height: '80px', width: '100%', borderRadius: '12px' }}></div>
              ))}
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="moderator-empty-state">
              <h3>No threads found</h3>
              <p>Try modifying your search or filters.</p>
            </div>
          ) : (
            <div className="forum-table-wrapper">
              <table className="forum-threads-table">
                <thead>
                  <tr>
                    <th>Thread</th>
                    <th>Author</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'center' }}>Replies</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredThreads.map(t => {
                    let statusLabel = 'Normal'
                    let statusClass = 'normal'
                    if (t.isPinned) {
                      statusLabel = 'Pinned'
                      statusClass = 'pinned'
                    } else if (t.isReported) {
                      statusLabel = 'Reported'
                      statusClass = 'reported'
                    } else if (t.isLocked) {
                      statusLabel = 'Locked'
                      statusClass = 'locked'
                    }

                    return (
                      <tr key={t.id}>
                        <td>
                          <div className="forum-thread-cell">
                            <span className="forum-thread-icons">
                              {t.isPinned && <span title="Pinned">📌</span>}
                              {t.isReported && <span title="Reported">🚩</span>}
                              {t.isLocked && <span title="Locked">🔒</span>}
                              {!t.isPinned && !t.isReported && !t.isLocked && <span title="Thread">💬</span>}
                            </span>
                            <div className="forum-thread-texts">
                              <span className="forum-thread-title" title={t.title}>{t.title}</span>
                              <span className="forum-thread-time">{t.timeLabel || 'recently'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="forum-thread-author">{t.author}</span>
                        </td>
                        <td>
                          <span className="forum-category-pill">{t.category || 'General'}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>
                          {t.replies}
                        </td>
                        <td>
                          <span className={`forum-status-pill ${statusClass}`}>{statusLabel}</span>
                        </td>
                        <td>
                          <div className="forum-actions-cell" style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button 
                              className={`mod-icon-action-btn ${t.isPinned ? 'pinned' : ''}`}
                              onClick={() => togglePin(t.id)}
                              disabled={submitting}
                              style={{ opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                              title="Pin Thread"
                            >
                              📌
                            </button>
                            <button 
                              className={`mod-icon-action-btn ${t.isLocked ? 'locked' : ''}`}
                              onClick={() => toggleLock(t.id)}
                              disabled={submitting}
                              style={{ opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                              title="Lock Thread"
                            >
                              🔒
                            </button>
                            <button 
                              className="mod-icon-action-btn delete"
                              onClick={() => handleDeleteThread(t.id, t.title)}
                              disabled={submitting}
                              style={{ opacity: submitting ? 0.5 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                              title="Delete Thread"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW: REPORTS */}
      {activeTab === 'reports' && (
        <div className="forum-tab-content">
          <h2 className="forum-section-title" style={{ marginBottom: '16px' }}>
            User Reports
            <span className="forum-title-count">
              {reportsList.length} pending
            </span>
          </h2>

          {reportsList.length === 0 ? (
            <div className="moderator-empty-state">
              <h3>No report logs</h3>
              <p>Everything is clean!</p>
            </div>
          ) : (
            <div className="mod-reports-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reportsList.map(rep => (
                <div className="report-panel-card pending" key={rep.id}>
                  <div className="report-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 className="report-thread-title">{rep.title}</h3>
                      <span className="report-meta">
                        Reported by <strong>ConcernedUser</strong> · {rep.timeLabel}
                      </span>
                    </div>
                    <span className="report-status-badge pending">PENDING</span>
                  </div>

                  <div className="report-reason-box">
                    <strong>Reason:</strong> {rep.reportReason || 'Off-topic / spam content'}
                  </div>

                  <div className="report-actions-row" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <ModernButton 
                      variant={2}
                      label={submitting ? 'Resolving...' : '✓ Mark Resolved'}
                      className="btn-approve"
                      onClick={() => handleResolveReport(rep.id)}
                      disabled={submitting}
                      style={{ height: '32px', minHeight: '32px', fontSize: '12px', opacity: submitting ? 0.7 : 1 }}
                    />
                    <ModernButton 
                      variant={2}
                      label={submitting ? 'Removing...' : '🗑️ Remove Thread'}
                      className="btn-reject"
                      onClick={() => handleRemoveReportThread(rep.id, rep.title)}
                      disabled={submitting}
                      style={{ height: '32px', minHeight: '32px', fontSize: '12px', opacity: submitting ? 0.7 : 1 }}
                    />
                    <ModernButton 
                      variant={2}
                      label={submitting ? 'Dismissing...' : 'Dismiss'}
                      className="btn-cancel"
                      onClick={() => handleDismissReport(rep.id)}
                      disabled={submitting}
                      style={{ height: '32px', minHeight: '32px', fontSize: '12px', opacity: submitting ? 0.7 : 1 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="forum-tab-content">
          <div className="forum-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="forum-section-title">
              Forum Categories
              <span className="forum-title-count">{categoriesList.length} categories</span>
            </h2>

            <button 
              className="mod-btn-create" 
              onClick={() => setShowAddCategoryModal(true)}
              style={{ height: '36px', padding: '0 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              + Add Category
            </button>
          </div>

          <div className="forum-categories-grid">
            {categoriesList.map((cat, idx) => (
              <div className="forum-category-card" key={idx}>
                <div className="forum-category-card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="category-color-dot" style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cat.color || '#a855f7' }} />
                  <h3 className="category-card-title">{cat.name}</h3>
                </div>
                <span className="category-threads-count">{cat.threadsCount} threads</span>
                
                <div className="category-card-actions" style={{ display: 'flex', gap: '6px', marginTop: '16px' }}>
                  <button 
                    className="cat-btn-action edit"
                    disabled={submitting}
                    style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                    onClick={() => {
                      setEditingCategory(idx)
                      setEditCatName(cat.name)
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    className="cat-btn-action delete"
                    disabled={submitting}
                    style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
                    onClick={() => handleDeleteCategory(idx, cat.name)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD CATEGORY */}
      {showAddCategoryModal && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card" style={{ maxWidth: '480px' }}>
            <div className="mod-modal-header">
              <h3>Add Forum Category</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowAddCategoryModal(false)}>×</button>
            </div>
            
            <div className="mod-modal-body" style={{ padding: '20px 24px' }}>
              <div className="mod-form-group">
                <label className="mod-label">Category Name *</label>
                <input 
                  type="text"
                  className="mod-input"
                  placeholder="e.g. Off-topic, Spoilers"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="mod-modal-footer">
              <ModernButton 
                variant={2} 
                label="Cancel" 
                className="btn-cancel"
                onClick={() => setShowAddCategoryModal(false)}
                disabled={submitting}
              />
              <ModernButton 
                variant={2} 
                label={submitting ? 'Creating...' : 'Create'} 
                className="btn-approve"
                onClick={handleAddCategory}
                disabled={submitting || !newCatName.trim()}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: EDIT CATEGORY */}
      {editingCategory !== null && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card" style={{ maxWidth: '480px' }}>
            <div className="mod-modal-header">
              <h3>Edit Forum Category</h3>
              <button className="mod-modal-close-btn" onClick={() => setEditingCategory(null)}>×</button>
            </div>
            
            <div className="mod-modal-body" style={{ padding: '20px 24px' }}>
              <div className="mod-form-group">
                <label className="mod-label">Category Name *</label>
                <input 
                  type="text"
                  className="mod-input"
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="mod-modal-footer">
              <ModernButton 
                variant={2} 
                label="Cancel" 
                className="btn-cancel"
                onClick={() => setEditingCategory(null)}
                disabled={submitting}
              />
              <ModernButton 
                variant={2} 
                label={submitting ? 'Saving...' : 'Save'} 
                className="btn-approve"
                onClick={handleEditCategory}
                disabled={submitting || !editCatName.trim()}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ForumModeration
