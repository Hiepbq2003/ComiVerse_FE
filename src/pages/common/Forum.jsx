import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getForumThreadsPageApi, deleteForumThreadApi, createForumThreadApi, getAllForumThreadsApi, updateForumThreadApi, getForumThreadByIdApi } from '../../services/api/ForumThreadApi'
import { createForumCommentApi, getForumCommentsApi } from '../../services/api/ForumCommentApi'
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

const sanitizeHtml = (html) => {
  if (!html) return ''
  // Only allow safe inline tags for forum comments
  const div = document.createElement('div')
  div.innerHTML = html
  // Remove script tags and event handlers
  div.querySelectorAll('script, style, iframe, object, embed').forEach(el => el.remove())
  div.querySelectorAll('*').forEach(el => {
    const attrs = [...el.attributes]
    attrs.forEach(attr => {
      if (attr.name.startsWith('on') || attr.name === 'style') {
        el.removeAttribute(attr.name)
      }
    })
  })
  return div.innerHTML
}

const isHtmlContent = (text) => {
  if (!text) return false
  return /<(b|i|em|strong|u|code|a|blockquote|br|div|span)\b/i.test(text)
}

const parseInlineMarkdown = (text) => {
  if (!text) return []
  // Process tokens left-to-right: **bold**, *italic*, `code`, [link](url)
  const tokenRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.*?)\))/g
  const result = []
  let lastIndex = 0
  let keyCounter = 0
  let match
  while ((match = tokenRegex.exec(text)) !== null) {
    // Push plain text before this match
    if (match.index > lastIndex) {
      result.push(text.substring(lastIndex, match.index))
    }
    if (match[2] !== undefined) {
      // **bold**
      result.push(<strong key={`fmt-${keyCounter++}`}>{match[2]}</strong>)
    } else if (match[3] !== undefined) {
      // *italic*
      result.push(<em key={`fmt-${keyCounter++}`}>{match[3]}</em>)
    } else if (match[4] !== undefined) {
      // `code`
      result.push(<code key={`fmt-${keyCounter++}`} className="forum-inline-code">{match[4]}</code>)
    } else if (match[5] !== undefined) {
      // [link](url)
      result.push(
        <a key={`fmt-${keyCounter++}`} href={match[6] || '#'} target="_blank" rel="noopener noreferrer" className="forum-inline-link">
          {match[5]}
        </a>
      )
    }
    lastIndex = match.index + match[0].length
  }
  // Push remaining plain text
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex))
  }
  return result.length > 0 ? result : [text]
}

const renderFormattedContent = (content) => {
  if (!content) return null
  const lines = content.split('\n')
  return lines.map((line, lineIndex) => {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('>')) {
      const quoteText = line.substring(line.indexOf('>') + 1).trim()
      return (
        <blockquote key={lineIndex} className="forum-blockquote">
          {parseInlineMarkdown(quoteText)}
        </blockquote>
      )
    }
    return (
      <div key={lineIndex} style={{ minHeight: '1.2em' }}>
        {parseInlineMarkdown(line)}
      </div>
    )
  })
}

const normalizeForumComment = (comment) => {
  const auth = getAuth()
  const currentUser = auth?.user
  const fallbackName = currentUser?.fullName || currentUser?.username || 'User'
  const fallbackAvatar = currentUser?.avatarUrl || null

  const authorVal = comment.author || comment.userName || comment.user?.fullName || comment.user?.username
  const isGenericUser = !authorVal || authorVal === 'User' || authorVal === 'Guest User'

  return {
    ...comment,
    author: !isGenericUser ? authorVal : fallbackName,
    avatarUrl: comment.avatarUrl || comment.userAvatar || comment.user?.avatarUrl || (isGenericUser ? fallbackAvatar : null),
    timestamp: comment.createdAt || comment.timestamp || new Date().toISOString(),
    likesCount: comment.likesCount || 0
  }
}

const ForumAvatar = ({ avatarUrl, name, className = 'forum-avatar-placeholder', style }) => {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [avatarUrl])

  const displayName = String(name || 'User')

  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, borderRadius: '50%', ...style }}>
      {avatarUrl && !imageFailed ? (
        <img
          src={avatarUrl}
          alt={`${displayName} avatar`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        displayName[0].toUpperCase()
      )}
    </div>
  )
}

