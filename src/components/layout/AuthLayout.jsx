import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'
import '../../assets/style/App.css'

function AuthLayout({ children, alert }) {
  return (
    <div className="auth-page-container">
      {/* Left Pane - Branding & Floating Comic Cards */}
      <div className="left-branding-pane">
        <div className="brand-header">
          <div className="brand-logo-icon">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm-4 8H7v-2h6v2z"/>
            </svg>
          </div>
          <span className="brand-logo-text">ComiVerse</span>
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
          <p>Discover 50,000+ comics, manhwa & manga — updated daily, completely free.</p>
        </div>
      </div>

      {/* Right Pane - Dynamic Authentication Forms */}
      <div className="right-form-pane">
        {/* Toast Alert Banner */}
        {alert && alert.message && (
          <div className={`alert-banner ${alert.type}`}>
            <span className="alert-icon">
              {alert.type === 'success' ? '✅' : '❌'}
            </span>
            <span className="alert-text">{alert.message}</span>
          </div>
        )}

        <div className="form-wrapper-inner">
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
