// =============================================================================
// Tab 3: Join Requests
// =============================================================================

function RequestsTab({ joinRequests, onApprove, onReject }) {
  return (
    <div className="join-requests-tab-container fade-in">
      <h3 className="requests-count-header">{joinRequests.length} requests pending review</h3>

      {joinRequests.length === 0 ? (
        <div className="translator-empty-state">
          <h3>No pending recruitment requests</h3>
          <p>New request applications will appear here when users apply.</p>
        </div>
      ) : (
        joinRequests.map(req => (
          <div className="request-card-item" key={req.id}>
            <div className="request-header">
              <div className="chat-avatar" style={{ background: '#7c3aed', color: '#ffffff' }}>{req.avatar || 'U'}</div>
              <div className="post-header-info">
                <span className="member-name-text">{req.name}</span>
                <span className="post-time">{req.time}</span>
              </div>
            </div>
            <div className="request-message">"{req.text}"</div>
            <div className="request-role-tags">
              {req.roles.map((r, i) => (
                <span className="role-tag" key={i}>{r}</span>
              ))}
            </div>
            <div className="request-actions-row">
              <button className="trans-btn primary" onClick={() => onApprove(req.id, req.name)}>Approve</button>
              <button className="trans-btn secondary" onClick={() => onReject(req.id, req.name)}>Reject</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default RequestsTab