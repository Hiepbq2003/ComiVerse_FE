import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import '../../assets/style/common/creator-payout.css'
import {
  createCreatorPayoutRequestApi,
  getCreatorPayoutOverviewApi,
  startCreatorPayoutOnboardingApi,
  syncCreatorPayoutAccountApi,
} from '../../services/api/PayoutApi'

let onboardingRedirectInProgress = false
let onboardingReturnPromise = null
const payoutOverviewRequests = new Map()

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

const formatMoney = (value, currency = 'VND') => {
  const amount = Number(value) || 0
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency || 'VND',
    maximumFractionDigits: currency === 'VND' ? 0 : 2,
  }).format(amount)
}

const formatDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('vi-VN')
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

const normalizeCountry = (value) => value.trim().toUpperCase().slice(0, 2)

function CreatorPayoutPanel({ heading = 'Monthly Payout' }) {
  const [month, setMonth] = useState('')
  const [overview, setOverview] = useState(null)
  const [countryCode, setCountryCode] = useState('VN')
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
      setCountryCode(data?.account?.accountCountry || data?.accountCountry || 'VN')
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load payout information.')
    } finally {
      setLoading(false)
    }
  }, [])

  const startOnboarding = useCallback(async (country) => {
    if (onboardingRedirectInProgress) return
    onboardingRedirectInProgress = true
    try {
      const normalizedCountry = country ? normalizeCountry(country) : undefined
      const result = await startCreatorPayoutOnboardingApi(normalizedCountry)
      if (!result?.onboardingUrl) {
        throw new Error('Stripe did not return an onboarding URL.')
      }
      window.location.assign(result.onboardingUrl)
    } catch (error) {
      onboardingRedirectInProgress = false
      throw error
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
            await startOnboarding()
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
              toast.success('Stripe payout method is ready.', { toastId: 'stripe-payout-ready' })
            } else {
              toast.info(
                'Stripe account saved. Complete any remaining verification requirements.',
                { toastId: 'stripe-payout-incomplete' },
              )
            }
          }
          window.history.replaceState({}, document.title, window.location.pathname)
        }
      } catch (err) {
        if (mounted) {
          const message = err?.response?.data?.message || err?.message || 'Could not complete Stripe onboarding.'
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
      setError('Enter a valid two-letter country code, for example VN or US.')
      return
    }
    try {
      setAccountWorking(true)
      setError('')
      await startOnboarding(countryCode)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not start Stripe onboarding.'
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
      toast.success(account?.readyForPayout
        ? 'Stripe payout method is ready.'
        : 'Stripe account status synchronized.')
      await loadOverview(month)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not synchronize Stripe account.'
      setError(message)
      toast.error(message)
    } finally {
      setAccountWorking(false)
    }
  }

  const role = (overview?.role || '').toUpperCase()
  const isTranslator = role === 'TRANSLATOR'
  const currency = isTranslator
    ? 'VND'
    : overview?.payoutCurrency || overview?.account?.currency || overview?.existingRequest?.currency || 'VND'
  const maximumRequestAmount = Number(overview?.monthlyWithdrawableAmount) || 0
  const minimumRequestAmount = Number(overview?.minimumPayoutAmount) || 0
  const numericRequestedAmount = Number(requestedAmount)
  const amountValid = Number.isFinite(numericRequestedAmount)
    && numericRequestedAmount >= minimumRequestAmount
    && numericRequestedAmount <= maximumRequestAmount
  const requests = Array.isArray(overview?.requests) ? overview.requests : []
  const account = overview?.account
  const requirements = Array.isArray(account?.requirementsCurrentlyDue)
    ? account.requirementsCurrentlyDue
    : []

  const payoutMethodLabel = useMemo(() => {
    if (!account?.externalAccountLast4) return 'No bank account or eligible debit card added'
    const name = account.externalAccountDisplayName || (
      account.externalAccountType === 'card' ? 'Debit card' : 'Bank account'
    )
    return `${name} •••• ${account.externalAccountLast4}`
  }, [account])

  const handleRequest = async () => {
    if (!amountValid) {
      setError(`Enter an amount from ${formatMoney(minimumRequestAmount, currency)} to ${formatMoney(maximumRequestAmount, currency)}.`)
      return
    }
    try {
      setSubmitting(true)
      setError('')
      await createCreatorPayoutRequestApi(month, numericRequestedAmount, note.trim())
      toast.success(`Payout request for ${month} submitted.`)
      setRequestedAmount('')
      setNote('')
      await loadOverview(month)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not submit payout request.'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !overview) {
    return <div className="creator-payout-card creator-payout-loading">Loading payout information...</div>
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
        <label className="creator-payout-month">Payout month
          <input
            type="month"
            value={month}
            max={overview?.latestRequestableMonth || overview?.lastClosedMonth || undefined}
            onChange={handleMonthChange}
          />
        </label>
      </div>

      <div className="creator-payout-summary creator-payout-summary--five">
        <div className="creator-payout-card"><span>Gross revenue</span><strong>{formatMoney(overview?.monthlyGrossAmount, currency)}</strong><small>{isTranslator ? 'Calculated directly in VND' : `${formatMoney(overview?.monthlyGrossAmountVnd, 'VND')} base`}</small></div>
        <div className="creator-payout-card"><span>Maximum request</span><strong>{formatMoney(maximumRequestAmount, currency)}</strong><small>Limited by role/month</small></div>
        <div className="creator-payout-card"><span>Pending</span><strong>{formatMoney(overview?.pendingAmount, currency)}</strong><small>Pending, approved, or processing</small></div>
        <div className="creator-payout-card"><span>Lifetime paid</span><strong>{formatMoney(overview?.lifetimePaidAmount, currency)}</strong><small>Completed Stripe transfers</small></div>
        <div className="creator-payout-card"><span>Monthly limit</span><strong>{formatMoney(overview?.monthlyLimitAmount, currency)}</strong><small>Minimum request: {formatMoney(minimumRequestAmount, currency)}</small></div>
      </div>

      <div className="creator-payout-grid">
        <div className="creator-payout-card">
          <div className="creator-payout-section-title">
            <div>
              <h3>Stripe payout method</h3>
              <p>Bank or eligible debit-card details are entered directly on Stripe, never stored by ComiVerse.</p>
            </div>
            <span className={`creator-onboarding-status ${(account?.onboardingStatus || 'not-configured').toLowerCase()}`}>
              {onboardingLabel(account?.onboardingStatus)}
            </span>
          </div>

          {!account && (
            <label className="creator-payout-country">
              Stripe account country
              <input
                value={countryCode}
                maxLength="2"
                onChange={(event) => setCountryCode(normalizeCountry(event.target.value))}
                placeholder="VN"
                disabled={accountWorking}
              />
              <small>Use a country enabled in your Stripe Connect sandbox.</small>
            </label>
          )}

          <div className="creator-payout-method-card">
            <strong>{payoutMethodLabel}</strong>
            <span>{account?.stripeConnectedAccountId || 'A Stripe connected account will be created automatically.'}</span>
          </div>

          {account && (
            <div className="creator-payout-account-meta">
              <span>Country: {account.accountCountry || '—'}</span>
              <span>Currency: {currency}</span>
              <span>Details submitted: {account.detailsSubmitted ? 'Yes' : 'No'}</span>
              <span>Transfers: {account.transfersCapability || 'unknown'}</span>
              <span>Payouts enabled: {account.payoutsEnabled ? 'Yes' : 'No'}</span>
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
            <button type="button" onClick={handleStartOnboarding} disabled={accountWorking}>
              {accountWorking
                ? 'Opening Stripe...'
                : account
                  ? 'Continue Stripe setup'
                  : 'Set up payout account'}
            </button>
            {account && (
              <button type="button" className="secondary" onClick={handleSyncAccount} disabled={accountWorking}>
                Refresh status
              </button>
            )}
          </div>
        </div>

        <div className="creator-payout-card">
          <h3>Request payout</h3>
          <p>{overview?.notRequestableReason || overview?.calculationPolicy || 'This month is eligible for payout.'}</p>

          <label className="creator-payout-amount-field">
            Withdrawal amount ({currency})
            <input
              type="number"
              min={minimumRequestAmount || 0}
              max={maximumRequestAmount || undefined}
              step={currency === 'VND' ? '1000' : '0.01'}
              value={requestedAmount}
              onChange={(event) => setRequestedAmount(event.target.value)}
              placeholder={`Maximum ${maximumRequestAmount}`}
              disabled={submitting || maximumRequestAmount <= 0}
            />
            <small>
              Available: {formatMoney(maximumRequestAmount, currency)} · Minimum: {formatMoney(minimumRequestAmount, currency)}
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
            title={!overview?.requestable ? (overview?.notRequestableReason || 'Payout request is not available yet') : undefined}
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
            <thead><tr><th>Month</th><th>Amount</th><th>Status</th><th>Requested</th><th>Stripe transfer</th><th>Note</th></tr></thead>
            <tbody>
              {requests.length === 0 ? (
                <tr><td colSpan="6" className="creator-payout-empty">No payout requests yet.</td></tr>
              ) : requests.map((request) => (
                <tr key={request.id}>
                  <td>{request.payoutMonth}</td>
                  <td>{isTranslator ? formatMoney(request.baseAmountVnd ?? request.amount, 'VND') : formatMoney(request.amount, request.currency)}</td>
                  <td><span className={`creator-payout-status ${(request.status || '').toLowerCase()}`}>{statusLabel(request.status)}</span></td>
                  <td>{formatDate(request.requestedAt || request.createdAt)}</td>
                  <td>{request.stripeTransferId || '—'}</td>
                  <td>{request.failureReason || request.adminNote || request.requestNote || '—'}</td>
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