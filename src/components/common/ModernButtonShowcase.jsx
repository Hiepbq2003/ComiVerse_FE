import React, { useState } from 'react';
import { ModernButton } from './ModernButton';
import '../../assets/style/common/modern-button.css';

export const ModernButtonShowcase = () => {
  const [clickLog, setClickLog] = useState('Click any button to trigger action');

  const logClick = (variant, label) => {
    setClickLog(`Clicked button #${variant} "${label}"`);
  };

  const buttonSpecimens = [
    { num: 1, label: 'Download', variant: 1, tooltip: 'Size: 25Mb' },
    { num: 2, label: 'Login', variant: 2 },
    { num: 3, label: 'Send', variant: 3 },
    { num: 4, label: 'Explore All', variant: 4 },
    { num: 5, label: 'Sign Up', variant: 5 },
    { num: 6, label: 'Back to Top', variant: 6 }
  ];

  return (
    <div className="modern-buttons-showcase">
      <div style={{ marginBottom: '1.5rem' }}>
        <span 
          style={{
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#705CFF'
          }}
        >
          Aesthetic Elements
        </span>
        <h2>Modern CSS Buttons</h2>
        <p className="title-sub">Hover to trigger micro-animations, click to trigger callbacks</p>
      </div>

      <div className="buttons-grid">
        {buttonSpecimens.map((btn) => (
          <div key={btn.num} className="button-wrapper">
            <span className="num">{btn.num}</span>
            <ModernButton 
              variant={btn.variant} 
              label={btn.label} 
              tooltip={btn.tooltip}
              onClick={() => logClick(btn.num, btn.label)}
            />
          </div>
        ))}
      </div>

      <div 
        style={{
          marginTop: '2rem',
          borderTop: '1px solid #E5E7EB',
          paddingTop: '1rem',
          fontSize: '12px',
          color: '#5B5D72',
          fontStyle: 'italic'
        }}
      >
        Interaction Log: <span style={{ color: '#705CFF', fontWeight: '600' }}>{clickLog}</span>
      </div>
    </div>
  );
};

export default ModernButtonShowcase;
