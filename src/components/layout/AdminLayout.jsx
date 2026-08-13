import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNotification } from '../../context/NotificationContext'
import { AIPopover } from '../common/AIPopover'
import LogoIcon from '../common/LogoIcon'
import '../../assets/style/admin/admin.css'

function AdminLayout({ children, activeNav = 'account-management' }) {
  const navigate = useNavigate()

  const { user, isLoggedIn, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const adminName = user?.fullName || user?.username || 'Admin'

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

  const handleNotificationAction = async (action) => {
    if (action === 'markAllRead') {
      markAllAsRead()
    } else {
      if (action.unread) await markAsRead(action.id)
      if (action.actionUrl?.startsWith('/') && !action.actionUrl.startsWith('//')) {
        navigate(action.actionUrl)
      }
    }
  }

  const formattedNotifications = (notifications || []).map(n => ({
    id: n.id,
    unread: !n.isRead,
    title: n.title || 'Notification',
    message: n.message || '',
    actionUrl: n.actionUrl,
    time: formatTimeAgo(n.createdAt)
  }))

  useEffect(() => {
    if (!isLoggedIn || !user || user.role?.toLowerCase() !== 'admin') {
      navigate('/', { replace: true })
    }
  }, [isLoggedIn, user, navigate])

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const navItems = [
    { id: 'statistics', label: 'Statistics Dashboard', icon: 'chart', path: '/admin/statistics' },
    { id: 'revenue', label: 'Payment Statistics', icon: 'dollar', path: '/admin/revenue' },
    { id: 'subscriptions', label: 'Subscriptions & Payments', icon: 'credit-card', path: '/admin/subscriptions' },
    { id: 'account-management', label: 'Account Management', icon: 'users', path: '/admin/account-management' },
    { id: 'report-categories', label: 'Report Categories', icon: 'categories', path: '/admin/report-categories' },
    { id: 'broadcast', label: 'Broadcast', icon: 'megaphone', path: '/admin/broadcast' },
    { id: 'payout', label: 'Payout Management', icon: 'wallet', path: '/admin/payout' },
    { id: 'settings', label: 'System Settings', icon: 'settings', path: '/admin/settings' },
  ]

  const renderNavIcon = (icon) => {
    switch (icon) {
      case 'chart':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        )
      case 'dollar':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        )
      case 'credit-card':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        )
      case 'categories':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
            <line x1="9" y1="14" x2="15" y2="14"/>
          </svg>
        )
      case 'users':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )
      case 'megaphone':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )
      case 'wallet':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        )
      case 'settings':
        return (
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px' }}>
          <Link to="/" style={{ display: 'block', textDecoration: 'none', marginLeft: '38px' }}>
            <LogoIcon size={26} />
          </Link>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`admin-nav-item ${activeNav === item.id ? 'active' : ''}`}
            >
              <span className="admin-nav-label-group">
                <span className="admin-nav-icon">{renderNavIcon(item.icon)}</span>
                <span>{item.label}</span>
              </span>
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-nav-item" onClick={() => navigate('/')}>
            <span className="admin-nav-label-group">
              <span className="admin-nav-icon">
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
      <main className="admin-main">
        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <span className="workspace-prefix">Workspace</span>
            <div className="workspace-tag" style={{ marginTop: 0, fontSize: '12px', padding: '6px 12px' }}>
              System Admin
            </div>
          </div>

          <div className="admin-topbar-right">
            {/* Theme Toggle */}
            <button 
              className="admin-notification-btn" 
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
              triggerClass="admin-notification-btn"
              popoverClass="pop--down pop--right-align"
              data={{ notifications: formattedNotifications, unreadCount: unreadCount }}
              onAction={handleNotificationAction}
            />

            <div className="topbar-divider" />

            {/* Admin Info */}
            <Link to="/profile" className="admin-topbar-user-info" title="My Profile">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {adminName}
            </Link>

            <div className="topbar-divider" />

            {/* Logout */}
            <button className="admin-topbar-btn logout" onClick={handleLogout}>
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
        <div className="admin-page-content">
          {children}
        </div>
      </main>
    </div>
  )
}

export default AdminLayout
