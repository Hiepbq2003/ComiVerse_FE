import { useState } from 'react'
import { registerApi } from '../../services/api/AuthApi'
import { setAuth } from '../../utils/Auth'

function Register({ onNavigate, onRegisterSuccess, showAlert, loading, setLoading }) {
  const [form, setForm] = useState({ username: '', fullName: '', email: '', phone: '', password: '', confirmPassword: '' })

  const handleSignup = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      showAlert('error', 'Passwords do not match!');
      return;
    }
    setLoading(true)
    try {
      const data = await registerApi({
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() ? form.phone.trim() : null,
        password: form.password
      });

      const userData = {
        userId: data.userId,
        username: data.username,
        fullName: data.fullName,
        email: data.email,
        role: data.role
      };
      setAuth(data.token, userData);
      onRegisterSuccess(userData);
      showAlert('success', 'Account registered successfully!');
    } catch (err) {
      let errMessage = 'Registration failed.';
      if (err.response?.data) {
        if (err.response.data.errors) {
          errMessage = Object.values(err.response.data.errors).join(', ');
        } else if (err.response.data.message) {
          errMessage = err.response.data.message;
        }
      }
      showAlert('error', errMessage);
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="auth-form-card fade-in">
      <div className="form-header-group">
        <h2>Join ComiVerse</h2>
        <p>Create an account to start your adventure.</p>
      </div>

      {/* View Toggle tabs */}
      <div className="form-toggle-tabs">
        <button className="tab-btn" onClick={() => onNavigate('signin')}>Sign In</button>
        <button className="tab-btn active">Sign Up</button>
      </div>

      <form onSubmit={handleSignup}>
        <div className="input-field-group">
          <label htmlFor="signup-username">USERNAME</label>
          <input 
            id="signup-username"
            type="text" 
            placeholder="comic_fan" 
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        </div>

        <div className="input-field-group">
          <label htmlFor="signup-name">FULL NAME</label>
          <input 
            id="signup-name"
            type="text" 
            placeholder="John Doe" 
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
        </div>

        <div className="input-field-group">
          <label htmlFor="signup-email">EMAIL ADDRESS</label>
          <input 
            id="signup-email"
            type="email" 
            placeholder="john@example.com" 
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className="input-field-group">
          <label htmlFor="signup-phone">PHONE NUMBER</label>
          <input 
            id="signup-phone"
            type="tel" 
            placeholder="0912345678" 
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </div>

        <div className="input-field-group">
          <label htmlFor="signup-password">PASSWORD</label>
          <input 
            id="signup-password"
            type="password" 
            placeholder="••••••••" 
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <div className="input-field-group">
          <label htmlFor="signup-confirm">CONFIRM PASSWORD</label>
          <input 
            id="signup-confirm"
            type="password" 
            placeholder="••••••••" 
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating Account...' : 'Sign Up'} <span className="btn-arrow-icon">›</span>
        </button>
      </form>

      <div className="form-footer-switch">
        <span>Already have an account? </span>
        <button type="button" className="footer-link-highlight" onClick={() => onNavigate('signin')}>
          Sign In
        </button>
      </div>
    </div>
  )
}

export default Register
