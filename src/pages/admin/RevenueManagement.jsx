import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  CreditCard,
  Download,
  RefreshCw,
  RotateCcw,
  Users
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import {
  getAdminPaymentLogsApi,
  getAdminPaymentStatisticsApi
} from '../../services/api/SubscriptionApi'
import { exportToCsv } from '../../utils/exportToCsv'
import '../../assets/style/admin/revenue.css'

const RANGE_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 365, label: 'Last 12 months' }
]

const STATUS_META = {
  PAID: { label: 'Paid', color: '#10b981' },
  PENDING: { label: 'Pending', color: '#f59e0b' },
  FAILED: { label: 'Failed', color: '#ef4444' },
  EXPIRED: { label: 'Expired', color: '#f97316' },
  REFUNDED: { label: 'Refunded', color: '#3b82f6' }
}

const EMPTY_SUMMARY = {
  totalTransactions: 0,
  paidPayments: 0,
  uniquePayingUsers: 0,
  pendingPayments: 0,
  failedPayments: 0,
  expiredPayments: 0,
  refundedPayments: 0,
  grossRevenue: 0,
  averageOrderValue: 0,
  successRate: 0,
  activeSubscriptions: 0,
  revenueChangePercent: null,
  paidPaymentsChangePercent: null
}

function formatMoney(value, currency = 'USD') {
  const amount = Number(value || 0)
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    return `${amount.toLocaleString()} ${currency}`
  }
}

function formatCompactMoney(value, currency = 'USD') {
  const amount = Number(value || 0)
  try {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount)
  } catch {
    return amount.toLocaleString()
  }
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatShortDate(value) {
  if (!value) return ''
  const [year, month, day] = String(value).split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short'
  })
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`
}

function deltaMeta(value, noun) {
  if (value === null || value === undefined) {
    return { text: 'No previous-period baseline', tone: 'neutral' }
  }
  const amount = Number(value)
  if (amount === 0) return { text: `No change in ${noun}`, tone: 'neutral' }
  return {
    text: `${amount > 0 ? '+' : ''}${amount.toFixed(1)}% vs previous period`,
    tone: amount > 0 ? 'positive' : 'negative'
  }
}

function RevenueChart({ series, currency }) {
  const width = 920
  const height = 300
  const padding = { left: 74, right: 22, top: 24, bottom: 48 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const values = series.map((point) => Number(point.revenue || 0))
  const maximum = Math.max(1, ...values)
  const baseline = padding.top + chartHeight
  const denominator = Math.max(series.length - 1, 1)

  const coordinates = series.map((point, index) => ({
    ...point,
    x: padding.left + (index / denominator) * chartWidth,
    y: padding.top + (1 - Number(point.revenue || 0) / maximum) * chartHeight
  }))
  const linePath = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = coordinates.length
    ? `M ${coordinates[0].x} ${baseline} ${coordinates.map((point) => `L ${point.x} ${point.y}`).join(' ')} L ${coordinates[coordinates.length - 1].x} ${baseline} Z`
    : ''
  const labelStep = Math.max(1, Math.ceil(series.length / 6))

  return (
    <div className="payment-revenue-chart" role="img" aria-label="Paid revenue trend">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="paymentRevenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + (1 - ratio) * chartHeight
          return (
            <g key={ratio}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="payment-chart-grid" />
              <text x={padding.left - 12} y={y + 4} textAnchor="end" className="payment-chart-axis-label">
                {formatCompactMoney(maximum * ratio, currency)}
              </text>
            </g>
          )
        })}

        {areaPath && <path d={areaPath} fill="url(#paymentRevenueGradient)" />}
        {linePath && <path d={linePath} className="payment-chart-line" />}

        {coordinates.length <= 90 && coordinates.map((point) => (
          <circle key={point.date} cx={point.x} cy={point.y} r="3.5" className="payment-chart-point">
            <title>{formatShortDate(point.date)}: {formatMoney(point.revenue, currency)} · {point.paidPayments || 0} paid</title>
          </circle>
        ))}

        {coordinates.map((point, index) => {
          const visible = index === 0 || index === coordinates.length - 1 || index % labelStep === 0
          if (!visible) return null
          return (
            <text key={`label-${point.date}`} x={point.x} y={height - 14} textAnchor="middle" className="payment-chart-axis-label">
              {formatShortDate(point.date)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function RevenueManagement() {
  const [days, setDays] = useState(30)
  const [statistics, setStatistics] = useState(null)
  const [recentPayments, setRecentPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadStatistics = useCallback(async () => {
    setLoading(true)
    setError('')

    const params = { days, zoneId: 'Asia/Ho_Chi_Minh', currency: 'USD' }

    const [statisticsResult, logsResult] = await Promise.allSettled([
      getAdminPaymentStatisticsApi(params),
      getAdminPaymentLogsApi({ page: 0, size: 6 })
    ])

    if (statisticsResult.status === 'rejected') {
      const requestError = statisticsResult.reason
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to load payment statistics.')
      setLoading(false)
      return
    }

    setStatistics(statisticsResult.value)
    setRecentPayments(
      logsResult.status === 'fulfilled' && Array.isArray(logsResult.value?.content)
        ? logsResult.value.content
        : []
    )
    setLoading(false)
  }, [days])

  useEffect(() => {
    loadStatistics()
  }, [loadStatistics])

  const summary = statistics?.summary || EMPTY_SUMMARY
  const selectedCurrency = 'USD'
  const dailySeries = Array.isArray(statistics?.dailySeries) ? statistics.dailySeries : []
  const statusBreakdown = Array.isArray(statistics?.statusBreakdown) ? statistics.statusBreakdown : []
  const planBreakdown = Array.isArray(statistics?.planBreakdown) ? statistics.planBreakdown : []

  const revenueDelta = deltaMeta(summary.revenueChangePercent, 'revenue')
  const paymentsDelta = deltaMeta(summary.paidPaymentsChangePercent, 'paid payments')

  const cards = useMemo(() => [
    {
      label: 'Collected revenue',
      value: formatMoney(summary.grossRevenue, selectedCurrency),
      detail: revenueDelta.text,
      tone: revenueDelta.tone,
      icon: CircleDollarSign,
      color: 'purple'
    },
    {
      label: 'Paid payments',
      value: Number(summary.paidPayments || 0).toLocaleString('en-US'),
      detail: paymentsDelta.text,
      tone: paymentsDelta.tone,
      icon: BadgeCheck,
      color: 'green'
    },
    {
      label: 'Payment success rate',
      value: formatPercent(summary.successRate),
      detail: 'Pending attempts are excluded',
      tone: 'neutral',
      icon: CreditCard,
      color: 'blue'
    },
    {
      label: 'Active Premium',
      value: Number(summary.activeSubscriptions || 0).toLocaleString('en-US'),
      detail: 'Active and trialing subscriptions',
      tone: 'neutral',
      icon: Users,
      color: 'orange'
    }
  ], [paymentsDelta, revenueDelta, selectedCurrency, summary])

  const handleExport = () => {
    const period = statistics?.period
    const rows = [
      ['Summary', 'Collected revenue', summary.grossRevenue, summary.paidPayments, '', selectedCurrency],
      ['Summary', 'Average order value', summary.averageOrderValue, '', '', selectedCurrency],
      ['Summary', 'Success rate', '', summary.totalTransactions, summary.failedPayments, formatPercent(summary.successRate)],
      ...dailySeries.map((point) => [
        'Daily',
        point.date,
        point.revenue,
        point.paidPayments,
        Number(point.failedPayments || 0) + Number(point.expiredPayments || 0),
        selectedCurrency
      ])
    ]
    exportToCsv(
      `ComiVerse_Payment_Statistics_${period?.from || ''}_${period?.to || ''}`,
      ['Section', 'Date / Metric', 'Revenue', 'Paid payments', 'Failed / expired', 'Currency / Value'],
      rows
    )
  }

  return (
    <AdminLayout activeNav="revenue">
      <div className="admin-revenue-screen">
        <div className="admin-page-header payment-statistics-header">
          <div className="admin-page-header-info">
            <h1>Payment Statistics</h1>
            <p>Verified Stripe payment performance and Premium subscription health</p>
          </div>
          <div className="payment-statistics-actions">
            <label className="payment-filter-control">
              <span>Period</span>
              <select value={days} onChange={(event) => setDays(Number(event.target.value))} disabled={loading}>
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="payment-filter-control">
              <span>Currency</span>
              <select value="USD" disabled aria-label="Currency">
                <option value="USD">USD</option>
              </select>
            </label>
            <button type="button" className="admin-btn payment-action-btn" onClick={loadStatistics} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
            </button>
            <button type="button" className="admin-btn admin-btn--primary payment-action-btn" onClick={handleExport} disabled={loading || !statistics}>
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="payment-statistics-loading" aria-label="Loading payment statistics">
            <div className="payment-loading-kpi-grid">
              {[0, 1, 2, 3].map((item) => <div key={item} className="payment-loading-block payment-loading-kpi" />)}
            </div>
            <div className="payment-loading-block payment-loading-chart" />
            <div className="payment-loading-panel-grid">
              <div className="payment-loading-block payment-loading-panel" />
              <div className="payment-loading-block payment-loading-panel" />
            </div>
          </div>
        ) : error ? (
          <section className="payment-statistics-error">
            <AlertCircle size={30} />
            <div>
              <h2>Payment statistics are unavailable</h2>
              <p>{error}</p>
            </div>
            <button type="button" className="admin-btn admin-btn--primary" onClick={loadStatistics}>Try again</button>
          </section>
        ) : (
          <>
            <div className="payment-period-banner">
              <span>
                Reporting <strong>{formatShortDate(statistics?.period?.from)} – {formatShortDate(statistics?.period?.to)}</strong>
              </span>
              <span>Time zone: {statistics?.period?.zoneId || 'Asia/Ho_Chi_Minh'}</span>
              <span>Generated: {formatDate(statistics?.generatedAt)}</span>
            </div>

            <div className="payment-kpi-grid">
              {cards.map((card) => {
                const Icon = card.icon
                return (
                  <article key={card.label} className={`payment-kpi-card payment-kpi-card--${card.color}`}>
                    <div className="payment-kpi-top">
                      <span>{card.label}</span>
                      <span className="payment-kpi-icon"><Icon size={18} /></span>
                    </div>
                    <strong>{card.value}</strong>
                    <small className={`payment-kpi-delta payment-kpi-delta--${card.tone}`}>{card.detail}</small>
                  </article>
                )
              })}
            </div>

            <div className="payment-insight-strip">
              <div><span>Average order</span><strong>{formatMoney(summary.averageOrderValue, selectedCurrency)}</strong></div>
              <div><span>Unique paying readers</span><strong>{Number(summary.uniquePayingUsers || 0).toLocaleString('en-US')}</strong></div>
              <div><span>Pending payments</span><strong>{Number(summary.pendingPayments || 0).toLocaleString('en-US')}</strong></div>
              <div><span>Failed / expired</span><strong>{Number(summary.failedPayments || 0) + Number(summary.expiredPayments || 0)}</strong></div>
            </div>

            <section className="payment-panel payment-trend-panel">
              <div className="payment-panel-header">
                <div>
                  <h2>Collected revenue trend</h2>
                  <p>Revenue is booked on the day a transaction reaches PAID</p>
                </div>
                <div className="payment-chart-legend">
                  <span><i /> Paid revenue</span>
                  <strong>{selectedCurrency}</strong>
                </div>
              </div>
              <RevenueChart series={dailySeries} currency={selectedCurrency} />
            </section>

            <div className="payment-breakdown-grid">
              <section className="payment-panel">
                <div className="payment-panel-header">
                  <div>
                    <h2>Transaction status</h2>
                    <p>{Number(summary.totalTransactions || 0).toLocaleString('en-US')} attempts created in this period</p>
                  </div>
                </div>
                <div className="payment-status-list">
                  {statusBreakdown.map((item) => {
                    const meta = STATUS_META[item.status] || { label: item.status, color: '#94a3b8' }
                    return (
                      <div key={item.status} className="payment-status-row">
                        <div className="payment-status-row-top">
                          <span><i style={{ background: meta.color }} /> {meta.label}</span>
                          <strong>{Number(item.count || 0).toLocaleString('en-US')} <small>{formatPercent(item.percentage)}</small></strong>
                        </div>
                        <div className="payment-progress-track">
                          <div style={{ width: `${Math.max(0, Number(item.percentage || 0))}%`, background: meta.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="payment-panel">
                <div className="payment-panel-header">
                  <div>
                    <h2>Revenue by plan</h2>
                    <p>Plan snapshot stored with each paid transaction</p>
                  </div>
                </div>
                {planBreakdown.length === 0 ? (
                  <div className="payment-empty-state">
                    <CircleDollarSign size={28} />
                    <span>No paid transactions in this period.</span>
                  </div>
                ) : (
                  <div className="payment-plan-list">
                    {planBreakdown.map((plan) => (
                      <div key={plan.planId || plan.planCode} className="payment-plan-row">
                        <div className="payment-plan-copy">
                          <span className="payment-plan-code">{plan.planCode}</span>
                          <div>
                            <strong>{plan.planName}</strong>
                            <small>{Number(plan.paidPayments || 0).toLocaleString('en-US')} paid payments</small>
                          </div>
                        </div>
                        <div className="payment-plan-value">
                          <strong>{formatMoney(plan.revenue, selectedCurrency)}</strong>
                          <span>{formatPercent(plan.revenueSharePercent)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="payment-panel payment-recent-panel">
              <div className="payment-panel-header">
                <div>
                  <h2>Recent payment activity</h2>
                  <p>Latest transaction records across all statuses</p>
                </div>
                <Link to="/admin/subscriptions?tab=payments" className="payment-view-all">
                  View all logs <ArrowRight size={15} />
                </Link>
              </div>
              <div className="payment-table-scroll">
                <table className="payment-recent-table">
                  <thead>
                    <tr>
                      <th>Created</th>
                      <th>Reader</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.length === 0 ? (
                      <tr><td colSpan="5" className="payment-table-empty">No payment records yet.</td></tr>
                    ) : recentPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.createdAt)}</td>
                        <td><strong>{payment.userEmail || 'Unknown reader'}</strong></td>
                        <td><span className="payment-plan-code">{payment.planCode}</span> {payment.planName}</td>
                        <td className="payment-table-amount">{formatMoney(payment.amount, payment.currency)}</td>
                        <td><span className={`payment-status-badge ${String(payment.status || '').toLowerCase()}`}>{payment.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="payment-data-note">
              <RotateCcw size={15} />
              <span>Revenue uses verified PAID time; status counts use transaction creation time. All monetary totals are stored and reported in USD.</span>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

export default RevenueManagement
