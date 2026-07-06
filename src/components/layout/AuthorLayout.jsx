import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getAuth, clearAuth } from '../../utils/Auth'
import '../../assets/style/author.css'

function AuthorLayout({ children, activeNav = 'overview' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [authorized, setAuthorized] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const auth = getAuth()
    if (!auth || !auth.user || auth.user.role?.toUpperCase() !== 'AUTHOR') {
      navigate('/', { replace: true })
    } else {
      setUser(auth.user)
      setAuthorized(true)
    }
  }, [navigate])

  const handleLogout = () => {
    clearAuth()
    navigate('/', { replace: true })
  }

  if (!authorized || !user) {
    return null
  }

  const authorName = user.fullName || user.username || 'Author'

  const navItems = [
    { id: 'overview', label: 'Overview', path: '/author/overview', icon: 'overview' },
    { id: 'comics', label: 'My Comics', path: '/author/comics', icon: 'comics' },
    { id: 'profile', label: 'Author Profile', path: '/author/profile', icon: 'profile' },
    { id: 'earnings', label: 'Earnings & Revenue', path: '/author/earnings', icon: 'earnings' },
    { id: 'upload-guide', label: 'Upload Guide', path: '/author/upload-guide', icon: 'guide' },
    { id: 'settings', label: 'Settings', path: '/author/settings', icon: 'settings' },
  ]

  const renderNavIcon = (icon) => {
    switch (icon) {
      case 'overview':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        )
      case 'comics':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        )
      case 'profile':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )
      case 'earnings':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        )
      case 'guide':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        )
      case 'settings':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="author-layout">
      {/* Sidebar */}
      <aside className="author-sidebar">
        <div className="author-sidebar-brand">
          <h2>Author Hub</h2>
          <span>CREATIVE STUDIO</span>
        </div>

        <nav className="author-sidebar-nav">
          {navItems.map((item) => {
            const isActive = activeNav === item.id || location.pathname === item.path
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`author-nav-item ${isActive ? 'active' : ''}`}
              >
                {renderNavIcon(item.icon)}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="author-sidebar-footer">
          <Link to="/" className="author-nav-item" style={{ fontSize: '13px', color: '#94a3b8' }}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to Home
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="author-main">
        {/* Topbar */}
        <header className="author-topbar">
          <div className="author-topbar-left">
            <span>Workspace:</span>
            <span className="workspace-label">Author</span>
          </div>

          <div className="author-topbar-right">
            {/* Notification Bell */}
            <button className="author-notification-btn" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>

            <div className="topbar-divider" />

            {/* Profile Button */}
            <button className="author-profile-btn" onClick={() => navigate('/author/profile')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>{authorName}</span>
            </button>

            <div className="topbar-divider" />

            {/* Logout */}
            <button className="author-topbar-btn logout" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="author-page-content fade-in-quick">
          {children}
        </div>
      </main>
    </div>
  )
}

export default AuthorLayout
