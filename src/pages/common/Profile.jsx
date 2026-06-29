import { useState } from 'react'
import '../../assets/style/reader/profile.css'

// ── ROLE-SPECIFIC STATISTICS COMPONENTS ────────────────────────────

function ReaderStats() {
  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row">
        <span>Comics saved</span>
        <span className="profile-stats-value">24</span>
      </div>
      <div className="profile-stats-row">
        <span>Chapters read</span>
        <span className="profile-stats-value">1,482</span>
      </div>
      <div className="profile-stats-row">
        <span>Comments</span>
        <span className="profile-stats-value">63</span>
      </div>
    </div>
  )
}

function TranslatorStats() {
  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row">
        <span>Comics translated</span>
        <span className="profile-stats-value">12</span>
      </div>
      <div className="profile-stats-row">
        <span>Chapters translated</span>
        <span className="profile-stats-value">128</span>
      </div>
      <div className="profile-stats-row">
        <span>Group members</span>
        <span className="profile-stats-value">6</span>
      </div>
    </div>
  )
}

function AuthorStats() {
  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row">
        <span>Comics published</span>
        <span className="profile-stats-value">3</span>
      </div>
      <div className="profile-stats-row">
        <span>Total views</span>
        <span className="profile-stats-value">254K</span>
      </div>
      <div className="profile-stats-row">
        <span>Subscribers</span>
        <span className="profile-stats-value">15.2K</span>
      </div>
    </div>
  )
}

function ModeratorStats() {
  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row">
        <span>Reports resolved</span>
        <span className="profile-stats-value">412</span>
      </div>
      <div className="profile-stats-row">
        <span>Comics checked</span>
        <span className="profile-stats-value">84</span>
      </div>
      <div className="profile-stats-row">
        <span>Banned users</span>
        <span className="profile-stats-value">15</span>
      </div>
    </div>
  )
}

function AdminStats() {
  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row">
        <span>Total users managed</span>
        <span className="profile-stats-value">15.2K</span>
      </div>
      <div className="profile-stats-row">
        <span>Global logs audited</span>
        <span className="profile-stats-value">2,450</span>
      </div>
      <div className="profile-stats-row">
        <span>Settings updated</span>
        <span className="profile-stats-value">38</span>
      </div>
    </div>
  )
}

// ── MAIN PROFILE PAGE COMPONENT ────────────────────────────────────

