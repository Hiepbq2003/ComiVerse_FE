import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import '../../assets/style/common/creator-payout.css'
import { getCreatorPayoutOverviewApi } from '../../services/api/PayoutApi'
import { exportToCsv } from '../../utils/exportToCsv'

const formatMoney = (value, currency = 'USD') => (
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
)

const formatDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('en-US')
}

const formatUnits = (value) => (
  (Number(value) || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })
)

const formatMonthLabel = (monthStr) => {
  if (!monthStr) return ''
  const [year, month] = monthStr.split('-').map(Number)
  if (!year || !month) return monthStr
  const date = new Date(Date.UTC(year, month - 1, 1))
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

const generateMonthOptions = (currentMonth, maxMonth) => {
  const options = []
  const baseDate = maxMonth ? new Date(`${maxMonth}-01T00:00:00Z`) : new Date()
  let y = baseDate.getUTCFullYear()
  let m = baseDate.getUTCMonth() + 1

  if (currentMonth) {
    const [cy, cm] = currentMonth.split('-').map(Number)
    if (cy && cm && (cy > y || (cy === y && cm > m))) {
      y = cy
      m = cm
    }
  }

  for (let i = 0; i < 24; i++) {
    const mStr = `${y}-${String(m).padStart(2, '0')}`
    options.push({ value: mStr, label: formatMonthLabel(mStr) })
    m -= 1
    if (m < 1) {
      m = 12
      y -= 1
    }
  }
  return options
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
      const data = await getCreatorPayoutOverviewApi(
        selectedMonth || undefined,
      )
      setOverview(data || null)
      setMonth(data?.selectedMonth || selectedMonth || '')
    } catch (err) {
      setError(
        err?.response?.data?.message
        || err?.message
        || 'Could not load revenue information.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOverview('')
  }, [loadOverview])

  const role = (overview?.role || '').toUpperCase()
  const isTranslator = role === 'TRANSLATOR'
  const currency = 'USD'
  const convertUsd = useCallback((value) => (
    Number(value) || 0
  ), [])

  const tasks = Array.isArray(overview?.translatorTasks)
    ? overview.translatorTasks
    : []
  const comics = Array.isArray(overview?.authorComics)
    ? overview.authorComics
    : []

  const chartItems = useMemo(
    () => (isTranslator ? tasks : comics).slice(0, 8),
    [isTranslator, tasks, comics],
  )

  const chartValues = chartItems.map((item) => (
    convertUsd(
      isTranslator
        ? item.revenueUsd
        : item.totalRevenueUsd,
    )
  ))
  const chartMax = Math.max(1, ...chartValues)

  const handleExport = () => {
    if (isTranslator) {
      const headers = ['Task', 'Chapter', 'Credited Pages', 'Rate/Page', 'K Factor', 'Settled At', 'Revenue']
      const rows = tasks.map(task => [
        task.taskTitle || 'Untitled task',
        task.chapterNumber ? `Chapter ${task.chapterNumber}` : (task.chapterTitle || '—'),
        task.rowType === 'ADJUSTMENT' ? '—' : `${Number(task.completedPageCount || 0)} / ${Number(task.totalPageCount || 0)}`,
        task.pageRateUsd == null ? '—' : formatMoney(convertUsd(task.pageRateUsd), currency),
        task.averageResponsibilityFactor == null ? '—' : Number(task.averageResponsibilityFactor).toFixed(2),
        formatDate(task.settledAt || task.completedAt),
        formatMoney(convertUsd(task.revenueUsd), currency)
      ])
      exportToCsv(`Translator_Revenue_${month || 'Latest'}`, headers, rows)
    } else {
      const headers = ['Comic', 'Monthly Views', 'View Units', 'View Revenue', 'Monthly Follows', 'Follow Units', 'Follow Revenue', 'Total Revenue']
      const rows = comics.map(comic => [
        comic.comicTitle,
        Number(comic.monthlyViews || 0),
        formatUnits(comic.viewUnits),
        formatMoney(convertUsd(comic.viewRevenueUsd), currency),
        Number(comic.monthlyFollows || 0),
        formatUnits(comic.followUnits),
        formatMoney(convertUsd(comic.followRevenueUsd), currency),
        formatMoney(convertUsd(comic.totalRevenueUsd), currency)
      ])
      exportToCsv(`Author_Revenue_${month || 'Latest'}`, headers, rows)
    }
  }

  if (loading && !overview) {
    return (
      <div className="creator-payout-card creator-payout-loading">
        Loading revenue information...
      </div>
    )
  }

  return (
    <section className="creator-payout-panel creator-revenue-panel">
      <div className="creator-payout-card creator-payout-head">
        <div>
          <h2>{heading}</h2>
          <p>
            {overview?.calculationPolicy
              || 'Monthly revenue is calculated by the server.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <label className="creator-payout-month">
            Revenue month
            <select
              value={month}
              onChange={(event) => {
                const value = event.target.value
                setMonth(value)
                loadOverview(value)
              }}
              style={{
                cursor: 'pointer',
                background: 'var(--author-card-bg, #fff)',
                minWidth: '170px'
              }}
            >
              {generateMonthOptions(
                month,
                overview?.latestRequestableMonth || overview?.lastClosedMonth
              ).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button 
            type="button" 
            className="author-secondary-btn" 
            onClick={handleExport} 
            disabled={loading || !overview}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="creator-payout-summary creator-payout-summary--six">
        <div className="creator-payout-card">
          <span>{isTranslator ? 'Settled in selected month' : 'Gross revenue'}</span>
          <strong>{formatMoney(overview?.monthlyGrossAmount, currency)}</strong>
          <small>
            Accounting base: {formatMoney(overview?.monthlyGrossAmountUsd, 'USD')}
          </small>
        </div>
        <div className="creator-payout-card">
          <span>{isTranslator ? 'Accumulated available balance' : 'Withdrawable this month'}</span>
          <strong>
            {formatMoney(isTranslator ? overview?.availableBalanceAmount : overview?.monthlyWithdrawableAmount, currency)}
          </strong>
          <small>{isTranslator ? 'Closed-month balance carried forward after payouts' : 'Amount allowed in the payout request'}</small>
        </div>
        <div className="creator-payout-card">
          <span>{isTranslator ? 'Pending current month' : 'Above monthly cap'}</span>
          <strong>
            {formatMoney(isTranslator ? overview?.pendingCurrentMonthAmount : overview?.monthlyOverLimitAmount, currency)}
          </strong>
          <small>{isTranslator ? 'Visible estimate; added after the month closes' : 'Not included in this month payout'}</small>
        </div>
        <div className="creator-payout-card">
          <span>{isTranslator ? 'Credited pages' : 'Reward units'}</span>
          <strong>{formatUnits(overview?.calculationUnitCount)}</strong>
          <small>{overview?.calculationUnitLabel || 'units'}</small>
        </div>
        {isTranslator ? (
          <div className="creator-payout-card">
            <span>Default rate / page</span>
            <strong>
              {formatMoney(
                overview?.calculationUnitRate
                ?? convertUsd(overview?.translatorPageRateUsd ?? overview?.translatorTaskRateUsd),
                currency,
              )}
            </strong>
            <small>
              Base: {formatMoney(overview?.translatorPageRateUsd ?? overview?.translatorTaskRateUsd, 'USD')}
            </small>
          </div>
        ) : (
          <div className="creator-payout-card">
            <span>View reward</span>
            <strong>
              {formatMoney(
                convertUsd(overview?.authorViewUnitRateUsd),
                currency,
              )}
            </strong>
            <small>
              Rate basis: {Number(overview?.authorViewsPerUnit || 0).toLocaleString('en-US')} views / comic; partial units paid
            </small>
          </div>
        )}
        {isTranslator ? (
          <div className="creator-payout-card">
            <span>Cumulative earnings</span>
            <strong>
              {formatMoney(overview?.cumulativeEarnedAmount, currency)}
            </strong>
            <small>No monthly earning cap; unpaid balance carries forward</small>
          </div>
        ) : (
          <div className="creator-payout-card">
            <span>Follow reward</span>
            <strong>
              {formatMoney(
                convertUsd(overview?.authorFollowUnitRateUsd),
                currency,
              )}
            </strong>
            <small>
              Rate basis: {Number(overview?.authorFollowsPerUnit || 0).toLocaleString('en-US')} follows / comic; partial units paid
            </small>
          </div>
        )}
      </div>

      {error && <div className="creator-payout-error">{error}</div>}

      <div className="creator-payout-card creator-insight-card">
        <div className="creator-insight-header">
          <div>
            <h3>
              {isTranslator ? 'Chapter settlement performance' : 'Revenue by comic'}
            </h3>
            <p>
              {isTranslator
                ? 'Revenue allocated from fully approved chapters, grouped by settlement.'
                : 'Compare the titles contributing most to this month’s revenue.'}
            </p>
          </div>
          <span className="creator-insight-badge">
            {month || 'Latest month'}
          </span>
        </div>

        {chartItems.length === 0 ? (
          <div className="creator-chart-empty">
            Chart data will appear when revenue is recorded.
          </div>
        ) : (
          <div
            className="creator-bar-chart"
            role="img"
            aria-label={
              isTranslator
                ? 'Chapter settlement revenue chart'
                : 'Comic revenue chart'
            }
          >
            {chartItems.map((item, index) => {
              const amount = chartValues[index] || 0
              const label = isTranslator
                ? item.taskTitle || `Task ${index + 1}`
                : item.comicTitle || `Comic ${index + 1}`

              return (
                <div
                  className="creator-bar-item"
                  key={item.taskId || item.comicId || index}
                >
                  <div className="creator-bar-value">
                    {formatMoney(amount, currency)}
                  </div>
                  <div className="creator-bar-track">
                    <div
                      className="creator-bar-fill"
                      style={{
                        height: `${Math.max(6, (amount / chartMax) * 100)}%`,
                      }}
                    />
                  </div>
                  <span title={label}>{label}</span>
                </div>
              )
            })}
          </div>
        )}

        <div className="creator-chart-legend">
          <span><i className="purple" /> Revenue generated</span>
          <span>
            {chartItems.length} {isTranslator ? 'settlements' : 'comics'} displayed
          </span>
        </div>
      </div>

      <div className="creator-payout-card creator-revenue-rule-card">
        <div>
          <h3>Revenue calculation</h3>
          <p>{overview?.calculationPolicy || '—'}</p>
        </div>
        <div className="creator-payout-account-meta">
          <span>
            {isTranslator
              ? `Available balance: ${formatMoney(overview?.availableBalanceAmount, currency)}`
              : `Monthly cap: ${formatMoney(overview?.monthlyLimitAmount, currency)}`}
          </span>
          <span>Accounting & transfer currency: USD</span>
        </div>
      </div>

      {isTranslator ? (
        <div className="creator-payout-card creator-payout-history">
          <h3>Page earnings from approved chapters</h3>
          <p>
            A page can be assigned to a previous or current translator, but no earning is credited until every page in the chapter is DONE and the chapter is approved. Coefficient K is applied to the previous translator during handover.
          </p>
          <div className="creator-payout-table-wrap">
            <table className="creator-payout-table creator-payout-table--wide">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Chapter</th>
                  <th>Credited pages</th>
                  <th>Rate / page</th>
                  <th>K</th>
                  <th>Settled</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="creator-payout-empty">
                      No approved chapter settlement or adjustment was recorded in this month.
                    </td>
                  </tr>
                ) : tasks.map((task, index) => (
                  <tr key={`${task.settlementId || task.taskId || 'row'}-${task.rowType || index}`}>
                    <td>
                      {task.taskTitle || 'Untitled task'}
                      {task.rowType === 'ADJUSTMENT' && <div><small>Adjustment</small></div>}
                    </td>
                    <td>
                      {task.chapterNumber
                        ? `Chapter ${task.chapterNumber}`
                        : task.chapterTitle || '—'}
                    </td>
                    <td>
                      {task.rowType === 'ADJUSTMENT'
                        ? '—'
                        : `${Number(task.completedPageCount || 0)} / ${Number(task.totalPageCount || 0)}`}
                    </td>
                    <td>{task.pageRateUsd == null ? '—' : formatMoney(convertUsd(task.pageRateUsd), currency)}</td>
                    <td>{task.averageResponsibilityFactor == null ? '—' : Number(task.averageResponsibilityFactor).toFixed(2)}</td>
                    <td>{formatDate(task.settledAt || task.completedAt)}</td>
                    <td title={task.note || ''}>
                      <strong>{formatMoney(convertUsd(task.revenueUsd), currency)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="creator-payout-card creator-payout-history">
          <h3>Comic revenue breakdown</h3>
          <p>
            View and follow rewards are calculated proportionally for every comic. Partial units are paid instead of being rounded down.
          </p>
          <div className="creator-payout-table-wrap">
            <table className="creator-payout-table creator-payout-table--wide">
              <thead>
                <tr>
                  <th>Comic</th>
                  <th>Monthly views</th>
                  <th>View units</th>
                  <th>View revenue</th>
                  <th>Monthly follows</th>
                  <th>Follow units</th>
                  <th>Follow revenue</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {comics.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="creator-payout-empty">
                      No comic view/follow metrics were recorded in this month.
                    </td>
                  </tr>
                ) : comics.map((comic) => (
                  <tr key={comic.comicId}>
                    <td>{comic.comicTitle}</td>
                    <td>
                      {Number(comic.monthlyViews || 0).toLocaleString('en-US')}
                    </td>
                    <td>
                      {formatUnits(comic.viewUnits)}
                    </td>
                    <td>
                      {formatMoney(
                        convertUsd(comic.viewRevenueUsd),
                        currency,
                      )}
                    </td>
                    <td>
                      {Number(comic.monthlyFollows || 0).toLocaleString('en-US')}
                    </td>
                    <td>
                      {formatUnits(comic.followUnits)}
                    </td>
                    <td>
                      {formatMoney(
                        convertUsd(comic.followRevenueUsd),
                        currency,
                      )}
                    </td>
                    <td>
                      <strong>
                        {formatMoney(
                          convertUsd(comic.totalRevenueUsd),
                          currency,
                        )}
                      </strong>
                    </td>
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
