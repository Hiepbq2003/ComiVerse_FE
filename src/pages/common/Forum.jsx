import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getForumThreadsPageApi, deleteForumThreadApi, createForumThreadApi, getAllForumThreadsApi, updateForumThreadApi, getForumThreadByIdApi, incrementForumThreadViewApi, reportForumThreadApi } from '../../services/api/ForumThreadApi'
import { createForumCommentApi, getForumCommentsApi, toggleForumCommentLikeApi, updateForumCommentApi, deleteForumCommentApi } from '../../services/api/ForumCommentApi'
import { getForumCategoriesApi } from '../../services/api/ForumCategoryApi'
import { uploadImageApi } from '../../services/api/UploadApi'
import { getAuth } from '../../utils/Auth'
import { toast } from 'react-toastify'
import { ArrowLeft, Check, CornerDownRight, Edit3, Eye, Flag, Heart, Lock, MessageCircle, Plus, Search, Star, Trash2, X } from 'lucide-react'
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
  const div = document.createElement('div')
  div.innerHTML = html
  const allowedTags = new Set([
    'B', 'I', 'EM', 'STRONG', 'U', 'CODE', 'A', 'BLOCKQUOTE', 'BR', 'DIV', 'SPAN', 'IMG'
  ])
  const isSafeUrl = (value, allowDataImage = false) => {
    const normalized = String(value || '').trim()
    if (/^https?:\/\//i.test(normalized)) return true
    return allowDataImage && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(normalized)
  }

  ;[...div.querySelectorAll('*')].forEach(el => {
    if (!allowedTags.has(el.tagName)) {
      el.replaceWith(...el.childNodes)
      return
    }

    const sourceHref = el.getAttribute('href')
    const sourceSrc = el.getAttribute('src')
    ;[...el.attributes].forEach(attr => el.removeAttribute(attr.name))
    if (el.tagName === 'A') {
      if (isSafeUrl(sourceHref)) {
        el.setAttribute('href', sourceHref)
        el.setAttribute('target', '_blank')
        el.setAttribute('rel', 'noopener noreferrer')
      }
    }
    if (el.tagName === 'IMG') {
      if (!isSafeUrl(sourceSrc, true)) {
        el.remove()
        return
      }
      el.setAttribute('src', sourceSrc)
      el.setAttribute('alt', 'Attached Image')
      el.setAttribute('loading', 'lazy')
    }
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
    if (trimmedLine.startsWith('![') && trimmedLine.includes('](')) {
      const match = trimmedLine.match(/!\[(.*?)\]\((.*?)\)/)
      if (match && match[2]) {
        return (
          <div key={lineIndex} style={{ margin: '12px 0' }}>
            <img
              src={match[2]}
              alt={match[1] || 'Attached Image'}
              style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            />
          </div>
        )
      }
    }
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
  const safeComment = comment || {}
  const author = safeComment.author
    || safeComment.userName
    || safeComment.user?.fullName
    || safeComment.user?.username
    || 'Deleted user'

  return {
    ...safeComment,
    author,
    avatarUrl: safeComment.avatarUrl || safeComment.userAvatar || safeComment.user?.avatarUrl || null,
    timestamp: safeComment.createdAt || safeComment.timestamp || new Date().toISOString(),
    likesCount: safeComment.likesCount || 0
  }
}

const ALLOWED_FORUM_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

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
  const [forumCategories, setForumCategories] = useState([])
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
  const [forumNewPostImage, setForumNewPostImage] = useState(null)
  const [forumNewPostImageFile, setForumNewPostImageFile] = useState(null)
  const forumNewPostFileInputRef = useRef(null)

  // Selected Thread Detail Modal State
  const [selectedThread, setSelectedThread] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [threadComments, setThreadComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [replyingToComment, setReplyingToComment] = useState(null)
  const [highlightedCommentId, setHighlightedCommentId] = useState(null)
  const [forumReplyImage, setForumReplyImage] = useState(null)
  const [forumReplyImageFile, setForumReplyImageFile] = useState(null)
  const forumReplyFileInputRef = useRef(null)

  const handleForumNewPostImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_FORUM_IMAGE_TYPES.has(file.type)) {
      toast.error('Please select a JPG, PNG, GIF, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must not exceed 5MB.')
      return
    }
    setForumNewPostImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setForumNewPostImage(reader.result)
    reader.readAsDataURL(file)
  }

  const handleForumReplyImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED_FORUM_IMAGE_TYPES.has(file.type)) {
      toast.error('Please select a JPG, PNG, GIF, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must not exceed 5MB.')
      return
    }
    setForumReplyImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setForumReplyImage(reader.result)
    reader.readAsDataURL(file)
  }

  // Active Rich Text formatting states for editor (Bold, Italic, Quote, Code, Link)
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    quote: false,
    code: false,
    link: false
  })

  const updateActiveFormats = useCallback(() => {
    try {
      const isBold = document.queryCommandState('bold')
      const isItalic = document.queryCommandState('italic')
      setActiveFormats(prev => ({
        ...prev,
        bold: !!isBold,
        italic: !!isItalic
      }))
    } catch {
      // fallback
    }
  }, [])

  const handleInsertFormat = (formatType) => {
    const editor = replyInputRef.current
    if (!editor) return

    editor.focus()

    if (formatType === 'bold') {
      document.execCommand('bold', false, null)
      setActiveFormats(prev => ({ ...prev, bold: !prev.bold }))
    } else if (formatType === 'italic') {
      document.execCommand('italic', false, null)
      setActiveFormats(prev => ({ ...prev, italic: !prev.italic }))
    } else if (formatType === 'quote') {
      const selection = window.getSelection()
      if (selection && selection.toString()) {
        document.execCommand('formatBlock', false, 'blockquote')
        setActiveFormats(prev => ({ ...prev, quote: true }))
      } else {
        document.execCommand('insertHTML', false, '<blockquote>Quote</blockquote>')
        setActiveFormats(prev => ({ ...prev, quote: !prev.quote }))
      }
    } else if (formatType === 'code') {
      const selection = window.getSelection()
      if (selection && selection.toString()) {
        const range = selection.getRangeAt(0)
        const codeNode = document.createElement('code')
        codeNode.textContent = selection.toString()
        range.deleteContents()
        range.insertNode(codeNode)
        setActiveFormats(prev => ({ ...prev, code: true }))
      } else {
        document.execCommand('insertHTML', false, '<code>code</code>')
        setActiveFormats(prev => ({ ...prev, code: !prev.code }))
      }
    } else if (formatType === 'link') {
      const url = prompt('Enter link URL (e.g. https://example.com):', 'https://')
      if (url && url !== 'https://') {
        document.execCommand('createLink', false, url)
        setActiveFormats(prev => ({ ...prev, link: true }))
      }
    }

    updateActiveFormats()
  }

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
      await incrementForumThreadViewApi(thread.id)
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

  // Categories are shared through the backend; thread values remain as a legacy fallback.
  const categoriesList = [
    { name: 'All' },
    ...Array.from(new Set([
      'General',
      ...forumCategories.map(category => category.name),
      ...allThreadsForCounts.map(t => t.category || 'General'),
    ])).map(name => ({ name }))
  ]

  useEffect(() => {
    let cancelled = false
    const fetchCategories = async () => {
      try {
        const categories = await getForumCategoriesApi()
        if (!cancelled) setForumCategories(categories || [])
      } catch (err) {
        console.error('Failed to load forum categories:', err)
      }
    }
    fetchCategories()
    return () => {
      cancelled = true
    }
  }, [])

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
      toast.error('Failed to load forum thread posts.', {
        toastId: 'forum-thread-list-load-error',
      })
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
    if (!auth?.token) {
      navigate('/auth?mode=signin', { state: { from: location.pathname } })
      return
    }
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

      let finalContent = newPostForm.content.trim()
      if (forumNewPostImageFile) {
        const imageUrl = await uploadImageApi(forumNewPostImageFile)
        finalContent += `\n\n![Attached Image](${imageUrl})`
      }

      await createForumThreadApi({
        title: newPostForm.title.trim(),
        category: newPostForm.category,
        content: finalContent,
        author: authorName
      })
      toast.success('Thread published successfully!')
      setShowNewPostModal(false)
      setForumNewPostImage(null)
      setForumNewPostImageFile(null)
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
          const normalized = (comments || []).map(normalizeForumComment)
          setThreadComments(normalized)
          
          // Populate liked comments from backend
          const userLikedIds = comments
            .filter(c => c.likedByCurrentUser || c.isLikedByCurrentUser)
            .map(c => c.id)
          
          setLikedComments(prev => {
            const others = prev.filter(id => !normalized.some(n => n.id === id))
            return [...others, ...userLikedIds]
          })
        }
      } catch (err) {
        console.error('Failed to load forum comments:', err)
        if (!cancelled) {
          setThreadComments([])
          toast.error('Failed to load discussion comments.')
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
      await reportForumThreadApi(threadToReport.id, reportReason.trim())
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
    if (!auth?.token) {
      navigate('/auth?mode=signin', { state: { from: location.pathname + location.search } })
      return
    }
    const editor = replyInputRef.current
    const htmlContent = editor ? editor.innerHTML : ''
    const textContent = editor ? editor.textContent.trim() : ''
    if (!textContent && !forumReplyImageFile) {
      toast.warn('Please enter your reply or attach an image.')
      return
    }
    try {
      setSubmitting(true)
      const nextRepliesCount = (selectedThread.replies || 0) + 1
      let finalCommentHtml = sanitizeHtml(htmlContent)
      if (forumReplyImageFile) {
        const imageUrl = await uploadImageApi(forumReplyImageFile)
        finalCommentHtml += `<br/><br/><img src="${imageUrl}" alt="Attached Image" />`
      }

      const created = await createForumCommentApi(selectedThread.id, {
        content: finalCommentHtml,
        parentId: replyingToComment?.id || null
      })
      const newReply = normalizeForumComment(created)

      setThreadComments(prev => [...prev, newReply])
      if (editor) editor.innerHTML = ''
      setReplyingToComment(null)
      setForumReplyImage(null)
      setForumReplyImageFile(null)
      if (forumReplyFileInputRef.current) forumReplyFileInputRef.current.value = ''

      setThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, replies: nextRepliesCount } : t))
      setSelectedThread(prev => ({ ...prev, replies: nextRepliesCount }))
      setAllThreadsForCounts(prev => prev.map(t => t.id === selectedThread.id ? { ...t, replies: nextRepliesCount } : t))
      
      toast.success('Reply posted!')
    } catch (err) {
      console.error('Failed to post forum reply:', err)
      toast.error(err.response?.data?.message || 'Failed to post reply.')
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
  const handleToggleCommentLike = async (commentId) => {
    // Check if user is logged in
    const auth = getAuth()
    if (!auth || !auth.user) {
      toast.warn('Please log in to like comments.')
      return
    }

    const isAlreadyLiked = likedComments.includes(commentId)
    const nextLikedComments = isAlreadyLiked 
      ? likedComments.filter(id => id !== commentId)
      : [...likedComments, commentId]
    
    // Optimistic UI update
    setLikedComments(nextLikedComments)

    setThreadComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const count = c.likesCount || 0
        return {
          ...c,
          likesCount: isAlreadyLiked ? Math.max(0, count - 1) : count + 1
        }
      }
      return c
    }))

    // Persist to backend
    if (selectedThread) {
      try {
        await toggleForumCommentLikeApi(selectedThread.id, commentId)
      } catch (err) {
        console.error('Failed to toggle comment like:', err)
        toast.error('Failed to update like status.')
        
        // Revert optimistic update
        setLikedComments(isAlreadyLiked 
          ? [...likedComments, commentId]
          : likedComments.filter(id => id !== commentId)
        )
        
        setThreadComments(prev => prev.map(c => {
          if (c.id === commentId) {
            const count = c.likesCount || 0
            return {
              ...c,
              likesCount: isAlreadyLiked ? count + 1 : Math.max(0, count - 1)
            }
          }
          return c
        }))
      }
    }
  }

  // ─── Edit / Delete comment state and handlers ───
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editCommentContent, setEditCommentContent] = useState('')

  const handleStartEditComment = (comment) => {
    setEditingCommentId(comment.id)
    // Strip HTML tags for plain-text editing
    const div = document.createElement('div')
    div.innerHTML = comment.content || ''
    setEditCommentContent(div.textContent || div.innerText || '')
  }

  const handleCancelEditComment = () => {
    setEditingCommentId(null)
    setEditCommentContent('')
  }

  const handleSaveEditComment = async (commentId) => {
    if (!editCommentContent.trim()) {
      toast.warn('Comment content cannot be empty.')
      return
    }
    if (!selectedThread) return
    try {
      setSubmitting(true)
      const updated = await updateForumCommentApi(selectedThread.id, commentId, { content: editCommentContent.trim() })
      setThreadComments(prev => prev.map(c => c.id === commentId ? { ...normalizeForumComment(updated), likesCount: c.likesCount } : c))
      setEditingCommentId(null)
      setEditCommentContent('')
      toast.success('Comment updated successfully.')
    } catch (err) {
      console.error('Failed to update comment:', err)
      toast.error(err.response?.data?.message || 'Failed to update comment.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!selectedThread) return
    if (!window.confirm('Are you sure you want to delete this comment?')) return
    try {
      setSubmitting(true)
      await deleteForumCommentApi(selectedThread.id, commentId)
      setThreadComments(prev => prev.filter(c => c.id !== commentId))
      // Update thread reply count
      const nextRepliesCount = Math.max(0, (selectedThread.replies || 0) - 1)
      setSelectedThread(prev => prev ? { ...prev, replies: nextRepliesCount } : null)
      setThreads(prev => prev.map(t => t.id === selectedThread.id ? { ...t, replies: nextRepliesCount } : t))
      setAllThreadsForCounts(prev => prev.map(t => t.id === selectedThread.id ? { ...t, replies: nextRepliesCount } : t))
      toast.success('Comment deleted successfully.')
    } catch (err) {
      console.error('Failed to delete comment:', err)
      toast.error(err.response?.data?.message || 'Failed to delete comment.')
    } finally {
      setSubmitting(false)
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
      <div className="home-sections-container forum-page-container">
        <div className="home-section forum-page-section">
          {threadId && selectedThread ? (
            /* ── DETAILED THREAD FULL PAGE VIEW (STV STYLE - PAGE) ── */
            <div className="forum-thread-detail-shell">
              {/* Left Column: Threads list sidebar */}
              <aside className="forum-thread-index">
                <div className="forum-thread-index-heading">
                  <button 
                    type="button"
                    className="forum-back-btn-stv" 
                    onClick={() => navigate('/forum')}
                  >
                    <ArrowLeft size={16} aria-hidden="true" /> Back
                  </button>
                  <h4 className="forum-sidebar-header-stv">
                    Threads
                  </h4>
                </div>
                
                {/* Scrollable list of other threads */}
                <div className="forum-thread-index-list">
                  {allThreadsForCounts.map(otherThread => (
                    <button
                      type="button"
                      key={otherThread.id}
                      onClick={() => navigate(`/forum/thread/${otherThread.id}`)}
                      className={`forum-sidebar-thread-card-stv ${String(otherThread.id) === String(threadId) ? 'active' : ''}`}
                      aria-current={String(otherThread.id) === String(threadId) ? 'page' : undefined}
                    >
                      <ForumAvatar
                        avatarUrl={otherThread.avatarUrl || (otherThread.author === currentUser?.fullName || otherThread.author === currentUser?.username ? currentUser?.avatarUrl : null)}
                        name={otherThread.author || 'User'}
                        className="forum-card-avatar-stv"
                        style={{ background: getCategoryColor(otherThread.category), width: '28px', height: '28px', fontSize: '12px' }}
                      />
                      <div className="forum-sidebar-thread-copy">
                        <div className="forum-sidebar-thread-title-stv">
                          {otherThread.title}
                        </div>
                        <div className="forum-sidebar-thread-meta">
                          <span>{otherThread.category || 'General'}</span>
                          <span><MessageCircle size={12} aria-hidden="true" /> {otherThread.replies}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>
              <div className="forum-thread-main">
                {/* Colored Banner Header */}
                <div className="forum-detail-banner-stv">
                  <span className="forum-detail-banner-tag">{selectedThread.category || 'General'}</span>
                  <h3 className="forum-detail-banner-title">{selectedThread.title}</h3>
                  <div className="forum-detail-banner-meta">
                    <span>Started by <strong>{selectedThread.author}</strong></span>
                    <span>{selectedThread.timeAgo || 'recently'}</span>
                    <span><MessageCircle size={14} aria-hidden="true" /> {threadComments.length} replies</span>
                  </div>
                </div>
                
                {/* 2-Columns Body Layout */}
                <div className="forum-detail-columns-stv">
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
                        <span className="forum-inline-metric"><Eye size={15} aria-hidden="true" /> {selectedThread.views} views</span>
                        <button 
                          className={`forum-card-action-btn ${likedThreads.includes(selectedThread.id) ? 'liked-active' : ''}`}
                          onClick={() => handleToggleThreadLike(selectedThread)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Heart size={15} aria-hidden="true" /> {selectedThread.likes || 0} likes
                        </button>
                      </div>
                    </div>

                    {/* Comments / Discussion List */}
                    <div className="forum-comments-section forum-thread-comments">
                      <h4 className="forum-comments-title">
                        <MessageCircle size={24} aria-hidden="true" /> Comments <span>({threadComments.length})</span>
                      </h4>

                      <div className="forum-comments-list forum-thread-comments-list">
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
                              
                              
                              {/* Comment body or edit form */}
                              {editingCommentId === comment.id ? (
                                <div className="forum-comment-edit-box">
                                  <textarea
                                    className="forum-comment-edit-textarea"
                                    value={editCommentContent}
                                    onChange={(e) => setEditCommentContent(e.target.value)}
                                    rows={3}
                                    placeholder="Edit your comment..."
                                    autoFocus
                                  />
                                  <div className="forum-comment-edit-actions">
                                    <button
                                      type="button"
                                      className="forum-comment-btn forum-comment-btn-cancel"
                                      onClick={handleCancelEditComment}
                                      disabled={submitting}
                                    >
                                      <X size={14} aria-hidden="true" />
                                      <span>Cancel</span>
                                    </button>
                                    <button
                                      type="button"
                                      className="forum-comment-btn forum-comment-btn-save"
                                      onClick={() => handleSaveEditComment(comment.id)}
                                      disabled={submitting}
                                    >
                                      <Check size={14} aria-hidden="true" />
                                      <span>{submitting ? 'Saving...' : 'Save'}</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="forum-comment-body">
                                  {isHtmlContent(comment.content)
                                    ? <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment.content) }} />
                                    : renderFormattedContent(comment.content)
                                  }
                                </div>
                              )}
                              
                              <div className="forum-comment-actions">
                                <button 
                                  className={`forum-card-action-btn ${isCommentLiked ? 'liked-active' : ''}`}
                                  onClick={() => handleToggleCommentLike(comment.id)}
                                  title={isCommentLiked ? 'Unlike comment' : 'Like comment'}
                                >
                                  <Heart size={14} fill={isCommentLiked ? 'currentColor' : 'none'} aria-hidden="true" />
                                  <span>{comment.likesCount || 0}</span>
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
                                    <CornerDownRight size={13} aria-hidden="true" />
                                    <span>Reply</span>
                                  </button>
                                )}
                                {/* Edit & Delete buttons — for comment owner or moderator/admin */}
                                {(() => {
                                  const isOwner = currentUser && (
                                    (comment.userId && currentUser.id && String(comment.userId) === String(currentUser.id)) ||
                                    (comment.author && (comment.author === currentUser.fullName || comment.author === currentUser.username || comment.author === currentUser.email))
                                  )
                                  const canDelete = isOwner || isModerator
                                  return (
                                    <>
                                      {isOwner && editingCommentId !== comment.id && (
                                        <button
                                          className="forum-card-action-btn forum-card-action-btn--edit"
                                          onClick={() => handleStartEditComment(comment)}
                                        >
                                          <Edit3 size={13} aria-hidden="true" />
                                          <span>Edit</span>
                                        </button>
                                      )}
                                      {canDelete && (
                                        <button
                                          className="forum-card-action-btn forum-card-action-btn--delete"
                                          onClick={() => handleDeleteComment(comment.id)}
                                        >
                                          <Trash2 size={13} aria-hidden="true" />
                                          <span>Delete</span>
                                        </button>
                                      )}
                                    </>
                                  )
                                })()}
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
                      ) : !auth?.token ? (
                        <div className="forum-locked-message-stv">
                          <button
                            type="button"
                            className="mod-btn approve"
                            onClick={() => navigate('/auth?mode=signin', { state: { from: location.pathname + location.search } })}
                          >
                            Sign in to reply
                          </button>
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
                              onKeyUp={updateActiveFormats}
                              onMouseUp={updateActiveFormats}
                              onSelect={updateActiveFormats}
                              style={{ minHeight: '80px', outline: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                            />
                            {/* Reply Attached Image Preview */}
                            {forumReplyImage && (
                              <div style={{ position: 'relative', margin: '10px 12px 4px', display: 'inline-block' }}>
                                <img
                                  src={forumReplyImage}
                                  alt="Reply Attachment Preview"
                                  style={{ maxHeight: '120px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.3)' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setForumReplyImage(null)
                                    setForumReplyImageFile(null)
                                    if (forumReplyFileInputRef.current) forumReplyFileInputRef.current.value = ''
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    background: 'rgba(0, 0, 0, 0.75)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            )}

                            <input
                              type="file"
                              ref={forumReplyFileInputRef}
                              accept="image/png,image/jpeg,image/gif,image/webp"
                              style={{ display: 'none' }}
                              onChange={handleForumReplyImageSelect}
                            />
                            
                            {/* Formatting Toolbar */}
                            <div className="forum-editor-toolbar-stv">
                              <button
                                type="button"
                                className="forum-toolbar-btn-stv"
                                title="Attach Image"
                                onClick={() => forumReplyFileInputRef.current?.click()}
                              >
                                📷
                              </button>
                              <button 
                                className="mod-btn approve" 
                                onClick={handlePostReply}
                                disabled={submitting}
                                style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: '12px', height: '28px', minHeight: '28px', opacity: submitting ? 0.7 : 1 }}
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
                        type="button"
                        className="forum-panel-btn primary"
                        disabled={selectedThread.isLocked}
                        onClick={() => {
                          if (!auth?.token) {
                            navigate('/auth?mode=signin', { state: { from: location.pathname + location.search } })
                            return
                          }
                          if (replyInputRef.current) {
                            replyInputRef.current.focus();
                            replyInputRef.current.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        style={{ opacity: selectedThread.isLocked ? 0.5 : 1, cursor: selectedThread.isLocked ? 'not-allowed' : 'pointer' }}
                      >
                        {selectedThread.isLocked
                          ? <><Lock size={16} aria-hidden="true" /> Locked</>
                          : !auth?.token
                            ? <><MessageCircle size={16} aria-hidden="true" /> Sign in to reply</>
                            : <><MessageCircle size={16} aria-hidden="true" /> Reply</>}
                      </button>
                      
                      {/* Follow dropdown setting */}
                      <div className="forum-follow-control" onClick={(e) => e.stopPropagation()}>
                        <button 
                          type="button"
                          className="forum-panel-btn follow" 
                          onClick={() => setShowDetailFollowDropdown(!showDetailFollowDropdown)}
                        >
                          <Star size={16} aria-hidden="true" /> {followedThreads.includes(selectedThread.id) ? 'Following' : 'Not Tracking'}
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
                            type="button"
                            className="forum-panel-btn report" 
                            onClick={() => handleTriggerReport(selectedThread)}
                          >
                            <Flag size={16} aria-hidden="true" /> Report Thread
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
                            className="forum-action-btn danger"
                            onClick={() => handleDeleteThreadDirect(selectedThread)}
                            style={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(239, 68, 68, 0.1)', 
                              color: '#f87171', 
                              border: '1px solid rgba(239, 68, 68, 0.2)' 
                            }}
                          >
                            <Trash2 size={14} /> Delete Thread
                          </button>
                        </div>
                      )}

                      {/* Discussion Status & Activity */}
                      <div className="forum-progress-tracker">
                        <div className="forum-progress-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>Discussion Activity</span>
                          <span style={{ 
                            fontSize: '11px', 
                            padding: '3px 9px', 
                            borderRadius: '12px', 
                            background: threadComments.length >= 10 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(168, 85, 247, 0.15)', 
                            color: threadComments.length >= 10 ? '#f87171' : '#c084fc', 
                            fontWeight: '700' 
                          }}>
                            {threadComments.length >= 10 ? '🔥 Hot Topic' : threadComments.length >= 5 ? '💬 Active' : '🌱 New'}
                          </span>
                        </div>
                        <div className="forum-progress-label-stv" style={{ marginTop: '8px', fontSize: '13px' }}>
                          <span>Total Posts: <strong>{threadComments.length + 1}</strong></span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>No Limit</span>
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
              <div className="section-header forum-page-heading">
                <div className="section-title-group">
                  <h2 className="section-title">Forum Discussions</h2>
                  <span className="section-subtitle">
                    Share ideas and connect with the ComiVerse community
                  </span>
                </div>
                <span className="forum-total-posts">{totalElements} posts</span>
              </div>

              <div className="forum-list-layout">
                {/* ── LEFT SIDEBAR (STV STYLE) ───────── */}
                <aside className="forum-list-sidebar">
                  <button 
                    type="button"
                    className="forum-btn-create-stv" 
                    onClick={() => {
                      if (!auth?.token) {
                        navigate('/auth?mode=signin', { state: { from: location.pathname } })
                        return
                      }
                      setShowNewPostModal(true)
                    }}
                  >
                    <Plus size={18} aria-hidden="true" /> Create Discussion
                  </button>

                  <div className="forum-category-list">
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
                <main className="forum-list-main">
                  {/* Sorter tabs & Search input row */}
                  <div className="forum-search-row">
                    {/* Tabs */}
                    <div className="forum-sort-tabs" role="tablist" aria-label="Sort discussions">
                      {['All', 'Hot', 'New', 'Announcements'].map(tab => (
                        <button
                          type="button"
                          key={tab}
                          onClick={() => setActiveSortTab(tab)}
                          className={`forum-sort-tab ${activeSortTab === tab ? 'active' : ''}`}
                          role="tab"
                          aria-selected={activeSortTab === tab}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Search posts inside thread list */}
                    <div className="forum-search-input-wrapper forum-list-search">
                      <input 
                        type="text" 
                        placeholder="Search posts..." 
                        className="forum-search-field"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search forum posts"
                      />
                      <Search className="forum-search-icon" size={15} aria-hidden="true" />
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
                                          <Trash2 size={14} style={{ marginRight: '6px' }} /> Delete Thread
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

              {/* Image Attachment Picker & Preview */}
              <input
                type="file"
                ref={forumNewPostFileInputRef}
                accept="image/png,image/jpeg,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handleForumNewPostImageSelect}
              />

              {forumNewPostImage && (
                <div style={{ position: 'relative', marginTop: '10px', display: 'inline-block' }}>
                  <img
                    src={forumNewPostImage}
                    alt="Forum Attachment Preview"
                    style={{ maxHeight: '140px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.3)' }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setForumNewPostImage(null)
                      setForumNewPostImageFile(null)
                      if (forumNewPostFileInputRef.current) forumNewPostFileInputRef.current.value = ''
                    }}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'rgba(0, 0, 0, 0.75)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  className="mod-btn"
                  onClick={() => forumNewPostFileInputRef.current?.click()}
                  style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '6px 12px', fontSize: '12px' }}
                >
                  📷 Attach Image
                </button>
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
