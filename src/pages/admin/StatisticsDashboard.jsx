import AdminLayout from '../../components/layout/AdminLayout'
import '../../assets/style/admin/statistics.css'

// ── Stat cards data ────────────────────────────────
const STAT_CARDS = [
  { label: 'Total Users', value: '145.2K', change: '+1.3K this month', trend: 'up', icon: 'users', color: 'purple' },
  { label: 'Total Comics', value: '3,450', change: '+10 this month', trend: 'up', icon: 'book', color: 'pink' },
  { label: 'Total Chapters', value: '84,600', change: '+2,500 this month', trend: 'up', icon: 'chapters', color: 'green' },
  { label: 'Daily Active Users', value: '42.8K', change: '+5.2% vs last week', trend: 'up', icon: 'activity', color: 'orange' },
  { label: 'Premium Subscribers', value: '3,241', change: '+8.8% vs last month', trend: 'up', icon: 'premium', color: 'blue' },
  { label: 'Monthly Revenue', value: '156M đ', change: '+16.4% vs last month', trend: 'up', icon: 'revenue', color: 'green' },
  { label: 'Avg. Session Time', value: '18.4 min', change: '~1.2 min vs last month', trend: 'neutral', icon: 'clock', color: 'cyan' },
  { label: 'Content Reports', value: '24', change: '» Pending review', trend: 'warning', icon: 'report', color: 'red' },
]

// ── User Growth line chart data ────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TOTAL_USERS = [85, 88, 92, 97, 103, 110, 118, 125, 130, 136, 140, 145]
const PREMIUM = [12, 13, 14, 15, 16, 18, 20, 22, 24, 27, 29, 32]
const NEW_SIGNUPS = [5, 4, 6, 7, 8, 9, 10, 9, 8, 9, 7, 8]

// ── Content Growth bar chart data ──────────────────
const COMICS_DATA = [120, 180, 250, 310, 400, 520, 680, 850, 1100, 1400, 2200, 3000]
const CHAPTERS_DATA = [800, 1200, 1500, 1800, 2100, 2400, 2700, 2900, 3100, 3300, 3400, 3600]
const VIEWS_DATA = [2, 3, 4, 5, 7, 9, 12, 15, 18, 22, 25, 28]

// ── Top Genres data ────────────────────────────────
const TOP_GENRES = [
  { name: 'Action', count: 892, color: '#a855f7' },
  { name: 'Fantasy', count: 756, color: '#3b82f6' },
  { name: 'Romance', count: 634, color: '#ec4899' },
  { name: 'Comedy', count: 521, color: '#f97316' },
  { name: 'Horror', count: 387, color: '#ef4444' },
  { name: 'Sci-Fi', count: 298, color: '#06b6d4' },
]

