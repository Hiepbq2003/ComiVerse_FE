import DashboardLayout from '../../components/layout/DashboardLayout'

function AdminDashboard({ user, onLogout }) {
  return (
    <DashboardLayout 
      user={user} 
      onLogout={onLogout} 
      badgeClass="admin-badge" 
      badgeLabel="ADMIN CONSOLE"
    >
      <div className="dashboard-welcome-banner">
        <h2>System Control Console</h2>
        <p>Manage system configurations, user privileges, and core system health checks.</p>
      </div>

      <div className="dashboard-grid-layout">
        <div className="dashboard-action-card">
          <div className="card-icon admin">👥</div>
          <h3>User Management</h3>
          <p>Create, verify, suspend, or delete reader and creator credentials.</p>
          <button className="btn-primary card-btn">Launch Console</button>
        </div>

        <div className="dashboard-action-card">
          <div className="card-icon admin">📝</div>
          <h3>System Audit Logs</h3>
          <p>Audit user actions, track DDL database schemas, and monitor SMTP transactions.</p>
          <button className="btn-primary card-btn">Open Audit Logs</button>
        </div>

        <div className="dashboard-action-card">
          <div className="card-icon admin">⚙️</div>
          <h3>Global Settings</h3>
          <p>Configure Google client IDs, JWT token lifespan, and environment variables.</p>
          <button className="btn-primary card-btn">Adjust Settings</button>
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
            <span className="cell-value role-text admin">{user.role}</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AdminDashboard
