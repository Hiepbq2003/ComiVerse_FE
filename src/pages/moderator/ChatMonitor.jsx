import { useState } from 'react'

const INITIAL_FLAGS = [
  {
    id: 'flag-1',
    user: 'toxic_fan_99',
    message: '"This translation is pure garbage, go jump off a cliff!"',
    reason: 'Extreme Toxicity / Harassment',
    status: 'flagged'
  },
  {
    id: 'flag-2',
    user: 'spammer_bot',
    message: '"Visit cheapcoins.biz for free discount codes on web novels!"',
    reason: 'Unsolicited Spam Link advertisement',
    status: 'flagged'
  }
]

function ChatMonitor() {
  const [flags, setFlags] = useState(INITIAL_FLAGS)

  const handleSendWarning = (id, user) => {
    alert(`Warning sent to user: ${user}`)
    setFlags(prev => prev.map(f => f.id === id ? { ...f, status: 'warned' } : f))
  }

  const handleBanUser = (id, user) => {
    if (window.confirm(`Are you sure you want to permanently ban user: ${user}?`)) {
      alert(`User ${user} has been banned.`)
      setFlags(prev => prev.filter(f => f.id !== id))
    }
  }

  return (
    <div className="fade-in">
      <div className="moderator-page-header">
        <h1>Chat Monitor</h1>
        <p>Review chat logs flagged by users or automated toxic filters.</p>
      </div>

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
    </div>
  )
}

export default ChatMonitor
