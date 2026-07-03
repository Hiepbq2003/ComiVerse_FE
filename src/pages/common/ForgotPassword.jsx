import { useState } from 'react'
import { forgotPasswordApi } from '../../services/api/AuthApi'

function ForgotPassword({ onNavigate, onOTPSent, showAlert, loading, setLoading }) {
  const [email, setEmail] = useState('')

  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const normalizedEmail = email.trim();
      await forgotPasswordApi(normalizedEmail);
      onOTPSent(normalizedEmail);
      showAlert('success', 'OTP code sent! Please check your email.');
    } catch (err) {
      const errMessage = err.response?.data?.message || 'Email not found.';
      showAlert('error', errMessage);
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="auth-form-card fade-in">
      <div className="form-header-group">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.1))',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>
        <h2>Reset password</h2>
        <p>Enter your email to receive a recovery OTP code.</p>
      </div>
      <form onSubmit={handleForgot}>
        <div className="glass-input-wrapper">
          <span className="glass-input-label">EMAIL ADDRESS</span>
          <input 
            id="forgot-email"
            type="email" 
            placeholder="you@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input-field"
            autoComplete="email"
            required
          />
        </div>

        <button type="submit" className="btn-primary" style={{ marginTop: '16px' }} disabled={loading}>
          <span>{loading ? 'Sending Code...' : 'Send OTP Code'}</span> <span className="btn-arrow-icon">›</span>
        </button>

        <button type="button" className="btn-secondary" style={{ marginTop: '12px' }} onClick={() => onNavigate('signin')}>
          Cancel & Go Back
        </button>
      </form>
    </div>
  )
}

export default ForgotPassword
