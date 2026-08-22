import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Clock3,
  FolderKanban,
  Megaphone,
  Send,
  ShieldCheck,
  Trash2,
  UserRoundSearch,
  UsersRound,
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import BroadcastAudienceSearch from '../../components/admin/BroadcastAudienceSearch'
import {
  getBroadcastHistoryApi,
  previewBroadcastAudienceApi,
  revokeBroadcastApi,
  sendBroadcastApi,
} from '../../services/api/BroadcastApi'
import { getAllAccountsApi } from '../../services/api/AccountApi'
import { getProjectTeamsPageApi } from '../../services/api/ProjectTeamApi'
import { AnimatedButton } from '../../components/common/AnimatedButton'
import { exportToCsv } from '../../utils/exportToCsv'
import '../../assets/style/admin/broadcast.css'

const MOCK_HISTORY = [
  {
    id: 'mock-1',
    type: 'MAINTENANCE',
    title: 'Scheduled Maintenance',
    message: 'The system will be down for maintenance on June 20 from 2AM to 4AM UTC.',
    audienceLabel: 'ALL USERS',
    recipientCount: 245,
    sentAt: '2024-06-15T10:30:00Z',
  },
  {
    id: 'mock-2',
    type: 'UPDATE',
    title: 'New Reader Features Available',
    message: 'We have released new bookmarking and reading list features.',
    audienceLabel: 'READER',
    recipientCount: 182,
    sentAt: '2024-06-10T14:00:00Z',
  },
  {
    id: 'mock-3',
    type: 'WARNING',
    title: 'Content Policy Update',
    message: 'Please review the updated content policy before the next moderation cycle.',
    audienceLabel: 'MODERATOR, READER',
    recipientCount: 31,
    sentAt: '2024-06-05T09:15:00Z',
  },
]

const TYPES = ['Info', 'Warning', 'Update', 'Maintenance']

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'AUTHOR', label: 'Author' },
  { value: 'PROJECT_LEADER', label: 'Project Leader' },
  { value: 'TRANSLATOR', label: 'Translator' },
  { value: 'READER', label: 'Reader' },
]

const AUDIENCE_OPTIONS = [
  {
    value: 'ALL',
    label: 'All active users',
    description: 'Every active account',
    icon: UsersRound,
  },
  {
    value: 'ROLES',
    label: 'By role',
    description: 'Choose one or more roles',
    icon: ShieldCheck,
  },
  {
    value: 'USERS',
    label: 'Specific users',
    description: 'Search and select accounts',
    icon: UserRoundSearch,
  },
  {
    value: 'PROJECT_TEAMS',
    label: 'Project teams',
    description: 'Team leaders and members',
    icon: FolderKanban,
  },
]

const extractList = (value) => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.content)) return value.content
  if (Array.isArray(value?.data?.content)) return value.data.content
  if (Array.isArray(value?.data?.data)) return value.data.data
  return []
}

const formatRole = (value) => String(value?.roleName || value || 'User')
  .toLowerCase()
  .split('_')
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ')

const audienceName = (item) => item?.audienceLabel || item?.targetRoles || item?.audience || 'ALL USERS'

