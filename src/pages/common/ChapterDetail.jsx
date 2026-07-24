import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getComicByIdApi } from '../../services/api/ComicApi'
import { getChaptersByComicIdApi, getChapterDetailApi, getChapterTranslationsApi } from '../../services/api/ChapterApi'
import { toast } from 'react-toastify'
import useReaderSecurity from '../../hooks/useReaderSecurity'
import ComicPageCanvas from '../../components/common/ComicPageCanvas'
import '../../assets/style/reader/chapter-detail.css'
import '../../assets/style/reader/comments.css'
import ModernPagination from '../../components/common/ModernPagination'
import { isValidUuid } from '../../utils/uuid'
import { getAuth } from '../../utils/Auth'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import { getChapterCommentsApi, createChapterCommentApi } from '../../services/api/CommentApi'

// pagesBubbles is a JSON string: [{ pageNumber, imageUrl, bubbles }, ...]
// where `bubbles` is itself a JSON string ({"selections":[...]}) — same
// shape ReviewController.buildPagesBubblesJson produces. Returns a
// { [pageNumber]: selections[] } lookup for quick per-page access.
function parseTranslationBubblesByPage(pagesBubblesJson) {
  if (!pagesBubblesJson) return {}
  try {
    const pages = JSON.parse(pagesBubblesJson)
    if (!Array.isArray(pages)) return {}
    const map = {}
    pages.forEach((p) => {
      let selections = []
      try {
        const parsed = JSON.parse(p.bubbles || '{}')
        selections = Array.isArray(parsed) ? parsed : parsed?.selections || []
      } catch {
        selections = []
      }
      map[p.pageNumber] = selections
    })
    return map
  } catch {
    return {}
  }
}

