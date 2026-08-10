import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'
import LogoIcon from '../common/LogoIcon'
import { Link } from 'react-router-dom'
import '../../assets/style/auth/auth.css'

function AuthLayout({ children, alert, isWide }) {
  return (
    <div className="auth-page-container">
      {/* Left Pane - Branding & Floating Comic Cards */}
      {!isWide && (
        <div className="left-branding-pane">
          <div className="brand-header">
            <Link to="/" style={{ textDecoration: 'none' }}>
              <LogoIcon size={36} />
            </Link>
          </div>

          {/* Floating Comic Cards Showcase */}
          <div className="comic-cards-container">
            <div className="comic-card card-cyan">
              <img src={comicAction} alt="Battle Chronicles" />
              <div className="comic-card-label-badge action">ACTION</div>
              <div className="comic-card-info">
                <h3>Battle Chronicles</h3>
                <span>Ch. 184</span>
              </div>
            </div>

            <div className="comic-card card-orange">
              <img src={comicAdventure} alt="Dragon Legacy" />
              <div className="comic-card-label-badge adventure">ADVENTURE</div>
              <div className="comic-card-info">
                <h3>Dragon Legacy</h3>
                <span>Ch. 372</span>
              </div>
            </div>

            <div className="comic-card card-purple">
              <img src={comicScifi} alt="Neon Genesis" />
              <div className="comic-card-label-badge scifi">SCI-FI</div>
              <div className="comic-card-info">
                <h3>Neon Genesis</h3>
                <span>Ch. 95</span>
              </div>
            </div>
          </div>

          <div className="brand-footer-text">
            <h1>Every chapter is <br/><span className="text-highlight">a new world.</span></h1>
            <p>Discover 1,000+ comics, manhwa & manga — updated daily, completely free.</p>
          </div>
        </div>
      )}

      {/* Right Pane - Dynamic Authentication Forms */}
      <div className="right-form-pane" style={isWide ? { flex: 1, width: '100%', minHeight: '100vh', position: 'relative' } : { position: 'relative' }}>
        
        <Link to="/" className="auth-back-btn" aria-label="Back to Home">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span style={{ marginLeft: '6px', fontWeight: '600' }}>Home</span>
        </Link>

        {/* Toast Alert Banner */}
        {alert && alert.message && (
          <div className={`alert-banner ${alert.type}`}>
            <span className="alert-icon" style={{ fontSize: '16px', lineHeight: 1, flexShrink: 0 }}>
              {alert.type === 'success' ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              )}
            </span>
            <span className="alert-text">{alert.message}</span>
          </div>
        )}

        <div className="form-wrapper-inner" style={{ maxWidth: isWide ? '820px' : '420px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthLayout

