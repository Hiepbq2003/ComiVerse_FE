import { useState, useEffect } from 'react'
import '../../assets/style/moderator/dashboard.css'
import ModeratorLayout from '../../components/layout/ModeratorLayout'
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


function ModeratorDashboard() {
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

  const getNavBadges = () => {
    return {
      'review-queue': submissions.filter(item => item.status === 'pending').length,
      'chat-monitor': 2,
      'forum': 2,
    }
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
    <ModeratorLayout activeNav={activeNav} onNavChange={setActiveNav} navBadges={getNavBadges()}>
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
    </ModeratorLayout>
  )
}

export default ModeratorDashboard
