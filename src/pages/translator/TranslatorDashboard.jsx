import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import TranslatorLayout from '../../components/layout/TranslatorLayout'
import '../../assets/style/translator/dashboard.css'
import { getTranslatorDashboardApi, updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { getAuth } from '../../utils/Auth'
import { exportToCsv } from '../../utils/exportToCsv'
import { toast } from 'react-toastify'

const PROJECTS_PER_PAGE = 4
const TASKS_PER_PAGE = 5

function TranslatorDashboard() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [teamStats, setTeamStats] = useState({})
  const [activeTasks, setActiveTasks] = useState([])
  const [loading, setLoading] = useState(true)

  // Pagination states
  const [projectsPage, setProjectsPage] = useState(1)
  const [tasksPage, setTasksPage] = useState(1)

  const auth = getAuth()
  const user = auth?.user || {}

  useEffect(() => {
    let hasCache = false;
    try {
      const cached = sessionStorage.getItem('comiverse_dash_cache');
      if (cached) {
        const { projects: cProjects, teamStats: cStats } = JSON.parse(cached);
        if (Array.isArray(cProjects) && cProjects.length > 0) {
          setProjects(cProjects);
          setTeamStats(cStats || {});
          setLoading(false);
          hasCache = true;
        }
      }
    } catch (e) {}

    fetchDashboardData(hasCache);
  }, [])


  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent && projects.length === 0) setLoading(true)

      // Fetch aggregated dashboard data in exactly 1 API call instead of 2 * N + 2
      const res = await getTranslatorDashboardApi()
      const data = res.data || res
      
      const mappedProjects = (data.projects || []).map(p => {
        const currentUserName = (user.fullName || '').toLowerCase().trim();
        const currentUsername = (user.username || '').toLowerCase().trim();
        const currentUserId = user.id || user.userId;
        const leaderName = (p.leaderName || '').toLowerCase().trim();
        const leaderId = p.leaderId || p.createdById;
        const isLeader = (currentUserName && leaderName === currentUserName) || (currentUsername && leaderName === currentUsername) || (currentUserId && leaderId === currentUserId);

        return {
          ...p,
          team: p.title || p.name || 'Unnamed Team',
          title: p.comicName || p.title || 'Untitled Comic',
          isLeader
        }
      })

      setProjects(mappedProjects)

      // Fast Sync LocalStorage Tasks if present
      const statsMap = data.teamStats || {}
      
      setTeamStats(statsMap)
      setActiveTasks(data.activeTasks || [])
      
      try {
        sessionStorage.setItem('comiverse_dash_cache', JSON.stringify({
          projects: mappedProjects,
          teamStats: statsMap,
          activeTasks: data.activeTasks || []
        }));
      } catch (e) {}
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      toast.error('Failed to load real dashboard statistics.')
    } finally {
      setLoading(false)
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
      await fetchDashboardData(true)
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
        toast.info(`Rejected assignment for ${team.title}.`)
        await fetchDashboardData(true)
      } catch (err) {
        console.error(err)
        toast.error('Failed to reject assignment.')
      }
    }
  }

  // Filtered Projects List
  const filteredProjects = useMemo(() => {
    return projects
  }, [projects])

  // Calculated 100% Real Statistics
  const overallStats = useMemo(() => {
    let totalTasksCount = 0
    let backlogCount = 0
    let inProgressCount = 0
    let reviewCount = 0
    let doneCount = 0
    let totalChaptersCount = 0

    filteredProjects.forEach(p => {
      const pStats = teamStats[p.id] || { totalTasks: 0, backlog: 0, inProgress: 0, review: 0, done: 0, totalChapters: 0 }
      
      totalTasksCount += pStats.totalTasks || 0
      backlogCount += pStats.backlog || 0
      inProgressCount += pStats.inProgress || 0
      reviewCount += pStats.review || 0
      doneCount += pStats.done || 0
      totalChaptersCount += pStats.totalChapters || 0
    })

    return {
      totalProjects: filteredProjects.length,
      activeProjects: filteredProjects.filter(p => p.status === 'ACTIVE' || !p.status).length,
      pendingProjects: filteredProjects.filter(p => p.status === 'PENDING').length,
      totalTasksCount,
      activeTasksCount: backlogCount + inProgressCount + reviewCount,
      backlogCount,
      inProgressCount,
      reviewCount,
      doneCount,
      totalChaptersCount
    }
  }, [filteredProjects, teamStats])

  // Paginated Projects List
  const totalProjectsPages = Math.max(1, Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE))
  const paginatedProjects = useMemo(() => {
    const start = (projectsPage - 1) * PROJECTS_PER_PAGE
    return filteredProjects.slice(start, start + PROJECTS_PER_PAGE)
  }, [filteredProjects, projectsPage])

  // Active Real Tasks Activity (Ongoing / Unfinished Tasks)
  const allActiveTasks = useMemo(() => {
    // Map with team/comic titles
    return activeTasks.map(t => {
      const p = filteredProjects.find(proj => proj.id === t.projectTeamId) || {}
      return {
        ...t,
        teamTitle: p.team || 'Unknown Team',
        comicTitle: p.title || 'Unknown Comic',
        teamId: t.projectTeamId
      }
    })
  }, [filteredProjects, activeTasks])

  // Export Statistics & Workload to Excel CSV
  const handleExportDashboard = () => {
    if (!filteredProjects || filteredProjects.length === 0) {
      toast.warn('No project data available to export.')
      return
    }

    const headers = [
      'Team Name',
      'Comic Title',
      'Role in Team',
      'Team Status',
      'Language (Source -> Target)',
      'Members Count',
      'Published Chapters',
      'Backlog Tasks',
      'In Progress Tasks',
      'In Review Tasks',
      'Completed Tasks',
      'Total Tasks'
    ]

    const rows = filteredProjects.map(p => {
      const pStats = teamStats[p.id] || { tasks: [], chapters: [] }
      let backlog = 0, inProgress = 0, review = 0, done = 0

      pStats.tasks.forEach(t => {
        const col = (t.column || t.status || '').toLowerCase()
        if (col.includes('done') || col.includes('completed')) done++
        else if (col.includes('progress') || col.includes('doing')) inProgress++
        else if (col.includes('review')) review++
        else backlog++
      })

      const totalTasks = backlog + inProgress + review + done

      return [
        p.team || p.title || 'Unnamed Team',
        p.comicName || p.title || 'Untitled Comic',
        p.isLeader ? 'Project Leader' : 'Translator Member',
        p.status || 'ACTIVE',
        `${p.sourceLang || 'Any'} -> ${p.targetLang || 'Vietnamese'}`,
        p.membersCount || 1,
        pStats.chapters?.length || 0,
        backlog,
        inProgress,
        review,
        done,
        totalTasks
      ]
    })

    const prefix = 'ComiVerse_Translator_Dashboard_Report'

    exportToCsv(prefix, headers, rows)
    toast.success('Workload report exported successfully!')
  }

  // Paginated Active Tasks List
  const totalTasksPages = Math.max(1, Math.ceil(allActiveTasks.length / TASKS_PER_PAGE))
  const paginatedTasks = useMemo(() => {
    const start = (tasksPage - 1) * TASKS_PER_PAGE
    return allActiveTasks.slice(start, start + TASKS_PER_PAGE)
  }, [allActiveTasks, tasksPage])

  if (loading && projects.length === 0) {
    return (
      <div className="fade-in trans-dashboard-container" style={{ padding: '0 0 40px' }}>
        <div className="translator-page-header">
          <div>
            <div className="skeleton-dash-shimmer" style={{ width: '280px', height: '28px', marginBottom: '8px' }}></div>
            <div className="skeleton-dash-shimmer" style={{ width: '400px', height: '16px' }}></div>
          </div>
        </div>
        <div className="trans-stats-grid-2" style={{ marginTop: '24px' }}>
          <div className="skeleton-dash-shimmer" style={{ height: '120px' }}></div>
          <div className="skeleton-dash-shimmer" style={{ height: '120px' }}></div>
        </div>
        <div className="dashboard-sections-grid" style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
          <div className="skeleton-dash-shimmer" style={{ height: '320px' }}></div>
          <div className="skeleton-dash-shimmer" style={{ height: '320px' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in trans-dashboard-container">
      {/* Page Header */}
      <div className="translator-page-header">
        <div className="translator-page-header-info">
          <h1>
            <span style={{ fontSize: '24px' }}>📊</span> Translator & Team Leader Dashboard
          </h1>
          <p>Real-time analytics, task completion progress, published releases, and team workload.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

          <button
            type="button"
            onClick={handleExportDashboard}
            disabled={loading || filteredProjects.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              fontSize: '13px',
              cursor: loading || filteredProjects.length === 0 ? 'not-allowed' : 'pointer',
              opacity: loading || filteredProjects.length === 0 ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.2s ease',
              height: '38px',
              whiteSpace: 'nowrap'
            }}
            title="Export full statistics and workload breakdown to Excel CSV"
          >
            📥 Export Report
          </button>
        </div>
      </div>

      {/* Pending Assignment Alerts */}
      {projects.filter(p => p.status === 'PENDING' && p.isLeader).map(team => (
        <div
          key={team.id}
          className="pending-assignment-alert"
          style={{
            background: 'rgba(168, 85, 247, 0.12)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '26px' }}>📋</span>
            <div>
              <h4 style={{ margin: 0, color: 'var(--trans-text-primary, #0f172a)', fontSize: '15px', fontWeight: '700' }}>
                Pending Translation Assignment
              </h4>
              <p style={{ margin: '4px 0 0', color: 'var(--trans-text-secondary, #475569)', fontSize: '13px' }}>
                Moderator assigned team <strong>{team.team}</strong> to translate <strong>{team.title}</strong> into <strong>{team.targetLang || 'Vietnamese'}</strong>.
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
                padding: '8px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '13px'
              }}
            >
              Approve Assignment
            </button>
            <button
              onClick={() => handleRejectAssignment(team)}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px'
              }}
            >
              Reject
            </button>
          </div>
        </div>
      ))}

      {/* 2 Core Real KPI Stat Cards */}
      <div className="trans-stats-grid-2">
        {/* Stat Card 1: Assigned Projects */}
        <div className="trans-stat-card-theme" style={{ borderTop: '4px solid #a855f7' }}>
          <div className="trans-stat-card-header">
            <h4>Assigned Projects</h4>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
              📁
            </div>
          </div>
          <div className="val">{overallStats.totalProjects} Teams</div>
        </div>

        {/* Stat Card 2: Translated Chapters */}
        <div className="trans-stat-card-theme" style={{ borderTop: '4px solid #3b82f6' }}>
          <div className="trans-stat-card-header">
            <h4>Translated Chapters</h4>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              📖
            </div>
          </div>
          <div className="val">{overallStats.doneCount} {overallStats.doneCount === 1 ? 'Chapter' : 'Chapters'}</div>
          <div className="sub">
            <span>{overallStats.doneCount} completed of {overallStats.totalChaptersCount} total chapters in series</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="dashboard-sections-grid">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
          {/* Task Breakdown Card */}
          <div className="dashboard-card-theme">
            <div className="dashboard-card-header">
              <h3>📌 Workflow & Kanban Task Breakdown</h3>
              <span style={{ fontSize: '13px', color: 'var(--trans-text-secondary, #64748b)', fontWeight: '600' }}>
                Active Tasks: {overallStats.activeTasksCount} ({overallStats.doneCount} Completed)
              </span>
            </div>

            <div className="task-breakdown-grid">
              <div className="task-breakdown-box backlog">
                <div className="num">{overallStats.backlogCount}</div>
                <div className="label">Backlog / To Do</div>
              </div>
              <div className="task-breakdown-box in_progress">
                <div className="num" style={{ color: '#2563eb' }}>{overallStats.inProgressCount}</div>
                <div className="label">In Progress</div>
              </div>
              <div className="task-breakdown-box review">
                <div className="num" style={{ color: '#d97706' }}>{overallStats.reviewCount}</div>
                <div className="label">Review Queue</div>
              </div>
              <div className="task-breakdown-box completed">
                <div className="num" style={{ color: '#059669' }}>{overallStats.doneCount}</div>
                <div className="label">Completed</div>
              </div>
            </div>
          </div>

          {/* Active Assigned Projects List Card */}
          <div className="dashboard-card-theme" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <div className="dashboard-card-header">
              <h3>📁 Active Translation Channels & Workspaces</h3>
              <button
                className="dash-quick-action-btn"
                onClick={() => navigate('/translator/project-teams')}
              >
                View All Projects →
              </button>
            </div>

            <div className="dash-project-list" style={{ flexGrow: 1 }}>
              {filteredProjects.length === 0 ? (
                <p style={{ color: 'var(--trans-text-secondary, #64748b)', fontSize: '14px', margin: 0, fontStyle: 'italic' }}>
                  No team projects match the selected filter.
                </p>
              ) : (
                paginatedProjects.map(team => {
                  const pStats = teamStats[team.id] || { tasks: [] }

                  let statusDisplay = (team.status || 'Active').toUpperCase()
                  const hasInProgress = pStats.tasks.some(t => {
                    const col = (t.column || t.status || '').toLowerCase()
                    return col.includes('progress') || col.includes('doing')
                  })
                  const hasReview = pStats.tasks.some(t => {
                    const col = (t.column || t.status || '').toLowerCase()
                    return col.includes('review') || col.includes('testing')
                  })

                  if (hasInProgress) statusDisplay = 'IN PROGRESS'
                  else if (hasReview) statusDisplay = 'UNDER REVIEW'

                  let statusColor = '#10b981'
                  if (statusDisplay === 'IN PROGRESS') statusColor = '#3b82f6'
                  else if (statusDisplay === 'UNDER REVIEW') statusColor = '#f59e0b'

                  return (
                    <div key={team.id} className="dash-project-card-theme">
                      <div className="dash-project-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h5>{team.title}</h5>
                          {team.isLeader ? (
                            <span className="badge-role-leader">👑 Leader</span>
                          ) : (
                            <span className="badge-role-member">Translator</span>
                          )}
                        </div>
                        <p>
                          Team: <strong>{team.team}</strong> • Lang: <strong>{team.targetLang || 'VN'}</strong> • Status: <strong style={{ color: statusColor, letterSpacing: '0.3px' }}>{statusDisplay}</strong>
                        </p>
                      </div>

                      <button
                        className="dash-quick-action-btn"
                        onClick={() => navigate('/translator/project-teams', { state: { teamId: team.id, tab: 'tasks' } })}
                      >
                        Open Workspace
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* Pagination Controls for Projects */}
            {totalProjectsPages > 1 && (
              <div className="dash-pagination-bar">
                <button
                  className="dash-page-btn"
                  disabled={projectsPage === 1}
                  onClick={() => setProjectsPage(p => Math.max(1, p - 1))}
                >
                  ← Prev
                </button>
                <span className="dash-page-info">
                  Page <strong>{projectsPage}</strong> of <strong>{totalProjectsPages}</strong> ({filteredProjects.length} teams)
                </span>
                <button
                  className="dash-page-btn"
                  disabled={projectsPage === totalProjectsPages}
                  onClick={() => setProjectsPage(p => Math.min(totalProjectsPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Team Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
          <div className="dashboard-card-theme" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            <div className="dashboard-card-header">
              <h3>⏱️ Active Team Tasks</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
              {allActiveTasks.length === 0 ? (
                <p style={{ color: 'var(--trans-text-secondary, #64748b)', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
                  No active tasks found.
                </p>
              ) : (
                paginatedTasks.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="dash-task-item-card"
                    onClick={() => navigate('/translator/project-teams', { state: { teamId: t.teamId, tab: 'tasks', taskId: t.id } })}
                  >
                    <div className="task-title-row">
                      <span>{t.title}</span>
                      <span className="task-arrow-icon">→</span>
                    </div>
                    <div className="task-meta-row">
                      <span>Series: <strong>{t.comicTitle}</strong> ({t.teamTitle})</span>
                      <span className={`task-status-pill ${(t.column || t.status || 'backlog').toLowerCase()}`}>
                        {(t.column || t.status || 'Backlog').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls for Active Tasks */}
            {totalTasksPages > 1 && (
              <div className="dash-pagination-bar">
                <button
                  className="dash-page-btn"
                  disabled={tasksPage === 1}
                  onClick={() => setTasksPage(p => Math.max(1, p - 1))}
                >
                  ← Prev
                </button>
                <span className="dash-page-info">
                  Page <strong>{tasksPage}</strong> of <strong>{totalTasksPages}</strong> ({allActiveTasks.length} tasks)
                </span>
                <button
                  className="dash-page-btn"
                  disabled={tasksPage === totalTasksPages}
                  onClick={() => setTasksPage(p => Math.min(totalTasksPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TranslatorDashboard