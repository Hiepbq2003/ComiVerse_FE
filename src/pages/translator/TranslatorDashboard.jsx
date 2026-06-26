import { useState, useEffect } from 'react'
import '../../assets/style/translator.css'
import TeamProjects from './TeamProjects'
import Revenue from './Revenue'
import Payout from './Payout'
import { getAllProjectTeamsApi } from '../../services/api/ProjectTeamApi'
import { toast } from 'react-toastify'

function TranslatorDashboard({ user, onLogout }) {
  const [activeNav, setActiveNav] = useState('project-teams') // 'dashboard' | 'project-teams' | 'revenue' | 'payout'
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const userName = user.fullName || user.username || 'Translator'

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const data = await getAllProjectTeamsApi()
      const mapped = (data || []).map(p => ({
        ...p,
        team: p.title,
        title: p.comicName
      }))
      setProjects(mapped)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load translator project teams.')
    } finally {
      setLoading(false)
    }
  }

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
          
          {loading ? (
            <div className="moderator-empty-state">
              <p>Loading workspace...</p>
            </div>
          ) : (
            <>
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
                      <div className="val">{projects.reduce((sum, p) => sum + (p.chaptersCount || 0), 0)} Chapters</div>
                      <div className="sub">Published across platform catalog</div>
                    </div>
                    <div className="trans-stat-card" style={{ borderTop: '4px solid var(--trans-purple)' }}>
                      <h4>Cumulative Views</h4>
                      <div className="val">142.5K Clicks</div>
                      <div className="sub">Reader clicks count stats</div>
                    </div>
                  </div>

                  <div className="placeholder-card">
                    <h4>Recent Translation Releases</h4>
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {projects.flatMap(p => (p.chaptersList || []).map(chap => ({
                        ...chap,
                        projectTitle: p.title
                      }))).slice(0, 5).map((chap, idx) => (
                        <div key={chap.id || idx} style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px', fontSize: '13px' }}>
                          📖 Released <strong>{chap.num}</strong> of <em>{chap.projectTitle}</em> ({chap.date || 'recently'})
                        </div>
                      ))}
                      {projects.flatMap(p => p.chaptersList || []).length === 0 && (
                        <p style={{ fontSize: '13px', color: 'var(--trans-text-secondary)', margin: 0 }}>No chapters published yet.</p>
                      )}
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
            </>
          )}

        </div>
      </main>
    </div>
  )
}

export default TranslatorDashboard
