import { useState, useEffect } from 'react'
import '../../assets/style/moderator.css'
import ReviewQueue from './ReviewQueue'
import ComicManagement from './ComicManagement'
import GenreManagement from './GenreManagement'
import ProjectTeams from './ProjectTeams'
import ChatMonitor from './ChatMonitor'
import ForumModeration from './ForumModeration'
import { getAllComicsApi, updateComicApi, deleteComicApi } from '../../services/api/ComicApi'
import { getAllProjectTeamsApi, createProjectTeamApi, deleteProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { getAllSubmissionsApi, approveSubmissionApi, rejectSubmissionApi } from '../../services/api/SubmissionApi'
import { toast } from 'react-toastify'

const AVAILABLE_TRANSLATORS = [
  { name: 'John Smith', initials: 'JS' },
  { name: 'Emily Brown', initials: 'EB' },
  { name: 'Li Ming', initials: 'LM' },
  { name: 'David Lee', initials: 'DL' },
  { name: 'Sarah Connor', initials: 'SC' }
]

function ModeratorDashboard({ user, onLogout }) {
  const [activeNav, setActiveNav] = useState('review-queue') // 'dashboard' | 'review-queue' | 'comic-management' | etc.
  
  // Dynamic API backed states
  const [submissions, setSubmissions] = useState([])
  const [comics, setComics] = useState([])
  const [projectTeams, setProjectTeams] = useState([])
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
      const [comicsData, teamsData, submissionsData] = await Promise.all([
        getAllComicsApi(),
        getAllProjectTeamsApi(),
        getAllSubmissionsApi()
      ])
      setComics(comicsData || [])
      setProjectTeams(teamsData || [])
      setSubmissions(submissionsData || [])
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
    if (window.confirm('Are you sure you want to archive this comic?')) {
      try {
        await deleteComicApi(id)
        toast.success('Comic archived successfully.')
        await fetchAllData()
      } catch (err) {
        console.error(err)
        toast.error('Failed to archive comic.')
      }
    }
  }

  const handleTriggerAssignTeam = (comic) => {
    setCreateTeamForm({
      title: `${comic.title} Team`,
      comicName: comic.title,
      deadline: '',
      sourceLang: 'Japanese',
      targetLang: 'English',
      leaderName: 'John Smith',
      priority: 'High'
    })
    setCreateTeamStep(1)
    setShowCreateTeamModal(true)
  }

  const handleCreateProjectTeam = async () => {
    const leaderObj = AVAILABLE_TRANSLATORS.find(t => t.name === createTeamForm.leaderName) || { name: 'John Smith', initials: 'JS' }
    const newTeam = {
      title: createTeamForm.title.trim() || `${createTeamForm.comicName} Team`,
      comicName: createTeamForm.comicName,
      status: 'Active',
      membersCount: 1,
      chaptersCount: 0,
      progress: 0,
      leaderName: leaderObj.name,
      leaderInitials: leaderObj.initials,
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
              <span className="moderator-nav-icon">📊</span>
              Dashboard
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'review-queue' ? 'active' : ''}`}
            onClick={() => setActiveNav('review-queue')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">📝</span>
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
              <span className="moderator-nav-icon">📚</span>
              Comic Management
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'genre-management' ? 'active' : ''}`}
            onClick={() => setActiveNav('genre-management')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">🏷️</span>
              Genre Management
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'project-teams' ? 'active' : ''}`}
            onClick={() => setActiveNav('project-teams')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">👥</span>
              Project Teams
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'chat-monitor' ? 'active' : ''}`}
            onClick={() => setActiveNav('chat-monitor')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">💬</span>
              Chat Monitor
            </span>
          </button>

          <button 
            className={`moderator-nav-item ${activeNav === 'forum' ? 'active' : ''}`}
            onClick={() => setActiveNav('forum')}
          >
            <span className="moderator-nav-label-group">
              <span className="moderator-nav-icon">#</span>
              Forum
            </span>
          </button>
        </nav>

        <div className="moderator-sidebar-footer">
          <button className="moderator-nav-item" onClick={onLogout}>
            <span className="moderator-nav-label-group">
              <span>🚪</span>
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

            <button className="moderator-profile-btn">
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
                        <div key={s.id} style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px', fontSize: '13px' }}>
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
                  handleSaveEditComic={handleSaveEditComic} 
                  handleArchiveComic={handleArchiveComic} 
                  handleTriggerAssignTeam={handleTriggerAssignTeam} 
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
                  availableTranslators={AVAILABLE_TRANSLATORS}
                  showCreateTeamModal={showCreateTeamModal}
                  setShowCreateTeamModal={setShowCreateTeamModal}
                  createTeamStep={createTeamStep}
                  setCreateTeamStep={setCreateTeamStep}
                  createTeamForm={createTeamForm}
                  setCreateTeamForm={setCreateTeamForm}
                  handleCreateProjectTeam={handleCreateProjectTeam}
                  handleRemoveProjectTeam={handleRemoveProjectTeam}
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
