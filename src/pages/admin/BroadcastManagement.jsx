import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { sendBroadcastApi, getBroadcastHistoryApi, revokeBroadcastApi } from '../../services/api/BroadcastApi'
import '../../assets/style/admin/broadcast.css'

// Fallback mock data when API is not available
const MOCK_HISTORY = [
  {
    id: 'mock-1',
    type: 'MAINTENANCE',
    title: 'Scheduled Maintenance',
    message: 'The system will be down for maintenance on June 20 from 2AM–4AM UTC.',
    targetRoles: 'ALL',
    recipientCount: 245,
    sentAt: '2024-06-15T10:30:00Z',
  },
  {
    id: 'mock-2',
    type: 'UPDATE',
    title: 'New Reader Features Available',
    message: 'We have released new bookmarking and reading list features. Check them out in your profile!',
    targetRoles: 'READER',
    recipientCount: 182,
    sentAt: '2024-06-10T14:00:00Z',
  },
  {
    id: 'mock-3',
    type: 'WARNING',
    title: 'Content Policy Update',
    message: 'Please review the updated content policy. Violations after July 1st will result in account suspension.',
    targetRoles: 'MODERATOR, READER',
    recipientCount: 31,
    sentAt: '2024-06-05T09:15:00Z',
  },
]

const TYPES = ['Info', 'Warning', 'Update', 'Maintenance']
const ROLES = ['ALL', 'ADMIN', 'MODERATOR', 'AUTHOR', 'TRANSLATOR', 'READER']

