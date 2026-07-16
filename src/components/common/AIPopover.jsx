import React, { useState, useEffect, useRef } from 'react';
import '../../assets/style/common/ai-popover.css';

export const AIPopover = ({ 
  variant = 'rich', // Default to 'rich' which corresponds to specimen 1 'Basic'
  triggerText = 'Trigger',
  triggerClass = '',
  popoverClass = '',
  data = {},
  onAction = () => {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('list'); // 'list' or 'detail' (for dropdown transition)
  const [selectedModel, setSelectedModel] = useState(null); // for dropdown transition
  const [searchQuery, setSearchQuery] = useState(''); // for command palette
  const [formInput, setFormInput] = useState(''); // for form
  const [menuOpen, setMenuOpen] = useState(null); // for nested menu hover/click
  const wrapperRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setActivePanel('list');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePopover = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setActivePanel('list');
    }
  };

  // Specs for models in Dropdown Transition
  const modelSpecs = {
    'GPT-5': { developer: 'OpenAI', context: '1M', cost: '$12', latency: '45ms' },
    'Claude Opus 4': { developer: 'Anthropic', context: '200K', cost: '$15', latency: '65ms' },
    'Gemini 2.5 Pro': { developer: 'Google', context: '1M', cost: '$5', latency: '55ms' },
    'Llama 4 Maverick': { developer: 'Meta', context: '1M', cost: '$2', latency: '60ms' }
  };

  const handleSelectModel = (model) => {
    setSelectedModel(model);
    setActivePanel('detail');
  };

  // Notification items fallback data
  const notifications = data.notifications || [
    { id: 1, msg: 'Training complete on <strong>Llama 4 Scout</strong>', time: '2 min ago', unread: true },
    { id: 2, msg: 'New eval results ready for review', time: '18 min ago', unread: true },
    { id: 3, msg: 'Deployment <strong>prod-v3</strong> scaled to 4 replicas', time: '1 hr ago', unread: true }
  ];

  // Command Palette items
  const commands = [
    { name: 'New Model', kbd: '⌘N', icon: 'new model', svg: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
    { name: 'Deploy to Production', kbd: '⌘D', icon: 'deploy', svg: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> },
    { name: 'Run Evaluation', kbd: '⌘E', icon: 'run eval', svg: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> },
    { name: 'View Logs', kbd: '⌘L', icon: 'view logs', svg: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    { name: 'Settings', kbd: '⌘,', icon: 'settings', svg: <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> }
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="popover-wrap" ref={wrapperRef}>
      {/* Trigger Button Matching HTML Specimen triggers */}
      <button 
        type="button" 
        className={`trigger ${triggerClass}`} 
        onClick={togglePopover}
      >
        {variant === 'dropdown' && (
          <svg style={{ marginRight: '6px' }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        )}
        {variant === 'status' && (
          <svg style={{ marginRight: '6px' }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        )}
        {variant === 'user' && (
          <img className="trigger__avatar" style={{ marginRight: '6px' }} src={data.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80"} alt="" />
        )}
        {variant === 'menu' && (
          <svg style={{ marginRight: '6px' }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        )}
        {variant === 'notif' && (
          <svg style={triggerText ? { marginRight: '6px' } : {}} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        )}
        {variant === 'command' && (
          <svg style={{ marginRight: '6px' }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>
        )}
        {variant === 'tokens' && (
          <svg style={{ marginRight: '6px' }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>
        )}

        {triggerText}

        {variant === 'notif' && data.unreadCount !== undefined && data.unreadCount > 0 && (
          <span className="trigger__badge">{data.unreadCount}</span>
        )}
        {variant === 'command' && (
          <span className="pop-cmd__kbd-trigger"><kbd>⌘</kbd><kbd>K</kbd></span>
        )}
      </button>

      {/* Popover Container */}
      <div className={`pop pop--${variant} ${isOpen ? 'is-open' : ''} ${popoverClass}`}>
        
        {/* Render arrow unless it is a special gradient variant */}
        {variant !== 'gradient' ? (
          <div className="pop__arrow"></div>
        ) : (
          <div className="pop__arrow pop__arrow--gradient"></div>
        )}

        {/* 1. RICH CONTENT (USED FOR BASIC SPECIMEN IN HTML) */}
        {variant === 'rich' && (
          <>
            <div className="pop-rich__header">
              <span className="pop-rich__icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/><circle cx="12" cy="15" r="2"/></svg>
              </span>
              <div>
                <p className="pop-rich__heading">{data.title || 'Neural Engine v4'}</p>
                <p className="pop-rich__desc">{data.text || 'Next-gen inference engine with 3x throughput gains and built-in safety guardrails.'}</p>
              </div>
            </div>
            <div className="pop-rich__actions">
              <button type="button" className="pop-btn pop-btn--ghost" onClick={() => setIsOpen(false)}>Dismiss</button>
              <button type="button" className="pop-btn pop-btn--primary" onClick={() => { setIsOpen(false); onAction(); }}>Learn More</button>
            </div>
          </>
        )}

        {/* 2. DROPDOWN TRANSITION */}
        {variant === 'dropdown' && (
          <div className="pop-dt__viewport">
            {/* List Panel */}
            <div className={`pop-dt__panel pop-dt__panel--list ${activePanel === 'detail' ? 'is-hidden' : ''}`}>
              {['GPT-5', 'Claude Opus 4', 'Gemini 2.5 Pro', 'Llama 4 Maverick'].map((model, idx) => (
                <div 
                  key={model} 
                  className="pop-dt__item"
                  onClick={() => handleSelectModel(model)}
                  style={{ '--i': idx }}
                >
                  <span className="pop-dt__icon">
                    {idx === 0 && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/></svg>}
                    {idx === 1 && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m-7.07-14.93l2.83 2.83m8.48 8.48l2.83 2.83m-16.97 0l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>}
                    {idx === 2 && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>}
                    {idx === 3 && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>}
                  </span>
                  <div className="pop-dt__info">
                    <span className="pop-dt__name">{model}</span>
                    <span className="pop-dt__meta">{modelSpecs[model]?.context || '1M'} context</span>
                  </div>
                  <svg className="pop-dt__chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
            </div>

            {/* Detail Panels */}
            {['GPT-5', 'Claude Opus 4', 'Gemini 2.5 Pro', 'Llama 4 Maverick'].map((model, idx) => (
              <div 
                key={model}
                className={`pop-dt__panel pop-dt__panel--detail ${activePanel === 'detail' && selectedModel === model ? 'is-active' : ''}`}
                data-detail={idx}
              >
                <button className="pop-dt__back" onClick={() => setActivePanel('list')}>
                  <svg style={{ marginRight: '4px' }} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Back
                </button>
                <div className="pop-dt__detail-header">
                  <span className="pop-dt__detail-name">{model}</span>
                  <span className="pop-dt__detail-badge">{modelSpecs[model]?.developer}</span>
                </div>
                <div className="pop-dt__detail-stats">
                  <div className="pop-dt__stat">
                    <span className="pop-dt__stat-val">{modelSpecs[model]?.context}</span>
                    <span className="pop-dt__stat-lbl">Context</span>
                  </div>
                  <div className="pop-dt__stat">
                    <span className="pop-dt__stat-val">{modelSpecs[model]?.cost}</span>
                    <span className="pop-dt__stat-lbl">/1M tok</span>
                  </div>
                  <div className="pop-dt__stat">
                    <span className="pop-dt__stat-val">{modelSpecs[model]?.latency}</span>
                    <span className="pop-dt__stat-lbl">Latency</span>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="pop-btn pop-btn--primary pop-btn--full"
                  onClick={() => { 
                    setIsOpen(false); 
                    onAction(model); 
                  }}
                >
                  Select Model
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 3. TRAINING STATUS */}
        {variant === 'status' && (
          <>
            <div className="pop-status__header">
              <div className="pop-status__ring">
                <svg className="pop-status__svg" viewBox="0 0 40 40">
                  <circle className="pop-status__track" cx="20" cy="20" r="16"></circle>
                  <circle 
                    className="pop-status__fill" 
                    cx="20" 
                    cy="20" 
                    r="16"
                    style={{ strokeDashoffset: 100.53 - (100.53 * (data.progress || 73)) / 100 }}
                  ></circle>
                </svg>
                <div className="pop-status__pct">{data.progress || 73}%</div>
              </div>
              <div className="pop-status__info">
                <p className="pop-status__model">{data.model || 'Claude Opus 4 — Fine-tune'}</p>
                <p className="pop-status__state">
                  <span className="pop-status__dot"></span>
                  {data.state || 'Training'}
                </p>
              </div>
            </div>
            <div className="pop-status__metrics">
              <div className="pop-status__metric">
                <span className="pop-status__val">{data.loss || '0.0241'}</span>
                <span className="pop-status__lbl">Loss</span>
              </div>
              <div className="pop-status__metric">
                <span className="pop-status__val">{data.acc || '94.2%'}</span>
                <span className="pop-status__lbl">Accuracy</span>
              </div>
              <div className="pop-status__metric">
                <span className="pop-status__val">{data.epoch || '7/10'}</span>
                <span className="pop-status__lbl">Epoch</span>
              </div>
            </div>
            <div className="pop-status__actions">
              <button 
                type="button" 
                className="pop-btn pop-btn--ghost" 
                onClick={() => { setIsOpen(false); onAction('pause'); }}
              >
                <svg style={{ marginRight: '4px' }} xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                Pause
              </button>
              <button 
                type="button" 
                className="pop-btn pop-btn--primary" 
                onClick={() => { setIsOpen(false); onAction('view'); }}
              >
                View Logs
              </button>
            </div>
          </>
        )}

        {/* 4. USER CARD */}
        {variant === 'user' && (
          <>
            <div className="pop-user__top">
              <img className="pop-user__avatar" src={data.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80"} alt="David" />
              <div>
                <p className="pop-user__name">{data.name || 'David Mraz'}</p>
                <p className="pop-user__role">{data.role || 'ML Engineer'}</p>
              </div>
            </div>
            <div className="pop-user__stats">
              <div className="pop-user__stat">
                <span className="pop-user__stat-val">{data.runs || '142'}</span>
                <span className="pop-user__stat-lbl">Models</span>
              </div>
              <div className="pop-user__stat">
                <span className="pop-user__stat-val">{data.acc || '2.4k'}</span>
                <span className="pop-user__stat-lbl">Runs</span>
              </div>
              <div className="pop-user__stat">
                <span className="pop-user__stat-val">{data.stars || '98%'}</span>
                <span className="pop-user__stat-lbl">Uptime</span>
              </div>
            </div>
          </>
        )}

        {/* 5. NESTED MENU */}
        {variant === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {data.menuItems ? (
              data.menuItems.map((item, index) => {
                if (item.type === 'divider') {
                  return <div key={`div-${index}`} className="pop-menu__divider"></div>
                }
                return (
                  <div 
                    key={item.label || index}
                    className={`pop-menu__item ${item.danger ? 'pop-menu__item--danger' : ''}`}
                    onClick={() => { setIsOpen(false); onAction(item.action); }}
                  >
                    {item.label}
                  </div>
                )
              })
            ) : (
              <>
                <div 
                  className="pop-menu__item" 
                  onMouseEnter={() => setMenuOpen('export')} 
                  onMouseLeave={() => setMenuOpen(null)}
                >
                  <span>Export</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  <div className={`pop-sub ${menuOpen === 'export' ? 'is-open' : ''}`}>
                    <div className="pop-menu__item" onClick={() => { setIsOpen(false); onAction('ONNX'); }}>ONNX</div>
                    <div className="pop-menu__item" onClick={() => { setIsOpen(false); onAction('TensorRT'); }}>TensorRT</div>
                    <div className="pop-menu__item" onClick={() => { setIsOpen(false); onAction('CoreML'); }}>CoreML</div>
                  </div>
                </div>
                <div className="pop-menu__item" onClick={() => { setIsOpen(false); onAction('duplicate'); }}>Duplicate</div>
                <div className="pop-menu__item" onClick={() => { setIsOpen(false); onAction('archive'); }}>Archive</div>
                <div className="pop-menu__divider"></div>
                <div className="pop-menu__item pop-menu__item--danger" onClick={() => { setIsOpen(false); onAction('delete'); }}>Delete</div>
              </>
            )}
          </div>
        )}

        {/* 6. FORM */}
        {variant === 'form' && (
          <>
            <label className="pop-form__label" htmlFor="label-input">Label name</label>
            <input 
              id="label-input"
              type="text" 
              className="pop-form__input" 
              placeholder="e.g. production-v2"
              value={formInput}
              onChange={(e) => setFormInput(e.target.value)}
              autoComplete="off"
            />
            <button 
              type="button" 
              className="pop-btn pop-btn--primary pop-btn--full"
              onClick={() => { setIsOpen(false); onAction(formInput); }}
            >
              Create Label
            </button>
          </>
        )}

        {/* 7. NOTIFICATION */}
        {variant === 'notif' && (
          <>
            <div className="pop-notif__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
              <p className="pop-notif__title" style={{ margin: 0, fontWeight: 'bold' }}>Notifications</p>
              {data.unreadCount > 0 && (
                <button 
                  type="button" 
                  className="pop-btn pop-btn--ghost" 
                  style={{ fontSize: '11px', padding: '2px 6px', height: 'auto', minHeight: 'auto', border: '1px solid var(--border)' }}
                  onClick={(e) => { e.stopPropagation(); onAction('markAllRead'); }}
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="pop-notif__list" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '4px' }}>🔔</span>
                  <p style={{ margin: 0, fontSize: '12px' }}>You have no notifications</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`pop-notif__item ${n.unread ? 'pop-notif__item--unread' : ''}`}
                    onClick={() => { onAction(n.id); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="pop-notif__dot"></span>
                    <div>
                      <p className="pop-notif__msg" dangerouslySetInnerHTML={{ __html: n.msg }} style={{ margin: '0 0 4px' }}></p>
                      <p className="pop-notif__time" style={{ margin: 0 }}>{n.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* 8. COMMAND PALETTE */}
        {variant === 'command' && (
          <>
            <div className="pop-cmd__search-wrap">
              <svg className="pop-cmd__search-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input 
                type="text" 
                className="pop-cmd__input" 
                placeholder="Type a command..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
            <p className="pop-cmd__group-label">Actions</p>
            <div className="pop-cmd__list">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd) => (
                  <div 
                    key={cmd.name} 
                    className="pop-cmd__item"
                    onClick={() => { 
                      setIsOpen(false); 
                      onAction(cmd.icon); 
                    }}
                  >
                    {cmd.svg}
                    <span style={{ marginLeft: '6px' }}>{cmd.name}</span>
                    <div className="pop-cmd__kbd">
                      {cmd.kbd.split('').map((char, index) => (
                        <kbd key={index}>{char}</kbd>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="pop-cmd__no-results">No commands found</div>
              )}
            </div>
          </>
        )}

        {/* 9. GRADIENT BORDER */}
        {variant === 'gradient' && (
          <div className="pop-gradient__inner">
            <p className="pop__title">{data.title || 'Premium Feature'}</p>
            <p className="pop__text" style={{ marginBottom: '8px' }}>
              {data.text || 'Unlock advanced fine-tuning pipelines with gradient checkpointing and mixed-precision training.'}
            </p>
            <button 
              type="button" 
              className="pop-btn pop-btn--gradient"
              onClick={() => { setIsOpen(false); onAction(); }}
            >
              Upgrade Now
            </button>
          </div>
        )}

        {/* 10. TOKEN BREAKDOWN */}
        {variant === 'tokens' && (
          <>
            <div className="pop-tok__header">
              <p className="pop-tok__title">Token Usage</p>
              <span className="pop-tok__total">{data.total || '4,218'} tokens</span>
            </div>
            <div className="pop-tok__bars">
              {[
                { label: 'System', count: data.system || '486', w: '19%', class: 'system' },
                { label: 'Prompt', count: data.prompt || '1,247', w: '50%', class: 'prompt' },
                { label: 'Completion', count: data.completion || '2,485', w: '100%', class: 'completion' }
              ].map((row) => (
                <div key={row.label} className="pop-tok__row">
                  <div className="pop-tok__row-top">
                    <span className="pop-tok__label">{row.label}</span>
                    <span className="pop-tok__count">{row.count}</span>
                  </div>
                  <div className="pop-tok__track">
                    <div 
                      className={`pop-tok__bar pop-tok__bar--${row.class}`} 
                      style={{ '--w': row.w }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="pop-tok__footer">
              <div className="pop-tok__cost">
                <span className="pop-tok__cost-label">Estimated cost</span>
                <span className="pop-tok__cost-val">${data.cost || '0.042'}</span>
              </div>
              <div className="pop-tok__model-badge">Claude Opus 4</div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

