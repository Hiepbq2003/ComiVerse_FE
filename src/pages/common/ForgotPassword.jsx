import { useState } from 'react'
import { forgotPasswordApi } from '../../services/api/AuthApi'

function ForgotPassword({ onNavigate, onOTPSent, showAlert, loading, setLoading }) {
  const [email, setEmail] = useState('')

  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await forgotPasswordApi(email);
      onOTPSent(email);
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
        <div className="input-field-group">
          <label htmlFor="forgot-email">EMAIL ADDRESS</label>
          <input 
            id="forgot-email"
            type="email" 
            placeholder="you@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Sending Code...' : 'Send OTP Code'} <span className="btn-arrow-icon">›</span>
        </button>

        <button type="button" className="btn-secondary" onClick={() => onNavigate('signin')}>
          Cancel & Go Back
        </button>
      </form>
    </div>
  )
}

export default ForgotPassword
