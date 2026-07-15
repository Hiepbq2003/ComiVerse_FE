import { useState, useEffect, useRef } from 'react'
import '../../assets/style/global/App.css'
import {
  getMyNotificationsApi,
  getUnreadCountApi,
  markAsReadApi,
  markAllAsReadApi,
} from '../../services/api/NotificationApi'

function DashboardLayout({ children, user, onLogout, badgeClass, badgeLabel }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Fetch notifications and unread count
  const loadNotifications = async () => {
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
    loadNotifications()
    // Poll notifications every 30 seconds for live updates
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleDropdown = () => {
    setShowDropdown((prev) => !prev)
    if (!showDropdown) {
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

  // Format date for notification display
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
          
          {/* Notification Bell */}
          <div className="nav-notification-container" ref={dropdownRef}>
            <button 
              className="nav-notification-bell" 
              onClick={handleToggleDropdown}
              aria-label="Toggle notifications"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="nav-notification-badge">{unreadCount}</span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showDropdown && (
              <div className="notification-dropdown">
                <div className="notification-dropdown-header">
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <button className="notification-mark-all-btn" onClick={handleMarkAllAsRead}>
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="notification-dropdown-list">
                  {notifications.length === 0 ? (
                    <div className="notification-empty-state">
                      <span className="notification-empty-icon">🔔</span>
                      <p>You have no notifications</p>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`notification-dropdown-item ${!item.isRead ? 'unread' : ''}`}
                        onClick={() => handleMarkAsRead(item.id, item.isRead)}
                      >
                        <div className="notification-item-top">
                          <span className={`notification-item-badge ${(item.type || 'info').toLowerCase()}`}>
                            {item.type || 'INFO'}
                          </span>
                          <span className="notification-item-date">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>
                        <h4 className="notification-item-title">{item.title}</h4>
                        <p className="notification-item-message">{item.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
