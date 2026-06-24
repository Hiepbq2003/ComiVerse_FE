import { useState } from 'react'

function ForgotPassword({ onNavigate, onOTPSent, showAlert, loading, setLoading }) {
  const [email, setEmail] = useState('')

  const handleForgot = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        onOTPSent(email);
        showAlert('success', 'OTP code sent! Please check your email.');
      } else {
        const errData = await response.json().catch(() => ({}));
        showAlert('error', errData.message || 'Email not found.');
      }
    } catch (err) {
      showAlert('error', 'Connection failed.');
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
