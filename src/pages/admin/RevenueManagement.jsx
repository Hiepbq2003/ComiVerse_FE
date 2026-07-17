import { useState, useMemo } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import '../../assets/style/admin/revenue.css'

// ── Stat cards ─────────────────────────────────────
const REVENUE_CARDS = [
  { label: 'Total Revenue (Dec)', value: '156M đ', change: '+16.4%', sub: 'vs 134M đ last month', icon: 'dollar', color: 'purple' },
  { label: 'Net Profit (Dec)', value: '97M đ', change: '+16.9%', sub: 'vs 83M đ last month', icon: 'trending', color: 'green' },
  { label: 'Total Payouts (Dec)', value: '59M đ', change: '+15.7%', sub: 'vs 51M đ last month', icon: 'payout', color: 'blue' },
  { label: 'Premium Subscribers', value: '3,241', change: '+8.8%', sub: 'vs 2,980 last month', icon: 'premium', color: 'orange' },
]

// ── Monthly Revenue bar chart data ─────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const REVENUE = [18, 22, 28, 35, 45, 55, 68, 78, 95, 110, 135, 156]
const PAYOUTS = [8, 10, 12, 16, 22, 28, 35, 40, 48, 55, 70, 59]
const NET_PROFIT = [10, 12, 16, 19, 23, 27, 33, 38, 47, 55, 65, 97]

// ── Revenue Breakdown donut ────────────────────────
const BREAKDOWN = [
  { label: 'Monthly Premium', pct: 52, color: '#1e293b' },
  { label: 'Yearly Premium', pct: 31, color: '#7c3aed' },
  { label: 'Donations', pct: 17, color: '#10b981' },
]

// ── Recent Transactions ────────────────────────────
const TRANSACTIONS = [
  { date: '12/12/2024', type: 'Premium Monthly — User #4821', amount: '+ 49,000đ', positive: true, status: 'Success' },
  { date: '12/12/2024', type: 'Premium Yearly — User #3309', amount: '+ 390,000đ', positive: true, status: 'Success' },
  { date: '11/12/2024', type: 'Author Commission — Author X', amount: '- 2,400,000đ', positive: false, status: 'Success' },
  { date: '11/12/2024', type: 'Premium Monthly — User #7712', amount: '+ 49,000đ', positive: true, status: 'Success' },
  { date: '10/12/2024', type: 'Translator Payout — Spirit Group', amount: '- 1,800,000đ', positive: false, status: 'Success' },
  { date: '10/12/2024', type: 'Donation — User #1204', amount: '+ 200,000đ', positive: true, status: 'Success' },
  { date: '09/12/2024', type: 'Premium Yearly — User #5501', amount: '+ 390,000đ', positive: true, status: 'Pending' },
]

function RevenueIcon({ type }) {
  const props = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (type) {
    case 'dollar': return <svg {...props}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    case 'trending': return <svg {...props}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
    case 'payout': return <svg {...props}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    case 'premium': return <svg {...props}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    default: return null
  }
}

