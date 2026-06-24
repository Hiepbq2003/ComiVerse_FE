import { useState } from 'react'
import AdminLayout from '../../../components/layout/AdminLayout'

// Mock sent history
const MOCK_HISTORY = [
  {
    id: 1,
    type: 'Maintenance',
    title: 'Scheduled Maintenance',
    message: 'The system will be down for maintenance on June 20 from 2AM–4AM UTC.',
    audience: 'All Users',
    recipientCount: '24.5K',
    sentAt: 'Jun 15, 2024 · 10:30',
  },
  {
    id: 2,
    type: 'Update',
    title: 'New Reader Features Available',
    message: 'We have released new bookmarking and reading list features. Check them out in your profile!',
    audience: 'Readers',
    recipientCount: '18.2K',
    sentAt: 'Jun 10, 2024 · 14:00',
  },
  {
    id: 3,
    type: 'Warning',
    title: 'Content Policy Update',
    message: 'Please review the updated content policy. Violations after July 1st will result in account suspension.',
    audience: 'Authors, Translators',
    recipientCount: '3.1K',
    sentAt: 'Jun 05, 2024 · 09:15',
  },
  {
    id: 4,
    type: 'Info',
    title: 'Community Event: Summer Comic Fest',
    message: 'Join our annual Summer Comic Fest starting July 15! Submit your entries before July 10.',
    audience: 'All Users',
    recipientCount: '24.5K',
    sentAt: 'May 28, 2024 · 16:45',
  },
  {
    id: 5,
    type: 'Info',
    title: 'Moderator Guidelines Refresh',
    message: 'Updated moderator guidelines have been published. Please review and acknowledge by end of week.',
    audience: 'Moderators',
    recipientCount: '156',
    sentAt: 'May 20, 2024 · 11:00',
  },
]

const TYPES = ['Info', 'Warning', 'Update', 'Maintenance']
const ROLES = ['All Users', 'Readers', 'Translators', 'Authors', 'Moderators']

function BroadcastManagement() {
  const [selectedType, setSelectedType] = useState('Info')
  const [selectedRoles, setSelectedRoles] = useState(['All Users'])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')

  const handleRoleToggle = (role) => {
    if (role === 'All Users') {
      setSelectedRoles(['All Users'])
      return
    }

    let newRoles = selectedRoles.filter((r) => r !== 'All Users')

    if (newRoles.includes(role)) {
      newRoles = newRoles.filter((r) => r !== role)
    } else {
      newRoles = [...newRoles, role]
    }

    if (newRoles.length === 0) {
      newRoles = ['All Users']
    }

    setSelectedRoles(newRoles)
  }

  const handleSend = () => {
    if (!title.trim() || !message.trim()) return
    // TODO: call API to send broadcast
    alert(`Broadcast sent!\nType: ${selectedType}\nTo: ${selectedRoles.join(', ')}\nTitle: ${title}\nMessage: ${message}`)
    setTitle('')
    setMessage('')
    setSelectedType('Info')
    setSelectedRoles(['All Users'])
  }

  const getTypeBadgeClass = (type) => {
    return `broadcast-type-badge ${type.toLowerCase()}`
  }

  return (
    <AdminLayout activeNav="broadcast">
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
              >
                {role}
              </button>
            ))}
          </div>
          <span className="broadcast-hint">
            Selecting "All Users" overrides individual role selection.
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
          />
          <span className={`broadcast-char-count ${message.length > 500 ? 'over' : ''}`}>
            {message.length} characters
          </span>
        </div>

        {/* Send Button */}
        <button
          className="broadcast-send-btn"
          onClick={handleSend}
          disabled={!title.trim() || !message.trim()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          Send Broadcast
        </button>
      </div>

      {/* Sent History */}
      <div className="broadcast-history">
        <h2 className="broadcast-card-title">Sent History</h2>

        <div className="broadcast-history-list">
          {MOCK_HISTORY.map((item) => (
            <div key={item.id} className="broadcast-history-item">
              <div className="broadcast-history-top">
                <div className="broadcast-history-title-row">
                  <span className={getTypeBadgeClass(item.type)}>{item.type}</span>
                  <h3 className="broadcast-history-title">{item.title}</h3>
                </div>
                <span className="broadcast-history-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {item.sentAt}
                </span>
              </div>
              <p className="broadcast-history-message">{item.message}</p>
              <div className="broadcast-history-meta">
                <span>→ {item.audience}</span>
                <span>·</span>
                <span>{item.recipientCount} users</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  )
}

export default BroadcastManagement
