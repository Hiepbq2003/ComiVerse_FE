import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { MOCK_COMICS } from '../../utils/mockComics'
import '../../assets/style/reader/home.css'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNotification } from '../../context/NotificationContext'

function HomeLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

  const { isLoggedIn, user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { notifications, unreadCount, loadNotifications, markAsRead, markAllAsRead } = useNotification()

  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false)
  const notificationRef = useRef(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false)
  const userMenuRef = useRef(null)

  // Click outside listener for notifications
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationDropdown(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
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
    await markAsRead(id)
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    setShowSignoutConfirm(false)
    navigate('/')
  }

  const handleMenuNavigate = (path) => {
    setShowUserMenu(false)
    navigate(path)
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
    if (!isLoggedIn || !user) return '/auth'
    const roleUpper = (user.role || '').toUpperCase()
    if (roleUpper === 'ADMIN') return '/admin/account-management'
    if (roleUpper === 'AUTHOR') return '/author/overview'
    if (roleUpper === 'TRANSLATOR') return '/translator/dashboard'

    return '/auth' // Reader dashboard is handled inside AuthPage
  }

  const canOpenWorkspace = () => {
    if (!isLoggedIn || !user) return false
    const roleUpper = (user.role || '').toUpperCase()
    return !['READER', 'USER'].includes(roleUpper)
  }

  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchContainerRef = useRef(null)

  // Sync search input with URL query param if on /search page
  useEffect(() => {
    if (location.pathname === '/search') {
      const params = new URLSearchParams(location.search)
      const query = params.get('query') || ''
      setSearchQuery(query)
    } else {
      setSearchQuery('')
    }
  }, [location])

  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search effect (using demo data)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      setShowSearchDropdown(false)
      return
    }

    setIsSearchLoading(true)
    setShowSearchDropdown(true)

    // Delay 1s before searching demo data
    const delayDebounceFn = setTimeout(() => {
      const filtered = MOCK_COMICS.filter(comic =>
        (comic.title && comic.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (comic.author && comic.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (comic.genres && comic.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())))
      )
      setSuggestions(filtered)
      setIsSearchLoading(false)
    }, 1000)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const triggerSearch = () => {
    if (searchQuery.trim()) {
      setShowSearchDropdown(false)
      navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      triggerSearch()
    }
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
            <Link to="/explore" className={`home-nav-item ${location.pathname === '/explore' ? 'active' : ''}`}>
              Explore
            </Link>
            <Link to="/ranking" className={`home-nav-item ${location.pathname === '/ranking' ? 'active' : ''}`}>
              Ranking
            </Link>
            {/*<Link to="/library" className={`home-nav-item ${location.pathname === '/library' ? 'active' : ''}`}>*/}
            {/*  Library*/}
            {/*</Link>*/}
            {isLoggedIn && (
              <Link to="/forum" className={`home-nav-item ${location.pathname === '/forum' ? 'active' : ''}`}>
                Forum
              </Link>
            )}
          </nav>
        </div>

        {/* Search Bar */}
        <div className="home-search-wrapper" ref={searchContainerRef}>
          <svg
            className="home-search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ cursor: 'pointer' }}
            onClick={triggerSearch}
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="home-search-input"
            placeholder="Search comics, manga, authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchSubmit}
            onFocus={() => {
              if (searchQuery.trim()) {
                setShowSearchDropdown(true)
              }
            }}
          />

          {/* Search Suggestions Dropdown */}
          {showSearchDropdown && (
            <div className="home-search-dropdown">
              {isSearchLoading ? (
                <div className="search-dropdown-loading">
                  <div className="search-spinner"></div>
                  Searching...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="search-dropdown-no-results">No comics found</div>
              ) : (
                <div className="search-dropdown-list">
                  {suggestions.slice(0, 5).map((comic) => (
                    <Link
                      key={comic.id || comic._id}
                      to={`/comic/${comic.id || comic._id}`}
                      className="search-dropdown-item"
                      onClick={() => {
                        setShowSearchDropdown(false)
                        setSearchQuery('')
                      }}
                    >
                      <img
                        src={comic.cover || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150'}
                        alt={comic.title}
                        className="search-dropdown-item-cover"
                      />
                      <div className="search-dropdown-item-info">
                        <span className="search-dropdown-item-title">{comic.title}</span>
                        <span className="search-dropdown-item-author">{comic.author || 'Unknown'}</span>
                      </div>
                    </Link>
                  ))}
                  {suggestions.length > 5 && (
                    <button
                      className="search-dropdown-see-all"
                      onClick={() => {
                        setShowSearchDropdown(false)
                        navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`)
                      }}
                    >
                      See all {suggestions.length} results
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auth Section */}
        <div className="home-header-right">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label="Toggle dark/light mode"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {isLoggedIn ? (
            <>
              {/* Notification Dropdown */}
              <div className="nav-notification-container" ref={notificationRef} style={{ position: 'relative', marginRight: '8px' }}>
                <button
                  className="nav-notification-bell"
                  onClick={handleToggleNotifications}
                  aria-label="Toggle notifications"
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

              <div className="home-user-menu-container" ref={userMenuRef}>
                <button
                  type="button"
                  className="home-user-profile-badge"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  aria-expanded={showUserMenu}
                  aria-haspopup="menu"
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="home-user-avatar-img" />
                  ) : (
                    <div className="home-user-avatar">
                      {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span>{user?.fullName || user?.username}</span>
                  <svg className={`home-user-menu-chevron ${showUserMenu ? 'open' : ''}`} viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="home-user-dropdown" role="menu">
                    <div className="home-user-dropdown-header">
                      <div className="home-user-dropdown-avatar">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt="Avatar" />
                        ) : (
                          <span>{(user?.fullName || user?.username || 'U')[0].toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <strong>{user?.fullName || user?.username}</strong>
                        <span>{user?.email || user?.role || 'ComiVerse member'}</span>
                      </div>
                    </div>

                    <button type="button" className="home-user-menu-option" onClick={() => handleMenuNavigate('/profile')}>
                      <span>Profile</span>
                    </button>
                    <button type="button" className="home-user-menu-option" onClick={() => handleMenuNavigate('/library?tab=History')}>
                      <span>Reading History</span>
                    </button>
                    <button type="button" className="home-user-menu-option" onClick={() => handleMenuNavigate('/library?tab=Saved')}>
                      <span>Favorites</span>
                    </button>
                    <button type="button" className="home-user-menu-option" onClick={() => handleMenuNavigate('/library?tab=Following')}>
                      <span>Following</span>
                    </button>
                    {canOpenWorkspace() && (
                      <button type="button" className="home-user-menu-option" onClick={() => handleMenuNavigate(getDashboardPath())}>
                        <span>Workspace</span>
                      </button>
                    )}

                    <div className="home-user-menu-divider" />

                    <button type="button" className="home-user-menu-option danger" onClick={() => {
                      setShowUserMenu(false)
                      setShowSignoutConfirm(true)
                    }}>
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
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

      {showSignoutConfirm && (
        <div className="home-signout-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="home-signout-title">
          <div className="home-signout-modal">
            <h3 id="home-signout-title">Sign out?</h3>
            <p>Your current session will be closed and you will return to the homepage.</p>
            <div className="home-signout-modal-actions">
              <button type="button" className="home-signout-cancel-btn" onClick={() => setShowSignoutConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="home-signout-confirm-btn" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

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
                <Link to="/ranking" className="footer-link">Ranking</Link>
                <Link to="/library" className="footer-link">Library</Link>
                <Link to="/explore" className="footer-link">Explore</Link>
              </div>
            </div>

            <div className="footer-links-col">
              <span className="footer-col-title">Showcases</span>
              <div className="footer-links-list">
                <Link to="/showcase/skeletons" className="footer-link">Skeleton Showcase</Link>
                <Link to="/showcase/popovers" className="footer-link">AI Popover Showcase</Link>
                <Link to="/showcase/profile-menu" className="footer-link">Profile Dropdown Showcase</Link>
                <Link to="/showcase/buttons" className="footer-link">Buttons Showcase</Link>
                <Link to="/showcase/paginations" className="footer-link">Paginations Showcase</Link>
                <Link to="/showcase/animated-buttons" className="footer-link">Animated Buttons Showcase</Link>
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
