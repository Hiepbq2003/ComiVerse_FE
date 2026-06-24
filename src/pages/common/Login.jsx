import { useState } from 'react'
import { loginApi } from '../../services/api/AuthApi'
import { setAuth } from '../../utils/Auth'

function Login({ onNavigate, onLoginSuccess, showAlert, loading, setLoading }) {
  const [form, setForm] = useState({ username: '', password: '', rememberMe: false })
  const [showPassword, setShowPassword] = useState(false)

  const handleSignin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await loginApi(form.username, form.password);
      const userData = {
        userId: data.userId,
        username: data.username,
        fullName: data.fullName,
        email: data.email,
        role: data.role
      };
      setAuth(data.token, userData);
      onLoginSuccess(userData);
      showAlert('success', 'Welcome back to ComiVerse!');
    } catch (err) {
      const errMessage = err.response?.data?.message || 'Invalid username or password.';
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

      {/* View Toggle tabs */}
      <div className="form-toggle-tabs">
        <button className="tab-btn active">Sign In</button>
        <button className="tab-btn" onClick={() => onNavigate('signup')}>Sign Up</button>
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

      <form onSubmit={handleSignin}>
        <div className="input-field-group">
          <label htmlFor="signin-username">EMAIL OR USERNAME</label>
          <input 
            id="signin-username"
            type="text" 
            placeholder="you@example.com" 
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        </div>

        <div className="input-field-group">
          <label htmlFor="signin-password">PASSWORD</label>
          <div className="password-input-wrapper">
            <input 
              id="signin-password"
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button 
              type="button" 
              className="password-toggle-eye"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👁️' : '🙈'}
            </button>
          </div>
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
