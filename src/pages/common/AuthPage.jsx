import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../../components/layout/AuthLayout'
import Login from './Login'
import Register from './Register'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'
import Profile from './Profile'
import AdminDashboard from '../admin/AdminDashboard'
import AuthorDashboard from '../author/AuthorDashboard'
import ModeratorDashboard from '../moderator/ModeratorDashboard'
import TranslatorDashboard from '../translator/TranslatorDashboard'
import { getAuth, clearAuth, setAuth } from '../../utils/Auth'
import { getMeApi } from '../../services/api/AuthApi'

function AuthPage() {
  const navigate = useNavigate()
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
        
        getMeApi()
          .then((userData) => {
            setAuth(token, userData);
            setUser(userData);
            setView('profile');
            navigate('/', { replace: true });
            showAlert('success', 'Logged in successfully with Google!');
          })
          .catch((err) => {
            console.error('Failed to load OAuth profile details:', err);
            clearAuth();
            setView('signin');
            showAlert('error', 'Failed to retrieve Google user details.');
          });
      } else {
        setTimeout(() => {
          setView('signin');
          showAlert('error', 'OAuth2 login failed.');
        }, 1000);
      }
    } else {
      const auth = getAuth();
      if (auth && auth.token && auth.user) {
        // ADMIN/AUTHOR users go directly to their respective portals
        const roleUpper = (auth.user.role || '').toUpperCase();
        if (roleUpper === 'ADMIN') {
          navigate('/admin/account-management', { replace: true });
          return;
        }
         if (roleUpper === 'AUTHOR') {
          navigate('/author/overview', { replace: true });
          return;
        }
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


  const renderProfileDashboard = () => {
    if (!user) return null;
    const roleUpper = (user.role || '').toUpperCase();
    switch (roleUpper) {
      case 'ADMIN':
        return <AdminDashboard user={user} onLogout={handleLogout} />;
      case 'AUTHOR':
        return <AuthorDashboard user={user} onLogout={handleLogout} />;
      case 'MODERATOR':
      case 'STAFF':
        return <ModeratorDashboard user={user} onLogout={handleLogout} />;
      case 'TRANSLATOR':
        return <TranslatorDashboard user={user} onLogout={handleLogout} />;
      case 'READER':
      case 'USER':
      default:
        return <Profile user={user} onLogout={handleLogout} />;
    }
  };

  if (view === 'profile' && user) {
    return renderProfileDashboard();
  }

  return (
    <AuthLayout alert={alert} isWide={view === 'signup'}>
      {view === 'oauth-loading' && (
        <div className="loading-state-wrapper">
          <div className="spinner"></div>
          <h2>Verifying OAuth2 Session</h2>
          <p>Please wait while we log you in securely...</p>
        </div>
      )}

      {view === 'signin' && (
        <Login 
          onNavigate={setView} 
          onLoginSuccess={(userData) => {
            // ADMIN/AUTHOR users redirect to their respective portals
            const roleUpper = (userData.role || '').toUpperCase();
            if (roleUpper === 'ADMIN') {
              navigate('/admin/account-management', { replace: true });
              return;
            }
             if (roleUpper === 'AUTHOR') {
              navigate('/author/overview', { replace: true });
              return;
            }
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
