import { useState } from 'react'
import '../../assets/style/reader.css'

function Profile({ user, onLogout }) {
  const [activeNav, setActiveNav] = useState('home') // 'home' | 'explore' | 'library' | 'forum' | 'settings'
  const [selectedGenre, setSelectedGenre] = useState('All')

  const userName = user.fullName || user.username || 'Reader'
  const userInitials = userName.substring(0, 2).toUpperCase()

  const genres = ['All', 'Action', 'Romance', 'Fantasy', 'Horror', 'Sci-Fi', 'Comedy', 'Isekai']

  const recommendedComics = [
    { id: 1, title: 'Sword God Unrivaled', chapter: 'Ch 320', badge: 'HOT', cover: '🗡️' },
    { id: 2, title: 'Spiritual Energy Resur...', chapter: 'Ch 88', badge: 'NEW', cover: '🔮' },
    { id: 3, title: 'Demon King Reborn', chapter: 'Ch 214', badge: 'TOP', cover: '😈' },
    { id: 4, title: 'Galactic Bloodwar', chapter: 'Ch 156', badge: 'NEW', cover: '🌌' },
    { id: 5, title: 'Dao Patriarch\'s Heir', chapter: 'Ch 142', badge: 'HOT', cover: '📜' },
    { id: 6, title: 'Immortal Cultivation C...', chapter: 'Ch 77', badge: 'TOP', cover: '🧬' }
  ]

  const updatedTodayComics = [
    { id: 7, title: 'Supreme Alchemist', chapter: 'Ch 55', cover: '🧪' },
    { id: 8, title: 'Shadow Monarch', chapter: 'Ch 190', cover: '👥' },
    { id: 9, title: 'Level Up Solo', chapter: 'Ch 299', cover: '🎮' },
    { id: 10, title: 'Tomb Raider King', chapter: 'Ch 412', cover: '🏺' },
    { id: 11, title: 'Martial Peak', chapter: 'Ch 3200', cover: '🏔️' },
    { id: 12, title: 'Apotheosis', chapter: 'Ch 980', cover: '⚡' }
  ]

  const communityPosts = [
    { id: 1, name: 'Agatsuma Zenitsu', time: '16 min', text: 'new chapter dropped, let\'s go!' },
    { id: 2, name: 'Yami', time: '14 min', text: 'just finished reading, that plot twist though' },
    { id: 3, name: 'Van Linh', time: '8 min', text: 'anyone know when the next chapter releases?' },
    { id: 4, name: 'T.ynyang', time: '7 min', text: 'this arc is getting so good omg' },
    { id: 5, name: 'SkyReader', time: '5 min', text: 'Group SkyScans translation is top tier as always' },
    { id: 6, name: 'Duong', time: '4 min', text: 'finally caught up after 2 weeks' }
  ]

  return (
    <div className="reader-layout">
      {/* ── SIDEBAR ─────────────────────────────────── */}
      <aside className="reader-sidebar">
        <div className="reader-sidebar-brand">
          <h2>ComiVerse</h2>
          <span>Reader Portal</span>
        </div>

        <nav className="reader-sidebar-nav">
          <button 
            className={`reader-nav-item ${activeNav === 'home' ? 'active' : ''}`}
            onClick={() => setActiveNav('home')}
          >
            <span className="reader-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </span>
            Home
          </button>

          <button 
            className={`reader-nav-item ${activeNav === 'explore' ? 'active' : ''}`}
            onClick={() => setActiveNav('explore')}
          >
            <span className="reader-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </span>
            Explore
          </button>

          <button 
            className={`reader-nav-item ${activeNav === 'library' ? 'active' : ''}`}
            onClick={() => setActiveNav('library')}
          >
            <span className="reader-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            Library
          </button>

          <button 
            className={`reader-nav-item ${activeNav === 'forum' ? 'active' : ''}`}
            onClick={() => setActiveNav('forum')}
          >
            <span className="reader-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </span>
            Forum
          </button>
        </nav>

        <div className="reader-sidebar-footer">
          <button className="reader-nav-item" onClick={onLogout}>
            <span className="reader-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
            ← Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN WORKSPACE ──────────────────────────── */}
      <main className="reader-main">
        {/* Top Navbar */}
        <header className="reader-topbar">
          <div className="reader-topbar-left">
            <span>Welcome, {userName}!</span>
          </div>

          <div className="reader-topbar-right">
            <button className="reader-icon-btn" title="Search Comics">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>

            <button className="reader-icon-btn" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="notif-dot" />
            </button>

            <div className="reader-topbar-divider" />

            <button className="reader-profile-btn">
              <div className="reader-profile-avatar">{userInitials}</div>
              <span>{userName}</span>
            </button>
          </div>
        </header>

        {/* Content Render Area */}
        <div className="reader-page-content">
          
          {/* VIEW 1: HOME */}
          {activeNav === 'home' && (
            <div className="fade-in">
              {/* Hero Featured Comic Banner */}
              <div className="reader-hero-banner">
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--reader-cyan)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Action / Fantasy / Ch 320
                </span>
                <h1 style={{ marginTop: '8px', marginBottom: '12px' }}>Sword God Unrivaled</h1>
                <p>
                  An unknown swordsman emerges from the wastelands, carrying an unsolved mystery. 
                  On his journey to reclaim his memories, he faces the strongest enemies in the world.
                </p>
                <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                  <button className="trans-btn primary" style={{ padding: '10px 24px' }}>Read Now</button>
                  <button className="trans-btn secondary" style={{ padding: '10px 24px' }}>🔖 Bookmark</button>
                </div>
              </div>

              {/* Genre Selection Filter Pills */}
              <div className="reader-genre-pills">
                {genres.map((g) => (
                  <button 
                    key={g} 
                    className={`reader-genre-pill ${selectedGenre === g ? 'active' : ''}`}
                    onClick={() => setSelectedGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Two-Column split structure */}
              <div className="reader-two-col">
                {/* Left Column: Recommended & Updated Lists */}
                <div>
                  {/* Recommended Section */}
                  <div className="reader-section-header">
                    <h2>Recommended Comics</h2>
                    <button className="reader-see-all-btn">
                      View all <span>&rsaquo;</span>
                    </button>
                  </div>

                  <div className="reader-comic-grid">
                    {recommendedComics.map((comic) => (
                      <div key={comic.id} className="reader-comic-card">
                        <div className="reader-comic-cover">
                          <span style={{ fontSize: '32px' }}>{comic.cover}</span>
                          <span className={`comic-badge ${comic.badge.toLowerCase()}`}>{comic.badge}</span>
                        </div>
                        <div className="reader-comic-info">
                          <h4>{comic.title}</h4>
                          <span>{comic.chapter}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Updated Today Section */}
                  <div className="reader-section-header" style={{ marginTop: '24px' }}>
                    <h2>Updated Today</h2>
                    <button className="reader-see-all-btn">
                      View all <span>&rsaquo;</span>
                    </button>
                  </div>

                  <div className="reader-comic-grid">
                    {updatedTodayComics.map((comic) => (
                      <div key={comic.id} className="reader-comic-card">
                        <div className="reader-comic-cover">
                          <span style={{ fontSize: '32px' }}>{comic.cover}</span>
                        </div>
                        <div className="reader-comic-info">
                          <h4>{comic.title}</h4>
                          <span>{comic.chapter}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Community Chat / Feed */}
                <div>
                  <div className="reader-feed-card">
                    <h3>
                      <span>Community Feed</span>
                      <span className="feed-badge">Main Hall</span>
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {communityPosts.map((post) => (
                        <div key={post.id} className="feed-message">
                          <div className="feed-avatar">
                            {post.name.substring(0, 1).toUpperCase()}
                          </div>
                          <div className="feed-content">
                            <div>
                              <span className="feed-name">{post.name}</span>
                              <span className="feed-time">{post.time}</span>
                            </div>
                            <p className="feed-text">{post.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Connected Session Details Panel */}
                  <div className="reader-session-card">
                    <h3>Connected Profile</h3>
                    <div className="reader-session-grid">
                      <div className="reader-session-item">
                        <span className="session-label">Email Address</span>
                        <span className="session-value" style={{ wordBreak: 'break-all' }}>{user.email}</span>
                      </div>
                      <div className="reader-session-item">
                        <span className="session-label">Access Level</span>
                        <div style={{ marginTop: '4px' }}>
                          <span className="reader-role-tag">
                            🛡️ {user.role}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: EXPLORE */}
          {activeNav === 'explore' && (
            <div className="fade-in">
              <div className="reader-hero-banner" style={{ padding: '24px 32px', marginBottom: '24px' }}>
                <h2>Explore Series</h2>
                <p>Browse all available comic series, manhwa, and manga across ComiVerse.</p>
                <div style={{ marginTop: '16px', display: 'flex', gap: '12px', maxWidth: '500px' }}>
                  <input 
                    type="text" 
                    placeholder="Search titles, authors, or genres..." 
                    style={{
                      flex: 1, padding: '10px 16px', background: 'rgba(7, 4, 13, 0.6)', 
                      border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', 
                      color: 'white', outline: 'none'
                    }}
                  />
                  <button className="trans-btn primary" style={{ padding: '0 20px' }}>Search</button>
                </div>
              </div>

              <div className="reader-section-header">
                <h2>All Available Series</h2>
              </div>

              <div className="reader-comic-grid">
                {[...recommendedComics, ...updatedTodayComics].map((comic) => (
                  <div key={comic.id} className="reader-comic-card">
                    <div className="reader-comic-cover">
                      <span style={{ fontSize: '32px' }}>{comic.cover}</span>
                    </div>
                    <div className="reader-comic-info">
                      <h4>{comic.title}</h4>
                      <span>{comic.chapter}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 3: LIBRARY */}
          {activeNav === 'library' && (
            <div className="fade-in">
              <div className="reader-hero-banner" style={{ padding: '24px 32px', marginBottom: '24px' }}>
                <h2>My Reading Library</h2>
                <p>Track your bookmarks and resume reading your saved series.</p>
              </div>

              <div className="reader-section-header">
                <h2>Bookmarked series (2)</h2>
              </div>

              <div className="reader-comic-grid" style={{ marginBottom: '32px' }}>
                {recommendedComics.slice(0, 2).map((comic) => (
                  <div key={comic.id} className="reader-comic-card">
                    <div className="reader-comic-cover">
                      <span style={{ fontSize: '32px' }}>{comic.cover}</span>
                      <span className="comic-badge hot">SAVED</span>
                    </div>
                    <div className="reader-comic-info">
                      <h4>{comic.title}</h4>
                      <span style={{ color: 'var(--reader-cyan)' }}>Resume: {comic.chapter}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="reader-section-header">
                <h2>Recently Viewed</h2>
              </div>

              <div className="reader-comic-grid">
                {updatedTodayComics.slice(0, 3).map((comic) => (
                  <div key={comic.id} className="reader-comic-card">
                    <div className="reader-comic-cover">
                      <span style={{ fontSize: '32px' }}>{comic.cover}</span>
                    </div>
                    <div className="reader-comic-info">
                      <h4>{comic.title}</h4>
                      <span>Last read: {comic.chapter}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 4: FORUM */}
          {activeNav === 'forum' && (
            <div className="fade-in">
              <div className="reader-hero-banner" style={{ padding: '24px 32px', marginBottom: '24px' }}>
                <h2>ComiVerse Community Forum</h2>
                <p>Discuss latest releases, translation requests, and chat with fellow readers.</p>
              </div>

              <div className="reader-feed-card" style={{ background: 'var(--reader-card-bg)', border: '1px solid var(--reader-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3>General Discussions</h3>
                  <button className="trans-btn primary" style={{ fontSize: '12px', padding: '6px 12px' }}>+ New Thread</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { title: 'Sword God Unrivaled Ch 320 discussion group', posts: 142, author: 'DaoMaster' },
                    { title: 'Any scanlation group picking up Demon King?', posts: 89, author: 'MangaLover' },
                    { title: 'ComiVerse website feedback and suggestions', posts: 24, author: 'Minh Khoa' }
                  ].map((thread, index) => (
                    <div key={index} style={{
                      padding: '12px 16px', background: 'rgba(255,255,255,0.02)', 
                      border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px', color: 'white', fontSize: '14px' }}>{thread.title}</h4>
                        <span style={{ fontSize: '12px', color: 'var(--reader-text-muted)' }}>Created by {thread.author}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', color: 'var(--reader-cyan)', fontWeight: '600' }}>{thread.posts} replies</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default Profile
