import React, { useState } from 'react';
import { HeaderProfileDropdown } from './HeaderProfileDropdown';
import { useTheme } from '../../context/ThemeContext';
import '../../assets/style/common/header-profile-dropdown.css';

export const HeaderProfileDropdownShowcase = () => {
  const { theme } = useTheme();
  const [log, setLog] = useState('No actions performed yet');

  const handleLogout = () => {
    setLog('Logged out of all accounts.');
  };

  return (
    <div 
      className={`profile-dropdown-container ${theme === 'light' ? 'light' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto',
        padding: '2rem 1rem',
        textAlign: 'center'
      }}
    >
      <div 
        style={{
          width: '100%',
          textAlign: 'center',
          marginBottom: '2rem'
        }}
      >
        <span 
          style={{
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            background: 'linear-gradient(135deg, #ED3EEC, #0FD393)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Theme Switcher Dropdown
        </span>
        <h2 style={{ fontSize: '32px', fontWeight: '700', marginTop: '8px' }}>
          Interactive Header Menu
        </h2>
        <p style={{ color: 'var(--text-gray)', fontSize: '14px', marginTop: '4px' }}>
          Hover & click options, swap user accounts, and toggle themes in real-time.
        </p>
      </div>

      {/* Mock Header element wrapping the dropdown */}
      <div className="profile-dropdown-header-demo">
        <HeaderProfileDropdown onLogout={handleLogout} />
      </div>

      {/* Interactive Logs console */}
      <div 
        style={{
          width: '100%',
          borderTop: '1px solid var(--border)',
          paddingTop: '1rem',
          marginTop: '1rem',
          fontSize: '12px',
          color: 'var(--text-gray)'
        }}
      >
        <span>Showcase Action Log: </span>
        <span style={{ fontStyle: 'italic', color: 'var(--success)' }}>{log}</span>
      </div>
    </div>
  );
};
export default HeaderProfileDropdownShowcase;
