import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { getAdminStatisticsApi } from '../../services/api/AdminStatisticsApi'
import { AnimatedButton } from '../../components/common/AnimatedButton'
import { exportToCsv } from '../../utils/exportToCsv'
import { RefreshCw, Download } from 'lucide-react'

const EMPTY_ROLE_COUNTS = {
  READER: 0,
  AUTHOR: 0,
  TRANSLATOR: 0,
  PROJECT_LEADER: 0,
  MODERATOR: 0,
  ADMIN: 0
}

const EMPTY_COMIC_STATUS = {
  ONGOING: 0,
  COMPLETED: 0,
  HIATUS: 0,
  CANCEL: 0
}

const EMPTY_STATS = {
  totalUsers: 0,
  activeUsers: 0,
  bannedUsers: 0,
  totalComics: 0,
  totalGenres: 0,
  pendingSubmissions: 0,
  roleCounts: EMPTY_ROLE_COUNTS,
  comicStatusCounts: EMPTY_COMIC_STATUS,
  genresList: [],
  generatedAt: null,
  newComicsToday: 0,
  activeUsersToday: 0,
  onlineUsersNow: 0,
  newLikesToday: 0,
  newBookmarksToday: 0
}

function InteractiveDonutChart({ data, total }) {
  const [hoverIndex, setHoverIndex] = useState(null)

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent - Math.PI / 2)
    const y = Math.sin(2 * Math.PI * percent - Math.PI / 2)
    return [x, y]
  }

  let cumulativePercent = 0
  const slices = data.map((slice, index) => {
    if (slice.count === 0) return { ...slice, pathData: '', index }
    
    const slicePercent = slice.count / Math.max(1, total)
    const [startX, startY] = getCoordinatesForPercent(cumulativePercent)
    cumulativePercent += slicePercent
    
    let pathData
    if (slicePercent > 0.999) {
      pathData = `M 0 -1 A 1 1 0 1 1 0 1 A 1 1 0 1 1 0 -1 Z`
    } else {
      const [endX, endY] = getCoordinatesForPercent(cumulativePercent)
      const largeArcFlag = slicePercent > 0.5 ? 1 : 0
      pathData = [
        `M ${startX} ${startY}`,
        `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
        `L 0 0 Z`
      ].join(' ')
    }
    
    return { ...slice, pathData, index, slicePercent }
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap', padding: '10px 20px' }}>
      {/* Chart */}
      <div style={{ position: 'relative', width: '240px', height: '240px', flexShrink: 0, margin: '0 auto' }}>
        <svg viewBox="-1.2 -1.2 2.4 2.4" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.2))' }}>
          {slices.map((slice) => {
            if (!slice.pathData) return null
            const isHovered = hoverIndex === slice.index
            return (
              <path
                key={slice.name}
                d={slice.pathData}
                fill={slice.color}
                onMouseEnter={() => setHoverIndex(slice.index)}
                onMouseLeave={() => setHoverIndex(null)}
                style={{
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center',
                  transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  cursor: 'pointer',
                  filter: isHovered ? 'brightness(1.15)' : 'brightness(1)'
                }}
              />
            )
          })}
          {/* Inner circle for Donut effect */}
          <circle cx="0" cy="0" r="0.65" fill="var(--bg)" style={{ pointerEvents: 'none' }} />
        </svg>
        
        {/* Center Label */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', width: '100%' }}>
          {hoverIndex !== null ? (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {slices.find(s => s.index === hoverIndex)?.name}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: slices.find(s => s.index === hoverIndex)?.color, marginTop: '2px' }}>
                {slices.find(s => s.index === hoverIndex)?.count}
              </div>
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <div style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', fontWeight: '500' }}>Total</div>
              <div style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--text-h)' }}>{total}</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Interactive Legend */}
      <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {data.map((r, index) => {
          const pct = ((r.count / Math.max(1, total)) * 100).toFixed(1)
          const isHovered = hoverIndex === index
          return (
            <div 
              key={r.name} 
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                padding: '10px 14px', borderRadius: '8px',
                background: isHovered ? 'rgba(150,150,150,0.1)' : 'transparent',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                border: '1px solid transparent',
                borderColor: isHovered ? 'var(--border)' : 'transparent',
                transform: isHovered ? 'translateX(6px)' : 'translateX(0)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '14px', height: '14px', borderRadius: '50%', 
                  background: r.color, 
                  transform: isHovered ? 'scale(1.3)' : 'scale(1)', 
                  transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  boxShadow: isHovered ? `0 0 10px ${r.color}80` : 'none'
                }} />
                <span style={{ fontSize: '14px', fontWeight: isHovered ? '600' : '500', color: isHovered ? 'var(--text-h)' : 'var(--admin-text-secondary)' }}>
                  {r.name}
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-h)' }}>
                {r.count} <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)', fontWeight: '400', marginLeft: '4px' }}>({r.count === 0 ? '0' : pct}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function InteractiveHalfDonutChart({ data, total }) {
  const [hoverIndex, setHoverIndex] = useState(null)

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(Math.PI - percent * Math.PI)
    const y = -Math.sin(Math.PI - percent * Math.PI)
    return [x, y]
  }

  let cumulativePercent = 0
  const slices = data.map((slice, index) => {
    if (slice.count === 0) return { ...slice, pathData: '', index, pct: 0 }
    
    const slicePercent = slice.count / Math.max(1, total)
    const [startX, startY] = getCoordinatesForPercent(cumulativePercent)
    cumulativePercent += slicePercent
    const [endX, endY] = getCoordinatesForPercent(cumulativePercent)
    
    const pathData = [
      `M ${startX} ${startY}`,
      `A 1 1 0 0 1 ${endX} ${endY}`,
      `L 0 0 Z`
    ].join(' ')
    
    return { ...slice, pathData, index, pct: (slicePercent * 100).toFixed(1) }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '10px 0' }}>
      <div style={{ position: 'relative', width: '280px', height: '140px', overflow: 'visible', marginTop: '10px' }}>
        <svg viewBox="-1.1 -1.1 2.2 1.1" style={{ width: '100%', height: '100%', overflow: 'visible', filter: 'drop-shadow(0px -4px 10px rgba(0,0,0,0.1))' }}>
          <path d="M -1 0 A 1 1 0 0 1 1 0 L 0 0 Z" fill="rgba(150,150,150,0.05)" />
          {slices.map((slice) => {
            if (!slice.pathData) return null
            const isHovered = hoverIndex === slice.index
            return (
              <path
                key={slice.name}
                d={slice.pathData}
                fill={slice.color}
                onMouseEnter={() => setHoverIndex(slice.index)}
                onMouseLeave={() => setHoverIndex(null)}
                style={{
                  transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: '0 0',
                  transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  cursor: 'pointer',
                  filter: isHovered ? 'brightness(1.15)' : 'brightness(1)'
                }}
              />
            )
          })}
          {/* Inner cutout (half circle so it doesn't overflow downwards) */}
          <path d="M -0.65 0 A 0.65 0.65 0 0 1 0.65 0 Z" fill="var(--bg)" style={{ pointerEvents: 'none' }} />
        </svg>
        
        <div style={{ position: 'absolute', bottom: '0', left: '50%', transform: 'translate(-50%, 0)', textAlign: 'center', pointerEvents: 'none', width: '100%' }}>
          {hoverIndex !== null ? (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {slices.find(s => s.index === hoverIndex)?.name}
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: slices.find(s => s.index === hoverIndex)?.color, marginTop: '2px', lineHeight: 1 }}>
                {slices.find(s => s.index === hoverIndex)?.count}
              </div>
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <div style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', fontWeight: '500' }}>Total Catalog</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text-h)', marginTop: '2px', lineHeight: 1 }}>{total}</div>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '24px' }}>
        {data.map((r, index) => {
          const pct = ((r.count / Math.max(1, total)) * 100).toFixed(1)
          const isHovered = hoverIndex === index
          return (
            <div 
              key={r.name} 
              onMouseEnter={() => setHoverIndex(index)}
              onMouseLeave={() => setHoverIndex(null)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px', borderRadius: '20px',
                background: isHovered ? 'var(--admin-hover)' : 'rgba(150,150,150,0.05)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: isHovered ? r.color + '50' : 'transparent',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: isHovered ? `0 4px 12px ${r.color}20` : 'none'
              }}
            >
              <div style={{ 
                width: '12px', height: '12px', borderRadius: '50%', 
                background: r.color, 
                boxShadow: isHovered ? `0 0 8px ${r.color}80` : 'none'
              }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: isHovered ? 'var(--text-h)' : 'var(--admin-text-secondary)' }}>
                  {r.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>
                  {r.count} ({pct}%)
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatIcon({ type }) {
  const props = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (type) {
    case 'users': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
    case 'book': return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    case 'genres': return <svg {...props}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    case 'activity': return <svg {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    case 'roles': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/><path d="M9 11a4 4 0 0 0-4 4v2"/></svg>
    case 'revenue': return <svg {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    case 'banned': return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
    case 'report': return <svg {...props}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    case 'heart': return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    case 'star': return <svg {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    default: return null
  }
}

function StatisticsDashboard() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [statsData, setStatsData] = useState(EMPTY_STATS)

  const fetchStatistics = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const result = await getAdminStatisticsApi()

      const roles = { ...EMPTY_ROLE_COUNTS, ...(result?.roleCounts || {}) }
      const comicStatuses = { ...EMPTY_COMIC_STATUS, ...(result?.comicStatusCounts || {}) }

      setStatsData({
        totalUsers: Number(result?.totalUsers) || 0,
        activeUsers: Number(result?.activeUsers) || 0,
        bannedUsers: Number(result?.bannedUsers) || 0,
        totalComics: Number(result?.totalPublishedComics) || 0,
        totalGenres: Number(result?.totalGenres) || 0,
        pendingSubmissions: Number(result?.pendingSubmissions) || 0,
        roleCounts: roles,
        comicStatusCounts: comicStatuses,
        genresList: Array.isArray(result?.genres) ? result.genres : [],
        generatedAt: result?.generatedAt || null,
        newUsersToday: Number(result?.newUsersToday) || 0,
        newComicsToday: Number(result?.newComicsToday) || 0,
        activeUsersToday: Number(result?.activeUsersToday) || 0,
        onlineUsersNow: Number(result?.onlineUsersNow) || 0,
        newLikesToday: Number(result?.newLikesToday) || 0,
        newBookmarksToday: Number(result?.newBookmarksToday) || 0,
        topAuthors: Array.isArray(result?.topAuthors) ? result.topAuthors : []
      })
    } catch (err) {
      console.error('Failed to load system statistics from API:', err)
      setLoadError(err?.response?.data?.message || err?.message || 'System statistics are unavailable.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  const statCards = [
    { label: 'Active User Accounts', value: statsData.activeUsers, change: 'Verified status', trend: 'up', icon: 'activity', color: 'green' },
    { label: 'Authors', value: statsData.roleCounts.AUTHOR, change: 'Original creators', trend: 'up', icon: 'roles', color: 'orange' },
    { label: 'Translators', value: statsData.roleCounts.TRANSLATOR, change: 'Localization', trend: 'up', icon: 'roles', color: 'cyan' },
    { label: 'Project Leaders', value: statsData.roleCounts.PROJECT_LEADER, change: 'Team managers', trend: 'up', icon: 'roles', color: 'purple' },
    { label: 'Moderators', value: statsData.roleCounts.MODERATOR, change: 'Content reviewers', trend: 'up', icon: 'roles', color: 'blue' },
    { label: 'Banned Accounts', value: statsData.bannedUsers, change: 'Restricted users', trend: 'neutral', icon: 'banned', color: 'red' },
    { label: 'New Bookmarks Today', value: statsData.newBookmarksToday, change: 'Library additions', trend: 'up', icon: 'star', color: 'green' },
    { label: 'New Likes Today', value: statsData.newLikesToday, change: 'Comic interactions', trend: 'up', icon: 'heart', color: 'pink' }
  ]

  const totalRoleSum = Math.max(1, Object.values(statsData.roleCounts).reduce((a, b) => a + b, 0))

  const handleExport = () => {
    const headers = ['Metric / Category', 'Value', 'Details']
    const rows = [
      ['Total Registered Users', statsData.totalUsers, 'Active in system'],
      ['Active Accounts', statsData.activeUsers, 'Verified status'],
      ['Banned Accounts', statsData.bannedUsers, 'Restricted status'],
      ['Total Comics Catalog', statsData.totalComics, 'Published listings'],
      ['Content Genres Count', statsData.totalGenres, 'Configured categories'],
      ['Pending Submissions', statsData.pendingSubmissions, 'Awaiting review'],
      ['Reader Accounts', statsData.roleCounts.READER, 'Role: READER'],
      ['Translator Accounts', statsData.roleCounts.TRANSLATOR, 'Role: TRANSLATOR'],
      ['Author Accounts', statsData.roleCounts.AUTHOR, 'Role: AUTHOR'],
      ['Project Leader Accounts', statsData.roleCounts.PROJECT_LEADER, 'Role: PROJECT_LEADER'],
      ['Moderator Accounts', statsData.roleCounts.MODERATOR, 'Role: MODERATOR'],
      ['Admin Accounts', statsData.roleCounts.ADMIN, 'Role: ADMIN']
    ]
    exportToCsv('ComiVerse_System_Statistics_Report', headers, rows)
  }

  return (
    <AdminLayout activeNav="statistics">
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1>Statistics Dashboard</h1>
          <p>Current platform overview from verified database aggregates</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button type="button" className="admin-btn" style={{ display: 'inline-flex', height: '40px', alignItems: 'center', justifyContent: 'center', gap: '7px', whiteSpace: 'nowrap' }} onClick={fetchStatistics} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button type="button" className="admin-btn admin-btn--primary" style={{ display: 'inline-flex', height: '40px', alignItems: 'center', justifyContent: 'center', gap: '7px', whiteSpace: 'nowrap' }} onClick={handleExport} disabled={loading || !statsData}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="stats-dashboard-loading" data-testid="statistics-skeleton" aria-label="Loading system statistics">
          <div className="stats-dashboard-loading-grid">
            {Array.from({ length: 8 }, (_, index) => <div key={index} className="stats-dashboard-loading-block" />)}
          </div>
          <div className="stats-dashboard-loading-panel" />
        </div>
      ) : loadError ? (
        <section className="stats-dashboard-error" role="alert">
          <StatIcon type="report" />
          <div>
            <h2>System statistics are unavailable</h2>
            <p>{loadError}</p>
          </div>
          <button type="button" className="admin-btn admin-btn--primary" onClick={fetchStatistics}>Try again</button>
        </section>
      ) : (
        <>
          {/* ── Stat Cards Grid ─────────────────────── */}
          <div className="stats-cards-grid">
            {statCards.map((card, i) => (
              <div key={i} className={`stats-card stats-card--${card.color}`}>
                <div className="stats-card-top">
                  <span className="stats-card-label">{card.label}</span>
                  <span className={`stats-card-icon stats-card-icon--${card.color}`}>
                    <StatIcon type={card.icon} />
                  </span>
                </div>
                <div className="stats-card-value">{card.value.toLocaleString('en-US')}</div>
                <div className={`stats-card-change stats-card-change--${card.trend}`}>
                  {card.change}
                </div>
              </div>
            ))}
          </div>

          {/* ── User Role Distribution & Top Authors ───────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '24px' }}>
            <div className="stats-chart-card" style={{ margin: 0 }}>
              <div className="stats-chart-header">
                <div>
                  <h2 className="stats-chart-title">User Base & Role Distribution</h2>
                  <p className="stats-chart-subtitle">Live proportion of platform user roles</p>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <InteractiveDonutChart 
                  total={totalRoleSum}
                  data={[
                    { name: 'Readers', count: statsData.roleCounts.READER, color: '#a855f7' },
                    { name: 'Translators', count: statsData.roleCounts.TRANSLATOR, color: '#3b82f6' },
                    { name: 'Authors', count: statsData.roleCounts.AUTHOR, color: '#ec4899' },
                    { name: 'Project Leaders', count: statsData.roleCounts.PROJECT_LEADER, color: '#14b8a6' },
                    { name: 'Moderators', count: statsData.roleCounts.MODERATOR, color: '#f97316' }
                  ]} 
                />
              </div>
            </div>

            {/* Top Contributing Authors */}
            <div className="stats-chart-card" style={{ margin: 0 }}>
              <div className="stats-chart-header">
                <div>
                  <h2 className="stats-chart-title">Top Contributing Authors</h2>
                  <p className="stats-chart-subtitle">Authors with the most published comics</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {statsData.topAuthors && statsData.topAuthors.length > 0 ? (
                  statsData.topAuthors.slice(0, 5).map((author, index) => (
                    <div key={author.authorId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: index < Math.min(statsData.topAuthors.length, 5) - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(150,150,150,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold', color: index < 3 ? 'var(--admin-primary)' : 'var(--admin-text-secondary)' }}>
                          #{index + 1}
                        </div>
                        <img src={author.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(author.fullName) + '&background=random'} alt="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>{author.fullName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-h)' }}>{author.publishedComicsCount}</span>
                        <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>comics</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
                    No published authors found.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Bottom Row: Daily & Live Activity ── */}
          <div className="stats-bottom-row" style={{ marginTop: '24px' }}>
            {/* Today's Activity */}
            <div className="stats-chart-card stats-chart-card--wide">
              <div className="stats-chart-header">
                <div>
                  <h2 className="stats-chart-title">Today's Activity</h2>
                  <p className="stats-chart-subtitle">Real-time engagement metrics for today</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--admin-text-secondary)', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                  <span>New users registered today:</span>
                  <span style={{ color: 'var(--text-h)', fontWeight: '600', fontSize: '15px' }}>{statsData.newUsersToday.toLocaleString('en-US')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--admin-text-secondary)', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
                  <span>New comics published today:</span>
                  <span style={{ color: 'var(--text-h)', fontWeight: '600', fontSize: '15px' }}>{statsData.newComicsToday.toLocaleString('en-US')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                  <span>Total users active today:</span>
                  <span style={{ color: 'var(--text-h)', fontWeight: '600', fontSize: '15px' }}>{statsData.activeUsersToday.toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>

            {/* Live Traffic Status */}
            <div className="stats-chart-card stats-chart-card--narrow">
              <div className="stats-chart-header">
                <div>
                  <h2 className="stats-chart-title">Live Traffic</h2>
                  <p className="stats-chart-subtitle">Currently active sessions</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--admin-green)', lineHeight: 1 }}>
                  {statsData.onlineUsersNow.toLocaleString('en-US')}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--admin-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--admin-green)', animation: 'pulse 2s infinite' }} />
                  Users online now
                </div>
                {statsData.generatedAt && (
                  <div style={{ marginTop: 'auto', paddingTop: '20px', width: '100%', display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '11px', color: 'var(--admin-text-muted)', borderTop: '1px solid var(--border)' }}>
                    <span>Last refreshed:</span>
                    <span>{new Date(statsData.generatedAt).toLocaleString('en-US')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}

export default StatisticsDashboard
