import { useEffect, useRef, useState } from 'react'
import { resendVerificationOtpApi, verifyEmailApi } from '../../services/api/AuthApi'

function VerifyEmail({ email, autoSendOtp = false, onNavigate, showAlert, loading, setLoading }) {
  const [otp, setOtp] = useState('')
  const [verificationEmail, setVerificationEmail] = useState(email || '')
  const [autoSending, setAutoSending] = useState(false)
  const autoSentEmailRef = useRef('')

  useEffect(() => {
    setVerificationEmail(email || '')
  }, [email])

  // Signup already sends an OTP. Only a later login attempt should request a
  // fresh code, otherwise the signup code can be invalidated immediately.
  useEffect(() => {
    const normalized = (email || '').trim().toLowerCase()
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    if (!autoSendOtp || !isValid || autoSentEmailRef.current === normalized) return
    autoSentEmailRef.current = normalized
    let active = true
    setAutoSending(true)
    resendVerificationOtpApi(normalized)
      .then(() => {
        if (active) showAlert('success', 'A verification OTP has been sent to your email.')
      })
      .catch((err) => {
        if (!active) return
        if (err.response?.status === 429) {
          showAlert('info', 'Your most recent OTP is still valid. Please wait before requesting another code.')
          return
        }
        showAlert('error', err.response?.data?.message || 'Could not send a verification OTP. Please use Resend OTP Code.')
      })
      .finally(() => {
        if (active) setAutoSending(false)
      })
    return () => {
      active = false
    }
  }, [autoSendOtp, email, showAlert])

  const normalizedEmail = verificationEmail.trim().toLowerCase()
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)

  const handleVerify = async (e) => {
    e.preventDefault()
    if (loading || autoSending) return
    if (!hasValidEmail) {
      showAlert('error', 'Enter the email address used for this account.')
      return
    }

    setLoading(true)
    try {
      await verifyEmailApi(normalizedEmail, otp)
      showAlert('success', 'Email verified successfully. You can now sign in.')
      onNavigate('signin')
    } catch (err) {
      const errMessage = err.response?.data?.message || 'Invalid or expired verification code.'
      showAlert('error', errMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!hasValidEmail) {
      showAlert('error', 'Enter the email address used for this account.')
      return
    }
    if (loading || autoSending) return

    setLoading(true)
    try {
      await resendVerificationOtpApi(normalizedEmail)
      showAlert('success', 'A new verification OTP has been sent to your email.')
    } catch (err) {
      const errMessage = err.response?.data?.message || 'Could not resend verification OTP.'
      showAlert('error', errMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-form-card fade-in">
      <div className="border-beam-wrapper" />
      <div className="form-header-group">
        <div className="forgot-icon-container">
          <div className="forgot-icon-wrapper">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v16H4z" />
              <path d="m22 6-10 7L2 6" />
            </svg>
          </div>
        </div>
        <h2>Verify email</h2>
        <p>
          {hasValidEmail
            ? <>We've sent a 6-digit OTP code to <strong>{normalizedEmail}</strong>.</>
            : 'Enter your account email to receive a 6-digit OTP code.'}
        </p>
      </div>

      <form onSubmit={handleVerify}>
        {!email && (
          <div className="glass-input-wrapper">
            <span className="glass-input-label">ACCOUNT EMAIL</span>
            <input
              id="verify-account-email"
              type="email"
              placeholder="Enter your account email"
              value={verificationEmail}
              onChange={(event) => setVerificationEmail(event.target.value)}
              className="glass-input-field"
              autoComplete="email"
              required
            />
          </div>
        )}

        <div className="glass-input-wrapper">
          <span className="glass-input-label">EMAIL VERIFICATION CODE</span>
          <input
            id="verify-email-otp"
            type="text"
            inputMode="numeric"
            maxLength="6"
            pattern="[0-9]{6}"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="glass-input-field"
            autoComplete="one-time-code"
            required
          />
        </div>

        <button type="submit" className="btn-primary auth-margin-top-20" disabled={loading || autoSending || !hasValidEmail || otp.length !== 6}>
          <span>{loading ? 'Verifying...' : 'Verify Email'}</span> <span className="btn-arrow-icon">&gt;</span>
        </button>

        <button type="button" className="btn-secondary auth-margin-top-12" onClick={handleResend} disabled={loading || autoSending}>
          {loading || autoSending ? 'Sending OTP...' : 'Resend OTP Code'}
        </button>

        <button type="button" className="link-text-btn auth-margin-top-16" onClick={() => onNavigate('signin')}>
          Back to sign in
        </button>
      </form>
    </div>
  )
}

export default VerifyEmail
