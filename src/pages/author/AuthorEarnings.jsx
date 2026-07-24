import { useState, useEffect, useCallback } from 'react'
import '../../assets/style/author/earnings.css'
import { getAuthorDashboardMetricsApi } from '../../services/api/AuthorComicApi'
import { SkeletonLoader } from '../../components/common/SkeletonLoader'

const formatMoney = (value) => `${new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
}).format(Number(value) || 0)}đ`

function AuthorEarnings() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getAuthorDashboardMetricsApi(12)
      setMetrics(data || null)
    } catch (err) {
      console.error('Failed to load author earnings metrics:', err)
      setError(err?.response?.data?.message || err?.message || 'Could not load earnings metrics.')
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  const summary = metrics?.summary || {}
  const monthlyMetrics = Array.isArray(metrics?.monthlyMetrics) ? metrics.monthlyMetrics : []
  const payouts = Array.isArray(metrics?.payouts) ? metrics.payouts : []

  const maxRevenue = Math.max(1, ...monthlyMetrics.map(m => Number(m.estimatedRevenue) || 0))

  return (
    <>
      <div className="author-page-header">
        <h1>Earnings & Revenue</h1>
        <p>Track your monthly revenue stats, check payout trends, and view transaction records.</p>
      </div>

      {loading ? (
        <div style={{ padding: '24px 0' }}>
          <SkeletonLoader type="staggered" count={3} />
        </div>
      ) : error ? (
        <div className="author-empty-state">
          <h2>Earnings metrics unavailable</h2>
          <p>{error}</p>
          <button className="author-primary-btn" onClick={loadMetrics}>Try Again</button>
        </div>
      ) : (
        <div className="earnings-container">
          {/* Left column: Trend chart & Payout History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Trend Chart */}
            <div className="author-section-card">
              <h2 className="author-section-title">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                Monthly Revenue Trend
              </h2>

              {monthlyMetrics.length === 0 ? (
                <div className="author-empty-state">
                  <p>No revenue metrics recorded for the past 12 months.</p>
                </div>
              ) : (
                <div className="earnings-trend-chart-wrapper">
                  {monthlyMetrics.map((data, idx) => {
                    const revenue = Number(data.estimatedRevenue) || 0
                    const heightPct = maxRevenue > 0 ? Math.max(5, (revenue / maxRevenue) * 100) : 5
                    return (
                      <div className="chart-bar-col" key={data.monthKey || idx}>
                        <div 
                          className="chart-bar-fill" 
                          style={{ height: `${heightPct}%` }}
                        >
                          <span className="chart-bar-tooltip">{formatMoney(revenue)}</span>
                        </div>
                        <span className="chart-bar-label">{data.label || data.monthKey}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Payout History Table */}
            <div className="author-section-card">
              <h2 className="author-section-title">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
                Payout History
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-premium">
                  <thead>
                    <tr>
                      <th>Payout Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                          No payout transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      payouts.map((payout, idx) => (
                        <tr key={payout.id || idx}>
                          <td>{payout.date || 'Recent'}</td>
                          <td style={{ fontWeight: '600' }}>{formatMoney(payout.amount)}</td>
                          <td className="author-cell-muted">{payout.method || 'Bank Transfer'}</td>
                          <td>
                            <span className={`badge-status-payout ${(payout.status || 'pending').toLowerCase()}`}>
                              {payout.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right column: Summary Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="author-section-card" style={{ height: 'fit-content' }}>
              <h2 className="author-section-title">Summary</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span className="author-summary-label" style={{ fontSize: '13px', display: 'block' }}>Next Estimated Payout</span>
                  <span className="author-summary-value" style={{ fontSize: '24px', fontWeight: '700', color: '#c084fc' }}>
                    {formatMoney(summary.estimatedRevenue || 0)}
                  </span>
                  <span className="author-summary-muted" style={{ fontSize: '12px', display: 'block', marginTop: '2px' }}>
                    Based on current published chapter performance
                  </span>
                </div>
                
                <div className="author-summary-block">
                  <span className="author-summary-label" style={{ fontSize: '13px', display: 'block' }}>Lifetime Earnings</span>
                  <span className="author-summary-value" style={{ fontSize: '20px', fontWeight: '600' }}>
                    {formatMoney(summary.estimatedRevenue || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AuthorEarnings