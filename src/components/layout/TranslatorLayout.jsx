import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, clearAuth } from '../../utils/Auth'
import '../../assets/style/translator.css'

function TranslatorLayout({ children, activeNav = 'dashboard', onNavChange }) {
  const navigate = useNavigate()

  // Get current user info from localStorage
  const auth = getAuth()
  const user = auth?.user || {}
  const userName = user.fullName || user.username || 'Translator'

  useEffect(() => {
    if (!auth || !auth.token || !auth.user ||
        auth.user.role?.toLowerCase() !== 'translator') {
      navigate('/', { replace: true })
    }
  }, [auth, navigate])

  const handleLogout = () => {
    clearAuth()
    navigate('/', { replace: true })
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'project-teams', label: 'Project Teams', icon: 'comics' },
    { id: 'revenue', label: 'Revenue', icon: 'revenue' },
    { id: 'payout', label: 'Payout', icon: 'payout' },
  ]

  const renderNavIcon = (icon) => {
    switch (icon) {
      case 'dashboard':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        )
      case 'comics':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        )
      case 'revenue':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        )
      case 'payout':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="translator-layout">
      {/* Sidebar */}
      <aside className="translator-sidebar">
        <div className="translator-sidebar-brand">
          <h2>Translator Hub</h2>
          <span>Translation Management</span>
        </div>

        <nav className="translator-sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`translator-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => onNavChange?.(item.id)}
            >
              <span className="translator-nav-icon">
                {renderNavIcon(item.icon)}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="translator-sidebar-footer">
          <button className="translator-nav-item" onClick={() => navigate('/')}>
            <span className="translator-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </span>
            ← Back to Home
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="translator-main">
        {/* Topbar */}
        <header className="translator-topbar">
          <div className="translator-topbar-left">
            <span>Workspace:</span>
            <span className="workspace-label">Translator</span>
          </div>

          <div className="translator-topbar-right">
            {/* Notification Bell */}
            <button className="translator-icon-btn" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </button>

            <div className="topbar-divider" />

            {/* Profile */}
            <button className="translator-profile-btn" onClick={() => navigate('/profile')} title="My Profile">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {userName}
            </button>

            <div className="topbar-divider" />

            {/* Logout */}
            <button className="translator-logout-btn" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="translator-page-content">
          {children}
        </div>
      </main>
    </div>
  )
}

export default TranslatorLayout
