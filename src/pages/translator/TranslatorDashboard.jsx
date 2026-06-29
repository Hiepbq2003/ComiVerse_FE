import { useState, useEffect } from 'react'
import '../../assets/style/translator.css'
import '../../assets/style/translator/dashboard.css'
import TeamProjects from './TeamProjects'
import Revenue from './Revenue'
import Payout from './Payout'
import { getAllProjectTeamsApi, updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { getAllComicsApi, updateComicApi } from '../../services/api/ComicApi'
import { toast } from 'react-toastify'

function TranslatorDashboard({ user, onLogout }) {
  const [activeNav, setActiveNav] = useState('dashboard') // 'dashboard' | 'project-teams' | 'revenue' | 'payout'
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const userName = user.fullName || user.username || 'Translator'

  // A translator is a "Leader" if they are assigned as leaderName in at least one project team
  const isLeader = projects.some(p => 
    p.leaderName && (p.leaderName === user.fullName || p.leaderName === user.username)
  )

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
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
      if (!silent) setLoading(false)
    }
  }

  const handleAcceptAssignment = async (team) => {
    try {
      const originalTeam = projects.find(p => p.id === team.id)
      if (!originalTeam) return

      const payload = {
        ...originalTeam,
        title: originalTeam.team,
        comicName: originalTeam.title,
        status: 'ACTIVE'
      }

      await updateProjectTeamApi(team.id, payload)
      toast.success(`Approved translation assignment for ${team.title}!`)
      await fetchProjects()
    } catch (err) {
      console.error(err)
      toast.error('Failed to approve assignment.')
    }
  }

  const handleRejectAssignment = async (team) => {
    if (window.confirm(`Are you sure you want to reject translating ${team.title}?`)) {
      try {
        const originalTeam = projects.find(p => p.id === team.id)
        if (!originalTeam) return

        const teamPayload = {
          ...originalTeam,
          title: originalTeam.team,
          comicName: '-',
          targetLang: '-',
          status: 'ACTIVE'
        }

        await updateProjectTeamApi(team.id, teamPayload)

        const allComics = await getAllComicsApi()
        const comicToReset = allComics.find(c => c.title.toLowerCase() === team.title.toLowerCase())
        if (comicToReset) {
          await updateComicApi(comicToReset.id, {
            ...comicToReset,
            projectTeam: '-'
          })
        }

        toast.info(`Rejected assignment for ${team.title}. The project has been returned.`)
        await fetchProjects()
      } catch (err) {
        console.error(err)
        toast.error('Failed to reject assignment.')
      }
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
            <span className="translator-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </span>
            Dashboard
          </button>


          <button 
            className={`translator-nav-item ${activeNav === 'project-teams' ? 'active' : ''}`}
            onClick={() => setActiveNav('project-teams')}
          >
            <span className="translator-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </span>
            Project Teams
          </button>

          <button 
            className={`translator-nav-item ${activeNav === 'revenue' ? 'active' : ''}`}
            onClick={() => setActiveNav('revenue')}
          >
            <span className="translator-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </span>
            Revenue
          </button>

          <button 
            className={`translator-nav-item ${activeNav === 'payout' ? 'active' : ''}`}
            onClick={() => setActiveNav('payout')}
          >
            <span className="translator-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </span>
            Payout
          </button>
        </nav>

        <div className="translator-sidebar-footer">
          <button className="translator-nav-item" onClick={onLogout}>
            <span className="translator-nav-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </span>
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

                  {/* Pending Assignments Section */}
                  {projects.filter(p => p.status === 'PENDING' && (p.leaderName === user.fullName || p.leaderName === user.username)).map(team => (
                    <div key={team.id} className="pending-assignment-alert" style={{
                      background: 'rgba(124, 58, 237, 0.1)',
                      border: '1px solid rgba(124, 58, 237, 0.3)',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>📋</span>
                        <div>
                          <h4 style={{ margin: 0, color: '#fff', fontSize: '15px' }}>Pending Translation Assignment</h4>
                          <p style={{ margin: '4px 0 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '13px' }}>
                            Moderator has assigned your team <strong>{team.team}</strong> to translate <strong>{team.title}</strong> into <strong>{team.targetLang}</strong> (Deadline: {team.deadline || 'unspecified'}).
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                          onClick={() => handleAcceptAssignment(team)}
                          style={{
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'opacity 0.2s'
                          }}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleRejectAssignment(team)}
                          style={{
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            transition: 'opacity 0.2s'
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}

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
                        <div key={chap.id || idx} style={{ padding: '10px 12px', background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '13px', color: 'var(--trans-text-primary)' }}>
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
                <TeamProjects projects={projects} setProjects={setProjects} fetchProjects={fetchProjects} user={user} />
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
