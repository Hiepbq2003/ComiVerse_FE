import React, { useState } from 'react';
import { AIPopover } from './AIPopover';
import '../../assets/style/common/ai-popover.css';

export const AIPopoverShowcase = () => {
  const [isLight, setIsLight] = useState(false);
  const [lastAction, setLastAction] = useState('No action performed yet');

  const logAction = (name, val) => {
    if (val) {
      setLastAction(`[${name}] Output: ${JSON.stringify(val)}`);
    } else {
      setLastAction(`[${name}] Triggered action`);
    }
  };

  const specimens = [
    { num: 1, name: 'Basic', variant: 'rich', triggerText: 'Details', data: { title: 'Neural Engine v4', text: 'Next-gen inference engine with 3x throughput gains and built-in safety guardrails.' } },
    { num: 2, name: 'Dropdown Transition', variant: 'dropdown', triggerText: 'Select Model', data: {} },
    { num: 3, name: 'Training Status', variant: 'status', triggerText: 'Status', data: { progress: 73, model: 'Claude Opus 4 — Fine-tune', state: 'Training', loss: '0.0241', acc: '94.2%', epoch: '7/10' } },
    { num: 4, name: 'User Card', variant: 'user', triggerText: '@david_ai', data: { avatarUrl: null, name: 'David Mraz', role: 'ML Engineer', runs: '142', acc: '2.4k', stars: '98%' } },
    { num: 5, name: 'Nested Menu', variant: 'menu', triggerText: 'Actions', data: {} },
    { num: 6, name: 'Form', variant: 'form', triggerText: 'Add Label', data: {} },
    { num: 7, name: 'Notification', variant: 'notif', triggerText: '', data: {} },
    { num: 8, name: 'Command Palette', variant: 'command', triggerText: '', data: {} },
    { num: 9, name: 'Gradient Border', variant: 'gradient', triggerText: 'Showcase', data: { title: 'Premium Feature', text: 'Unlock advanced fine-tuning pipelines with gradient checkpointing and mixed-precision training.' } },
    { num: 10, name: 'Token Breakdown', variant: 'tokens', triggerText: '$0.042', data: { total: '4,218', system: '486', prompt: '1,247', completion: '2,485', cost: '0.042' } }
  ];

  return (
    <div className={`popover-showcase ${isLight ? 'light' : ''}`}>
      {/* Shared SVG gradient definitions */}
      <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--grad-start)" />
            <stop offset="100%" stopColor="var(--grad-end)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Top Bar with user profile and theme switch */}
      <div className="top-bar">
        <div className="profile-wrapper">
          <img className="profile" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80" alt="avatar" />
          <p>@davidm_ai</p>
        </div>
        <label className="skel-theme-switch" aria-label="Toggle light and dark theme">
          <span style={{ color: isLight ? 'var(--text-muted)' : 'var(--accent)' }}>🌙 Dark</span>
          <div className="skel-theme-switch__track" onClick={() => setIsLight(!isLight)}>
            <div className="skel-theme-switch__thumb"></div>
          </div>
          <span style={{ color: isLight ? '#E8A317' : 'var(--text-muted)' }}>☀️ Light</span>
        </label>
      </div>

      {/* Main Title Headers */}
      <div className="title-group">
        <p className="title-label">AI-First Components</p>
        <h2><span className="emph">AI Popovers</span></h2>
        <p className="title-sub">Click the triggers to reveal each popover</p>
      </div>

      {/* Grid of specimens */}
      <div className="specimens">
        {specimens.map((spec) => (
          <div key={spec.num} className="specimen">
            <div className="specimen__label">
              <span className="specimen__num">{spec.num}</span>
              <span className="specimen__name">{spec.name}</span>
            </div>
            
            <AIPopover 
              variant={spec.variant}
              triggerText={spec.triggerText}
              data={spec.data}
              onAction={(val) => logAction(spec.name, val)}
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
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M7 8l-4 4l4 4" /><path d="M17 8l4 4l-4 4" /><path d="M14 4l-4 16" /></svg>
          learning.atheros.ai
        </span>
      </p>
    </div>
  );
};
export default AIPopoverShowcase;
