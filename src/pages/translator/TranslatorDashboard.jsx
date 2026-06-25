import DashboardLayout from '../../components/layout/DashboardLayout'

function TranslatorDashboard({ user, onLogout }) {
  return (
    <DashboardLayout 
      user={user} 
      onLogout={onLogout} 
      badgeClass="translator-badge" 
      badgeLabel="TRANSLATION LAB"
    >
      <div className="dashboard-welcome-banner">
        <h2>Localization Hub</h2>
        <p>Translate chapters, manage active translation requests, and maintain glossaries.</p>
      </div>

      <div className="dashboard-grid-layout">
        <div className="dashboard-action-card">
          <div className="card-icon translator">🌐</div>
          <h3>Active Projects</h3>
          <p>Read assigned chapters and upload localized translation assets.</p>
          <button className="btn-primary card-btn">Open Editor</button>
        </div>

        <div className="dashboard-action-card">
          <div className="card-icon translator">📫</div>
          <h3>License Requests</h3>
          <p>Coordinate translation permissions requests sent from foreign publishers.</p>
          <button className="btn-primary card-btn">View Inbound</button>
        </div>

        <div className="dashboard-action-card">
          <div className="card-icon translator">📖</div>
          <h3>Glossary Database</h3>
          <p>Collaboratively compile name translations and specific settings sheets.</p>
          <button className="btn-primary card-btn">Open Database</button>
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
            <span className="cell-value role-text translator">{user.role}</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default TranslatorDashboard
