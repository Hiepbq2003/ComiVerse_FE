import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuth, clearAuth } from '../../utils/Auth'
import '../../assets/style/moderator.css'

function ModeratorLayout({ children, activeNav = 'dashboard', onNavChange, navBadges = {} }) {
  const navigate = useNavigate()

  // Get current user info from localStorage
  const auth = getAuth()
  const user = auth?.user || {}
  const userName = user.fullName || user.username || 'Moderator'

  useEffect(() => {
    if (!auth || !auth.token || !auth.user ||
        !['moderator', 'staff'].includes(auth.user.role?.toLowerCase())) {
      navigate('/', { replace: true })
    }
  }, [auth, navigate])

  const handleLogout = () => {
    clearAuth()
    navigate('/', { replace: true })
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'review-queue', label: 'Review Queue', icon: 'review' },
    { id: 'comic-management', label: 'Comic Management', icon: 'comics' },
    { id: 'genre-management', label: 'Genre Management', icon: 'genre' },
    { id: 'project-teams', label: 'Project Teams', icon: 'teams' },
    { id: 'chat-monitor', label: 'Chat Monitor', icon: 'chat' },
    { id: 'forum', label: 'Forum', icon: 'forum' },
  ]

  const renderNavIcon = (icon) => {
    switch (icon) {
      case 'dashboard':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
        )
      case 'review':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        )
      case 'comics':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        )
      case 'genre':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        )
      case 'teams':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        )
      case 'chat':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )
      case 'forum':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="moderator-layout">
      {/* Sidebar */}
      <aside className="moderator-sidebar">
        <div className="moderator-sidebar-brand">
          <h2>Moderator Panel</h2>
          <span>Content Management</span>
        </div>

        <nav className="moderator-sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`moderator-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => onNavChange?.(item.id)}
            >
              <span className="moderator-nav-label-group">
                <span className="moderator-nav-icon">
                  {renderNavIcon(item.icon)}
                </span>
                {item.label}
              </span>
              {navBadges[item.id] > 0 && (
                <span className="moderator-nav-badge">{navBadges[item.id]}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="moderator-sidebar-footer">
          <button className="moderator-nav-item" onClick={() => navigate('/')}>
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </span>
              ← Back to Home
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="moderator-main">
        {/* Topbar */}
        <header className="moderator-topbar">
          <div className="moderator-topbar-left">
            <span>Workspace:</span>
            <span className="workspace-label">Moderator</span>
          </div>

          <div className="moderator-topbar-right">
            {/* Notification Bell */}
            <button className="moderator-icon-btn" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </button>

            <div className="topbar-divider" />

            {/* Profile */}
            <button className="moderator-profile-btn" onClick={() => navigate('/profile')} title="My Profile">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {userName}
            </button>

            <div className="topbar-divider" />

            {/* Logout */}
            <button className="moderator-logout-btn" onClick={handleLogout}>
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
        <div className="moderator-page-content">
          {children}
        </div>
      </main>
    </div>
  )
}

export default ModeratorLayout
