import { useState } from 'react'
import { resetPasswordApi } from '../../services/api/AuthApi'

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
            placeholder="6-digit code" 
            value={form.otp}
            onChange={(e) => setForm({ ...form, otp: e.target.value })}
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
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Resetting Password...' : 'Reset Password'} <span className="btn-arrow-icon">›</span>
        </button>

        <button type="button" className="btn-secondary" onClick={() => onNavigate('forgot')}>
          Resend OTP Code
        </button>
      </form>
    </div>
  )
}

export default ResetPassword
