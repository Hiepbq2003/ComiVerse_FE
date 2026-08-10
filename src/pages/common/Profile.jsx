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
import { getMyProjectTeamsApi, getAllProjectTeamsApi } from '../../services/api/ProjectTeamApi'
import { getModeratorScope } from '../../utils/moderatorScope'
import { getMyTranslatorProfileApi, updateMyTranslatorProfileApi } from '../../services/api/TranslatorApi'
import { uploadFileApi } from '../../services/api/UploadApi'
import { COMIC_LANGUAGE_OPTIONS } from '../../constants/comicLanguages'
const COMMON_NOTIFICATION_OPTIONS = [
  {
    title: 'General Notifications',
    options: [
      { key: 'SYSTEM_BROADCASTS', label: 'System broadcasts', description: 'Platform announcements and maintenance updates sent by administrators.' },
      { key: 'COMMENT_REPLIES', label: 'Comment replies', description: 'Direct replies to your comic and chapter comments.' },
      { key: 'FORUM_ACTIVITY', label: 'Discussion replies', description: 'Replies to your forum threads and community discussion posts.' },
    ],
  },
]

const ROLE_NOTIFICATION_OPTIONS = {
  MODERATOR: [{ title: 'Moderator Workspace', options: [
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

function TranslatorStats({ teams = [], loading = false }) {
  if (loading) {
    return (
      <div className="profile-stats-list">
        <div className="profile-stats-row"><span>Comics translated</span><span className="profile-stats-value">...</span></div>
        <div className="profile-stats-row"><span>Chapters translated</span><span className="profile-stats-value">...</span></div>
        <div className="profile-stats-row"><span>Group members</span><span className="profile-stats-value">...</span></div>
      </div>
    )
  }

  const uniqueComics = new Set(teams.map(t => (t.comicName || t.comic_name || t.title || '').toLowerCase().trim()).filter(Boolean)).size
  const totalChapters = teams.reduce((acc, t) => acc + (Number(t.chaptersCount || t.chapters_count) || 0), 0)
  const totalMembers = teams.reduce((acc, t) => acc + (Number(t.membersCount || t.members_count) || 1), 0)

  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row">
        <span>Comics translated</span>
        <span className="profile-stats-value">{uniqueComics}</span>
      </div>
      <div className="profile-stats-row">
        <span>Chapters translated</span>
        <span className="profile-stats-value">{totalChapters}</span>
      </div>
      <div className="profile-stats-row">
        <span>Group members</span>
        <span className="profile-stats-value">{totalMembers}</span>
      </div>
    </div>
  )
}

function ProjectLeaderStats({ teams = [], loading = false }) {
  if (loading) {
    return (
      <div className="profile-stats-list">
        <div className="profile-stats-row"><span>Projects led</span><span className="profile-stats-value">...</span></div>
        <div className="profile-stats-row"><span>Active teams</span><span className="profile-stats-value">...</span></div>
        <div className="profile-stats-row"><span>Chapters delivered</span><span className="profile-stats-value">...</span></div>
      </div>
    )
  }

  const projectsLed = teams.length
  const activeTeams = teams.filter(t => (t.status || 'Active').toLowerCase() === 'active').length
  const totalChaptersDelivered = teams.reduce((acc, t) => acc + (Number(t.chaptersCount || t.chapters_count) || 0), 0)

  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row">
        <span>Projects led</span>
        <span className="profile-stats-value">{projectsLed}</span>
      </div>
      <div className="profile-stats-row">
        <span>Active teams</span>
        <span className="profile-stats-value">{activeTeams}</span>
      </div>
      <div className="profile-stats-row">
        <span>Chapters delivered</span>
        <span className="profile-stats-value">{totalChaptersDelivered}</span>
      </div>
    </div>
  )
}

function AuthorStats() {
  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row">
        <span className="profile-stats-value" style={{ fontSize: '14px', color: 'var(--text)' }}>No statistics available yet.</span>
      </div>
    </div>
  )
}

function ModeratorStats({ assignedLanguages = ['Japanese', 'Korean'] }) {
  const langs = Array.isArray(assignedLanguages) && assignedLanguages.length > 0
    ? assignedLanguages
    : ['Japanese', 'Korean'];

  const isGlobal = langs.length >= 7 || langs.some(s => ['global', 'all', 'any', '*'].includes(String(s).toLowerCase()));

  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
        <span>Assigned Scope</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {isGlobal ? (
            <span className="profile-lang-chip">🌐 All Languages</span>
          ) : (
            langs.map(l => (
              <span key={l} className="profile-lang-chip">🌐 {l}</span>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function AdminStats() {
  return (
    <div className="profile-stats-list">
      <div className="profile-stats-row">
        <span>Assigned Scope</span>
        <span className="profile-stats-value">Full System</span>
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

  const [projectTeams, setProjectTeams] = useState([])
  const [projectTeamsLoading, setProjectTeamsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProjectTeamsLoading(false)
      return
    }
    const fetchTeams = async () => {
      try {
        setProjectTeamsLoading(true)
        const [myRes, allRes] = await Promise.all([
          getMyProjectTeamsApi().catch(() => []),
          getAllProjectTeamsApi().catch(() => [])
        ])
        const myTeams = Array.isArray(myRes) ? myRes : (myRes?.content || myRes?.data || [])
        const allTeams = Array.isArray(allRes) ? allRes : (allRes?.content || allRes?.data || [])

        const map = new Map()
        myTeams.forEach(t => { if (t && t.id) map.set(t.id, t) })

        const curName = (user.fullName || user.username || user.name || '').toLowerCase().trim()
        const curId = user.id || user.userId

        allTeams.forEach(t => {
          if (!t || !t.id) return
          const lName = (t.leaderName || '').toLowerCase().trim()
          const lId = t.leaderId || t.leader_id
          if ((lId && lId === curId) || (lName && lName === curName)) {
            map.set(t.id, t)
          }
        })

        setProjectTeams(Array.from(map.values()))
      } catch (err) {
        console.error('Failed to fetch project teams for stats:', err)
      } finally {
        setProjectTeamsLoading(false)
      }
    }
    fetchTeams()
  }, [user?.id, user?.userId, user?.username, user?.fullName])

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
  const [assignedLanguages, setAssignedLanguages] = useState(() => {
    const rawScope = getModeratorScope(user);
    return rawScope.map(lang => lang.charAt(0).toUpperCase() + lang.slice(1));
  })

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Translator Profile states
  const [translatorProfile, setTranslatorProfile] = useState(null)
  const [transSpecializations, setTransSpecializations] = useState([])
  const [transExp, setTransExp] = useState(0)
  const [transPhone, setTransPhone] = useState('')
  const [transFacebook, setTransFacebook] = useState('')
  const [transCvUrl, setTransCvUrl] = useState('')
  const [transBio, setTransBio] = useState('')
  const [isTranslator, setIsTranslator] = useState(false)
  const [cvUploading, setCvUploading] = useState(false)

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

  // Load Translator Profile
  useEffect(() => {
    if (!user) return
    let cancelled = false
    getMyTranslatorProfileApi()
      .then(profile => {
        if (cancelled || !profile) return
        setTranslatorProfile(profile)
        setIsTranslator(true)
        if (Array.isArray(profile.specializations)) {
          setTransSpecializations(profile.specializations)
        }
        setTransExp(profile.experienceYears ?? 0)
        setTransPhone(profile.phoneNumber || profile.phone || '')
        setTransFacebook(profile.facebookUrl || profile.facebook || '')
        setTransCvUrl(profile.cvUrl || '')
        setTransBio(profile.bio || '')
      })
      .catch(() => {
        // Not a registered translator or profile not found
      })
    return () => { cancelled = true }
  }, [user?.id, user?.userId, roleUpper])

  const toggleSpecialization = (lang) => {
    setTransSpecializations(prev =>
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
  }

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      toast.warn('🚫 Invalid file format! Only PDF documents (.pdf) are accepted for CV uploads.')
      e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.warn('File size must be under 5MB.')
      e.target.value = ''
      return
    }
    try {
      setCvUploading(true)
      const uploadResult = await uploadFileApi(file)
      const uploadedUrl = typeof uploadResult === 'string' ? uploadResult : uploadResult?.url || uploadResult?.fileUrl || null
      if (uploadedUrl) {
        setTransCvUrl(uploadedUrl)
        toast.success('CV / Resume document uploaded successfully!')
      }
    } catch (err) {
      console.error('CV upload error:', err)
      toast.error('Failed to upload CV document.')
    } finally {
      setCvUploading(false)
    }
  }

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
      const payload = availableNotifKeys && availableNotifKeys.length > 0
        ? Object.fromEntries(
            Object.entries(notifSettings).filter(([k]) => availableNotifKeys.includes(k))
          )
        : notifSettings
      const response = await updateNotificationPreferencesApi(payload)
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

      // Save Translator Profile if role is TRANSLATOR or has profile
      if (roleUpper === 'TRANSLATOR' || isTranslator) {
        try {
          await updateMyTranslatorProfileApi({
            specializations: transSpecializations,
            experiencedYears: parseInt(transExp, 10) || 0,
            phone: transPhone.trim(),
            facebookUrl: transFacebook.trim(),
            cvUrl: transCvUrl,
            bio: transBio || bio,
          })
        } catch (transErr) {
          console.error('Failed to sync translator profile:', transErr)
        }
      }

      toast.success('Basic Info and Translator profile updated successfully!')
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
        return <ModeratorStats assignedLanguages={assignedLanguages} />
      case 'TRANSLATOR':
        return <TranslatorStats teams={projectTeams} loading={projectTeamsLoading} />
      case 'PROJECT_LEADER':
        return <ProjectLeaderStats teams={projectTeams} loading={projectTeamsLoading} />
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

  let LayoutComponent = HomeLayout
  const layoutProps = {}

  switch (roleUpper) {
    case 'ADMIN':
      LayoutComponent = AdminLayout
      break
    case 'AUTHOR':
      LayoutComponent = AuthorLayout
      break
    case 'MODERATOR':
      LayoutComponent = ModeratorLayout
      break
    case 'TRANSLATOR':
    case 'PROJECT_LEADER':
      LayoutComponent = TranslatorLayout
      break
    default:
      LayoutComponent = HomeLayout
      break
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

      <section
        className={`profile-cover-section ${backgroundImageUrl ? 'has-custom-bg' : ''}`}
        style={backgroundImageUrl ? { backgroundImage: `url(${backgroundImageUrl})` } : undefined}
      >
        {!backgroundImageUrl && <div className="profile-cover-ambient-mesh" />}
        <div className="profile-cover-overlay">
          <div className="profile-cover-badge-wrap">
            <span className="profile-cover-kicker">✨ Profile Background</span>
          </div>
          <label className="profile-cover-upload-btn" htmlFor="profile-background-input">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span>Upload background</span>
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

                {/* Translator Specific: Professional Profile & CV (Auto-attached on Team Application) */}
                {(roleUpper === 'TRANSLATOR' || isTranslator) && (
                  <div className="profile-translator-section">
                    <div className="profile-translator-header">
                      <div className="profile-translator-icon-wrap">🌐</div>
                      <div>
                        <h4 className="profile-translator-title">
                          Translator Professional Profile
                        </h4>
                        <p className="profile-translator-subtitle">
                          This verified info is automatically attached when you apply to Comic Translation Teams.
                        </p>
                      </div>
                    </div>

                    {/* Language Specializations */}
                    <div className="profile-input-group" style={{ marginBottom: '18px' }}>
                      <label>Language Specializations</label>
                      <div className="profile-specialization-list">
                        {COMIC_LANGUAGE_OPTIONS.map((lang) => {
                          const selected = transSpecializations.includes(lang)
                          return (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => toggleSpecialization(lang)}
                              className={`profile-spec-btn ${selected ? 'selected' : ''}`}
                            >
                              {selected ? '✓ ' : '+ '} {lang}
                            </button>
                          )
                        })}
                      </div>
                      {transSpecializations.length === 0 && (
                        <p style={{ color: '#f59e0b', fontSize: '12px', marginTop: '6px', fontWeight: '500' }}>Please select at least one language specialization.</p>
                      )}
                    </div>

                    {/* Experience & Contact Grid */}
                    <div className="profile-form-grid" style={{ marginBottom: '18px' }}>
                      <div className="profile-input-group">
                        <label>Years of Translation Experience</label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={transExp}
                          onChange={(e) => setTransExp(e.target.value)}
                          placeholder="e.g. 2"
                        />
                      </div>

                      <div className="profile-input-group">
                        <label>Phone Number / Direct Contact</label>
                        <input
                          type="text"
                          value={transPhone}
                          onChange={(e) => setTransPhone(e.target.value)}
                          placeholder="e.g. 0904034333"
                        />
                      </div>
                    </div>

                    <div className="profile-input-group" style={{ marginBottom: '18px' }}>
                      <label>Social / Portfolio URL (Facebook / Discord / LinkedIn)</label>
                      <input
                        type="url"
                        value={transFacebook}
                        onChange={(e) => setTransFacebook(e.target.value)}
                        placeholder="https://facebook.com/... or discord handle"
                      />
                    </div>

                    {/* CV / Resume Document */}
                    <div className="profile-input-group" style={{ marginBottom: '8px' }}>
                      <label>Attached CV / Portfolio Resume (PDF)</label>
                      <div className="profile-cv-box">
                        <div className="profile-cv-doc-info">
                          <span className="profile-cv-icon">📄</span>
                          <div>
                            {transCvUrl ? (
                              <>
                                <a
                                  href={transCvUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="profile-cv-link"
                                >
                                  View Uploaded CV Document (PDF) ↗
                                </a>
                                <p className="profile-cv-badge">✓ Active and ready to auto-attach for team applications</p>
                              </>
                            ) : (
                              <span className="profile-cv-empty-text">No CV attached yet. Upload a PDF for 1-click team applications.</span>
                            )}
                          </div>
                        </div>

                        <label
                          htmlFor="profile-cv-file-input"
                          className="profile-cv-upload-btn"
                        >
                          {cvUploading ? 'Uploading...' : transCvUrl ? 'Replace CV File' : 'Upload CV (PDF)'}
                        </label>
                        <input
                          id="profile-cv-file-input"
                          type="file"
                          accept="application/pdf,.pdf"
                          style={{ display: 'none' }}
                          onChange={handleCvUpload}
                          disabled={cvUploading}
                        />
                      </div>
                    </div>
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
                                onChange={() => setNotifSettings(prev => ({
                                  ...prev,
                                  [option.key]: !(prev[option.key] !== false)
                                }))}
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
