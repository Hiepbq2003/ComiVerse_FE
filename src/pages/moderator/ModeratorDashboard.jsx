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
import { getAllAuditLogsApi } from '../../services/api/AuditLogApi'
import { toast } from 'react-toastify'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import ModernButton from '../../components/common/ModernButton'


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
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [auditSearch, setAuditSearch] = useState('')
  const [auditTypeFilter, setAuditTypeFilter] = useState('All')
  const [auditLogs, setAuditLogs] = useState([])
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('All')
  const [auditTimeFilter, setAuditTimeFilter] = useState('All')
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

  const fetchAuditLogsData = async () => {
    try {
      const data = await getAllAuditLogsApi()
      setAuditLogs(data || [])
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    }
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [comicsData, teamsData, submissionsData, genresData, forumData, chatData, auditData] = await Promise.all([
        getAllComicsApi(),
        getAllProjectTeamsApi(),
        getAllSubmissionsApi(),
        getAllGenresApi(),
        getAllForumThreadsApi(),
        getAllChatFlagsApi(),
        getAllAuditLogsApi()
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
      setSubmissions(submissionsData || [])
      setGenres(genresData?.data || genresData || [])
      setForumThreads(forumData || [])
      setChatFlags(chatData || [])
      setAuditLogs(auditData || [])
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
      'chat-monitor': chatFlags.length,
      'forum': forumThreads.filter(item => item.isReported).length,
    }
  }

  // API Call Integration Handlers
  const handleApprove = async (id) => {
    try {
      await approveSubmissionApi(id)
      toast.success('Submission approved!')
      setSubmissions(prev => prev.filter(item => item.id !== id))
      fetchComicsAndTeams()
      fetchAuditLogsData()
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
      fetchAuditLogsData()
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
      fetchAuditLogsData()
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
        fetchAuditLogsData()
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
                    <span className="mod-sec-value">{comics.filter(c => c.status?.toUpperCase() === 'ONGOING').length}</span>
                    <span className="mod-sec-title">Ongoing</span>
                  </div>
                </div>

                <div className="mod-sec-card">
                  <span className="mod-sec-icon-circle">🏁</span>
                  <div className="mod-sec-details">
                    <span className="mod-sec-value">{comics.filter(c => c.status?.toUpperCase() === 'COMPLETED').length}</span>
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
                  <div className="mod-chart-header">
                    <div>
                      <h3 className="mod-chart-title">Submission Activity</h3>
                      <span className="mod-chart-subtitle">Daily chapter uploads volume over the last 7 days</span>
                    </div>
                  </div>
                  <div className="mod-chart-svg-container">
                    {(() => {
                      const trend = (() => {
                        const days = [];
                        const counts = [];
                        const details = [];
                        for (let i = 6; i >= 0; i--) {
                          const d = new Date();
                          d.setDate(d.getDate() - i);
                          const dateStr = d.toDateString();
                          
                          // Get matching submissions
                          const items = submissions.filter(s => {
                            if (!s.timestamp) return false;
                            return new Date(s.timestamp).toDateString() === dateStr;
                          });
                          
                          const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                          days.push(label);
                          counts.push(items.length);
                          details.push(items);
                        }
                        return { days, counts, details };
                      })();
                      
                      const width = 580;
                      const height = 140;
                      const maxVal = Math.max(...trend.counts, 4);
                      const points = trend.counts.map((c, i) => {
                        const x = 50 + i * (width - 70) / 6;
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
                                   <text 
                                     x={p.x} 
                                     y={isActive ? p.y - 14 : p.y - 10} 
                                     textAnchor="middle" 
                                     className={`mod-chart-value-text ${isActive ? 'active' : ''}`} 
                                     fontSize={isActive ? "11" : "10"} 
                                     fontWeight="700"
                                   >
                                     {p.count || ''}
                                   </text>
                                   <text 
                                     x={p.x} 
                                     y="130" 
                                     textAnchor="middle" 
                                     className={`mod-chart-axis-text ${isActive ? 'active' : ''}`}
                                   >
                                     {p.label.split(',')[0]}
                                   </text>
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

              {/* Row 3: Recent Activity / Audit Log */}
              <div className="mod-overview-card" style={{ width: '100%', marginTop: '24px' }}>
                <div className="mod-overview-card-header">
                  <h3 className="mod-overview-card-title">Recent Activity</h3>
                  <span className="mod-overview-link" onClick={() => setShowAuditModal(true)}>View all activity</span>
                </div>
                <div className="mod-activity-list">
                  {auditLogs.slice(0, 5).map(log => {
                    const isReject = log.description.toLowerCase().includes('reject') || log.description.toLowerCase().includes('remove') || log.description.toLowerCase().includes('delete') || log.description.toLowerCase().includes('ban') || log.description.toLowerCase().includes('warn');
                    const icon = isReject ? '🔴' : '🟢';
                    const badgeText = log.actionType.replace('_', ' ');
                    const badgeStyle = getCategoryStyle(log.actionType);
                    return (
                      <div key={log.id} className="mod-activity-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                        <div className="mod-activity-content" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span>{icon}</span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'var(--mod-text-primary)', fontWeight: '500' }}>
                              {renderDescription(log.description)}
                            </span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px', fontSize: '11px', color: 'var(--mod-text-secondary)' }}>
                              <span style={{ 
                                textTransform: 'uppercase', 
                                padding: '1px 5px', 
                                fontSize: '8px', 
                                fontWeight: '600',
                                borderRadius: '3px',
                                ...badgeStyle
                              }}>{badgeText}</span>
                              <span>•</span>
                              <span>Auditor: <strong style={{ color: 'var(--mod-purple)' }}>{log.actorName}</strong></span>
                            </div>
                          </div>
                        </div>
                        <span className="mod-activity-time" style={{ fontSize: '11px', color: 'var(--mod-text-muted)', marginLeft: '12px', whiteSpace: 'nowrap' }}>
                          {formatTimeAgo(log.createdAt)}
                        </span>
                      </div>
                    );
                  })}
                  {auditLogs.length === 0 && (
                    <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--mod-text-muted)', margin: 0 }}>No activity records available.</p>
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
              comics={comics
                .filter(c => !submissions.some(s => s.queueType === 'author' && s.status === 'pending' && s.title === c.title))
                .filter((value, index, self) => self.findIndex(t => t.title === value.title) === index)
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

          {/* Action Audit Log Modal (at root level to prevent stacking context scroll issues) */}
          {showAuditModal && (
            <div className="mod-modal-overlay" onClick={(event) => event.stopPropagation()}>
              <div className="mod-modal-card wide" style={{ width: '95%', maxWidth: '1150px' }} onClick={e => e.stopPropagation()}>
                <div className="mod-modal-header">
                  <h3>Action Audit Log</h3>
                  <button className="mod-modal-close-btn" onClick={() => setShowAuditModal(false)}>×</button>
                </div>
                <div className="mod-modal-body">
                  {/* Filter Row */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      placeholder="Search by description, action type, or auditor name..."
                      value={auditSearch}
                      onChange={e => setAuditSearch(e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--mod-text-primary)',
                        outline: 'none',
                      }}
                    />
                    <select
                      value={auditCategoryFilter}
                      onChange={e => setAuditCategoryFilter(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--mod-text-primary)',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="All" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>All Categories</option>
                      <option value="REVIEW_QUEUE" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>Review Queue</option>
                      <option value="PROJECT_TEAMS" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>Project Teams</option>
                      <option value="COMIC_MANAGEMENT" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>Comic Management</option>
                      <option value="CHAT_MODERATION" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>Chat Monitor</option>
                      <option value="FORUM_MODERATION" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>Forum Moderation</option>
                    </select>
                    <select
                      value={auditTypeFilter}
                      onChange={e => setAuditTypeFilter(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--mod-text-primary)',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="All" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>All Actions</option>
                      <option value="Approved" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>Approved / Resolved</option>
                      <option value="Rejected" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>Rejected / Removed / Warned</option>
                    </select>
                    <select
                      value={auditTimeFilter}
                      onChange={e => setAuditTimeFilter(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--mod-text-primary)',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="All" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>All Time</option>
                      <option value="Today" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>Today</option>
                      <option value="Week" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>Last 7 Days</option>
                      <option value="Month" style={{ background: 'var(--mod-bg)', color: 'var(--mod-text-primary)' }}>Last 30 Days</option>
                    </select>
                  </div>

                  {/* Scrollable list */}
                  <div className="mod-activity-list" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                    {(() => {
                      const filteredLogs = auditLogs
                        .filter(log => auditCategoryFilter === 'All' || log.actionType === auditCategoryFilter)
                        .filter(log => {
                          if (auditTypeFilter === 'All') return true;
                          const descLower = log.description.toLowerCase();
                          const isReject = descLower.includes('reject') || descLower.includes('remove') || descLower.includes('delete') || descLower.includes('ban') || descLower.includes('warn');
                          return auditTypeFilter === 'Rejected' ? isReject : !isReject;
                        })
                        .filter(log => {
                          if (auditTimeFilter === 'All') return true;
                          const logDate = new Date(log.createdAt);
                          const now = new Date();
                          if (auditTimeFilter === 'Today') {
                            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                            return logDate >= oneDayAgo;
                          }
                          if (auditTimeFilter === 'Week') {
                            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                            return logDate >= sevenDaysAgo;
                          }
                          if (auditTimeFilter === 'Month') {
                            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                            return logDate >= thirtyDaysAgo;
                          }
                          return true;
                        })
                        .filter(log => {
                          if (!auditSearch.trim()) return true;
                          const query = auditSearch.toLowerCase();
                          return (
                            (log.description || '').toLowerCase().includes(query) ||
                            (log.actorName || '').toLowerCase().includes(query) ||
                            (log.actionType || '').toLowerCase().includes(query)
                          );
                        });

                      if (filteredLogs.length === 0) {
                        return (
                          <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--mod-text-muted)', textAlign: 'center', padding: '24px' }}>
                            No activity records found matching filters.
                          </p>
                        );
                      }

                      return filteredLogs.map(log => {
                        const descLower = log.description.toLowerCase();
                        const isReject = descLower.includes('reject') || descLower.includes('remove') || descLower.includes('delete') || descLower.includes('ban') || descLower.includes('warn');
                        const icon = isReject ? '🔴' : '🟢';
                        const badgeText = log.actionType.replace('_', ' ');
                        const badgeStyle = getCategoryStyle(log.actionType);
                        
                        const relativeTime = formatTimeAgo(log.createdAt);
                        const absoluteTime = new Date(log.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        });

                        return (
                          <div key={log.id} className="mod-activity-item" style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', marginBottom: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '16px' }}>{icon}</span>
                                <div>
                                  <span style={{ fontWeight: '500', color: 'var(--mod-text-primary)' }}>
                                    {renderDescription(log.description)}
                                  </span>
                                  <div style={{ fontSize: '12px', color: 'var(--mod-text-secondary)', marginTop: '6px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ 
                                      margin: 0, 
                                      textTransform: 'uppercase', 
                                      padding: '2px 8px', 
                                      fontSize: '9px', 
                                      fontWeight: '600',
                                      borderRadius: '4px',
                                      ...badgeStyle
                                    }}>{badgeText}</span>
                                    <span>•</span>
                                    <span>Auditor: <strong style={{ color: 'var(--mod-purple)' }}>{log.actorName}</strong></span>
                                  </div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--mod-text-primary)' }}>{relativeTime}</span>
                                <span style={{ fontSize: '10px', color: 'var(--mod-text-muted)' }}>{absoluteTime}</span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                <div className="mod-modal-footer">
                  <ModernButton variant={2} label="Close" onClick={() => setShowAuditModal(false)} className="btn-cancel" />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </ModeratorLayout>
  )
}

export default ModeratorDashboard
