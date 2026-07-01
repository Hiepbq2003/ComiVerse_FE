import { useState } from 'react'
import { loginApi, getMeApi } from '../../services/api/AuthApi'
import { setAuth } from '../../utils/Auth'

function Login({ onNavigate, onLoginSuccess, showAlert, loading, setLoading }) {
  const [form, setForm] = useState({ username: '', password: '', rememberMe: false })
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({ username: '', password: '' })

  const updateField = (field, value) => {
    setForm({ ...form, [field]: value })
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' })
    }
  }

  const handleSignin = async (e) => {
    e.preventDefault()
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

      const userData = {
        userId: meData.userId,
        username: meData.username,
        fullName: meData.fullName,
        email: meData.email,
        role: meData.role,
        avatarUrl: meData.avatarUrl
      }

      setAuth(data.token, userData, data.refreshToken)
      onLoginSuccess(userData)
      showAlert('success', 'Welcome back to ComiVerse!')
    } catch (err) {
      const errMessage = err.response?.data?.message || 'Invalid username or password.';
      const isInvalidCredentials = err.response?.status === 401 || /invalid username or password/i.test(errMessage)

      if (isInvalidCredentials) {
        setFieldErrors({
          username: '',
          password: 'Invalid username/email or password.'
        })
        return
      }

      showAlert('error', errMessage);
    } finally {
      setLoading(false)
    }
  }


  const handleGoogleLogin = () => {
    window.location.href = '/api/oauth2/authorization/google';
  }

  return (
    <div className="auth-form-card fade-in">
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
        <div className={`input-field-group ${fieldErrors.username ? 'has-error' : ''}`}>
          <label htmlFor="signin-username">EMAIL OR USERNAME</label>
          <input 
            id="signin-username"
            type="text" 
            placeholder="you@example.com" 
            value={form.username}
            onChange={(e) => updateField('username', e.target.value)}
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

        <div className={`input-field-group ${fieldErrors.password ? 'has-error' : ''}`}>
          <label htmlFor="signin-password">PASSWORD</label>
          <div className="password-input-wrapper">
            <input 
              id="signin-password"
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              autoComplete="current-password"
              aria-invalid={fieldErrors.password ? 'true' : 'false'}
              aria-describedby={fieldErrors.password ? 'signin-password-error' : undefined}
            />
            <button 
              type="button" 
              className="password-toggle-eye"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        <div className="form-action-options">
          <label className="checkbox-custom-label">
            <input 
              type="checkbox" 
              checked={form.rememberMe}
              onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
            />
            <span className="checkmark-box"></span>
            Remember me
          </label>
          <button type="button" className="link-text-btn" onClick={() => onNavigate('forgot')}>
            Forgot password?
          </button>
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Signing In...' : 'Sign In'} <span className="btn-arrow-icon">›</span>
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
