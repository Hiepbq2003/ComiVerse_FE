import React, { useState } from 'react';
import { AnimatedButton } from './AnimatedButton';
import { useTheme } from '../../context/ThemeContext';
import '../../assets/style/common/animated-button.css';

export const AnimatedButtonShowcase = () => {
  const { theme, toggleTheme } = useTheme();
  const [lastAction, setLastAction] = useState('Interact with any button to see actions');

  const logClick = (num, label) => {
    setLastAction(`[Button #${num} - ${label}] Clicked`);
  };

  const specimens = [
    { num: 1, name: 'Typewriter', variant: 1, label: 'Quantum' },
    { num: 2, name: 'Rocket', variant: 2, label: 'Launch' },
    { num: 3, name: 'Icon Swap', variant: 3, label: 'Deploy', tooltip: 'v3.0 stable' },
    { num: 4, name: 'Spark', variant: 4, label: 'Ignite' },
    { num: 5, name: 'Circle Expand', variant: 5, label: 'Nebula' },
    { num: 6, name: 'Shine', variant: 6, label: 'Supernova' },
    { num: 7, name: 'Flip', variant: 7, label: 'Transmit' },
    { num: 8, name: 'Expand', variant: 8, label: '' },
    { num: 9, name: 'Badge Arrow', variant: 9, label: 'Cosmos' },
    { num: 10, name: 'Warp', variant: 10, label: 'Activate' }
  ];

  return (
    <div className={`animated-buttons-showcase ${theme === 'light' ? 'light' : ''}`}>
      {/* Top Bar with user profile and theme switch */}
      <div className="top-bar">
        <div className="profile-wrapper">
          <img className="profile" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80" alt="avatar" />
          <p>@davidm_ai</p>
        </div>
        <label className="skel-theme-switch" aria-label="Toggle light and dark theme">
          <span style={{ color: theme === 'light' ? 'var(--text-muted)' : 'var(--accent)' }}>🌙 Dark</span>
          <div className="skel-theme-switch__track" onClick={toggleTheme}>
            <div className="skel-theme-switch__thumb" style={{ transform: theme === 'light' ? 'translateX(calc(2.4rem - 1.3rem))' : 'translateX(0)' }}></div>
          </div>
          <span style={{ color: theme === 'light' ? '#E8A317' : 'var(--text-muted)' }}>☀️ Light</span>
        </label>
      </div>

      {/* Main Title Headers */}
      <div className="title-group">
        <p className="title-label">AI Builder Components</p>
        <h1>10 Animated <span className="emph">CSS Buttons</span></h1>
        <p className="title-sub">Hover to trigger creative lifecycle micro-animations</p>
      </div>

      {/* Grid of specimens */}
      <div className="specimens">
        {specimens.map((spec) => (
          <div key={spec.num} className="specimen">
            <div className="specimen__label">
              <span className="specimen__num">{spec.num}</span>
              <span className="specimen__name">{spec.name}</span>
            </div>
            
            <AnimatedButton 
              variant={spec.variant}
              label={spec.label}
              tooltip={spec.tooltip}
              onClick={() => logClick(spec.num, spec.name)}
            />
          </div>
        ))}
      </div>

      {/* Bottom code comment */}
      <p className="code-comments">Interactive Showcase Console: <span className="emph">{lastAction}</span></p>

      {/* Footer Branding */}
      <p className="bottom-bar">
        <span className="modern-frontend-developer">
          <span className="emph">Don't miss out on AI revolution</span>
        </span>
        <span className="learning-link" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#grad-btn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 8l-4 4l4 4" /><path d="M17 8l4 4l-4 4" /><path d="M14 4l-4 16" /></svg>
          learning.atheros.ai
        </span>
      </p>
    </div>
  );
};

export default AnimatedButtonShowcase;