function Profile({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('info') // 'info' | 'password'

  // Form states for Basic Info
  const [firstName, setFirstName] = useState('Minh')
  const [lastName, setLastName] = useState('Khoa')
  const [username, setUsername] = useState(user.username || 'minhkhoa_dev')
  const [email, setEmail] = useState(user.email || 'minhkhoa@gmail.com')
  const [dateOfBirth, setDateOfBirth] = useState('1999-05-15')
  const [bio, setBio] = useState('')

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const roleName = user.role || 'Reader'
  const roleUpper = roleName.toUpperCase()

  const handleSaveInfo = (e) => {
    e.preventDefault()
    alert('Basic Info changes saved successfully!')
  }

  const handleSavePassword = (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      alert('New password and confirm password do not match!')
      return
    }
    alert('Password updated successfully!')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  // Render stats dynamically based on role
  const renderStats = () => {
    switch (roleUpper) {
      case 'ADMIN':
        return <AdminStats />
      case 'AUTHOR':
        return <AuthorStats />
      case 'MODERATOR':
      case 'STAFF':
        return <ModeratorStats />
      case 'TRANSLATOR':
        return <TranslatorStats />
      case 'READER':
      case 'USER':
      default:
        return <ReaderStats />
    }
  }

  // Helper for role details
  const getRoleInfo = () => {
    switch (roleUpper) {
      case 'ADMIN':
        return { label: 'Admin', className: 'admin', icon: '🛡️' }
      case 'AUTHOR':
        return { label: 'Author', className: 'author', icon: '✍️' }
      case 'MODERATOR':
      case 'STAFF':
        return { label: 'Moderator', className: 'moderator', icon: '⚖️' }
      case 'TRANSLATOR':
        return { label: 'Translator', className: 'translator', icon: '🌐' }
      case 'READER':
      case 'USER':
      default:
        return { label: 'Reader', className: 'reader', icon: '📖' }
    }
  }

  const roleInfo = getRoleInfo()
  const displayUserName = `${firstName} ${lastName}`.trim() || user.fullName || 'Minh Khoa'
  const userInitials = displayUserName.substring(0, 2).toUpperCase()

  return (
    <div className="profile-page-wrapper">
      {/* ── TOP SITE HEADER ──────────────────────────────── */}
      <header className="profile-site-header">
        <div className="profile-brand">
          <div className="profile-brand-icon">📚</div>
          <span>ComiVerse</span>
        </div>

        <nav className="profile-site-nav">
          <a href="#home" className="profile-nav-link active">Home</a>
          <a href="#explore" className="profile-nav-link">Explore</a>
          <a href="#ranking" className="profile-nav-link">Ranking</a>
          <a href="#library" className="profile-nav-link">Library</a>
          <a href="#forum" className="profile-nav-link">Forum</a>
        </nav>

        <div className="profile-header-actions">
          <div className="profile-search-bar">
            <input type="text" placeholder="Search..." className="profile-search-input" />
          </div>

          <button className="profile-picture-upload-btn" style={{ background: '#f8fafc' }}>
            👑 Premium
          </button>

          {roleUpper !== 'READER' && roleUpper !== 'USER' && (
            <button className="profile-workspace-btn">
              Workspace
            </button>
          )}

          <button className="profile-user-menu" onClick={onLogout}>
            <div className="profile-user-avatar">{userInitials}</div>
            <span>{displayUserName}</span>
          </button>
        </div>
      </header>

      {/* ── SUB BACK-BAR ─────────────────────────────────── */}
      <div className="profile-back-bar">
        <button className="profile-back-btn" onClick={() => window.history.back()}>
          &larr; Back
        </button>
        <span>/</span>
        <span className="profile-page-title">My Profile</span>
      </div>

      {/* ── GRID LAYOUT ──────────────────────────────────── */}
      <div className="profile-grid-container">
        {/* Left Column: Sidebar Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="profile-sidebar-card">
            <div className="profile-avatar-container">
              <div className="profile-avatar-main">
                {userInitials}
              </div>
              <label className="profile-avatar-upload-icon" title="Upload Photo">
                📷
              </label>
            </div>

            <h3 className="profile-sidebar-name">{displayUserName}</h3>
            <span className="profile-sidebar-joined">Member since 2023</span>

            <span className={`profile-role-badge ${roleInfo.className}`}>
              {roleInfo.icon} {roleInfo.label}
            </span>

            <div className="profile-sidebar-nav">
              <button 
                className={`profile-sidebar-nav-btn ${activeTab === 'info' ? 'active' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                👤 Basic Info
              </button>
              <button 
                className={`profile-sidebar-nav-btn ${activeTab === 'password' ? 'active' : ''}`}
                onClick={() => setActiveTab('password')}
              >
                🔒 Change Password
              </button>
            </div>

            {/* Stats Block */}
            <div className="profile-stats-card">
              <h4 className="profile-stats-title">Stats</h4>
              {renderStats()}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Form Panels */}
        <div className="profile-content-card">
          {activeTab === 'info' ? (
            <div className="fade-in">
              <h2 className="profile-content-title">Basic Info</h2>
              
              <form onSubmit={handleSaveInfo}>
                {/* Profile Picture Upload row */}
                <div className="profile-picture-edit-sec">
                  <div className="profile-picture-edit-avatar">
                    {userInitials}
                  </div>
                  <div>
                    <button type="button" className="profile-picture-upload-btn">
                      Upload photo
                    </button>
                    <p className="profile-picture-upload-text">PNG, JPG up to 2MB</p>
                  </div>
                </div>

                {/* Names row */}
                <div className="profile-form-grid">
                  <div className="profile-input-group">
                    <label>First Name</label>
                    <input 
                      type="text" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="profile-input-group">
                    <label>Last Name</label>
                    <input 
                      type="text" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="profile-input-group">
                  <label>Username</label>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                  />
                  <p className="profile-input-desc">Can only be changed once every 30 days</p>
                </div>

                {/* Email (verified) */}
                <div className="profile-input-group">
                  <label>Email</label>
                  <div className="profile-email-container">
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                    />
                    <span className="profile-email-badge">Verified</span>
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="profile-input-group">
                  <label>Date of Birth</label>
                  <input 
                    type="date" 
                    value={dateOfBirth} 
                    onChange={(e) => setDateOfBirth(e.target.value)} 
                    required 
                  />
                </div>

                {/* Bio */}
                <div className="profile-input-group">
                  <label>Bio</label>
                  <textarea 
                    rows="4" 
                    placeholder="Write a few lines about yourself..." 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>

                <button type="submit" className="profile-save-btn">
                  Save Changes
                </button>
              </form>
            </div>
          ) : (
            <div className="fade-in">
              <h2 className="profile-content-title">Change Password</h2>
              
              <form onSubmit={handleSavePassword}>
                <div className="profile-input-group">
                  <label>Current Password</label>
                  <input 
                    type="password" 
                    placeholder="Enter current password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    required 
                  />
                </div>

                <div className="profile-input-group">
                  <label>New Password</label>
                  <input 
                    type="password" 
                    placeholder="Enter new password (min. 8 chars)" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    required 
                  />
                </div>

                <div className="profile-input-group">
                  <label>Confirm New Password</label>
                  <input 
                    type="password" 
                    placeholder="Confirm new password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                  />
                </div>

                <button type="submit" className="profile-save-btn">
                  Change Password
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
