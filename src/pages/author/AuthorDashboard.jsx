import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthorLayout from '../../components/layout/AuthorLayout'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const VIEWS_DATA = [120, 180, 240, 310, 420, 520, 680, 820, 960, 1100, 1210, 1380]
const REVENUE_DATA = [1.1, 1.6, 2.2, 2.8, 3.1, 3.8, 4.5, 5.1, 5.8, 6.4, 7.0, 7.8]
const FOLLOWER_DATA = [1.2, 1.5, 1.8, 2.1, 2.5, 2.8, 3.4, 3.9, 4.3, 4.9, 5.4, 6.0]

const CHAPTER_DATA = [2, 1, 3, 2, 4, 3, 5, 3, 4, 5, 4, 6]
const REVIEW_DATA = [1, 1, 2, 1, 2, 1, 3, 2, 2, 3, 2, 3]
const APPROVED_DATA = [1, 1, 2, 2, 3, 3, 4, 3, 4, 4, 4, 5]

const TOP_COMICS = [
  { name: 'New Life', views: '1.2M', revenue: '5.5Mđ', pct: 100, status: 'Approved' },
  { name: 'Infinite Journey', views: '450K', revenue: '1.2Mđ', pct: 64, status: 'Pending' },
  { name: 'Shadow Path', views: '210K', revenue: '0.8Mđ', pct: 42, status: 'Hidden' },
  { name: 'Moon Blade', views: '150K', revenue: '0.5Mđ', pct: 31, status: 'Approved' },
]

const RECENT_ACTIVITY = [
  { title: 'Chapter 4 uploaded', meta: 'New Life · Preview ready', tone: 'blue' },
  { title: 'Chapter 3 submitted', meta: 'Infinite Journey · Waiting for moderator', tone: 'orange' },
  { title: 'Payout updated', meta: 'June revenue · 7.8Mđ estimated', tone: 'green' },
  { title: 'Comic info edited', meta: 'Shadow Path · Publication status changed', tone: 'purple' },
]

