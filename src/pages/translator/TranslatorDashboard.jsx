import { useState } from 'react'
import '../../assets/style/translator.css'
import TeamProjects from './TeamProjects'
import Revenue from './Revenue'
import Payout from './Payout'

const INITIAL_PROJECTS = [
  {
    id: 'proj-1',
    title: 'Invincible Sword God',
    chaptersCount: 45,
    lastUpdated: '2 hours ago',
    status: 'Active',
    team: 'Dragon Group',
    cover: '⚔️',
    description: 'A legendary sword cultivator reincarnates in a waste body and climbs to the peak of martial arts.',
    assignedToMe: true,
    chaptersList: [
      { num: 'Chapter 45', date: '2 hours ago', words: 3200 },
      { num: 'Chapter 44', date: '1 day ago', words: 2900 },
      { num: 'Chapter 43', date: '3 days ago', words: 3100 }
    ]
  },
  {
    id: 'proj-2',
    title: 'Spirit Recovery',
    chaptersCount: 32,
    lastUpdated: '1 day ago',
    status: 'Active',
    team: 'Jade Group',
    cover: '🔮',
    description: 'An urban student discovers ancient spiritual energy is recovering across the globe.',
    assignedToMe: true,
    chaptersList: [
      { num: 'Chapter 32', date: '1 day ago', words: 2800 },
      { num: 'Chapter 31', date: '3 days ago', words: 2600 },
      { num: 'Chapter 30', date: '5 days ago', words: 3000 }
    ]
  },
  {
    id: 'proj-3',
    title: 'Demon King Reborn',
    chaptersCount: 18,
    lastUpdated: '1 week ago',
    status: 'Paused',
    team: 'Phoenix Group',
    cover: '👑',
    description: 'The overthrown Demon Monarch wakes up as a low-level guard in a rival human kingdom.',
    assignedToMe: false,
    chaptersList: [
      { num: 'Chapter 18', date: '1 week ago', words: 3500 },
      { num: 'Chapter 17', date: '2 weeks ago', words: 3300 }
    ]
  }
]

function TranslatorDashboard({ user, onLogout }) {
  const [activeNav, setActiveNav] = useState('project-teams') // 'dashboard' | 'project-teams' | 'revenue' | 'payout'
  const [projects, setProjects] = useState(INITIAL_PROJECTS)

  const userName = user.fullName || user.username || 'Translator'

  return (
    <div className="translator-layout">
      {/* ── SIDEBAR ─────────────────────────────────── */}
      <aside className="translator-sidebar">
        <div className="translator-sidebar-brand">
          <h2>Translator Hub</h2>
          <span>Translation Management</span>
        </div>

        <nav className="translator-sidebar-nav">
          <button 
            className={`translator-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveNav('dashboard')}
          >
            <span className="translator-nav-icon">📊</span>
            Dashboard
          </button>



          <button 
            className={`translator-nav-item ${activeNav === 'project-teams' ? 'active' : ''}`}
            onClick={() => setActiveNav('project-teams')}
          >
            <span className="translator-nav-icon">📖</span>
            Project Teams
          </button>

          <button 
            className={`translator-nav-item ${activeNav === 'revenue' ? 'active' : ''}`}
            onClick={() => setActiveNav('revenue')}
          >
            <span className="translator-nav-icon">💰</span>
            Revenue
          </button>

          <button 
            className={`translator-nav-item ${activeNav === 'payout' ? 'active' : ''}`}
            onClick={() => setActiveNav('payout')}
          >
            <span className="translator-nav-icon">💳</span>
            Payout
          </button>
        </nav>

        <div className="translator-sidebar-footer">
          <button className="translator-nav-item" onClick={onLogout}>
            <span className="translator-nav-icon">🚪</span>
            ← Back to Home
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────── */}
      <main className="translator-main">
        {/* Top Navbar */}
        <header className="translator-topbar">
          <div className="translator-topbar-left">
            <span>Workspace: Translator</span>
          </div>

          <div className="translator-topbar-right">
            <button className="translator-icon-btn" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </button>

            <div className="topbar-divider" />

            <button className="translator-profile-btn">
              <span>👤</span> {userName}
            </button>

            <div className="topbar-divider" />

            <button className="translator-logout-btn" onClick={onLogout}>
              <span>📤</span> Logout
            </button>
          </div>
        </header>

        {/* Content Render Area */}
        <div className="translator-page-content">
          
          {/* VIEW: DASHBOARD */}
          {activeNav === 'dashboard' && (
            <div className="fade-in">
              <div className="translator-page-header">
                <div className="translator-page-header-info">
                  <h1>Translator Hub Console</h1>
                  <p>Check translation summaries, cumulative monthly views, and pending clearances.</p>
                </div>
              </div>

              <div className="trans-stats-grid" style={{ marginBottom: '24px' }}>
                <div className="trans-stat-card" style={{ borderTop: '4px solid var(--trans-purple)' }}>
                  <h4>My Assigned Projects</h4>
                  <div className="val">{projects.filter(p => p.assignedToMe).length} Projects</div>
                  <div className="sub">Active translation channels</div>
                </div>
                <div className="trans-stat-card" style={{ borderTop: '4px solid var(--trans-green)' }}>
                  <h4>Active Chapters</h4>
                  <div className="val">{projects.reduce((sum, p) => sum + p.chaptersCount, 0)} Chapters</div>
                  <div className="sub">Published across platform catalog</div>
                </div>
                <div className="trans-stat-card" style={{ borderTop: '4px solid var(--trans-purple)' }}>
                  <h4>Cumulative Views</h4>
                  <div className="val">142.5K Clicks</div>
                  <div className="sub">Reader clicks count stats</div>
                </div>
              </div>

              <div className="placeholder-card">
                <h4>Recent Upload Audits</h4>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px', fontSize: '13px' }}>
                    📖 Uploaded draft <strong>Chapter 45</strong> of <em>Invincible Sword God</em> (2 hours ago)
                  </div>
                  <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px', fontSize: '13px' }}>
                    📖 Uploaded draft <strong>Chapter 32</strong> of <em>Spirit Recovery</em> (1 day ago)
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* VIEW: PROJECT TEAMS */}
          {activeNav === 'project-teams' && (
            <TeamProjects projects={projects} setProjects={setProjects} />
          )}

          {/* VIEW: REVENUE */}
          {activeNav === 'revenue' && (
            <Revenue />
          )}

          {/* VIEW: PAYOUT */}
          {activeNav === 'payout' && (
            <Payout />
          )}

        </div>
      </main>
    </div>
  )
}

export default TranslatorDashboard
