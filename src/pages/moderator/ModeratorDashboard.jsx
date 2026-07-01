import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../../assets/style/moderator.css'
import '../../assets/style/moderator/dashboard.css'
import ReviewQueue from './ReviewQueue'
import ComicManagement from './ComicManagement'
import GenreManagement from './GenreManagement'
import ProjectTeams from './ProjectTeams'
import ChatMonitor from './ChatMonitor'
import ForumModeration from './ForumModeration'
import { getAllComicsApi, updateComicApi, deleteComicApi } from '../../services/api/ComicApi'
import { getAllProjectTeamsApi, createProjectTeamApi, deleteProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { getAllSubmissionsApi, approveSubmissionApi, rejectSubmissionApi } from '../../services/api/SubmissionApi'
import { getAllGenresApi } from '../../services/api/GenreApi'
import { toast } from 'react-toastify'


function ModeratorDashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState('dashboard') // 'dashboard' | 'review-queue' | 'comic-management' | etc.
  
  // Dynamic API backed states
  const [submissions, setSubmissions] = useState([])
  const [comics, setComics] = useState([])
  const [projectTeams, setProjectTeams] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)

  // Creation Team Modal Shared triggers
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [createTeamStep, setCreateTeamStep] = useState(1)
  const [createTeamForm, setCreateTeamForm] = useState({
    title: '',
    comicName: '',
    deadline: '',
    sourceLang: 'Japanese',
    targetLang: 'English',
    leaderName: 'John Smith',
    priority: 'High'
  })

  const userName = user.fullName || user.username || 'Moderator'

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [comicsData, teamsData, submissionsData, genresData] = await Promise.all([
        getAllComicsApi(),
        getAllProjectTeamsApi(),
        getAllSubmissionsApi(),
        getAllGenresApi()
      ])
      setComics(comicsData || [])
      setProjectTeams(teamsData || [])
      setSubmissions(submissionsData || [])
      setGenres(genresData?.data || genresData || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to retrieve control panel data from server.')
    } finally {
      setLoading(false)
    }
  }

  const getNavBadgeCount = (nav) => {
    if (nav === 'review-queue') {
      return submissions.filter(item => item.status === 'pending').length
    }
    if (nav === 'chat-monitor') return 2
    if (nav === 'forum') return 2
    return 0
  }

  // API Call Integration Handlers
  const handleApprove = async (id) => {
    try {
      await approveSubmissionApi(id)
      toast.success('Submission approved!')
      await fetchAllData() // Reload lists to sync all changes
    } catch (err) {
      console.error(err)
      toast.error('Failed to approve submission.')
    }
  }

  const handleConfirmReject = async (id, reason) => {
    try {
      await rejectSubmissionApi(id, reason)
      toast.success('Submission rejected.')
      await fetchAllData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to reject submission.')
    }
  }

  const handleSaveEditComic = async (id, updatedFields) => {
    try {
      await updateComicApi(id, updatedFields)
      toast.success('Comic updated successfully.')
      await fetchAllData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to save comic updates.')
    }
  }

  const handleArchiveComic = async (id) => {
    try {
      await deleteComicApi(id)
      toast.success('Comic archived successfully.')
      await fetchAllData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to archive comic.')
    }
  }

  const handleTriggerAssignTeam = (comic) => {
    setActiveNav('project-teams')
    setCreateTeamForm({
      title: `${comic.title} Team`,
      comicName: comic.title,
      deadline: '',
      sourceLang: 'Japanese',
      targetLang: 'English',
      leaderName: '',
      priority: 'High'
    })
    setCreateTeamStep(1)
    setShowCreateTeamModal(true)
  }

  const handleCreateProjectTeam = async () => {
    const leaderName = createTeamForm.leaderName.trim() || 'Translator Leader'
    const leaderInitials = leaderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    const newTeam = {
      title: createTeamForm.title.trim() || `${createTeamForm.comicName} Team`,
      comicName: createTeamForm.comicName,
      status: 'Active',
      membersCount: 1,
      chaptersCount: 0,
      progress: 0,
      leaderName: leaderName,
      leaderInitials: leaderInitials,
      deadline: createTeamForm.deadline || 'unspecified',
      sourceLang: createTeamForm.sourceLang,
      targetLang: createTeamForm.targetLang,
      priority: createTeamForm.priority,
      cover: '🔮',
      description: `Official translation team for ${createTeamForm.comicName}.`,
      assignedToMe: true
    }

    try {
      await createProjectTeamApi(newTeam)
      
      // Also update the comic's projectTeam field dynamically in the database
      const comicToUpdate = comics.find(c => c.title.toLowerCase() === createTeamForm.comicName.toLowerCase())
      if (comicToUpdate) {
        await updateComicApi(comicToUpdate.id, {
          ...comicToUpdate,
          projectTeam: newTeam.title
        })
      }

      toast.success('Project team created successfully!')
      setShowCreateTeamModal(false)
      await fetchAllData()
    } catch (err) {
      console.error(err)
      toast.error('Failed to create translation project team.')
    }
  }

  const handleRemoveProjectTeam = async (id, teamTitle, comicName) => {
    if (window.confirm(`Are you sure you want to remove ${teamTitle}?`)) {
      try {
        await deleteProjectTeamApi(id)
        
        // Reset the comic's projectTeam indicator
        const comicToUpdate = comics.find(c => c.title.toLowerCase() === comicName.toLowerCase())
        if (comicToUpdate) {
          await updateComicApi(comicToUpdate.id, {
            ...comicToUpdate,
            projectTeam: '-'
          })
        }
        
        toast.success('Project team removed successfully.')
        await fetchAllData()
      } catch (err) {
        console.error(err)
        toast.error('Failed to remove project team.')
      }
    }
  }

  return (
    <div className="moderator-layout">
      {/* ── SIDEBAR ─────────────────────────────────── */}
      <aside className="moderator-sidebar">
        <div className="moderator-sidebar-brand">
          <h2>Moderator Panel</h2>
          <span>Content Management</span>
        </div>

        <nav className="moderator-sidebar-nav">
          <button 
            className={`moderator-nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveNav('dashboard')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </span>
              Dashboard
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'review-queue' ? 'active' : ''}`}
            onClick={() => setActiveNav('review-queue')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </span>
              Review Queue
            </span>
            {getNavBadgeCount('review-queue') > 0 && (
              <span className="moderator-nav-badge">{getNavBadgeCount('review-queue')}</span>
            )}
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'comic-management' ? 'active' : ''}`}
            onClick={() => setActiveNav('comic-management')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </span>
              Comic Management
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'genre-management' ? 'active' : ''}`}
            onClick={() => setActiveNav('genre-management')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
              </span>
              Genre Management
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'project-teams' ? 'active' : ''}`}
            onClick={() => setActiveNav('project-teams')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </span>
              Project Teams
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'chat-monitor' ? 'active' : ''}`}
            onClick={() => setActiveNav('chat-monitor')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </span>
              Chat Monitor
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'forum' ? 'active' : ''}`}
            onClick={() => setActiveNav('forum')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
                </svg>
              </span>
              Forum
            </span>
          </button>
        </nav>

        <div className="moderator-sidebar-footer">
          <button className="moderator-nav-item" onClick={onLogout}>
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </span>
              ← Back to Home
            </span>
          </button>
        </div>
      </aside>


      {/* ── MAIN WORKSPACE ──────────────────────────── */}
      <main className="moderator-main">
        {/* Top Navbar */}
        <header className="moderator-topbar">
          <div className="moderator-topbar-left">
            <span>Workspace: Moderator</span>
          </div>

          <div className="moderator-topbar-right">
            <button className="moderator-icon-btn" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </button>

            <div className="topbar-divider" />

            <button className="moderator-profile-btn" onClick={() => navigate('/profile')} title="My Profile">
              <span>👤</span> {userName}
            </button>

            <div className="topbar-divider" />

            <button className="moderator-logout-btn" onClick={onLogout}>
              <span>📤</span> Logout
            </button>
          </div>
        </header>

        {/* Content Render Area */}
        <div className="moderator-page-content">
          
          {loading ? (
            <div className="moderator-empty-state">
              <p>Loading dashboard metrics...</p>
            </div>
          ) : (
            <>
              {/* VIEW: DASHBOARD */}
              {activeNav === 'dashboard' && (
                <div className="fade-in animate-slide-up">
                  <div className="moderator-page-header">
                    <h1>Moderator Control Console</h1>
                    <p>Monitor community activities, review chapter translations, and moderate forum topics.</p>
                  </div>

                  <div className="placeholder-grid" style={{ marginBottom: '24px' }}>
                    <div className="placeholder-card" style={{ borderLeft: '4px solid var(--mod-purple)' }}>
                      <h4>Pending Reviews</h4>
                      <p style={{ fontSize: '28px', fontWeight: '700', margin: '10px 0 4px', color: 'var(--mod-purple)' }}>
                        {submissions.filter(i => i.status === 'pending').length} Chapters
                      </p>
                      <p>Author queue: {submissions.filter(i => i.status === 'pending' && i.queueType === 'author').length} | Translator queue: {submissions.filter(i => i.status === 'pending' && i.queueType === 'translator').length}</p>
                    </div>
                    <div className="placeholder-card" style={{ borderLeft: '4px solid var(--mod-green)' }}>
                      <h4>Active Moderators</h4>
                      <p style={{ fontSize: '28px', fontWeight: '700', margin: '10px 0 4px', color: 'var(--mod-green)' }}>4 Active</p>
                      <p>Monitoring ComiVerse live servers</p>
                    </div>
                    <div className="placeholder-card" style={{ borderLeft: '4px solid var(--mod-red)' }}>
                      <h4>Total Comics</h4>
                      <p style={{ fontSize: '28px', fontWeight: '700', margin: '10px 0 4px', color: 'var(--mod-red)' }}>
                        {comics.length} Titles
                      </p>
                      <p>Active translated and original works</p>
                    </div>
                  </div>

                  <div className="placeholder-card">
                    <h4>Recent Audited Actions</h4>
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {submissions.filter(s => s.status !== 'pending').slice(0, 5).map(s => (
                        <div key={s.id} style={{ padding: '8px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '4px', fontSize: '13px' }}>
                          {s.status === 'approved' ? '✅ Approved' : '❌ Rejected'} chapter <strong>{s.chapter}</strong> of <em>{s.title}</em> ({s.timeLabel || 'recently'})
                        </div>
                      ))}
                      {submissions.filter(s => s.status !== 'pending').length === 0 && (
                        <p style={{ fontSize: '13px', color: 'var(--mod-text-secondary)', margin: 0 }}>No audit logs available.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW: REVIEW QUEUE */}
              {activeNav === 'review-queue' && (
                <ReviewQueue 
                  submissions={submissions} 
                  handleApprove={handleApprove} 
                  handleConfirmReject={handleConfirmReject} 
                />
              )}

              {/* VIEW: COMIC MANAGEMENT */}
              {activeNav === 'comic-management' && (
                <ComicManagement 
                  comics={comics} 
                  projectTeams={projectTeams}
                  genres={genres}
                  handleSaveEditComic={handleSaveEditComic} 
                  handleArchiveComic={handleArchiveComic} 
                  handleTriggerAssignTeam={handleTriggerAssignTeam} 
                  fetchAllData={fetchAllData}
                />
              )}

              {/* VIEW: GENRE MANAGEMENT */}
              {activeNav === 'genre-management' && (
                <GenreManagement />
              )}

              {/* VIEW: PROJECT TEAMS */}
              {activeNav === 'project-teams' && (
                <ProjectTeams 
                  projectTeams={projectTeams}
                  setProjectTeams={setProjectTeams}
                  comics={comics}
                  showCreateTeamModal={showCreateTeamModal}
                  setShowCreateTeamModal={setShowCreateTeamModal}
                  createTeamStep={createTeamStep}
                  setCreateTeamStep={setCreateTeamStep}
                  createTeamForm={createTeamForm}
                  setCreateTeamForm={setCreateTeamForm}
                  handleCreateProjectTeam={handleCreateProjectTeam}
                />
              )}

              {/* VIEW: CHAT MONITOR */}
              {activeNav === 'chat-monitor' && (
                <ChatMonitor />
              )}

              {/* VIEW: FORUM */}
              {activeNav === 'forum' && (
                <ForumModeration />
              )}
            </>
          )}

        </div>
      </main>
    </div>
  )
}

export default ModeratorDashboard