function BroadcastManagement() {
  // Form states
  const [selectedType, setSelectedType] = useState('Info')
  const [selectedRoles, setSelectedRoles] = useState(['ALL'])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  // History states
  const [history, setHistory] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isMockData, setIsMockData] = useState(false)

  // Alert states
  const [alert, setAlert] = useState(null) // { type: 'success'|'error', message }

  // Confirmation dialog
  const [showConfirm, setShowConfirm] = useState(false)

  // Recall states
  const [showRecallConfirm, setShowRecallConfirm] = useState(false)
  const [recallItem, setRecallItem] = useState(null)
  const [isRecalling, setIsRecalling] = useState(false)

  // Show alert with auto-dismiss
  const showAlert = useCallback((type, msg) => {
    setAlert({ type, message: msg })
    setTimeout(() => setAlert(null), 5000)
  }, [])

  // Fetch broadcast history
  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const data = await getBroadcastHistoryApi()
      const list = Array.isArray(data) ? data : (data?.data || data?.content || [])
      setHistory(list)
      setIsMockData(false)
    } catch (err) {
      console.warn('Broadcast API not available, using mock data:', err.message)
      setHistory(MOCK_HISTORY)
      setIsMockData(true)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Role toggle logic
  const handleRoleToggle = (role) => {
    if (role === 'ALL') {
      setSelectedRoles(['ALL'])
      return
    }

    let newRoles = selectedRoles.filter((r) => r !== 'ALL')

    if (newRoles.includes(role)) {
      newRoles = newRoles.filter((r) => r !== role)
    } else {
      newRoles = [...newRoles, role]
    }

    if (newRoles.length === 0) {
      newRoles = ['ALL']
    }

    setSelectedRoles(newRoles)
  }

  // Open confirmation dialog
  const handleSendClick = () => {
    if (!title.trim() || !message.trim()) return
    setShowConfirm(true)
  }

  // Recall handlers
  const handleRecallClick = (item) => {
    setRecallItem(item)
    setShowRecallConfirm(true)
  }

  const handleConfirmRecall = async () => {
    if (!recallItem) return
    setShowRecallConfirm(false)
    setIsRecalling(true)
    try {
      await revokeBroadcastApi(recallItem.id)
      setHistory((prev) => prev.filter((h) => h.id !== recallItem.id))
      showAlert('success', 'Broadcast recalled successfully!')
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to recall broadcast. Please try again.'
      showAlert('error', errorMsg)
    } finally {
      setIsRecalling(false)
      setRecallItem(null)
    }
  }

  // Confirm and send broadcast
  const handleConfirmSend = async () => {
    setShowConfirm(false)
    setIsSending(true)
    try {
      const payload = {
        type: selectedType.toUpperCase(),
        title: title.trim(),
        message: message.trim(),
        targetRoles: selectedRoles,
      }
      const result = await sendBroadcastApi(payload)
      const broadcast = result?.data || result

      // Add to history at top
      if (broadcast) {
        setHistory((prev) => [broadcast, ...prev])
      }

      // Reset form
      setTitle('')
      setMessage('')
      setSelectedType('Info')
      setSelectedRoles(['ALL'])

      const count = broadcast?.recipientCount || '?'
      showAlert('success', `Broadcast sent successfully to ${count} users!`)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send broadcast. Please try again.'
      showAlert('error', errorMsg)
    } finally {
      setIsSending(false)
    }
  }

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }) + ' · ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    } catch {
      return dateStr
    }
  }

  // Format recipient count
  const formatCount = (count) => {
    if (typeof count === 'string') return count
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
    return String(count)
  }

  const getTypeBadgeClass = (type) => {
    return `broadcast-type-badge ${(type || '').toLowerCase()}`
  }

  return (
    <AdminLayout activeNav="broadcast">
      {/* Inline Alert */}
      {alert && (
        <div className={`admin-inline-alert admin-inline-alert--${alert.type}`}>
          {alert.type === 'success' ? '✓' : '✕'} {alert.message}
        </div>
      )}

      {/* Mock data indicator */}
      {isMockData && !isLoadingHistory && (
        <div className="admin-inline-alert admin-inline-alert--info">
          ⓘ API is unavailable — displaying demo data. Connect the backend to see real broadcasts.
        </div>
      )}

      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1>Broadcast Announcement</h1>
          <p>Send system-wide notifications to selected user roles.</p>
        </div>
      </div>

      {/* Compose Card */}
      <div className="broadcast-card">
        <h2 className="broadcast-card-title">Compose Announcement</h2>

        {/* Type Selector */}
        <div className="broadcast-field">
          <label className="broadcast-label">Type</label>
          <div className="broadcast-chip-group">
            {TYPES.map((type) => (
              <button
                key={type}
                className={`broadcast-chip type-chip ${type.toLowerCase()} ${selectedType === type ? 'active' : ''}`}
                onClick={() => setSelectedType(type)}
                disabled={isSending}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Send To Selector */}
        <div className="broadcast-field">
          <label className="broadcast-label">Send to</label>
          <div className="broadcast-chip-group">
            {ROLES.map((role) => (
              <button
                key={role}
                className={`broadcast-chip role-chip ${selectedRoles.includes(role) ? 'active' : ''}`}
                onClick={() => handleRoleToggle(role)}
                disabled={isSending}
              >
                {role}
              </button>
            ))}
          </div>
          <span className="broadcast-hint">
            Selecting &quot;ALL&quot; overrides individual role selection.
          </span>
        </div>

        {/* Title Input */}
        <div className="broadcast-field">
          <label className="broadcast-label">
            Title <span className="required">*</span>
          </label>
          <input
            type="text"
            className="broadcast-input"
            placeholder="e.g. Scheduled Maintenance on June 20"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            disabled={isSending}
          />
        </div>

        {/* Message Textarea */}
        <div className="broadcast-field">
          <label className="broadcast-label">
            Message <span className="required">*</span>
          </label>
          <textarea
            className="broadcast-textarea"
            placeholder="Write your announcement message here..."
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            disabled={isSending}
          />
          <span className={`broadcast-char-count ${message.length > 500 ? 'over' : ''}`}>
            {message.length} / 2000 characters
          </span>
        </div>

        {/* Send Button */}
        <button
          className="broadcast-send-btn"
          onClick={handleSendClick}
          disabled={!title.trim() || !message.trim() || isSending}
        >
          {isSending ? (
            <><span className="admin-spinner-sm" /> Sending...</>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Send Broadcast
            </>
          )}
        </button>
      </div>

      {/* Sent History */}
      <div className="broadcast-history">
        <h2 className="broadcast-card-title">
          Sent History
          {!isLoadingHistory && history.length > 0 && (
            <span style={{ fontWeight: 400, fontSize: '13px', color: 'var(--admin-text-muted)', marginLeft: '10px' }}>
              ({history.length} broadcast{history.length !== 1 ? 's' : ''})
            </span>
          )}
        </h2>

        {isLoadingHistory ? (
          <div className="broadcast-history-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`skel-${i}`} className="broadcast-history-item">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="admin-skeleton-cell admin-skeleton-cell--md" />
                  <div className="admin-skeleton-cell admin-skeleton-cell--lg" />
                  <div className="admin-skeleton-cell admin-skeleton-cell--sm" />
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-icon">📢</div>
            <h3>No broadcasts yet</h3>
            <p>Compose and send your first announcement above.</p>
          </div>
        ) : (
          <div className="broadcast-history-list">
            {history.map((item) => (
              <div key={item.id} className="broadcast-history-item">
                <div className="broadcast-history-top">
                  <div className="broadcast-history-title-row">
                    <span className={getTypeBadgeClass(item.type)}>{(item.type || '').toUpperCase()}</span>
                    <h3 className="broadcast-history-title">{item.title}</h3>
                  </div>
                  <span className="broadcast-history-date">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {formatDate(item.sentAt)}
                  </span>
                </div>
                <p className="broadcast-history-message">{item.message}</p>
                <div className="broadcast-history-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>→ {item.targetRoles || item.audience || 'ALL'}</span>
                    <span>·</span>
                    <span>{formatCount(item.recipientCount)} users</span>
                  </div>
                  <button 
                    className="admin-action-btn admin-action-btn--delete" 
                    onClick={() => handleRecallClick(item)}
                    disabled={isRecalling}
                    style={{ 
                      background: 'rgba(239, 68, 68, 0.1)', 
                      color: '#f87171', 
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Recall
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════
          CONFIRMATION MODAL
          ═══════════════════════════════════════════════ */}
      {showConfirm && (
        <div className="admin-modal-overlay" onClick={(event) => event.stopPropagation()}>
          <div className="admin-modal admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-body" style={{ paddingTop: '32px', paddingBottom: '28px' }}>
              <div className="admin-confirm-icon admin-confirm-icon--warning">
                📢
              </div>

              <div className="admin-confirm-text">
                <h3>Send this broadcast?</h3>
                <p>
                  This will send a <strong>{selectedType}</strong> notification to{' '}
                  <strong>{selectedRoles.join(', ')}</strong> users. This action cannot be undone.
                </p>
              </div>

              <div className="admin-confirm-footer">
                <button
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="admin-btn admin-btn--primary"
                  onClick={handleConfirmSend}
                >
                  Yes, Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          RECALL CONFIRMATION MODAL
          ═══════════════════════════════════════════════ */}
      {showRecallConfirm && (
        <div className="admin-modal-overlay" onClick={(event) => event.stopPropagation()}>
          <div className="admin-modal admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-body" style={{ paddingTop: '32px', paddingBottom: '28px' }}>
              <div className="admin-confirm-icon admin-confirm-icon--danger">
                🗑️
              </div>

              <div className="admin-confirm-text">
                <h3>Recall this broadcast?</h3>
                <p>
                  This will delete this notification from <strong>all recipient users&apos; inbox</strong> immediately. This action cannot be undone.
                </p>
              </div>

              <div className="admin-confirm-footer">
                <button
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowRecallConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="admin-btn admin-btn--danger"
                  onClick={handleConfirmRecall}
                  style={{ background: '#ef4444', color: 'white' }}
                >
                  Yes, Recall
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default BroadcastManagement
