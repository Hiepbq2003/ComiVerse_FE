import { useState } from 'react'

function ReviewQueue({ submissions, handleApprove, handleConfirmReject }) {
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'approved' | 'rejected'
  const [subQueue, setSubQueue] = useState('translator') // 'author' | 'translator'
  
  const [priorityFilter, setPriorityFilter] = useState('All Priority')
  const [sortFilter, setSortFilter] = useState('Newest')

  const [selectedReview, setSelectedReview] = useState(null)
  const [selectedReject, setSelectedReject] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

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
      .sort((a, b) => {
        if (sortFilter === 'Newest') {
          return b.timestamp - a.timestamp
        } else {
          return a.timestamp - b.timestamp
        }
      })
  }

  const filteredItems = getFilteredSubmissions()

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
      <div className="moderator-filter-bar">
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
          filteredItems.map(item => (
            <div className="submission-card" key={item.id}>
              <div className="submission-cover-placeholder">
                {item.cover}
              </div>

              <div className="submission-info">
                <h3 className="submission-title">{item.title}</h3>
                <p className="submission-meta">
                  {item.chapter} · Submitted by <strong>{item.submittedBy}</strong>
                </p>
                <div className="submission-extra">
                  <span className="submission-extra-item">⏱️ {item.timeLabel}</span>
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

                <div className="submission-actions">
                  <button 
                    className="mod-btn review"
                    onClick={() => setSelectedReview(item)}
                  >
                    👁️ Review Content
                  </button>
                  {item.status === 'pending' && (
                    <>
                      <button 
                        className="mod-btn approve"
                        onClick={() => onApproveClick(item.id)}
                      >
                        ✓ Approve
                      </button>
                      <button 
                        className="mod-btn reject"
                        onClick={() => onOpenReject(item)}
                      >
                        ✗ Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── MODAL: CHAPTER CONTENT REVIEWER ────────── */}
      {selectedReview && (
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
                  <div><strong>Chapter:</strong> {selectedReview.chapter}</div>
                  <div><strong>Submitter:</strong> {selectedReview.submittedBy}</div>
                  {selectedReview.queueType !== 'author' && <div><strong>Priority:</strong> {selectedReview.priority}</div>}
                </div>
              </div>

              <div className="chapter-viewer-text">
                {selectedReview.content}
              </div>
            </div>

            <div className="mod-modal-footer">
              <button 
                className="mod-btn review"
                onClick={() => setSelectedReview(null)}
              >
                Close Preview
              </button>
              {selectedReview.status === 'pending' && (
                <>
                  <button 
                    className="mod-btn approve"
                    onClick={() => onApproveClick(selectedReview.id)}
                  >
                    ✓ Approve
                  </button>
                  <button 
                    className="mod-btn reject"
                    onClick={() => onOpenReject(selectedReview)}
                  >
                    ✗ Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REJECTION REMARKS ───────────────── */}
      {selectedReject && (
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

            <div className="mod-modal-footer">
              <button 
                className="mod-btn review"
                onClick={() => setSelectedReject(null)}
              >
                Cancel
              </button>
              <button 
                className="mod-btn reject"
                onClick={onConfirmRejectClick}
                disabled={!rejectionReason.trim()}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReviewQueue
