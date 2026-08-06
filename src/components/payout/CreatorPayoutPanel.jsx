import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import '../../assets/style/common/creator-payout.css'
import {
  createCreatorPayoutRequestApi,
  getCreatorPayoutAccountApi,
  getCreatorPayoutOverviewApi,
  startCreatorPayoutOnboardingApi,
  syncCreatorPayoutAccountApi,
} from '../../services/api/PayoutApi'

let onboardingRedirectInProgress = false
let onboardingReturnPromise = null
const payoutOverviewRequests = new Map()

const FALLBACK_CURRENCIES = [
  { currencyCode: 'USD', displayName: 'US Dollar', symbol: '$', active: true },
  { currencyCode: 'EUR', displayName: 'Euro', symbol: '€', active: true },
  { currencyCode: 'CNY', displayName: 'Chinese Yuan', symbol: '¥', active: true },
]

const getPayoutOverviewDeduped = (month) => {
  const key = month || 'LATEST_REQUESTABLE_MONTH'
  const existing = payoutOverviewRequests.get(key)
  if (existing) return existing

  const request = getCreatorPayoutOverviewApi(month || undefined)
    .finally(() => {
      if (payoutOverviewRequests.get(key) === request) {
        payoutOverviewRequests.delete(key)
      }
    })

  payoutOverviewRequests.set(key, request)
  return request
}

const formatMoney = (value, currency = 'USD') => {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('vi-VN')
}

const statusLabel = (status) => {
  const labels = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    PROCESSING: 'Processing',
    PAID: 'Paid',
    REJECTED: 'Rejected',
    FAILED: 'Failed',
  }
  return labels[(status || '').toUpperCase()] || status || 'Unknown'
}

const onboardingLabel = (status) => {
  const labels = {
    CREATED: 'Account created',
    ONBOARDING: 'Setup incomplete',
    REQUIRES_INFORMATION: 'More information required',
    PENDING_VERIFICATION: 'Pending Stripe verification',
    READY: 'Ready for payout',
    RESTRICTED: 'Payout restricted',
  }
  return labels[(status || '').toUpperCase()] || 'Not configured'
}

const normalizeCountry = (value = '') => (
  value.trim().toUpperCase().slice(0, 2)
)

const normalizeCurrency = (value = '') => (
  value.trim().toUpperCase()
)

