import { useState } from 'react'

const INITIAL_THREADS = [
  {
    id: 'thread-1',
    title: 'Spam Link Post',
    author: 'bot_account',
    content: '"Check out this site for free gift cards: bit.ly/spam-link"'
  },
  {
    id: 'thread-2',
    title: 'Off-topic Flame War',
    author: 'angry_user_12',
    content: '"You guys are all idiots, this series is trash and everyone who likes it has zero braincells!"'
  }
]

function ForumModeration() {
  const [threads, setThreads] = useState(INITIAL_THREADS)

  const handleDeleteThread = (id, title) => {
    if (window.confirm(`Are you sure you want to delete the thread "${title}"?`)) {
      setThreads(prev => prev.filter(t => t.id !== id))
    }
  }

  return (
    <div className="fade-in">
      <div className="moderator-page-header">
        <h1>Forum Moderation</h1>
        <p>Moderate user posts and replies in the platform community forum.</p>
      </div>

      <div className="moderator-cards-list">
        {threads.length === 0 ? (
          <div className="moderator-empty-state">
            <h3>No flagged forum posts</h3>
            <p>Forum community board is fully peaceful!</p>
          </div>
        ) : (
          threads.map(t => (
            <div className="submission-card" key={t.id}>
              <div className="submission-info">
                <h3 className="submission-title">{t.title}</h3>
                <p className="submission-meta">Submitted by: <strong>{t.author}</strong></p>
                <p className="submission-meta">Content: <em>{t.content}</em></p>
              </div>
              <div className="submission-actions">
                <button 
                  className="mod-btn reject"
                  onClick={() => handleDeleteThread(t.id, t.title)}
                >
                  🗑️ Delete Thread
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ForumModeration
