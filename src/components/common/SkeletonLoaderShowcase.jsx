import React, { useState } from 'react';
import { SkeletonLoader } from './SkeletonLoader';
import '../../assets/style/common/skeleton-loader.css';

export const SkeletonLoaderShowcase = () => {
  const [isLight, setIsLight] = useState(false);

  const skeletonTypes = [
    'shimmer',
    'gradient',
    'staggered',
    'typewriter',
    'layered',
    'elastic',
    'pulse',
    'cascade',
    'outline'
  ];

  return (
    <div className={`skel-container ${isLight ? 'light' : ''}`}>
      <div className="skel-theme-toggle-row">
        <label className="skel-theme-switch" aria-label="Toggle light and dark theme">
          <span style={{ color: isLight ? 'var(--text-muted)' : 'var(--accent)' }}>🌙 Dark</span>
          <div className="skel-theme-switch__track" onClick={() => setIsLight(!isLight)}>
            <div className="skel-theme-switch__thumb"></div>
          </div>
          <span style={{ color: isLight ? '#E8A317' : 'var(--text-muted)' }}>☀️ Light</span>
        </label>
      </div>

      <div className="skel-title-group">
        <div className="skel-title-label">HTML / CSS Interactive Showcase</div>
        <h2><span className="skel-emph">Skeleton Loading</span> Patterns</h2>
        <p className="skel-title-sub">Click any card to trigger the loading animation sequence</p>
      </div>

      <div className="skel-grid">
        {skeletonTypes.map((type) => (
          <SkeletonLoader key={type} type={type} isLight={isLight} />
        ))}
      </div>
    </div>
  );
};