function BroadcastManagement() {
  const [selectedType, setSelectedType] = useState('Info')
  const [audienceType, setAudienceType] = useState('ALL')
  const [selectedRoles, setSelectedRoles] = useState(['READER'])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [selectedTeams, setSelectedTeams] = useState([])
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [audiencePreview, setAudiencePreview] = useState(null)

  const [history, setHistory] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isMockData, setIsMockData] = useState(false)
  const [alert, setAlert] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showRecallConfirm, setShowRecallConfirm] = useState(false)
  const [recallItem, setRecallItem] = useState(null)
  const [isRecalling, setIsRecalling] = useState(false)

  const showAlert = useCallback((type, text) => {
    setAlert({ type, message: text })
    window.setTimeout(() => setAlert(null), 5000)
  }, [])

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const data = await getBroadcastHistoryApi()
      setHistory(extractList(data))
      setIsMockData(false)
    } catch (error) {
      console.warn('Broadcast API is unavailable, using demo data:', error.message)
      setHistory(MOCK_HISTORY)
      setIsMockData(true)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const loadUsers = useCallback(async (query) => {
    const response = await getAllAccountsApi({
      page: 1,
      size: 8,
      status: 'ACTIVE',
      ...(query ? { search: query } : {}),
    })
    return extractList(response)
  }, [])

  const loadTeams = useCallback(async (query) => {
    const response = await getProjectTeamsPageApi(1, 8, query)
    return extractList(response)
  }, [])

  const audienceIsValid = useMemo(() => {
    if (audienceType === 'ALL') return true
    if (audienceType === 'ROLES') return selectedRoles.length > 0
    if (audienceType === 'USERS') return selectedUsers.length > 0
    if (audienceType === 'PROJECT_TEAMS') return selectedTeams.length > 0
    return false
  }, [audienceType, selectedRoles.length, selectedTeams.length, selectedUsers.length])

  const buildAudiencePayload = () => {
    if (audienceType === 'ALL') {
      return { audienceType: 'ALL', targetRoles: ['ALL'] }
    }
    if (audienceType === 'ROLES') {
      return { audienceType: 'ROLES', targetRoles: selectedRoles }
    }
    if (audienceType === 'USERS') {
      return {
        audienceType: 'USERS',
        targetUserIds: selectedUsers.map((user) => user.id || user.userId),
      }
    }
    return {
      audienceType: 'PROJECT_TEAMS',
      targetTeamIds: selectedTeams.map((team) => team.id),
    }
  }

  const buildBroadcastPayload = () => ({
    type: selectedType.toUpperCase(),
    title: title.trim(),
    message: message.trim(),
    ...buildAudiencePayload(),
  })

  const handleAudienceTypeChange = (value) => {
    setAudienceType(value)
    setAudiencePreview(null)
  }

  const handleRoleToggle = (role) => {
    setSelectedRoles((current) => current.includes(role)
      ? current.filter((item) => item !== role)
      : [...current, role])
    setAudiencePreview(null)
  }

  const handleSendClick = async () => {
    if (!title.trim() || !message.trim()) {
      showAlert('error', 'Enter a title and message before sending.')
      return
    }
    if (!audienceIsValid) {
      showAlert('error', 'Select at least one recipient, role, or project team.')
      return
    }

    setIsPreviewing(true)
    try {
      const response = await previewBroadcastAudienceApi(buildBroadcastPayload())
      const preview = response?.data || response
      setAudiencePreview(preview)
      setShowConfirm(true)
    } catch (error) {
      const errorMessage = error.response?.data?.message
        || 'Could not verify the selected recipients. Refresh the selection and try again.'
      showAlert('error', errorMessage)
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleConfirmSend = async () => {
    if (!audiencePreview?.enabledRecipientCount) return
    setShowConfirm(false)
    setIsSending(true)
    try {
      const result = await sendBroadcastApi(buildBroadcastPayload())
      const broadcast = result?.data || result
      if (broadcast) setHistory((current) => [broadcast, ...current])

      setTitle('')
      setMessage('')
      setSelectedType('Info')
      setAudienceType('ALL')
      setSelectedRoles(['READER'])
      setSelectedUsers([])
      setSelectedTeams([])
      setAudiencePreview(null)

      showAlert('success', `Broadcast sent to ${broadcast?.recipientCount ?? 0} users.`)
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send broadcast. Please try again.'
      showAlert('error', errorMessage)
    } finally {
      setIsSending(false)
    }
  }

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
      setHistory((current) => current.filter((item) => item.id !== recallItem.id))
      showAlert('success', 'Broadcast recalled successfully.')
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to recall broadcast. Please try again.'
      showAlert('error', errorMessage)
    } finally {
      setIsRecalling(false)
      setRecallItem(null)
    }
  }

  const formatDate = (dateValue) => {
    if (!dateValue || dateValue === '-') return '-'
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return dateValue
    return `${date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    })} | ${date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })}`
  }

  const formatCount = (count) => {
    if (typeof count === 'string') return count
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return String(count ?? 0)
  }

  const handleExportHistory = () => {
    const headers = ['Broadcast ID', 'Type', 'Title', 'Message', 'Audience', 'Recipient Count', 'Sent At']
    const rows = history.map((item) => [
      item.id,
      item.type,
      item.title,
      item.message,
      audienceName(item),
      item.recipientCount,
      item.sentAt,
    ])
    exportToCsv('ComiVerse_Broadcast_History', headers, rows)
  }

  return (
    <AdminLayout activeNav="broadcast">
      <div className="broadcast-management-screen">
        {alert && (
          <div className={`admin-inline-alert admin-inline-alert--${alert.type}`} role="alert">
            {alert.message}
          </div>
        )}

        {isMockData && !isLoadingHistory && (
          <div className="admin-inline-alert admin-inline-alert--info">
            The API is unavailable. Demo history is shown until the backend reconnects.
          </div>
        )}

        <div className="admin-page-header">
          <div className="admin-page-header-info">
            <h1>Broadcast Announcement</h1>
            <p>Send announcements to all users, roles, individual accounts, or project teams.</p>
          </div>
          <AnimatedButton
            variant={3}
            label="Export History"
            tooltip="Export broadcast history as CSV"
            className="btn-excel"
            onClick={handleExportHistory}
            disabled={history.length === 0}
          />
        </div>

        <div className="broadcast-card">
          <h2 className="broadcast-card-title">Compose Announcement</h2>

          <div className="broadcast-field">
            <label className="broadcast-label">Type</label>
            <div className="broadcast-chip-group">
              {TYPES.map((type) => (
                <button
                  type="button"
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

          <div className="broadcast-field">
            <label className="broadcast-label">Audience</label>
            <div className="broadcast-audience-tabs">
              {AUDIENCE_OPTIONS.map((option) => {
                const Icon = option.icon
                const isActive = audienceType === option.value
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={`broadcast-audience-tab ${isActive ? 'is-active' : ''}`}
                    onClick={() => handleAudienceTypeChange(option.value)}
                    aria-pressed={isActive}
                    disabled={isSending}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </button>
                )
              })}
            </div>

            {audienceType === 'ALL' && (
              <div className="broadcast-audience-note">
                <UsersRound size={17} aria-hidden="true" />
                Every active account with system broadcasts enabled will receive this announcement.
              </div>
            )}

            {audienceType === 'ROLES' && (
              <div className="broadcast-audience-panel">
                <div className="broadcast-chip-group">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      type="button"
                      key={role.value}
                      className={`broadcast-chip role-chip ${selectedRoles.includes(role.value) ? 'active' : ''}`}
                      onClick={() => handleRoleToggle(role.value)}
                      disabled={isSending}
                      aria-pressed={selectedRoles.includes(role.value)}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
                <span className="broadcast-hint">You may combine multiple roles. Duplicate recipients are removed.</span>
              </div>
            )}

            {audienceType === 'USERS' && (
              <div className="broadcast-audience-panel">
                <BroadcastAudienceSearch
                  inputId="broadcast-user-search"
                  placeholder="Search by name, username, or email"
                  selectedItems={selectedUsers}
                  onChange={(items) => {
                    setSelectedUsers(items)
                    setAudiencePreview(null)
                  }}
                  loadOptions={loadUsers}
                  getId={(user) => user.id || user.userId}
                  getTitle={(user) => user.fullName || user.username || user.email || 'Unnamed account'}
                  getSubtitle={(user) => [user.username ? `@${user.username}` : '', user.email]
                    .filter(Boolean)
                    .join(' | ')}
                  getMeta={(user) => formatRole(user.role)}
                  getImageUrl={(user) => user.avatarUrl || ''}
                  emptyMessage="No active accounts match this search."
                  maxSelected={100}
                  disabled={isSending}
                />
                <span className="broadcast-hint">Up to 8 matches are shown at once. Keep typing to narrow the list.</span>
              </div>
            )}

            {audienceType === 'PROJECT_TEAMS' && (
              <div className="broadcast-audience-panel">
                <BroadcastAudienceSearch
                  inputId="broadcast-team-search"
                  placeholder="Search by project or comic name"
                  selectedItems={selectedTeams}
                  onChange={(items) => {
                    setSelectedTeams(items)
                    setAudiencePreview(null)
                  }}
                  loadOptions={loadTeams}
                  getId={(team) => team.id}
                  getTitle={(team) => team.title || team.comicName || team.comicTitle || 'Untitled project'}
                  getSubtitle={(team) => [
                    team.comicName || team.comicTitle,
                    team.sourceLang && team.targetLang ? `${team.sourceLang} to ${team.targetLang}` : '',
                  ].filter(Boolean).join(' | ') || 'Translation project'}
                  getMeta={(team) => [team.status, `${team.membersCount ?? 0} members`]
                    .filter(Boolean)
                    .join(' | ')}
                  getImageUrl={(team) => /^https?:\/\//i.test(team.cover || '') ? team.cover : ''}
                  emptyMessage="No project teams match this search."
                  maxSelected={20}
                  disabled={isSending}
                />
                <span className="broadcast-hint">The team leader and all active members are included once.</span>
              </div>
            )}

            {!audienceIsValid && audienceType !== 'ALL' && (
              <span className="broadcast-field-error">Select at least one recipient before sending.</span>
            )}
          </div>

          <div className="broadcast-field">
            <label className="broadcast-label" htmlFor="broadcast-title">
              Title <span className="required">*</span>
            </label>
            <input
              id="broadcast-title"
              type="text"
              className="broadcast-input"
              placeholder="e.g. Scheduled maintenance on June 20"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              disabled={isSending}
            />
          </div>

          <div className="broadcast-field">
            <label className="broadcast-label" htmlFor="broadcast-message">
              Message <span className="required">*</span>
            </label>
            <textarea
              id="broadcast-message"
              className="broadcast-textarea"
              placeholder="Write your announcement message here..."
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={2000}
              disabled={isSending}
            />
            <span className="broadcast-char-count">{message.length} / 2000 characters</span>
          </div>

          <button
            type="button"
            className="broadcast-send-btn"
            onClick={handleSendClick}
            disabled={!title.trim() || !message.trim() || !audienceIsValid || isSending || isPreviewing}
          >
            {isPreviewing || isSending ? (
              <>
                <span className="admin-spinner-sm" />
                {isPreviewing ? 'Checking recipients...' : 'Sending...'}
              </>
            ) : (
              <>
                <Send size={16} aria-hidden="true" />
                Review and Send
              </>
            )}
          </button>
        </div>

        <div className="broadcast-history">
          <h2 className="broadcast-card-title">
            Sent History
            {!isLoadingHistory && history.length > 0 && (
              <span className="broadcast-history-count">
                ({history.length} broadcast{history.length !== 1 ? 's' : ''})
              </span>
            )}
          </h2>

          {isLoadingHistory ? (
            <div className="broadcast-history-list">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`broadcast-skeleton-${index}`} className="broadcast-history-item">
                  <div className="broadcast-history-skeleton">
                    <div className="admin-skeleton-cell admin-skeleton-cell--md" />
                    <div className="admin-skeleton-cell admin-skeleton-cell--lg" />
                    <div className="admin-skeleton-cell admin-skeleton-cell--sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-icon">
                <Megaphone size={28} aria-hidden="true" />
              </div>
              <h3>No broadcasts yet</h3>
              <p>Compose and send your first announcement above.</p>
            </div>
          ) : (
            <div className="broadcast-history-list">
              {history.map((item) => (
                <div key={item.id} className="broadcast-history-item">
                  <div className="broadcast-history-top">
                    <div className="broadcast-history-title-row">
                      <span className={`broadcast-type-badge ${(item.type || '').toLowerCase()}`}>
                        {(item.type || '').toUpperCase()}
                      </span>
                      <h3 className="broadcast-history-title">{item.title}</h3>
                    </div>
                    <span className="broadcast-history-date">
                      <Clock3 aria-hidden="true" />
                      {formatDate(item.sentAt)}
                    </span>
                  </div>
                  <p className="broadcast-history-message">{item.message}</p>
                  <div className="broadcast-history-footer">
                    <div className="broadcast-history-meta">
                      <span>Audience: {audienceName(item)}</span>
                      <span>|</span>
                      <span>{formatCount(item.recipientCount)} users</span>
                    </div>
                    <button
                      type="button"
                      className="broadcast-recall-btn"
                      onClick={() => handleRecallClick(item)}
                      disabled={isRecalling}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                      Recall
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showConfirm && audiencePreview && (
          <div className="admin-modal-overlay" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-body broadcast-preview-modal">
                <div className="admin-confirm-icon admin-confirm-icon--warning">
                  <Megaphone size={24} aria-hidden="true" />
                </div>
                <div className="admin-confirm-text">
                  <h3>Send this broadcast?</h3>
                  <p>Audience: <strong>{audiencePreview.audienceLabel}</strong></p>
                </div>

                <div className="broadcast-preview-grid">
                  <div>
                    <span>Matched</span>
                    <strong>{audiencePreview.matchedRecipientCount}</strong>
                  </div>
                  <div>
                    <span>Will receive</span>
                    <strong>{audiencePreview.enabledRecipientCount}</strong>
                  </div>
                  <div>
                    <span>Opted out</span>
                    <strong>{audiencePreview.optedOutCount}</strong>
                  </div>
                </div>

                <p className={`broadcast-preview-note ${audiencePreview.enabledRecipientCount === 0 ? 'is-error' : ''}`}>
                  {audiencePreview.enabledRecipientCount === 0
                    ? 'No selected account currently allows system broadcasts.'
                    : 'Notification preferences are applied. Only enabled recipients will be notified.'}
                </p>

                <div className="admin-confirm-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    onClick={() => setShowConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary"
                    onClick={handleConfirmSend}
                    disabled={audiencePreview.enabledRecipientCount === 0}
                  >
                    Yes, Send to {audiencePreview.enabledRecipientCount}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showRecallConfirm && (
          <div className="admin-modal-overlay" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal admin-confirm-modal" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-body broadcast-preview-modal">
                <div className="admin-confirm-icon admin-confirm-icon--danger">
                  <Trash2 size={24} aria-hidden="true" />
                </div>
                <div className="admin-confirm-text">
                  <h3>Recall this broadcast?</h3>
                  <p>This removes the notification from every recipient inbox. This action cannot be undone.</p>
                </div>
                <div className="admin-confirm-footer">
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary"
                    onClick={() => setShowRecallConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--danger"
                    onClick={handleConfirmRecall}
                  >
                    Yes, Recall
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default BroadcastManagement
