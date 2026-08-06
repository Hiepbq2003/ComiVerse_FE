import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import { toast } from 'react-toastify'
import ModernPagination from './ModernPagination'
import ConfirmModal from './ConfirmModal'
import { Trash2 } from 'lucide-react'
import {
  getComicCommentsApi,
  createComicCommentApi,
  getComicCommentByIdApi,
  deleteComicCommentApi,
  getChapterCommentsApi,
  createChapterCommentApi,
  getChapterCommentByIdApi,
  deleteChapterCommentApi,
  updateComicCommentApi,
  updateChapterCommentApi
} from '../../services/api/CommentApi'
import '../../assets/style/reader/comments.css'

// Global high-performance in-memory cache for instantaneous comment rendering (< 5ms)
const commentsCache = new Map()
const commentsMetaCache = new Map()

export const clearCommentCache = (targetType, targetId) => {
  for (const key of commentsCache.keys()) {
    if (key.startsWith(`${targetType}_${targetId}`)) {
      commentsCache.delete(key)
      commentsMetaCache.delete(key)
    }
  }
}

function CommentSection({ targetType, targetId, user, targetCommentIdFromUrl }) {
  const navigate = useNavigate()

  // Top-level comments state
  const [comments, setComments] = useState([])
  const [commentInput, setCommentInput] = useState('')
  const [commentsMeta, setCommentsMeta] = useState(null)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsPage, setCommentsPage] = useState(1)
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [totalComments, setTotalComments] = useState(0)

  // Popup Confirm Modal state for comment deletion
  const [deleteCommentModal, setDeleteCommentModal] = useState({
    isOpen: false,
    commentId: null,
    parentId: null
  })

  // Replies state
  const [repliesMap, setRepliesMap] = useState({})
  const [repliesLoadingMap, setRepliesLoadingMap] = useState({})
  const [repliesPageMap, setRepliesPageMap] = useState({})
  const [repliesMetaMap, setRepliesMetaMap] = useState({})
  const [expandedRepliesMap, setExpandedRepliesMap] = useState({})
  const [replyInput, setReplyInput] = useState('')
  const [replyingToId, setReplyingToId] = useState(null)
  const [replyMetadata, setReplyMetadata] = useState(null)

  // Highlight state for deep-linked comments
  const [highlightedCommentId, setHighlightedCommentId] = useState(null)

  // Edit state
  const [editingId, setEditingId] = useState(null)
  const [editInput, setEditInput] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Dynamic API wrappers based on targetType ('comic' | 'chapter')
  const getCommentsApi = useCallback((id, parentId, page, size) => {
    return targetType === 'comic'
      ? getComicCommentsApi(id, parentId, page, size)
      : getChapterCommentsApi(id, parentId, page, size)
  }, [targetType])

  const createCommentApi = useCallback((payload) => {
    return targetType === 'comic'
      ? createComicCommentApi(payload)
      : createChapterCommentApi(payload)
  }, [targetType])

  const getCommentByIdApi = useCallback((commentId) => {
    return targetType === 'comic'
      ? getComicCommentByIdApi(commentId)
      : getChapterCommentByIdApi(commentId)
  }, [targetType])

  const deleteCommentApi = useCallback((commentId) => {
    return targetType === 'comic'
      ? deleteComicCommentApi(commentId)
      : deleteChapterCommentApi(commentId)
  }, [targetType])

  const updateCommentApi = useCallback((commentId, payload) => {
    return targetType === 'comic'
      ? updateComicCommentApi(commentId, payload)
      : updateChapterCommentApi(commentId, payload)
  }, [targetType])

  // Open popup confirm modal for comment deletion
  const handleDeleteComment = (commentId, parentId = null) => {
    setDeleteCommentModal({
      isOpen: true,
      commentId,
      parentId
    })
  }

  // Execute actual comment deletion after user confirms in popup modal
  const handleConfirmDeleteComment = async () => {
    const { commentId, parentId } = deleteCommentModal
    setDeleteCommentModal(prev => ({ ...prev, isOpen: false }))

    try {
      await deleteCommentApi(commentId)

      if (parentId) {
        setRepliesMap(prev => ({
          ...prev,
          [parentId]: (prev[parentId] || []).filter(r => r.id !== commentId)
        }))
      } else {
        setComments(prev => prev.filter(c => c.id !== commentId))
        setTotalComments(prev => Math.max(0, prev - 1))
      }

      toast.success('Comment deleted successfully!')
    } catch (err) {
      console.error('Failed to delete comment:', err)
      toast.error('Failed to delete comment. Please try again!')
    }
  }

  const handleEditSubmit = async (e, commentId, parentId = null) => {
    e.preventDefault()
    if (!editInput.trim()) return

    try {
      setEditSubmitting(true)
      const res = await updateCommentApi(commentId, { content: editInput.trim() })
      const updatedComment = res?.data || res
      
      if (parentId) {
        setRepliesMap(prev => {
          const arr = prev[parentId] || []
          return { ...prev, [parentId]: arr.map(c => c.id === commentId ? { ...c, content: updatedComment.content } : c) }
        })
      } else {
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: updatedComment.content } : c))
      }
      
      setEditingId(null)
      setEditInput('')
      toast.success('Comment updated!')
    } catch (err) {
      console.error('Failed to update comment:', err)
      toast.error('Failed to update comment.')
    } finally {
      setEditSubmitting(false)
    }
  }

  // Fetch top-level comments with Stale-While-Revalidate Memory Cache
  const fetchComments = useCallback(async (page = 1, append = false) => {
    if (!targetId) return
    const cacheKey = `${targetType}_${targetId}_root_p${page}`

    // 1. Instant Cache Hit (0ms delay)
    if (commentsCache.has(cacheKey) && !append) {
      const cachedList = commentsCache.get(cacheKey)
      const cachedMeta = commentsMetaCache.get(cacheKey)
      setComments(cachedList)
      setCommentsMeta(cachedMeta)
      setTotalComments(cachedMeta?.totalElements || cachedList.length)
      setCommentsLoading(false)
    } else if (!append) {
      setCommentsLoading(true)
    }

    try {
      const res = await getCommentsApi(targetId, '', page, 10)
      const list = res?.data || []
      const meta = res?.metadata || null

      commentsCache.set(cacheKey, list)
      commentsMetaCache.set(cacheKey, meta)

      if (append) {
        setComments(prev => [...prev, ...list])
      } else {
        setComments(list)
      }
      setCommentsMeta(meta)
      setTotalComments(meta?.totalElements || list.length)
    } catch (err) {
      console.error(`Failed to load ${targetType} comments:`, err?.message || err)
    } finally {
      setCommentsLoading(false)
    }
  }, [targetId, targetType, getCommentsApi])

  // Fetch replies for a specific parent comment ID
  const fetchReplies = useCallback(async (parentId, page = 1) => {
    if (!targetId || !parentId) return
    try {
      setRepliesLoadingMap(prev => ({ ...prev, [parentId]: true }))
      const res = await getCommentsApi(targetId, parentId, page, 10)
      const replyList = res?.data || []
      const meta = res?.metadata || null

      setRepliesMap(prev => {
        const existing = prev[parentId] || []
        const combined = [...replyList]
        existing.forEach(item => {
          if (!combined.some(r => r.id === item.id)) {
            combined.push(item)
          }
        })
        return { ...prev, [parentId]: combined }
      })
      setRepliesPageMap(prev => ({ ...prev, [parentId]: page }))
      setRepliesMetaMap(prev => ({ ...prev, [parentId]: meta }))
    } catch (err) {
      console.error(`Failed to fetch replies for ${parentId}:`, err)
    } finally {
      setRepliesLoadingMap(prev => ({ ...prev, [parentId]: false }))
    }
  }, [targetId, getCommentsApi])

  // Reload comments when targetId changes
  useEffect(() => {
    if (targetId) {
      setCommentsPage(1)
      setComments([])
      setRepliesMap({})
      setRepliesPageMap({})
      setRepliesMetaMap({})
      setExpandedRepliesMap({})
      fetchComments(1, false)
    }
  }, [targetId, fetchComments])

  // Handle direct navigation from notification (comment query param)
  useEffect(() => {
    if (!targetId || !targetCommentIdFromUrl) return

    const loadTargetCommentChain = async () => {
      try {
        const res = await getCommentByIdApi(targetCommentIdFromUrl)
        const chain = res?.data || res || []
        if (Array.isArray(chain) && chain.length > 0) {
          const rootComment = chain[0]
          const childComment = chain.length > 1 ? chain[1] : null
          const targetIdToScroll = childComment ? childComment.id : rootComment.id

          setComments(prev => {
            if (prev.some(c => c.id === rootComment.id)) {
              return prev.map(c => c.id === rootComment.id ? { ...c, ...rootComment } : c)
            }
            return [rootComment, ...prev]
          })

          if (childComment) {
            setExpandedRepliesMap(prev => ({ ...prev, [rootComment.id]: true }))
            setRepliesMap(prev => {
              const existing = prev[rootComment.id] || []
              if (existing.some(r => r.id === childComment.id)) {
                return { ...prev, [rootComment.id]: existing.map(r => r.id === childComment.id ? { ...r, ...childComment } : r) }
              }
              return { ...prev, [rootComment.id]: [childComment, ...existing] }
            })
            // Fetch remaining replies for this root comment from API as well
            fetchReplies(rootComment.id, 1)
          }

          setHighlightedCommentId(targetIdToScroll)

          setTimeout(() => {
            const el = document.getElementById(`comment-${targetIdToScroll}`)
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 350)
        }
      } catch (err) {
        console.error('Failed to load target comment chain:', err)
        const status = err.response?.status || err.status
        if (status === 404) {
          toast.warning('This comment or the original comment thread has been deleted.', {
            toastId: 'comment-deleted-404'
          })
        }
      }
    }

    loadTargetCommentChain()
  }, [targetId, targetCommentIdFromUrl, getCommentByIdApi, fetchReplies])

  const handleToggleReplies = (commentId) => {
    const isExpanded = !!expandedRepliesMap[commentId]
    const newExpanded = !isExpanded
    setExpandedRepliesMap(prev => ({ ...prev, [commentId]: newExpanded }))
    if (newExpanded && (!repliesMap[commentId] || repliesMap[commentId].length === 0 || !repliesMetaMap[commentId])) {
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

    const text = commentInput.trim()
    setCommentInput('')

    // Instant Optimistic Comment (< 1ms UI update)
    const tempId = `temp_${Date.now()}`
    const optimisticComment = {
      id: tempId,
      content: text,
      userId: user.id || user.userId,
      userName: user.fullName || user.username || user.name || 'You',
      userAvatar: user.avatarUrl || user.avatar || user.profilePicture || '',
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      replyCount: 0
    }

    setComments(prev => [optimisticComment, ...prev])
    setTotalComments(prev => prev + 1)
    clearCommentCache(targetType, targetId)

    try {
      setCommentSubmitting(true)
      const payload = {
        ...(targetType === 'comic' ? { comicId: targetId } : { chapterId: targetId }),
        content: text,
        parentId: '',
        mentionId: ''
      }
      const res = await createCommentApi(payload)
      const realComment = res?.data || res
      if (realComment && realComment.id) {
        setComments(prev => prev.map(c => c.id === tempId ? { ...realComment, isOptimistic: false } : c))
      } else {
        fetchComments(1, false)
      }
      toast.success('Comment posted!')
    } catch (err) {
      console.error('Failed to post comment:', err)
      // Revert optimistic comment on error
      setComments(prev => prev.filter(c => c.id !== tempId))
      setTotalComments(prev => Math.max(0, prev - 1))
      setCommentInput(text)
      toast.error(err.response?.data?.message || 'Failed to post comment')
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

    const text = replyInput.trim()
    const targetParentId = replyMetadata?.parentId || parentId
    const mentionId = replyMetadata?.mentionId || ''
    const mentionName = replyMetadata?.mentionName || ''

    setReplyInput('')
    setReplyingToId(null)
    setReplyMetadata(null)
    setExpandedRepliesMap(prev => ({ ...prev, [parentId]: true }))

    // Instant Optimistic Reply (< 1ms UI update)
    const tempId = `temp_reply_${Date.now()}`
    const optimisticReply = {
      id: tempId,
      content: mentionName ? `@${mentionName} ${text}` : text,
      userId: user.id || user.userId,
      userName: user.fullName || user.username || user.name || 'You',
      userAvatar: user.avatarUrl || user.avatar || user.profilePicture || '',
      createdAt: new Date().toISOString(),
      parentId: targetParentId,
      isOptimistic: true
    }

    setRepliesMap(prev => ({
      ...prev,
      [parentId]: [...(prev[parentId] || []), optimisticReply]
    }))

    try {
      setCommentSubmitting(true)
      const payload = {
        ...(targetType === 'comic' ? { comicId: targetId } : { chapterId: targetId }),
        content: text,
        parentId: targetParentId,
        mentionId: mentionId
      }
      const res = await createCommentApi(payload)
      const realReply = res?.data || res
      if (realReply && realReply.id) {
        setRepliesMap(prev => ({
          ...prev,
          [parentId]: (prev[parentId] || []).map(r => r.id === tempId ? { ...realReply, isOptimistic: false } : r)
        }))
      } else {
        fetchReplies(parentId, 1)
      }
      toast.success('Reply posted!')
    } catch (err) {
      console.error('Failed to post reply:', err)
      setRepliesMap(prev => ({
        ...prev,
        [parentId]: (prev[parentId] || []).filter(r => r.id !== tempId)
      }))
      toast.error(err.response?.data?.message || 'Failed to post reply')
    } finally {
      setCommentSubmitting(false)
    }
  }

  return (
    <div className="comments-section-container">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: 'white', fontWeight: '700' }}>
          Comments <span style={{ fontSize: '14px', color: '#a855f7', fontWeight: '500', marginLeft: '6px' }}>({totalComments})</span>
        </h3>
      </div>

      {/* Main Comment Input Form */}
      <form onSubmit={handlePostComment} className="comment-form">
        <textarea
          rows="3"
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          placeholder={user ? "Share your thoughts about this..." : "Please log in to join the discussion..."}
          disabled={!user || commentSubmitting}
          className="comment-textarea"
        />
        <div className="comment-form-actions">
          {user ? (
            <button
              type="submit"
              className="btn-home-primary"
              style={{ padding: '8px 20px', fontSize: '13px' }}
              disabled={commentSubmitting || !commentInput.trim()}
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
        {commentsLoading && comments.length === 0 ? (
          <div className="comments-skeleton-feed">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="comment-skeleton-card">
                <div className="comment-skeleton-avatar shimmer" />
                <div className="comment-skeleton-body">
                  <div className="comment-skeleton-line short shimmer" />
                  <div className="comment-skeleton-line long shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
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
                <div
                  id={`comment-${comment.id}`}
                  className={`comment-card ${highlightedCommentId === comment.id ? 'comment-highlight-flash' : ''}`}
                >
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
                    {editingId === comment.id ? (
                      <div className="nested-reply-form-wrapper" style={{ marginTop: '10px' }}>
                        <form onSubmit={(e) => handleEditSubmit(e, comment.id)} className="comment-form">
                          <textarea
                            rows="2"
                            value={editInput}
                            onChange={(e) => setEditInput(e.target.value)}
                            disabled={editSubmitting}
                            className="comment-textarea"
                            autoFocus
                          />
                          <div className="comment-form-actions">
                            <button
                              type="button"
                              className="btn-hero-outline"
                              style={{ padding: '6px 14px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                              onClick={() => {
                                setEditingId(null)
                                setEditInput('')
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="btn-home-primary"
                              style={{ padding: '6px 16px', fontSize: '12px' }}
                              disabled={editSubmitting || !editInput.trim()}
                            >
                              {editSubmitting ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <>
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
                                  setReplyInput('')
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
                          
                          {user && (user.id === comment.userId || user.userId === comment.userId || user.username === comment.userName) && (
                            <button
                              className="comment-action-btn"
                              onClick={() => {
                                setEditingId(comment.id)
                                setEditInput(comment.content)
                                setReplyingToId(null)
                              }}
                            >
                              Edit
                            </button>
                          )}

                          {user && (
                            (user.id === comment.userId || user.userId === comment.userId || user.username === comment.userName || ['ADMIN', 'STAFF', 'MODERATOR'].includes((user.role || '').toUpperCase()))
                          ) && (
                            <button
                              className="comment-action-btn"
                              style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleDeleteComment(comment.id)}
                              title="Delete this comment"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Reply Input Form directly under top-level comment */}
                {replyingToId === comment.id && (
                  <div className="nested-reply-form-wrapper" style={{ marginTop: '10px' }}>
                    <form onSubmit={(e) => handlePostReply(e, comment.id)} className="comment-form">
                      {/* Un-editable Mention Badge Header */}
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '8px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'rgba(168, 85, 247, 0.12)',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                        fontSize: '12px'
                      }}>
                        <span style={{ color: '#94a3b8', fontWeight: '500' }}>Replying to</span>
                        <span style={{ color: '#c084fc', fontWeight: '700' }}>
                          @{replyMetadata?.mentionName}
                        </span>
                      </div>

                      <textarea
                        rows="2"
                        value={replyInput}
                        onChange={(e) => setReplyInput(e.target.value)}
                        placeholder={`Write your reply to @${replyMetadata?.mentionName}...`}
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
                            setReplyInput('')
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-home-primary"
                          style={{ padding: '6px 16px', fontSize: '12px' }}
                          disabled={commentSubmitting || !replyInput.trim()}
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
                      <div key={reply.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div
                          id={`comment-${reply.id}`}
                          className={`comment-card ${highlightedCommentId === reply.id ? 'comment-highlight-flash' : ''}`}
                          style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.01)' }}
                        >
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
                            {editingId === reply.id ? (
                              <div className="nested-reply-form-wrapper" style={{ marginTop: '10px' }}>
                                <form onSubmit={(e) => handleEditSubmit(e, reply.id, comment.id)} className="comment-form">
                                  <textarea
                                    rows="2"
                                    value={editInput}
                                    onChange={(e) => setEditInput(e.target.value)}
                                    disabled={editSubmitting}
                                    className="comment-textarea"
                                    autoFocus
                                  />
                                  <div className="comment-form-actions">
                                    <button
                                      type="button"
                                      className="btn-hero-outline"
                                      style={{ padding: '6px 14px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                                      onClick={() => {
                                        setEditingId(null)
                                        setEditInput('')
                                      }}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="btn-home-primary"
                                      style={{ padding: '6px 16px', fontSize: '12px' }}
                                      disabled={editSubmitting || !editInput.trim()}
                                    >
                                      {editSubmitting ? 'Saving...' : 'Save'}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            ) : (
                              <>
                                <p className="comment-text" style={{ fontSize: '13.5px' }}>
                                  {reply.mentionName && (
                                    <span className="comment-mention-tag">@{reply.mentionName}</span>
                                  )}
                                  {reply.content}
                                </p>
                                
                                <div className="comment-actions-bar">
                                  {user && (
                                    <button
                                      className={`comment-action-btn ${replyingToId === reply.id ? 'active' : ''}`}
                                      onClick={() => {
                                        if (replyingToId === reply.id) {
                                          setReplyingToId(null)
                                          setReplyMetadata(null)
                                          setReplyInput('')
                                        } else {
                                          setReplyingToId(reply.id)
                                          setReplyMetadata({
                                            parentId: comment.id,
                                            mentionId: reply.userId,
                                            mentionName: reply.userName
                                          })
                                          setReplyInput('')
                                        }
                                      }}
                                    >
                                      Reply
                                    </button>
                                  )}
                                  {user && (user.id === reply.userId || user.userId === reply.userId || user.username === reply.userName) && (
                                    <button
                                      className="comment-action-btn"
                                      onClick={() => {
                                        setEditingId(reply.id)
                                        setEditInput(reply.content)
                                        setReplyingToId(null)
                                      }}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {user && (
                                    (user.id === reply.userId || user.userId === reply.userId || user.username === reply.userName || ['ADMIN', 'STAFF', 'MODERATOR'].includes((user.role || '').toUpperCase()))
                                  ) && (
                                    <button
                                      className="comment-action-btn"
                                      style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      onClick={() => handleDeleteComment(reply.id, comment.id)}
                                      title="Delete this comment"
                                    >
                                      <Trash2 size={13} /> Delete
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Reply Input Form directly under this specific nested reply comment */}
                        {replyingToId === reply.id && (
                          <div className="nested-reply-form-wrapper" style={{ marginTop: '4px', marginBottom: '8px' }}>
                            <form onSubmit={(e) => handlePostReply(e, comment.id)} className="comment-form">
                              {/* Un-editable Mention Badge Header */}
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '8px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: 'rgba(168, 85, 247, 0.12)',
                                border: '1px solid rgba(168, 85, 247, 0.25)',
                                fontSize: '12px'
                              }}>
                                <span style={{ color: '#94a3b8', fontWeight: '500' }}>Replying to</span>
                                <span style={{ color: '#c084fc', fontWeight: '700' }}>
                                  @{replyMetadata?.mentionName}
                                </span>
                              </div>

                              <textarea
                                rows="2"
                                value={replyInput}
                                onChange={(e) => setReplyInput(e.target.value)}
                                placeholder={`Write your reply to @${replyMetadata?.mentionName}...`}
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
                                    setReplyInput('')
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="btn-home-primary"
                                  style={{ padding: '6px 16px', fontSize: '12px' }}
                                  disabled={commentSubmitting || !replyInput.trim()}
                                >
                                  {commentSubmitting ? 'Replying...' : 'Reply'}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
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

      {/* Unified Popup Confirmation Modal for Comment Deletion */}
      <ConfirmModal
        isOpen={deleteCommentModal.isOpen}
        title="Confirm Comment Deletion"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete Comment"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDeleteComment}
        onCancel={() => setDeleteCommentModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}

export default CommentSection
