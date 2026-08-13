import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../../assets/style/author/settings.css'

function AuthorSettings() {
  const [bank, setBank] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
  })
  const [notifications, setNotifications] = useState({
    reviews: true,
    chapters: true,
    weekly: false,
  })

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
    <>
      <div className="author-page-header">
        <h1>Settings</h1>
        <p>Manage your public profile, payout details, and notification preferences for the author workspace.</p>
      </div>

      <div className="settings-grid">
        <div className="author-section-card">
          <h2 className="author-section-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Author Profile
          </h2>
          <p style={{ color: 'var(--author-text-secondary)', marginTop: 0 }}>
            Public author information is managed on a dedicated profile page and saved through the backend Author Profile API.
          </p>
          <Link to="/author/profile" className="btn-author-action primary" style={{ marginTop: '10px', display: 'inline-flex' }}>
            Open Author Profile
          </Link>
        </div>

        <div className="author-section-card author-bank-card">
          <div className="author-bank-card-header">
            <div>
              <h2 className="author-section-title">
                <span className="author-settings-icon author-settings-icon--bank">
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 10 9-6 9 6" />
                    <path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 18h18M2 22h20" />
                  </svg>
                </span>
                Payout Bank Details
              </h2>
              <p className="author-bank-description">Add the bank account that will receive your approved author payouts.</p>
            </div>
            <span className="author-bank-security-badge">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Secure details
            </span>
          </div>

          <form className="author-bank-form" onSubmit={handleSaveBank}>
            <div className="form-group-row">
              <div className="form-group-cell">
                <label htmlFor="author-bank-name">Bank Name</label>
                <input
                  id="author-bank-name"
                  type="text"
                  className="form-control-premium"
                  value={bank.bankName}
                  onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                  placeholder="e.g. MB Bank"
                  autoComplete="organization"
                  required
                />
              </div>
              <div className="form-group-cell">
                <label htmlFor="author-bank-account">Account Number</label>
                <input
                  id="author-bank-account"
                  type="text"
                  inputMode="numeric"
                  className="form-control-premium"
                  value={bank.accountNumber}
                  onChange={(e) => setBank({ ...bank, accountNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="Enter account number"
                  autoComplete="off"
                  required
                />
              </div>
              <div className="form-group-cell full-width">
                <label htmlFor="author-bank-holder">Account Holder Name</label>
                <input
                  id="author-bank-holder"
                  type="text"
                  className="form-control-premium author-bank-holder-input"
                  value={bank.accountHolder}
                  onChange={(e) => setBank({ ...bank, accountHolder: e.target.value.toUpperCase() })}
                  placeholder="Name as shown on the bank account"
                  autoComplete="name"
                  required
                />
                <small>Use the exact account holder name registered with your bank.</small>
              </div>
            </div>
            <div className="author-bank-form-footer">
              <p>Your payout details are only used to process approved withdrawal requests.</p>
              <button type="submit" className="btn-author-action primary author-bank-save-btn">
                Save Bank Details
              </button>
            </div>
          </form>
        </div>

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
              <input type="checkbox" checked={notifications.reviews} onChange={() => handleToggleNotification('reviews')} />
              <div>
                <span>Review Notifications</span>
                <span className="checkbox-subtext">Get notified when a reader posts a review on your series</span>
              </div>
            </label>
            <label className="checkbox-label-premium">
              <input type="checkbox" checked={notifications.chapters} onChange={() => handleToggleNotification('chapters')} />
              <div>
                <span>Chapter Updates</span>
                <span className="checkbox-subtext">Receive updates about chapter approvals and translation status</span>
              </div>
            </label>
            <label className="checkbox-label-premium">
              <input type="checkbox" checked={notifications.weekly} onChange={() => handleToggleNotification('weekly')} />
              <div>
                <span>Weekly digest report</span>
                <span className="checkbox-subtext">Receive an email summary of page views and subscriber milestones</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </>
  )
}

export default AuthorSettings
