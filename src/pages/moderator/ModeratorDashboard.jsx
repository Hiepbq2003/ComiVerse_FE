import DashboardLayout from '../../components/layout/DashboardLayout'

function ModeratorDashboard({ user, onLogout }) {
  return (
    <DashboardLayout 
      user={user} 
      onLogout={onLogout} 
      badgeClass="moderator-badge" 
      badgeLabel="MODERATION CENTER"
    >
      <div className="dashboard-welcome-banner">
        <h2>Community Moderation Center</h2>
        <p>Review flagged posts, approve new chapter submissions, and coordinate guidelines checks.</p>
      </div>

      <div className="dashboard-grid-layout">
        <div className="dashboard-action-card">
          <div className="card-icon moderator">🛡️</div>
          <h3>Approvals Queue</h3>
          <p>Review new comic chapters submitted by creators for licensing checks.</p>
          <button className="btn-primary card-btn">Launch Queue</button>
        </div>

        <div className="dashboard-action-card">
          <div className="card-icon moderator">💬</div>
          <h3>Reported Comments</h3>
          <p>Read flagged comments and take appropriate community behavior actions.</p>
          <button className="btn-primary card-btn">Manage Flags</button>
        </div>

        <div className="dashboard-action-card">
          <div className="card-icon moderator">📜</div>
          <h3>Terms Config</h3>
          <p>Update guidelines rules for comic submissions and comment policies.</p>
          <button className="btn-primary card-btn">Edit Rules</button>
        </div>
      </div>

      {/* User session info */}
      <div className="dashboard-profile-section">
        <h3>Connected Session Details</h3>
        <div className="profile-details-grid-full">
          <div className="profile-detail-cell">
            <span className="cell-label">Username</span>
            <span className="cell-value">{user.username}</span>
          </div>
          <div className="profile-detail-cell">
            <span className="cell-label">Email Address</span>
            <span className="cell-value">{user.email}</span>
          </div>
          <div className="profile-detail-cell">
            <span className="cell-label">Access Level</span>
            <span className="cell-value role-text moderator">{user.role}</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ModeratorDashboard
