import { useState, useEffect } from 'react'
import '../../assets/style/moderator/forum-moderation.css'
import { getAllForumThreadsApi, deleteForumThreadApi } from '../../services/api/ForumThreadApi'
import { toast } from 'react-toastify'

function ForumModeration() {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchThreads()
  }, [])

  const fetchThreads = async () => {
    try {
      setLoading(true)
      const data = await getAllForumThreadsApi()
      setThreads(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load forum threads!')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteThread = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete the thread "${title}"?`)) {
      try {
        await deleteForumThreadApi(id)
        setThreads(prev => prev.filter(t => t.id !== id))
        toast.success(`Thread "${title}" deleted successfully.`)
      } catch (err) {
        console.error(err)
        toast.error('Failed to delete thread!')
      }
    }
  }

  return (
    <div className="fade-in">
      <div className="moderator-page-header">
        <h1>Forum Moderation</h1>
        <p>Moderate user posts and replies in the platform community forum.</p>
      </div>

      {loading ? (
        <div className="moderator-empty-state">
          <p>Loading forum threads...</p>
        </div>
      ) : (
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
      )}
    </div>
  )
}

export default ForumModeration
