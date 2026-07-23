import TeamGroupChat from '../../components/chat/TeamGroupChat'

function HomeTab({
  selectedDetails,
  showUploadForm,
  setShowUploadForm,
  uploadData,
  setUploadData,
  onUploadChapter,
  newPostText,
  setNewPostText,
  onPostAnnouncement,
  announcements,
  onLikePost,
}) {
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

        <div className="post-creation-card">
          <div className="post-user-avatar">YS</div>
          <div className="post-creation-input-wrapper">
            <textarea
              className="post-textarea"
              placeholder="Post an announcement, update, or share with the group..."
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
            />
            <div className="post-creation-actions">
              <button className="trans-btn primary" onClick={onPostAnnouncement} disabled={!newPostText.trim()}>
                Post
              </button>
            </div>
          </div>
        </div>

        <div className="announcement-feed-list">
          {announcements.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: 'var(--trans-text-muted)', textAlign: 'center', padding: '20px' }}>No announcements yet.</p>
          ) : (
            announcements.map(post => (
              <div className="feed-post-card" key={post.id}>
                <div className="post-header">
                  <div className="post-user-avatar" style={{ background: post.role === 'Group Leader' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '' }}>
                    {post.avatar || 'U'}
                  </div>
                  <div className="post-header-info">
                    <div className="post-author-row">
                      <span className="post-author-name">{post.author}</span>
                      <span className={`post-role-badge ${post.role === 'Group Leader' ? 'leader' : ''}`}>{post.role || 'Member'}</span>
                    </div>
                    <span className="post-time">{post.time}</span>
                  </div>
                </div>
                <div className="post-body">{post.content}</div>
                <div className="post-footer-actions">
                  <button className="post-action-btn" onClick={() => onLikePost(post.id)}>
                    👍 {post.likes} likes
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Chat Sidebar — Real-time WebSocket Group Chat */}
      <TeamGroupChat
        groupId={selectedDetails?.id}
        teamName={selectedDetails?.title || selectedDetails?.team}
      />
    </div>
  )
}

export default HomeTab