function CreatorPayoutPanel({ heading = 'Monthly Payout' }) {
  const [month, setMonth] = useState('')
  const [overview, setOverview] = useState(null)
  const [countryCode, setCountryCode] = useState('VN')
  const [selectedPayoutCurrency, setSelectedPayoutCurrency] = useState('USD')
  const [requestedAmount, setRequestedAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [accountWorking, setAccountWorking] = useState(false)
  const [error, setError] = useState('')

  const loadOverview = useCallback(async (selectedMonth) => {
    try {
      setLoading(true)
      setError('')
      const data = await getPayoutOverviewDeduped(selectedMonth)
      setOverview(data || null)
      setMonth(data?.selectedMonth || selectedMonth || '')
      setCountryCode(
        data?.account?.accountCountry
        || data?.accountCountry
        || 'VN',
      )
      setSelectedPayoutCurrency(
        normalizeCurrency(
          data?.account?.currency
          || data?.payoutCurrency
          || data?.existingRequest?.currency
          || 'USD',
        ),
      )
    } catch (err) {
      setError(
        err?.response?.data?.message
        || err?.message
        || 'Could not load payout information.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const startOnboarding = useCallback(async (country, payoutCurrency) => {
    if (onboardingRedirectInProgress) return

    const normalizedCountry = country
      ? normalizeCountry(country)
      : undefined
    const normalizedPayoutCurrency = normalizeCurrency(
      payoutCurrency || 'USD',
    )

    onboardingRedirectInProgress = true
    try {
      const result = await startCreatorPayoutOnboardingApi(
        normalizedCountry,
        normalizedPayoutCurrency,
      )

      if (!result?.onboardingUrl) {
        throw new Error('Stripe did not return an onboarding URL.')
      }

      window.location.assign(result.onboardingUrl)
    } catch (onboardingError) {
      onboardingRedirectInProgress = false
      throw onboardingError
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const initialize = async () => {
      const params = new URLSearchParams(window.location.search)
      const onboardingResult = params.get('stripe_onboarding')

      try {
        if (onboardingResult === 'refresh') {
          if (!onboardingRedirectInProgress) {
            setAccountWorking(true)
            const account = await getCreatorPayoutAccountApi()
            await startOnboarding(
              account?.accountCountry,
              account?.currency || 'USD',
            )
          }
          return
        }

        if (onboardingResult === 'return') {
          setAccountWorking(true)

          if (!onboardingReturnPromise) {
            onboardingReturnPromise = syncCreatorPayoutAccountApi()
              .finally(() => {
                window.setTimeout(() => {
                  onboardingReturnPromise = null
                }, 1000)
              })
          }

          const account = await onboardingReturnPromise
          if (mounted) {
            if (account?.readyForPayout) {
              toast.success(
                'Stripe payout method is ready.',
                { toastId: 'stripe-payout-ready' },
              )
            } else {
              toast.info(
                'Stripe account saved. Complete any remaining verification requirements.',
                { toastId: 'stripe-payout-incomplete' },
              )
            }
          }

          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          )
        }
      } catch (err) {
        if (mounted) {
          const message = err?.response?.data?.message
            || err?.message
            || 'Could not complete Stripe onboarding.'
          setError(message)
          toast.error(message)
        }
      } finally {
        if (mounted && onboardingResult !== 'refresh') {
          setAccountWorking(false)
          await loadOverview('')
        }
      }
    }

    initialize()
    return () => {
      mounted = false
    }
  }, [loadOverview, startOnboarding])

  const handleMonthChange = async (event) => {
    const value = event.target.value
    setMonth(value)
    setRequestedAmount('')
    await loadOverview(value)
  }

  const handleStartOnboarding = async () => {
    if (!/^[A-Za-z]{2}$/.test(countryCode.trim())) {
      setError(
        'Enter a valid two-letter country code, for example VN or US.',
      )
      return
    }

    if (!['USD', 'EUR', 'CNY'].includes(selectedPayoutCurrency)) {
      setError('Select USD, EUR, or CNY as the payout currency.')
      return
    }

    try {
      setAccountWorking(true)
      setError('')
      await startOnboarding(countryCode, selectedPayoutCurrency)
    } catch (err) {
      const message = err?.response?.data?.message
        || err?.message
        || 'Could not start Stripe onboarding.'
      setError(message)
      toast.error(message)
      setAccountWorking(false)
    }
  }

  const handleSyncAccount = async () => {
    try {
      setAccountWorking(true)
      setError('')
      const account = await syncCreatorPayoutAccountApi()
      toast.success(
        account?.readyForPayout
          ? 'Stripe payout method is ready.'
          : 'Stripe account status synchronized.',
      )
      await loadOverview(month)
    } catch (err) {
      const message = err?.response?.data?.message
        || err?.message
        || 'Could not synchronize Stripe account.'
      setError(message)
      toast.error(message)
    } finally {
      setAccountWorking(false)
    }
  }

  const role = (overview?.role || '').toUpperCase()
  const currency = normalizeCurrency(
    overview?.payoutCurrency
    || overview?.account?.currency
    || overview?.existingRequest?.currency
    || 'USD',
  )
  const account = overview?.account

  const supportedCurrencies = useMemo(() => {
    const source = Array.isArray(overview?.supportedCurrencies)
      ? overview.supportedCurrencies
      : FALLBACK_CURRENCIES

    return source.filter((item) => item?.active !== false)
  }, [overview?.supportedCurrencies])

  const currencySelectionLocked = Boolean(
    account?.detailsSubmitted || account?.readyForPayout,
  )

  const maximumRequestAmount = Number(
    overview?.monthlyWithdrawableAmount,
  ) || 0
  const minimumRequestAmount = Number(
    overview?.minimumPayoutAmount,
  ) || 0
  const numericRequestedAmount = Number(requestedAmount)
  const amountValid = Number.isFinite(numericRequestedAmount)
    && numericRequestedAmount >= minimumRequestAmount
    && numericRequestedAmount <= maximumRequestAmount

  const requests = Array.isArray(overview?.requests)
    ? overview.requests
    : []

  const statusCounts = requests.reduce((counts, request) => {
    const status = (request.status || 'PENDING').toUpperCase()
    counts[status] = (counts[status] || 0) + 1
    return counts
  }, {})

  const paidCount = statusCounts.PAID || 0
  const activeCount = (statusCounts.PENDING || 0)
    + (statusCounts.APPROVED || 0)
    + (statusCounts.PROCESSING || 0)
  const issueCount = (statusCounts.REJECTED || 0)
    + (statusCounts.FAILED || 0)
  const totalRequests = Math.max(1, requests.length)
  const withdrawablePercent = Math.min(
    100,
    Math.max(
      0,
      maximumRequestAmount
      / Math.max(1, Number(overview?.monthlyGrossAmount) || 0)
      * 100,
    ),
  )

  const requirements = Array.isArray(account?.requirementsCurrentlyDue)
    ? account.requirementsCurrentlyDue
    : []

  const payoutMethodLabel = useMemo(() => {
    if (!account?.externalAccountLast4) {
      return 'No bank account or eligible debit card connected'
    }

    const type = account.externalAccountType || 'Payout method'
    const name = account.externalAccountDisplayName
      ? `${account.externalAccountDisplayName} · `
      : ''

    return `${name}${type} ending ${account.externalAccountLast4}`
  }, [account])

  const handleRequest = async () => {
    if (!month) {
      setError('Select a payout month.')
      return
    }

    if (!amountValid) {
      setError(
        `Enter an amount from ${formatMoney(minimumRequestAmount, currency)} `
        + `to ${formatMoney(maximumRequestAmount, currency)}.`,
      )
      return
    }

    try {
      setSubmitting(true)
      setError('')
      await createCreatorPayoutRequestApi(
        month,
        numericRequestedAmount,
        currency,
        note.trim(),
      )
      toast.success(`Payout request for ${month} submitted.`)
      setRequestedAmount('')
      setNote('')
      await loadOverview(month)
    } catch (err) {
      const message = err?.response?.data?.message
        || err?.message
        || 'Could not submit payout request.'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !overview) {
    return (
      <div className="creator-payout-card creator-payout-loading">
        Loading payout information...
      </div>
    )
  }

  return (
    <section className="creator-payout-panel">
      <div className="creator-payout-card creator-payout-head">
        <div>
          <h2>{heading}</h2>
          <p>
            {overview?.currentMonthAllowed
              ? 'Sandbox mode allows payout requests for the current month.'
              : 'Set up a Stripe-hosted payout method first, then request an amount for a completed month.'}
          </p>
        </div>
        <label className="creator-payout-month">
          Payout month
          <input
            type="month"
            value={month}
            max={
              overview?.latestRequestableMonth
              || overview?.lastClosedMonth
              || undefined
            }
            onChange={handleMonthChange}
          />
        </label>
      </div>

      <div className="creator-payout-summary creator-payout-summary--five">
        <div className="creator-payout-card">
          <span>Gross revenue</span>
          <strong>{formatMoney(overview?.monthlyGrossAmount, currency)}</strong>
          <small>
            Base: {formatMoney(overview?.monthlyGrossAmountUsd, 'USD')}
          </small>
        </div>
        <div className="creator-payout-card">
          <span>Maximum request</span>
          <strong>{formatMoney(maximumRequestAmount, currency)}</strong>
          <small>Limited by role and month</small>
        </div>
        <div className="creator-payout-card">
          <span>Pending</span>
          <strong>{formatMoney(overview?.pendingAmount, currency)}</strong>
          <small>Pending, approved, or processing</small>
        </div>
        <div className="creator-payout-card">
          <span>Lifetime paid</span>
          <strong>{formatMoney(overview?.lifetimePaidAmount, currency)}</strong>
          <small>Completed Stripe transfers</small>
        </div>
        <div className="creator-payout-card">
          <span>Monthly limit</span>
          <strong>{formatMoney(overview?.monthlyLimitAmount, currency)}</strong>
          <small>
            Minimum request: {formatMoney(minimumRequestAmount, currency)}
          </small>
        </div>
      </div>

      <div className="creator-payout-card creator-payout-insights">
        <div className="creator-insight-header">
          <div>
            <h3>Payout tracking</h3>
            <p>A quick view of withdrawal availability and request progress.</p>
          </div>
          <span className="creator-insight-badge">
            {month || 'Latest month'}
          </span>
        </div>
        <div className="creator-payout-visuals">
          <div className="creator-withdrawable-chart">
            <div className="creator-progress-heading">
              <span>Withdrawable revenue</span>
              <strong>{withdrawablePercent.toFixed(0)}%</strong>
            </div>
            <div className="creator-progress-track">
              <div style={{ width: `${withdrawablePercent}%` }} />
            </div>
            <small>
              {formatMoney(maximumRequestAmount, currency)} of{' '}
              {formatMoney(overview?.monthlyGrossAmount, currency)}
            </small>
          </div>
          <div className="creator-status-chart">
            <div
              className="creator-donut"
              style={{
                background: requests.length === 0
                  ? 'rgba(148,163,184,.2)'
                  : `conic-gradient(#10b981 0 ${(paidCount / totalRequests) * 100}%, #a855f7 ${(paidCount / totalRequests) * 100}% ${((paidCount + activeCount) / totalRequests) * 100}%, #ef4444 ${((paidCount + activeCount) / totalRequests) * 100}% 100%)`,
              }}
            >
              <span>
                <strong>{requests.length}</strong>
                <small>requests</small>
              </span>
            </div>
            <div className="creator-status-legend">
              <span><i className="green" />Paid <b>{paidCount}</b></span>
              <span><i className="purple" />In progress <b>{activeCount}</b></span>
              <span><i className="red" />Issue <b>{issueCount}</b></span>
            </div>
          </div>
        </div>
      </div>

      <div className="creator-payout-grid">
        <div className="creator-payout-card">
          <div className="creator-payout-section-title">
            <div>
              <h3>Stripe payout method</h3>
              <p>
                Bank or eligible debit-card details are entered directly on
                Stripe, never stored by ComiVerse.
              </p>
            </div>
            <span
              className={`creator-onboarding-status ${(account?.onboardingStatus || 'not-configured').toLowerCase()}`}
            >
              {onboardingLabel(account?.onboardingStatus)}
            </span>
          </div>

          {!account && (
            <label className="creator-payout-country">
              Stripe account country
              <input
                value={countryCode}
                maxLength="2"
                onChange={(event) => setCountryCode(
                  normalizeCountry(event.target.value),
                )}
                placeholder="VN"
                disabled={accountWorking}
              />
              <small>Use a country enabled in your Stripe Connect sandbox.</small>
            </label>
          )}

          <label className="creator-payout-country">
            Payout currency
            <select
              value={selectedPayoutCurrency}
              onChange={(event) => setSelectedPayoutCurrency(
                normalizeCurrency(event.target.value),
              )}
              disabled={accountWorking || currencySelectionLocked}
            >
              {supportedCurrencies.map((item) => (
                <option
                  key={item.currencyCode}
                  value={item.currencyCode}
                >
                  {item.currencyCode} — {item.displayName}
                </option>
              ))}
            </select>
            <small>
              USD is the accounting base. Stripe receives the selected
              settlement currency. The currency is locked after onboarding
              details are submitted.
            </small>
          </label>

          <div className="creator-payout-method-card">
            <strong>{payoutMethodLabel}</strong>
            <span>
              {account?.stripeConnectedAccountId
                || 'A Stripe connected account will be created automatically.'}
            </span>
          </div>

          {account && (
            <div className="creator-payout-account-meta">
              <span>Country: {account.accountCountry || '—'}</span>
              <span>Currency: {account.currency || currency}</span>
              <span>
                Details submitted: {account.detailsSubmitted ? 'Yes' : 'No'}
              </span>
              <span>Transfers: {account.transfersCapability || 'unknown'}</span>
              <span>
                Payouts enabled: {account.payoutsEnabled ? 'Yes' : 'No'}
              </span>
              <span>Last synchronized: {formatDate(account.lastSyncedAt)}</span>
            </div>
          )}

          {requirements.length > 0 && (
            <div className="creator-payout-requirements">
              <strong>Stripe still requires:</strong>
              <span>{requirements.join(', ')}</span>
            </div>
          )}

          <div className="creator-payout-account-actions">
            <button
              type="button"
              onClick={handleStartOnboarding}
              disabled={accountWorking}
            >
              {accountWorking
                ? 'Opening Stripe...'
                : account
                  ? 'Continue Stripe setup'
                  : 'Set up payout account'}
            </button>
            {account && (
              <button
                type="button"
                className="secondary"
                onClick={handleSyncAccount}
                disabled={accountWorking}
              >
                Refresh status
              </button>
            )}
          </div>
        </div>

        <div className="creator-payout-card">
          <h3>Request payout</h3>
          <p>
            {overview?.notRequestableReason
              || overview?.calculationPolicy
              || 'This month is eligible for payout.'}
          </p>

          <label className="creator-payout-amount-field">
            Withdrawal amount ({currency})
            <input
              type="number"
              min={minimumRequestAmount || 0}
              max={maximumRequestAmount || undefined}
              step="0.01"
              value={requestedAmount}
              onChange={(event) => setRequestedAmount(event.target.value)}
              placeholder={`Maximum ${maximumRequestAmount}`}
              disabled={submitting || maximumRequestAmount <= 0}
            />
            <small>
              Available: {formatMoney(maximumRequestAmount, currency)} · Minimum:{' '}
              {formatMoney(minimumRequestAmount, currency)}
            </small>
          </label>

          <button
            type="button"
            className="creator-payout-max-button"
            onClick={() => setRequestedAmount(String(maximumRequestAmount))}
            disabled={submitting || maximumRequestAmount <= 0}
          >
            Use maximum amount
          </button>

          <textarea
            rows="3"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note for Admin"
            maxLength="500"
          />
          <button
            className="creator-payout-primary"
            type="button"
            onClick={handleRequest}
            disabled={submitting || !overview?.requestable || !amountValid}
            title={
              !overview?.requestable
                ? overview?.notRequestableReason
                  || 'Payout request is not available yet'
                : undefined
            }
          >
            {submitting
              ? 'Processing...'
              : `Request ${formatMoney(numericRequestedAmount || 0, currency)}`}
          </button>
        </div>
      </div>

      {error && <div className="creator-payout-error">{error}</div>}

      <div className="creator-payout-card creator-payout-history">
        <h3>Payout history</h3>
        <div className="creator-payout-table-wrap">
          <table className="creator-payout-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Stripe transfer</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="creator-payout-empty">
                    No payout requests yet.
                  </td>
                </tr>
              ) : requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.payoutMonth}</td>
                  <td>{formatMoney(request.amount, request.currency || 'USD')}</td>
                  <td>
                    <span
                      className={`creator-payout-status ${(request.status || '').toLowerCase()}`}
                    >
                      {statusLabel(request.status)}
                    </span>
                  </td>
                  <td>{formatDate(request.requestedAt || request.createdAt)}</td>
                  <td>{request.stripeTransferId || '—'}</td>
                  <td>
                    {request.failureReason
                      || request.adminNote
                      || request.requestNote
                      || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default CreatorPayoutPanel
