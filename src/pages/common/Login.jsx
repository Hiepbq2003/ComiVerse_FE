import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { loginApi, getMeApi } from '../../services/api/AuthApi'
import { useAuth } from '../../context/AuthContext'
import { setAuth, clearAuth } from '../../utils/Auth'
import { getBackendHost } from '../../config/apiConfig'

function Login({ onNavigate, onVerificationRequired, onLoginSuccess, showAlert, loading, setLoading }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' })

  const [failedAttempts, setFailedAttempts] = useState(() => {
    try {
      const stored = localStorage.getItem('comiverse_login_attempts');
      if (stored) {
        const data = JSON.parse(stored);
        return data.count || 0;
      }
    } catch (e) {}
    return 0;
  });

  const [lockoutTimer, setLockoutTimer] = useState(() => {
    try {
      const stored = localStorage.getItem('comiverse_login_attempts');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.lockoutUntil && Date.now() < data.lockoutUntil) {
          return Math.ceil((data.lockoutUntil - Date.now()) / 1000);
        }
      }
    } catch (e) {}
    return 0;
  });

  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          try {
            localStorage.removeItem('comiverse_login_attempts');
          } catch (e) {}
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const updateField = (field, value) => {
    setForm({ ...form, [field]: value })
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' })
    }
  }

  const handleSignin = async (e) => {
    e.preventDefault()
    if (lockoutTimer > 0) {
      const minutes = Math.floor(lockoutTimer / 60);
      const seconds = lockoutTimer % 60;
      const msg = `Too many failed attempts. Please wait ${minutes}m ${seconds}s before trying again to prevent spam.`;
      toast.error(msg);
      setFieldErrors({ username: '', password: msg });
      return;
    }
    const nextErrors = {
      username: form.username.trim() ? '' : 'Email or username is required.',
      password: form.password ? '' : 'Password is required.'
    }

    setFieldErrors(nextErrors)
    if (nextErrors.username || nextErrors.password) {
      return
    }

    setLoading(true)
    try {
      const response = await loginApi(form.username.trim(), form.password)
      const data = response.data || response

      // Temporarily store token for getMeApi authentication
      setAuth(data.token, '', data.refreshToken)

      // Fetch user profile info
      const meResponse = await getMeApi()
      const meData = meResponse.data || meResponse

      // Check if account is banned/inactive
      const userStatus = (meData.status || '').toUpperCase()
      if (userStatus === 'INACTIVE' || userStatus === 'BANNED' || meData.banned) {
        clearAuth()
        setFieldErrors({
          username: 'Your account has been banned.',
          password: ''
        })
        toast.error('Your account has been banned. Please contact administration for support.')
        if (typeof showAlert === 'function') {
          showAlert('error', 'Your account has been banned. Please contact administration for support.')
        }
        return
      }

      const userData = {
        ...meData,
        userId: meData.userId,
        username: meData.username,
        fullName: meData.fullName,
        email: meData.email,
        role: meData.role,
        avatarUrl: meData.avatarUrl
      }

      try {
        localStorage.removeItem('comiverse_login_attempts');
      } catch (e) {}
      setFailedAttempts(0);
      setLockoutTimer(0);

      login(data.token, userData, data.refreshToken)
      onLoginSuccess(userData)
      toast.success('Welcome back to ComiVerse!')
      if (typeof showAlert === 'function') {
        showAlert('success', 'Welcome back to ComiVerse!')
      }
    } catch (err) {
      const errMessage = err.response?.data?.message || err.message || 'Invalid username or password.';
      const isBanned = (err.response?.status === 403 || err.response?.status === 400) && /banned|inactive|disabled|blocked|lock/i.test(errMessage)
      const isInvalidCredentials = err.response?.status === 401 || /invalid username or password/i.test(errMessage)
      const needsEmailVerification = err.response?.status === 403 && /verify your email/i.test(errMessage)

      if (isBanned) {
        clearAuth()
        setFieldErrors({
          username: 'Your account has been banned.',
          password: ''
        })
        toast.error(errMessage || 'Your account has been banned. Please contact support.')
        if (typeof showAlert === 'function') {
          showAlert('error', errMessage || 'Your account has been banned.')
        }
        return
      }

      if (isInvalidCredentials) {
        const newCount = failedAttempts + 1;
        setFailedAttempts(newCount);
        if (newCount >= 5) {
          const lockTime = Date.now() + 10 * 60 * 1000;
          try {
            localStorage.setItem('comiverse_login_attempts', JSON.stringify({ count: 5, lockoutUntil: lockTime }));
          } catch (e) {}
          setLockoutTimer(600);
          const lockMsg = 'You have failed 5 times! Your account login is locked for 10 minutes to prevent spam.';
          setFieldErrors({
            username: '',
            password: lockMsg
          });
          toast.error(lockMsg);
          if (typeof showAlert === 'function') {
            showAlert('error', lockMsg);
          }
        } else {
          try {
            localStorage.setItem('comiverse_login_attempts', JSON.stringify({ count: newCount, lockoutUntil: null }));
          } catch (e) {}
          const rem = 5 - newCount;
          setFieldErrors({
            username: '',
            password: 'Invalid username/email or password.'
          });
          toast.error(`Invalid username/email or password. You have ${rem} attempt${rem === 1 ? '' : 's'} left before a 10-minute lockout.`);
        }
        return
      }

      if (needsEmailVerification) {
        const loginIdentifier = form.username.trim()
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginIdentifier)) {
          onVerificationRequired(loginIdentifier)
        }
        toast.error(errMessage)
        if (typeof showAlert === 'function') {
          showAlert('error', errMessage)
        }
        return
      }

      toast.error(errMessage)
      if (typeof showAlert === 'function') {
        showAlert('error', errMessage)
      }
    } finally {
      setLoading(false)
    }
  }


  const handleGoogleLogin = () => {
    window.location.href = `${getBackendHost()}/api/oauth2/authorization/google`;
  }

  return (
    <div className="auth-form-card fade-in">
      <div className="border-beam-wrapper" />
      <div className="form-header-group">
        <h2>Welcome back</h2>
        <p>Sign in and continue your story.</p>
      </div>

      {/* Google Button */}
      <button className="btn-google-oauth" onClick={handleGoogleLogin}>
        <svg className="google-icon-svg" viewBox="0 0 24 24" width="18" height="18">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.09-.2-.18-.42-.27-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Continue with Google
      </button>

      <div className="divider-text-or"><span>OR</span></div>

      <form onSubmit={handleSignin} noValidate>
        <div className={`glass-input-wrapper ${fieldErrors.username ? 'has-error' : ''}`}>
          <span className="glass-input-label">EMAIL OR USERNAME</span>
          <input 
            id="signin-username"
            type="text" 
            placeholder="Enter username or email" 
            value={form.username}
            onChange={(e) => updateField('username', e.target.value)}
            className="glass-input-field"
            autoComplete="username"
            aria-invalid={fieldErrors.username ? 'true' : 'false'}
            aria-describedby={fieldErrors.username ? 'signin-username-error' : undefined}
          />
          {fieldErrors.username && (
            <p id="signin-username-error" className="field-error-message">
              {fieldErrors.username}
            </p>
          )}
        </div>

        <div className={`glass-input-wrapper ${fieldErrors.password ? 'has-error' : ''}`}>
          <div className="glass-input-row">
            <div className="auth-flex-fill">
              <span className="glass-input-label">PASSWORD</span>
              <input 
                id="signin-password"
                type={showPassword ? "text" : "password"} 
                placeholder="Enter password" 
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className="glass-input-field"
                autoComplete="current-password"
                aria-invalid={fieldErrors.password ? 'true' : 'false'}
                aria-describedby={fieldErrors.password ? 'signin-password-error' : undefined}
              />
            </div>
            <button 
              type="button" 
              className="glass-input-trailing-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p id="signin-password-error" className="field-error-message">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div className="form-action-options" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="link-text-btn" onClick={() => onNavigate('forgot')}>
            Forgot password?
          </button>
        </div>

        {(failedAttempts > 0 || lockoutTimer > 0) && (
          <div style={{
            padding: '10px 14px',
            margin: '0 0 14px 0',
            borderRadius: '10px',
            background: lockoutTimer > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            border: `1px solid ${lockoutTimer > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
            color: lockoutTimer > 0 ? '#f87171' : '#fbbf24',
            fontSize: '12.5px',
            lineHeight: '1.4',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '16px' }}>{lockoutTimer > 0 ? '🔒' : '⚠️'}</span>
            <div>
              {lockoutTimer > 0 ? (
                <span><strong>Login Locked:</strong> You have failed 5 times. Please wait <strong>{Math.floor(lockoutTimer / 60)}m {lockoutTimer % 60}s</strong> before trying again to prevent spam.</span>
              ) : (
                <span><strong>Security Notice:</strong> You have <strong>{5 - failedAttempts} attempt{5 - failedAttempts === 1 ? '' : 's'} left</strong> before your login is locked for 10 minutes.</span>
              )}
            </div>
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={loading || lockoutTimer > 0} style={lockoutTimer > 0 ? { opacity: 0.6, cursor: 'not-allowed', background: '#64748b' } : {}}>
          <span>{lockoutTimer > 0 ? `Locked (${Math.floor(lockoutTimer / 60)}m ${lockoutTimer % 60}s)` : (loading ? 'Signing In...' : 'Sign In')}</span> <span className="btn-arrow-icon">›</span>
        </button>
      </form>

      <div className="form-footer-switch">
        <span>Don't have an account? </span>
        <button type="button" className="footer-link-highlight" onClick={() => onNavigate('signup')}>
          Sign up free
        </button>
      </div>
    </div>
  )
}

export default Login