function Forum() {
  const { threadId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = getAuth()?.user
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const auth = getAuth()
  const isModerator = auth?.user && (
    auth.user.role?.toUpperCase() === 'MODERATOR' || 
    auth.user.role?.toUpperCase() === 'ADMIN'
  )
  
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
  const ITEMS_PER_PAGE = 10

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

  // Selected Thread Detail Modal State
  const [selectedThread, setSelectedThread] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [threadComments, setThreadComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [replyingToComment, setReplyingToComment] = useState(null)
  const [highlightedCommentId, setHighlightedCommentId] = useState(null)

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [threadToReport, setThreadToReport] = useState(null)

  // Followed threads state (localStorage)
  const [followedThreads, setFollowedThreads] = useState(() => {
    const saved = localStorage.getItem('comiverse_followed_threads')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('comiverse_followed_threads', JSON.stringify(followedThreads))
  }, [followedThreads])

  // Liking comments state (localStorage)
  const [likedComments, setLikedComments] = useState(() => {
    const saved = localStorage.getItem('comiverse_liked_comments')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('comiverse_liked_comments', JSON.stringify(likedComments))
  }, [likedComments])

  // Liking threads state (localStorage)
  const [likedThreads, setLikedThreads] = useState(() => {
    const saved = localStorage.getItem('comiverse_liked_threads')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('comiverse_liked_threads', JSON.stringify(likedThreads))
  }, [likedThreads])

  const incrementViews = async (thread) => {
    try {
      const nextViews = parseInt(thread.views || 0) + 1
      await updateForumThreadApi(thread.id, {
        id: thread.id,
        title: thread.title,
        author: thread.author,
        category: thread.category,
        content: thread.content,
        isPinned: thread.isPinned || false,
        isLocked: thread.isLocked || false,
        isReported: thread.isReported || false,
        reportReason: thread.reportReason || '',
        replies: thread.replies,
        views: nextViews
      })
      // Update locally
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, views: String(nextViews) } : t))
      setAllThreadsForCounts(prev => prev.map(t => t.id === thread.id ? { ...t, views: nextViews } : t))
    } catch (err) {
      console.error('Failed to increment views:', err)
    }
  }

  // Active three-dot dropdown and detail follow dropdown
  const [activeDropdownThreadId, setActiveDropdownThreadId] = useState(null)
  const [showDetailFollowDropdown, setShowDetailFollowDropdown] = useState(false)

  // Ref for rich editor text area and tracking views count guard
  const replyInputRef = useRef(null)
  const lastViewedThreadIdRef = useRef(null)

  // Fetch specific thread if URL has threadId
  useEffect(() => {
    if (threadId) {
      if (lastViewedThreadIdRef.current === threadId) {
        return
      }
      lastViewedThreadIdRef.current = threadId

      const found = allThreadsForCounts.find(t => String(t.id) === String(threadId)) || threads.find(t => String(t.id) === String(threadId))
      if (found) {
        setSelectedThread(found)
        incrementViews(found)
      } else {
        const fetchThread = async () => {
          try {
            const res = await getForumThreadByIdApi(threadId)
            const threadData = res?.data?.data ?? res?.data ?? res
            if (threadData?.id) {
              const formattedThread = {
                ...threadData,
                title: threadData.title || 'Untitled Thread',
                content: threadData.content || '',
                author: threadData.author || 'Guest User',
                category: threadData.category || 'General',
                views: threadData.views !== undefined && threadData.views !== null ? String(threadData.views) : '0',
                replies: threadData.replies ?? 0,
                likes: threadData.likes || 0,
                timeAgo: formatTimeAgo(threadData.createdAt)
              }
              setSelectedThread(formattedThread)
              incrementViews(formattedThread)
            } else {
              toast.error('Discussion thread not found.')
              navigate('/forum')
            }
          } catch (err) {
            console.error('Failed to load thread detail:', err)
            toast.error('Failed to load discussion thread.')
            navigate('/forum')
          }
        }
        fetchThread()
      }
    } else {
      setSelectedThread(null)
      lastViewedThreadIdRef.current = null
    }
  }, [threadId])

  // Dismiss dropdowns on clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownThreadId(null)
      setShowDetailFollowDropdown(false)
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

  // Scroll to comment if highlighted
  useEffect(() => {
    const highlightId = new URLSearchParams(window.location.search).get('highlight')
    if (highlightId && threadComments.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`comment-${highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 500)
    }
  }, [threadId, threadComments])

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
      const mapped = list.map(t => ({
        ...t,
        isPinned: t.isPinned || false,
        isLocked: t.isLocked || false
      }))
      setAllThreadsForCounts(mapped)
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
        isPinned: t.isPinned || false,
        isLocked: t.isLocked || false,
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
    if (submitting) return
    if (!newPostForm.title.trim()) {
      toast.warn('Please enter a thread title.')
      return
    }
    if (!newPostForm.content.trim()) {
      toast.warn('Please enter thread description.')
      return
    }

    try {
      setSubmitting(true)
      setLoading(true)
      const auth = getAuth()
      const authorName = auth?.user?.fullName || auth?.user?.username || 'Guest User'

      await createForumThreadApi({
        title: newPostForm.title.trim(),
        category: newPostForm.category,
        content: newPostForm.content.trim(),
        author: authorName
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
      setSubmitting(false)
    }
  }

  // Load comments for the selected thread
  useEffect(() => {
    if (!selectedThread?.id) {
      setThreadComments([])
      return undefined
    }

    let cancelled = false
    const loadComments = async () => {
      try {
        setCommentsLoading(true)
        const comments = await getForumCommentsApi(selectedThread.id)
        if (!cancelled) {
          const loaded = (comments || []).map(normalizeForumComment)
          if (loaded.length > 0) {
            setThreadComments(loaded)
          } else {
            const stored = localStorage.getItem(`comiverse_forum_comments_${selectedThread.id}`)
            const parsed = stored ? JSON.parse(stored) : []
            setThreadComments(parsed.map(normalizeForumComment))
          }
        }
      } catch (err) {
        if (!cancelled) {
          const stored = localStorage.getItem(`comiverse_forum_comments_${selectedThread.id}`)
          const parsed = stored ? JSON.parse(stored) : []
          setThreadComments(parsed.map(normalizeForumComment))
        }
      } finally {
        if (!cancelled) setCommentsLoading(false)
      }
    }

    setReplyingToComment(null)
    loadComments()
    return () => {
      cancelled = true
    }
  }, [selectedThread?.id])

  // Deep-link a notification to the exact comment after it has loaded.
  useEffect(() => {
    const targetCommentId = new URLSearchParams(location.search).get('comment')
    if (!targetCommentId || !threadComments.some(comment => String(comment.id) === targetCommentId)) {
      return undefined
    }

    setHighlightedCommentId(targetCommentId)
    const scrollTimer = window.setTimeout(() => {
      document.getElementById(`forum-comment-${targetCommentId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }, 120)
    const highlightTimer = window.setTimeout(() => setHighlightedCommentId(null), 3500)

    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(highlightTimer)
    }
  }, [location.search, threadComments])

  // Open thread detail view via route navigation
  const handleOpenThread = (thread) => {
    navigate(`/forum/thread/${thread.id}`)
  }

  // Handle reporting a thread
  const handleTriggerReport = (thread, event) => {
    if (event) event.stopPropagation()
    setThreadToReport(thread)
    setReportReason('')
    setShowReportModal(true)
  }

  const handleReportThreadSubmit = async () => {
    if (submitting) return
    if (!reportReason.trim()) {
      toast.warn('Please enter a reason for reporting.')
      return
    }
    try {
      setSubmitting(true)
      await updateForumThreadApi(threadToReport.id, {
        id: threadToReport.id,
        title: threadToReport.title,
        author: threadToReport.author,
        category: threadToReport.category,
        content: threadToReport.content,
        isPinned: threadToReport.isPinned || false,
        isLocked: threadToReport.isLocked || false,
        isReported: true,
        reportReason: reportReason.trim(),
        replies: threadToReport.replies,
        views: parseInt(threadToReport.views || 0)
      })
      toast.success('Thread reported successfully. A moderator will review it shortly.')
      setShowReportModal(false)
      fetchThreads(currentPage)
      fetchAllThreadsForCounts()
    } catch (err) {
      console.error('Failed to report thread:', err)
      toast.error('Failed to submit report.')
    } finally {
      setSubmitting(false)
    }
  }

  // Post a comment reply
  const handlePostReply = async () => {
    if (submitting) return
    const editor = replyInputRef.current
    const htmlContent = editor ? editor.innerHTML : ''
    const textContent = editor ? editor.textContent.trim() : ''
    if (!textContent) {
      toast.warn('Please enter your reply.')
      return
    }
    const auth = getAuth()
    const authorName = auth?.user?.fullName || auth?.user?.username || 'Guest User'
    const authorAvatar = auth?.user?.avatarUrl || ''

    try {
      setSubmitting(true)
      const nextRepliesCount = (selectedThread.replies || 0) + 1
      let newReply

      try {
        const created = await createForumCommentApi(selectedThread.id, {
          content: sanitizeHtml(htmlContent),
          parentId: replyingToComment?.id || null
        })
        newReply = normalizeForumComment(created)
      } catch (apiErr) {
        console.warn('Backend comment API unavailable or failed, falling back to local storage:', apiErr)
        newReply = {
          id: Date.now(),
          author: authorName,
          avatarUrl: authorAvatar,
          content: sanitizeHtml(htmlContent),
          timestamp: new Date().toISOString(),
          likesCount: 0,
          parentId: replyingToComment?.id || null
        }
      }

      const updated = [...threadComments, newReply]
      localStorage.setItem(`comiverse_forum_comments_${selectedThread.id}`, JSON.stringify(updated))
      setThreadComments(updated)
      
      // Notify thread author, parent comment author, and @mentioned users
      const existingNotifs = JSON.parse(localStorage.getItem('comiverse_forum_notifications') || '[]')
      const notifiedRecipients = new Set([authorName.toLowerCase()])
      let notifCreated = false

      const addNotification = (recipient, title, message, type) => {
        if (!recipient) return
        const recTrimmed = String(recipient).trim()
        if (notifiedRecipients.has(recTrimmed.toLowerCase())) return

        notifiedRecipients.add(recTrimmed.toLowerCase())
        existingNotifs.push({
          id: `forum-${Date.now()}-${existingNotifs.length}`,
          recipient: recTrimmed,
          title,
          message,
          type,
          targetUrl: `/forum/thread/${selectedThread.id}?highlight=${newReply.id}`,
          isRead: false,
          createdAt: new Date().toISOString()
        })
        notifCreated = true
      }

      // 1. Notify Parent Comment Author if replying via "Reply" button
      if (replyingToComment && replyingToComment.author) {
        addNotification(
          replyingToComment.author,
          'New Reply on Forum',
          `${authorName} replied to your comment: "${textContent.substring(0, 45)}..."`,
          'FORUM_REPLY'
        )
      }

      // 2. Notify any @mentioned users in the comment text
      const candidateUsers = new Set([
        selectedThread.author,
        ...threadComments.map(c => c.author)
      ])

      candidateUsers.forEach(user => {
        if (user && textContent.toLowerCase().includes(`@${user.toLowerCase()}`)) {
          addNotification(
            user,
            'Mentioned in Discussion',
            `${authorName} mentioned you: "${textContent.substring(0, 45)}..."`,
            'FORUM_MENTION'
          )
        }
      })

      // 3. Notify Thread Author if someone else commented on their thread
      if (selectedThread.author) {
        addNotification(
          selectedThread.author,
          'New Comment on your Thread',
          `${authorName} commented on your thread: "${selectedThread.title.substring(0, 45)}..."`,
          'FORUM_COMMENT'
        )
      }

      if (notifCreated) {
        localStorage.setItem('comiverse_forum_notifications', JSON.stringify(existingNotifs))
        window.dispatchEvent(new Event('forum_notification_update'))
      }
      
      setReplyingToComment(null)
      if (editor) editor.innerHTML = ''
      setReplyingToComment(null)

      setThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, replies: nextRepliesCount } : t))
      setSelectedThread(prev => ({ ...prev, replies: nextRepliesCount }))
      setAllThreadsForCounts(prev => prev.map(t => t.id === selectedThread.id ? { ...t, replies: nextRepliesCount } : t))
      
      toast.success('Reply posted!')
    } catch (err) {
      console.error('Failed to post forum reply:', err)
      toast.error('Failed to post reply.')
    } finally {
      setSubmitting(false)
    }
  }

  // Follow thread toggle helper
  const handleToggleFollow = (threadId, event) => {
    if (event) event.stopPropagation()
    setFollowedThreads(prev => {
      const isFollowing = prev.includes(threadId)
      const next = isFollowing 
        ? prev.filter(id => id !== threadId)
        : [...prev, threadId]
      
      toast.info(isFollowing ? 'Thread unfollowed.' : 'Thread followed!')
      return next
    })
  }

  // Direct moderator actions from Reader UI
  const handleTogglePinDirect = async (thread) => {
    if (submitting) return
    try {
      setSubmitting(true)
      const nextState = !thread.isPinned
      await updateForumThreadApi(thread.id, {
        id: thread.id,
        title: thread.title,
        author: thread.author,
        category: thread.category,
        content: thread.content,
        isPinned: nextState,
        isLocked: thread.isLocked || false,
        isReported: thread.isReported || false,
        reportReason: thread.reportReason || '',
        views: parseInt(thread.views || 0),
        replies: parseInt(thread.replies || 0)
      })
      
      // Update local states
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, isPinned: nextState } : t))
      setAllThreadsForCounts(prev => prev.map(t => t.id === thread.id ? { ...t, isPinned: nextState } : t))
      if (selectedThread && selectedThread.id === thread.id) {
        setSelectedThread(prev => ({ ...prev, isPinned: nextState }))
      }
      toast.info(nextState ? `Thread "${thread.title}" pinned!` : `Thread "${thread.title}" unpinned!`)
    } catch (err) {
      console.error('Failed to toggle pin direct:', err)
      toast.error('Failed to update pin state.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleLockDirect = async (thread) => {
    if (submitting) return
    try {
      setSubmitting(true)
      const nextState = !thread.isLocked
      await updateForumThreadApi(thread.id, {
        id: thread.id,
        title: thread.title,
        author: thread.author,
        category: thread.category,
        content: thread.content,
        isPinned: thread.isPinned || false,
        isLocked: nextState,
        isReported: thread.isReported || false,
        reportReason: thread.reportReason || '',
        views: parseInt(thread.views || 0),
        replies: parseInt(thread.replies || 0)
      })
      
      // Update local states
      setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, isLocked: nextState } : t))
      setAllThreadsForCounts(prev => prev.map(t => t.id === thread.id ? { ...t, isLocked: nextState } : t))
      if (selectedThread && selectedThread.id === thread.id) {
        setSelectedThread(prev => ({ ...prev, isLocked: nextState }))
      }
      toast.info(nextState ? `Thread "${thread.title}" locked!` : `Thread "${thread.title}" unlocked!`)
    } catch (err) {
      console.error('Failed to toggle lock direct:', err)
      toast.error('Failed to update lock state.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteThreadDirect = async (thread) => {
    if (submitting) return
    if (window.confirm(`Are you sure you want to delete the thread "${thread.title}"?`)) {
      try {
        setSubmitting(true)
        await deleteForumThreadApi(thread.id)
        setThreads(prev => prev.filter(t => t.id !== thread.id))
        setAllThreadsForCounts(prev => prev.filter(t => t.id !== thread.id))
        toast.success(`Thread "${thread.title}" deleted successfully.`)
        if (selectedThread && selectedThread.id === thread.id) {
          navigate('/forum', { replace: true })
          setSelectedThread(null)
        }
      } catch (err) {
        console.error('Failed to delete thread direct:', err)
        toast.error('Failed to delete thread.')
      } finally {
        setSubmitting(false)
      }
    }
  }

  // WYSIWYG formatting — uses execCommand for visual rich text editing
  const handleInsertFormat = (formatType) => {
    const editor = replyInputRef.current
    if (!editor) return
    editor.focus()
    switch (formatType) {
      case 'bold':
        document.execCommand('bold', false, null)
        break
      case 'italic':
        document.execCommand('italic', false, null)
        break
      case 'quote': {
        const sel = window.getSelection()
        const selectedText = sel.toString() || 'quoted text'
        document.execCommand('insertHTML', false, `<blockquote class="forum-blockquote">${selectedText}</blockquote>`)
        break
      }
      case 'code': {
        const sel2 = window.getSelection()
        const codeText = sel2.toString() || 'code'
        document.execCommand('insertHTML', false, `<code class="forum-inline-code">${codeText}</code>`)
        break
      }
      case 'link': {
        const url = prompt('Enter URL:', 'https://')
        if (url) {
          const sel3 = window.getSelection()
          const linkLabel = sel3.toString() || url
          document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener noreferrer" class="forum-inline-link">${linkLabel}</a>`)
        }
        break
      }
      default:
        return
    }
  }

  // Category tags theme color mapper
  const getCategoryColor = (catName) => {
    const colors = {
      'All': '#7c3aed',
      'General': '#94a3b8',
      'Spoilers': '#ef4444',
      'Suggestions': '#3b82f6',
      'Support': '#10b981',
      'Off-topic': '#f59e0b',
      'Announcements': '#8b5cf6',
      'News': '#ec4899'
    }
    return colors[catName] || '#a855f7'
  }

  // Toggle comment liked state
  const handleToggleCommentLike = (commentId) => {
    const isAlreadyLiked = likedComments.includes(commentId)
    const nextLikedComments = isAlreadyLiked 
      ? likedComments.filter(id => id !== commentId)
      : [...likedComments, commentId]
    
    setLikedComments(nextLikedComments)

    // Update likes count on selected thread comment object in localStorage
    if (selectedThread) {
      const stored = JSON.parse(localStorage.getItem(`comiverse_forum_comments_${selectedThread.id}`) || '[]')
      const updated = stored.map(c => {
        if (c.id === commentId) {
          const count = c.likesCount || 0
          return {
            ...c,
            likesCount: isAlreadyLiked ? Math.max(0, count - 1) : count + 1
          }
        }
        return c
      })
      localStorage.setItem(`comiverse_forum_comments_${selectedThread.id}`, JSON.stringify(updated))
      setThreadComments(updated)
    }
  }

  // Toggle thread liked state
  const handleToggleThreadLike = async (threadToLike, event) => {
    if (event) event.stopPropagation()
    if (!threadToLike) return
    const targetId = threadToLike.id
    const isLiked = likedThreads.includes(targetId)
    const newLikedThreads = isLiked
      ? likedThreads.filter(id => id !== targetId)
      : [...likedThreads, targetId]

    setLikedThreads(newLikedThreads)

    const currentLikes = parseInt(threadToLike.likes || 0)
    const nextLikes = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1

    if (selectedThread && selectedThread.id === targetId) {
      setSelectedThread(prev => prev ? { ...prev, likes: nextLikes } : null)
    }

    setThreads(prev => prev.map(t => t.id === targetId ? { ...t, likes: nextLikes } : t))
    setAllThreadsForCounts(prev => prev.map(t => t.id === targetId ? { ...t, likes: nextLikes } : t))

    try {
      await updateForumThreadApi(targetId, {
        id: targetId,
        title: threadToLike.title,
        author: threadToLike.author,
        category: threadToLike.category,
        content: threadToLike.content,
        isPinned: threadToLike.isPinned || false,
        isLocked: threadToLike.isLocked || false,
        isReported: threadToLike.isReported || false,
        reportReason: threadToLike.reportReason || '',
        replies: threadToLike.replies || 0,
        views: parseInt(threadToLike.views || 0),
        likes: nextLikes
      })
    } catch (err) {
      console.error('Failed to update thread likes count:', err)
    }
  }

  // Count threads inside category
  const getCategoryCount = (catName) => {
    if (catName === 'All') return allThreadsForCounts.length
    if (catName === 'Following') return allThreadsForCounts.filter(t => followedThreads.includes(t.id)).length
    return allThreadsForCounts.filter(t => (t.category || 'General') === catName).length
  }

  // Filter threads
  const getProcessedThreads = () => {
    let result = [...threads]

    // 1. Sidebar Category Filter
    if (selectedCategory === 'Following') {
      result = result.filter(t => followedThreads.includes(t.id))
    } else if (selectedCategory !== 'All') {
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

    // Pinned threads always default to the top
    result.sort((a, b) => {
      const aPinned = a.isPinned || false
      const bPinned = b.isPinned || false
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return 0
    })

    return result
  }

  const getThreadedComments = (comments) => {
    if (!comments || comments.length === 0) return []
    
    const roots = []
    const childrenMap = {}

    comments.forEach(c => {
      if (!c.parentId) {
        roots.push(c)
      } else {
        const parentKey = String(c.parentId)
        if (!childrenMap[parentKey]) {
          childrenMap[parentKey] = []
        }
        childrenMap[parentKey].push(c)
      }
    })

    const ordered = []
    const visit = (comment, depth = 0) => {
      ordered.push({ ...comment, depth })
      const replies = childrenMap[String(comment.id)] || []
      replies.forEach(reply => visit(reply, depth + 1))
    }

    roots.forEach(root => visit(root, 0))

    comments.forEach(c => {
      if (c.parentId && !ordered.some(item => String(item.id) === String(c.id))) {
        ordered.push({ ...c, depth: 1 })
      }
    })

    return ordered
  }

  const processedThreads = getProcessedThreads()
  // Server handles pagination; client filters are applied on the current page's data
  const paginatedThreads = processedThreads

  return (
    <HomeLayout>
      <div className="home-sections-container" style={{ paddingTop: '40px' }}>
        <div className="home-section">
          {threadId && selectedThread ? (
            /* ── DETAILED THREAD FULL PAGE VIEW (STV STYLE - PAGE) ── */
            <div style={{ display: 'flex', gap: '32px' }}>
              {/* Left Column: Threads list sidebar */}
              <aside style={{ width: '320px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
                  <button 
                    className="forum-back-btn-stv" 
                    onClick={() => navigate('/forum')}
                  >
                    ← Back
                  </button>
                  <h4 className="forum-sidebar-header-stv" style={{ fontSize: '13px', margin: 0, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Threads
                  </h4>
                </div>
                
                {/* Scrollable list of other threads */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: '4px' }}>
                  {allThreadsForCounts.map(otherThread => (
                    <div 
                      key={otherThread.id}
                      onClick={() => navigate(`/forum/thread/${otherThread.id}`)}
                      className={`forum-sidebar-thread-card-stv ${String(otherThread.id) === String(threadId) ? 'active' : ''}`}
                    >
                      <ForumAvatar
                        avatarUrl={otherThread.avatarUrl || (otherThread.author === currentUser?.fullName || otherThread.author === currentUser?.username ? currentUser?.avatarUrl : null)}
                        name={otherThread.author || 'User'}
                        className="forum-card-avatar-stv"
                        style={{ background: getCategoryColor(otherThread.category), width: '28px', height: '28px', fontSize: '12px' }}
                      />
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <div className="forum-sidebar-thread-title-stv">
                          {otherThread.title}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                          <span>{otherThread.category || 'General'}</span>
                          <span>💬 {otherThread.replies}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                {/* Colored Banner Header */}
                <div className="forum-detail-banner-stv" style={{ borderRadius: '8px 8px 0 0' }}>
                  <span className="forum-detail-banner-tag">{selectedThread.category || 'General'}</span>
                  <h3 className="forum-detail-banner-title">{selectedThread.title}</h3>
                </div>
                
                {/* 2-Columns Body Layout */}
                <div className="forum-detail-columns-stv" style={{ padding: '24px 0 0 0' }}>
                  {/* Left Column: Post & Comments */}
                  <div className="forum-detail-left-stv">
                    {/* Original Post */}
                    <div className="forum-post-card-stv">
                      <div className="forum-post-header-stv">
                        <div className="forum-author-box-stv">
                          <ForumAvatar
                            avatarUrl={selectedThread.avatarUrl || (selectedThread.author === currentUser?.fullName || selectedThread.author === currentUser?.username ? currentUser?.avatarUrl : null)}
                            name={selectedThread.author || 'User'}
                            className="forum-card-avatar-stv"
                            style={{ background: getCategoryColor(selectedThread.category) }}
                          />
                          <div className="forum-author-details">
                            <span className="forum-author-name-stv">{selectedThread.author}</span>
                            <span className="forum-author-role-badge author">Author</span>
                          </div>
                        </div>
                        <span className="forum-post-time-stv">{selectedThread.timeAgo || 'recently'}</span>
                      </div>
                      <div className="forum-post-content-stv">{renderFormattedContent(selectedThread.content)}</div>
                      
                      <div className="forum-post-likes-row">
                        <span>👁️ {selectedThread.views} views</span>
                        <button 
                          className={`forum-card-action-btn ${likedThreads.includes(selectedThread.id) ? 'liked-active' : ''}`}
                          onClick={() => handleToggleThreadLike(selectedThread)}
                          style={{ cursor: 'pointer' }}
                        >
                          <span>❤️</span> {selectedThread.likes || 0} likes
                        </button>
                      </div>
                    </div>

                    {/* Comments / Discussion List */}
                    <div className="forum-comments-section" style={{ borderTop: 'none', paddingTop: 0 }}>
                      <h4 className="forum-comments-title" style={{ marginBottom: '12px' }}>
                        💬 Comments ({threadComments.length})
                      </h4>

                      <div className="forum-comments-list" style={{ maxHeight: 'none' }}>
                        {commentsLoading && (
                          <p className="forum-comments-loading">Loading comments...</p>
                        )}
                        {!commentsLoading && getThreadedComments(threadComments).map((comment) => {
                          const isCommentLiked = likedComments.includes(comment.id)
                          const highlightId = new URLSearchParams(window.location.search).get('highlight')
                          const isHighlighted = String(comment.id) === String(highlightId)
                          const depthIndent = comment.depth ? Math.min(comment.depth * 28, 112) : 0
                          return (
                            <div 
                              key={comment.id} 
                              id={`forum-comment-${comment.id}`} 
                              className={`forum-comment-card ${comment.parentId || comment.depth ? 'forum-comment-card--reply' : ''} ${isHighlighted || String(highlightedCommentId) === String(comment.id) ? 'highlight-pulse forum-comment-card--highlighted' : ''}`}
                              style={depthIndent ? { marginLeft: `${depthIndent}px` } : undefined}
                            >
                              <div className="forum-comment-header" style={{ marginBottom: '12px' }}>
                                <div className="forum-comment-author">
                                  <ForumAvatar
                                    avatarUrl={comment.avatarUrl}
                                    name={comment.author}
                                    style={{ width: '22px', height: '22px', fontSize: '11px', background: '#7c3aed' }}
                                  />
                                  <span>{comment.author}</span>
                                </div>
                                <span className="forum-comment-time">{formatTimeAgo(comment.timestamp)}</span>
                              </div>
                              
                              <div className="forum-comment-body">
                                {isHtmlContent(comment.content)
                                  ? <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment.content) }} />
                                  : renderFormattedContent(comment.content)
                                }
                              </div>
                              
                              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <button 
                                  className={`forum-card-action-btn ${isCommentLiked ? 'liked-active' : ''}`}
                                  onClick={() => handleToggleCommentLike(comment.id)}
                                >
                                  <span>❤️</span> {comment.likesCount || 0}
                                </button>
                                {!selectedThread.isLocked && (
                                  <button 
                                    className="forum-card-action-btn"
                                    onClick={() => {
                                      setReplyingToComment(comment)
                                      const editor = replyInputRef.current
                                      const targetAuthor = comment.author || comment.userName || comment.user?.fullName || comment.user?.username || 'User'
                                      if (editor && !editor.textContent.trim()) {
                                        editor.textContent = `@${targetAuthor} `
                                      }
                                      if (editor) {
                                        editor.focus()
                                        const range = document.createRange()
                                        range.selectNodeContents(editor)
                                        range.collapse(false)
                                        const selection = window.getSelection()
                                        if (selection) {
                                          selection.removeAllRanges()
                                          selection.addRange(range)
                                        }
                                      }
                                    }}
                                  >
                                    Reply
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {!commentsLoading && threadComments.length === 0 && (
                          <p style={{ fontStyle: 'italic', fontSize: '13.5px', color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
                            No comments yet. Start the conversation!
                          </p>
                        )}
                      </div>

                      {/* Reply Editor Row */}
                      {selectedThread.isLocked ? (
                        <div className="forum-locked-message-stv">
                          🔒 This discussion has been locked by a moderator. No further replies can be posted.
                        </div>
                      ) : (
                        <div className="forum-editor-row-stv">
                          <ForumAvatar
                            avatarUrl={currentUser?.avatarUrl}
                            name={currentUser?.fullName || currentUser?.username || 'Guest'}
                            className="forum-card-avatar-stv"
                            style={{ background: '#4f46e5', width: '32px', height: '32px', fontSize: '13px' }}
                          />
                          <div className="forum-editor-container-stv">
                            {replyingToComment && (
                              <div className="forum-replying-to">
                                <span>Replying to <strong>{replyingToComment.author || replyingToComment.userName || 'User'}</strong></span>
                                <button
                                  type="button"
                                  aria-label="Cancel reply"
                                  title="Cancel reply"
                                  onClick={() => setReplyingToComment(null)}
                                >
                                  ×
                                </button>
                              </div>
                            )}
                            <div 
                              ref={replyInputRef}
                              className="forum-editor-box-stv" 
                              contentEditable
                              data-placeholder="Write a reply..."
                              style={{ minHeight: '80px', outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                            />
                            
                            {/* Formatting Toolbar */}
                            <div className="forum-editor-toolbar-stv">
                              <button className="forum-toolbar-btn-stv" title="Bold" onClick={() => handleInsertFormat('bold')}>B</button>
                              <button className="forum-toolbar-btn-stv" title="Italic" onClick={() => handleInsertFormat('italic')}>I</button>
                              <button className="forum-toolbar-btn-stv" title="Quote" onClick={() => handleInsertFormat('quote')}>”</button>
                              <button className="forum-toolbar-btn-stv" title="Code" onClick={() => handleInsertFormat('code')}>&lt;/&gt;</button>
                              <button className="forum-toolbar-btn-stv" title="Link" onClick={() => handleInsertFormat('link')}>🔗</button>
                              <button 
                                className="mod-btn approve" 
                                onClick={handlePostReply}
                                disabled={submitting}
                                style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '12px', height: '28px', minHeight: '28px', opacity: submitting ? 0.7 : 1 }}
                              >
                                {submitting ? 'Posting...' : 'Reply'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Sidebar Control Column */}
                  <div className="forum-detail-right-stv">
                    <div className="forum-sidebar-panel">
                      {/* Action buttons */}
                      <button 
                        className="forum-panel-btn primary"
                        disabled={selectedThread.isLocked}
                        onClick={() => {
                          if (replyInputRef.current) {
                            replyInputRef.current.focus();
                            replyInputRef.current.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        style={{ opacity: selectedThread.isLocked ? 0.5 : 1, cursor: selectedThread.isLocked ? 'not-allowed' : 'pointer' }}
                      >
                        {selectedThread.isLocked ? '🔒 Locked' : 'Reply'}
                      </button>
                      
                      {/* Follow dropdown setting */}
                      <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="forum-panel-btn follow" 
                          onClick={() => setShowDetailFollowDropdown(!showDetailFollowDropdown)}
                        >
                          ⭐ {followedThreads.includes(selectedThread.id) ? 'Following' : 'Not Tracking'}
                        </button>
                        
                        {showDetailFollowDropdown && (
                          <div className="forum-threedots-dropdown" style={{ top: '100%', left: 0, width: '100%' }}>
                            <button 
                              className="forum-dropdown-item"
                              onClick={() => {
                                if (!followedThreads.includes(selectedThread.id)) {
                                  setFollowedThreads(prev => [...prev, selectedThread.id]);
                                  toast.info('Thread followed!');
                                }
                                setShowDetailFollowDropdown(false);
                              }}
                            >
                              <span>⭐</span> Tracking (All replies)
                            </button>
                            <button 
                              className="forum-dropdown-item"
                              onClick={() => {
                                if (followedThreads.includes(selectedThread.id)) {
                                  setFollowedThreads(prev => prev.filter(id => id !== selectedThread.id));
                                  toast.info('Thread unfollowed.');
                                }
                                setShowDetailFollowDropdown(false);
                              }}
                            >
                              <span>☆</span> Not Tracking
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {(() => {
                        const auth = getAuth();
                        const isCreator = auth?.user && (selectedThread.author === auth.user.fullName || selectedThread.author === auth.user.username);
                        if (isCreator) return null;
                        return (
                          <button 
                            className="forum-panel-btn report" 
                            onClick={() => handleTriggerReport(selectedThread)}
                          >
                            🚩 Report Thread
                          </button>
                        );
                      })()}

                      {isModerator && (
                        <div className="forum-moderator-actions-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <span style={{ fontSize: '11px', color: '#a855f7', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>🛡️ Moderation</span>
                          <button 
                            className={`forum-panel-btn ${selectedThread.isPinned ? 'active-pin' : ''}`}
                            onClick={() => handleTogglePinDirect(selectedThread)}
                            style={{ 
                              background: selectedThread.isPinned ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.03)', 
                              color: selectedThread.isPinned ? '#c084fc' : 'white', 
                              border: selectedThread.isPinned ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255,255,255,0.06)' 
                            }}
                          >
                            📌 {selectedThread.isPinned ? 'Unpin Thread' : 'Pin Thread'}
                          </button>
                          <button 
                            className={`forum-panel-btn ${selectedThread.isLocked ? 'active-lock' : ''}`}
                            onClick={() => handleToggleLockDirect(selectedThread)}
                            style={{ 
                              background: selectedThread.isLocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)', 
                              color: selectedThread.isLocked ? '#f87171' : 'white', 
                              border: selectedThread.isLocked ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.06)' 
                            }}
                          >
                            🔒 {selectedThread.isLocked ? 'Unlock Thread' : 'Lock Thread'}
                          </button>
                          <button 
                            className="forum-panel-btn delete"
                            onClick={() => handleDeleteThreadDirect(selectedThread)}
                            style={{ 
                              background: 'rgba(239, 68, 68, 0.1)', 
                              color: '#f87171', 
                              border: '1px solid rgba(239, 68, 68, 0.2)' 
                            }}
                          >
                            🗑️ Delete Thread
                          </button>
                        </div>
                      )}

                      {/* progression tracker */}
                      <div className="forum-progress-tracker">
                        <div className="forum-progress-title">Post Count</div>
                        <div className="forum-progress-bar-stv">
                          <div 
                            className="forum-progress-bar-fill" 
                            style={{ width: `${Math.min(100, (threadComments.length / 10) * 100)}%` }} 
                          />
                        </div>
                        <div className="forum-progress-label-stv">
                          <span>{threadComments.length + 1} posts</span>
                          <span>{threadComments.length >= 10 ? 'Hot' : 'Quiet'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ── NORMAL LIST LAYOUT ── */
            <>
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
                  <h2 className="section-title" style={{ margin: 0 }}>💬 Forum Discussions</h2>
                  <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                    {totalElements} posts total
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '32px' }}>
                {/* ── LEFT SIDEBAR (STV STYLE) ───────── */}
                <aside style={{ width: '240px', flexShrink: 0 }}>
                  <button 
                    className="forum-btn-create-stv" 
                    onClick={() => setShowNewPostModal(true)}
                  >
                    <span>+</span> Create Discussion
                  </button>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div 
                      className={`forum-sidebar-item-stv ${selectedCategory === 'All' ? 'active' : ''}`}
                      onClick={() => setSelectedCategory('All')}
                    >
                      <span>💬 All Discussions</span>
                      <span style={{ fontSize: '11px', opacity: 0.8 }}>{getCategoryCount('All')}</span>
                    </div>
                    <div 
                      className={`forum-sidebar-item-stv ${selectedCategory === 'Following' ? 'active' : ''}`}
                      onClick={() => setSelectedCategory('Following')}
                    >
                      <span>⭐ Following</span>
                      <span style={{ fontSize: '11px', opacity: 0.8 }}>{getCategoryCount('Following')}</span>
                    </div>

                    {/* Category Divider */}
                    <h4 className="forum-sidebar-heading-stv">
                      🏷️ Categories
                    </h4>

                    {/* Categories List */}
                    {categoriesList.filter(c => c.name !== 'All').map(cat => (
                      <div
                        key={cat.name}
                        className={`forum-sidebar-item-stv ${selectedCategory === cat.name ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.name)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="forum-cat-dot" style={{ background: getCategoryColor(cat.name) }} />
                          <span>{cat.name}</span>
                        </div>
                        <span style={{ fontSize: '11px', opacity: 0.8 }}>{getCategoryCount(cat.name)}</span>
                      </div>
                    ))}
                  </div>
                </aside>

                {/* ── RIGHT MAIN CONTENT AREA ────────────────── */}
                <main style={{ flexGrow: 1, minWidth: 0 }}>
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
                          <div 
                            key={thread.id} 
                            className="forum-thread-card-stv" 
                          >
                            {/* Left avatar and pin */}
                            <div className="forum-card-left-stv">
                              <ForumAvatar
                                avatarUrl={thread.avatarUrl || (thread.author === currentUser?.fullName || thread.author === currentUser?.username ? currentUser?.avatarUrl : null)}
                                name={thread.author || 'User'}
                                className="forum-card-avatar-stv"
                                style={{ background: getCategoryColor(thread.category) }}
                              />
                              {thread.isPinned && (
                                <span className="forum-card-pin-stv" title="Pinned">📌</span>
                              )}
                              {thread.isLocked && (
                                <span className="forum-card-lock-stv" title="Locked" style={{ display: 'block', fontSize: '11px', marginTop: '2px', textAlign: 'center' }}>🔒</span>
                              )}
                            </div>

                            {/* Middle details */}
                            <div className="forum-card-middle-stv">
                              <h4 
                                className="forum-card-title-stv" 
                                onClick={() => handleOpenThread(thread)}
                              >
                                {thread.title}
                              </h4>
                              <div className="forum-card-subtitle-stv">
                                <span>by <strong>{thread.author}</strong></span>
                                <span>•</span>
                                <span>{thread.timeAgo || 'recently'}</span>
                              </div>
                            </div>

                            {/* Right tags and actions */}
                            <div className="forum-card-right-stv">
                              <span className="forum-card-badge-stv">{thread.category || 'General'}</span>
                              <button 
                                className={`forum-card-action-btn ${likedThreads.includes(thread.id) ? 'liked-active' : ''}`}
                                onClick={(e) => handleToggleThreadLike(thread, e)}
                                style={{ padding: '3px 8px', fontSize: '12px' }}
                              >
                                <span>❤️</span> {thread.likes || 0}
                              </button>
                              <span className="forum-card-replies-stv">
                                <span>💬</span> {thread.replies}
                              </span>
                              
                              <div className="forum-threedots-container" onClick={(e) => e.stopPropagation()}>
                                <button 
                                  className={`forum-threedots-trigger ${activeDropdownThreadId === thread.id ? 'active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownThreadId(activeDropdownThreadId === thread.id ? null : thread.id);
                                  }}
                                >
                                  ⋮
                                </button>
                                {activeDropdownThreadId === thread.id && (
                                  <div className="forum-threedots-dropdown">
                                    <button 
                                      className="forum-dropdown-item" 
                                      onClick={(e) => {
                                        handleToggleFollow(thread.id, e);
                                        setActiveDropdownThreadId(null);
                                      }}
                                    >
                                      <span>⭐</span> {followedThreads.includes(thread.id) ? 'Unfollow' : 'Follow'}
                                    </button>
                                    {isModerator && (
                                      <>
                                        <button 
                                          className="forum-dropdown-item" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleTogglePinDirect(thread);
                                            setActiveDropdownThreadId(null);
                                          }}
                                        >
                                          <span>📌</span> {thread.isPinned ? 'Unpin Thread' : 'Pin Thread'}
                                        </button>
                                        <button 
                                          className="forum-dropdown-item" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleLockDirect(thread);
                                            setActiveDropdownThreadId(null);
                                          }}
                                        >
                                          <span>🔒</span> {thread.isLocked ? 'Unlock Thread' : 'Lock Thread'}
                                        </button>
                                        <button 
                                          className="forum-dropdown-item delete-item" 
                                          style={{ color: '#f87171' }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteThreadDirect(thread);
                                            setActiveDropdownThreadId(null);
                                          }}
                                        >
                                          <span>🗑️</span> Delete Thread
                                        </button>
                                      </>
                                    )}
                                    {!isModerator && (() => {
                                       const auth = getAuth();
                                       const isCreator = auth?.user && (thread.author === auth.user.fullName || thread.author === auth.user.username);
                                       if (isCreator) return null;
                                       return (
                                         <button 
                                           className="forum-dropdown-item" 
                                           onClick={(e) => {
                                             handleTriggerReport(thread, e);
                                             setActiveDropdownThreadId(null);
                                           }}
                                         >
                                           <span>🚩</span> Report
                                         </button>
                                       );
                                     })()}
                                  </div>
                                )}
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
            </>
          )}
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
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  className="mod-btn approve" 
                  onClick={handlePublishPost}
                  disabled={submitting}
                  style={{ opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Publishing...' : 'Publish Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL: REPORT THREAD (STV STYLE) ────────────────── */}
      {showReportModal && threadToReport && (
        <div className="mod-modal-overlay" style={{ zIndex: 10000 }} onClick={() => setShowReportModal(false)}>
          <div className="mod-modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="mod-modal-header">
              <h3>Report Discussion Thread</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowReportModal(false)}>×</button>
            </div>
            <div className="mod-modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ fontSize: '13.5px', color: '#94a3b8', margin: '0 0 16px', lineHeight: '1.5' }}>
                You are reporting: <strong>"{threadToReport.title}"</strong>. Please provide a reason below for the moderators to review.
              </p>
              <div className="forum-form-group">
                <label>Reason for Report *</label>
                <textarea 
                  className="forum-textarea-field" 
                  placeholder="Spam, harassment, spoilers, off-topic..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  style={{ minHeight: '80px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button 
                  className="mod-btn" 
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  onClick={() => setShowReportModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  className="mod-btn reject" 
                  onClick={handleReportThreadSubmit}
                  style={{ background: '#ef4444', opacity: submitting ? 0.7 : 1 }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
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
