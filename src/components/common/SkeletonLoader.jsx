import React, { useState, useEffect, useRef } from 'react';
import '../../assets/style/common/skeleton-loader.css';

export const SkeletonLoader = ({ type = 'shimmer', isLight = false }) => {
  const [animating, setAnimating] = useState(false);
  const [label, setLabel] = useState('');
  const [panelState, setPanelState] = useState('list'); // for layered / feed states
  const [visibleRows, setVisibleRows] = useState([true, true, true, true]); // for staggered
  const [codeProgress, setCodeProgress] = useState([100, 100, 100, 100, 100, 100]); // typewriter clip path percentage
  const [elasticScale, setElasticScale] = useState(1);
  const [pulseOpacity, setPulseOpacity] = useState(1);
  const [cascadeIndex, setCascadeIndex] = useState(-1);
  const [outlineSolid, setOutlineSolid] = useState(true);
  const [layeredVisible, setLayeredVisible] = useState(true);
  const [layeredBars, setLayeredBars] = useState([true, true, true, true, true, true, true, true]);

  const labels = {
    shimmer: 'background-position sweep',
    gradient: 'background-size: 200%',
    staggered: 'delay: i × 120ms',
    typewriter: 'clip-path: inset()',
    layered: 'translateZ + opacity',
    elastic: 'cubic-bezier(.34,1.56,.64,1)',
    pulse: 'animation: pulse 1.5s',
    cascade: 'staggered background wave',
    outline: 'border → background fill'
  };

  const handleTrigger = async () => {
    if (animating) return;
    setAnimating(true);
    setLabel(labels[type] || '');

    if (type === 'shimmer') {
      await wait(4000);
    } else if (type === 'gradient') {
      await wait(5200);
    } else if (type === 'staggered') {
      // sequential hide
      for (let i = visibleRows.length - 1; i >= 0; i--) {
        setVisibleRows(prev => {
          const next = [...prev];
          next[i] = false;
          return next;
        });
        await wait(150);
      }
      await wait(400);
      // sequential show
      for (let i = 0; i < visibleRows.length; i++) {
        setVisibleRows(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
        await wait(180);
      }
    } else if (type === 'typewriter') {
      // sequential clip
      const steps = 5;
      for (let i = 0; i < codeProgress.length; i++) {
        for (let s = 0; s <= steps; s++) {
          const pct = Math.round(100 - (s / steps) * 100);
          setCodeProgress(prev => {
            const next = [...prev];
            next[i] = pct;
            return next;
          });
          await wait(25);
        }
      }
      await wait(1000);
      setCodeProgress([100, 100, 100, 100, 100, 100]);
    } else if (type === 'layered') {
      setLayeredBars([false, false, false, false, false, false, false, false]);
      setLayeredVisible(false);
      await wait(500);
      setLayeredVisible(true);
      await wait(400);
      for (let i = 0; i < layeredBars.length; i++) {
        setLayeredBars(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
        await wait(100);
      }
    } else if (type === 'elastic') {
      setElasticScale(0.3);
      await wait(200);
      setElasticScale(1.1);
      await wait(200);
      setElasticScale(1);
      await wait(2000);
    } else if (type === 'pulse') {
      await wait(3500);
    } else if (type === 'cascade') {
      for (let c = 0; c < 3; c++) {
        for (let i = 0; i < 9; i++) {
          setCascadeIndex(i);
          await wait(120);
        }
        setCascadeIndex(-1);
        await wait(200);
      }
    } else if (type === 'outline') {
      setOutlineSolid(false);
      await wait(600);
      setOutlineSolid(true);
      await wait(1500);
    }

    setAnimating(false);
  };

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Shimmer Style
  const shimmerStyle = type === 'shimmer' && animating ? {
    background: 'linear-gradient(90deg, var(--skel-base) 25%, var(--skel-shine) 50%, var(--skel-base) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skelShimmer 1.8s ease-in-out infinite'
  } : {};

  // Gradient Style
  const gradientStyle = type === 'gradient' && animating ? {
    background: 'linear-gradient(135deg, var(--skel-base), rgba(124,106,255,0.15), rgba(255,107,157,0.12), var(--skel-base))',
    backgroundSize: '300% 300%',
    animation: 'skelGradient 2.5s ease infinite'
  } : {};

  // Pulse Style
  const pulseStyle = type === 'pulse' && animating ? {
    animation: 'skelPulse 1.5s ease-in-out infinite'
  } : {};

  // Helper to render skeleton element with conditional styles
  const renderEl = (className, index = 0, style = {}) => {
    let combinedStyle = { ...style };
    if (type === 'shimmer') combinedStyle = { ...combinedStyle, ...shimmerStyle };
    if (type === 'gradient') combinedStyle = { ...combinedStyle, ...gradientStyle };
    if (type === 'pulse') combinedStyle = { ...combinedStyle, ...pulseStyle };
    if (type === 'cascade' && cascadeIndex === index) {
      combinedStyle.background = 'var(--skel-shine)';
      combinedStyle.transition = 'background 0.2s ease';
    }
    if (type === 'outline') {
      if (!outlineSolid) {
        combinedStyle.background = 'transparent';
        combinedStyle.border = '1.5px solid var(--skel-shine)';
        combinedStyle.transform = 'scale(0.95)';
        combinedStyle.transition = 'all 0.3s ease';
      } else {
        combinedStyle.transition = 'all 0.5s ease';
      }
    }
    return <div className={className} style={combinedStyle}></div>;
  };

  return (
    <div 
      className={`skel-cell ${animating ? 'animating' : ''}`} 
      onClick={handleTrigger}
      role="button" 
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTrigger(); } }}
    >
      <div className="skel-cell-title">{type.charAt(0).toUpperCase() + type.slice(1)}</div>
      <div className="skel-cell-desc">
        {type === 'shimmer' && 'Gradient sweep left→right'}
        {type === 'gradient' && 'Multi-color gradient shift'}
        {type === 'staggered' && 'Sequential reveal top→down'}
        {type === 'typewriter' && 'Character-by-character fill'}
        {type === 'layered' && 'Depth layers fade in'}
        {type === 'elastic' && 'Spring-in bounce reveal'}
        {type === 'pulse' && 'Opacity fade in/out'}
        {type === 'cascade' && 'Per-element highlight wave'}
        {type === 'outline' && 'Wireframe → fill reveal'}
      </div>
      
      <div className="skel-cell-label" style={{ opacity: animating ? 1 : 0 }}>
        {label}
      </div>

      <div className="skel-cell-viz">
        {type === 'shimmer' && (
          <div className="card-skel">
            <div className="card-header">
              {renderEl("skel-circle")}
              <div className="skel-lines">
                {renderEl("skel-line skel-line--w60")}
                {renderEl("skel-line skel-line--w30")}
              </div>
            </div>
            {renderEl("skel-img")}
            {renderEl("skel-line skel-line--w100")}
            {renderEl("skel-line skel-line--w70")}
            <div className="card-footer">
              <div className="skel-actions">
                {renderEl("skel-action-dot", 1)}
                {renderEl("skel-action-dot", 2)}
                {renderEl("skel-action-dot", 3)}
              </div>
            </div>
          </div>
        )}

        {type === 'gradient' && (
          <div className="card-skel">
            {renderEl("skel-img skel-img--tall")}
            {renderEl("skel-line skel-line--title")}
            {renderEl("skel-line skel-line--w60")}
            <div className="card-footer">
              {renderEl("skel-pill skel-pill--price")}
              <div className="skel-stars">
                {renderEl("skel-star", 1)}
                {renderEl("skel-star", 2)}
                {renderEl("skel-star", 3)}
                {renderEl("skel-star", 4)}
                {renderEl("skel-star", 5)}
              </div>
            </div>
          </div>
        )}

        {type === 'staggered' && (
          <div className="card-skel skel-feed">
            {[0, 1, 2, 3].map((idx) => {
              const widths = [
                ['w80', 'w60'],
                ['w70', 'w40'],
                ['w100', 'w60'],
                ['w60', 'w80']
              ];
              return (
                <div 
                  key={idx} 
                  className="skel-feed-row"
                  style={{
                    opacity: visibleRows[idx] ? 1 : 0,
                    transform: visibleRows[idx] ? 'translateX(0)' : 'translateX(-10px)',
                    transition: 'opacity 0.4s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)'
                  }}
                >
                  <div className="skel-circle"></div>
                  <div className="skel-lines">
                    <div className={`skel-line skel-line--${widths[idx][0]}`}></div>
                    <div className={`skel-line skel-line--${widths[idx][1]}`}></div>
                  </div>
                  <div className="skel-pill skel-pill--sm"></div>
                </div>
              );
            })}
          </div>
        )}

        {type === 'typewriter' && (
          <div className="card-skel skel-code">
            <div className="skel-code-bar">
              <div className="skel-code-dot"></div>
              <div className="skel-code-dot"></div>
              <div className="skel-code-dot"></div>
            </div>
            <div className="skel-code-lines">
              {[
                { width: 'w40', indent: false },
                { width: 'w80', indent: true },
                { width: 'w60', indent: true },
                { width: 'w100', indent: true },
                { width: 'w70', indent: true },
                { width: 'w30', indent: false }
              ].map((line, idx) => (
                <div 
                  key={idx}
                  className={`skel-line skel-line--${line.width} ${line.indent ? 'skel-indent' : ''}`}
                  style={{
                    clipPath: `inset(0 ${codeProgress[idx]}% 0 0)`,
                    transition: codeProgress[idx] === 100 ? 'none' : 'clip-path 0.15s ease-out'
                  }}
                ></div>
              ))}
            </div>
          </div>
        )}

        {type === 'layered' && (
          <div 
            className="card-skel skel-dash"
            style={{
              opacity: layeredVisible ? 1 : 0,
              transform: layeredVisible ? 'translateY(0)' : 'translateY(10px)',
              filter: layeredVisible ? 'blur(0px)' : 'blur(2px)',
              transition: 'all 0.45s cubic-bezier(0.0, 0, 0.2, 1)'
            }}
          >
            <div className="skel-dash-header">
              <div className="skel-line skel-line--w40"></div>
              <div className="skel-pill skel-pill--sm"></div>
            </div>
            <div className="skel-line skel-line--stat"></div>
            <div className="skel-line skel-line--w30"></div>
            <div className="skel-chart">
              {[35, 55, 45, 80, 65, 50, 90, 70].map((h, idx) => (
                <div 
                  key={idx}
                  className={`skel-bar skel-bar--h${h}`}
                  style={{
                    transform: layeredBars[idx] ? 'scaleY(1)' : 'scaleY(0)',
                    transformOrigin: 'bottom',
                    transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)'
                  }}
                ></div>
              ))}
            </div>
          </div>
        )}

        {type === 'elastic' && (
          <div 
            className="card-skel skel-profile"
            style={{
              transform: `scale(${elasticScale})`,
              transition: elasticScale === 1 ? 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
            }}
          >
            {renderEl("skel-profile-cover")}
            {renderEl("skel-circle skel-circle--lg skel-profile-avatar")}
            {renderEl("skel-line skel-line--w60 skel-center")}
            {renderEl("skel-line skel-line--w40 skel-center")}
            <div className="skel-profile-stats">
              <div className="skel-stat-col">
                {renderEl("skel-line skel-line--stat-sm")}
                {renderEl("skel-line skel-line--w100")}
              </div>
              <div className="skel-stat-col">
                {renderEl("skel-line skel-line--stat-sm")}
                {renderEl("skel-line skel-line--w100")}
              </div>
              <div className="skel-stat-col">
                {renderEl("skel-line skel-line--stat-sm")}
                {renderEl("skel-line skel-line--w100")}
              </div>
            </div>
            <div className="skel-profile-btns">
              {renderEl("skel-pill skel-pill--btn")}
              {renderEl("skel-pill skel-pill--btn-ghost")}
            </div>
          </div>
        )}

        {type === 'pulse' && (
          <div className="card-skel skel-list">
            {[0, 1, 2, 3].map((idx) => {
              const widths = ['w80', 'w70', 'w100', 'w60'];
              const subWidths = ['w60', 'w40', 'w60', 'w80'];
              return (
                <div key={idx} className="skel-list-row">
                  {renderEl("skel-square", idx * 3)}
                  <div className="skel-lines">
                    {renderEl(`skel-line skel-line--${widths[idx]}`, idx * 3 + 1)}
                    {renderEl(`skel-line skel-line--${subWidths[idx]}`, idx * 3 + 2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {type === 'cascade' && (
          <div className="card-skel skel-media">
            <div className="skel-media-grid">
              {[0, 1, 2, 3, 4, 5].map((idx) => renderEl("skel-media-thumb", idx, { key: idx }))}
            </div>
            {renderEl("skel-line skel-line--w60", 6)}
            {renderEl("skel-line skel-line--w40", 7)}
          </div>
        )}

        {type === 'outline' && (
          <div className="card-skel skel-article">
            {renderEl("skel-img skel-img--tall")}
            {renderEl("skel-line skel-line--title")}
            {renderEl("skel-line skel-line--w100")}
            {renderEl("skel-line skel-line--w80")}
            {renderEl("skel-line skel-line--w60")}
            <div className="card-footer">
              <div className="card-header">
                {renderEl("skel-circle skel-circle--sm")}
                {renderEl("skel-line skel-line--w40")}
              </div>
              {renderEl("skel-pill")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
