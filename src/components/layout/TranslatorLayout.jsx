import { useEffect } from 'react'
import { useNavigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNotification } from '../../context/NotificationContext'
import { AIPopover } from '../common/AIPopover'
import '../../assets/style/translator.css'

function TranslatorLayout({ children }) {
  const navigate = useNavigate()

  const { isLoggedIn, user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const userName = user?.fullName || user?.username || 'Translator'
  const roleUpper = (user?.role || '').toUpperCase().replace(/[\s-]+/g, '_')
  const workspaceLabel = roleUpper === 'PROJECT_LEADER' ? 'Project Leader' : 'Translator'

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification()

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

  useEffect(() => {
    if (!isLoggedIn || !user ||
      !['TRANSLATOR', 'PROJECT_LEADER'].includes((user.role || '').toUpperCase().replace(/[\s-]+/g, '_'))) {
      navigate('/', { replace: true })
    }
  }, [isLoggedIn, user, navigate])

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/translator/dashboard' },
    { id: 'project-list', label: 'Project List', icon: 'list', path: '/translator/project-list' },
    { id: 'project-teams', label: 'Project Teams', icon: 'comics', path: '/translator/project-teams' },
    { id: 'revenue', label: 'Revenue', icon: 'revenue', path: '/translator/revenue' },
    { id: 'payout', label: 'Payout', icon: 'payout', path: '/translator/payout' },
  ]

  const renderNavIcon = (icon) => {
    switch (icon) {
      case 'dashboard':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        )
      case 'list':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        )
      case 'comics':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        )
      case 'revenue':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        )
      case 'payout':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
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
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => `translator-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="translator-nav-label-group">
                <span className="translator-nav-icon">
                  {renderNavIcon(item.icon)}
                </span>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="translator-sidebar-footer">
          <button className="translator-nav-item" onClick={() => navigate('/')}>
            <span className="translator-nav-label-group">
              <span className="translator-nav-icon">
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
      <main className="translator-main">
        {/* Topbar */}
        <header className="translator-topbar">
          <div className="translator-topbar-left">
            <span>Workspace:</span>
            <span className="workspace-label">{workspaceLabel}</span>
          </div>

          <div className="translator-topbar-right">
            {/* Theme Toggle */}
            <button
              className="translator-icon-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{ marginRight: '8px' }}
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
              triggerClass="translator-icon-btn"
              popoverClass="pop--down pop--right-align"
              data={{ notifications: formattedNotifications, unreadCount: unreadCount }}
              onAction={handleNotificationAction}
            />

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
          {children || <Outlet />}
        </div>
      </main>
    </div>
  )
}

export default TranslatorLayout
