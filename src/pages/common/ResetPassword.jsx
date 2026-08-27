import { useState } from 'react'
import { forgotPasswordApi, resetPasswordApi } from '../../services/api/AuthApi'
import { AUTH_LIMITS, isValidEmail, isValidOtp, isValidPassword } from '../../utils/authValidation'

function ResetPassword({ email, onNavigate, showAlert, loading, setLoading }) {
  const [form, setForm] = useState({ otp: '', newPassword: '', confirmNewPassword: '' })

  const handleReset = async (e) => {
    e.preventDefault()
    if (!isValidEmail(email)) {
      showAlert('error', 'Enter a valid email address');
      onNavigate('forgot');
      return;
    }
    if (!isValidOtp(form.otp)) {
      showAlert('error', 'Enter the 6-digit recovery code');
      return;
    }
    if (!isValidPassword(form.newPassword)) {
      showAlert('error', 'New password must be between 8 and 128 characters.');
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      showAlert('error', 'Passwords do not match');
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
      <div className="border-beam-wrapper" />
      <div className="form-header-group">
        <h2>Set new password</h2>
        <p>We've sent an OTP code to <strong>{email}</strong>.</p>
      </div>

      <form onSubmit={handleReset}>
        <div className="glass-input-wrapper">
          <span className="glass-input-label">OTP VERIFICATION CODE</span>
          <input 
            id="reset-otp"
            type="text" 
            inputMode="numeric"
            maxLength="6"
            pattern="[0-9]{6}"
            placeholder="Enter 6-digit code" 
            value={form.otp}
            onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            className="glass-input-field"
            autoComplete="one-time-code"
            required
          />
        </div>

        <div className="glass-input-wrapper auth-margin-top-16">
          <span className="glass-input-label">NEW PASSWORD</span>
          <input 
            id="reset-password"
            type="password" 
            placeholder="Enter new password" 
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            className="glass-input-field"
            autoComplete="new-password"
            maxLength={AUTH_LIMITS.passwordMax}
            required
          />
        </div>

        <div className="glass-input-wrapper auth-margin-top-16">
          <span className="glass-input-label">CONFIRM NEW PASSWORD</span>
          <input 
            id="reset-confirm"
            type="password" 
            placeholder="Confirm new password" 
            value={form.confirmNewPassword}
            onChange={(e) => setForm({ ...form, confirmNewPassword: e.target.value })}
            className="glass-input-field"
            autoComplete="new-password"
            maxLength={AUTH_LIMITS.passwordMax}
            required
          />
        </div>

        <button type="submit" className="btn-primary auth-margin-top-20" disabled={loading}>
          <span>{loading ? 'Resetting Password...' : 'Reset Password'}</span> <span className="btn-arrow-icon">›</span>
        </button>

        <button type="button" className="btn-secondary auth-margin-top-12" onClick={handleResendOtp} disabled={loading}>
          {loading ? 'Sending OTP...' : 'Resend OTP Code'}
        </button>
      </form>
    </div>
  )
}

export default ResetPassword
