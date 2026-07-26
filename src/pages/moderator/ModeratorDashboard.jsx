import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
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
import { getAllForumThreadsApi } from '../../services/api/ForumThreadApi'
import { getAllChatFlagsApi } from '../../services/api/ChatFlagApi'
import { toast } from 'react-toastify'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import ModernButton from '../../components/common/ModernButton'
import { getAuth } from '../../utils/Auth'


const formatSubmitterName = (submittedBy) => {
  if (!submittedBy) return 'Unknown';
  let name = submittedBy;
  let isAuthor = false;
  if (name.startsWith('Author: ')) {
    name = name.substring(8);
    isAuthor = true;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(name)) {
    name = `User_${name.substring(0, 7)}`;
  }
  
  return isAuthor ? `Author: ${name}` : name;
};

const getCategoryStyle = (actionType) => {
  switch (actionType) {
    case 'REVIEW_QUEUE':
      return { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' };
    case 'PROJECT_TEAMS':
      return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
    case 'CHAT_MODERATION':
      return { background: 'rgba(249, 115, 22, 0.1)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.2)' };
    case 'FORUM_MODERATION':
      return { background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.2)' };
    case 'COMIC_MANAGEMENT':
      return { background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.2)' };
    default:
      return { background: 'rgba(255, 255, 255, 0.05)', color: 'var(--mod-text-secondary)', border: '1px solid rgba(255, 255, 255, 0.1)' };
  }
};

const renderDescription = (description) => {
  if (!description) return '';
  const regex = /(chapter\s+[0-9a-zA-Z.-]+)/i;
  const parts = description.split(regex);
  if (parts.length > 1) {
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return <strong key={index} style={{ color: 'var(--mod-purple)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{part}</strong>;
      }
      return part;
    });
  }
  return description;
};

