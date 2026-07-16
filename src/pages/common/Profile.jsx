import { useState } from 'react'
import HomeLayout from '../../components/layout/HomeLayout'
import AdminLayout from '../../components/layout/AdminLayout'
import ModeratorLayout from '../../components/layout/ModeratorLayout'
import TranslatorLayout from '../../components/layout/TranslatorLayout'
import AuthorLayout from '../../components/layout/AuthorLayout'
import '../../assets/style/reader/profile.css'
import { changePasswordApi, updateProfileApi, uploadAvatarApi } from '../../services/api/AuthApi'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { setAuth } from '../../utils/Auth'

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

function Profile({ user }) {
  const { updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('info') // 'info' | 'password'

  const parseFullName = (fullName) => {
    if (!fullName) return { first: '', last: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { first: parts[0], last: '' };
    const last = parts.pop();
    const first = parts.join(' ');
    return { first, last };
  }

  const initialName = parseFullName(user.fullName || '');

  // Form states for Basic Info
  const [firstName, setFirstName] = useState(initialName.first || '')
  const [lastName, setLastName] = useState(initialName.last || '')
  const [username, setUsername] = useState(user.username || '')
  const [email, setEmail] = useState(user.email || '')
  const [dateOfBirth, setDateOfBirth] = useState('1999-05-15')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '')

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const roleName = user.role || 'Reader'
  const roleUpper = roleName.toUpperCase()

  const handleSaveInfo = async (e) => {
    e.preventDefault()
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
    try {
      await updateProfileApi(fullName, avatarUrl)
      const updatedUser = {
        ...user,
        fullName,
        avatarUrl
      }
      updateUser(updatedUser)
      toast.success('Basic Info changes saved successfully!')
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save changes.'
      toast.error(errMsg)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds 2MB limit!');
      return;
    }
    
    try {
      const uploadToast = toast.info('Uploading avatar...', { autoClose: false });
      const uploadedUrl = await uploadAvatarApi(file);
      toast.dismiss(uploadToast);
      
      setAvatarUrl(uploadedUrl);
      
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await updateProfileApi(fullName, uploadedUrl);
      
      const updatedUser = {
        ...user,
        fullName,
        avatarUrl: uploadedUrl
      };
      updateUser(updatedUser);
      
      toast.success('Avatar uploaded successfully!');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to upload image.';
      toast.error(errMsg);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error('New password must have at least 6 characters!')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirm password do not match!')
      return
    }
    try {
      await changePasswordApi(currentPassword, newPassword)
      toast.success('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update password. Please try again.'
      toast.error(errMsg)
    }
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

  let LayoutComponent = HomeLayout
  let layoutProps = {}

  if (roleUpper === 'ADMIN') {
    LayoutComponent = AdminLayout
    layoutProps = { activeNav: 'profile' }
  } else if (roleUpper === 'MODERATOR' || roleUpper === 'STAFF') {
    LayoutComponent = ModeratorLayout
    layoutProps = { activeNav: 'profile' }
  } else if (roleUpper === 'TRANSLATOR') {
    LayoutComponent = TranslatorLayout
    layoutProps = { activeNav: 'profile' }
  } else if (roleUpper === 'AUTHOR') {
    LayoutComponent = AuthorLayout
    layoutProps = { activeNav: 'profile' }
  }

  return (
    <LayoutComponent {...layoutProps}>
      <div className="profile-page-wrapper">
      {/* ── TOP SITE HEADER ──────────────────────────────── */}


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
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="profile-avatar-img" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--profile-purple)' }} />
              ) : (
                <div className="profile-avatar-main">
                  {userInitials}
                </div>
              )}
              <label className="profile-avatar-upload-icon" title="Upload Photo" htmlFor="avatar-file-input">
                📷
              </label>
              <input 
                type="file" 
                id="avatar-file-input" 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleAvatarChange} 
              />
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
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--profile-purple)' }} />
                  ) : (
                    <div className="profile-picture-edit-avatar">
                      {userInitials}
                    </div>
                  )}
                  <div>
                    <label className="profile-picture-upload-btn" htmlFor="avatar-file-input" style={{ cursor: 'pointer', display: 'inline-block', padding: '8px 16px', background: 'var(--profile-purple)', borderRadius: '8px', color: 'white', fontWeight: '600' }}>
                      Upload photo
                    </label>
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
    </LayoutComponent>
  )
}

export default Profile
