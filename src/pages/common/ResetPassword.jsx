import { useState } from 'react'
import { forgotPasswordApi, resetPasswordApi } from '../../services/api/AuthApi'

function ResetPassword({ email, onNavigate, showAlert, loading, setLoading }) {
  const [form, setForm] = useState({ otp: '', newPassword: '', confirmNewPassword: '' })

  const handleReset = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirmNewPassword) {
      showAlert('error', 'New passwords do not match!');
      return;
    }
    setLoading(true)
    try {
      await resetPasswordApi(email, form.otp, form.newPassword);
      onNavigate('signin');
      showAlert('success', 'Password reset successfully! You can now log in.');
    } catch (err) {
      const errMessage = err.response?.data?.message || 'Reset failed. Verify OTP code.';
      showAlert('error', errMessage);
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!email) {
      onNavigate('forgot')
      return
    }
    setLoading(true)
    try {
      await forgotPasswordApi(email)
      showAlert('success', 'A new OTP code has been sent to your email.')
    } catch (err) {
      const errMessage = err.response?.data?.message || 'Could not resend OTP code.'
      showAlert('error', errMessage)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="auth-form-card fade-in">
      <div className="form-header-group">
        <h2>Set new password</h2>
        <p>We've sent an OTP code to <strong>{email}</strong>.</p>
      </div>

      <form onSubmit={handleReset}>
        <div className="input-field-group">
          <label htmlFor="reset-otp">OTP VERIFICATION CODE</label>
          <input 
            id="reset-otp"
            type="text" 
            inputMode="numeric"
            maxLength="6"
            pattern="[0-9]{6}"
            placeholder="6-digit code" 
            value={form.otp}
            onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            autoComplete="one-time-code"
            required
          />
        </div>

        <div className="input-field-group">
          <label htmlFor="reset-password">NEW PASSWORD</label>
          <input 
            id="reset-password"
            type="password" 
            placeholder="••••••••" 
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="input-field-group">
          <label htmlFor="reset-confirm">CONFIRM NEW PASSWORD</label>
          <input 
            id="reset-confirm"
            type="password" 
            placeholder="••••••••" 
            value={form.confirmNewPassword}
            onChange={(e) => setForm({ ...form, confirmNewPassword: e.target.value })}
            autoComplete="new-password"
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Resetting Password...' : 'Reset Password'} <span className="btn-arrow-icon">›</span>
        </button>

        <button type="button" className="btn-secondary" onClick={handleResendOtp} disabled={loading}>
          {loading ? 'Sending OTP...' : 'Resend OTP Code'}
        </button>
      </form>
    </div>
  )
}

export default ResetPassword