// ── SVG chart helpers ──────────────────────────────
function buildLinePath(data, maxVal, width, height, padX, padY) {
  return data.map((val, i) => {
    const x = padX + (i / (data.length - 1)) * (width - padX * 2)
    const y = padY + (1 - val / maxVal) * (height - padY * 2)
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')
}

function StatIcon({ type }) {
  const props = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (type) {
    case 'users': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
    case 'book': return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    case 'chapters': return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    case 'activity': return <svg {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    case 'premium': return <svg {...props}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    case 'revenue': return <svg {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    case 'clock': return <svg {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    case 'report': return <svg {...props}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    default: return null
  }
}

function StatisticsDashboard() {
  const chartW = 800, chartH = 280, padX = 50, padY = 30
  const maxTotal = 160
  const totalPath = buildLinePath(TOTAL_USERS, maxTotal, chartW, chartH, padX, padY)
  const premiumPath = buildLinePath(PREMIUM, maxTotal, chartW, chartH, padX, padY)
  const signupPath = buildLinePath(NEW_SIGNUPS, maxTotal, chartW, chartH, padX, padY)

  // Y-axis labels
  const yLabels = [160, 120, 80, 40]

  // Content bar chart
  const barW = 700, barH = 220, barPadX = 50, barPadY = 20
  const maxBar = 3600
  const barGroupW = (barW - barPadX * 2) / 12

  const maxGenre = TOP_GENRES[0].count

  return (
    <AdminLayout activeNav="statistics">
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1>Statistics Dashboard</h1>
          <p>System overview · December 2024</p>
        </div>
      </div>

      {/* ── Stat Cards Grid ─────────────────────── */}
      <div className="stats-cards-grid">
        {STAT_CARDS.map((card, i) => (
          <div key={i} className={`stats-card stats-card--${card.color}`}>
            <div className="stats-card-top">
              <span className="stats-card-label">{card.label}</span>
              <span className={`stats-card-icon stats-card-icon--${card.color}`}>
                <StatIcon type={card.icon} />
              </span>
            </div>
            <div className="stats-card-value">{card.value}</div>
            <div className={`stats-card-change stats-card-change--${card.trend}`}>
              {card.trend === 'up' && '↗ '}{card.change}
            </div>
          </div>
        ))}
      </div>

      {/* ── User Growth Chart ───────────────────── */}
      <div className="stats-chart-card">
        <div className="stats-chart-header">
          <div>
            <h2 className="stats-chart-title">User Growth (2024)</h2>
            <p className="stats-chart-subtitle">Total users vs Premium subscribers vs New signups</p>
          </div>
        </div>
        <div className="stats-chart-body">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="stats-line-chart">
            {/* Grid lines */}
            {yLabels.map((v) => {
              const y = padY + (1 - v / maxTotal) * (chartH - padY * 2)
              return (
                <g key={v}>
                  <line x1={padX} y1={y} x2={chartW - padX} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                  <text x={padX - 10} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11" fontFamily="Outfit">{v}K</text>
                </g>
              )
            })}

            {/* X-axis labels */}
            {MONTHS.map((m, i) => {
              const x = padX + (i / 11) * (chartW - padX * 2)
              return <text key={m} x={x} y={chartH - 5} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="Outfit">{m}</text>
            })}

            {/* Lines */}
            <path d={totalPath} fill="none" stroke="#f1f5f9" strokeWidth="2.5" strokeLinejoin="round" />
            <path d={premiumPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 3" strokeLinejoin="round" />
            <path d={signupPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />

            {/* Dots on total line */}
            {TOTAL_USERS.map((val, i) => {
              const x = padX + (i / 11) * (chartW - padX * 2)
              const y = padY + (1 - val / maxTotal) * (chartH - padY * 2)
              return <circle key={i} cx={x} cy={y} r="3" fill="#f1f5f9" />
            })}
          </svg>
        </div>
        <div className="stats-chart-legend">
          <span className="legend-item"><span className="legend-dot" style={{ background: '#f1f5f9' }} />Total Users</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: '#3b82f6' }} />Premium</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: '#ef4444' }} />New Signups</span>
        </div>
      </div>

      {/* ── Bottom Row: Content Growth + Top Genres ── */}
      <div className="stats-bottom-row">
        {/* Content Growth bar chart */}
        <div className="stats-chart-card stats-chart-card--wide">
          <div className="stats-chart-header">
            <div>
              <h2 className="stats-chart-title">Content Growth (2024)</h2>
              <p className="stats-chart-subtitle">Comics · Chapters (×100) · Daily Views (K)</p>
            </div>
          </div>
          <div className="stats-chart-body">
            <svg viewBox={`0 0 ${barW} ${barH}`} className="stats-bar-chart">
              {/* Y-axis */}
              {[3600, 2700, 1800, 900].map((v) => {
                const y = barPadY + (1 - v / maxBar) * (barH - barPadY * 2)
                return (
                  <g key={v}>
                    <line x1={barPadX} y1={y} x2={barW - 20} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                    <text x={barPadX - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="Outfit">{v}</text>
                  </g>
                )
              })}

              {/* Bars */}
              {MONTHS.map((m, i) => {
                const gx = barPadX + i * barGroupW + barGroupW * 0.15
                const bw = barGroupW * 0.2
                const comicH = (COMICS_DATA[i] / maxBar) * (barH - barPadY * 2)
                const chapH = (CHAPTERS_DATA[i] / maxBar) * (barH - barPadY * 2)
                const viewH = (VIEWS_DATA[i] / maxBar * 100) * (barH - barPadY * 2)
                const baseY = barH - barPadY

                return (
                  <g key={m}>
                    <rect x={gx} y={baseY - comicH} width={bw} height={comicH} rx="2" fill="#64748b" />
                    <rect x={gx + bw + 2} y={baseY - chapH} width={bw} height={chapH} rx="2" fill="#1e293b" />
                    <rect x={gx + (bw + 2) * 2} y={baseY - viewH} width={bw} height={viewH} rx="2" fill="#10b981" />
                    <text x={gx + bw * 1.5} y={barH - 2} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Outfit">{m}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Top Genres */}
        <div className="stats-chart-card stats-chart-card--narrow">
          <div className="stats-chart-header">
            <div>
              <h2 className="stats-chart-title">Top Genres</h2>
              <p className="stats-chart-subtitle">By comic count</p>
            </div>
          </div>
          <div className="stats-genres-list">
            {TOP_GENRES.map((g) => (
              <div key={g.name} className="stats-genre-row">
                <div className="stats-genre-info">
                  <span className="stats-genre-name">{g.name}</span>
                  <span className="stats-genre-count">{g.count}</span>
                </div>
                <div className="stats-genre-bar-track">
                  <div
                    className="stats-genre-bar-fill"
                    style={{ width: `${(g.count / maxGenre) * 100}%`, background: g.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default StatisticsDashboard
