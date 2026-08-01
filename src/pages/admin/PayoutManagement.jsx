import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import AdminLayout from '../../components/layout/AdminLayout'
import '../../assets/style/admin/payout.css'
import {
  approveAdminPayoutApi,
  getAdminPayoutsApi,
  payAdminPayoutApi,
  rejectAdminPayoutApi,
} from '../../services/api/PayoutApi'

const FILTER_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Failed', value: 'FAILED' },
]

const formatMoney = (value, currency = 'VND') => new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: currency || 'VND', maximumFractionDigits: currency === 'VND' ? 0 : 2,
}).format(Number(value) || 0)

const formatDate = (value) => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('vi-VN')
}

function PayoutManagement() {
  const [activeStatus, setActiveStatus] = useState('')
  const [data, setData] = useState({ items: [], counts: {}, totals: {} })
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [error, setError] = useState('')

  const loadPayouts = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await getAdminPayoutsApi({ status: activeStatus || undefined, size: 100 })
      setData(result || { items: [], counts: {}, totals: {} })
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load payout requests.')
    } finally {
      setLoading(false)
    }
  }, [activeStatus])

  useEffect(() => { loadPayouts() }, [loadPayouts])

  const items = Array.isArray(data?.items) ? data.items : []
  const summaryCards = useMemo(() => ['PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED'].map((status) => ({
    status,
    count: Number(data?.counts?.[status]) || 0,
    total: Number(data?.totals?.[status]) || 0,
  })), [data])

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
      const message = err?.response?.data?.message || err?.message || 'Payout action failed.'
      toast.error(message)
      setError(message)
    } finally {
      setWorkingId('')
    }
  }

  const renderActions = (payout) => {
    const disabled = workingId === payout.id
    if (payout.status === 'PENDING') {
      return (
        <>
          <button disabled={disabled} className="btn-table-action payout-approve" onClick={() => runAction(payout, 'approve')}>Approve</button>
          <button disabled={disabled} className="btn-table-action payout-reject" onClick={() => runAction(payout, 'reject')}>Reject</button>
        </>
      )
    }
    if (payout.status === 'APPROVED' || payout.status === 'FAILED') {
      return <button disabled={disabled} className="btn-table-action payout-mark-paid" onClick={() => runAction(payout, 'pay')}>{disabled ? 'Processing...' : 'Pay with Stripe'}</button>
    }
    return <span className="payout-no-action">—</span>
  }

  return (
    <AdminLayout activeNav="payout">
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1>Payout Management</h1>
          <p>Review monthly payout requests and send test transfers to Stripe connected accounts.</p>
        </div>
        <button className="btn-table-action" onClick={loadPayouts} disabled={loading}>Refresh</button>
      </div>

      <div className="payout-summary-grid">
        {summaryCards.map((card) => (
          <div key={card.status} className="payout-summary-card">
            <span className={`payout-summary-badge payout-summary-badge--${card.status.toLowerCase()}`}>{card.status}</span>
            <div className="payout-summary-count">{card.count}</div>
            <div className="payout-summary-total">{formatMoney(card.total)}</div>
          </div>
        ))}
      </div>

      <div className="payout-filter-tabs">
        {FILTER_TABS.map((tab) => (
          <button key={tab.label} className={`payout-filter-tab ${activeStatus === tab.value ? 'active' : ''}`} onClick={() => setActiveStatus(tab.value)}>
            {tab.label}{tab.value ? ` (${Number(data?.counts?.[tab.value]) || 0})` : ''}
          </button>
        ))}
      </div>

      {error && <div className="admin-payout-error">{error}</div>}

      <div className="admin-data-table-wrapper">
        <table className="admin-data-table admin-payout-table">
          <thead><tr><th>Creator</th><th>Role</th><th>Month</th><th>Amount</th><th>Stripe account</th><th>Status</th><th>Requested</th><th>Details</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" className="admin-payout-empty">Loading payout requests...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="9" className="admin-payout-empty">No payout requests match this filter.</td></tr>
            ) : items.map((payout) => (
              <tr key={payout.id}>
                <td><div className="payout-user-cell"><span className="cell-name">{payout.userName || payout.userEmail}</span><span className="payout-reason">{payout.userEmail}</span></div></td>
                <td><span className={`role-badge ${(payout.role || '').toLowerCase()}`}>{payout.role}</span></td>
                <td>{payout.payoutMonth}</td>
                <td className="payout-amount">{formatMoney(payout.amount, payout.currency)}</td>
                <td className="payout-bank">{payout.stripeConnectedAccountId}</td>
                <td><span className={`status-badge ${(payout.status || '').toLowerCase()}`}>{payout.status}</span></td>
                <td>{formatDate(payout.requestedAt || payout.createdAt)}</td>
                <td className="admin-payout-details">{payout.failureReason || payout.adminNote || payout.calculationDetails || payout.requestNote || '—'}{payout.stripeTransferId && <small>Transfer: {payout.stripeTransferId}</small>}</td>
                <td><div className="table-actions">{renderActions(payout)}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}

export default PayoutManagement