function ChapterDetail() {
  const { comicId, chapterId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // States
  const [comic, setComic] = useState(null)
  const [currentChapter, setCurrentChapter] = useState(null)
  const [chaptersList, setChaptersList] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMockData, setIsMockData] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)
  const [translations, setTranslations] = useState([])
  const [selectedLanguage, setSelectedLanguage] = useState(searchParams.get('lang') || '')

  // User & Comments state variables
  const [user, setUser] = useState(null)
  const [comments, setComments] = useState([])
  const [commentInput, setCommentInput] = useState('')
  const [commentsMeta, setCommentsMeta] = useState(null)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [totalComments, setTotalComments] = useState(0)

  const [repliesMap, setRepliesMap] = useState({})
  const [repliesLoadingMap, setRepliesLoadingMap] = useState({})
  const [repliesPageMap, setRepliesPageMap] = useState({})
  const [repliesMetaMap, setRepliesMetaMap] = useState({})
  const [expandedRepliesMap, setExpandedRepliesMap] = useState({})
  const [replyInput, setReplyInput] = useState('')
  const [replyingToId, setReplyingToId] = useState(null)
  const [replyMetadata, setReplyMetadata] = useState(null)

  const dropdownRef = useRef(null)

  // Enforce client-side copy-protection security
  useReaderSecurity({
    onDevToolsOpen: () => {
      setIsDevToolsOpen(true)

      setCurrentChapter(null)
      setComic(null)
      setChaptersList([])

      toast.error('Security alert: Inspect element or developer tool opened. Reading session is suspended.', {
        position: 'top-right',
        autoClose: 5000,
        theme: 'dark'
      })
    },
    disableDetector: true
  })

  // Scroll to top on chapter change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [chapterId])

  // Get current user on mount
  useEffect(() => {
    const auth = getAuth()
    if (auth && auth.user) {
      setUser(auth.user)
    }
  }, [])

  // Fetch comments asynchronously
  const fetchComments = async (page = 1, append = false) => {
    if (!chapterId) return
    try {
      setCommentsLoading(true)
      const res = await getChapterCommentsApi(chapterId, '', page, 10)
      const list = res?.data || []
      const meta = res?.metadata || null

      if (append) {
        setComments(prev => [...prev, ...list])
      } else {
        setComments(list)
      }
      setCommentsMeta(meta)
      setTotalComments(meta?.totalElements || 0)
    } catch (err) {
      console.error('Failed to load chapter comments:', err.message)
    } finally {
      setCommentsLoading(false)
    }
  }

  // Fetch replies for a specific top-level comment ID asynchronously (size 10)
  const fetchReplies = async (parentId, page = 1) => {
    if (!chapterId || !parentId) return
    try {
      setRepliesLoadingMap(prev => ({ ...prev, [parentId]: true }))
      const res = await getChapterCommentsApi(chapterId, parentId, page, 10)
      const replyList = res?.data || []
      const meta = res?.metadata || null

      setRepliesMap(prev => ({ ...prev, [parentId]: replyList }))
      setRepliesPageMap(prev => ({ ...prev, [parentId]: page }))
      setRepliesMetaMap(prev => ({ ...prev, [parentId]: meta }))
    } catch (err) {
      console.error(`Failed to fetch replies for ${parentId}:`, err)
    } finally {
      setRepliesLoadingMap(prev => ({ ...prev, [parentId]: false }))
    }
  }

  // Load comments when chapter changes
  useEffect(() => {
    if (chapterId) {
      setCommentsPage(1)
      setComments([])
      setRepliesMap({})
      setRepliesPageMap({})
      setRepliesMetaMap({})
      setExpandedRepliesMap({})
      fetchComments(1, false)
    }
  }, [chapterId])

  const handleToggleReplies = (commentId) => {
    const isExpanded = !!expandedRepliesMap[commentId]
    setExpandedRepliesMap(prev => ({ ...prev, [commentId]: !isExpanded }))
    if (!isExpanded && (!repliesMap[commentId] || repliesMap[commentId].length === 0)) {
      fetchReplies(commentId, 1)
    }
  }

  const handlePostComment = async (e) => {
    e.preventDefault()
    if (!commentInput.trim()) return
    if (!user) {
      navigate('/auth?mode=signin')
      return
    }

    try {
      setCommentSubmitting(true)
      const payload = {
        chapterId: chapterId,
        content: commentInput.trim(),
        parentId: '',
        mentionId: ''
      }
      await createChapterCommentApi(payload)
      setCommentInput('')
      setCommentsPage(1)
      fetchComments(1, false)
      toast.success('Comment posted!')
    } catch (err) {
      console.error('Failed to post comment:', err)
      toast.error('Failed to post comment')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handlePostReply = async (e, parentId) => {
    e.preventDefault()
    if (!replyInput.trim()) return
    if (!user) {
      navigate('/auth?mode=signin')
      return
    }

    try {
      setCommentSubmitting(true)
      const payload = {
        chapterId: chapterId,
        content: replyInput.trim(),
        parentId: parentId,
        mentionId: replyMetadata?.mentionId || ''
      }
      await createChapterCommentApi(payload)
      setReplyInput('')
      setReplyingToId(null)
      setReplyMetadata(null)
      setExpandedRepliesMap(prev => ({ ...prev, [parentId]: true }))
      fetchReplies(parentId, 1)
      toast.success('Reply posted!')
    } catch (err) {
      console.error('Failed to post reply:', err)
      toast.error('Failed to post reply')
    } finally {
      setCommentSubmitting(false)
    }
  }

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch API details or fall back to mock
  useEffect(() => {
    const fetchChapterAndComicInfo = async () => {
      try {
        setLoading(true)

        if (!isValidUuid(comicId) || !isValidUuid(chapterId)) {
          throw new Error('Using local preview data for a demo route')
        }

        // Fetch current chapter detail, comic detail, all chapters of the
        // comic, and available translations, in parallel
        const [chapterRes, chaptersListRes, comicRes, translationsRes] = await Promise.all([
          getChapterDetailApi(chapterId),
          getChaptersByComicIdApi(comicId),
          getComicByIdApi(comicId),
          getChapterTranslationsApi(chapterId).catch(() => ({ data: [] }))
        ])

        const chapterData = chapterRes?.data || chapterRes
        const listData = chaptersListRes?.data || chaptersListRes || []
        const comicData = comicRes?.data || comicRes
        const translationsData = translationsRes?.data || translationsRes || []

        if (!chapterData) {
          throw new Error('Chapter details not found')
        }

        setCurrentChapter(chapterData)
        setChaptersList(listData)
        setComic(comicData)
        setTranslations(Array.isArray(translationsData) ? translationsData : [])
        setIsMockData(false)
      } catch (err) {
        console.error('API failed for chapter detail:', err.message)
        setIsMockData(false)
        setCurrentChapter(null)
        setChaptersList([])
        setComic(null)
        setTranslations([])
      } finally {
        setLoading(false)
      }
    }

    if (comicId && chapterId) {
      fetchChapterAndComicInfo()
    }
  }, [comicId, chapterId])

  // Sorting helper for chapters list: Sort numerically ascending based on chapterNumber
  const sortedChapters = [...chaptersList].sort((a, b) => {
    return Number(a.chapterNumber || 0) - Number(b.chapterNumber || 0)
  })

  // Find index of current chapter
  const currentChapterIndex = sortedChapters.findIndex(
    ch => String(ch.id) === String(chapterId)
  )

  const hasPrevChapter = currentChapterIndex > 0
  const hasNextChapter = currentChapterIndex < sortedChapters.length - 1

  const buildChapterUrl = (targetChapterId) => {
    const langQuery = selectedLanguage ? `?lang=${encodeURIComponent(selectedLanguage)}` : ''
    return `/comic/${comicId}/chapter/${targetChapterId}${langQuery}`
  }

  const handleGoToPrevChapter = () => {
    if (hasPrevChapter) {
      const prevChap = sortedChapters[currentChapterIndex - 1]
      navigate(buildChapterUrl(prevChap.id))
    }
  }

  const handleGoToNextChapter = () => {
    if (hasNextChapter) {
      const nextChap = sortedChapters[currentChapterIndex + 1]
      navigate(buildChapterUrl(nextChap.id))
    }
  }

  const handleSelectChapter = (e) => {
    const targetId = e.target.value
    if (targetId) {
      navigate(buildChapterUrl(targetId))
    }
  }

  if (isDevToolsOpen) {
    return (
      <HomeLayout>
        <div className="chapter-reader-container" style={{ justifyContent: 'center' }}>
          <div className="reader-loading-container" style={{ padding: '80px 24px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <span style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</span>
            <h2 style={{ color: '#ef4444', fontWeight: '700', marginBottom: '8px' }}>Security Violation</h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', maxWidth: '400px', textAlign: 'center', lineHeight: '1.6' }}>
              Developer tools are active. For copyrighted content protection, viewing is disabled while DevTools is open.
            </p>
            <button
              className="btn-reader-action"
              style={{ marginTop: '24px' }}
              onClick={() => window.location.reload()}
            >
              Retry Reading
            </button>
          </div>
        </div>
      </HomeLayout>
    )
  }

  if (loading) {
    return (
      <HomeLayout>
        <div className="chapter-reader-container">
          <div className="reader-loading-container">
            <div className="reader-spinner"></div>
            <p>Loading chapter pages...</p>
          </div>
        </div>
      </HomeLayout>
    )
  }

  if (!currentChapter) {
    return (
      <HomeLayout>
        <div className="chapter-reader-container">
          <div className="reader-loading-container">
            <h3>Chapter not found</h3>
            <p>We couldn't load the requested chapter details.</p>
            <Link to={`/comic/${comicId}`} className="btn-reader-secondary-action" style={{ textDecoration: 'none', marginTop: '16px' }}>
              Back to Comic Detail
            </Link>
          </div>
        </div>
      </HomeLayout>
    )
  }

  const pages = currentChapter.images || []

  // Only show languages that actually have data for THIS chapter — the
  // comic-level picker (ComicDetail) may list languages that some
  // individual chapters don't have a translation for yet.
  const availableLanguagesForChapter = translations.map((t) => t.languageCode)
  const activeTranslation = translations.find((t) => t.languageCode === selectedLanguage)
  const selectedBubblesByPageNumber = activeTranslation
    ? parseTranslationBubblesByPage(activeTranslation.pagesBubbles)
    : {}
  console.log("[DEBUG translations]", {
    selectedLanguage,
    translations,
    availableLanguagesForChapter,
    activeTranslation,
    selectedBubblesByPageNumber,
  })
  const currentChapterNumberStr = currentChapter.chapterNumber || '?'
  const currentChapterTitleStr = currentChapter.title || `Chapter ${currentChapterNumberStr}`
  const comicTitleStr = comic?.title || 'Comic Series'

  return (
    <HomeLayout>
      <div className="chapter-reader-container">
        {/* Mock Data Banner Notice */}
        {isMockData && (
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
            color: 'white',
            padding: '8px 24px',
            fontSize: '12px',
            fontWeight: '600',
            width: '100%',
            textAlign: 'center',
            letterSpacing: '0.5px'
          }}>
            🔌 Server offline. Operating in simulation mode with mock chapter content.
          </div>
        )}

        {/* Sticky Control Header */}
        <div className="reader-control-header">
          <div className="reader-header-inner">
            <div className="reader-header-left">
              <Link to={`/comic/${comicId}`} className="btn-reader-back">
                ← Back to Detail
              </Link>
              <div className="reader-comic-title-info">
                <h2 className="reader-comic-meta-title" title={comicTitleStr}>
                  {comicTitleStr}
                </h2>
                <span className="reader-chapter-meta-subtitle">
                  {currentChapterTitleStr}
                </span>
              </div>
            </div>

            <div className="reader-nav-controls">
              <button
                className="btn-reader-nav"
                onClick={handleGoToPrevChapter}
                disabled={!hasPrevChapter}
                title="Previous Chapter"
              >
                ◀ Prev
              </button>

              <div className="reader-chapter-dropdown-container" ref={dropdownRef}>
                <div
                  className={`reader-chapter-dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span>
                    Ch. {currentChapterNumberStr} {currentChapter.title ? ` - ${currentChapter.title}` : ''}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="dropdown-chevron"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                {isDropdownOpen && (
                  <div className="reader-chapter-dropdown-menu">
                    {sortedChapters.map((ch) => {
                      const isSelected = String(ch.id) === String(chapterId)
                      return (
                        <div
                          key={ch.id}
                          className={`reader-chapter-dropdown-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            navigate(buildChapterUrl(ch.id))
                            setIsDropdownOpen(false)
                          }}
                        >
                          <span>
                            Ch. {ch.chapterNumber} {ch.title ? ` - ${ch.title}` : ''}
                          </span>
                          {isSelected && (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="item-check-icon">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <button
                className="btn-reader-nav"
                onClick={handleGoToNextChapter}
                disabled={!hasNextChapter}
                title="Next Chapter"
              >
                Next ▶
              </button>

              {availableLanguagesForChapter.length > 0 && (
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  title="Reading language"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: 'white',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ color: '#111', background: '#fff' }}>Original</option>
                  {availableLanguagesForChapter.map((lang) => (
                    <option key={lang} value={lang} style={{ color: '#111', background: '#fff' }}>
                      {lang}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Comic Pages Viewport */}
        <div className="chapter-pages-viewport" id="secure-comic-reader">
          {pages.length === 0 ? (
            <div style={{ padding: '80px 20px', color: '#64748b', textAlign: 'center' }}>
              <p style={{ fontSize: '36px', margin: '0 0 16px' }}>📖</p>
              <p>This chapter contains no images yet.</p>
            </div>
          ) : (
            pages.map((imgUrl, index) => (
              <ComicPageCanvas
                key={index}
                src={imgUrl}
                pageIndex={index}
                isEncrypted={false} // Toggle to true if backend is encryption-enabled
                fallbackSrc="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80"
                bubbles={selectedBubblesByPageNumber[index + 1]}
              />
            ))
          )}
        </div>

        {/* Bottom Nav Controls */}
        <div className="reader-bottom-nav">
          <button
            className="btn-reader-secondary-action"
            onClick={handleGoToPrevChapter}
            disabled={!hasPrevChapter}
          >
            ◀ Previous Chapter
          </button>

          <button
            className="btn-reader-secondary-action"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            ▲ Back to Top
          </button>

          {hasNextChapter ? (
            <button
              className="btn-reader-action"
              onClick={handleGoToNextChapter}
            >
              Next Chapter ▶
            </button>
          ) : (
            <Link
              to={`/comic/${comicId}`}
              className="btn-reader-action"
              style={{ textDecoration: 'none' }}
            >
              Back to Details
            </Link>
          )}
        </div>

        {/* Comments Section */}
        <div className="chapter-comments-section-wrapper" style={{
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto 80px',
          padding: '24px',
          background: 'var(--chapter-surface)',
          border: '1px solid var(--chapter-border-subtle)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px var(--chapter-shadow)',
          boxSizing: 'border-box'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '700',
            color: 'var(--chapter-heading)',
            marginBottom: '20px',
            borderBottom: '1px solid var(--chapter-border-subtle)',
            paddingBottom: '10px'
          }}>
            💬 Comments ({totalComments})
          </h3>

          <div className="comments-section-container">
            {/* Comment Form */}
            <form onSubmit={handlePostComment} className="comment-form">
              <textarea
                rows="3"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={user ? "Share your thoughts about this chapter..." : "Please log in to share your thoughts..."}
                disabled={!user || commentSubmitting}
                className="comment-textarea"
              />
              <div className="comment-form-actions">
                {user ? (
                  <button 
                    type="submit" 
                    className="btn-home-primary" 
                    style={{ padding: '8px 20px', fontSize: '13px' }}
                    disabled={commentSubmitting}
                  >
                    {commentSubmitting ? 'Posting...' : 'Post Comment'}
                  </button>
                ) : (
                  <Link to="/auth?mode=signin" className="btn-home-primary" style={{ padding: '8px 20px', fontSize: '13px', textDecoration: 'none' }}>
                    Sign In to Comment
                  </Link>
                )}
              </div>
            </form>

            {/* Comments List */}
            <div className="comments-list">
              {comments.length === 0 && !commentsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontStyle: 'italic' }}>
                  No comments yet. Be the first to share your thoughts!
                </div>
              ) : (
                comments.map((comment) => {
                  const commentReplies = repliesMap[comment.id] || []
                  const hasReplies = commentReplies.length > 0
                  const isExpanded = !!expandedRepliesMap[comment.id]
                  const isRepliesLoading = repliesLoadingMap[comment.id]

                  return (
                    <div key={comment.id} className="comment-card-wrapper">
                      {/* Main Comment */}
                      <div className="comment-card">
                        <div className="comment-avatar-container">
                          {comment.userAvatar ? (
                            <img src={comment.userAvatar} alt={comment.userName} className="comment-avatar-img" />
                          ) : (
                            (comment.userName || 'U')[0].toUpperCase()
                          )}
                        </div>
                        
                        <div className="comment-content-area">
                          <div className="comment-header">
                            <span className="comment-user-name" title={comment.userName}>
                              {comment.userName}
                            </span>
                            <span className="comment-date">
                              {formatTimeAgo(comment.createdAt)}
                            </span>
                          </div>
                          <p className="comment-text">
                            {comment.content}
                          </p>
                          
                          <div className="comment-actions-bar">
                            {user && (
                              <button
                                className={`comment-action-btn ${replyingToId === comment.id ? 'active' : ''}`}
                                onClick={() => {
                                  if (replyingToId === comment.id) {
                                    setReplyingToId(null)
                                    setReplyMetadata(null)
                                  } else {
                                    setReplyingToId(comment.id)
                                    setReplyMetadata({
                                      parentId: comment.id,
                                      mentionId: comment.userId,
                                      mentionName: comment.userName
                                    })
                                    setReplyInput('')
                                  }
                                }}
                              >
                                Reply
                              </button>
                            )}
                            <button
                              className={`comment-action-btn ${isExpanded ? 'active' : ''}`}
                              onClick={() => handleToggleReplies(comment.id)}
                            >
                              💬 {isExpanded ? 'Hide Replies' : 'Replies'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Reply Input Form under this top-level comment */}
                      {replyingToId === comment.id && (
                        <div className="nested-reply-form-wrapper">
                          <form onSubmit={(e) => handlePostReply(e, comment.id)} className="comment-form">
                            <textarea
                              rows="2"
                              value={replyInput}
                              onChange={(e) => setReplyInput(e.target.value)}
                              placeholder={`Replying to @${replyMetadata?.mentionName}...`}
                              disabled={commentSubmitting}
                              className="comment-textarea"
                              autoFocus
                            />
                            <div className="comment-form-actions">
                              <button
                                type="button"
                                className="btn-hero-outline"
                                style={{ padding: '6px 14px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                                onClick={() => {
                                  setReplyingToId(null)
                                  setReplyMetadata(null)
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="btn-home-primary"
                                style={{ padding: '6px 16px', fontSize: '12px' }}
                                disabled={commentSubmitting}
                              >
                                {commentSubmitting ? 'Replying...' : 'Reply'}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Replies Area */}
                      {isExpanded && isRepliesLoading && (
                        <div className="comment-replies-container">
                          <div className="comment-shimmer-card" style={{ padding: '12px', border: 'none' }}>
                            <div className="shimmer-circle" style={{ width: '30px', height: '30px' }}></div>
                            <div style={{ flexGrow: 1 }}>
                              <div className="shimmer-line header" style={{ width: '100px', height: '10px' }}></div>
                              <div className="shimmer-line content" style={{ height: '20px' }}></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isExpanded && hasReplies && (
                        <div className="comment-replies-container">
                          {commentReplies.map((reply) => (
                            <div key={reply.id} className="comment-card" style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.01)' }}>
                              <div className="comment-avatar-container" style={{ width: '32px', height: '32px', fontSize: '13px' }}>
                                {reply.userAvatar ? (
                                  <img src={reply.userAvatar} alt={reply.userName} className="comment-avatar-img" />
                                ) : (
                                  (reply.userName || 'U')[0].toUpperCase()
                                )}
                              </div>
                              
                              <div className="comment-content-area">
                                <div className="comment-header">
                                  <span className="comment-user-name" style={{ fontSize: '13px' }} title={reply.userName}>
                                    {reply.userName}
                                  </span>
                                  <span className="comment-date">
                                    {formatTimeAgo(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="comment-text" style={{ fontSize: '13.5px' }}>
                                  {reply.mentionName && (
                                    <span className="comment-mention-tag">@{reply.mentionName}</span>
                                  )}
                                  {reply.content}
                                </p>
                                
                                <div className="comment-actions-bar">
                                  {user && (
                                    <button
                                      className="comment-action-btn"
                                      onClick={() => {
                                        setReplyingToId(comment.id)
                                        setReplyMetadata({
                                          parentId: comment.id,
                                          mentionId: reply.userId,
                                          mentionName: reply.userName
                                        })
                                        setReplyInput('')
                                      }}
                                    >
                                      Reply
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Nested Replies Pagination */}
                          {repliesMetaMap[comment.id] && repliesMetaMap[comment.id].totalPages > 1 && (
                            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                              <ModernPagination
                                currentPage={repliesPageMap[comment.id] || 1}
                                totalPages={repliesMetaMap[comment.id].totalPages}
                                onPageChange={(page) => {
                                  fetchReplies(comment.id, page)
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}

              {/* Shimmer loading for top-level comments load/pagination */}
              {commentsLoading && (
                <div className="comment-shimmer-container">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="comment-shimmer-card">
                      <div className="shimmer-circle"></div>
                      <div style={{ flexGrow: 1 }}>
                        <div className="shimmer-line header"></div>
                        <div className="shimmer-line content"></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Top-Level Pagination Controls */}
              {commentsMeta && commentsMeta.totalPages > 1 && !commentsLoading && (
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
                  <ModernPagination
                    currentPage={commentsPage}
                    totalPages={commentsMeta.totalPages}
                    onPageChange={(page) => {
                      setCommentsPage(page)
                      fetchComments(page, false)
                    }}
                  />
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </HomeLayout>
  )
}

export default ChapterDetail