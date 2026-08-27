import { useState } from 'react'
import { forgotPasswordApi } from '../../services/api/AuthApi'
import { isValidEmail } from '../../utils/authValidation'

function ForgotPassword({ onNavigate, onOTPSent, showAlert, loading, setLoading }) {
  const [email, setEmail] = useState('')

  const handleForgot = async (e) => {
    e.preventDefault()
    if (loading) return
    if (!isValidEmail(email)) {
      showAlert('error', 'Enter a valid email address');
      return
    }

    setLoading(true)
    try {
      const normalizedEmail = email.trim();
      await forgotPasswordApi(normalizedEmail);
      onOTPSent(normalizedEmail);
      showAlert('success', 'OTP code sent! Please check your email.');
    } catch (err) {
      const errMessage = err.response?.data?.message || 'Cannot connect to the server. Please make sure the backend is running.';
      showAlert('error', errMessage);
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="auth-form-card fade-in">
      <div className="form-header-group">
        <div className="forgot-icon-container">
          <div className="forgot-icon-wrapper">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            placeholder="Enter email address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="glass-input-field"
            autoComplete="email"
            required
          />
        </div>

        <button type="submit" className="btn-primary auth-margin-top-16" disabled={loading}>
          <span>{loading ? 'Sending Code...' : 'Send OTP Code'}</span> <span className="btn-arrow-icon">&gt;</span>
        </button>

        <button type="button" className="btn-secondary auth-margin-top-12" onClick={() => onNavigate('signin')}>
          Cancel & Go Back
        </button>
      </form>
    </div>
  )
}

export default ForgotPassword
