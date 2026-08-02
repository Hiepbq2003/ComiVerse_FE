import { useState, useEffect, useRef } from 'react'
import TeamGroupChat from '../../components/chat/TeamGroupChat'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import { toast } from 'react-toastify'

function HomeTab({
  selectedDetails,
  isCurrentLeader,
  showUploadForm,
  setShowUploadForm,
  uploadData,
  setUploadData,
  onUploadChapter,
  newPostText,
  setNewPostText,
  onPostAnnouncement,
  announcements = [],
  onLikePost,
  onTogglePinPost,
  onDeletePost,
  onAddComment,
  onLikeComment,
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

  const handleFormatText = (prefix, suffix) => {
    setNewPostText((prev) => `${prev}${prefix}text${suffix}`)
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
        <div style={{ marginBottom: '20px' }}>
          {!showUploadForm ? (
            <button className="trans-btn primary" onClick={() => setShowUploadForm(true)}>
              + Upload New Translated Chapter
            </button>
          ) : (
            <div style={{ border: '1px solid var(--trans-border)', padding: '16px', borderRadius: '12px', background: '#ffffff', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px', color: 'var(--trans-text-primary)' }}>Upload Chapter Draft</h4>
              <div className="trans-form-group">
                <label className="trans-form-label">Chapter Title / Number</label>
                <input
                  type="text"
                  className="trans-form-input"
                  placeholder="e.g. Chapter 46: The Awakening"
                  value={uploadData.chapterTitle}
                  onChange={(e) => setUploadData({ ...uploadData, chapterTitle: e.target.value })}
                />
              </div>
              <div className="trans-form-group">
                <label className="trans-form-label">Word Count</label>
                <input
                  type="number"
                  className="trans-form-input"
                  value={uploadData.wordsCount}
                  onChange={(e) => setUploadData({ ...uploadData, wordsCount: e.target.value })}
                />
              </div>
              <div className="trans-form-group">
                <label className="trans-form-label">Translation Text Content</label>
                <textarea
                  className="trans-form-input textarea"
                  placeholder="Paste translated chapter contents here..."
                  value={uploadData.chapterContent}
                  onChange={(e) => setUploadData({ ...uploadData, chapterContent: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="trans-btn secondary" onClick={() => setShowUploadForm(false)}>Cancel</button>
                <button className="trans-btn primary" onClick={onUploadChapter} disabled={!uploadData.chapterTitle.trim()}>
                  Submit Draft
                </button>
              </div>
            </div>
          )}
        </div>

        {isCurrentLeader && (
          <div className="post-creation-card">
            <div className="post-user-avatar">YS</div>
            <div className="post-creation-input-wrapper">
            <textarea
              className="post-textarea"
              placeholder="Post an announcement, update, or share with the group..."
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
            />

            {attachedImage && (
              <div className="post-creation-image-preview" style={{ position: 'relative', marginTop: '10px', display: 'inline-block' }}>
                <img
                  src={attachedImage}
                  alt="Attachment Preview"
                  style={{ maxHeight: '180px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.3)' }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
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
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="trans-btn secondary"
                  onClick={() => handleFormatText('**', '**')}
                  style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 'bold' }}
                  title="Bold Text"
                >
                  B
                </button>
                <button
                  type="button"
                  className="trans-btn secondary"
                  onClick={() => handleFormatText('*', '*')}
                  style={{ padding: '4px 10px', fontSize: '12px', fontStyle: 'italic' }}
                  title="Italic Text"
                >
                  I
                </button>
                <button
                  type="button"
                  className="trans-btn secondary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Attach Image"
                >
                  📷 Image
                </button>
              </div>

              <button
                className="trans-btn primary"
                onClick={handleFormPostSubmit}
                disabled={!newPostText.trim() && !attachedImage}
              >
                Post
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
                    {post.content}
                    {post.attachedImage && (
                      <div style={{ marginTop: '12px' }}>
                        <img
                          src={post.attachedImage}
                          alt="Post Attachment"
                          style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '10px', border: '1px solid var(--trans-border)' }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="post-footer-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
                    <button className="post-action-btn" onClick={() => onLikePost(post.id)}>
                      👍 {post.likes || 0} likes
                    </button>
                    <button className="post-action-btn" onClick={() => toggleComments(post.id)}>
                      💬 Comments ({commentsList.length})
                    </button>
                    {isCurrentLeader && (
                      <>
                        <button className={`post-action-btn pin-btn ${post.isPinned ? 'active' : ''}`} onClick={() => onTogglePinPost(post.id)}>
                          📌 {post.isPinned ? 'Unpin Post' : 'Pin Post'}
                        </button>
                        <button className="post-action-btn delete-btn" style={{ color: '#ef4444' }} onClick={() => {
                          if (window.confirm("Are you sure you want to delete this post?")) {
                            onDeletePost && onDeletePost(post.id);
                          }
                        }}>
                          🗑️ Delete Post
                        </button>
                      </>
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
                          commentsList.map((cmt, cIdx) => (
                            <div key={cmt.id || `cmt-${cIdx}`} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                              <div className="post-user-avatar" style={{ width: '28px', height: '28px', fontSize: '10px', flexShrink: 0 }}>
                                {cmt.avatar || 'M'}
                              </div>
                              <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--trans-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--trans-text-primary)' }}>{cmt.author}</span>
                                  <span style={{ fontSize: '10px', color: 'var(--trans-text-muted)' }}>{formatTimeAgo(cmt.createdAt || cmt.timestamp)}</span>
                                </div>
                                <p style={{ fontSize: '12.5px', color: 'var(--trans-text-primary)', margin: 0, whiteSpace: 'pre-wrap' }}>{cmt.text || cmt.content}</p>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
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
                                </div>
                              </div>
                            </div>
                          ))
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