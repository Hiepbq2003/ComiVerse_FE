import { useCallback, useEffect, useState } from 'react'
import '../../assets/style/common/creator-payout.css'
import { getCreatorPayoutOverviewApi } from '../../services/api/PayoutApi'

const formatMoney = (value, currency = 'VND') => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: currency || 'VND',
  maximumFractionDigits: currency === 'VND' ? 0 : 2,
}).format(Number(value) || 0)

const formatDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('vi-VN')
}

function CreatorRevenuePanel({ heading = 'Monthly Revenue' }) {
  const [month, setMonth] = useState('')
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOverview = useCallback(async (selectedMonth) => {
    try {
      setLoading(true)
      setError('')
      const data = await getCreatorPayoutOverviewApi(selectedMonth || undefined)
      setOverview(data || null)
      setMonth(data?.selectedMonth || selectedMonth || '')
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load revenue information.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadOverview('') }, [loadOverview])

  if (loading && !overview) {
    return <div className="creator-payout-card creator-payout-loading">Loading revenue information...</div>
  }

  const role = (overview?.role || '').toUpperCase()
  const isTranslator = role === 'TRANSLATOR'
  const currency = isTranslator ? 'VND' : overview?.payoutCurrency || overview?.account?.currency || 'VND'
  const tasks = Array.isArray(overview?.translatorTasks) ? overview.translatorTasks : []
  const comics = Array.isArray(overview?.authorComics) ? overview.authorComics : []

  return (
    <section className="creator-payout-panel creator-revenue-panel">
      <div className="creator-payout-card creator-payout-head">
        <div>
          <h2>{heading}</h2>
          <p>{overview?.calculationPolicy || 'Monthly revenue is calculated by the server.'}</p>
        </div>
        <label className="creator-payout-month">Revenue month
          <input
            type="month"
            value={month}
            max={overview?.lastClosedMonth || undefined}
            onChange={(event) => {
              const value = event.target.value
              setMonth(value)
              loadOverview(value)
            }}
          />
        </label>
      </div>

      <div className="creator-payout-summary creator-payout-summary--six">
        <div className="creator-payout-card">
          <span>Gross revenue</span>
          <strong>{formatMoney(overview?.monthlyGrossAmount, currency)}</strong>
          <small>{isTranslator ? 'Calculated directly in VND' : `${formatMoney(overview?.monthlyGrossAmountVnd, 'VND')} before cap`}</small>
        </div>
        <div className="creator-payout-card">
          <span>Withdrawable this month</span>
          <strong>{formatMoney(overview?.monthlyWithdrawableAmount, currency)}</strong>
          <small>Amount allowed in the payout request</small>
        </div>
        <div className="creator-payout-card">
          <span>Above monthly cap</span>
          <strong>{formatMoney(overview?.monthlyOverLimitAmount, currency)}</strong>
          <small>{isTranslator ? 'Not included in this month payout' : `${formatMoney(overview?.monthlyOverLimitAmountVnd, 'VND')} not included`}</small>
        </div>
        <div className="creator-payout-card">
          <span>{isTranslator ? 'Completed tasks' : 'Reward units'}</span>
          <strong>{Number(overview?.calculationUnitCount) || 0}</strong>
          <small>{overview?.calculationUnitLabel || 'units'}</small>
        </div>
        {isTranslator ? (
          <div className="creator-payout-card">
            <span>Rate / completed task</span>
            <strong>{formatMoney(overview?.translatorTaskRateVnd, 'VND')}</strong>
            <small>Managed by Admin</small>
          </div>
        ) : (
          <div className="creator-payout-card">
            <span>View reward</span>
            <strong>{formatMoney(overview?.authorViewUnitRateVnd, 'VND')}</strong>
            <small>Every {Number(overview?.authorViewsPerUnit || 0).toLocaleString('vi-VN')} views / comic</small>
          </div>
        )}
        {isTranslator ? (
          <div className="creator-payout-card">
            <span>Monthly limit</span>
            <strong>{formatMoney(overview?.monthlyLimitAmount, currency)}</strong>
            <small>Fixed Translator cap in VND</small>
          </div>
        ) : (
          <div className="creator-payout-card">
            <span>Follow reward</span>
            <strong>{formatMoney(overview?.authorFollowUnitRateVnd, 'VND')}</strong>
            <small>Every {Number(overview?.authorFollowsPerUnit || 0).toLocaleString('vi-VN')} follows / comic</small>
          </div>
        )}
      </div>

      {error && <div className="creator-payout-error">{error}</div>}

      <div className="creator-payout-card creator-revenue-rule-card">
        <div>
          <h3>Revenue calculation</h3>
          <p>{overview?.calculationPolicy || '—'}</p>
        </div>
        <div className="creator-payout-account-meta">
          <span>Monthly cap: {formatMoney(overview?.monthlyLimitAmountVnd, 'VND')}</span>
          {isTranslator ? (
            <>
              <span>Display/transfer currency: VND</span>
              <span>No currency conversion is applied to Translator revenue or payout.</span>
            </>
          ) : (
            <>
              <span>Country: {overview?.accountCountry || 'VN'}</span>
              <span>Display/transfer currency: {currency}</span>
              <span>Manual test rate: 1 {currency} = {Number(overview?.exchangeRateVndPerUnit || 1).toLocaleString('vi-VN')} VND</span>
            </>
          )}
        </div>
      </div>

      {isTranslator ? (
        <div className="creator-payout-card creator-payout-history">
          <h3>Completed team tasks</h3>
          <p>Only a task assigned through <code>assignee_id</code> and completed within the selected month is counted.</p>
          <div className="creator-payout-table-wrap">
            <table className="creator-payout-table">
              <thead><tr><th>Task</th><th>Chapter</th><th>Completed</th><th>Revenue</th></tr></thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr><td colSpan="4" className="creator-payout-empty">No eligible completed task was recorded in this month.</td></tr>
                ) : tasks.map((task) => (
                  <tr key={task.taskId}>
                    <td>{task.taskTitle || 'Untitled task'}</td>
                    <td>{task.chapterNumber ? `Chapter ${task.chapterNumber}` : task.chapterTitle || '—'}</td>
                    <td>{formatDate(task.completedAt)}</td>
                    <td>{formatMoney(task.revenueVnd, 'VND')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="creator-payout-card creator-payout-history">
          <h3>Comic revenue breakdown</h3>
          <p>View and follow reward units are rounded down and calculated separately for every comic.</p>
          <div className="creator-payout-table-wrap">
            <table className="creator-payout-table creator-payout-table--wide">
              <thead><tr><th>Comic</th><th>Monthly views</th><th>View units</th><th>View revenue</th><th>Monthly follows</th><th>Follow units</th><th>Follow revenue</th><th>Total</th></tr></thead>
              <tbody>
                {comics.length === 0 ? (
                  <tr><td colSpan="8" className="creator-payout-empty">No comic view/follow metrics were recorded in this month.</td></tr>
                ) : comics.map((comic) => (
                  <tr key={comic.comicId}>
                    <td>{comic.comicTitle}</td>
                    <td>{Number(comic.monthlyViews || 0).toLocaleString('vi-VN')}</td>
                    <td>{Number(comic.viewUnits || 0).toLocaleString('vi-VN')}</td>
                    <td>{formatMoney(comic.viewRevenueVnd, 'VND')}</td>
                    <td>{Number(comic.monthlyFollows || 0).toLocaleString('vi-VN')}</td>
                    <td>{Number(comic.followUnits || 0).toLocaleString('vi-VN')}</td>
                    <td>{formatMoney(comic.followRevenueVnd, 'VND')}</td>
                    <td><strong>{formatMoney(comic.totalRevenueVnd, 'VND')}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

export default CreatorRevenuePanel
