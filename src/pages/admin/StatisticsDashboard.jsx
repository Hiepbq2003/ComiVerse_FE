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

const EMPTY_STATS = {
  totalUsers: 0,
  activeUsers: 0,
  bannedUsers: 0,
  totalComics: 0,
  totalGenres: 0,
  pendingSubmissions: 0,
  roleCounts: EMPTY_ROLE_COUNTS,
  genresList: [],
  generatedAt: null,
  newUsersToday: 0,
  newComicsToday: 0,
  activeUsersToday: 0,
  onlineUsersNow: 0
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

      setStatsData({
        totalUsers: Number(result?.totalUsers) || 0,
        activeUsers: Number(result?.activeUsers) || 0,
        bannedUsers: Number(result?.bannedUsers) || 0,
        totalComics: Number(result?.totalPublishedComics) || 0,
        totalGenres: Number(result?.totalGenres) || 0,
        pendingSubmissions: Number(result?.pendingSubmissions) || 0,
        roleCounts: { ...EMPTY_ROLE_COUNTS, ...(result?.roleCounts || {}) },
        genresList: Array.isArray(result?.genres) ? result.genres : [],
        generatedAt: result?.generatedAt || null,
        newUsersToday: Number(result?.newUsersToday) || 0,
        newComicsToday: Number(result?.newComicsToday) || 0,
        activeUsersToday: Number(result?.activeUsersToday) || 0,
        onlineUsersNow: Number(result?.onlineUsersNow) || 0
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
    { label: 'Total Registered Users', value: statsData.totalUsers, change: 'Active in system', trend: 'up', icon: 'users', color: 'purple' },
    { label: 'Active User Accounts', value: statsData.activeUsers, change: 'Verified status', trend: 'up', icon: 'activity', color: 'green' },
    { label: 'Total Published Comics', value: statsData.totalComics, change: 'Catalog listings', trend: 'up', icon: 'book', color: 'pink' },
    { label: 'Content Categories', value: statsData.totalGenres, change: 'Genre classifications', trend: 'up', icon: 'genres', color: 'cyan' },
    { label: 'Authors', value: statsData.roleCounts.AUTHOR, change: 'Original creators', trend: 'up', icon: 'roles', color: 'orange' },
    { label: 'Translators', value: statsData.roleCounts.TRANSLATOR, change: 'Localization', trend: 'up', icon: 'roles', color: 'cyan' },
    { label: 'Project Leaders', value: statsData.roleCounts.PROJECT_LEADER, change: 'Team managers', trend: 'up', icon: 'roles', color: 'purple' },
    { label: 'Moderators', value: statsData.roleCounts.MODERATOR, change: 'Content reviewers', trend: 'up', icon: 'roles', color: 'blue' },
    { label: 'System Admins', value: statsData.roleCounts.ADMIN, change: 'System officers', trend: 'up', icon: 'revenue', color: 'red' },
    { label: 'Pending Review Submissions', value: statsData.pendingSubmissions, change: 'Awaiting moderation', trend: 'warning', icon: 'report', color: 'orange' },
    { label: 'Banned Accounts', value: statsData.bannedUsers, change: 'Restricted users', trend: 'neutral', icon: 'banned', color: 'red' }
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

          {/* ── User Role Distribution Breakdown ───────────── */}
          <div className="stats-chart-card">
            <div className="stats-chart-header">
              <div>
                <h2 className="stats-chart-title">User Base & Role Distribution</h2>
                <p className="stats-chart-subtitle">Live proportion of platform user roles</p>
              </div>
            </div>
            <div className="stats-genres-list" style={{ marginTop: '16px' }}>
              {[
                { name: 'Readers', count: statsData.roleCounts.READER, color: '#a855f7' },
                { name: 'Translators', count: statsData.roleCounts.TRANSLATOR, color: '#3b82f6' },
                { name: 'Authors', count: statsData.roleCounts.AUTHOR, color: '#ec4899' },
                { name: 'Project Leaders', count: statsData.roleCounts.PROJECT_LEADER, color: '#14b8a6' },
                { name: 'Moderators', count: statsData.roleCounts.MODERATOR, color: '#f97316' },
                { name: 'Admins', count: statsData.roleCounts.ADMIN, color: '#10b981' }
              ].map((r) => {
                const pct = ((r.count / totalRoleSum) * 100).toFixed(1)
                return (
                  <div key={r.name} className="stats-genre-row">
                    <div className="stats-genre-info">
                      <span className="stats-genre-name">{r.name}</span>
                      <span className="stats-genre-count">{r.count} account{r.count !== 1 ? 's' : ''} ({pct}%)</span>
                    </div>
                    <div className="stats-genre-bar-track">
                      <div
                        className="stats-genre-bar-fill"
                        style={{ width: `${Math.max(4, pct)}%`, background: r.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Bottom Row: Daily & Live Activity ── */}
          <div className="stats-bottom-row">
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
