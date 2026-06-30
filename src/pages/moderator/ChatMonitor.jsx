import { useState, useEffect } from 'react'
import '../../assets/style/moderator/chat-monitor.css'
import { getAllChatFlagsApi, warnChatFlagApi, deleteChatFlagApi } from '../../services/api/ChatFlagApi'
import { toast } from 'react-toastify'

function ChatMonitor() {
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFlags()
  }, [])

  const fetchFlags = async () => {
    try {
      setLoading(true)
      const data = await getAllChatFlagsApi()
      setFlags(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load chat flags!')
    } finally {
      setLoading(false)
    }
  }

  const handleSendWarning = async (id, user) => {
    try {
      const updated = await warnChatFlagApi(id)
      setFlags(prev => prev.map(f => f.id === id ? updated : f))
      toast.success(`Warning sent to user: ${user}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to send warning!')
    }
  }

  const handleBanUser = async (id, user) => {
    if (window.confirm(`Are you sure you want to permanently ban user: ${user}?`)) {
      try {
        await deleteChatFlagApi(id)
        setFlags(prev => prev.filter(f => f.id !== id))
        toast.success(`User ${user} has been banned and flag removed.`)
      } catch (err) {
        console.error(err)
        toast.error('Failed to ban user!')
      }
    }
  }

  return (
    <div className="fade-in">
      <div className="moderator-page-header">
        <h1>Chat Monitor</h1>
        <p>Review chat logs flagged by users or automated toxic filters.</p>
      </div>

      {loading ? (
        <div className="moderator-empty-state">
          <p>Loading flags...</p>
        </div>
      ) : (
        <div className="moderator-cards-list">
          {flags.length === 0 ? (
            <div className="moderator-empty-state">
              <h3>No flagged chats pending</h3>
              <p>ComiVerse chatrooms are clear and healthy!</p>
            </div>
          ) : (
            flags.map(f => (
              <div className="submission-card" key={f.id}>
                <div className="submission-info">
                  <h3 className="submission-title">User: {f.user}</h3>
                  <p className="submission-meta">Flagged in chapter chat: <em>{f.message}</em></p>
                  <p style={{ fontSize: '12px', color: 'var(--mod-red)' }}><strong>Automated Filter Match:</strong> {f.reason}</p>
                </div>
                <div className="submission-actions">
                  {f.status === 'warned' ? (
                    <span style={{ fontSize: '13px', color: 'var(--mod-gray)', fontWeight: '600', padding: '6px 12px' }}>⚠️ Warning Sent</span>
                  ) : (
                    <button 
                      className="mod-btn review" 
                      style={{ borderColor: 'var(--mod-red)', color: 'var(--mod-red)' }}
                      onClick={() => handleSendWarning(f.id, f.user)}
                    >
                      ⚠️ Send Warning
                    </button>
                  )}
                  <button 
                    className="mod-btn reject"
                    onClick={() => handleBanUser(f.id, f.user)}
                  >
                    🚫 Ban User
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

export default ChatMonitor
