import DashboardLayout from '../../components/layout/DashboardLayout'

function AuthorDashboard({ user, onLogout }) {
  return (
    <DashboardLayout 
      user={user} 
      onLogout={onLogout} 
      badgeClass="author-badge" 
      badgeLabel="CREATIVE STUDIO"
    >
      <div className="dashboard-welcome-banner">
        <h2>Creator Workspace</h2>
        <p>Sketch your chapters, manage your published titles, and coordinate series listings.</p>
      </div>

      <div className="dashboard-grid-layout">
        <div className="dashboard-action-card">
          <div className="card-icon author">🎨</div>
          <h3>Publish Chapter</h3>
          <p>Upload artwork, set drafts live, and coordinate series release timelines.</p>
          <button className="btn-primary card-btn">New Upload</button>
        </div>

        <div className="dashboard-action-card">
          <div className="card-icon author">📚</div>
          <h3>My Comics List</h3>
          <p>Manage synopses, edit classifications, and respond to local translate requests.</p>
          <button className="btn-primary card-btn">Manage Series</button>
        </div>

        <div className="dashboard-action-card">
          <div className="card-icon author">📊</div>
          <h3>Creative Insights</h3>
          <p>Track unique reads, bookmarks count, and review community discussion comments.</p>
          <button className="btn-primary card-btn">View Stats</button>
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
            <span className="cell-value role-text author">{user.role}</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AuthorDashboard
