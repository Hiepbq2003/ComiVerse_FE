import { useCallback, useEffect, useState } from 'react'
import '../../assets/style/author/earnings.css'
import { getAuthorDashboardMetricsApi } from '../../services/api/AuthorComicApi'
import { SkeletonLoader } from '../../components/common/SkeletonLoader'
import CreatorPayoutPanel from '../../components/payout/CreatorPayoutPanel'

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

  useEffect(() => { loadMetrics() }, [loadMetrics])

  const monthlyMetrics = Array.isArray(metrics?.monthlyMetrics) ? metrics.monthlyMetrics : []
  const maxRevenue = Math.max(1, ...monthlyMetrics.map((item) => Number(item.estimatedRevenue) || 0))

  return (
    <>
      <div className="author-page-header">
        <h1>Earnings & Revenue</h1>
        <p>Track monthly revenue and request closed-month payouts through Stripe sandbox.</p>
      </div>

      {loading ? (
        <div style={{ padding: '24px 0' }}><SkeletonLoader type="staggered" count={3} /></div>
      ) : error ? (
        <div className="author-empty-state">
          <h2>Revenue chart unavailable</h2>
          <p>{error}</p>
          <button className="author-primary-btn" onClick={loadMetrics}>Try Again</button>
        </div>
      ) : (
        <div className="author-section-card" style={{ marginBottom: '24px' }}>
          <h2 className="author-section-title">Monthly Revenue Trend</h2>
          {monthlyMetrics.length === 0 ? (
            <div className="author-empty-state"><p>No revenue metrics recorded for the past 12 months.</p></div>
          ) : (
            <div className="earnings-trend-chart-wrapper">
              {monthlyMetrics.map((data, index) => {
                const revenue = Number(data.estimatedRevenue) || 0
                const heightPct = Math.max(5, (revenue / maxRevenue) * 100)
                return (
                  <div className="chart-bar-col" key={data.monthKey || index}>
                    <div className="chart-bar-fill" style={{ height: `${heightPct}%` }}>
                      <span className="chart-bar-tooltip">{formatMoney(revenue)}</span>
                    </div>
                    <span className="chart-bar-label">{data.label || data.monthKey}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <CreatorPayoutPanel heading="Author Monthly Payout" />
    </>
  )
}

export default AuthorEarnings
