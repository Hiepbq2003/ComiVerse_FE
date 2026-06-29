import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getAuth, clearAuth } from '../../utils/Auth'
import {
  getMyNotificationsApi,
  getUnreadCountApi,
  markAsReadApi,
  markAllAsReadApi,
} from '../../services/api/NotificationApi'
import '../../assets/style/home.css'

function HomeLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [authState, setAuthState] = useState(null)

  // Notification State
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const notificationRef = useRef(null)

  // Load auth status
  useEffect(() => {
    const auth = getAuth()
    if (auth && auth.token && auth.user) {
      setAuthState(auth)
    } else {
      setAuthState(null)
    }
  }, [location])

  // Load notifications if logged in
  const loadNotifications = async () => {
    if (!authState) return
    try {
      const res = await getMyNotificationsApi()
      const data = res?.data || res || []
      setNotifications(data)

      const countRes = await getUnreadCountApi()
      setUnreadCount(countRes?.data ?? countRes ?? 0)
    } catch (err) {
      console.error('Failed to load notifications:', err.message)
    }
  }

  useEffect(() => {
    if (authState) {
      loadNotifications()
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [authState])

  // Click outside listener for notifications
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleNotifications = () => {
    setShowNotificationDropdown((prev) => !prev)
    if (!showNotificationDropdown) {
      loadNotifications()
    }
  }

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return
    try {
      await markAsReadApi(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err.message)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadApi()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err.message)
    }
  }

  const handleLogout = () => {
    clearAuth()
    setAuthState(null)
    setNotifications([])
    setUnreadCount(0)
    navigate('/')
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

  const getDashboardPath = () => {
    if (!authState) return '/auth'
    const roleUpper = (authState.user.role || '').toUpperCase()
    if (roleUpper === 'ADMIN') return '/admin/account-management'
    if (roleUpper === 'AUTHOR') return '/author/overview'
    return '/auth' // Reader dashboard is handled inside AuthPage
  }

  return (
    <div className="home-layout-container">
      {/* HEADER */}
      <header className="home-header">
        <div className="home-header-left">
          {/* Logo */}
          <Link to="/" className="home-brand">
            <div className="home-brand-logo-icon">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm-4 8H7v-2h6v2z" />
              </svg>
            </div>
            <span className="home-brand-logo-text">ComiVerse</span>
          </Link>

          {/* Nav Links */}
          <nav className="home-nav-links">
            <Link to="/" className={`home-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
              Home
            </Link>
            <Link to="/genres" className={`home-nav-item ${location.pathname === '/genres' ? 'active' : ''}`}>
              Genres
            </Link>
            <Link to="/trending" className={`home-nav-item ${location.pathname === '/trending' ? 'active' : ''}`}>
              Trending
            </Link>
            <Link to="/new-releases" className={`home-nav-item ${location.pathname === '/new-releases' ? 'active' : ''}`}>
              New Releases
            </Link>
          </nav>
        </div>

        {/* Search Bar */}
        <div className="home-search-wrapper">
          <svg className="home-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="home-search-input"
            placeholder="Search comics, manga, authors..."
          />
        </div>

        {/* Auth Section */}
        <div className="home-header-right">
          {authState ? (
            <>
              {/* Notification Dropdown */}
              <div className="nav-notification-container" ref={notificationRef} style={{ position: 'relative', marginRight: '8px' }}>
                <button
                  className="nav-notification-bell"
                  onClick={handleToggleNotifications}
                  aria-label="Toggle notifications"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    borderRadius: '50%',
                    position: 'relative'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span
                      className="nav-notification-badge"
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        minWidth: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifycontent: 'center',
                        padding: '0 4px',
                        boxSizing: 'border-box'
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotificationDropdown && (
                  <div
                    className="notification-dropdown"
                    style={{
                      position: 'absolute',
                      right: '0',
                      top: '40px',
                      width: '320px',
                      background: '#0d0919',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      zIndex: 101,
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      className="notification-dropdown-header"
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: '14px', color: 'white' }}>Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          className="notification-mark-all-btn"
                          onClick={handleMarkAllAsRead}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#a855f7',
                            fontSize: '12px',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div
                      className="notification-dropdown-list"
                      style={{
                        maxHeight: '280px',
                        overflowY: 'auto',
                        padding: '8px'
                      }}
                    >
                      {notifications.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b' }}>
                          <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🔔</span>
                          <p style={{ margin: 0, fontSize: '13px' }}>You have no notifications</p>
                        </div>
                      ) : (
                        notifications.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              marginBottom: '6px',
                              background: !item.isRead ? 'rgba(168, 85, 247, 0.06)' : 'transparent',
                              border: !item.isRead ? '1px solid rgba(168, 85, 247, 0.15)' : '1px solid transparent',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onClick={() => handleMarkAsRead(item.id, item.isRead)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 'bold',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: item.type === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                                  color: item.type === 'SUCCESS' ? '#10b981' : '#c084fc'
                                }}
                              >
                                {item.type || 'INFO'}
                              </span>
                              <span style={{ fontSize: '10px', color: '#64748b' }}>
                                {formatTimeAgo(item.createdAt)}
                              </span>
                            </div>
                            <h4 style={{ margin: '0 0 2px', fontSize: '12px', color: 'white', fontWeight: 600 }}>{item.title}</h4>
                            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>{item.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Link */}
              <Link to={getDashboardPath()} className="home-user-profile-badge">
                <div className="home-user-avatar">
                  {(authState.user.fullName || authState.user.username || 'U')[0].toUpperCase()}
                </div>
                <span>{authState.user.fullName || authState.user.username}</span>
              </Link>

              {/* Logout */}
              <button onClick={handleLogout} className="btn-home-logout">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth?mode=signin" className="btn-home-auth-link">
                Sign In
              </Link>
              <Link to="/auth?mode=signup" className="btn-home-primary">
                Sign Up Free
              </Link>
            </>
          )}
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main style={{ flexGrow: 1 }}>
        {children}
      </main>

      {/* FOOTER */}
      <footer className="home-footer">
        <div className="footer-inner">
          <div className="footer-top-row">
            <div className="footer-brand-col">
              <Link to="/" className="home-brand">
                <div className="home-brand-logo-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm-4 8H7v-2h6v2z" />
                  </svg>
                </div>
                <span className="home-brand-logo-text">ComiVerse</span>
              </Link>
              <p className="footer-brand-tagline">
                ComiVerse is a premium platform for comic creators and readers, bringing you over 1,000+ top-quality webcomics, manga, and manhwa.
              </p>
            </div>

            <div className="footer-links-col">
              <span className="footer-col-title">Browse</span>
              <div className="footer-links-list">
                <Link to="/" className="footer-link">Home</Link>
                <span className="footer-link" style={{ cursor: 'pointer' }}>Popular Comics</span>
                <span className="footer-link" style={{ cursor: 'pointer' }}>New Releases</span>
                <span className="footer-link" style={{ cursor: 'pointer' }}>Genres</span>
              </div>
            </div>

            <div className="footer-links-col">
              <span className="footer-col-title">For Creators</span>
              <div className="footer-links-list">
                <Link to="/auth?mode=signup" className="footer-link">Publish Your Comic</Link>
                <span className="footer-link" style={{ cursor: 'pointer' }}>Creator Portal</span>
                <span className="footer-link" style={{ cursor: 'pointer' }}>Earning Models</span>
                <span className="footer-link" style={{ cursor: 'pointer' }}>Community Forums</span>
              </div>
            </div>

            <div className="footer-links-col">
              <span className="footer-col-title">Company</span>
              <div className="footer-links-list">
                <span className="footer-link" style={{ cursor: 'pointer' }}>About Us</span>
                <span className="footer-link" style={{ cursor: 'pointer' }}>Privacy Policy</span>
                <span className="footer-link" style={{ cursor: 'pointer' }}>Terms of Service</span>
                <span className="footer-link" style={{ cursor: 'pointer' }}>Contact Support</span>
              </div>
            </div>
          </div>

          <div className="footer-bottom-row">
            <span>© {new Date().getFullYear()} ComiVerse. All rights reserved.</span>
            <div className="footer-socials">
              <div className="social-icon-btn" title="Discord">
                <span style={{ fontSize: '16px' }}>💬</span>
              </div>
              <div className="social-icon-btn" title="Twitter">
                <span style={{ fontSize: '16px' }}>🐦</span>
              </div>
              <div className="social-icon-btn" title="Facebook">
                <span style={{ fontSize: '16px' }}>📘</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomeLayout
