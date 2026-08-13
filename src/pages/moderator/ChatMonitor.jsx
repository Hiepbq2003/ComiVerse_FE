import { useState, useEffect, useRef } from 'react'
import '../../assets/style/moderator/chat-monitor.css'
import {
  getAllChatFlagsApi,
  createChatFlagApi,
  warnChatFlagApi,
  muteUserChatApi,
  unmuteUserChatApi,
  dismissChatFlagApi,
  deleteChatFlagApi
} from '../../services/api/ChatFlagApi'
import {
  getBannedKeywordsApi,
  addBannedKeywordApi,
  deleteBannedKeywordApi
} from '../../services/api/BannedKeywordApi'
import ChatWidget from '../../components/chat/ChatWidget'
import { useChat } from '../../hooks/useChat'
import ChatInputBar from '../../components/chat/ChatInputBar'
import { SkeletonLoader } from '../../components/common/SkeletonLoader'
import ModernButton from '../../components/common/ModernButton'
import { toast } from 'react-toastify'
import { pushUserNotification, setUserChatRestriction, issueUserWarningStrike, getAuth } from '../../utils/Auth'

/* ── MODERATOR LIVE STREAM COMPONENT ─────────────────── */
function ModeratorLiveStream({ onFlagMessage, onWarnUser, onMuteUser, onBanUser, onDeleteMessage }) {
  const {
    messages,
    isLoadingInitial,
    isConnected,
    hasMore,
    isLoadingMore,
    isSending,
    currentUser,
    scrollContainerRef,
    isNearBottomRef,
    fetchOlderMessages,
    sendMessage,
  } = useChat('GLOBAL', null)

  const [hoveredMsgId, setHoveredMsgId] = useState(null)
  const [deletedMsgIds, setDeletedMsgIds] = useState(() => {
    try {
      const raw = localStorage.getItem('comiverse_moderator_deleted_msgs')
      return raw ? new Set(JSON.parse(raw)) : new Set()
    } catch (e) {
      return new Set()
    }
  })
  const [inspectImage, setInspectImage] = useState(null)

  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return
    if (container.scrollTop < 30 && hasMore && !isLoadingMore && !isLoadingInitial) {
      fetchOlderMessages()
    }
    const dist = container.scrollHeight - container.scrollTop - container.clientHeight
    if (isNearBottomRef) isNearBottomRef.current = dist < 80
  }

  useEffect(() => {
    if (!isLoadingInitial && messages.length > 0) {
      const container = scrollContainerRef.current
      if (container) container.scrollTop = container.scrollHeight
    }
  }, [isLoadingInitial, messages.length, scrollContainerRef])

  const visibleMessages = messages.filter(m => !deletedMsgIds.has(m.id))

  const handleDelete = (msg) => {
    setDeletedMsgIds(prev => {
      const next = new Set(prev).add(msg.id)
      try {
        localStorage.setItem('comiverse_moderator_deleted_msgs', JSON.stringify(Array.from(next)))
      } catch (e) {}
      return next
    })
    if (onDeleteMessage) onDeleteMessage(msg)
  }

  const formatTime = (iso) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ''
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
  }

  return (
    <div className="cv-live-inspector-container">
      <div className="cv-live-inspector-header">
        <div>
          <h3>📡 Realtime Global Room Stream — Moderator View</h3>
          <p>Hover any message to reveal moderation actions. Flag, warn, mute, or ban users directly from the live stream.</p>
        </div>

      </div>

      {/* Live Message Stream */}
      <div
        className="cv-mod-stream-viewport"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {isLoadingMore && (
          <div className="cv-chat-top-loader" style={{ padding: '8px', textAlign: 'center', color: '#c084fc', fontSize: '12px' }}>
            Loading older messages...
          </div>
        )}

        {isLoadingInitial ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            <SkeletonLoader type="staggered" count={4} />
          </div>
        ) : visibleMessages.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📡</span>
            <p style={{ margin: 0 }}>No messages in stream. Waiting for user activity...</p>
          </div>
        ) : (
          visibleMessages.map((msg) => {
            const userObj = currentUser || {}
            const userId = userObj.id || userObj.userId
            const myName = (userObj.fullName || userObj.username || '').toLowerCase()
            const senderName = msg.senderName || msg.sender || 'Anonymous'
            const senderLower = senderName.toLowerCase()

            const isMine = (userId && msg.senderId && String(msg.senderId) === String(userId)) ||
              (myName && (senderLower === myName || senderLower.includes(myName)))
            const isAdmin = senderLower.includes('admin') ||
              senderLower.includes('system administrator') ||
              (msg.senderRole && msg.senderRole.toLowerCase() === 'admin') ||
              (msg.role && msg.role.toLowerCase() === 'admin')

            const isProtected = isMine || isAdmin
            const initial = (senderName || 'U')[0].toUpperCase()
            const imageUrl = msg.imageUrl || msg.image || msg.attachedImage || null
            const isHovered = hoveredMsgId === msg.id

            return (
              <div
                key={msg.id || `${msg.senderId}-${msg.createdAt}`}
                className={`cv-mod-stream-row ${isMine ? 'mine' : ''} ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredMsgId(msg.id)}
                onMouseLeave={() => setHoveredMsgId(null)}
              >
                {/* Avatar */}
                <div className="cv-mod-stream-avatar" title={senderName}>
                  {msg.senderAvatar || msg.avatar ? (
                    <img src={msg.senderAvatar || msg.avatar} alt={senderName} />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>

                {/* Message Content */}
                <div className="cv-mod-stream-body">
                  <div className="cv-mod-stream-meta">
                    <span className="cv-mod-stream-sender">{senderName}</span>
                    <span className="cv-mod-stream-time">{formatTime(msg.createdAt)}</span>
                    {isMine && <span className="cv-mod-stream-you-badge">YOU</span>}
                    {isAdmin && !isMine && (
                      <span className="cv-mod-stream-you-badge" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
                        ADMIN
                      </span>
                    )}
                  </div>

                  {/* Image message */}
                  {imageUrl && (
                    <div
                      className="cv-mod-stream-image"
                      onClick={() => setInspectImage({ url: imageUrl, sender: senderName, time: formatTime(msg.createdAt), msg })}
                    >
                      <img src={imageUrl} alt="Shared content" />
                      <div className="cv-mod-stream-image-overlay">
                        <span>🔍 Inspect Image</span>
                      </div>
                    </div>
                  )}

                  {/* Text content */}
                  {(msg.content || msg.text) && (
                    <div className="cv-mod-stream-text">
                      {msg.content || msg.text}
                    </div>
                  )}
                </div>

                {/* MODERATION ACTION BUTTONS — Hidden for Admin & Self */}
                {isHovered && (
                  <div className="cv-mod-stream-actions">
                    {!isProtected && (
                      <>
                        <button
                          type="button"
                          className="cv-mod-action-btn flag"
                          onClick={() => {
                            handleDelete(msg)
                            onFlagMessage && onFlagMessage(msg)
                          }}
                          data-tooltip="Flag & Remove Message"
                        >
                          🚩
                        </button>
                        <button
                          type="button"
                          className="cv-mod-action-btn warn"
                          onClick={() => {
                            handleDelete(msg)
                            onWarnUser && onWarnUser(msg)
                          }}
                          data-tooltip="Warn User & Remove"
                        >
                          ⚠️
                        </button>
                        <button
                          type="button"
                          className="cv-mod-action-btn mute"
                          onClick={() => {
                            handleDelete(msg)
                            onMuteUser && onMuteUser(msg)
                          }}
                          data-tooltip="Mute User & Remove"
                        >
                          🔇
                        </button>
                        <button
                          type="button"
                          className="cv-mod-action-btn ban"
                          onClick={() => {
                            handleDelete(msg)
                            onBanUser && onBanUser(msg)
                          }}
                          data-tooltip="Ban User & Remove"
                        >
                          🚫
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="cv-mod-action-btn delete"
                      onClick={() => handleDelete(msg)}
                      data-tooltip="Delete Message"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Moderator can also send messages */}
      <ChatInputBar
        onSendMessage={sendMessage}
        isSending={isSending}
      />

      {/* Image Inspection Modal */}
      {inspectImage && (() => {
        const senderLower = (inspectImage.sender || '').toLowerCase()
        const msgObj = inspectImage.msg || {}
        const userObj = currentUser || {}
        const myId = userObj.id || userObj.userId
        const myName = (userObj.fullName || userObj.username || '').toLowerCase()

        const isSelf = (myId && msgObj.senderId && String(msgObj.senderId) === String(myId)) ||
          (myName && (senderLower === myName || senderLower.includes(myName)))
        const isAdmin = senderLower.includes('admin') ||
          senderLower.includes('system administrator') ||
          (msgObj.senderRole && msgObj.senderRole.toLowerCase() === 'admin') ||
          (msgObj.role && msgObj.role.toLowerCase() === 'admin')

        const isProtected = isSelf || isAdmin

        return (
          <div className="cv-modal-overlay fade-in" onClick={() => setInspectImage(null)}>
            <div className="cv-modal-box" style={{ maxWidth: '600px', padding: '16px 20px' }} onClick={(e) => e.stopPropagation()}>
              <div className="cv-modal-header" style={{ marginBottom: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>🔍 Image Inspection</h3>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#94a3b8',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {inspectImage.sender} {isSelf ? '(YOU)' : (isAdmin ? '(ADMIN)' : '')} • {inspectImage.time}
                  </span>
                </div>
                <button className="cv-modal-close" onClick={() => setInspectImage(null)}>×</button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
                <img
                  src={inspectImage.url}
                  alt="Inspecting content"
                  style={{ maxWidth: '100%', maxHeight: '420px', borderRadius: '12px', objectFit: 'contain' }}
                />
              </div>

              {!isProtected && (
                <div className="cv-modal-footer" style={{ justifyContent: 'center', gap: '8px', marginTop: '14px' }}>
                  <button
                    type="button"
                    className="mod-btn review"
                    onClick={() => {
                      onFlagMessage && onFlagMessage(inspectImage.msg)
                      setInspectImage(null)
                    }}
                  >
                    🚩 Flag Image
                  </button>
                  <button
                    type="button"
                    className="mod-btn warning-opt"
                    onClick={() => {
                      onWarnUser && onWarnUser(inspectImage.msg)
                      setInspectImage(null)
                    }}
                  >
                    ⚠️ Warn Sender
                  </button>
                  <button
                    type="button"
                    className="mod-btn reject"
                    onClick={() => {
                      onBanUser && onBanUser(inspectImage.msg)
                      setInspectImage(null)
                    }}
                  >
                    🚫 Ban User
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function ChatMonitor({ loading = false, fetchAllData }) {
  const [activeTab, setActiveTab] = useState('live') // 'flags' | 'keywords' | 'live'
  const [flagSubTab, setFlagSubTab] = useState('active') // 'active' | 'resolved'
  
  // Data states
  const [flags, setFlags] = useState([])
  const [keywords, setKeywords] = useState([])
  const [loadingFlags, setLoadingFlags] = useState(true)
  const [loadingKeywords, setLoadingKeywords] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Banned keyword form states
  const [newWord, setNewWord] = useState('')
  const [newCategory, setNewCategory] = useState('Profanity')
  const [keywordFilter, setKeywordFilter] = useState('')

  // Mute user modal state
  const [muteTarget, setMuteTarget] = useState(null) // { userId, username, flagId }
  const [muteHours, setMuteHours] = useState(24)
  const [muteReason, setMuteReason] = useState('')

  // LocalStorage Key for Chat Flags Persistence across F5
  const FLAGS_STORAGE_KEY = 'comiverse_moderator_flags'

  const saveFlagsToStorage = (updatedFlags) => {
    try {
      localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify(updatedFlags))
    } catch (e) {
      console.warn('Failed to save flags to localStorage:', e)
    }
  }

  const updateFlagsState = (updater) => {
    setFlags(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveFlagsToStorage(next)
      return next
    })
  }

  useEffect(() => {
    fetchFlags()
    fetchKeywords()
  }, [])

  const fetchFlags = async () => {
    try {
      setLoadingFlags(true)
      let serverFlags = []
      try {
        const data = await getAllChatFlagsApi()
        serverFlags = Array.isArray(data) ? data : (data?.data || [])
      } catch (err) {
        console.warn('Server flags API offline, using local storage flags:', err)
      }

      let localFlags = []
      try {
        const raw = localStorage.getItem(FLAGS_STORAGE_KEY)
        localFlags = raw ? JSON.parse(raw) : []
      } catch (e) {}

      // Merge localFlags and serverFlags (local state takes priority for actioned status AND locally created flags)
      const flagMap = new Map()
      serverFlags.forEach(f => flagMap.set(f.id, f))
      localFlags.forEach(f => {
        if (flagMap.has(f.id) || (f.status && f.status !== 'pending') || f.isLocal) {
          flagMap.set(f.id, { ...(flagMap.get(f.id) || {}), ...f })
        }
      })

      const merged = Array.from(flagMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

      setFlags(merged)
      saveFlagsToStorage(merged)
      fetchAllData?.()
    } catch (err) {
      console.error(err)
      toast.error('Failed to load chat flags!')
    } finally {
      setLoadingFlags(false)
    }
  }

  const fetchKeywords = async () => {
    try {
      setLoadingKeywords(true)
      const data = await getBannedKeywordsApi()
      setKeywords(Array.isArray(data) ? data : (data?.data || []))
    } catch (err) {
      console.error(err)
      toast.error('Failed to load banned keywords!')
    } finally {
      setLoadingKeywords(false)
    }
  }

  const checkProtectedUser = (userStr) => {
    if (!userStr) return false
    const lower = userStr.toLowerCase()
    const auth = getAuth()
    const userObj = auth?.user || {}
    const myName = (userObj.fullName || userObj.username || '').toLowerCase()
    return lower.includes('admin') || lower.includes('system administrator') || (myName && (lower === myName || lower.includes(myName)))
  }

  // Action: Warn user (Graduated Penalty Policy: 1 warn = 1h mute, 2 warns = 5 days mute, 3 warns = BAN)
  const handleSendWarning = async (id, user) => {
    if (submitting) return
    if (checkProtectedUser(user)) {
      toast.error('🛡️ Cannot issue warning strikes against Admin or Self accounts!')
      return
    }
    try {
      setSubmitting(true)
      await warnChatFlagApi(id) // Removed .catch swallow to handle 409 properly

      // Issue graduated warning strike & calculate penalty (1 warn -> 1h, 2 warns -> 5d, 3 warns -> BAN)
      const res = issueUserWarningStrike(user, 'Chat moderation violation')

      updateFlagsState(prev => prev.map(f => f.id === id ? {
        ...f,
        status: 'warned',
        warningCount: res.strikeCount,
        actionedAt: new Date().toISOString(),
        actionedBy: 'Moderator'
      } : f))

      if (res.penaltyType === 'BAN') {
        toast.error(`🚫 Strike 3/3 issued to "${user}": PERMANENT CHAT BAN applied! Moved to Audit Log.`)
      } else {
        toast.warning(`⚠️ Warning Strike ${res.strikeCount}/3 issued to "${user}": Muted for ${res.durationLabel}! Moved to Audit Log.`)
      }
    } catch (err) {
      console.error(err)
      toast.error(err.response?.status === 409 ? 'Flag was already resolved by another moderator.' : 'Failed to send warning!')
      fetchFlags() // Refresh data on concurrency error
    } finally {
      setSubmitting(false)
    }
  }

  // Action: Dismiss flag
  const handleDismissFlag = async (id) => {
    if (submitting) return
    try {
      setSubmitting(true)
      await dismissChatFlagApi(id)

      updateFlagsState(prev => prev.map(f => f.id === id ? {
        ...f,
        status: 'dismissed',
        actionedAt: new Date().toISOString(),
        actionedBy: 'Moderator'
      } : f))

      toast.info('Flag dismissed & archived to Audit Log.')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.status === 409 ? 'Flag was already resolved by another moderator.' : 'Failed to dismiss flag.')
      fetchFlags()
    } finally {
      setSubmitting(false)
    }
  }

  // Action: Ban user permanently
  const handleBanUser = async (id, user) => {
    if (submitting) return
    if (checkProtectedUser(user)) {
      toast.error('🛡️ Cannot ban Admin or Self accounts!')
      return
    }
    if (window.confirm(`Are you sure you want to permanently ban chat access for user: ${user}?`)) {
      try {
        setSubmitting(true)
        await deleteChatFlagApi(id)

        updateFlagsState(prev => prev.map(f => f.id === id ? {
          ...f,
          status: 'banned',
          actionedAt: new Date().toISOString(),
          actionedBy: 'Moderator'
        } : f))

        // Set permanent BAN restriction & push system notification
        setUserChatRestriction(user, { type: 'BAN', reason: 'Chat access permanently banned by Moderator' })
        pushUserNotification(user, {
          title: '🚫 Chat Access Permanently Banned',
          message: 'Your chat access has been permanently banned by a Moderator due to severe violations.',
          type: 'SYSTEM'
        })

        fetchAllData?.()
        toast.success(`🚫 Chat access permanently banned for user ${user}. Moved to Audit Log.`)
      } catch (err) {
        console.error(err)
        toast.error(err.response?.status === 409 ? 'Flag was already resolved by another moderator.' : 'Failed to ban user!')
        fetchFlags()
      } finally {
        setSubmitting(false)
      }
    }
  }

  // Action: Open Mute Modal
  const handleOpenMuteModal = (flag) => {
    const user = flag.user || flag.username || 'User'
    if (checkProtectedUser(user)) {
      toast.error('🛡️ Cannot mute Admin or Self accounts!')
      return
    }
    setMuteTarget({
      userId: flag.userId || flag.id,
      username: user,
      flagId: flag.id
    })
    setMuteHours(24)
    setMuteReason(flag.reason || 'Violating chat guidelines')
  }

  // Action: Confirm Mute
  const handleConfirmMute = async () => {
    if (!muteTarget || submitting) return
    try {
      setSubmitting(true)
      await muteUserChatApi(muteTarget.userId, muteHours, muteReason)

      const until = new Date(Date.now() + muteHours * 3600000).toISOString()
      const targetFlagId = muteTarget.flagId || `flag-${Date.now()}`

      updateFlagsState(prev => {
        const exists = prev.some(f => f.id === targetFlagId || (muteTarget.username && f.user === muteTarget.username && (!f.status || f.status === 'pending')))
        if (exists) {
          return prev.map(f => (f.id === targetFlagId || (muteTarget.username && f.user === muteTarget.username && (!f.status || f.status === 'pending'))) ? {
            ...f,
            status: 'muted',
            mutedUntil: `${muteHours}h`,
            actionedAt: new Date().toISOString(),
            actionedBy: 'Moderator'
          } : f)
        } else {
          return [{
            id: targetFlagId,
            user: muteTarget.username,
            userId: muteTarget.userId,
            message: muteTarget.msgContent || 'Live chat message',
            reason: muteReason || 'Temporary chat mute applied',
            createdAt: new Date().toISOString(),
            status: 'muted',
            mutedUntil: `${muteHours}h`,
            actionedAt: new Date().toISOString(),
            actionedBy: 'Moderator',
            isLocal: true
          }, ...prev]
        }
      })

      // Set MUTE restriction & push system notification to target user
      setUserChatRestriction(muteTarget.userId, { type: 'MUTE', reason: muteReason, until })
      setUserChatRestriction(muteTarget.username, { type: 'MUTE', reason: muteReason, until })

      pushUserNotification(muteTarget.userId, {
        title: '🔇 Chat Privileges Muted',
        message: `Your chat access has been temporarily muted for ${muteHours} hour(s). Reason: "${muteReason}"`,
        type: 'SYSTEM'
      })
      pushUserNotification(muteTarget.username, {
        title: '🔇 Chat Privileges Muted',
        message: `Your chat access has been temporarily muted for ${muteHours} hour(s). Reason: "${muteReason}"`,
        type: 'SYSTEM'
      })

      toast.success(`🔇 User "${muteTarget.username}" muted for ${muteHours} hours. Moved to Audit Log.`)
      setMuteTarget(null)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.status === 409 ? 'User was already actioned by another moderator.' : 'Failed to mute user!')
      fetchFlags()
    } finally {
      setSubmitting(false)
    }
  }

  // Action: Restore Flag back to Active Queue
  const handleReopenFlag = (id) => {
    updateFlagsState(prev => prev.map(f => f.id === id ? {
      ...f,
      status: 'pending',
      actionedAt: null,
      actionedBy: null,
      isLocal: true
    } : f))
    toast.info('🔄 Flag restored and moved back to Active Flags queue.')
  }

  // Action: Add Banned Keyword
  const handleAddKeyword = async (e) => {
    e.preventDefault()
    if (!newWord.trim() || submitting) return
    try {
      setSubmitting(true)
      let added = null
      try {
        added = await addBannedKeywordApi({
          word: newWord.trim(),
          category: newCategory
        })
      } catch (apiErr) {
        console.warn('Backend add keyword API unavailable, creating local entry:', apiErr)
        added = {
          id: `kw-${Date.now()}`,
          word: newWord.trim(),
          category: newCategory,
          severity: newCategory === 'Spam' ? 'HIGH' : (newCategory === 'Adult/NSFW' ? 'CRITICAL' : 'MEDIUM')
        }
      }
      if (added) {
        setKeywords(prev => [added, ...prev])
        setNewWord('')
        toast.success(`🚫 Banned keyword "${added.word}" added & updated to Client pre-filter!`)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to add keyword!')
    } finally {
      setSubmitting(false)
    }
  }

  // Action: Delete Banned Keyword
  const handleDeleteKeyword = async (id, word) => {
    if (submitting) return
    try {
      setSubmitting(true)
      await deleteBannedKeywordApi(id).catch((err) => {
        console.warn('Backend delete keyword API unavailable, applying optimistic local state:', err?.message || err)
      })
      setKeywords(prev => prev.filter(k => k.id !== id))
      toast.info(`Removed keyword "${word}" from pre-filter.`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete keyword!')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingFlags = flags.filter(f => !f.status || f.status === 'pending')
  const resolvedFlags = flags.filter(f => f.status && f.status !== 'pending')

  const filteredKeywords = keywords.filter(k => 
    !keywordFilter || k.word?.toLowerCase().includes(keywordFilter.toLowerCase()) || k.category?.toLowerCase().includes(keywordFilter.toLowerCase())
  )

  return (
    <div className="fade-in cv-chat-monitor-container">
      {/* Header & Metrics */}
      <div className="moderator-page-header">
        <div>
          <h1>Chat Moderation Center</h1>
          <p>Manage violating accounts, update instant client-side keyword pre-filters, and inspect live streams.</p>
        </div>

        <div className="cv-chat-metrics-bar">
          <div className="cv-metric-pill highlight">
            <span className="cv-metric-val">{pendingFlags.length}</span>
            <span className="cv-metric-lbl">Active Flags</span>
          </div>
          <div className="cv-metric-pill">
            <span className="cv-metric-val">{resolvedFlags.length}</span>
            <span className="cv-metric-lbl">Audit Log</span>
          </div>
          <div className="cv-metric-pill">
            <span className="cv-metric-val">{keywords.length}</span>
            <span className="cv-metric-lbl">Banned Keywords</span>
          </div>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="cv-chat-tabs-header">
        <button
          className={`cv-chat-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          📡 Live Stream Inspector
        </button>
        <button
          className={`cv-chat-tab-btn ${activeTab === 'keywords' ? 'active' : ''}`}
          onClick={() => setActiveTab('keywords')}
        >
          🚫 Banned Keywords & Filter ({keywords.length})
        </button>
        <button
          className={`cv-chat-tab-btn ${activeTab === 'flags' ? 'active' : ''}`}
          onClick={() => setActiveTab('flags')}
        >
          🚩 Flagged Accounts & Violations ({pendingFlags.length})
        </button>
      </div>

      {/* TAB 1: VIOLATING ACCOUNTS & FLAGGED MESSAGES */}
      {activeTab === 'flags' && (
        <div className="cv-tab-pane">
          {/* Sub-tab Bar: Active Queue vs Resolved Audit Log */}
          <div className="cv-subtabs-header">
            <button
              type="button"
              className={`cv-subtab-btn ${flagSubTab === 'active' ? 'active' : ''}`}
              onClick={() => setFlagSubTab('active')}
            >
              🚩 Active / Pending Flags ({pendingFlags.length})
            </button>
            <button
              type="button"
              className={`cv-subtab-btn ${flagSubTab === 'resolved' ? 'active' : ''}`}
              onClick={() => setFlagSubTab('resolved')}
            >
              📁 Actioned Audit Log ({resolvedFlags.length})
            </button>
          </div>

          {flagSubTab === 'active' ? (
            (loading || loadingFlags) ? (
              <div style={{ padding: '24px 0' }}>
                <SkeletonLoader type="staggered" count={3} />
              </div>
            ) : pendingFlags.length === 0 ? (
              <div className="moderator-empty-state">
                <h3>🎉 Zero Pending Violations</h3>
                <p>All chatrooms are clear. Switch to "Actioned Audit Log" to view previously processed items.</p>
              </div>
            ) : (
              <div className="cv-flags-list">
                {pendingFlags.map(f => (
                  <div className="cv-flag-card" key={f.id}>
                    <div className="cv-flag-user-info">
                      <div className="cv-user-avatar">
                        {(f.user || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="cv-user-name">User: {f.user}</h3>
                        <span className="cv-flag-meta">
                          Flagged in Chapter Chat • {f.createdAt ? new Date(f.createdAt).toLocaleTimeString() : 'Recent'}
                        </span>
                      </div>
                    </div>

                    <div className="cv-flag-body">
                      <div className="cv-flag-msg-box">
                        <strong>Flagged Message:</strong> <em>"{f.message}"</em>
                      </div>
                      <div className="cv-flag-reason-tag">
                        ⚠️ <strong>Automated Filter Match:</strong> {f.reason || 'Profanity / Toxic Content'}
                      </div>
                    </div>

                    <div className="cv-flag-actions">
                      <button
                        className="mod-btn review"
                        onClick={() => handleSendWarning(f.id, f.user)}
                        disabled={submitting}
                      >
                        ⚠️ Warn User
                      </button>

                      <button
                        className="mod-btn warning-opt"
                        onClick={() => handleOpenMuteModal(f)}
                        disabled={submitting}
                      >
                        🔇 Mute Account
                      </button>

                      <button
                        className="mod-btn reject"
                        onClick={() => handleBanUser(f.id, f.user)}
                        disabled={submitting}
                      >
                        🚫 Ban Chat
                      </button>

                      <button
                        className="mod-btn dismiss"
                        onClick={() => handleDismissFlag(f.id)}
                        disabled={submitting}
                      >
                        ✅ Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* RESOLVED / ACTIONED AUDIT LOG TAB */
            resolvedFlags.length === 0 ? (
              <div className="moderator-empty-state">
                <h3>📁 Audit Log Empty</h3>
                <p>No moderation actions have been recorded yet.</p>
              </div>
            ) : (
              <div className="cv-flags-list">
                {resolvedFlags.map(f => (
                  <div className="cv-flag-card resolved" key={f.id} style={{ opacity: 0.95, borderLeft: '4px solid #a855f7' }}>
                    <div className="cv-flag-user-info">
                      <div className="cv-user-avatar" style={{ background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }}>
                        {(f.user || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="cv-user-name">User: {f.user}</h3>
                        <span className="cv-flag-meta">
                          Actioned: {f.actionedAt ? new Date(f.actionedAt).toLocaleTimeString() : 'Recently'} • Processed by {f.actionedBy || 'Moderator'}
                        </span>
                      </div>
                    </div>

                    <div className="cv-flag-body" style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                      <div className="cv-flag-msg-box">
                        <strong>Flagged Message:</strong> <em>"{f.message}"</em>
                      </div>
                      <div className="cv-flag-reason-tag">
                        ⚠️ <strong>Original Reason:</strong> {f.reason || 'Chat violation'}
                      </div>
                    </div>

                    <div className="cv-flag-actions" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      {f.status === 'warned' && (
                        <span className="cv-status-badge warned" style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: '700', fontSize: '12.5px' }}>
                          ⚠️ Warning Strike Issued (Strike {f.warningCount || 1}/3)
                        </span>
                      )}
                      {f.status === 'muted' && (
                        <span className="cv-status-badge muted" style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', fontWeight: '700', fontSize: '12.5px' }}>
                          🔇 Account Muted ({f.mutedUntil || 'Temp'})
                        </span>
                      )}
                      {f.status === 'banned' && (
                        <span className="cv-status-badge banned" style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: '700', fontSize: '12.5px' }}>
                          🚫 Account Permanently Banned
                        </span>
                      )}
                      {f.status === 'dismissed' && (
                        <span className="cv-status-badge dismissed" style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', fontWeight: '700', fontSize: '12.5px' }}>
                          ✅ Flag Dismissed
                        </span>
                      )}

                      <button
                        type="button"
                        className="cv-btn-secondary"
                        onClick={() => handleReopenFlag(f.id)}
                        style={{ marginLeft: 'auto', fontSize: '12px', padding: '6px 12px' }}
                      >
                        🔄 Restore to Queue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* TAB 2: BANNED KEYWORDS & PRE-FILTER DICTIONARY */}
      {activeTab === 'keywords' && (
        <div className="cv-tab-pane">
          {/* Add Keyword Form */}
          <form className="cv-add-keyword-card" onSubmit={handleAddKeyword}>
            <h3>🚫 Add New Banned Keyword / Pattern</h3>
            <p className="cv-card-desc">
              Keywords added here are cached instantly on client devices to intercept enter submits with 0ms DB impact.
            </p>

            <div className="cv-keyword-form-row">
              <div className="cv-form-group flex-2">
                <label>Keyword / Phrase:</label>
                <input
                  type="text"
                  className="cv-input"
                  placeholder="e.g. toxic_phrase, spam_link..."
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                  required
                />
              </div>

              <div className="cv-form-group">
                <label>Category:</label>
                <select
                  className="cv-select"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                >
                  <option value="Profanity">Profanity</option>
                  <option value="Spam / Scam">Spam / Scam</option>
                  <option value="Policy Violation">Policy Violation</option>
                  <option value="Adverts">Adverts</option>
                  <option value="Hate Speech">Hate Speech</option>
                </select>
              </div>

              <div className="cv-form-group btn-align">
                <button type="submit" className="cv-btn-primary" disabled={!newWord.trim() || submitting}>
                  ➕ Add to Pre-filter
                </button>
              </div>
            </div>
          </form>

          {/* Search Bar */}
          <div className="cv-keyword-search-bar">
            <input
              type="text"
              className="cv-input"
              placeholder="Search banned keywords or categories..."
              value={keywordFilter}
              onChange={e => setKeywordFilter(e.target.value)}
            />
            <span className="cv-search-count">Showing {filteredKeywords.length} of {keywords.length} rules</span>
          </div>

          {/* Keywords Cloud / Grid */}
          {loadingKeywords ? (
            <div style={{ padding: '24px 0' }}>
              <SkeletonLoader type="cards" count={6} />
            </div>
          ) : (
            <div className="cv-keywords-grid">
              {filteredKeywords.length === 0 ? (
                <div className="moderator-empty-state" style={{ gridColumn: '1 / -1' }}>
                  <p>No matching keywords found.</p>
                </div>
              ) : (
                filteredKeywords.map(k => (
                  <div className="cv-keyword-chip" key={k.id}>
                    <div className="cv-chip-header">
                      <span className="cv-chip-word">"{k.word}"</span>
                    </div>

                    <div className="cv-chip-footer">
                      <span className="cv-chip-category">{k.category || 'General'}</span>
                      <button
                        type="button"
                        className="cv-chip-del-btn"
                        onClick={() => handleDeleteKeyword(k.id, k.word)}
                        title="Remove Keyword"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE STREAM & ROOM INSPECTOR WITH INLINE MODERATION */}
      {activeTab === 'live' && (
        <div className="cv-tab-pane">
          <ModeratorLiveStream
            onFlagMessage={(msg) => {
              const targetUser = msg.senderName || msg.sender || 'Unknown'
              const targetId = msg.senderId || msg.sender_id || targetUser
              const newFlag = {
                id: `flag-${Date.now()}`,
                user: targetUser,
                userId: targetId,
                message: msg.content || msg.text || '',
                imageUrl: msg.imageUrl || msg.image || null,
                reason: msg.imageUrl ? 'Image content flagged for inspection' : 'Flagged by Moderator during live stream inspection',
                createdAt: new Date().toISOString(),
                status: 'pending',
                isLocal: true
              }
              updateFlagsState(prev => [newFlag, ...prev])
              createChatFlagApi(newFlag).catch(err => {
                console.warn('Backend create chat flag API offline, saved locally:', err)
              })

              pushUserNotification(targetId, {
                title: '🚩 Chat Message Flagged',
                message: `Your chat message was flagged by Moderator for inspection: "${(msg.content || '').substring(0, 40)}"`,
                type: 'SYSTEM'
              })
              pushUserNotification(targetUser, {
                title: '🚩 Chat Message Flagged',
                message: `Your chat message was flagged by Moderator for inspection: "${(msg.content || '').substring(0, 40)}"`,
                type: 'SYSTEM'
              })

              toast.success(`🚩 Message from "${targetUser}" flagged for review!`)
            }}
            onWarnUser={(msg) => {
              const userName = msg.senderName || msg.sender || 'Unknown'
              const targetId = msg.senderId || msg.sender_id || userName

              if (checkProtectedUser(userName)) {
                toast.error('🛡️ Cannot issue warning strikes against Admin or Self accounts!')
                return
              }

              const reasonStr = `Live stream message: "${(msg.content || '').substring(0, 50)}"`
              const resUser = issueUserWarningStrike(userName, reasonStr)
              if (targetId && targetId !== userName) {
                issueUserWarningStrike(targetId, reasonStr)
              }

              const newFlag = {
                id: `flag-${Date.now()}`,
                user: userName,
                userId: targetId,
                message: msg.content || msg.text || (msg.imageUrl ? 'Image message' : ''),
                imageUrl: msg.imageUrl || msg.image || null,
                reason: 'Violating live chat guidelines',
                createdAt: new Date().toISOString(),
                status: 'warned',
                warningCount: resUser.strikeCount,
                actionedAt: new Date().toISOString(),
                actionedBy: 'Moderator',
                isLocal: true
              }
              updateFlagsState(prev => [newFlag, ...prev])
              createChatFlagApi(newFlag).catch(() => {})

              if (resUser.penaltyType === 'BAN') {
                toast.error(`🚫 Strike 3/3 issued to "${userName}": PERMANENT CHAT BAN applied! Moved to Audit Log.`)
              } else {
                toast.warning(`⚠️ Warning Strike ${resUser.strikeCount}/3 issued to "${userName}": Muted for ${resUser.durationLabel}! Moved to Audit Log.`)
              }
            }}
            onMuteUser={(msg) => {
              const user = msg.senderName || msg.sender || 'Unknown'
              if (checkProtectedUser(user)) {
                toast.error('🛡️ Cannot mute Admin or Self accounts!')
                return
              }
              setMuteTarget({
                userId: msg.senderId || msg.sender_id || msg.id,
                username: user,
                flagId: null,
                msgContent: msg.content || msg.text || 'Image message'
              })
              setMuteHours(24)
              setMuteReason(`Live moderation: "${(msg.content || msg.text || 'Image message').substring(0, 80)}"`)
            }}
            onBanUser={(msg) => {
              const userName = msg.senderName || msg.sender || 'Unknown'
              const targetId = msg.senderId || msg.sender_id || userName

              if (checkProtectedUser(userName)) {
                toast.error('🛡️ Cannot ban Admin or Self accounts!')
                return
              }

              if (window.confirm(`Are you sure you want to permanently ban chat for: ${userName}?`)) {
                setUserChatRestriction(targetId, { type: 'BAN', reason: 'Live moderation ban' })
                setUserChatRestriction(userName, { type: 'BAN', reason: 'Live moderation ban' })

                const newFlag = {
                  id: `flag-${Date.now()}`,
                  user: userName,
                  userId: targetId,
                  message: msg.content || msg.text || (msg.imageUrl ? 'Image message' : ''),
                  imageUrl: msg.imageUrl || msg.image || null,
                  reason: 'Severe violation in live stream',
                  createdAt: new Date().toISOString(),
                  status: 'banned',
                  actionedAt: new Date().toISOString(),
                  actionedBy: 'Moderator',
                  isLocal: true
                }
                updateFlagsState(prev => [newFlag, ...prev])
                createChatFlagApi(newFlag).catch(() => {})

                pushUserNotification(targetId, {
                  title: '🚫 Chat Access Permanently Banned',
                  message: 'Your chat access was permanently banned during live stream inspection by Moderator.',
                  type: 'SYSTEM'
                })
                pushUserNotification(userName, {
                  title: '🚫 Chat Access Permanently Banned',
                  message: 'Your chat access was permanently banned during live stream inspection by Moderator.',
                  type: 'SYSTEM'
                })

                toast.success(`🚫 Chat permanently banned for "${userName}". Moved to Audit Log.`)
              }
            }}
            onDeleteMessage={(msg) => {
              toast.info(`🗑️ Message from "${msg.senderName || msg.sender}" removed from stream.`)
            }}
          />
        </div>
      )}

      {/* MUTE DURATION MODAL DIALOG */}
      {muteTarget && (
        <div className="cv-modal-overlay fade-in">
          <div className="cv-modal-box">
            <div className="cv-modal-header">
              <h3>🔇 Mute Account Chat Access</h3>
              <button className="cv-modal-close" onClick={() => setMuteTarget(null)}>×</button>
            </div>

            <div className="cv-modal-body">
              <p>Set chat restriction duration for <strong>{muteTarget.username}</strong>:</p>

              <div className="cv-mute-durations">
                <button
                  type="button"
                  className={`cv-dur-btn ${muteHours === 1 ? 'selected' : ''}`}
                  onClick={() => setMuteHours(1)}
                >
                  1 Hour
                </button>
                <button
                  type="button"
                  className={`cv-dur-btn ${muteHours === 24 ? 'selected' : ''}`}
                  onClick={() => setMuteHours(24)}
                >
                  24 Hours (1 Day)
                </button>
                <button
                  type="button"
                  className={`cv-dur-btn ${muteHours === 168 ? 'selected' : ''}`}
                  onClick={() => setMuteHours(168)}
                >
                  7 Days
                </button>
              </div>

              <div className="cv-form-group" style={{ marginTop: '16px' }}>
                <label>Restriction Note / Reason:</label>
                <textarea
                  className="cv-textarea"
                  value={muteReason}
                  onChange={e => setMuteReason(e.target.value)}
                  placeholder="Reason for temporary mute..."
                />
              </div>
            </div>

            <div className="cv-modal-footer">
              <button type="button" className="cv-btn-secondary" onClick={() => setMuteTarget(null)}>
                Cancel
              </button>
              <button type="button" className="cv-btn-danger" onClick={handleConfirmMute} disabled={submitting}>
                {submitting ? 'Applying Mute...' : `Confirm Mute (${muteHours}h)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatMonitor
