import { useState, useEffect } from 'react'
import AuthorLayout from '../../components/layout/AuthorLayout'
import { getAuth } from '../../utils/Auth'
function AuthorSettings() {
  const [profile, setProfile] = useState({
    username: '',
    fullName: '',
    penName: '',
    bio: '',
    email: '',
  })
  const [bank, setBank] = useState({
    bankName: 'MB Bank',
    accountNumber: '1234567890',
    accountHolder: 'NGUYEN VAN A',
  })
  const [notifications, setNotifications] = useState({
    reviews: true,
    chapters: true,
    weekly: false,
  })
  useEffect(() => {
    const auth = getAuth()
    if (auth && auth.user) {
      setProfile((prev) => ({
        ...prev,
        username: auth.user.username || '',
        fullName: auth.user.fullName || '',
        email: auth.user.email || '',
        penName: 'ShadowCreator',
        bio: 'Passionate manga and webtoon illustrator working on dimensions and magic portals.',
      }))
    }
  }, [])
  const handleSaveProfile = (e) => {
    e.preventDefault()
    alert('Profile settings saved successfully!')
  }
  const handleSaveBank = (e) => {
    e.preventDefault()
    alert('Bank payout details saved successfully!')
  }
  const handleToggleNotification = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }
  return (
    <AuthorLayout activeNav="settings">
      <div className="author-page-header">
        <h1>Settings</h1>
        <p>Manage your pen profile, update bank information for payouts, and choose your alerts.</p>
      </div>
      <div className="settings-grid">
        {/* Profile Info */}
        <div className="author-section-card">
          <h2 className="author-section-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Pen Profile Details
          </h2>
          <form onSubmit={handleSaveProfile}>
            <div className="form-group-row">
              <div className="form-group-cell">
                <label>Username</label>
                <input 
                  type="text" 
                  className="form-control-premium" 
                  value={profile.username} 
                  disabled 
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-group-cell">
                <label>Email Address</label>
                <input 
                  type="email" 
                  className="form-control-premium" 
                  value={profile.email} 
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })} 
                />
              </div>
              <div className="form-group-cell">
                <label>Full Name</label>
                <input 
                  type="text" 
                  className="form-control-premium" 
                  value={profile.fullName} 
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} 
                />
              </div>
              <div className="form-group-cell">
                <label>Pen Name</label>
                <input 
                  type="text" 
                  className="form-control-premium" 
                  value={profile.penName} 
                  onChange={(e) => setProfile({ ...profile, penName: e.target.value })} 
                />
              </div>
              <div className="form-group-cell full-width">
                <label>Creator Bio</label>
                <textarea 
                  className="form-control-premium" 
                  value={profile.bio} 
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })} 
                />
              </div>
            </div>
            <button type="submit" className="btn-author-action primary" style={{ marginTop: '20px' }}>
              Save Profile Changes
            </button>
          </form>
        </div>
        {/* Bank / Payout details */}
        <div className="author-section-card">
          <h2 className="author-section-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
            Payout Bank Details
          </h2>
          <form onSubmit={handleSaveBank}>
            <div className="form-group-row">
              <div className="form-group-cell">
                <label>Bank Name</label>
                <input 
                  type="text" 
                  className="form-control-premium" 
                  value={bank.bankName} 
                  onChange={(e) => setBank({ ...bank, bankName: e.target.value })} 
                />
              </div>
              <div className="form-group-cell">
                <label>Account Number</label>
                <input 
                  type="text" 
                  className="form-control-premium" 
                  value={bank.accountNumber} 
                  onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} 
                />
              </div>
              <div className="form-group-cell full-width">
                <label>Account Holder Name</label>
                <input 
                  type="text" 
                  className="form-control-premium" 
                  value={bank.accountHolder} 
                  onChange={(e) => setBank({ ...bank, accountHolder: e.target.value })} 
                />
              </div>
            </div>
            <button type="submit" className="btn-author-action primary" style={{ marginTop: '20px' }}>
              Update Bank Details
            </button>
          </form>
        </div>
        {/* Notification preferences */}
        <div className="author-section-card">
          <h2 className="author-section-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Notification Preferences
          </h2>
          <div className="checkbox-premium-group">
            <label className="checkbox-label-premium">
              <input 
                type="checkbox" 
                checked={notifications.reviews} 
                onChange={() => handleToggleNotification('reviews')} 
              />
              <div>
                <span>Review Notifications</span>
                <span className="checkbox-subtext">Get notified when reader posts a review on your series</span>
              </div>
            </label>
            <label className="checkbox-label-premium">
              <input 
                type="checkbox" 
                checked={notifications.chapters} 
                onChange={() => handleToggleNotification('chapters')} 
              />
              <div>
                <span>Chapter Updates</span>
                <span className="checkbox-subtext">Receive updates about chapter approvals and translations status</span>
              </div>
            </label>
            <label className="checkbox-label-premium">
              <input 
                type="checkbox" 
                checked={notifications.weekly} 
                onChange={() => handleToggleNotification('weekly')} 
              />
              <div>
                <span>Weekly digest report</span>
                <span className="checkbox-subtext">Receive an email summary of page views and subscriber milestones</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </AuthorLayout>
  )
}
export default AuthorSettings