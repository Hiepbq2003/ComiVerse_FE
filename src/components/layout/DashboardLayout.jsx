import '../../assets/style/App.css'

function DashboardLayout({ children, user, onLogout, badgeClass, badgeLabel }) {
  return (
    <div className="full-dashboard-wrapper fade-in">
      {/* Top Navbar */}
      <nav className="dashboard-navbar">
        <div className="nav-brand-group">
          <div className="brand-logo-icon">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm-4 8H7v-2h6v2z"/>
            </svg>
          </div>
          <span className="brand-logo-text">ComiVerse</span>
          <span className={`nav-role-badge ${badgeClass}`}>{badgeLabel}</span>
        </div>

        <div className="nav-user-group">
          <span className="nav-welcome-text">Logged in as: <strong>{user.fullName || user.username}</strong></span>
          <button className="btn-secondary nav-logout-btn" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="dashboard-main-content">
        <div className="dashboard-content-container">
          {children}
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout
