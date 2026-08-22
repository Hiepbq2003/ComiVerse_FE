import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AdminLayout from '../../components/layout/AdminLayout'
import '../../assets/style/admin/payout.css'
import {
  approveAdminPayoutApi,
  getAdminPayoutsApi,
  payAdminPayoutApi,
  rejectAdminPayoutApi,
} from '../../services/api/PayoutApi'

const inFlightRequests = new Map()

const runDedupedRequest = (key, requestFactory) => {
  const existingRequest = inFlightRequests.get(key)
  if (existingRequest) return existingRequest

  const request = Promise.resolve()
    .then(requestFactory)
    .finally(() => {
      if (inFlightRequests.get(key) === request) {
        inFlightRequests.delete(key)
      }
    })

  inFlightRequests.set(key, request)
  return request
}

const FILTER_TABS = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Processing', value: 'PROCESSING' },
]

const HISTORY_FILTER_TABS = [
  { label: 'Paid', value: 'PAID' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Failed', value: 'FAILED' },
]

const PAGE_SIZE = 20

const getPayoutStatus = (payout) => (
  payout?.status || payout?.paymentStatus || payout?.payoutStatus || 'UNKNOWN'
).toString().toUpperCase()


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

function PayoutManagement({ historyMode = false }) {
  const navigate = useNavigate()
  const [activeStatus, setActiveStatus] = useState(historyMode ? 'PAID' : 'PENDING')
  const [data, setData] = useState({ items: [], counts: {}, totals: {} })
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [pagination, setPagination] = useState({
    totalElements: 0,
    totalPages: 0,
    size: PAGE_SIZE,
  })

  const loadPayouts = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const requestKey = `admin-payouts:${activeStatus}:${page}:${PAGE_SIZE}`
      const result = await runDedupedRequest(
        requestKey,
        () => getAdminPayoutsApi({
          status: activeStatus,
          page,
          size: PAGE_SIZE,
        }),
      )
      setData(result || { items: [], counts: {}, totals: {} })
      setPagination({
        totalElements: Number(result?.totalElements ?? result?.page?.totalElements ?? 0),
        totalPages: Number(result?.totalPages ?? result?.page?.totalPages ?? 0),
        size: Number(result?.size ?? result?.page?.size ?? PAGE_SIZE),
      })
    } catch (err) {
      setError(
        err?.response?.data?.message
        || err?.message
        || 'Could not load payout requests.',
      )
    } finally {
      setLoading(false)
    }
  }, [activeStatus, page])

  useEffect(() => {
    loadPayouts()
  }, [loadPayouts])

  useEffect(() => {
    setActiveStatus(historyMode ? 'PAID' : 'PENDING')
    setPage(0)
  }, [historyMode])

  const allItems = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.content)
      ? data.content
      : Array.isArray(data?.data)
        ? data.data
        : []
  const items = allItems.filter((payout) => getPayoutStatus(payout) === activeStatus)
  const totalsCurrency = data?.totalsCurrency || 'USD'
  const summaryCards = useMemo(() => {
    const activeStatuses = ['PENDING', 'APPROVED', 'PROCESSING']
    const historyStatuses = ['PAID', 'REJECTED', 'FAILED']
    const displayStatuses = historyMode ? historyStatuses : activeStatuses
    
    return displayStatuses.map((status) => ({
      status,
      count: Number(data?.counts?.[status]) || 0,
      total: Number(data?.totals?.[status]) || 0,
    }))
  }, [data, historyMode])

  const runAction = async (payout, action) => {
    try {
      setWorkingId(payout.id)

      if (action === 'approve') {
        const note = window.prompt('Optional approval note:', '') || ''
        await approveAdminPayoutApi(payout.id, note)
        toast.success('Payout approved.')
      } else if (action === 'reject') {
        const reason = window.prompt('Reason for rejection:')
        if (!reason?.trim()) return
        await rejectAdminPayoutApi(payout.id, reason.trim())
        toast.success('Payout rejected.')
      } else if (action === 'pay') {
        await payAdminPayoutApi(payout.id)
        toast.success('Stripe sandbox transfer completed.')
      }

      await loadPayouts()
    } catch (err) {
      const message = err?.response?.data?.message
        || err?.message
        || 'Payout action failed.'
      toast.error(message)
      setError(message)
    } finally {
      setWorkingId('')
    }
  }

  const renderActions = (payout) => {
    if (historyMode) return <span className="payout-no-action">—</span>

    const disabled = workingId === payout.id

    if (payout.status === 'PENDING') {
      return (
        <>
          <button
            disabled={disabled}
            className="btn-table-action payout-approve"
            onClick={() => runAction(payout, 'approve')}
          >
            Approve
          </button>
          <button
            disabled={disabled}
            className="btn-table-action payout-reject"
            onClick={() => runAction(payout, 'reject')}
          >
            Reject
          </button>
        </>
      )
    }

    if (payout.status === 'APPROVED' || payout.status === 'FAILED') {
      return (
        <button
          disabled={disabled}
          className="btn-table-action payout-mark-paid"
          onClick={() => runAction(payout, 'pay')}
        >
          {disabled ? 'Processing...' : 'Pay with Stripe'}
        </button>
      )
    }

    return <span className="payout-no-action">—</span>
  }

  return (
    <AdminLayout activeNav="payout">
      <div className="admin-payout-screen">
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1>{historyMode ? 'Payment History' : 'Payout Management'}</h1>
          <p>
            {historyMode
              ? 'Review completed, rejected, and failed payout transactions.'
              : 'Review active payout requests and process Stripe Connect transfers.'}
          </p>
        </div>
        <div className="admin-payout-header-actions">
          <button className={`admin-payout-view-tab ${historyMode ? 'active' : ''}`} onClick={() => navigate('/admin/payout/history')}>Payment history</button>
          <button className="admin-payout-view-tab" onClick={() => navigate('/admin/payout/settings')}>Payment settings</button>
        </div>
      </div>

      <div className="payout-summary-grid">
        {summaryCards.map((card) => (
          <div key={card.status} className="payout-summary-card">
            <span
              className={`payout-summary-badge payout-summary-badge--${card.status.toLowerCase()}`}
            >
              {card.status}
            </span>
            <div className="payout-summary-count">{card.count}</div>
            <div className="payout-summary-total">
              {formatMoney(card.total, totalsCurrency)}
            </div>
          </div>
        ))}
      </div>

      <div className="payout-filter-tabs">
        {(historyMode ? HISTORY_FILTER_TABS : FILTER_TABS).map((tab) => (
          <button
            key={tab.label}
            className={`payout-filter-tab ${activeStatus === tab.value ? 'active' : ''}`}
            onClick={() => {
              setActiveStatus(tab.value)
              setPage(0)
            }}
          >
            {tab.label}
            {` (${Number(data?.counts?.[tab.value]) || allItems.filter((item) => getPayoutStatus(item) === tab.value).length})`}
          </button>
        ))}
      </div>

      {error && <div className="admin-payout-error">{error}</div>}

      <div className="admin-data-table-wrapper">
        <table className="admin-data-table admin-payout-table">
          <thead>
            <tr>
              <th>Creator</th>
              <th>Role</th>
              <th>Month</th>
              <th>Payout</th>
              <th>USD base / cap</th>
              <th>Stripe account</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="admin-payout-empty">
                  Loading payout requests...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="10" className="admin-payout-empty">
                  No payout requests match this filter.
                </td>
              </tr>
            ) : items.map((payout) => {
              const status = getPayoutStatus(payout)
              const details = payout.failureReason
                || payout.adminNote
                || payout.calculationDetails
                || payout.requestNote
                || '—'
              return (
              <tr key={payout.id}>
                <td>
                  <div className="payout-user-cell">
                    <span className="cell-name">
                      {payout.userName || payout.userEmail}
                    </span>
                    <span className="payout-reason">{payout.userEmail}</span>
                  </div>
                </td>
                <td>
                  <span className={`role-badge ${(payout.role || '').toLowerCase()}`}>
                    {payout.role}
                  </span>
                </td>
                <td>{payout.payoutMonth}</td>
                <td className="payout-amount">
                  {formatMoney(payout.amount, payout.currency || 'USD')}
                  <small>
                    {payout.accountCountry || '—'} · {payout.currency || 'USD'}
                  </small>
                </td>
                <td className="payout-amount">
                  <span>{formatMoney(payout.amountUsd, 'USD')}</span>
                  <small>
                    Gross {formatMoney(payout.grossAmountUsd, 'USD')} · cap{' '}
                    {formatMoney(payout.monthlyLimitUsd, 'USD')}
                  </small>
                </td>
                <td className="payout-bank">
                  {payout.stripeConnectedAccountId || '—'}
                </td>
                <td>
                  <span className={`status-badge ${status.toLowerCase()}`}>
                    {status}
                  </span>
                </td>
                <td>{formatDate(payout.requestedAt || payout.createdAt)}</td>
                <td className="admin-payout-details" title={details}>
                  <span className="admin-payout-details-text">{details}</span>
                  {payout.stripeTransferId && (
                    <small>Transfer: {payout.stripeTransferId}</small>
                  )}
                </td>
                <td>
                  <div className="table-actions">
                    {renderActions(payout)}
                  </div>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {pagination.totalPages > 1 && (
        <nav className="admin-payout-pagination" aria-label="Payout pagination">
          <span>
            Page {page + 1} of {pagination.totalPages}
            {pagination.totalElements > 0 && ` · ${pagination.totalElements.toLocaleString()} records`}
          </span>
          <div>
            <button
              type="button"
              disabled={loading || page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={loading || page + 1 >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </nav>
      )}
      </div>
    </AdminLayout>
  )
}

export default PayoutManagement
