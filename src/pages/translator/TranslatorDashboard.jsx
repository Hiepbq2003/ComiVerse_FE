// pages/translator/TranslatorDashboardHome.jsx
import { useState, useEffect } from 'react'
import '../../assets/style/translator/dashboard.css'
import { getAllProjectTeamsApi, updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { getAllComicsApi, updateComicApi } from '../../services/api/ComicApi'
import { getAuth } from '../../utils/Auth'
import { toast } from 'react-toastify'

function TranslatorDashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const auth = getAuth()
  const user = auth?.user || {}

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
          await updateComicApi(comicToReset.id, { ...comicToReset, projectTeam: '-' })
        }
        toast.info(`Rejected assignment for ${team.title}. The project has been returned.`)
        await fetchProjects()
      } catch (err) {
        console.error(err)
        toast.error('Failed to reject assignment.')
      }
    }
  }

  if (loading) {
    return (
      <div className="moderator-empty-state">
        <p>Loading workspace...</p>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="translator-page-header">
        <div className="translator-page-header-info">
          <h1>Translator Hub Console</h1>
          <p>Check translation summaries, cumulative monthly views, and pending clearances.</p>
        </div>
      </div>

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
            <button onClick={() => handleAcceptAssignment(team)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
              Approve
            </button>
            <button onClick={() => handleRejectAssignment(team)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
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
          {projects.flatMap(p => (p.chaptersList || []).map(chap => ({ ...chap, projectTitle: p.title }))).slice(0, 5).map((chap, idx) => (
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
  )
}

export default TranslatorDashboard