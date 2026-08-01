import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import '../../assets/style/common/creator-payout.css'
import {
  createCreatorPayoutRequestApi,
  getCreatorPayoutOverviewApi,
  linkCreatorPayoutAccountApi,
} from '../../services/api/PayoutApi'

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
    PENDING: 'Pending', APPROVED: 'Approved', PROCESSING: 'Processing',
    PAID: 'Paid', REJECTED: 'Rejected', FAILED: 'Failed',
  }
  return labels[(status || '').toUpperCase()] || status || 'Unknown'
}

function CreatorPayoutPanel({ heading = 'Monthly Payout' }) {
  const [month, setMonth] = useState('')
  const [overview, setOverview] = useState(null)
  const [accountId, setAccountId] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadOverview = useCallback(async (selectedMonth = month) => {
    try {
      setLoading(true)
      setError('')
      const data = await getCreatorPayoutOverviewApi(selectedMonth || undefined)
      setOverview(data || null)
      setMonth(data?.selectedMonth || selectedMonth || '')
      setAccountId(data?.account?.stripeConnectedAccountId || '')
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load payout information.')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    loadOverview('')
    // Initial load must use the latest closed month returned by the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMonthChange = (event) => {
    const value = event.target.value
    setMonth(value)
    loadOverview(value)
  }

  const handleLinkAccount = async () => {
    if (!/^acct_[A-Za-z0-9]+$/.test(accountId.trim())) {
      setError('Enter a valid Stripe sandbox connected account ID starting with acct_.')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      await linkCreatorPayoutAccountApi(accountId.trim())
      toast.success('Stripe sandbox connected account linked.')
      await loadOverview(month)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not link Stripe account.'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequest = async () => {
    try {
      setSubmitting(true)
      setError('')
      await createCreatorPayoutRequestApi(month, note.trim())
      toast.success(`Payout request for ${month} submitted.`)
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

  const currency = overview?.account?.currency || overview?.existingRequest?.currency || 'VND'
  const requests = Array.isArray(overview?.requests) ? overview.requests : []

  return (
    <section className="creator-payout-panel">
      <div className="creator-payout-card creator-payout-head">
        <div>
          <h2>{heading}</h2>
          <p>Monthly earnings are calculated by the server. Only completed months can be requested.</p>
        </div>
        <label className="creator-payout-month">Payout month
          <input type="month" value={month} max={overview?.lastClosedMonth || undefined} onChange={handleMonthChange} />
        </label>
      </div>

      <div className="creator-payout-summary">
        <div className="creator-payout-card"><span>Selected month</span><strong>{formatMoney(overview?.monthlyGrossAmount, currency)}</strong><small>{overview?.calculationUnitCount || 0} {overview?.calculationUnitLabel || 'units'}</small></div>
        <div className="creator-payout-card"><span>Pending</span><strong>{formatMoney(overview?.pendingAmount, currency)}</strong><small>Pending, approved, or processing</small></div>
        <div className="creator-payout-card"><span>Lifetime paid</span><strong>{formatMoney(overview?.lifetimePaidAmount, currency)}</strong><small>Completed Stripe transfers</small></div>
        <div className="creator-payout-card"><span>Minimum request</span><strong>{formatMoney(overview?.minimumPayoutAmount, currency)}</strong><small>Configured by the platform</small></div>
      </div>

      <div className="creator-payout-grid">
        <div className="creator-payout-card">
          <h3>Stripe sandbox account</h3>
          <p>Use a test connected account ID. The server verifies test mode and transfer capability.</p>
          <div className="creator-payout-inline-form">
            <input value={accountId} onChange={(event) => setAccountId(event.target.value)} placeholder="acct_..." disabled={submitting} />
            <button type="button" onClick={handleLinkAccount} disabled={submitting}>Verify & Link</button>
          </div>
          {overview?.account && (
            <div className="creator-payout-account-meta">
              <span>Country: {overview.account.accountCountry || '—'}</span>
              <span>Transfers: {overview.account.transfersCapability || 'unknown'}</span>
              <span>Payouts enabled: {overview.account.payoutsEnabled ? 'Yes' : 'No'}</span>
            </div>
          )}
        </div>

        <div className="creator-payout-card">
          <h3>Request payout</h3>
          <p>{overview?.notRequestableReason || overview?.existingRequest?.calculationDetails || 'This month is eligible for payout.'}</p>
          <textarea rows="3" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for Admin" maxLength="500" />
          <button className="creator-payout-primary" type="button" onClick={handleRequest} disabled={submitting || !overview?.requestable}>
            {submitting ? 'Processing...' : `Request ${formatMoney(overview?.monthlyGrossAmount, currency)}`}
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
                  <td>{formatMoney(request.amount, request.currency)}</td>
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
