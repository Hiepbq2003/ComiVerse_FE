import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import '../../assets/style/common/animated-button.css';

export const AnimatedButton = ({
  variant = 1,
  label = 'Button',
  tooltip = 'v3.0 stable',
  onClick = () => {},
  className = '',
  style = {},
  type = 'button'
}) => {
  const { theme } = useTheme();

  return (
    <div className={`animated-btn-container ${theme === 'light' ? 'light' : ''}`} style={style}>
      {/* Shared SVG Defs for gradients */}
      <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          <linearGradient id="grad-btn" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--grad-start)" />
            <stop offset="100%" stopColor="var(--grad-end)" />
          </linearGradient>
        </defs>
      </svg>

      {/* 1. Typewriter */}
      {variant === 1 && (
        <button 
          type={type} 
          className={`btn btn--typewriter ${className}`} 
          onClick={onClick}
          aria-label={label || 'Quantum'}
        >
          <span className="btn-tw__text-idle">{label || 'Quantum'}</span>
          <span className="btn-tw__text-done">Ready</span>
          <span className="btn-tw__cursor" aria-hidden="true"></span>
        </button>
      )}

      {/* 2. Rocket */}
      {variant === 2 && (
        <button 
          type={type} 
          className={`btn btn--rocket ${className}`} 
          onClick={onClick}
          aria-label={label || 'Launch'}
        >
          <svg className="btn-rocket__icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3"/><path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3"/><circle cx="15" cy="9" r="1"/></svg>
          <span className="btn__text">{label || 'Launch'}</span>
          <span className="btn-rocket__trail" aria-hidden="true"></span>
        </button>
      )}

      {/* 3. Icon Swap */}
      {variant === 3 && (
        <button 
          type={type} 
          className={`btn btn--icon-swap ${className}`} 
          onClick={onClick}
          data-tooltip={tooltip}
          aria-label={label || 'Deploy'}
        >
          <span className="btn-is__inner">
            <span className="btn-is__text">{label || 'Deploy'}</span>
            <span className="btn-is__icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.698 4.034l16.302 7.966l-16.302 7.966a.503 .503 0 0 1 -.546 -.124a.555 .555 0 0 1 -.12 -.568l2.468 -7.274l-2.468 -7.274a.555 .555 0 0 1 .12 -.568a.503 .503 0 0 1 .546 -.124z"/><path d="M6.5 12h14.5"/></svg>
            </span>
          </span>
        </button>
      )}

      {/* 4. Spark */}
      {variant === 4 && (
        <button 
          type={type} 
          className={`btn btn--spark ${className}`} 
          onClick={onClick}
          aria-label={label || 'Ignite'}
        >
          <span className="btn__text">{label || 'Ignite'}</span>
        </button>
      )}

      {/* 5. Circle Expand */}
      {variant === 5 && (
        <button 
          type={type} 
          className={`btn btn--circle-expand ${className}`} 
          onClick={onClick}
          aria-label={label || 'Explore'}
        >
          <span className="btn-ce__circle" aria-hidden="true">
            <span className="btn-ce__arrow"></span>
          </span>
          <span className="btn-ce__text">{label || 'Nebula'}</span>
        </button>
      )}

      {/* 6. Shine */}
      {variant === 6 && (
        <button 
          type={type} 
          className={`btn btn--shine ${className}`} 
          onClick={onClick}
          aria-label={label || 'Supernova'}
        >
          <span className="btn__text">{label || 'Supernova'}</span>
        </button>
      )}

      {/* 7. Flip */}
      {variant === 7 && (
        <button 
          type={type} 
          className={`btn btn--flip ${className}`} 
          onClick={onClick}
          aria-label={label || 'Transmit'}
        >
          <span className="btn-flip__inner">
            <span className="btn-flip__front">{label || 'Transmit'}</span>
            <span className="btn-flip__back">Received</span>
          </span>
        </button>
      )}

      {/* 8. Expand */}
      {variant === 8 && (
        <button 
          type={type} 
          className={`btn btn--expand ${className}`} 
          onClick={onClick}
          aria-label={label || 'Fusion'}
        >
          <svg className="btn-exp__icon" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#atom-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="atom-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--grad-start)"/>
                <stop offset="100%" stopColor="var(--grad-end)"/>
              </linearGradient>
            </defs>
            <path d="M12 12v.01"/>
            <path d="M19.071 4.929c-1.562 -1.562 -6 .337 -9.9 4.243c-3.905 3.905 -5.804 8.337 -4.242 9.9c1.562 1.561 6 -.338 9.9 -4.244c3.905 -3.905 5.804 -8.337 4.242 -9.9z"/>
            <path d="M4.929 4.929c-1.562 1.562 .337 6 4.243 9.9c3.905 3.905 8.337 5.804 9.9 4.242c1.561 -1.562 -.338 -6 -4.244 -9.9c-3.905 -3.905 -8.337 -5.804 -9.9 -4.242z"/>
          </svg>
        </button>
      )}

      {/* 9. Badge Arrow */}
      {variant === 9 && (
        <button 
          type={type} 
          className={`btn btn--badge ${className}`} 
          onClick={onClick}
          aria-label={label || 'Cosmos'}
        >
          <span className="btn-badge__text">{label || 'Cosmos'}</span>
          <span className="btn-badge__icon" aria-hidden="true">
            <svg viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg" width="10"><path d="M13.376 11.552l-.264-10.44-10.44-.24.024 2.28 6.96-.048L.2 12.56l1.488 1.488 9.432-9.432-.048 6.912 2.304.024z" fill="currentColor"/></svg>
            <svg viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg" width="10" className="btn-badge__icon-copy"><path d="M13.376 11.552l-.264-10.44-10.44-.24.024 2.28 6.96-.048L.2 12.56l1.488 1.488 9.432-9.432-.048 6.912 2.304.024z" fill="currentColor"/></svg>
          </span>
        </button>
      )}

      {/* 10. Warp */}
      {variant === 10 && (
        <button 
          type={type} 
          className={`btn btn--warp ${className}`} 
          onClick={onClick}
          aria-label={label || 'Activate'}
        >
          <span className="btn-warp__ring" aria-hidden="true"></span>
          <span className="btn-warp__trail" aria-hidden="true"></span>
          <span className="btn-warp__text">{label || 'Activate'}</span>
          <span className="btn-warp__done">Live!</span>
        </button>
      )}
    </div>
  );
};

export default AnimatedButton;
