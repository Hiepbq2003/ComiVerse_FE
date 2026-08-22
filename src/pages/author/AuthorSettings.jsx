import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../../assets/style/author/settings.css'

function AuthorSettings() {
  const [bank, setBank] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
  })
  const handleSaveBank = (e) => {
    e.preventDefault()
    alert('Bank payout details saved successfully!')
  }

  return (
    <>
      <div className="author-page-header">
        <h1>Payout Settings</h1>
        <p>Manage your bank account details to receive your approved author payouts.</p>
      </div>

      <div className="settings-grid">

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


      </div>
    </>
  )
}

export default AuthorSettings
