import { useCallback, useEffect, useMemo, useState } from 'react'
import '../../assets/style/common/creator-payout.css'
import { getCreatorPayoutOverviewApi } from '../../services/api/PayoutApi'

const formatMoney = (value, currency = 'USD') => (
  new Intl.NumberFormat('vi-VN', {
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
    : parsed.toLocaleString('vi-VN')
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
  const currency = overview?.payoutCurrency
    || overview?.account?.currency
    || 'USD'
  const unitsPerUsd = Number(overview?.payoutUnitsPerUsd) || 1

  const convertUsd = useCallback((value) => (
    (Number(value) || 0) * unitsPerUsd
  ), [unitsPerUsd])

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
        <label className="creator-payout-month">
          Revenue month
          <input
            type="month"
            value={month}
            max={overview?.latestRequestableMonth || overview?.lastClosedMonth || undefined}
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
          <small>
            Accounting base: {formatMoney(overview?.monthlyGrossAmountUsd, 'USD')}
          </small>
        </div>
        <div className="creator-payout-card">
          <span>Withdrawable this month</span>
          <strong>
            {formatMoney(overview?.monthlyWithdrawableAmount, currency)}
          </strong>
          <small>Amount allowed in the payout request</small>
        </div>
        <div className="creator-payout-card">
          <span>Above monthly cap</span>
          <strong>
            {formatMoney(overview?.monthlyOverLimitAmount, currency)}
          </strong>
          <small>Not included in this month payout</small>
        </div>
        <div className="creator-payout-card">
          <span>{isTranslator ? 'Completed tasks' : 'Reward units'}</span>
          <strong>{Number(overview?.calculationUnitCount) || 0}</strong>
          <small>{overview?.calculationUnitLabel || 'units'}</small>
        </div>
        {isTranslator ? (
          <div className="creator-payout-card">
            <span>Rate / completed task</span>
            <strong>
              {formatMoney(
                overview?.calculationUnitRate
                ?? convertUsd(overview?.translatorTaskRateUsd),
                currency,
              )}
            </strong>
            <small>
              Base: {formatMoney(overview?.translatorTaskRateUsd, 'USD')}
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
              Every {Number(overview?.authorViewsPerUnit || 0).toLocaleString('vi-VN')} views / comic
            </small>
          </div>
        )}
        {isTranslator ? (
          <div className="creator-payout-card">
            <span>Monthly limit</span>
            <strong>
              {formatMoney(overview?.monthlyLimitAmount, currency)}
            </strong>
            <small>Configured by Admin in USD</small>
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
              Every {Number(overview?.authorFollowsPerUnit || 0).toLocaleString('vi-VN')} follows / comic
            </small>
          </div>
        )}
      </div>

      {error && <div className="creator-payout-error">{error}</div>}

      <div className="creator-payout-card creator-insight-card">
        <div className="creator-insight-header">
          <div>
            <h3>
              {isTranslator ? 'Task revenue performance' : 'Revenue by comic'}
            </h3>
            <p>
              {isTranslator
                ? 'Revenue generated by your latest completed tasks.'
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
                ? 'Task revenue chart'
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
            {chartItems.length} {isTranslator ? 'tasks' : 'comics'} displayed
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
            Monthly cap: {formatMoney(overview?.monthlyLimitAmount, currency)}
          </span>
          <span>Accounting currency: USD</span>
          <span>Display/transfer currency: {currency}</span>
          <span>
            Conversion rate: 1 USD = {unitsPerUsd.toLocaleString('vi-VN', {
              maximumFractionDigits: 6,
            })} {currency}
          </span>
        </div>
      </div>

      {isTranslator ? (
        <div className="creator-payout-card creator-payout-history">
          <h3>Completed team tasks</h3>
          <p>
            Only a task assigned through <code>assignee_id</code> and completed
            within the selected month is counted.
          </p>
          <div className="creator-payout-table-wrap">
            <table className="creator-payout-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Chapter</th>
                  <th>Completed</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="creator-payout-empty">
                      No eligible completed task was recorded in this month.
                    </td>
                  </tr>
                ) : tasks.map((task) => (
                  <tr key={task.taskId}>
                    <td>{task.taskTitle || 'Untitled task'}</td>
                    <td>
                      {task.chapterNumber
                        ? `Chapter ${task.chapterNumber}`
                        : task.chapterTitle || '—'}
                    </td>
                    <td>{formatDate(task.completedAt)}</td>
                    <td>
                      {formatMoney(convertUsd(task.revenueUsd), currency)}
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
            View and follow reward units are rounded down and calculated
            separately for every comic.
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
                      {Number(comic.monthlyViews || 0).toLocaleString('vi-VN')}
                    </td>
                    <td>
                      {Number(comic.viewUnits || 0).toLocaleString('vi-VN')}
                    </td>
                    <td>
                      {formatMoney(
                        convertUsd(comic.viewRevenueUsd),
                        currency,
                      )}
                    </td>
                    <td>
                      {Number(comic.monthlyFollows || 0).toLocaleString('vi-VN')}
                    </td>
                    <td>
                      {Number(comic.followUnits || 0).toLocaleString('vi-VN')}
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
