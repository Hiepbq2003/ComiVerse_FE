import { useEffect, useState } from 'react'
import HomeLayout from '../../components/layout/HomeLayout'
import AdminLayout from '../../components/layout/AdminLayout'
import ModeratorLayout from '../../components/layout/ModeratorLayout'
import TranslatorLayout from '../../components/layout/TranslatorLayout'
import AuthorLayout from '../../components/layout/AuthorLayout'
import '../../assets/style/reader/profile.css'
import { useNavigate } from 'react-router-dom'
import CustomDatePicker from '../../components/common/CustomDatePicker'
import {
  changePasswordApi,
  getMeApi,
  getUserInteractionCountsApi,
  updateProfileApi,
  uploadAvatarApi,
} from '../../services/api/AuthApi'
import { getUserRatingsApi } from '../../services/api/RatingApi'
import {
  getNotificationPreferencesApi,
  updateNotificationPreferencesApi,
} from '../../services/api/NotificationApi'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { getAuth } from '../../utils/Auth'

const COMMON_NOTIFICATION_OPTIONS = [
  {
    title: 'General Notifications',
    options: [
      { key: 'SYSTEM_BROADCASTS', label: 'System broadcasts', description: 'Platform announcements and maintenance updates sent by administrators.' },
      { key: 'FORUM_ACTIVITY', label: 'Discussion replies', description: 'Replies to your forum, comic, and chapter comments, with a direct link to the discussion.' },
    ],
  },
]

const ROLE_NOTIFICATION_OPTIONS = {
  MODERATOR: [{ title: 'Moderator Workspace', options: [
    { key: 'REVIEW_QUEUE', label: 'Review queue', description: 'New comic and chapter submissions waiting for moderation.' },
  ] }],
  STAFF: [{ title: 'Moderator Workspace', options: [
    { key: 'REVIEW_QUEUE', label: 'Review queue', description: 'New comic and chapter submissions waiting for moderation.' },
  ] }],
  AUTHOR: [{ title: 'Author Hub', options: [
    { key: 'SUBMISSION_STATUS', label: 'Submission status', description: 'Approval, rejection, and change requests for your submitted work.' },
  ] }],
  TRANSLATOR: [{ title: 'Translator Hub', options: [
    { key: 'PROJECT_OPPORTUNITIES', label: 'Project opportunities', description: 'New translation projects available in the project pool.' },
    { key: 'TEAM_UPDATES', label: 'Team updates', description: 'Project claims, team decisions, and workflow updates affecting you.' },
  ] }],
  PROJECT_LEADER: [{ title: 'Project Leader Workspace', options: [
    { key: 'PROJECT_OPPORTUNITIES', label: 'Project opportunities', description: 'New translation projects available in the project pool.' },
    { key: 'TEAM_UPDATES', label: 'Team updates', description: 'Project claims, team decisions, and workflow updates affecting you.' },
    { key: 'TEAM_JOIN_REQUESTS', label: 'Team join requests', description: 'Applications from translators who want to join your project team.' },
  ] }],
}

// ── ROLE-SPECIFIC STATISTICS COMPONENTS ────────────────────────────

