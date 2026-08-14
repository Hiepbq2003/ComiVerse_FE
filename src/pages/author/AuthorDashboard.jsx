import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import '../../assets/style/author/dashboard.css'
import { getAuthorDashboardMetricsApi } from '../../services/api/AuthorComicApi'
import { exportToCsv } from '../../utils/exportToCsv'

const EMPTY_SUMMARY = {
  totalComics: 0,
  publishedComics: 0,
  draftComics: 0,
  totalChapters: 0,
  totalViews: 0,
  totalFollowers: 0,
  totalLikes: 0,
  totalRatings: 0,
  averageRating: 0,
  pendingReviews: 0,
  approvedRate: 0,
  estimatedRevenue: 0,
}

const numberValue = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const formatCompactNumber = (value) => new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(numberValue(value))

const formatFullNumber = (value) => new Intl.NumberFormat('en-US').format(numberValue(value))

const formatMoney = (value) => `$${new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(numberValue(value))}`

const formatPercent = (value) => `${numberValue(value).toFixed(1).replace('.0', '')}%`

const formatRating = (value) => numberValue(value).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')

const formatStatus = (status) => {
  const value = (status || 'DRAFT').toString().toUpperCase()
  if (['PUBLISHED', 'APPROVED'].includes(value)) return 'Approved'
  if (value === 'SUBMITTED_FOR_REVIEW') return 'Pending'
  if (value === 'UNPUBLISHED') return 'Hidden'
  if (value === 'REJECTED') return 'Rejected'
  if (value === 'NEEDS_CHANGES') return 'Needs changes'
  return 'Draft'
}

const statusClass = (status) => {
  const value = formatStatus(status).toLowerCase()
  if (value === 'approved') return 'approved'
  if (value === 'pending') return 'pending'
  if (value === 'hidden') return 'hidden'
  if (value === 'rejected' || value === 'needs changes') return 'rejected'
  return 'draft'
}

const activityTone = (status) => {
  const value = (status || '').toString().toLowerCase()
  if (value === 'approved') return 'green'
  if (value === 'rejected') return 'red'
  if (value === 'pending') return 'orange'
  return 'purple'
}

