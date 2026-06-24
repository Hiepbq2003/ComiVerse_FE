import { useState, useEffect } from 'react'
import AuthLayout from '../../components/layout/AuthLayout'
import Login from './Login'
import Register from './Register'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'
import Profile from './Profile'
import { getAuth, clearAuth, setAuth } from '../../utils/Auth'

function AuthPage() {
  const [view, setView] = useState('signin') // 'signin' | 'signup' | 'forgot' | 'reset' | 'profile' | 'oauth-loading'
  const [alert, setAlert] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [user, setUser] = useState(null)

  // Check URL parameters for OAuth redirect token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token || window.location.pathname.includes('/oauth2/redirect')) {
      setView('oauth-loading');
      if (token) {
        setAuth(token, ''); // Temporary set token while fetching google details
        window.history.replaceState({}, document.title, '/');
        
        setTimeout(() => {
          const googleUser = {
            username: 'google_user',
            fullName: 'Google Authenticated User',
            email: 'user@gmail.com',
            role: 'USER'
          };
          setAuth(token, googleUser);
          setUser(googleUser);
          setView('profile');
          showAlert('success', 'Logged in successfully with Google!');
        }, 1500);
      } else {
        setTimeout(() => {
          setView('signin');
          showAlert('error', 'OAuth2 login failed.');
        }, 1000);
      }
    } else {
      const auth = getAuth();
      if (auth && auth.token && auth.user) {
        setUser(auth.user);
        setView('profile');
      }
    }
  }, []);

  const showAlert = (type, message) => {
    setAlert({ type, message })
    setTimeout(() => {
      setAlert({ type: '', message: '' })
    }, 4000)
  }

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    setView('signin');
    showAlert('success', 'Logged out successfully.');
  }


  return (
    <AuthLayout alert={alert}>
      {view === 'oauth-loading' && (
        <div className="loading-state-wrapper">
          <div className="spinner"></div>
          <h2>Verifying OAuth2 Session</h2>
          <p>Please wait while we log you in securely...</p>
        </div>
      )}

      {view === 'profile' && user && (
        <Profile user={user} onLogout={handleLogout} />
      )}

      {view === 'signin' && (
        <Login 
          onNavigate={setView} 
          onLoginSuccess={(userData) => {
            setUser(userData);
            setView('profile');
          }} 
          showAlert={showAlert} 
          loading={loading}
          setLoading={setLoading}
        />
      )}

      {view === 'signup' && (
        <Register 
          onNavigate={setView} 
          onRegisterSuccess={(userData) => {
            setUser(userData);
            setView('profile');
          }} 
          showAlert={showAlert} 
          loading={loading}
          setLoading={setLoading}
        />
      )}

      {view === 'forgot' && (
        <ForgotPassword 
          onNavigate={setView} 
          onOTPSent={(email) => {
            setResetEmail(email);
            setView('reset');
          }} 
          showAlert={showAlert} 
          loading={loading}
          setLoading={setLoading}
        />
      )}

      {view === 'reset' && (
        <ResetPassword 
          email={resetEmail} 
          onNavigate={setView} 
          showAlert={showAlert} 
          loading={loading}
          setLoading={setLoading}
        />
      )}
    </AuthLayout>
  )
}

export default AuthPage
