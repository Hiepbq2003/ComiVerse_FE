import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import '../../assets/style/moderator/review-queue.css'
import ModernButton from '../../components/common/ModernButton'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import ModernPagination from '../../components/common/ModernPagination'

const formatSubmitterName = (submittedBy) => {
  if (!submittedBy) return 'Unknown';
  let name = submittedBy;
  let isAuthor = false;
  if (name.startsWith('Author: ')) {
    name = name.substring(8);
    isAuthor = true;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(name)) {
    name = `User_${name.substring(0, 7)}`;
  }
  
  return isAuthor ? `Author: ${name}` : name;
};

function ReviewQueue({ submissions, handleApprove, handleConfirmReject }) {
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'approved' | 'rejected'
  const [subQueue, setSubQueue] = useState('author') // 'author' | 'translator'
  
  const [priorityFilter, setPriorityFilter] = useState('All Priority')
  const [sortFilter, setSortFilter] = useState('Newest')
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedReview, setSelectedReview] = useState(null)
  const [selectedReject, setSelectedReject] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  const getPastRejections = (currentSubmission) => {
    if (!currentSubmission) return []
    return submissions.filter(item => {
      if (item.status !== 'rejected') return false
      if (item.id === currentSubmission.id) return false
      
      const sameComicId = currentSubmission.comicId && item.comicId && currentSubmission.comicId === item.comicId
      const sameTitle = currentSubmission.title && item.title && currentSubmission.title.toLowerCase().trim() === item.title.toLowerCase().trim()
      
      return sameComicId || sameTitle
    })
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, subQueue, priorityFilter, sortFilter, searchQuery])

  const getTabCount = (tab) => {
    return submissions.filter(item => item.status === tab).length
  }

  const getSubQueueCount = (qType, tab) => {
    return submissions.filter(item => item.queueType === qType && item.status === tab).length
  }

  const getFilteredSubmissions = () => {
    return submissions
      .filter(item => item.status === activeTab)
      .filter(item => item.queueType === subQueue)
      .filter(item => subQueue === 'author' || priorityFilter === 'All Priority' || item.priority === priorityFilter)
      .filter(item => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = item.title?.toLowerCase().includes(query);
        const nameMatch = item.submittedBy?.toLowerCase().includes(query);
        const emailMatch = item.submittedByEmail?.toLowerCase().includes(query);
        return titleMatch || nameMatch || emailMatch;
      })
      .sort((a, b) => {
        if (sortFilter === 'Newest') {
          return b.timestamp - a.timestamp
        } else {
          return a.timestamp - b.timestamp
        }
      })
  }

  const filteredItems = getFilteredSubmissions()
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const onApproveClick = (id) => {
    handleApprove(id)
    if (selectedReview && selectedReview.id === id) {
      setSelectedReview(null)
    }
  }

  const onOpenReject = (item) => {
    setSelectedReject(item)
    setRejectionReason('')
  }

  const onConfirmRejectClick = () => {
    if (!selectedReject) return
    handleConfirmReject(selectedReject.id, rejectionReason)
    if (selectedReview && selectedReview.id === selectedReject.id) {
      setSelectedReview(null)
    }
    setSelectedReject(null)
  }

  return (
    <div className="fade-in">
      <div className="moderator-page-header">
        <h1>Review Queue</h1>
        <p>Approve or reject comic updates submitted by individual authors and translator teams.</p>
      </div>

      {/* Dynamic Statistics Ribbon */}
      {(() => {
        const total = submissions.length;
        const pending = submissions.filter(s => s.status === 'pending').length;
        const approved = submissions.filter(s => s.status === 'approved').length;
        const rejected = submissions.filter(s => s.status === 'rejected').length;
        const rate = (approved + rejected) > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0;
        const highPriority = submissions.filter(s => s.status === 'pending' && s.priority?.toUpperCase() === 'HIGH').length;

        return (
          <div className="moderator-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', margin: '20px 0 24px' }}>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span style={{ fontSize: '13px', color: 'var(--mod-text-secondary)', display: 'block', marginBottom: '6px' }}>Total Submissions</span>
              <strong style={{ fontSize: '24px', color: '#ffffff' }}>{total}</strong>
            </div>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.12)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(168, 85, 247, 0.8)', display: 'block', marginBottom: '6px' }}>Pending Review</span>
              <strong style={{ fontSize: '24px', color: '#c084fc' }}>{pending}</strong>
            </div>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(16, 185, 129, 0.8)', display: 'block', marginBottom: '6px' }}>Approved Items</span>
              <strong style={{ fontSize: '24px', color: '#34d399' }}>{approved}</strong>
            </div>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.12)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(239, 68, 68, 0.8)', display: 'block', marginBottom: '6px' }}>Rejected Items</span>
              <strong style={{ fontSize: '24px', color: '#f87171' }}>{rejected}</strong>
            </div>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.12)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(59, 130, 246, 0.8)', display: 'block', marginBottom: '6px' }}>Approval Rate</span>
              <strong style={{ fontSize: '24px', color: '#60a5fa' }}>{rate}%</strong>
            </div>
            {highPriority > 0 && (
              <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
                <span style={{ fontSize: '13px', color: 'rgba(245, 158, 11, 0.8)', display: 'block', marginBottom: '6px' }}>🚨 High Priority Pending</span>
                <strong style={{ fontSize: '24px', color: '#fbbf24' }}>{highPriority}</strong>
              </div>
            )}
          </div>
        );
      })()}

      {/* Main Status Tabs */}
      <div className="moderator-tabs">
        <button 
          className={`moderator-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Review
          <span className="moderator-tab-btn-badge">{getTabCount('pending')}</span>
        </button>
        <button 
          className={`moderator-tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          Approved
          <span className="moderator-tab-btn-badge">{getTabCount('approved')}</span>
        </button>
        <button 
          className={`moderator-tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          Rejected
          <span className="moderator-tab-btn-badge">{getTabCount('rejected')}</span>
        </button>
      </div>

      {/* SECONDARY QUEUE DIVISION (Author vs. Translator) */}
      <div className="moderator-sub-tabs-container">
        <button 
          className={`moderator-sub-tab-btn ${subQueue === 'author' ? 'active' : ''}`}
          onClick={() => setSubQueue('author')}
        >
          🧑‍🎨 Author Comic Queue
          <span className="moderator-sub-tab-badge">
            {getSubQueueCount('author', activeTab)}
          </span>
        </button>
        <button 
          className={`moderator-sub-tab-btn ${subQueue === 'translator' ? 'active' : ''}`}
          onClick={() => setSubQueue('translator')}
        >
          🌐 Translator Comic Queue
          <span className="moderator-sub-tab-badge">
            {getSubQueueCount('translator', activeTab)}
          </span>
        </button>
      </div>

      {/* Filter and Sort bar */}
      <div className="moderator-filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
        <input 
          type="text"
          className="moderator-select"
          placeholder="Search by title, author name, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '240px', outline: 'none' }}
        />
        {subQueue !== 'author' && (
          <select 
            className="moderator-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option>All Priority</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        )}

        <select 
          className="moderator-select"
          value={sortFilter}
          onChange={(e) => setSortFilter(e.target.value)}
        >
          <option>Newest</option>
          <option>Oldest</option>
        </select>
      </div>

      {/* Submissions List Grid */}
      <div className="moderator-cards-list">
        {filteredItems.length === 0 ? (
          <div className="moderator-empty-state">
            <h3>No items found</h3>
            <p>There are no submissions matching your active filters.</p>
          </div>
        ) : (
          paginatedItems.map(item => (
            <div className="submission-card" key={item.id}>
              <div className="submission-cover-placeholder">
                {item.cover && (item.cover.startsWith('http') || item.cover.includes('/')) ? (
                  <img src={item.cover} alt={item.title} className="submission-cover-img" />
                ) : (
                  item.cover || '📚'
                )}
              </div>

              <div className="submission-info">
                <h3 className="submission-title">{item.title}</h3>
                 <p className="submission-meta">
                  {item.queueType === 'author' ? (
                    <span><strong>Author:</strong> {formatSubmitterName(item.submittedBy).replace('Author: ', '')}</span>
                  ) : (
                    <span><strong>{item.chapter?.toLowerCase().startsWith('chapter') ? item.chapter : `Chapter ${item.chapter}`}</strong> · {formatSubmitterName(item.submittedBy)}</span>
                  )}
                </p>
                <div className="submission-extra">
                  <span className="submission-extra-item">⏱️ {formatTimeAgo(item.timestamp)}</span>
                  <span className="submission-extra-item">📄 {item.words}</span>
                </div>
              </div>

              <div className="submission-right-side">
                <div className="submission-badges">
                  {subQueue !== 'author' && (
                    <span className={`priority-badge ${item.priority.toLowerCase()}`}>
                      {item.priority} Priority
                    </span>
                  )}
                  {item.flags > 0 && (
                    <span className="flags-badge">⚠️ {item.flags} flags</span>
                  )}
                </div>

                <div className="submission-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <ModernButton 
                    variant={2} 
                    label="👁️ Review Content" 
                    className="btn-review"
                    onClick={() => setSelectedReview(item)} 
                  />
                  {item.status === 'pending' && (
                    <>
                      <ModernButton 
                        variant={2} 
                        label="✓ Approve" 
                        className="btn-approve"
                        onClick={() => onApproveClick(item.id)} 
                      />
                      <ModernButton 
                        variant={2} 
                        label="✗ Reject" 
                        className="btn-reject"
                        onClick={() => onOpenReject(item)} 
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <ModernPagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
            variant="pills"
          />
        </div>
      )}

      {/* ── MODAL: CHAPTER CONTENT REVIEWER ────────── */}
      {selectedReview && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card wide">
            <div className="mod-modal-header">
              <h3>Reviewing Submissions: {selectedReview.title}</h3>
              <button className="mod-modal-close-btn" onClick={() => setSelectedReview(null)}>×</button>
            </div>
            
            <div className="mod-modal-body">
              <div className="review-preview-info">
                <strong>Submission Details:</strong>
                <div className="review-preview-meta-grid">
                  {selectedReview.queueType === 'author' ? (
                    <>
                      <div>
                        <strong>Author:</strong> {formatSubmitterName(selectedReview.submittedBy).replace('Author: ', '')}
                      </div>
                      {selectedReview.submittedByEmail && (
                        <div>
                          <strong>Email:</strong> {selectedReview.submittedByEmail}
                        </div>
                      )}
                      {selectedReview.genres && selectedReview.genres.length > 0 && (
                        <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                          <strong>Genres:</strong>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {selectedReview.genres.map((genre, idx) => (
                              <span key={idx} className="comic-genre-tag">
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <strong>Chapter:</strong> {selectedReview.chapter}
                      </div>
                      <div>
                        <strong>Team:</strong> {formatSubmitterName(selectedReview.submittedBy)}
                      </div>
                      {selectedReview.submittedByEmail && (
                        <div>
                          <strong>Email:</strong> {selectedReview.submittedByEmail}
                        </div>
                      )}
                      <div>
                        <strong>Priority:</strong> {selectedReview.priority}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedReview.queueType === 'author' ? (
                /* Beautiful glassmorphic profile preview instead of dummy text */
                <div style={{ 
                  display: 'flex', 
                  gap: '20px', 
                  alignItems: 'flex-start', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '20px', 
                  borderRadius: '12px',
                  marginTop: '16px',
                  color: '#94a3b8'
                }}>
                  {selectedReview.cover && (
                    <div style={{ width: '100px', height: '140px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                      {selectedReview.cover.startsWith('http') || selectedReview.cover.includes('/') ? (
                        <img src={selectedReview.cover} alt={selectedReview.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', fontSize: '32px', justifyContent: 'center' }}>
                          {selectedReview.cover || '📚'}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 8px', fontSize: '18px', color: '#ffffff', fontWeight: '700' }}>{selectedReview.title}</h4>
                    <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.5' }}>
                      {selectedReview.status === 'approved' ? (
                        <span>This submission has been <strong>Approved</strong> and the **Comic Profile** catalog entry is now published. The comic is visible to readers, and the author can upload chapters.</span>
                      ) : selectedReview.status === 'rejected' ? (
                        <span>This submission was <strong>Rejected</strong>. The comic profile was not published. The author must address the rejection reason and submit a new request.</span>
                      ) : (
                        <span>This submission is awaiting review to publish the **Comic Profile** catalog entry. Once approved, the comic will be visible to readers and the author can start uploading chapters.</span>
                      )}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', fontWeight: '600' }}>
                        📁 Profile Review
                      </span>
                      {selectedReview.status === 'approved' && (
                        <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', fontWeight: '600' }}>
                          ✓ Published
                        </span>
                      )}
                      {selectedReview.status === 'rejected' && (
                        <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontWeight: '600' }}>
                          ✗ Rejected
                        </span>
                      )}
                      {selectedReview.status === 'pending' && (
                        <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', fontWeight: '600' }}>
                          🕒 Awaiting Review
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Chapter content view */
                <div className="chapter-viewer-text">
                  {selectedReview.content}
                </div>
              )}

              {/* Current Rejection Reason (if this submission is rejected) */}
              {selectedReview.status === 'rejected' && (
                <div className="review-preview-info" style={{ 
                  marginTop: '20px', 
                  borderLeft: '4px solid #ef4444', 
                  background: 'rgba(239, 68, 68, 0.06)', 
                  padding: '16px', 
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  borderLeftWidth: '4px'
                }}>
                  <strong style={{ color: '#f87171', display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700' }}>
                    Rejection Reason:
                  </strong>
                  <div style={{ 
                    fontStyle: 'italic', 
                    background: 'rgba(0, 0, 0, 0.25)', 
                    padding: '10px 14px', 
                    borderRadius: '6px', 
                    borderLeft: '3px solid #ef4444', 
                    color: '#e2e8f0', 
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}>
                    "{selectedReview.rejectionReason || 'No reason provided.'}"
                  </div>
                </div>
              )}

              {/* Rejection History */}
              {(() => {
                const pastRejections = getPastRejections(selectedReview);
                if (pastRejections.length === 0) return null;
                return (
                  <div className="review-preview-info" style={{ 
                    marginTop: '20px', 
                    borderLeft: '4px solid #ef4444', 
                    background: 'rgba(239, 68, 68, 0.03)', 
                    padding: '16px', 
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.1)',
                    borderLeftWidth: '4px'
                  }}>
                    <strong style={{ color: '#fca5a5', display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '700' }}>
                      ⚠️ Previous Rejections ({pastRejections.length}):
                    </strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {pastRejections.map((rej, idx) => (
                        <div key={rej.id} style={{ fontSize: '13px', borderBottom: idx < pastRejections.length - 1 ? '1px dashed rgba(255, 255, 255, 0.08)' : 'none', paddingBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '700', color: '#ffffff' }}>
                              {rej.queueType === 'author' ? 'Comic Profile' : rej.chapter?.toLowerCase().startsWith('chapter') ? rej.chapter : `Chapter ${rej.chapter}`}
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                              Rejected {formatTimeAgo(rej.timestamp)}
                            </span>
                          </div>
                          <div style={{ 
                            fontStyle: 'italic', 
                            background: 'rgba(0, 0, 0, 0.25)', 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            marginTop: '6px', 
                            borderLeft: '3px solid #ef4444', 
                            color: '#e2e8f0'
                          }}>
                            "{rej.rejectionReason || 'No reason provided.'}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={2} 
                label="Close Preview" 
                className="btn-cancel"
                onClick={() => setSelectedReview(null)} 
              />
              {selectedReview.status === 'pending' && (
                <>
                  <ModernButton 
                    variant={2} 
                    label="✓ Approve" 
                    className="btn-approve"
                    onClick={() => onApproveClick(selectedReview.id)} 
                  />
                  <ModernButton 
                    variant={2} 
                    label="✗ Reject" 
                    className="btn-reject"
                    onClick={() => onOpenReject(selectedReview)} 
                  />
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: REJECTION REMARKS ───────────────── */}
      {selectedReject && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card">
            <div className="mod-modal-header">
              <h3>Confirm Rejection</h3>
              <button className="mod-modal-close-btn" onClick={() => setSelectedReject(null)}>×</button>
            </div>

            <div className="mod-modal-body">
              <p style={{ fontSize: '14px', margin: '0 0 16px', color: 'var(--mod-text-secondary)' }}>
                Please provide a clear reason why the submission <strong>{selectedReject.chapter}</strong> of <em>{selectedReject.title}</em> is being rejected. This feedback will be sent to the submitter.
              </p>
              
              <textarea
                className="rejection-reason-textarea"
                placeholder="Type the rejection reason here (e.g. poor translation quality, duplicates existing chapter, contains offensive material)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={2} 
                label="Cancel" 
                className="btn-cancel"
                onClick={() => setSelectedReject(null)} 
              />
              <ModernButton 
                variant={2} 
                label="Confirm Rejection" 
                className="btn-reject"
                onClick={onConfirmRejectClick}
                disabled={!rejectionReason.trim()}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ReviewQueue