const formatActivityTime = (value) => {
  if (!value) return 'Recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildLinePath(data, maxVal, width, height, padX, padY) {
  if (!data.length) return ''
  const denominator = Math.max(1, data.length - 1)
  return data.map((rawValue, index) => {
    const value = numberValue(rawValue)
    const x = padX + (index / denominator) * (width - padX * 2)
    const y = padY + (1 - value / Math.max(1, maxVal)) * (height - padY * 2)
    return `${index === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ')
}

function normalizeToScale(data, sourceMax, targetMax) {
  if (sourceMax <= 0) return data.map(() => 0)
  return data.map((value) => (numberValue(value) / sourceMax) * targetMax)
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
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartPeriod, setChartPeriod] = useState('WEEK') // WEEK, MONTH, YEAR
  const [lineHoverData, setLineHoverData] = useState(null)
  const [barHoverData, setBarHoverData] = useState(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDashboard(await getAuthorDashboardMetricsApi(chartPeriod))
    } catch (err) {
      setDashboard(null)
      setError(err?.response?.data?.message || err?.message || 'Could not load author dashboard metrics.')
    } finally {
      setLoading(false)
    }
  }, [chartPeriod])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const summary = dashboard?.summary || EMPTY_SUMMARY
  const monthlyMetrics = Array.isArray(dashboard?.monthlyMetrics) ? dashboard.monthlyMetrics : []
  const topComics = Array.isArray(dashboard?.topComics) ? dashboard.topComics : []
  const recentActivities = Array.isArray(dashboard?.recentActivities) ? dashboard.recentActivities : []

  const statCards = useMemo(() => [
    { label: 'Total Comics', value: formatFullNumber(summary.totalComics), change: `${formatFullNumber(summary.publishedComics)} published · ${formatFullNumber(summary.draftComics)} other`, trend: 'neutral', icon: 'book', color: 'purple' },
    { label: 'Total Chapters', value: formatFullNumber(summary.totalChapters), change: 'All active author chapters', trend: 'neutral', icon: 'chapters', color: 'blue' },
    { label: 'Total Views', value: formatCompactNumber(summary.totalViews), change: `${formatCompactNumber(summary.totalLikes)} likes`, trend: 'up', icon: 'views', color: 'green' },
    { label: 'Estimated Revenue', value: formatMoney(summary.estimatedRevenue), change: 'From latest metric snapshots', trend: 'neutral', icon: 'revenue', color: 'orange' },
    { label: 'Followers', value: formatCompactNumber(summary.totalFollowers), change: 'Readers who saved your comics', trend: 'up', icon: 'users', color: 'pink' },
    { label: 'Avg. Rating', value: formatRating(summary.averageRating), change: `${formatFullNumber(summary.totalRatings)} ratings`, trend: 'neutral', icon: 'star', color: 'cyan' },
    { label: 'Pending Reviews', value: formatFullNumber(summary.pendingReviews), change: 'Comic and chapter review queue', trend: 'warning', icon: 'review', color: 'red' },
  ], [summary])

  const lineChart = useMemo(() => {
    const chartW = 800
    const chartH = 280
    const padX = 50
    const padY = 30
    const views = monthlyMetrics.map((item) => numberValue(item.views))
    const followers = monthlyMetrics.map((item) => numberValue(item.followers))
    const revenue = monthlyMetrics.map((item) => numberValue(item.estimatedRevenue))
    const maxValRaw = Math.max(1, ...views, ...followers, ...revenue)
    const scaleMax = Math.ceil(maxValRaw * 1.1)

    return {
      chartW,
      chartH,
      padX,
      padY,
      maxVal: scaleMax,
      views,
      revenue,
      followers,
      viewPath: buildLinePath(views, scaleMax, chartW, chartH, padX, padY),
      revenuePath: buildLinePath(revenue, scaleMax, chartW, chartH, padX, padY),
      followerPath: buildLinePath(followers, scaleMax, chartW, chartH, padX, padY),
    }
  }, [monthlyMetrics])

  const barChart = useMemo(() => {
    const uploaded = monthlyMetrics.map((item) => numberValue(item.chaptersUploaded))
    const submitted = monthlyMetrics.map((item) => numberValue(item.reviewsSubmitted))
    const approved = monthlyMetrics.map((item) => numberValue(item.chaptersApproved))
    return {
      uploaded,
      submitted,
      approved,
      max: Math.max(1, ...uploaded, ...submitted, ...approved),
    }
  }, [monthlyMetrics])

  const handleExport = () => {
    if (!monthlyMetrics || monthlyMetrics.length === 0) return
    const headers = ['Period', 'Views', 'Followers', 'Estimated Revenue (USD)', 'Chapters Uploaded', 'Reviews Submitted', 'Chapters Approved']
    const rows = monthlyMetrics.map(item => [
      item.label || item.monthKey,
      numberValue(item.views),
      numberValue(item.followers),
      numberValue(item.estimatedRevenue),
      numberValue(item.chaptersUploaded),
      numberValue(item.reviewsSubmitted),
      numberValue(item.chaptersApproved)
    ])
    exportToCsv(`Author_Metrics_Overview_${chartPeriod}`, headers, rows)
  }

  const generatedLabel = dashboard?.generatedAt
    ? new Date(dashboard.generatedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  if (loading) {
    return <div className="author-empty-state">Loading author dashboard metrics...</div>
  }

  if (error) {
    return (
      <div className="author-empty-state">
        <h2>Dashboard metrics unavailable</h2>
        <p>{error}</p>
        <button className="author-primary-btn" onClick={loadDashboard}>Try Again</button>
      </div>
    )
  }

  const barW = 700
  const barH = 220
  const barPadX = 50
  const barPadY = 20
  const barGroupW = (barW - barPadX * 2) / Math.max(1, monthlyMetrics.length)

  return (
    <>
      <div className="author-page-header author-page-header-row">
        <div>
          <h1>Author Dashboard</h1>
          <p>Creative performance overview · {generatedLabel}</p>
        </div>
        <div className="author-dashboard-actions">
          <button 
            className="author-secondary-btn" 
            onClick={handleExport} 
            disabled={loading || !dashboard}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={16} /> Export CSV
          </button>
          <button className="author-secondary-btn" onClick={() => navigate('/author/comics')}>
            📖 My Comics
          </button>
          <button className="author-primary-btn" onClick={() => navigate('/author/comics')}>
            ✨ + Create Comic
          </button>
        </div>
      </div>

      <div className="author-analytics-grid">
        {statCards.map((card) => (
          <div key={card.label} className={`author-analytics-card author-analytics-card--${card.color}`}>
            <div className="author-analytics-card-top">
              <span className="author-analytics-card-label">{card.label}</span>
              <span className={`author-analytics-card-icon author-analytics-card-icon--${card.color}`}><StatIcon type={card.icon} /></span>
            </div>
            <div className="author-analytics-card-value">{card.value}</div>
            <div className={`author-analytics-card-change author-analytics-card-change--${card.trend}`}>{card.trend === 'up' && '↗ '}{card.change}</div>
          </div>
        ))}
      </div>

        <div className="author-analytics-chart-card">
        <div className="author-analytics-chart-header">
          <div>
            <h2 className="author-analytics-chart-title">Reader Growth</h2>
            <p className="author-analytics-chart-subtitle">Absolute values for Views, Revenue and Followers</p>
          </div>
          <div className="author-chart-toggle">
            <button 
              className={`author-chart-toggle-btn ${chartPeriod === 'WEEK' ? 'active' : ''}`}
              onClick={() => setChartPeriod('WEEK')}
            >
              Week
            </button>
            <button 
              className={`author-chart-toggle-btn ${chartPeriod === 'MONTH' ? 'active' : ''}`}
              onClick={() => setChartPeriod('MONTH')}
            >
              Month
            </button>
            <button 
              className={`author-chart-toggle-btn ${chartPeriod === 'YEAR' ? 'active' : ''}`}
              onClick={() => setChartPeriod('YEAR')}
            >
              Year
            </button>
          </div>
        </div>
        <div className="author-analytics-chart-body">
          <svg viewBox={`0 0 ${lineChart.chartW} ${lineChart.chartH}`} className="author-analytics-line-chart">
            {[1, 0.75, 0.5, 0.25].map((ratio) => {
              const value = Math.round(lineChart.maxVal * ratio)
              const y = lineChart.padY + (1 - ratio) * (lineChart.chartH - lineChart.padY * 2)
              return <g key={ratio}><line x1={lineChart.padX} y1={y} x2={lineChart.chartW - lineChart.padX} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4"/><text x={lineChart.padX - 10} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11" fontFamily="Outfit">{formatCompactNumber(value)}</text></g>
            })}
            {monthlyMetrics.map((item, index) => {
              const denominator = Math.max(1, monthlyMetrics.length - 1)
              const x = lineChart.padX + (index / denominator) * (lineChart.chartW - lineChart.padX * 2)
              return <text key={item.monthKey || index} x={x} y={lineChart.chartH - 5} textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="Outfit">{item.label}</text>
            })}
            
            {/* Interactive Hover Areas */}
            {monthlyMetrics.map((item, index) => {
              const denominator = Math.max(1, monthlyMetrics.length - 1)
              const x = lineChart.padX + (index / denominator) * (lineChart.chartW - lineChart.padX * 2)
              const bandW = (lineChart.chartW - lineChart.padX * 2) / Math.max(1, monthlyMetrics.length - 1)
              return (
                <rect
                  key={`hover-${index}`}
                  x={x - bandW / 2}
                  y={lineChart.padY}
                  width={bandW}
                  height={lineChart.chartH - lineChart.padY * 2}
                  fill={lineHoverData?.index === index ? "rgba(192, 132, 252, 0.05)" : "transparent"}
                  onMouseEnter={() => setLineHoverData({ index, x })}
                  onMouseLeave={() => setLineHoverData(null)}
                  style={{ cursor: 'crosshair', transition: 'fill 0.2s' }}
                />
              )
            })}
            <path d={lineChart.viewPath} fill="none" stroke="#c084fc" strokeWidth="2.5" strokeLinejoin="round"/>
            <path d={lineChart.revenuePath} fill="none" stroke="#aa3bff" strokeWidth="2" strokeDasharray="6 3" strokeLinejoin="round"/>
            <path d={lineChart.followerPath} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round"/>
            {lineChart.views.map((value, index) => {
              const denominator = Math.max(1, lineChart.views.length - 1)
              const x = lineChart.padX + (index / denominator) * (lineChart.chartW - lineChart.padX * 2)
              const vy = lineChart.padY + (1 - value / lineChart.maxVal) * (lineChart.chartH - lineChart.padY * 2)
              const ry = lineChart.padY + (1 - lineChart.revenue[index] / lineChart.maxVal) * (lineChart.chartH - lineChart.padY * 2)
              const fy = lineChart.padY + (1 - lineChart.followers[index] / lineChart.maxVal) * (lineChart.chartH - lineChart.padY * 2)
              
              const isHovered = lineHoverData?.index === index
              const r = isHovered ? "6" : "4"
              
              return (
                <g key={index} style={{ pointerEvents: 'none' }}>
                  <circle cx={x} cy={vy} r={r} fill="#c084fc" style={{ transition: 'all 0.2s' }} />
                  <circle cx={x} cy={ry} r={r} fill="#aa3bff" style={{ transition: 'all 0.2s' }} />
                  <circle cx={x} cy={fy} r={r} fill="#10b981" style={{ transition: 'all 0.2s' }} />
                </g>
              )
            })}
          </svg>
          
          {lineHoverData && (() => {
            const { index, x } = lineHoverData
            const item = monthlyMetrics[index]
            const px = (x / lineChart.chartW) * 100
            let alignClass = ''
            if (px > 80) alignClass = ' align-right'
            if (px < 20) alignClass = ' align-left'
            
            return (
              <div className={`author-chart-tooltip${alignClass}`} style={{ left: `${px}%`, top: '40%' }}>
                <div className="author-chart-tooltip-header">{item.label}</div>
                <div className="author-chart-tooltip-row">
                  <span className="author-chart-tooltip-label"><span className="author-legend-dot dark"/> Views</span>
                  <span className="author-chart-tooltip-value">{formatFullNumber(lineChart.views[index])}</span>
                </div>
                <div className="author-chart-tooltip-row">
                  <span className="author-chart-tooltip-label"><span className="author-legend-dot purple"/> Revenue</span>
                  <span className="author-chart-tooltip-value">{formatMoney(lineChart.revenue[index])}</span>
                </div>
                <div className="author-chart-tooltip-row">
                  <span className="author-chart-tooltip-label"><span className="author-legend-dot green"/> Followers</span>
                  <span className="author-chart-tooltip-value">{formatFullNumber(lineChart.followers[index])}</span>
                </div>
              </div>
            )
          })()}
        </div>
        <div className="author-analytics-legend">
          <span className="author-legend-item"><span className="author-legend-dot dark"/>Views</span>
          <span className="author-legend-item"><span className="author-legend-dot purple"/>Revenue</span>
          <span className="author-legend-item"><span className="author-legend-dot green"/>Followers</span>
        </div>
      </div>

      <div className="author-analytics-bottom-row">
        <div className="author-analytics-chart-card author-analytics-chart-card--wide">
          <div className="author-analytics-chart-header"><div><h2 className="author-analytics-chart-title">Chapter Production</h2><p className="author-analytics-chart-subtitle">Uploaded chapters · Review submissions · Approved chapters</p></div></div>
          <div className="author-analytics-chart-body">
            <svg viewBox={`0 0 ${barW} ${barH}`} className="author-analytics-bar-chart">
              {[1, 0.66, 0.33].map((ratio) => {
                const value = Math.max(1, Math.round(barChart.max * ratio))
                const y = barPadY + (1 - ratio) * (barH - barPadY * 2)
                return <g key={ratio}><line x1={barPadX} y1={y} x2={barW - 20} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4"/><text x={barPadX - 8} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="Outfit">{value}</text></g>
              })}
              {monthlyMetrics.map((item, index) => {
                const gx = barPadX + index * barGroupW + barGroupW * 0.15
                const bw = barGroupW * 0.2
                const baseY = barH - barPadY
                const availableH = barH - barPadY * 2
                const uploadH = (barChart.uploaded[index] / barChart.max) * availableH
                const reviewH = (barChart.submitted[index] / barChart.max) * availableH
                const approvedH = (barChart.approved[index] / barChart.max) * availableH
                const isHovered = barHoverData?.index === index
                
                return (
                  <g key={item.monthKey || index}>
                    {/* Invisible Hover Rect */}
                    <rect 
                      x={barPadX + index * barGroupW} 
                      y={barPadY} 
                      width={barGroupW} 
                      height={availableH} 
                      fill={isHovered ? "rgba(255,255,255,0.03)" : "transparent"} 
                      onMouseEnter={() => setBarHoverData({ index, x: barPadX + index * barGroupW + barGroupW/2 })}
                      onMouseLeave={() => setBarHoverData(null)}
                      style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
                    />
                    
                    <rect x={gx} y={baseY - uploadH} width={bw} height={uploadH} rx="2" fill={isHovered ? "#cbd5e1" : "#94a3b8"} style={{ pointerEvents: 'none', transition: 'fill 0.2s' }} />
                    <rect x={gx + bw + 2} y={baseY - reviewH} width={bw} height={reviewH} rx="2" fill={isHovered ? "#c084fc" : "#aa3bff"} style={{ pointerEvents: 'none', transition: 'fill 0.2s' }} />
                    <rect x={gx + bw * 2 + 4} y={baseY - approvedH} width={bw} height={approvedH} rx="2" fill={isHovered ? "#34d399" : "#10b981"} style={{ pointerEvents: 'none', transition: 'fill 0.2s' }} />
                    <text x={gx + bw} y={barH - 4} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="Outfit" style={{ pointerEvents: 'none' }}>{item.label}</text>
                  </g>
                )
              })}
            </svg>
            
            {barHoverData && (() => {
              const { index, x } = barHoverData
              const item = monthlyMetrics[index]
              const px = (x / barW) * 100
              let alignClass = ''
              if (px > 80) alignClass = ' align-right'
              if (px < 20) alignClass = ' align-left'
              
              return (
                <div className={`author-chart-tooltip${alignClass}`} style={{ left: `${px}%`, top: '40%' }}>
                  <div className="author-chart-tooltip-header">{item.label}</div>
                  <div className="author-chart-tooltip-row">
                    <span className="author-chart-tooltip-label"><span className="author-legend-dot slate"/> Uploaded</span>
                    <span className="author-chart-tooltip-value">{formatFullNumber(barChart.uploaded[index])}</span>
                  </div>
                  <div className="author-chart-tooltip-row">
                    <span className="author-chart-tooltip-label"><span className="author-legend-dot purple"/> Submitted</span>
                    <span className="author-chart-tooltip-value">{formatFullNumber(barChart.submitted[index])}</span>
                  </div>
                  <div className="author-chart-tooltip-row">
                    <span className="author-chart-tooltip-label"><span className="author-legend-dot green"/> Approved</span>
                    <span className="author-chart-tooltip-value">{formatFullNumber(barChart.approved[index])}</span>
                  </div>
                </div>
              )
            })()}
          </div>
          <div className="author-analytics-legend"><span className="author-legend-item"><span className="author-legend-dot slate"/>Uploaded</span><span className="author-legend-item"><span className="author-legend-dot purple"/>Submitted</span><span className="author-legend-item"><span className="author-legend-dot green"/>Approved</span></div>
        </div>

        <div className="author-analytics-chart-card author-analytics-chart-card--narrow">
          <div className="author-analytics-chart-header"><div><h2 className="author-analytics-chart-title">Top Comics</h2><p className="author-analytics-chart-subtitle">Performance by owned title</p></div></div>
          <div className="author-top-comics-list">
            {topComics.length === 0 && <div className="author-empty-state"><p>No comics available yet.</p></div>}
            {topComics.map((comic) => {
              const maxViews = Math.max(1, ...topComics.map((item) => numberValue(item.viewCount)))
              const pct = Math.max(4, (numberValue(comic.viewCount) / maxViews) * 100)
              return <div key={comic.comicId || comic.title} className="author-top-comic-row"><div className="author-top-comic-info"><div><span className="author-top-comic-name">{comic.title}</span><span className="author-top-comic-meta">{formatCompactNumber(comic.viewCount)} views · {formatMoney(comic.estimatedRevenue)}</span></div><span className={`author-mini-status ${statusClass(comic.moderationStatus)}`}>{formatStatus(comic.moderationStatus)}</span></div><div className="author-top-comic-bar-track"><div className="author-top-comic-bar-fill" style={{ width: `${pct}%` }}/></div></div>
            })}
          </div>
        </div>
      </div>

      <div className="author-analytics-chart-card author-recent-activity-card">
        <div className="author-analytics-chart-header"><div><h2 className="author-analytics-chart-title">Recent Author Activity</h2><p className="author-analytics-chart-subtitle">Latest comic and chapter moderation events</p></div></div>
        <div className="author-activity-grid">
          {recentActivities.length === 0 && <div className="author-empty-state"><p>No review activity yet.</p></div>}
          {recentActivities.map((item) => <div key={item.submissionId || `${item.type}-${item.occurredAt}`} className="author-activity-box"><span className={`author-activity-dot ${activityTone(item.status)}`}/><div><strong>{item.title || (item.type === 'CHAPTER_REVIEW' ? 'Chapter review' : 'Comic review')}</strong><p>{item.description} · {formatActivityTime(item.occurredAt)}</p></div></div>)}
        </div>
      </div>
    </>
  )
}

export default AuthorDashboard
