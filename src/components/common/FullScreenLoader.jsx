import React from 'react';
import LogoIcon from './LogoIcon';
import '../../assets/style/common/full-screen-loader.css';

function FullScreenLoader() {
  return (
    <div className="full-screen-loader-overlay">
      <div className="full-screen-loader-content">
        <div className="full-screen-loader-spinner">
          <svg viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
          </svg>
        </div>
        <div className="full-screen-loader-logo">
          <LogoIcon width={140} height={28} />
        </div>
      </div>
    </div>
  );
}

export default FullScreenLoader;
