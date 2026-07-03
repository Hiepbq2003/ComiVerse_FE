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
import { useAuth } from '../../context/AuthContext'
import { getMeApi } from '../../services/api/AuthApi'
import { setAuth } from '../../utils/Auth'

function AuthPage() {
  const navigate = useNavigate()
  const { login, logout, isLoggedIn, user: authUser } = useAuth()
  const [view, setView] = useState('signin') // 'signin' | 'signup' | 'forgot' | 'reset' | 'profile' | 'oauth-loading'
  const [alert, setAlert] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [user, setUser] = useState(null)
  const [activeModal, setActiveModal] = useState('none') // 'none' | 'terms' | 'privacy'

  const openRoleDestination = (userData, options = {}) => {
    if (!userData) {
      setView('signin')
      return
    }
    const roleUpper = (userData.role || '').toUpperCase()

    if (roleUpper === 'ADMIN') {
      navigate('/admin/account-management', options)
      return
    }

    if (roleUpper === 'AUTHOR') {
      navigate('/author/overview', options)
      return
    }

    if (roleUpper === 'MODERATOR' || roleUpper === 'STAFF' || roleUpper === 'TRANSLATOR') {
      setUser(userData)
      setView('profile')
      return
    }

    navigate('/', options)
  }

  // Check URL parameters for OAuth redirect token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const refreshToken = urlParams.get('refreshToken')
    
    if (token || window.location.pathname.includes('/oauth2/redirect')) {
      setView('oauth-loading')
      if (token) {
        setAuth(token, '', refreshToken) // Temporary set token while fetching google details
        window.history.replaceState({}, document.title, '/')
        
        getMeApi()
          .then((userData) => {
            login(token, userData)
            openRoleDestination(userData, { replace: true });
            showAlert('success', 'Logged in successfully with Google!');
          })
          .catch((err) => {
            console.error('Failed to load OAuth profile details:', err);
            logout();
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
      if (isLoggedIn && authUser) {
        openRoleDestination(authUser, { replace: true });
      } else {
        const mode = urlParams.get('mode');
        if (mode && ['signin', 'signup', 'forgot'].includes(mode)) {
          setView(mode);
        }
      }
    }
  }, [navigate, window.location.search, isLoggedIn, authUser]);

  const showAlert = (type, message) => {
    setAlert({ type, message })
    setTimeout(() => {
      setAlert({ type: '', message: '' })
    }, 4000)
  }

  const handleLogout = () => {
    logout();
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
    <>
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
            openRoleDestination(userData, { replace: true });
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
            openRoleDestination(userData, { replace: true });
          }} 
          showAlert={showAlert} 
          loading={loading}
          setLoading={setLoading}
          onOpenModal={setActiveModal}
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

    {/* Terms and Privacy Modals at Root Level to avoid containing block transforms */}
    {activeModal !== 'none' && (
      <div className="policy-modal-overlay" onClick={() => setActiveModal('none')}>
        <div className="policy-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="policy-modal-header">
            <h3 className="policy-modal-title">
              {activeModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            </h3>
            <button className="policy-modal-close-btn" onClick={() => setActiveModal('none')}>
              &times;
            </button>
          </div>
          <div className="policy-modal-body">
            {activeModal === 'terms' ? (
              <>
                <p>Welcome to ComiVerse! Please read these Terms of Service ("Terms") carefully before using our platform.</p>

                <h4>1. Acceptance of Terms</h4>
                <p>By creating an account or accessing ComiVerse, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, you must not use our services.</p>

                <h4>2. Age Requirement</h4>
                <p>You must be at least 13 years old to register. If you are under 18, you represent that you have your parent or legal guardian's permission to use the platform.</p>

                <h4>3. User Accounts</h4>
                <p>You are responsible for safeguarding your account password and for any activities or actions under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.</p>

                <h4>4. Content Ownership and Licenses</h4>
                <ul>
                  <li><strong>User-Generated Content:</strong> Creators (Authors and Translators) retain copyright over their original comics or translation works. By uploading content to ComiVerse, you grant us a non-exclusive, worldwide, royalty-free license to host, display, and distribute your content.</li>
                  <li><strong>Platform Content:</strong> All brand logos, graphics, source code, and design components of ComiVerse are the property of ComiVerse and protected by intellectual property laws.</li>
                </ul>

                <h4>5. Prohibited Behavior</h4>
                <p>You agree not to upload, post, or transmit any content that:</p>
                <ul>
                  <li>Violates copyright, trademark, or other intellectual property rights.</li>
                  <li>Contains sexually explicit material, extreme violence, harassment, or hate speech.</li>
                  <li>Attempts to abuse, hack, or disrupt the platform's servers and services.</li>
                </ul>

                <h4>6. Termination</h4>
                <p>We reserve the right to suspend or terminate your account at our sole discretion, without prior notice, for conduct that violates these Terms or is harmful to other users or the platform.</p>

                <h4>7. Limitation of Liability</h4>
                <p>ComiVerse is provided "as is" without warranties of any kind. We shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use of the platform.</p>
              </>
            ) : (
              <>
                <p>At ComiVerse, we value your privacy. This Privacy Policy describes how we collect, use, and protect your personal information.</p>

                <h4>1. Information We Collect</h4>
                <ul>
                  <li><strong>Account Information:</strong> We collect your name, username, email address, password, and date of birth when you register.</li>
                  <li><strong>OAuth Data:</strong> If you sign up using Google, we retrieve your email address, name, and profile picture from Google.</li>
                  <li><strong>Usage Data:</strong> We track reading history, bookmarks, and interface preferences to personalize your experience.</li>
                </ul>

                <h4>2. How We Use Information</h4>
                <p>We use the collected information for the following purposes:</p>
                <ul>
                  <li>To authenticate users and manage active sessions.</li>
                  <li>To customize content recommendations and community interactions.</li>
                  <li>To send critical updates, newsletters, or platform announcements (which you can opt out of).</li>
                  <li>To monitor platform health and detect fraud or abuse.</li>
                </ul>

                <h4>3. Security and Storage</h4>
                <p>We implement industry-standard encryption and security measures to protect your credentials. Passwords are securely hashed and stored in our database. While we strive to protect your data, no method of transmission over the Internet is 100% secure.</p>

                <h4>4. Sharing and Disclosure</h4>
                <p>We do not sell, rent, or trade your personal data to third parties. We may share data only under the following circumstances:</p>
                <ul>
                  <li>With service providers performing necessary platform operations (e.g., database hosting).</li>
                  <li>When required by law to comply with legal requests or protect user safety.</li>
                  <li>With your explicit consent.</li>
                </ul>

                <h4>5. Cookies and Tracking</h4>
                <p>We use cookies and similar technologies to maintain your session tokens, store preferences, and analyze website traffic. You can disable cookies in your browser settings, but some features of the platform may not function properly.</p>

                <h4>6. Your Choices and Rights</h4>
                <p>You have the right to access, edit, or request the deletion of your personal account information at any time via your Profile Settings page or by contacting support.</p>
              </>
            )}
          </div>
          <div className="policy-modal-footer">
            <button type="button" className="policy-modal-ok-btn" onClick={() => setActiveModal('none')}>
              Understood
            </button>
          </div>
        </div>
      </div>
    )}
  </>
)
}

export default AuthPage