function ModeratorDashboard() {
  const location = useLocation()
  const [activeNav, setActiveNav] = useState(() => {
    return location.state?.activeNav || 'dashboard'
  })
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [pinnedPoint, setPinnedPoint] = useState(null)
  const [hoveredGenre, setHoveredGenre] = useState(null)
  const [chartTimeframe, setChartTimeframe] = useState('week') // 'week' | 'month'
  
  // Dynamic API backed states
  const [submissions, setSubmissions] = useState([])
  const [comics, setComics] = useState([])
  const [projectTeams, setProjectTeams] = useState([])
  const [genres, setGenres] = useState([])
  const [forumThreads, setForumThreads] = useState([])
  const [chatFlags, setChatFlags] = useState([])
  const [loading, setLoading] = useState(true)

  // Creation Team Modal Shared triggers
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [createTeamStep, setCreateTeamStep] = useState(1)
  const [createTeamForm, setCreateTeamForm] = useState({
    title: '',
    comicName: '',
    sourceLang: 'Japanese',
    targetLang: 'English',
    leaderName: '',
    leaderId: '',
    priority: 'High'
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchComicsAndTeams = async () => {
    try {
      const [comicsData, teamsData, genresData] = await Promise.all([
        getAllComicsApi(),
        getAllProjectTeamsApi(),
        getAllGenresApi()
      ])
      const mappedComics = (comicsData || []).map(c => {
        const team = (teamsData || []).find(t => t.comicName && t.comicName.toLowerCase() === c.title.toLowerCase())
        return {
          ...c,
          projectTeam: team ? team.title : '-'
        }
      })
      setComics(mappedComics)
      setProjectTeams(teamsData || [])
      setGenres(genresData?.data || genresData || [])
    } catch (err) {
      console.error('Failed to fetch comics/teams:', err)
    }
  }

  const fetchSubmissionsData = async () => {
    try {
      const data = await getAllSubmissionsApi()
      setSubmissions(data || [])
    } catch (err) {
      console.error('Failed to fetch submissions:', err)
    }
  }

  const fetchForumThreadsData = async () => {
    try {
      const data = await getAllForumThreadsApi()
      setForumThreads(data || [])
    } catch (err) {
      console.error('Failed to fetch forum threads:', err)
    }
  }

  const fetchChatFlagsData = async () => {
    try {
      const data = await getAllChatFlagsApi()
      setChatFlags(data || [])
    } catch (err) {
      console.error('Failed to fetch chat flags:', err)
    }
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const results = await Promise.allSettled([
        getAllComicsApi(),
        getAllProjectTeamsApi(),
        getAllSubmissionsApi(),
        getAllGenresApi(),
        getAllForumThreadsApi(),
        getAllChatFlagsApi()
      ])

      const comicsData = results[0].status === 'fulfilled' ? results[0].value : []
      const teamsData = results[1].status === 'fulfilled' ? results[1].value : []
      const submissionsData = results[2].status === 'fulfilled' ? results[2].value : []
      const genresData = results[3].status === 'fulfilled' ? results[3].value : []
      const forumData = results[4].status === 'fulfilled' ? results[4].value : []
      const chatData = results[5].status === 'fulfilled' ? results[5].value : []

      const mappedComics = (comicsData || []).map(c => {
        const team = (teamsData || []).find(t => t.comicName && t.comicName.toLowerCase() === c.title.toLowerCase())
        return {
          ...c,
          projectTeam: team ? team.title : '-'
        }
      })
      setComics(mappedComics)
      setProjectTeams(teamsData || [])
      setSubmissions(submissionsData || [])
      setGenres(genresData?.data || (Array.isArray(genresData) ? genresData : []))
      setForumThreads(forumData || [])
      setChatFlags(chatData || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to retrieve control panel data from server.')
    } finally {
      setLoading(false)
    }
  }

  const getNavBadges = () => {
    let localFlags = []
    try {
      const raw = localStorage.getItem('comiverse_moderator_flags')
      localFlags = raw ? JSON.parse(raw) : []
    } catch (e) {}

    const flagMap = new Map()
    ;(chatFlags || []).forEach(f => flagMap.set(f.id, f))
    localFlags.forEach(f => flagMap.set(f.id, { ...(flagMap.get(f.id) || {}), ...f }))
    const allFlags = Array.from(flagMap.values())

    const pendingChatFlags = allFlags.filter(item => !item.status || item.status === 'pending').length

    return {
      'review-queue': submissions.filter(item => item.status === 'pending').length,
      'chat-monitor': pendingChatFlags,
      'forum': forumThreads.filter(item => item.isReported).length,
    }
  }

  // API Call Integration Handlers
  const handleApprove = async (id) => {
    try {
      await approveSubmissionApi(id)
      toast.success('Submission approved!')
      const nowIso = new Date().toISOString();
      setSubmissions(prev => prev.map(item => item.id === id ? { ...item, status: 'approved', approvedAt: nowIso } : item))
      fetchComicsAndTeams()
    } catch (err) {
      console.error(err)
      toast.error('Failed to approve submission.')
    }
  }

  const handleApproveAndCreateProject = async (item) => {
    try {
      await approveSubmissionApi(item.id)
      toast.success(`Approved "${item.title}"! Opening Translation Project setup...`)
      setSubmissions(prev => prev.filter(s => s.id !== item.id))
      fetchComicsAndTeams()

      setCreateTeamForm({
        title: `${item.title} - Translation Team`,
        comicName: item.title,
        sourceLang: item.language || 'Japanese',
        targetLang: 'English',
        leaderName: '',
        leaderId: ''
      })
      setCreateTeamStep(1)
      setShowCreateTeamModal(true)
      setActiveNav('project-teams')
    } catch (err) {
      console.error(err)
      toast.error('Failed to approve submission.')
    }
  }

  const handleConfirmReject = async (id, reason) => {
    try {
      await rejectSubmissionApi(id, reason)
      toast.success('Submission rejected.')
      setSubmissions(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      console.error(err)
      toast.error('Failed to reject submission.')
    }
  }

  const handleSaveEditComic = async (id, updatedFields) => {
    try {
      const updated = await updateComicApi(id, updatedFields)
      const cleanUpdated = updated?.data || updated
      setComics(prev => prev.map(c => c.id === id ? { ...c, ...cleanUpdated, projectTeam: c.projectTeam } : c))
      toast.success('Comic updated successfully.')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save comic updates.')
    }
  }

  const handleArchiveComic = async (id) => {
    try {
      await deleteComicApi(id)
      setComics(prev => prev.filter(c => c.id !== id))
      toast.success('Comic archived successfully.')
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
      sourceLang: 'Japanese',
      targetLang: 'English',
      leaderName: '',
      leaderId: '',
      priority: 'High'
    })
    setCreateTeamStep(1)
    setShowCreateTeamModal(true)
  }

  const handleCreateProjectTeam = async () => {
    const exists = projectTeams.some(
      t => t.comicName && t.comicName.toLowerCase() === createTeamForm.comicName.toLowerCase() &&
           t.targetLang && t.targetLang.toLowerCase() === createTeamForm.targetLang.toLowerCase()
    )
    if (exists) {
      toast.error(`A translation team for "${createTeamForm.comicName}" in "${createTeamForm.targetLang}" already exists!`)
      return
    }

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
      leaderId: createTeamForm.leaderId || null,
      leaderInitials: leaderInitials,
      deadline: 'unspecified',
      sourceLang: createTeamForm.sourceLang,
      targetLang: createTeamForm.targetLang,
      priority: createTeamForm.priority,
      cover: '🔮',
      description: `Official translation team for ${createTeamForm.comicName}.`,
      assignedToMe: true
    }

    try {
      await createProjectTeamApi(newTeam)
      
      toast.success('Project team created successfully!')
      setShowCreateTeamModal(false)
      fetchComicsAndTeams()
    } catch (err) {
      console.error(err)
      toast.error('Failed to create translation project team.')
    }
  }

  const handleRemoveProjectTeam = async (id, teamTitle, comicName) => {
    if (window.confirm(`Are you sure you want to remove ${teamTitle}?`)) {
      try {
        await deleteProjectTeamApi(id)
        
        toast.success('Project team removed successfully.')
        setProjectTeams(prev => prev.filter(t => t.id !== id))
        setComics(prev => prev.map(c => c.projectTeam === teamTitle ? { ...c, projectTeam: '-' } : c))
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
            <div 
              className="fade-in animate-slide-up mod-overview-container"
              onClick={() => {
                if (pinnedPoint) {
                  setPinnedPoint(null);
                  setHoveredPoint(null);
                }
              }}
            >
              {/* Welcome Header */}
              <div className="mod-welcome-card">
                <div className="mod-welcome-text">
                  <h1>Welcome back, Moderator!</h1>
                  <p>
                    System is running smoothly. There are currently <strong>{submissions.filter(s => s.status === 'pending').length}</strong> reviews pending and <strong>{forumThreads.filter(t => t.isReported).length}</strong> open forum reports.
                  </p>
                </div>
              </div>

              {/* Core Metrics Grid */}
              <div className="mod-core-metrics-grid">
                {/* Pending Reviews */}
                <div className="mod-core-card" style={{ borderLeft: '4px solid var(--mod-purple)' }}>
                  <div className="mod-core-header">
                    <span className="mod-core-title">Pending Reviews</span>
                    <span className="mod-core-icon" style={{ background: 'rgba(168, 85, 247, 0.12)', color: 'var(--mod-purple)' }}>⏳</span>
                  </div>
                  <div className="mod-core-body">
                    <div className="mod-core-value-group">
                      <div className="mod-core-value">{submissions.filter(s => s.status === 'pending').length}</div>
                      <span className="mod-core-trend">Awaiting review queue</span>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="mod-core-sparkline" viewBox="0 0 100 35">
                      <path d="M0,25 Q15,5 30,20 T60,8 T90,20" fill="none" stroke="var(--mod-purple)" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>

                {/* Total Comics */}
                <div className="mod-core-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                  <div className="mod-core-header">
                    <span className="mod-core-title">Total Comics</span>
                    <span className="mod-core-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>📚</span>
                  </div>
                  <div className="mod-core-body">
                    <div className="mod-core-value-group">
                      <div className="mod-core-value">{comics.length}</div>
                      <span className="mod-core-trend">Titles in system</span>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="mod-core-sparkline" viewBox="0 0 100 35">
                      <path d="M0,18 Q15,28 30,10 T60,22 T90,5" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>

                {/* Active Teams */}
                <div className="mod-core-card" style={{ borderLeft: '4px solid var(--mod-green)' }}>
                  <div className="mod-core-header">
                    <span className="mod-core-title">Active Teams</span>
                    <span className="mod-core-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: 'var(--mod-green)' }}>⚡</span>
                  </div>
                  <div className="mod-core-body">
                    <div className="mod-core-value-group">
                      <div className="mod-core-value">{projectTeams.filter(t => t.status?.toUpperCase() === 'ACTIVE').length}</div>
                      <span className="mod-core-trend">Groups translating</span>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="mod-core-sparkline" viewBox="0 0 100 35">
                      <path d="M0,25 Q15,10 30,22 T60,5 T90,12" fill="none" stroke="var(--mod-green)" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>

                {/* Flagged Messages */}
                <div className="mod-core-card" style={{ borderLeft: '4px solid var(--mod-red)' }}>
                  <div className="mod-core-header">
                    <span className="mod-core-title">Flagged Chats</span>
                    <span className="mod-core-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--mod-red)' }}>💬</span>
                  </div>
                  <div className="mod-core-body">
                    <div className="mod-core-value-group">
                      <div className="mod-core-value">{chatFlags.length}</div>
                      <span className="mod-core-trend">Reported messages</span>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="mod-core-sparkline" viewBox="0 0 100 35">
                      <path d="M0,10 Q15,22 30,5 T60,18 T90,25" fill="none" stroke="var(--mod-red)" strokeWidth="2.5" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Secondary Metrics Row */}
              <div className="mod-sec-metrics-grid">
                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">🏢</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">{projectTeams.length}</span>
                    <span className="mod-sec-title">Project Teams</span>
                  </div>
                </div>

                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">📖</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">{comics.reduce((acc, c) => acc + (c.chapterCount || 0), 0)}</span>
                    <span className="mod-sec-title">Total Chapters</span>
                  </div>
                </div>

                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">📈</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">{comics.filter(c => c.publicationStatus?.toUpperCase() === 'ONGOING').length}</span>
                    <span className="mod-sec-title">Ongoing</span>
                  </div>
                </div>

                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">🏁</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">{comics.filter(c => c.publicationStatus?.toUpperCase() === 'COMPLETED').length}</span>
                    <span className="mod-sec-title">Completed</span>
                  </div>
                </div>

                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">🚩</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">{forumThreads.filter(t => t.isReported).length}</span>
                    <span className="mod-sec-title">Open Reports</span>
                  </div>
                </div>

                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">✨</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">
                      {(() => {
                        try {
                          const todayStr = new Date().toDateString();
                          return submissions.filter(s => s.status === 'approved' && s.timestamp && new Date(s.timestamp).toDateString() === todayStr).length;
                        } catch (e) {
                          return 0;
                        }
                      })()}
                    </span>
                    <span className="mod-sec-title">Approved Today</span>
                  </div>
                </div>
              </div>

              {/* Data Visualization Section */}
              <div className="mod-charts-grid">
                {/* Area Curve Line Chart (7 Day Submissions Trend) */}
                <div className="mod-chart-card">
                  <div className="mod-chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 className="mod-chart-title">Submission Activity</h3>
                      <span className="mod-chart-subtitle">
                        {chartTimeframe === 'week' ? 'Daily chapter uploads volume over the last 7 days' : 'Daily chapter uploads volume over the last 30 days'}
                      </span>
                    </div>
                    <div className="timeframe-toggles">
                      <button 
                        onClick={() => { setChartTimeframe('week'); setPinnedPoint(null); setHoveredPoint(null); }}
                        className={`timeframe-btn ${chartTimeframe === 'week' ? 'active' : ''}`}
                      >
                        Week
                      </button>
                      <button 
                        onClick={() => { setChartTimeframe('month'); setPinnedPoint(null); setHoveredPoint(null); }}
                        className={`timeframe-btn ${chartTimeframe === 'month' ? 'active' : ''}`}
                      >
                        Month
                      </button>
                    </div>
                  </div>
                  <div className="mod-chart-svg-container">
                    {(() => {
                      const trend = (() => {
                        const days = [];
                        const counts = [];
                        const details = [];
                        const numDays = chartTimeframe === 'week' ? 7 : 30;
                        for (let i = numDays - 1; i >= 0; i--) {
                          const d = new Date();
                          d.setDate(d.getDate() - i);
                          const dateStr = d.toDateString();
                          
                          // Get matching submissions
                          const items = submissions.filter(s => {
                            if (!s.timestamp) return false;
                            return new Date(s.timestamp).toDateString() === dateStr;
                          });
                          
                          const label = chartTimeframe === 'week' 
                            ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          days.push(label);
                          counts.push(items.length);
                          details.push(items);
                        }
                        return { days, counts, details };
                      })();
                      
                      const width = 580;
                      const height = 140;
                      const maxVal = Math.max(...trend.counts, 4);
                      const divisor = trend.counts.length > 1 ? trend.counts.length - 1 : 1;
                      const points = trend.counts.map((c, i) => {
                        const x = 50 + i * (width - 70) / divisor;
                        const y = 110 - (c / maxVal) * 90;
                        return { x, y, count: c, label: trend.days[i], items: trend.details[i] };
                      });
                      
                      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                      const areaPath = points.length ? `${linePath} L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z` : '';
                      
                      return (
                        <>
                          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }}>
                            <defs>
                              <linearGradient id="chart-gradient-line" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#a855f7" />
                                <stop offset="50%" stopColor="#ec4899" />
                                <stop offset="100%" stopColor="#3b82f6" />
                              </linearGradient>
                              <linearGradient id="chart-gradient-area" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            
                            {/* Grid Lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => (
                              <line 
                                key={idx} 
                                x1="40" 
                                y1={20 + val * 90} 
                                x2={width - 20} 
                                y2={20 + val * 90} 
                                className="mod-chart-gridline" 
                              />
                            ))}
                            
                            {/* Area & Line */}
                            {areaPath && <path d={areaPath} className="mod-chart-path-area" />}
                            {linePath && <path d={linePath} className="mod-chart-path-line" />}
                            
                             {/* Data points & labels */}
                             {points.map((p, idx) => {
                               const isActive = hoveredPoint?.label === p.label || pinnedPoint?.label === p.label;
                               return (
                                 <g key={idx}>
                                   {isActive && (
                                     <line 
                                       x1={p.x} 
                                       y1={p.y} 
                                       x2={p.x} 
                                       y2="110" 
                                       stroke="rgba(236, 72, 153, 0.45)" 
                                       strokeWidth="1.5" 
                                       strokeDasharray="3,3" 
                                       className="mod-chart-guideline-active"
                                     />
                                   )}
                                   {isActive && (
                                     <circle
                                       cx={p.x}
                                       cy={p.y}
                                       r="12"
                                       className="mod-chart-dot-pulse"
                                     />
                                   )}
                                   <circle 
                                     cx={p.x} 
                                     cy={p.y} 
                                     r={isActive ? "6" : "4"} 
                                     className={`mod-chart-dot ${isActive ? 'active' : ''}`} 
                                   />
                                   <circle 
                                     cx={p.x} 
                                     cy={p.y} 
                                     r="16" 
                                     fill="transparent" 
                                     style={{ cursor: 'pointer' }}
                                     onMouseEnter={() => {
                                       if (!pinnedPoint) {
                                         setHoveredPoint({
                                           xPct: (p.x / width) * 100,
                                           yPct: (p.y / height) * 100,
                                           label: p.label,
                                           count: p.count,
                                           items: p.items
                                         });
                                       }
                                     }}
                                     onMouseLeave={() => {
                                       if (!pinnedPoint) {
                                         setHoveredPoint(null);
                                       }
                                     }}
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       const pointData = {
                                         xPct: (p.x / width) * 100,
                                         yPct: (p.y / height) * 100,
                                         label: p.label,
                                         count: p.count,
                                         items: p.items
                                       };
                                       if (pinnedPoint?.label === p.label) {
                                         setPinnedPoint(null);
                                         setHoveredPoint(null);
                                       } else {
                                         setPinnedPoint(pointData);
                                         setHoveredPoint(pointData);
                                       }
                                     }}
                                   />
                                   {(p.count > 0 && (chartTimeframe === 'week' || isActive)) && (
                                     <text 
                                       x={p.x} 
                                       y={isActive ? p.y - 14 : p.y - 10} 
                                       textAnchor="middle" 
                                       className={`mod-chart-value-text ${isActive ? 'active' : ''}`} 
                                       fontSize={isActive ? "11" : "10"} 
                                       fontWeight="700"
                                     >
                                       {p.count}
                                     </text>
                                   )}
                                   {(chartTimeframe === 'week' || idx % 5 === 0 || idx === points.length - 1) && (
                                     <text 
                                       x={p.x} 
                                       y="130" 
                                       textAnchor="middle" 
                                       className={`mod-chart-axis-text ${isActive ? 'active' : ''}`}
                                     >
                                       {p.label.split(',')[0]}
                                     </text>
                                   )}
                                 </g>
                               );
                             })}
                          </svg>

                          {hoveredPoint && (
                            <div 
                              className="mod-chart-tooltip" 
                              style={{ 
                                position: 'absolute',
                                left: `${hoveredPoint.xPct}%`,
                                top: `${hoveredPoint.yPct}%`,
                                transform: 'translate(-50%, -100%)',
                                marginTop: '-12px',
                                zIndex: 10000
                              }}
                            >
                              <div className="tooltip-header">
                                <span className="tooltip-title">{hoveredPoint.label}</span>
                                <span className="tooltip-count">{hoveredPoint.count} items</span>
                                {pinnedPoint && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPinnedPoint(null);
                                      setHoveredPoint(null);
                                    }}
                                    className="tooltip-close-btn"
                                    title="Unpin"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--mod-text-muted)',
                                      cursor: 'pointer',
                                      fontSize: '16px',
                                      lineHeight: 1,
                                      padding: '0 4px',
                                      marginLeft: '8px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    &times;
                                  </button>
                                )}
                              </div>
                              <div className="tooltip-body">
                                {hoveredPoint.items && hoveredPoint.items.length > 0 ? (
                                  <ul className="tooltip-items-list">
                                    {hoveredPoint.items.slice(0, 3).map((item, idx) => (
                                      <li key={idx} className="tooltip-item-row">
                                        <span className="tooltip-bullet"></span>
                                        <div className="tooltip-item-details">
                                          <div className="tooltip-item-title">{item.title}</div>
                                          <div className="tooltip-item-meta">
                                            {item.queueType === 'author' ? 'New Story Upload' : `Chapter ${item.chapter}`}
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                    {hoveredPoint.items.length > 3 && (
                                      <li className="tooltip-item-more">
                                        and {hoveredPoint.items.length - 3} more...
                                      </li>
                                    )}
                                  </ul>
                                ) : (
                                  <div className="tooltip-empty">No submissions this day</div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Genre Breakdown Bar Chart */}
                <div className="mod-chart-card">
                  <div className="mod-chart-header">
                    <div>
                      <h3 className="mod-chart-title">Top Genres</h3>
                      <span className="mod-chart-subtitle">Comic distribution by registered category</span>
                    </div>
                  </div>
                  <div className="mod-genre-chart-list">
                    {(() => {
                      const counts = {};
                      comics.forEach(c => {
                        if (c.genres) {
                          c.genres.forEach(g => {
                            const name = typeof g === 'object' && g !== null ? g.name : g;
                            if (name) counts[name] = (counts[name] || 0) + 1;
                          });
                        }
                      });
                      const genreData = Object.entries(counts)
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 4);
                      
                      const maxVal = Math.max(...genreData.map(g => g.count), 1);
                      const colors = ['#a855f7', '#ec4899', '#3b82f6', '#10b981'];
                      
                       return genreData.map((g, idx) => {
                         const pct = (g.count / maxVal) * 100;
                         const themeColor = colors[idx % colors.length];
                         return (
                           <div 
                             key={idx} 
                             className="mod-genre-chart-item"
                           >
                             <div className="mod-genre-chart-label-row">
                               <span className="mod-genre-name" style={{ '--genre-theme': themeColor }}>{g.name}</span>
                               <span className="mod-genre-count">{g.count} titles</span>
                             </div>
                             <div className="mod-genre-bar-bg">
                               <div 
                                 className="mod-genre-bar-fill" 
                                 style={{ 
                                   width: `${pct}%`, 
                                   background: themeColor,
                                   '--genre-theme': themeColor
                                 }}
                               ></div>
                             </div>
                           </div>
                         );
                       });
                    })()}
                    {comics.length === 0 && (
                      <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--mod-text-muted)', margin: 0 }}>No genre stats available.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 1: Recent Submissions & Forum Reports */}
              <div className="mod-overview-row">
                <div className="mod-overview-col">
                  <div className="mod-overview-card">
                    <div className="mod-overview-card-header">
                      <h3 className="mod-overview-card-title">Recent Submissions</h3>
                      <span className="mod-overview-link" onClick={() => setActiveNav('review-queue')}>View all</span>
                    </div>
                    <div className="mod-submission-list">
                      {submissions.filter(s => s.status === 'pending').slice(0, 4).map(s => {
                        const isAuthor = s.queueType === 'author';
                        return (
                          <div key={s.id} className="mod-submission-item">
                            <div className="mod-sub-thumb">
                              {s.title.toLowerCase().includes('sword') ? '⚔️' : s.title.toLowerCase().includes('spirit') ? '🔮' : s.title.toLowerCase().includes('demon') ? '👑' : '📚'}
                            </div>
                            <div className="mod-sub-details">
                              <div className="mod-sub-title" title={s.title}>{s.title}</div>
                              <div className="mod-sub-meta">
                                {isAuthor ? 'New Comic Upload' : `Chapter ${s.chapter}`} · {s.submittedBy || 'Author'}
                              </div>
                            </div>
                            <span className={`priority-badge ${(s.priority || 'Medium').toLowerCase()}`}>
                              {s.priority || 'Medium'}
                            </span>
                          </div>
                        );
                      })}
                      {submissions.filter(s => s.status === 'pending').length === 0 && (
                        <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--mod-text-muted)', margin: 0 }}>No pending submissions.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mod-overview-col">
                  <div className="mod-overview-card">
                    <div className="mod-overview-card-header">
                      <h3 className="mod-overview-card-title">Forum Reports</h3>
                      <span className="mod-overview-link" onClick={() => setActiveNav('forum')}>View all</span>
                    </div>
                    <div className="mod-report-list">
                      {forumThreads.filter(t => t.isReported).slice(0, 3).map(t => {
                        const reason = t.reportReason || 'Violation of community guidelines';
                        const level = reason.toLowerCase().includes('hate') || reason.toLowerCase().includes('harassment') ? 'high' : reason.toLowerCase().includes('spoiler') ? 'low' : 'medium';
                        return (
                          <div key={t.id} className={`mod-report-item ${level}`}>
                            <h4 className="mod-report-title">{t.title}</h4>
                            <span className="mod-report-reason">{reason}</span>
                            <span className="mod-report-time">{formatTimeAgo(t.createdAt || t.timestamp)}</span>
                          </div>
                        );
                      })}
                      {forumThreads.filter(t => t.isReported).length === 0 && (
                        <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--mod-text-muted)', margin: 0 }}>No reported forum threads.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Project Teams & Top Performing Comics */}
              <div className="mod-overview-row">
                <div className="mod-overview-col">
                  <div className="mod-overview-card">
                    <div className="mod-overview-card-header">
                      <h3 className="mod-overview-card-title">Project Teams</h3>
                      <span className="mod-overview-link" onClick={() => setActiveNav('project-teams')}>Manage teams</span>
                    </div>
                    <div className="mod-team-cards-row">
                      {projectTeams.slice(0, 3).map(t => (
                        <div key={t.id} className="mod-team-dashboard-card">
                          <div className="mod-team-card-header">
                            <h4 className="mod-team-card-title" title={t.title}>{t.title}</h4>
                            <span className={`team-status-badge ${(t.status || 'Active').toLowerCase()}`}>{t.status || 'Active'}</span>
                          </div>
                          
                          <div className="team-progress-wrapper">
                            <div className="team-progress-label">
                              <span>Progress</span>
                              <span>{t.progress || 0}%</span>
                            </div>
                            <div className="team-progress-bar">
                              <div className="team-progress-fill" style={{ width: `${t.progress || 0}%` }}></div>
                            </div>
                          </div>

                          <div className="team-card-footer">
                            <span className="team-members-count">{t.membersCount || 1} members</span>
                            <div className="team-leader-info">
                              <span className="team-leader-avatar">
                                {t.leaderInitials || (t.leaderName ? t.leaderName[0] : 'U')}
                              </span>
                              <span>{t.leaderName || 'No leader'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {projectTeams.length === 0 && (
                        <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--mod-text-muted)', margin: 0 }}>No project teams available.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mod-overview-col">
                  <div className="mod-overview-card">
                    <div className="mod-overview-card-header">
                      <h3 className="mod-overview-card-title">Top Performing Comics</h3>
                      <span className="mod-overview-link" onClick={() => setActiveNav('comic-management')}>View all</span>
                    </div>
                    <div className="mod-rank-list">
                      {comics.slice().sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 4).map((c, idx) => {
                        const viewFormatted = c.viewCount >= 1000000 ? `${(c.viewCount / 1000000).toFixed(1)}M` : c.viewCount >= 1000 ? `${(c.viewCount / 1000).toFixed(1)}K` : c.viewCount || 0;
                        return (
                          <div key={c.id} className="mod-rank-item">
                            <div className="mod-rank-left">
                              <span className="mod-rank-number">#{idx + 1}</span>
                              <div className="mod-rank-details">
                                <div className="mod-rank-title" style={{ maxWidth: '240px' }} title={c.title}>{c.title}</div>
                                <div className="mod-rank-meta">
                                  {c.chapterCount || 0} chapters · {viewFormatted} views
                                </div>
                              </div>
                            </div>
                            <span className="mod-rank-rating">★ {c.ratingAverage ? c.ratingAverage.toFixed(1) : '0.0'}</span>
                          </div>
                        );
                      })}
                      {comics.length === 0 && (
                        <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--mod-text-muted)', margin: 0 }}>No comics available.</p>
                      )}
                    </div>
                  </div>
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
              handleApproveAndCreateProject={handleApproveAndCreateProject}
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
              fetchAllData={fetchComicsAndTeams}
            />
          )}

          {/* VIEW: GENRE MANAGEMENT */}
          {activeNav === 'genre-management' && (
            <GenreManagement comics={comics} />
          )}

          {/* VIEW: PROJECT TEAMS */}
          {activeNav === 'project-teams' && (
            <ProjectTeams 
              projectTeams={projectTeams}
              setProjectTeams={setProjectTeams}
              genres={genres}
              submissions={submissions}
              comics={comics
                .filter(c => !submissions.some(s => s.queueType === 'author' && s.status === 'pending' && s.title === c.title))
                .filter((value, index, self) => self.findIndex(t => t.title === value.title) === index)
                .filter(c => {
                  const currentUser = getAuth()?.user;
                  const modLangs = Array.isArray(currentUser?.assignedLanguages) && currentUser.assignedLanguages.length > 0
                    ? currentUser.assignedLanguages
                    : ['Japanese', 'Korean'];
                  return modLangs.includes('All') || modLangs.some(l => l.toLowerCase() === (c.language || 'Japanese').toLowerCase());
                })
              }
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
            <ChatMonitor fetchAllData={fetchChatFlagsData} />
          )}

          {/* VIEW: FORUM */}
          {activeNav === 'forum' && (
            <ForumModeration fetchAllData={fetchForumThreadsData} />
          )}
        </>
      )}
    </ModeratorLayout>
  )
}

export default ModeratorDashboard
