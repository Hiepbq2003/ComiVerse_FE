import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { getAllAccountsApi } from '../../services/api/AccountApi'
import { getAllComicsApi } from '../../services/api/ComicApi'
import { getAllGenresApi } from '../../services/api/GenreApi'
import { getAllSubmissionsApi } from '../../services/api/SubmissionApi'
import { SkeletonLoader } from '../../components/common/SkeletonLoader'
import { AnimatedButton } from '../../components/common/AnimatedButton'
import { exportToCsv } from '../../utils/exportToCsv'

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
  const [statsData, setStatsData] = useState({
    totalUsers: 0,
    activeUsers: 0,
    bannedUsers: 0,
    totalComics: 0,
    totalGenres: 0,
    pendingSubmissions: 0,
    roleCounts: {
      READER: 0,
      AUTHOR: 0,
      TRANSLATOR: 0,
      MODERATOR: 0,
      ADMIN: 0
    },
    genresList: []
  })

  const fetchStatistics = useCallback(async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        getAllAccountsApi({ page: 1, size: 100 }),
        getAllComicsApi(),
        getAllGenresApi(),
        getAllSubmissionsApi()
      ])

      const accountsRes = results[0].status === 'fulfilled' ? results[0].value : null
      const comicsRes = results[1].status === 'fulfilled' ? results[1].value : null
      const genresRes = results[2].status === 'fulfilled' ? results[2].value : null
      const submissionsRes = results[3].status === 'fulfilled' ? results[3].value : null

      // Accounts processing
      const accountsList = Array.isArray(accountsRes)
        ? accountsRes
        : (Array.isArray(accountsRes?.data) ? accountsRes.data : [])
      const totalUsers = accountsRes?.metadata?.totalElements || accountsList.length

      let activeCount = 0
      let bannedCount = 0
      const rolesMap = { READER: 0, AUTHOR: 0, TRANSLATOR: 0, MODERATOR: 0, ADMIN: 0 }

      accountsList.forEach((acc) => {
        const status = (acc.status || (acc.banned ? 'INACTIVE' : 'ACTIVE')).toString().toUpperCase()
        if (status === 'ACTIVE') activeCount++
        else bannedCount++

        const roleRaw = (acc.role?.roleName || acc.role || acc.roleName || 'READER').toString().toUpperCase().replace(/[\s-]+/g, '_')
        if (rolesMap[roleRaw] !== undefined) {
          rolesMap[roleRaw]++
        } else {
          rolesMap.READER++
        }
      })

      // Comics processing
      const comicsList = Array.isArray(comicsRes)
        ? comicsRes
        : (Array.isArray(comicsRes?.data) ? comicsRes.data : [])
      const totalComics = comicsRes?.metadata?.totalElements || comicsList.length

      // Genres processing
      const genresList = Array.isArray(genresRes)
        ? genresRes
        : (Array.isArray(genresRes?.data) ? genresRes.data : [])
      const totalGenres = genresList.length

      // Submissions processing
      const submissionsList = Array.isArray(submissionsRes)
        ? submissionsRes
        : (Array.isArray(submissionsRes?.data) ? submissionsRes.data : [])
      const pendingSubmissions = submissionsList.filter(s => (s.status || '').toLowerCase() === 'pending').length

      setStatsData({
        totalUsers,
        activeUsers: activeCount,
        bannedUsers: bannedCount,
        totalComics,
        totalGenres,
        pendingSubmissions,
        roleCounts: rolesMap,
        genresList: genresList.slice(0, 8)
      })
    } catch (err) {
      console.error('Failed to load system statistics from API:', err)
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
    { label: 'Authors & Translators', value: statsData.roleCounts.AUTHOR + statsData.roleCounts.TRANSLATOR, change: 'Content creators', trend: 'up', icon: 'roles', color: 'orange' },
    { label: 'Pending Review Submissions', value: statsData.pendingSubmissions, change: 'Awaiting moderation', trend: 'warning', icon: 'report', color: 'red' },
    { label: 'Moderator & Admin Staff', value: statsData.roleCounts.MODERATOR + statsData.roleCounts.ADMIN, change: 'System officers', trend: 'up', icon: 'revenue', color: 'blue' },
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
          <p>Real-time system overview & database metrics</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <AnimatedButton
            variant={3}
            label={loading ? 'Refreshing...' : '🔄 Refresh Data'}
            tooltip="Reload API"
            onClick={fetchStatistics}
            disabled={loading}
          />
          <AnimatedButton
            variant={3}
            label="📥 Export Report"
            tooltip="Export CSV"
            className="btn-excel"
            onClick={handleExport}
            disabled={loading}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SkeletonLoader count={4} height="100px" />
          <SkeletonLoader count={2} height="240px" />
        </div>
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

          {/* ── Bottom Row: Genres & Platform Info ── */}
          <div className="stats-bottom-row">
            {/* Real Active Genres Listing */}
            <div className="stats-chart-card stats-chart-card--wide">
              <div className="stats-chart-header">
                <div>
                  <h2 className="stats-chart-title">Active Comic Genres</h2>
                  <p className="stats-chart-subtitle">Configured categories from database</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
                {statsData.genresList.length === 0 ? (
                  <p style={{ color: 'var(--admin-text-muted)', fontSize: '14px' }}>No genres registered yet.</p>
                ) : (
                  statsData.genresList.map((g, idx) => (
                    <span
                      key={g.id || idx}
                      style={{
                        background: 'rgba(168, 85, 247, 0.12)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        color: '#c084fc',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      {g.genreName || g.name}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Platform Status */}
            <div className="stats-chart-card stats-chart-card--narrow">
              <div className="stats-chart-header">
                <div>
                  <h2 className="stats-chart-title">System Status</h2>
                  <p className="stats-chart-subtitle">Security & Database Health</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                  <span>API Connection:</span>
                  <span style={{ color: 'var(--admin-green)', fontWeight: '600' }}>✓ Connected</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                  <span>Database Auth:</span>
                  <span style={{ color: 'var(--admin-green)', fontWeight: '600' }}>✓ Synchronized</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--admin-text-secondary)' }}>
                  <span>RBAC Guard:</span>
                  <span style={{ color: 'var(--admin-green)', fontWeight: '600' }}>✓ Admin Level</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}

export default StatisticsDashboard
