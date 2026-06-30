import { useState, useMemo } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'

// ── Mock payout data ───────────────────────────────
const MOCK_PAYOUTS = [
  { id: 'PR-001', user: 'Author X', reason: '', role: 'Author', amount: '2,100,000đ', bank: 'Vietcombank · 1234567890', type: 'Scheduled', date: 'Dec 28, 2024', status: 'Pending' },
  { id: 'PR-002', user: 'Spirit Group', reason: 'Reason: Urgent financial need', role: 'Translator', amount: '1,800,000đ', bank: 'MoMo · 0901234567', type: 'Early', date: 'Dec 30, 2024', status: 'Pending' },
  { id: 'PR-003', user: 'PhoenixWriter', reason: '', role: 'Author', amount: '3,500,000đ', bank: 'Techcombank · 9876543210', type: 'Scheduled', date: 'Dec 25, 2024', status: 'Processing' },
  { id: 'PR-004', user: 'JadeGroup', reason: 'Reason: Project expenses', role: 'Translator', amount: '2,200,000đ', bank: 'Vietinbank · 1122334455', type: 'Early', date: 'Dec 20, 2024', status: 'Processing' },
  { id: 'PR-005', user: 'NoviceWriter', reason: '', role: 'Author', amount: '950,000đ', bank: 'BIDV · 5544332211', type: 'Scheduled', date: 'Dec 15, 2024', status: 'Completed' },
  { id: 'PR-006', user: 'Dragon Scans', reason: '', role: 'Translator', amount: '1,450,000đ', bank: 'ACB · 7788996655', type: 'Scheduled', date: 'Dec 10, 2024', status: 'Completed' },
  { id: 'PR-007', user: 'Author X', reason: 'Reason: Wrong bank account info', role: 'Author', amount: '500,000đ', bank: 'Vietcombank · 1234567890', type: 'Early', date: 'Nov 30, 2024', status: 'Rejected' },
]

const SUMMARY = [
  { label: 'Pending', count: 2, total: '3.9M đ total', color: 'orange' },
  { label: 'Processing', count: 2, total: '5.7M đ total', color: 'blue' },
  { label: 'Completed', count: 2, total: '2.4M đ total', color: 'green' },
  { label: 'Rejected', count: 1, total: '0.5M đ total', color: 'red' },
]

const FILTER_TABS = ['All', 'Pending', 'Processing', 'Completed', 'Rejected']

function PayoutManagement() {
  const [activeFilter, setActiveFilter] = useState('All')

  const filteredPayouts = useMemo(() => {
    if (activeFilter === 'All') return MOCK_PAYOUTS
    return MOCK_PAYOUTS.filter((p) => p.status === activeFilter)
  }, [activeFilter])

  const getFilterCount = (filter) => {
    if (filter === 'All') return MOCK_PAYOUTS.length
    return MOCK_PAYOUTS.filter((p) => p.status === filter).length
  }

  const getActionButtons = (payout) => {
    switch (payout.status) {
      case 'Pending':
        return (
          <>
            <button className="btn-table-action payout-approve">Approve</button>
            <button className="btn-table-action payout-reject">Reject</button>
          </>
        )
      case 'Processing':
        return <button className="btn-table-action payout-mark-paid">Mark Paid</button>
      default:
        return <span className="payout-no-action">—</span>
    }
  }

  return (
    <AdminLayout activeNav="payout">
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1>Payout Management</h1>
          <p>Review and process payout requests from Authors and Translators</p>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────── */}
      <div className="payout-summary-grid">
        {SUMMARY.map((s) => (
          <div key={s.label} className="payout-summary-card">
            <span className={`payout-summary-badge payout-summary-badge--${s.color}`}>{s.label}</span>
            <div className="payout-summary-count">{s.count}</div>
            <div className="payout-summary-total">{s.total}</div>
          </div>
        ))}
      </div>

      {/* ── Filter Tabs ─────────────────────────── */}
      <div className="payout-filter-tabs">
        {FILTER_TABS.map((tab) => {
          const count = getFilterCount(tab)
          return (
            <button
              key={tab}
              className={`payout-filter-tab ${activeFilter === tab ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}{tab !== 'All' ? ` (${count})` : ''}
            </button>
          )
        })}
      </div>

      {/* ── Data Table ──────────────────────────── */}
      <div className="admin-data-table-wrapper">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Role</th>
              <th>Amount</th>
              <th>Bank Info</th>
              <th>Type</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayouts.map((p) => (
              <tr key={p.id}>
                <td className="cell-user-id">{p.id}</td>
                <td>
                  <div className="payout-user-cell">
                    <span className="cell-name">{p.user}</span>
                    {p.reason && <span className="payout-reason">{p.reason}</span>}
                  </div>
                </td>
                <td>
                  <span className={`role-badge ${p.role.toLowerCase()}`}>{p.role}</span>
                </td>
                <td className="payout-amount">{p.amount}</td>
                <td className="payout-bank">{p.bank}</td>
                <td>
                  <span className={`payout-type-badge payout-type--${p.type.toLowerCase()}`}>
                    {p.type === 'Scheduled' ? '📅' : '⚡'} {p.type}
                  </span>
                </td>
                <td>{p.date}</td>
                <td>
                  <span className={`status-badge ${p.status.toLowerCase()}`}>{p.status}</span>
                </td>
                <td>
                  <div className="table-actions">
                    {getActionButtons(p)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}

export default PayoutManagement
