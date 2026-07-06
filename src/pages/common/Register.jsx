import { useState } from 'react'
import { registerApi, getMeApi } from '../../services/api/AuthApi'
import { useAuth } from '../../context/AuthContext'
import { setAuth } from '../../utils/Auth'

function Register({ onNavigate, onRegisterSuccess, showAlert, loading, setLoading, onOpenModal }) {
  const { login } = useAuth()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    dateOfBirth: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)

  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'None' }
    if (pass.length < 8) return { score: 1, label: 'Too Short' }
    
    let score = 0
    if (/[a-z]/.test(pass)) score++
    if (/[A-Z]/.test(pass)) score++
    if (/[0-9]/.test(pass)) score++
    if (/[^a-zA-Z0-9]/.test(pass)) score++
    
    if (score <= 2) return { score: 1, label: 'Weak' }
    if (score === 3) return { score: 2, label: 'Medium' }
    return { score: 3, label: 'Strong' }
  }

  const strength = getPasswordStrength(form.password)

  const handleSignup = async (e) => {
    e.preventDefault()

    // Validate Terms
    if (!form.agreeTerms) {
      showAlert('error', 'You must agree to the Terms of Service and Privacy Policy.')
      return
    }

    // Validate Password Match
    if (form.password !== form.confirmPassword) {
      showAlert('error', 'Passwords do not match!')
      return
    }

    // Validate Username regex
    const usernameRegex = /^[a-z0-9_]{3,20}$/
    if (!usernameRegex.test(form.username.trim())) {
      showAlert('error', 'Username must be 3-20 characters, lowercase, numbers, and underscores only.')
      return
    }

    // Validate Age (>= 13 years old)
    if (form.dateOfBirth) {
      const today = new Date()
      const birthDate = new Date(form.dateOfBirth)
      let age = today.getFullYear() - birthDate.getFullYear()
      const m = today.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      if (age < 13) {
        showAlert('error', 'You must be at least 13 years old to register.')
        return
      }
    }

    setLoading(true)
    try {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()
      const data = await registerApi({
        username: form.username.trim(),
        fullName: fullName || 'Unspecified Name',
        email: form.email.trim(),
        password: form.password
      })

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
        avatarUrl: meData.avatarUrl,
        premiumPlan: meData.premiumPlan,
        premiumExpiresAt: meData.premiumExpiresAt,
        premiumActive: meData.premiumActive
      }
      login(data.token, userData)
      onRegisterSuccess(userData)
      showAlert('success', 'Account registered successfully!')
    } catch (err) {
      let errMessage = 'Registration failed.'
      if (err.response?.data) {
        if (err.response.data.errors) {
          errMessage = Object.values(err.response.data.errors).join(', ')
        } else if (err.response.data.message) {
          errMessage = err.response.data.message
        }
      }
      showAlert('error', errMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = () => {
    window.location.href = '/api/oauth2/authorization/google'
  }

  return (
    <div className="auth-form-card register-card fade-in">
      <div className="border-beam-wrapper" />
      <div className="form-header-group">
        <h2>Create Account</h2>
        <p>Join the largest comic reading community.</p>
      </div>

      <form onSubmit={handleSignup}>
        <div className="register-grid-container">
          
          {/* COLUMN 1: Personal Information */}
          <div className="register-column">
            <h3 className="register-column-title">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Personal Information
            </h3>
            
            {/* First & Last Name */}
            <div className="first-last-name-row">
              <div className="glass-input-wrapper">
                <span className="glass-input-label">First Name</span>
                <input 
                  id="signup-firstname"
                  type="text" 
                  placeholder="Enter first name" 
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="glass-input-field"
                  required
                />
              </div>
              <div className="glass-input-wrapper">
                <span className="glass-input-label">Last Name</span>
                <input 
                  id="signup-lastname"
                  type="text" 
                  placeholder="Enter last name" 
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="glass-input-field"
                  required
                />
              </div>
            </div>

            {/* Username */}
            <div className="glass-input-wrapper auth-margin-top-16">
              <span className="glass-input-label">Username *</span>
              <input 
                id="signup-username"
                type="text" 
                placeholder="Choose a username" 
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                className="glass-input-field"
                required
              />
            </div>
            <p className="input-description-label">
              3-20 characters, lowercase, numbers and underscores only.
            </p>

            {/* Email */}
            <div className="glass-input-wrapper auth-margin-top-16">
              <span className="glass-input-label">Email *</span>
              <input 
                id="signup-email"
                type="email" 
                placeholder="Enter email address" 
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="glass-input-field"
                required
              />
            </div>

            {/* Date of Birth */}
            <div className="glass-input-wrapper auth-margin-top-16">
              <span className="glass-input-label">Date of Birth</span>
              <input 
                id="signup-dob"
                type="date" 
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className="glass-input-field"
                required
              />
            </div>
            <p className="input-description-label">
              Must be &ge; 13 years old to register.
            </p>
          </div>

          {/* COLUMN 2: Security & Authentication */}
          <div className="register-column">
            <h3 className="register-column-title">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Security & Authentication
            </h3>

            {/* Google Signup Button */}
            {/* Google Signup Button */}
            <div className="auth-margin-top-12">
              <button 
                type="button" 
                className="btn-google-signup"
                onClick={handleGoogleSignup}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.09-.2-.18-.42-.27-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                Sign up with Gmail
              </button>
              <p className="gmail-subtext">Quick sign up with Gmail. Safe and convenient.</p>
            </div>

            {/* Separator OR */}
            <div className="divider-text-or auth-margin-top-12"><span>OR</span></div>

            {/* Password */}
            <div className="glass-input-wrapper">
              <div className="glass-input-row">
                <div className="auth-flex-fill">
                  <span className="glass-input-label">Password *</span>
                  <input 
                    id="signup-password"
                    type={showPassword ? "text" : "password"} 
                    placeholder="Create password" 
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="glass-input-field"
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    required
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

              {/* Password Strength Indicator */}
              {form.password && isPasswordFocused && (
                <section className="strength" aria-live="polite">
                  <div className="strength__meter">
                    <div className="strength__track">
                      <div 
                        className="strength__fill" 
                        id="strength-fill" 
                        style={{ 
                          width: strength.score === 1 ? '33.33%' : strength.score === 2 ? '66.66%' : strength.score === 3 ? '100%' : '0%',
                          background: strength.score === 1 ? 'linear-gradient(90deg, #ef4444, #f97316)' : strength.score === 2 ? 'linear-gradient(90deg, #f97316, #eab308)' : 'linear-gradient(90deg, #10b981, #06b6d4)'
                        }}
                      ></div>
                    </div>
                    <div className="strength__status">
                      <span className="strength__caption">Password strength</span>
                      <span 
                        className="strength__level" 
                        id="strength-level" 
                        data-level={strength.label.toLowerCase()}
                        style={{
                          color: strength.score === 1 ? '#ef4444' : strength.score === 2 ? '#eab308' : '#10b981',
                          fontWeight: 700,
                          fontSize: '11px'
                        }}
                      >
                        {strength.label}
                      </span>
                    </div>
                  </div>

                  <ul className="rules auth-rules-list" id="rules" role="list">
                    {[
                      { label: 'At least 8 characters', valid: form.password.length >= 8 },
                      { label: 'One uppercase letter (A-Z)', valid: /[A-Z]/.test(form.password) },
                      { label: 'One lowercase letter (a-z)', valid: /[a-z]/.test(form.password) },
                      { label: 'One number (0-9) or symbol', valid: /[0-9\W]/.test(form.password) }
                    ].map((rule, idx) => (
                      <li 
                        key={idx} 
                        className={`rule-item auth-rule-item ${rule.valid ? 'valid' : ''}`}
                      >
                        <span 
                          className={`auth-rule-icon ${rule.valid ? 'valid' : 'invalid'}`}
                        >
                          {rule.valid ? (
                            <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : '•'}
                        </span>
                        <span>{rule.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Confirm Password */}
            <div className="glass-input-wrapper auth-margin-top-16">
              <div className="glass-input-row">
                <div className="auth-flex-fill">
                  <span className="glass-input-label">Confirm Password *</span>
                  <input 
                    id="signup-confirm"
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirm password" 
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="glass-input-field"
                    required
                  />
                </div>
                <button 
                  type="button" 
                  className="glass-input-trailing-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
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
            </div>
          </div>

        </div>

        {/* Checkbox terms agreement */}
        <label className="terms-checkbox-container">
          <input 
            type="checkbox" 
            checked={form.agreeTerms}
            onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })}
          />
          <span>
            I agree to the <a href="#terms" className="terms-link" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenModal('terms'); }}>Terms of Service</a> and <a href="#privacy" className="terms-link" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenModal('privacy'); }}>Privacy Policy</a>
          </span>
        </label>

        {/* Submit button */}
        <button type="submit" className="btn-primary auth-margin-top-16" disabled={loading}>
          <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
        </button>
      </form>

      {/* Switch to login */}
      <div className="form-footer-switch auth-margin-top-20">
        <span>Already have an account? </span>
        <button type="button" className="footer-link-highlight" onClick={() => onNavigate('signin')}>
          Sign In
        </button>
      </div>
    </div>
  )
}

export default Register

