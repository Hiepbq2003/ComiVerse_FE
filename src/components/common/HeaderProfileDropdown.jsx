import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import '../../assets/style/common/header-profile-dropdown.css';

export const HeaderProfileDropdown = ({ 
  user = { name: 'David Taylor', email: 'david@example.com', avatar: null },
  onLogout = () => {}
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [activeAccount, setActiveAccount] = useState('david'); // 'david' or 'melissa'
  const dropdownRef = useRef(null);

  // Close dropdown on outside click or ESC key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const accounts = {
    david: {
      name: 'David Taylor',
      email: 'david@example.com',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop&q=80'
    },
    melissa: {
      name: 'Melissa Johnson',
      email: 'mel@example.com',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop&q=80'
    }
  };

  const currentProfile = accounts[activeAccount];

  return (
    <div 
      className={`profile-dropdown-container ${theme === 'light' ? 'light' : ''}`}
      ref={dropdownRef}
    >
      {/* Trigger Area */}
      <span className="profile-navigation-group">
        {/* Message Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="profile-icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
          <path d="M8 9h8"></path>
          <path d="M8 13h6"></path>
          <path d="M9 18h-3a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-3l-3 3l-3 -3z"></path>
        </svg>

        {/* Bell Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="profile-icon" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
          <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"></path>
          <path d="M9 17v1a3 3 0 0 0 6 0v-1"></path>
        </svg>            

        {/* Profile Avatar Trigger Button */}
        <button 
          className="profile-trigger" 
          aria-haspopup="true" 
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="profile-avatar-container">
            <img className="profile-img" src={currentProfile.avatar} alt="Profile" />
            <span className="profile-status-indicator"></span>
          </div>
        </button>
      </span>

      {/* Dropdown Menu Panel */}
      <div className={`profile-dropdown-wrapper ${isOpen ? 'show' : ''}`}>
        <nav>
          {/* Main Account links */}
          <ul>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="profile-dropdown-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855" /></svg>                              
              My Profile
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="profile-dropdown-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" /><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" /></svg>
              Account Settings
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="profile-dropdown-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 4m0 1a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z" /><path d="M7 20l10 0" /><path d="M9 16l0 4" /><path d="M15 16l0 4" /><path d="M8 12l3 -3l2 2l3 -3" /></svg> 
              Device Management
            </li>
          </ul>
          
          <hr className="profile-dropdown-divider" />
          
          {/* Light/Dark mode switcher */}
          <ul>
            <li className="profile-dropdown-toggle-item">
              <div className="profile-dropdown-flex-row">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="profile-dropdown-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /><path d="M3 12h1" /><path d="M12 3v1" /><path d="M20 12h1" /><path d="M12 20v1" /><path d="M5.6 5.6l.7 .7" /><path d="M18.4 5.6l-.7 .7" /><path d="M17.7 17.7l-.7 .7" /><path d="M6.3 17.7l.7 .7" /></svg>
                <span>Light Mode</span>
              </div>
              <label className="profile-dropdown-switch">
                <input 
                  type="checkbox" 
                  checked={theme === 'light'} 
                  onChange={toggleTheme} 
                />
                <span className="profile-dropdown-slider"></span>
              </label>
            </li>
          </ul>
          
          <hr className="profile-dropdown-divider" />
          
          {/* Switch accounts list */}
          <div className="profile-dropdown-switch-account">
            <h2>Switch Account</h2>
            <ul>
              <li 
                className={activeAccount === 'david' ? 'active' : ''}
                onClick={() => setActiveAccount('david')}
              >
                <img src={accounts.david.avatar} alt="David" /> 
                <div className="profile-dropdown-user">
                  <div className="profile-dropdown-name">{accounts.david.name}</div>
                  <div className="profile-dropdown-email">{accounts.david.email}</div>
                </div>
                <div className="profile-dropdown-marker"></div>
              </li>
              <li 
                className={activeAccount === 'melissa' ? 'active' : ''}
                onClick={() => setActiveAccount('melissa')}
              >
                <img src={accounts.melissa.avatar} alt="Melissa" />
                <div className="profile-dropdown-user">
                  <div className="profile-dropdown-name">{accounts.melissa.name}</div>
                  <div className="profile-dropdown-email">{accounts.melissa.email}</div>
                </div>
                <div className="profile-dropdown-marker"></div>
              </li>
            </ul>
          </div>
          
          <hr className="profile-dropdown-divider" />
          
          {/* Sign out */}
          <button 
            className="profile-dropdown-sign-out"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="profile-dropdown-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 8v-2a2 2 0 0 1 2 -2h7a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-7a2 2 0 0 1 -2 -2v-2" /><path d="M15 12h-12l3 -3" /><path d="M6 15l-3 -3" /></svg>
            Sign out all accounts
          </button>
        </nav>
      </div>
    </div>
  );
};
export default HeaderProfileDropdown;
