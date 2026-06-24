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
