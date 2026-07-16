import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNotification } from '../../context/NotificationContext'
import { AIPopover } from '../common/AIPopover'
import '../../assets/style/author/author.css'

function AuthorLayout({ children, activeNav = 'overview' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn, user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!isLoggedIn || !user || user.role?.toUpperCase() !== 'AUTHOR') {
      navigate('/', { replace: true })
    } else {
      setAuthorized(true)
    }
  }, [isLoggedIn, user, navigate])

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHrs = Math.floor(diffMins / 60)
      if (diffHrs < 24) return `${diffHrs}h ago`
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  const handleNotificationAction = (actionId) => {
    if (actionId === 'markAllRead') {
      markAllAsRead()
    } else {
      markAsRead(actionId)
    }
  }

  const formattedNotifications = notifications.map(n => ({
    id: n.id,
    unread: !n.isRead,
    msg: `<strong>${n.title || 'Notification'}</strong>: ${n.message || ''}`,
    time: formatTimeAgo(n.createdAt)
  }))

  if (!authorized || !user) {
    return null
  }

  const authorName = user.fullName || user.username || 'Author'

  const navItems = [
    { id: 'overview', label: 'Overview', path: '/author/overview', icon: 'overview' },
    { id: 'comics', label: 'My Comics', path: '/author/comics', icon: 'comics' },
    { id: 'earnings', label: 'Earnings & Revenue', path: '/author/earnings', icon: 'earnings' },
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
      case 'earnings':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
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
            {/* Theme Toggle */}
            <button 
              className="author-notification-btn" 
              onClick={toggleTheme}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{ marginRight: '4px' }}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              )}
            </button>

            {/* Notification Bell */}
            <AIPopover 
              variant="notif"
              triggerText=""
              triggerClass="author-notification-btn"
              popoverClass="pop--down pop--right-align"
              data={{ notifications: formattedNotifications, unreadCount: unreadCount }}
              onAction={handleNotificationAction}
            />

            <div className="topbar-divider" />

            {/* Profile Button */}
            <button className="author-profile-btn" onClick={() => navigate('/profile')} title="My Profile">
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