const STAT_CARDS = [
  { label: 'Total Comics', value: '3', change: '+1 draft this month', trend: 'up', icon: 'book', color: 'purple' },
  { label: 'Total Chapters', value: '6', change: '+2 waiting review', trend: 'warning', icon: 'chapters', color: 'blue' },
  { label: 'Total Views', value: '1.86M', change: '+12.4% vs last month', trend: 'up', icon: 'views', color: 'green' },
  { label: 'Monthly Revenue', value: '7.8Mđ', change: '+800Kđ this month', trend: 'up', icon: 'revenue', color: 'orange' },
  { label: 'Followers', value: '6.0K', change: '+600 new readers', trend: 'up', icon: 'users', color: 'pink' },
  { label: 'Avg. Rating', value: '4.7', change: 'stable quality score', trend: 'neutral', icon: 'star', color: 'cyan' },
  { label: 'Pending Reviews', value: '2', change: 'moderator queue', trend: 'warning', icon: 'review', color: 'red' },
  { label: 'Approved Rate', value: '91%', change: '+3% vs last month', trend: 'up', icon: 'check', color: 'green' },
]

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
    case 'book': return <svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    case 'chapters': return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    case 'views': return <svg {...props}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    case 'revenue': return <svg {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    case 'users': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    case 'star': return <svg {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case 'review': return <svg {...props}><path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8"/><path d="M8 13h5"/></svg>
    case 'check': return <svg {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    default: return null
  }
}

function AuthorDashboard() {
  const navigate = useNavigate()

  const lineChart = useMemo(() => {
    const chartW = 800
    const chartH = 280
    const padX = 50
    const padY = 30
    const maxVal = 1500
    return {
      chartW,
      chartH,
      padX,
      padY,
      maxVal,
      viewPath: buildLinePath(VIEWS_DATA, maxVal, chartW, chartH, padX, padY),
      revenuePath: buildLinePath(REVENUE_DATA.map((v) => v * 100), maxVal, chartW, chartH, padX, padY),
      followerPath: buildLinePath(FOLLOWER_DATA.map((v) => v * 100), maxVal, chartW, chartH, padX, padY),
    }
  }, [])

  const barW = 700
  const barH = 220
  const barPadX = 50
  const barPadY = 20
  const maxBar = 6
  const barGroupW = (barW - barPadX * 2) / 12

  return (
    <AuthorLayout activeNav="overview">
      <div className="author-page-header author-page-header-row">
        <div>
          <h1>Author Dashboard</h1>
          <p>Creative performance overview · December 2024</p>
        </div>
        <div className="author-dashboard-actions">
          <button className="author-secondary-btn" onClick={() => navigate('/author/comics')}>My Comics</button>
          <button className="author-primary-btn" onClick={() => navigate('/author/comics')}>+ Upload New Comic</button>
        </div>
      </div>

      <div className="author-analytics-grid">
        {STAT_CARDS.map((card) => (
          <div key={card.label} className={`author-analytics-card author-analytics-card--${card.color}`}>
            <div className="author-analytics-card-top">
              <span className="author-analytics-card-label">{card.label}</span>
              <span className={`author-analytics-card-icon author-analytics-card-icon--${card.color}`}>
                <StatIcon type={card.icon} />
              </span>
            </div>
            <div className="author-analytics-card-value">{card.value}</div>
            <div className={`author-analytics-card-change author-analytics-card-change--${card.trend}`}>
              {card.trend === 'up' && '↗ '}{card.change}
            </div>
          </div>
        ))}
      </div>

      <div className="author-analytics-chart-card">
        <div className="author-analytics-chart-header">
          <div>
            <h2 className="author-analytics-chart-title">Reader Growth (2024)</h2>
            <p className="author-analytics-chart-subtitle">Views vs Revenue index vs Followers</p>
          </div>
        </div>
        <div className="author-analytics-chart-body">
          <svg viewBox={`0 0 ${lineChart.chartW} ${lineChart.chartH}`} className="author-analytics-line-chart">
            {[1500, 1125, 750, 375].map((v) => {
              const y = lineChart.padY + (1 - v / lineChart.maxVal) * (lineChart.chartH - lineChart.padY * 2)
              return (
                <g key={v}>
                  <line x1={lineChart.padX} y1={y} x2={lineChart.chartW - lineChart.padX} y2={y} stroke="rgba(15,23,42,0.08)" strokeDasharray="4 4" />
                  <text x={lineChart.padX - 10} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11" fontFamily="Outfit">{v}</text>
                </g>
              )
            })}
            {MONTHS.map((m, i) => {
              const x = lineChart.padX + (i / 11) * (lineChart.chartW - lineChart.padX * 2)
              return <text key={m} x={x} y={lineChart.chartH - 5} textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="Outfit">{m}</text>
            })}
            <path d={lineChart.viewPath} fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinejoin="round" />
            <path d={lineChart.revenuePath} fill="none" stroke="#aa3bff" strokeWidth="2" strokeDasharray="6 3" strokeLinejoin="round" />
            <path d={lineChart.followerPath} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />
            {VIEWS_DATA.map((val, i) => {
              const x = lineChart.padX + (i / 11) * (lineChart.chartW - lineChart.padX * 2)
              const y = lineChart.padY + (1 - val / lineChart.maxVal) * (lineChart.chartH - lineChart.padY * 2)
              return <circle key={i} cx={x} cy={y} r="3" fill="#1e293b" />
            })}
          </svg>
        </div>
        <div className="author-analytics-legend">
          <span className="author-legend-item"><span className="author-legend-dot dark" />Views</span>
          <span className="author-legend-item"><span className="author-legend-dot purple" />Revenue Index</span>
          <span className="author-legend-item"><span className="author-legend-dot green" />Followers</span>
        </div>
      </div>

      <div className="author-analytics-bottom-row">
        <div className="author-analytics-chart-card author-analytics-chart-card--wide">
          <div className="author-analytics-chart-header">
            <div>
              <h2 className="author-analytics-chart-title">Chapter Production (2024)</h2>
              <p className="author-analytics-chart-subtitle">Uploaded chapters · Review submissions · Approved chapters</p>
            </div>
          </div>
          <div className="author-analytics-chart-body">
            <svg viewBox={`0 0 ${barW} ${barH}`} className="author-analytics-bar-chart">
              {[6, 4, 2].map((v) => {
                const y = barPadY + (1 - v / maxBar) * (barH - barPadY * 2)
                return (
                  <g key={v}>
                    <line x1={barPadX} y1={y} x2={barW - 20} y2={y} stroke="rgba(15,23,42,0.08)" strokeDasharray="4 4" />
                    <text x={barPadX - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="Outfit">{v}</text>
                  </g>
                )
              })}
              {MONTHS.map((m, i) => {
                const gx = barPadX + i * barGroupW + barGroupW * 0.15
                const bw = barGroupW * 0.2
                const uploadH = (CHAPTER_DATA[i] / maxBar) * (barH - barPadY * 2)
                const reviewH = (REVIEW_DATA[i] / maxBar) * (barH - barPadY * 2)
                const approvedH = (APPROVED_DATA[i] / maxBar) * (barH - barPadY * 2)
                const baseY = barH - barPadY
                return (
                  <g key={m}>
                    <rect x={gx} y={baseY - uploadH} width={bw} height={uploadH} rx="2" fill="#64748b" />
                    <rect x={gx + bw + 2} y={baseY - reviewH} width={bw} height={reviewH} rx="2" fill="#aa3bff" />
                    <rect x={gx + bw * 2 + 4} y={baseY - approvedH} width={bw} height={approvedH} rx="2" fill="#10b981" />
                    <text x={gx + bw} y={barH - 4} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="Outfit">{m}</text>
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="author-analytics-legend">
            <span className="author-legend-item"><span className="author-legend-dot slate" />Uploaded</span>
            <span className="author-legend-item"><span className="author-legend-dot purple" />Submitted</span>
            <span className="author-legend-item"><span className="author-legend-dot green" />Approved</span>
          </div>
        </div>

        <div className="author-analytics-chart-card author-analytics-chart-card--narrow">
          <div className="author-analytics-chart-header">
            <div>
              <h2 className="author-analytics-chart-title">Top Comics</h2>
              <p className="author-analytics-chart-subtitle">Performance by owned title</p>
            </div>
          </div>
          <div className="author-top-comics-list">
            {TOP_COMICS.map((comic) => (
              <div key={comic.name} className="author-top-comic-row">
                <div className="author-top-comic-info">
                  <div>
                    <span className="author-top-comic-name">{comic.name}</span>
                    <span className="author-top-comic-meta">{comic.views} views · {comic.revenue}</span>
                  </div>
                  <span className={`author-mini-status ${comic.status.toLowerCase()}`}>{comic.status}</span>
                </div>
                <div className="author-top-comic-bar-track">
                  <div className="author-top-comic-bar-fill" style={{ width: `${comic.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="author-analytics-chart-card author-recent-activity-card">
        <div className="author-analytics-chart-header">
          <div>
            <h2 className="author-analytics-chart-title">Recent Author Activity</h2>
            <p className="author-analytics-chart-subtitle">Latest upload, review, and revenue events</p>
          </div>
        </div>
        <div className="author-activity-grid">
          {RECENT_ACTIVITY.map((item) => (
            <div key={item.title} className="author-activity-box">
              <span className={`author-activity-dot ${item.tone}`} />
              <div>
                <strong>{item.title}</strong>
                <p>{item.meta}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AuthorLayout>
  )
}

export default AuthorDashboard