function RevenueManagement() {
  const barW = 720, barH = 300, padX = 50, padY = 30
  const maxBar = 160

  // Donut chart
  const donutR = 80, donutStroke = 28
  const donutCirc = 2 * Math.PI * donutR
  let donutOffset = 0

  return (
    <AdminLayout activeNav="revenue">
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1>Revenue Management</h1>
          <p className="stats-subtitle-green">Financial overview · December 2024</p>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────── */}
      <div className="stats-cards-grid stats-cards-grid--4">
        {REVENUE_CARDS.map((card, i) => (
          <div key={i} className={`stats-card stats-card--${card.color}`}>
            <div className="stats-card-top">
              <span className="stats-card-label">{card.label}</span>
              <span className={`stats-card-icon stats-card-icon--${card.color}`}>
                <RevenueIcon type={card.icon} />
              </span>
            </div>
            <div className="stats-card-value">{card.value}</div>
            <div className="stats-card-change stats-card-change--up">
              ↗ {card.change} <span className="stats-card-sub">{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row: Bar + Donut ─────────────── */}
      <div className="revenue-charts-row">
        {/* Monthly Revenue bar chart */}
        <div className="stats-chart-card stats-chart-card--wide">
          <div className="stats-chart-header">
            <div>
              <h2 className="stats-chart-title">Monthly Revenue (2024)</h2>
              <p className="stats-chart-subtitle">Revenue vs Payouts vs Net Profit (M đ)</p>
            </div>
          </div>
          <div className="stats-chart-body">
            <svg viewBox={`0 0 ${barW} ${barH}`} className="stats-bar-chart">
              {/* Y grid */}
              {[160, 120, 80, 40, 0].map((v) => {
                const y = padY + (1 - v / maxBar) * (barH - padY * 2)
                return (
                  <g key={v}>
                    <line x1={padX} y1={y} x2={barW - 20} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                    <text x={padX - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11" fontFamily="Outfit">{v}M</text>
                  </g>
                )
              })}

              {/* Bar groups */}
              {MONTHS.map((m, i) => {
                const groupW = (barW - padX * 2) / 12
                const gx = padX + i * groupW + groupW * 0.1
                const bw = groupW * 0.22
                const baseY = barH - padY

                const rH = (REVENUE[i] / maxBar) * (barH - padY * 2)
                const pH = (PAYOUTS[i] / maxBar) * (barH - padY * 2)
                const nH = (NET_PROFIT[i] / maxBar) * (barH - padY * 2)

                return (
                  <g key={m}>
                    <rect x={gx} y={baseY - rH} width={bw} height={rH} rx="2" fill="#e2e8f0" />
                    <rect x={gx + bw + 2} y={baseY - pH} width={bw} height={pH} rx="2" fill="#475569" />
                    <rect x={gx + (bw + 2) * 2} y={baseY - nH} width={bw} height={nH} rx="2" fill="#10b981" />
                    <text x={gx + bw * 1.5 + 2} y={barH - 5} textAnchor="middle" fill="#64748b" fontSize="10" fontFamily="Outfit">{m}</text>
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="stats-chart-legend">
            <span className="legend-item"><span className="legend-dot" style={{ background: '#e2e8f0' }} />Revenue</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#475569' }} />Payouts</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }} />Net Profit</span>
          </div>
        </div>

        {/* Revenue Breakdown donut */}
        <div className="stats-chart-card stats-chart-card--narrow">
          <div className="stats-chart-header">
            <div>
              <h2 className="stats-chart-title">Revenue Breakdown</h2>
              <p className="stats-chart-subtitle">December 2024</p>
            </div>
          </div>
          <div className="revenue-donut-wrapper">
            <svg viewBox="0 0 200 200" className="revenue-donut-svg">
              {BREAKDOWN.map((seg) => {
                const dash = (seg.pct / 100) * donutCirc
                const gap = donutCirc - dash
                const currentOffset = donutOffset
                donutOffset += dash
                return (
                  <circle
                    key={seg.label}
                    cx="100" cy="100" r={donutR}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={donutStroke}
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={-currentOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                  />
                )
              })}
            </svg>
          </div>
          <div className="revenue-donut-legend">
            {BREAKDOWN.map((seg) => (
              <div key={seg.label} className="revenue-donut-legend-item">
                <span className="legend-dot" style={{ background: seg.color }} />
                <span className="revenue-donut-legend-label">{seg.label}</span>
                <span className="revenue-donut-legend-pct">{seg.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Transactions ─────────────────── */}
      <div className="admin-data-table-wrapper" style={{ marginTop: 32 }}>
        <div className="revenue-table-header">
          <h2 className="stats-chart-title">Recent Transactions</h2>
          <span className="revenue-table-period">December 2024</span>
        </div>
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {TRANSACTIONS.map((tx, i) => (
              <tr key={i}>
                <td>{tx.date}</td>
                <td>{tx.type}</td>
                <td className={tx.positive ? 'amount-positive' : 'amount-negative'}>{tx.amount}</td>
                <td><span className={`status-badge ${tx.status.toLowerCase()}`}>{tx.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}

export default RevenueManagement