function ReaderStats({ stats, loading }) {
  if (loading) {
    return (
      <div className="profile-stats-list">
        <div style={{ color: 'var(--profile-text-muted)', fontSize: '13px', textAlign: 'center', padding: '8px 0' }}>
          Loading stats...
        </div>
      </div>
    )
  }

  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row">
        <span>Comics liked</span>
        <span className="profile-stats-value">{(stats?.likedCount ?? 0).toLocaleString()}</span>
      </div>
      <div className="profile-stats-row">
        <span>Comics saved</span>
        <span className="profile-stats-value">{(stats?.savedCount ?? 0).toLocaleString()}</span>
      </div>
      <div className="profile-stats-row">
        <span>Comics read</span>
        <span className="profile-stats-value">{(stats?.readCount ?? 0).toLocaleString()}</span>
      </div>
      <div className="profile-stats-row">
        <span>Comics rated</span>
        <span className="profile-stats-value">{(stats?.ratingCount ?? 0).toLocaleString()}</span>
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

function ProjectLeaderStats() {
  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row">
        <span>Projects led</span>
        <span className="profile-stats-value">8</span>
      </div>
      <div className="profile-stats-row">
        <span>Active teams</span>
        <span className="profile-stats-value">4</span>
      </div>
      <div className="profile-stats-row">
        <span>Chapters delivered</span>
        <span className="profile-stats-value">196</span>
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

function ModeratorStats({ assignedLanguages = ['Japanese', 'Korean'] }) {
  const langs = Array.isArray(assignedLanguages) && assignedLanguages.length > 0
    ? assignedLanguages
    : ['Japanese', 'Korean'];

  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
        <span>Assigned Scope</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {langs.map(l => (
            <span key={l} className="profile-lang-chip">🌐 {l}</span>
          ))}
        </div>
      </div>
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

// Main profile page

function Profile({ user: userProp }) {
  const navigate = useNavigate()
  const { user: authUser, updateUser } = useAuth()
  
  // Safely resolve user from prop, auth context, or localStorage fallback
  const user = userProp || authUser || getAuth()?.user || null

  const [activeTab, setActiveTab] = useState('info') // 'info' | 'password' | 'notifications' | 'ratings'
  const [interactionCounts, setInteractionCounts] = useState({
    likedCount: 0,
    savedCount: 0,
    readCount: 0,
    ratingCount: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setStatsLoading(false)
      return
    }
    const fetchInteractionCounts = async () => {
      try {
        setStatsLoading(true)
        const res = await getUserInteractionCountsApi()
        if (res) {
          setInteractionCounts({
            likedCount: res.likedCount ?? 0,
            savedCount: res.savedCount ?? 0,
            readCount: res.readCount ?? 0,
            ratingCount: res.ratingCount ?? 0
          })
        }
      } catch (err) {
        console.error('Failed to fetch user interaction counts:', err)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchInteractionCounts()
  }, [user?.id, user?.userId])

  const [userRatings, setUserRatings] = useState([])
  const [ratingsLoading, setRatingsLoading] = useState(false)

  useEffect(() => {
    if (user && activeTab === 'ratings') {
      const fetchRatings = async () => {
        try {
          setRatingsLoading(true)
          const res = await getUserRatingsApi()
          const list = res?.data || res || []
          setUserRatings(Array.isArray(list) ? list : [])
        } catch (err) {
          console.error('Failed to fetch user ratings:', err)
        } finally {
          setRatingsLoading(false)
        }
      }
      fetchRatings()
    }
  }, [activeTab, user?.id, user?.userId])

  const parseFullName = (fullName) => {
    if (!fullName) return { first: '', last: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { first: parts[0], last: '' };
    const last = parts.pop();
    const first = parts.join(' ');
    return { first, last };
  }

  const initialName = parseFullName(user?.fullName || '');
  const roleName = user?.role || 'Reader'
  const roleUpper = roleName.toUpperCase().replace(/[\s-]+/g, '_')

  // Form states for Basic Info
  const [firstName, setFirstName] = useState(initialName.first || '')
  const [lastName, setLastName] = useState(initialName.last || '')
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(user?.backgroundImageUrl || '')
  const [assignedLanguages, setAssignedLanguages] = useState(
    Array.isArray(user?.assignedLanguages) && user.assignedLanguages.length > 0
      ? user.assignedLanguages
      : ['Japanese', 'Korean']
  )

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [notifSettings, setNotifSettings] = useState({})
  const [availableNotifKeys, setAvailableNotifKeys] = useState([])
  const [notifLoading, setNotifLoading] = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getMeApi()
      .then(serverProfile => {
        if (cancelled) return
        const name = parseFullName(serverProfile.fullName || '')
        setFirstName(name.first)
        setLastName(name.last)
        setUsername(serverProfile.username || '')
        setEmail(serverProfile.email || '')
        setDateOfBirth(serverProfile.dateOfBirth || '')
        setBio(serverProfile.bio || '')
        setAvatarUrl(serverProfile.avatarUrl || '')
        setBackgroundImageUrl(serverProfile.backgroundImageUrl || '')
        updateUser({ ...user, ...serverProfile })
      })
      .catch(err => {
        if (!cancelled) toast.error(err.response?.data?.message || 'Failed to load the latest profile information.')
      })
    return () => { cancelled = true }
  }, [user?.id, user?.userId])

  useEffect(() => {
    if (!user) {
      setNotifLoading(false)
      return
    }
    let cancelled = false
    setNotifLoading(true)
    getNotificationPreferencesApi()
      .then(response => {
        if (cancelled) return
        setNotifSettings(response?.preferences || {})
        setAvailableNotifKeys(response?.availableKeys || [])
      })
      .catch(err => {
        if (!cancelled) toast.error(err.response?.data?.message || 'Failed to load notification preferences.')
      })
      .finally(() => {
        if (!cancelled) setNotifLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.id, user?.userId, roleUpper])

  const handleToggleNotifSetting = (key) => {
    setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))
  };

  const handleSaveNotifSettings = async (e) => {
    e.preventDefault()
    setNotifSaving(true)
    try {
      const response = await updateNotificationPreferencesApi(notifSettings)
      setNotifSettings(response?.preferences || notifSettings)
      setAvailableNotifKeys(response?.availableKeys || availableNotifKeys)
      toast.success('Notification preferences saved successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save notification preferences.')
    } finally {
      setNotifSaving(false)
    }
  };

  const buildProfilePayload = (overrides = {}) => ({
    fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
    avatarUrl,
    backgroundImageUrl,
    dateOfBirth: dateOfBirth || null,
    bio: bio.trim() || null,
    ...overrides,
  })

  const applySavedProfile = (savedProfile) => {
    setDateOfBirth(savedProfile.dateOfBirth || '')
    setBio(savedProfile.bio || '')
    setAvatarUrl(savedProfile.avatarUrl || '')
    setBackgroundImageUrl(savedProfile.backgroundImageUrl || '')
    updateUser({ ...user, ...savedProfile, assignedLanguages })
  }

  if (!user) {
    return (
      <HomeLayout>
        <div style={{ textAlign: 'center', padding: '120px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: 'white', marginBottom: '8px' }}>Session Required</h2>
          <p style={{ marginBottom: '24px' }}>Please log in to view and manage your profile.</p>
          <button className="btn-home-primary" onClick={() => navigate('/auth?mode=signin')}>
            Sign In
          </button>
        </div>
      </HomeLayout>
    )
  }

  const handleSaveInfo = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    try {
      const savedProfile = await updateProfileApi(buildProfilePayload())
      applySavedProfile(savedProfile)
      toast.success('Basic Info changes saved successfully!')
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to save changes.'
      toast.error(errMsg)
    } finally {
      setProfileSaving(false)
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
      
      const savedProfile = await updateProfileApi(buildProfilePayload({ avatarUrl: uploadedUrl }));
      applySavedProfile(savedProfile);
      
      toast.success('Avatar uploaded successfully!');
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to upload image.';
      toast.error(errMsg);
    }
  };

  const handleBackgroundChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 4 * 1024 * 1024) {
      toast.error('Background image must be 4MB or smaller.')
      return
    }

    try {
      const uploadToast = toast.info('Uploading background image...', { autoClose: false })
      const uploadedUrl = await uploadAvatarApi(file)
      toast.dismiss(uploadToast)

      setBackgroundImageUrl(uploadedUrl)

      const savedProfile = await updateProfileApi(buildProfilePayload({ backgroundImageUrl: uploadedUrl }))
      applySavedProfile(savedProfile)

      toast.success('Profile background uploaded successfully!')
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to upload background image.'
      toast.error(errMsg)
    }
  }

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
        return <ModeratorStats assignedLanguages={assignedLanguages} />
      case 'TRANSLATOR':
        return <TranslatorStats />
      case 'PROJECT_LEADER':
        return <ProjectLeaderStats />
      case 'READER':
      case 'USER':
      default:
        return <ReaderStats stats={interactionCounts} loading={statsLoading} />
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

  const roleInfo = roleUpper === 'PROJECT_LEADER'
    ? { label: 'Project Leader', className: 'project-leader', icon: 'PL' }
    : getRoleInfo()
  const displayUserName = `${firstName} ${lastName}`.trim() || user.fullName || 'Minh Khoa'
  const userInitials = displayUserName.substring(0, 2).toUpperCase()

  const LayoutComponent = HomeLayout
  const layoutProps = {}

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

      <section
        className="profile-cover-section"
        style={backgroundImageUrl ? { backgroundImage: `url(${backgroundImageUrl})` } : undefined}
      >
        <div className="profile-cover-overlay">
          <div>
            <span className="profile-cover-kicker">Profile background</span>
            <h2>{displayUserName}</h2>
          </div>
          <label className="profile-cover-upload-btn" htmlFor="profile-background-input">
            Upload background
          </label>
          <input
            id="profile-background-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleBackgroundChange}
          />
        </div>
      </section>

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
              <button 
                className={`profile-sidebar-nav-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('notifications')}
              >
                🔔 Notification Settings
              </button>
              <button 
                className={`profile-sidebar-nav-btn ${activeTab === 'ratings' ? 'active' : ''}`}
                onClick={() => setActiveTab('ratings')}
              >
                ⭐ My Ratings
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

                <div className="profile-input-group">
                  <label>Profile Background</label>
                  <div className="profile-background-upload-row">
                    <input
                      type="text"
                      value={backgroundImageUrl}
                      onChange={(e) => setBackgroundImageUrl(e.target.value)}
                      placeholder="https://.../background.jpg"
                    />
                    <label className="profile-background-upload-btn" htmlFor="profile-background-input">
                      Upload image
                    </label>
                  </div>
                  <p className="profile-input-desc">PNG, JPG up to 4MB. This background is shown on profiles for every role.</p>
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

                {/* Username (Immutable Handle) */}
                <div className="profile-input-group">
                  <label>Username (Account Handle)</label>
                  <input 
                    type="text" 
                    value={username} 
                    readOnly
                    disabled
                    className="profile-input-readonly"
                  />
                  <p className="profile-input-desc">🔒 Unique account handle. Username is immutable and cannot be changed.</p>
                </div>

                {/* Email (Verified, Immutable) */}
                <div className="profile-input-group">
                  <label>Email Address</label>
                  <div className="profile-email-container">
                    <input 
                      type="email" 
                      value={email} 
                      readOnly
                      disabled
                      className="profile-input-readonly"
                    />
                    <span className="profile-email-badge">Verified</span>
                  </div>
                  <p className="profile-input-desc">🔒 Account email address linked to your profile identity.</p>
                </div>

                {/* Date of Birth */}
                <div className="profile-input-group">
                  <label>Date of Birth</label>
                  <CustomDatePicker 
                    value={dateOfBirth} 
                    onChange={(val) => setDateOfBirth(val)} 
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

                {/* Moderator Specific: Assigned Scope (Read-Only, Assigned by Admin) */}
                {roleUpper === 'MODERATOR' && (
                  <div className="profile-input-group">
                    <label>Assigned Moderation Languages (Scope)</label>
                    <div className="profile-readonly-scope-container">
                      {assignedLanguages.map((lang) => (
                        <span key={lang} className="profile-readonly-scope-badge">
                          🌐 {lang}
                        </span>
                      ))}
                    </div>
                    <p className="profile-input-desc">
                      Moderation tasks, chat monitoring, and comic review queues will be filtered based on your assigned language scope.
                    </p>
                  </div>
                )}

                <button type="submit" className="profile-save-btn" disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          ) : activeTab === 'password' ? (
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
          ) : activeTab === 'notifications' ? (
            <div className="fade-in">
              <h2 className="profile-content-title">Notification Settings</h2>
              <p className="profile-input-desc" style={{ marginBottom: '24px', fontSize: '13px' }}>
                Choose which in-app workflow notifications you receive for your current role.
              </p>

              {notifLoading ? (
                <p className="profile-input-desc">Loading notification preferences...</p>
              ) : (
                <form onSubmit={handleSaveNotifSettings}>
                  {[...(ROLE_NOTIFICATION_OPTIONS[roleUpper] || []), ...COMMON_NOTIFICATION_OPTIONS].map(section => {
                    const options = section.options.filter(option => availableNotifKeys.includes(option.key))
                    if (options.length === 0) return null
                    return (
                      <div className="profile-notif-group" key={section.title}>
                        <h3 className="profile-notif-group-title">{section.title}</h3>
                        {options.map(option => (
                          <div className="profile-notif-item" key={option.key}>
                            <div>
                              <strong>{option.label}</strong>
                              <p>{option.description}</p>
                            </div>
                            <label className="profile-switch">
                              <input
                                type="checkbox"
                                checked={notifSettings[option.key] !== false}
                                onChange={() => handleToggleNotifSetting(option.key)}
                              />
                              <span className="profile-slider" />
                            </label>
                          </div>
                        ))}
                      </div>
                    )
                  })}

                  <button type="submit" className="profile-save-btn" disabled={notifSaving}>
                    {notifSaving ? 'Saving...' : 'Save Notification Preferences'}
                  </button>
                </form>
              )}
            </div>
          ) : activeTab === 'ratings' ? (
            <div className="fade-in">
              <h2 className="profile-content-title">My Rated Comics</h2>
              <p className="profile-input-desc" style={{ marginBottom: '24px', fontSize: '13px' }}>
                A complete history of all comics you have rated and reviewed.
              </p>

              {ratingsLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  Loading your rated comics...
                </div>
              ) : userRatings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>⭐</span>
                  <h4 style={{ color: 'white', margin: '0 0 8px' }}>No Rated Comics Yet</h4>
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    You haven't rated any comics yet. Explore titles and drop your star ratings!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                  {userRatings.map((item) => {
                    const comicObj = item.comic || item;
                    const comicId = comicObj.id || item.comicId;
                    const comicTitle = comicObj.title || 'Untitled Comic';
                    const userScoreVal = item.score || item.userScore || 5;

                    return (
                      <div
                        key={item.id || comicId}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s, border-color 0.2s'
                        }}
                        onClick={() => navigate(`/comic/${comicId}`)}
                      >
                        {comicObj.cover && (
                          <img
                            src={comicObj.cover}
                            alt={comicTitle}
                            style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px' }}
                          />
                        )}
                        <div>
                          <h4 style={{ margin: '0 0 4px', fontSize: '14px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {comicTitle}
                          </h4>
                          <span style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 'bold' }}>
                            ⭐ Rated: {userScoreVal} / 5
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </LayoutComponent>
  )
}

export default Profile
