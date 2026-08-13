import { useState, useEffect, useRef } from 'react'
import TeamGroupChat from '../../components/chat/TeamGroupChat'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import { toast } from 'react-toastify'
import { getAuth } from '../../utils/Auth'

function HomeTab({
  selectedDetails,
  isCurrentLeader,
  newPostText,
  setNewPostText,
  onPostAnnouncement,
  announcements = [],
  onLikePost,
  onTogglePinPost,
  onDeletePost,
  onEditPost,
  onAddComment,
  onLikeComment,
  onEditComment,
  onDeleteComment,
}) {
  const [visibleCount, setVisibleCount] = useState(5)
  const [attachedImage, setAttachedImage] = useState(null)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [openComments, setOpenComments] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const fileInputRef = useRef(null)

  useEffect(() => {
    setVisibleCount(5)
  }, [selectedDetails?.id])

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.')
      return
    }

    setSelectedImageFile(file)

    const reader = new FileReader()
    reader.onload = () => {
      setAttachedImage(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setAttachedImage(null)
    setSelectedImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFormPostSubmit = () => {
    if (!newPostText.trim() && !selectedImageFile) return
    onPostAnnouncement(newPostText, selectedImageFile)
    setAttachedImage(null)
    setSelectedImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleComments = (postId) => {
    setOpenComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }))
  }

  const [replyingCommentTarget, setReplyingCommentTarget] = useState({})
  const [editingComment, setEditingComment] = useState(null) // { postId, commentId, text }
  const [editingPostId, setEditingPostId] = useState(null)
  const [editingPostText, setEditingPostText] = useState('')

  const auth = getAuth()
  const currentFullName = auth?.user?.fullName || auth?.user?.name || ''
  const currentUsername = auth?.user?.username || ''
  const currentUserInitials = currentFullName
    ? currentFullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : (currentUsername ? currentUsername.substring(0, 2).toUpperCase() : 'LE')

  const isOwnComment = (cmt) => {
    if (!cmt || !cmt.author) return false
    const authorLower = cmt.author.toLowerCase().trim()
    const nameLower = currentFullName.toLowerCase().trim()
    const userLower = currentUsername.toLowerCase().trim()
    return (nameLower && authorLower === nameLower) || (userLower && authorLower === userLower)
  }

  const isPostAuthor = (post) => {
    if (!post || !post.author) return false
    const authorLower = post.author.toLowerCase().trim()
    const nameLower = currentFullName.toLowerCase().trim()
    const userLower = currentUsername.toLowerCase().trim()
    return (nameLower && authorLower === nameLower) || (userLower && authorLower === userLower)
  }

  const canEditPost = (post) => isPostAuthor(post) || isCurrentLeader
  const canDeletePost = (post) => isPostAuthor(post) || isCurrentLeader

  const handleSetReplyTarget = (postId, cmt) => {
    setReplyingCommentTarget((prev) => ({ ...prev, [postId]: cmt }))
    setCommentInputs((prev) => ({
      ...prev,
      [postId]: `@${cmt.author} `,
    }))
  }

  const handleCancelReplyTarget = (postId) => {
    setReplyingCommentTarget((prev) => ({ ...prev, [postId]: null }))
  }

  const handleCommentSubmit = (postId, postAuthor) => {
    const text = commentInputs[postId] || ''
    if (!text.trim()) return

    const targetCmt = replyingCommentTarget[postId]
    if (onAddComment) {
      onAddComment(postId, text.trim(), targetCmt)
    }

    setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
    setReplyingCommentTarget((prev) => ({ ...prev, [postId]: null }))
  }

  const handleSaveEditComment = () => {
    if (!editingComment || !editingComment.text.trim()) {
      toast.error('Comment cannot be empty.')
      return
    }
    if (onEditComment) {
      onEditComment(editingComment.postId, editingComment.commentId, editingComment.text.trim())
    }
    setEditingComment(null)
  }

  const handleSaveEditPost = (postId) => {
    if (!editingPostText.trim()) {
      toast.error('Post content cannot be empty.')
      return
    }
    if (onEditPost) {
      onEditPost(postId, editingPostText.trim())
    }
    setEditingPostId(null)
  }

  // Helper for human-readable relative date formatting
  const getPostDisplayTime = (post) => {
    const raw = post.createdAt || post.time || post.timestamp
    if (!raw) return 'Just now'
    if (raw === 'Just now') return 'Just now'
    const formatted = formatTimeAgo(raw)
    return formatted || (typeof raw === 'string' ? raw : 'Just now')
  }

  // Sort: 1. Pinned posts always on top, 2. Highest timestamp descending, 3. Original prepended array order
  const sortedAnnouncements = announcements
    .map((post, originalIndex) => ({ post, originalIndex }))
    .sort((a, b) => {
      if (a.post.isPinned && !b.post.isPinned) return -1
      if (!a.post.isPinned && b.post.isPinned) return 1

      const getMs = (p) => {
        if (typeof p.timestamp === 'number' && p.timestamp > 0) return p.timestamp
        const raw = p.createdAt || p.time
        if (!raw || raw === 'Just now') return 0
        const d = new Date(raw)
        return isNaN(d.getTime()) ? 0 : d.getTime()
      }

      const tsA = getMs(a.post)
      const tsB = getMs(b.post)

      if (tsA !== tsB && tsA > 0 && tsB > 0) {
        return tsB - tsA
      }

      return a.originalIndex - b.originalIndex
    })
    .map(item => item.post)

  // Paginated slice (5 posts per page)
  const displayedAnnouncements = sortedAnnouncements.slice(0, visibleCount)
  const hasMorePosts = visibleCount < sortedAnnouncements.length

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + 5)
  }

  return (
    <div className="workspace-home-grid">
      {/* Left Feed Column */}
      <div className="workspace-feed-column">
        {isCurrentLeader && (
          <div className="post-creation-card">
            <div className="post-user-avatar leader-glow">
              {currentUserInitials}
            </div>
            <div className="post-creation-input-wrapper">
            <textarea
              className="post-textarea"
              placeholder="Post an announcement, update, or share notes with your translation team..."
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
            />

            {attachedImage && (
              <div className="post-creation-image-preview" style={{ position: 'relative', marginTop: '10px', display: 'inline-block' }}>
                <img
                  src={attachedImage}
                  alt="Attachment Preview"
                  style={{ maxHeight: '180px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.35)', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(0, 0, 0, 0.75)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px'
                  }}
                  title="Remove Image"
                >
                  ✕
                </button>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />

            <div className="post-creation-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="post-attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach Image"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>Attach Image</span>
                </button>
              </div>

              <button
                className="post-publish-btn"
                onClick={handleFormPostSubmit}
                disabled={!newPostText.trim() && !attachedImage}
              >
                Publish Announcement
              </button>
            </div>
          </div>
        </div>
        )}

        <div className="announcement-feed-list">
          {sortedAnnouncements.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: 'var(--trans-text-muted)', textAlign: 'center', padding: '20px' }}>No announcements yet.</p>
          ) : (
            displayedAnnouncements.map(post => {
              const commentsList = post.comments || []
              const isCommentsOpen = openComments[post.id]

              return (
                <div className={`feed-post-card ${post.isPinned ? 'pinned' : ''}`} key={post.id}>
                  {post.isPinned && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', marginBottom: '10px' }}>
                      📌 PINNED ANNOUNCEMENT
                    </div>
                  )}
                  <div className="post-header">
                    <div className="post-user-avatar" style={{ background: post.role === 'Group Leader' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '' }}>
                      {post.avatar || 'U'}
                    </div>
                    <div className="post-header-info">
                      <div className="post-author-row">
                        <span className="post-author-name">{post.author}</span>
                        <span className={`post-role-badge ${post.role === 'Group Leader' ? 'leader' : ''}`}>{post.role || 'Member'}</span>
                      </div>
                      <span className="post-time">{getPostDisplayTime(post)}</span>
                    </div>
                  </div>
                  <div className="post-body">
                    {editingPostId === post.id ? (
                      <div className="post-edit-box" style={{ marginTop: '8px' }}>
                        <textarea
                          className="trans-form-input textarea"
                          style={{
                            minHeight: '75px',
                            fontSize: '13px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            width: '100%',
                            resize: 'vertical',
                            marginBottom: '8px'
                          }}
                          value={editingPostText}
                          onChange={(e) => setEditingPostText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault()
                              handleSaveEditPost(post.id)
                            } else if (e.key === 'Escape') {
                              setEditingPostId(null)
                            }
                          }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="trans-btn secondary"
                            style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                            onClick={() => setEditingPostId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="trans-btn primary"
                            style={{ padding: '4px 14px', fontSize: '11.5px', borderRadius: '6px' }}
                            onClick={() => handleSaveEditPost(post.id)}
                            disabled={!editingPostText.trim()}
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          {post.content}
                          {(post.isEdited || post.edited) && (
                            <span style={{ fontSize: '10.5px', color: 'var(--trans-text-muted)', marginLeft: '6px', fontStyle: 'italic' }}>
                              (edited)
                            </span>
                          )}
                        </p>
                        {post.attachedImage && (
                          <div style={{ marginTop: '12px' }}>
                            <img
                              src={post.attachedImage}
                              alt="Post Attachment"
                              style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '10px', border: '1px solid var(--trans-border)' }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="post-footer-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
                    <button className="post-action-btn" onClick={() => onLikePost(post.id)}>
                      👍 {post.likes || 0} likes
                    </button>
                    <button className="post-action-btn" onClick={() => toggleComments(post.id)}>
                      💬 Comments ({commentsList.length})
                    </button>
                    {isCurrentLeader && (
                      <button className={`post-action-btn pin-btn ${post.isPinned ? 'active' : ''}`} onClick={() => onTogglePinPost(post.id)}>
                        📌 {post.isPinned ? 'Unpin Post' : 'Pin Post'}
                      </button>
                    )}
                    {canEditPost(post) && (
                      <button
                        className="post-action-btn edit-btn"
                        onClick={() => {
                          setEditingPostId(post.id)
                          setEditingPostText(post.content || '')
                        }}
                        title="Edit this post"
                      >
                        ✏️ Edit Post
                      </button>
                    )}
                    {canDeletePost(post) && (
                      <button
                        className="post-action-btn delete-btn"
                        style={{ color: '#ef4444' }}
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this post?")) {
                            onDeletePost && onDeletePost(post.id);
                          }
                        }}
                        title="Delete this post"
                      >
                        🗑️ Delete Post
                      </button>
                    )}
                  </div>

                  {/* Expandable Comments & Reply Section */}
                  {isCommentsOpen && (
                    <div className="post-comments-section" style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed var(--trans-border)' }}>
                      <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                        {commentsList.length === 0 ? (
                          <p style={{ fontSize: '12px', color: 'var(--trans-text-muted)', fontStyle: 'italic', margin: 0 }}>
                            No replies yet. Be the first to comment!
                          </p>
                        ) : (
                          commentsList.map((cmt, cIdx) => {
                            const isEditing = editingComment?.commentId === cmt.id
                            const isOwn = isOwnComment(cmt)
                            const canDelete = isOwn || isCurrentLeader

                            return (
                              <div key={cmt.id || `cmt-${cIdx}`} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <div className="post-user-avatar" style={{ width: '28px', height: '28px', fontSize: '10px', flexShrink: 0 }}>
                                  {cmt.avatar || 'M'}
                                </div>
                                <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--trans-border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--trans-text-primary)' }}>{cmt.author}</span>
                                      {isOwn && (
                                        <span style={{ fontSize: '9px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: '10px', color: 'var(--trans-text-muted)' }}>{formatTimeAgo(cmt.createdAt || cmt.timestamp || cmt.time)}</span>
                                  </div>

                                  {isEditing ? (
                                    <div className="comment-edit-box" style={{ marginTop: '6px' }}>
                                      <textarea
                                        className="trans-form-input textarea"
                                        style={{
                                          minHeight: '56px',
                                          fontSize: '12.5px',
                                          padding: '6px 10px',
                                          borderRadius: '6px',
                                          width: '100%',
                                          resize: 'vertical',
                                          marginBottom: '6px'
                                        }}
                                        value={editingComment.text}
                                        onChange={(e) => setEditingComment({ ...editingComment, text: e.target.value })}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSaveEditComment()
                                          } else if (e.key === 'Escape') {
                                            setEditingComment(null)
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                        <button
                                          type="button"
                                          className="trans-btn secondary"
                                          style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '4px' }}
                                          onClick={() => setEditingComment(null)}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          className="trans-btn primary"
                                          style={{ padding: '3px 10px', fontSize: '11px', borderRadius: '4px' }}
                                          onClick={handleSaveEditComment}
                                          disabled={!editingComment.text.trim()}
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <p style={{ fontSize: '12.5px', color: 'var(--trans-text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                                        {cmt.text || cmt.content}
                                        {(cmt.isEdited || cmt.edited) && (
                                          <span style={{ fontSize: '10px', color: 'var(--trans-text-muted)', marginLeft: '6px', fontStyle: 'italic' }}>
                                            (edited)
                                          </span>
                                        )}
                                      </p>
                                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                        <button
                                          type="button"
                                          className="post-action-btn"
                                          style={{ fontSize: '11px', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                          onClick={() => onLikeComment && onLikeComment(post.id, cmt.id)}
                                        >
                                          👍 {cmt.likes || 0}
                                        </button>
                                        <button
                                          type="button"
                                          className="post-action-btn"
                                          style={{ fontSize: '11px', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                          onClick={() => handleSetReplyTarget(post.id, cmt)}
                                        >
                                          ↪ Reply
                                        </button>
                                        {isOwn && (
                                          <button
                                            type="button"
                                            className="post-action-btn"
                                            style={{ fontSize: '11px', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--trans-text-muted)' }}
                                            onClick={() => setEditingComment({ postId: post.id, commentId: cmt.id, text: cmt.text || cmt.content || '' })}
                                            title="Edit your comment"
                                          >
                                            ✏️ Edit
                                          </button>
                                        )}
                                        {canDelete && (
                                          <button
                                            type="button"
                                            className="post-action-btn delete-btn"
                                            style={{ fontSize: '11px', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#ef4444' }}
                                            onClick={() => {
                                              if (window.confirm('Are you sure you want to delete this comment?')) {
                                                onDeleteComment && onDeleteComment(post.id, cmt.id)
                                              }
                                            }}
                                            title="Delete comment"
                                          >
                                            🗑️ Delete
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>

                      {/* Replying Target Indicator */}
                      {replyingCommentTarget[post.id] && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '4px 10px', borderRadius: '6px', marginBottom: '8px', fontSize: '11.5px', color: '#c084fc' }}>
                          <span>Replying to <strong>@{replyingCommentTarget[post.id].author}</strong></span>
                          <button
                            type="button"
                            onClick={() => handleCancelReplyTarget(post.id)}
                            style={{ background: 'none', border: 'none', color: '#c084fc', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Reply Input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleCommentSubmit(post.id, post.author)
                        }}
                        style={{ display: 'flex', gap: '8px' }}
                      >
                        <input
                          type="text"
                          className="trans-form-input"
                          placeholder={replyingCommentTarget[post.id] ? `Replying to @${replyingCommentTarget[post.id].author}...` : 'Write a reply...'}
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          style={{ flex: 1, borderRadius: '20px', padding: '6px 14px', fontSize: '12.5px' }}
                        />
                        <button
                          type="submit"
                          className="trans-btn primary"
                          style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '20px' }}
                          disabled={!(commentInputs[post.id] || '').trim()}
                        >
                          Reply
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )
            })
          )}

          {hasMorePosts && (
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <button className="trans-btn secondary" onClick={handleLoadMore}>
                Load More Posts ({sortedAnnouncements.length - visibleCount} remaining) ➔
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Chat Sidebar — Real-time WebSocket Group Chat */}
      <TeamGroupChat
        groupId={selectedDetails?.id}
        teamName={selectedDetails?.title || selectedDetails?.team}
        isLeader={isCurrentLeader}
      />
    </div>
  )
}

export default HomeTab