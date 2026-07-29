import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, RefreshCw, Search, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { toast } from 'react-toastify'
import AdminLayout from '../../components/layout/AdminLayout'
import {
  createAdminSubscriptionPlanApi,
  getAdminPaymentLogsApi,
  getAdminSubscriptionPlansApi,
  updateAdminSubscriptionPlanApi,
  updateAdminSubscriptionPlanStatusApi
} from '../../services/api/SubscriptionApi'
import '../../assets/style/admin/subscriptions.css'

const EMPTY_FORM = {
  code: '',
  name: '',
  description: '',
  price: '',
  currency: 'VND',
  billingInterval: 'MONTH',
  intervalCount: 1,
  active: true,
  recommended: false,
  badge: '',
  featuresText: '',
  sortOrder: 0
}

function formatMoney(value, currency = 'VND') {
  const amount = Number(value || 0)
  try {
    return new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2
    }).format(amount)
  } catch {
    return `${amount.toLocaleString()} ${currency}`
  }
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function SubscriptionManagement() {
  const [tab, setTab] = useState('plans')
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logStatus, setLogStatus] = useState('')
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [page, setPage] = useState(0)
  const [pagination, setPagination] = useState({ totalElements: 0, totalPages: 0, size: 20 })

const loadPlans = useCallback(async () => {
  try {
    setPlansLoading(true)

    const data = await getAdminSubscriptionPlansApi()
    setPlans(Array.isArray(data) ? data : [])
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Unable to load subscription plans.'

    console.error('Load subscription plans failed:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    })

    toast.error(message)
  } finally {
    setPlansLoading(false)
  }
}, [])

  const loadLogs = useCallback(async () => {
  try {
    setLogsLoading(true)

    const data = await getAdminPaymentLogsApi({
      status: logStatus || undefined,
      query: appliedQuery || undefined,
      page,
      size: 20
    })

    setLogs(Array.isArray(data?.content) ? data.content : [])

    setPagination({
      totalElements: Number(data?.totalElements || 0),
      totalPages: Number(data?.totalPages || 0),
      size: Number(data?.size || 20)
    })
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Unable to load Stripe payment logs.'

    console.error('Load Stripe payment logs failed:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      params: error.config?.params
    })

    toast.error(message)
  } finally {
    setLogsLoading(false)
  }
}, [appliedQuery, logStatus, page])

  useEffect(() => { loadPlans() }, [loadPlans])
  useEffect(() => {
    if (tab === 'payments') loadLogs()
  }, [tab, loadLogs])

  const paidRevenue = useMemo(
    () => logs.filter((item) => item.status === 'PAID').reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [logs]
  )

  const openCreate = () => {
    setEditingPlan(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (plan) => {
    setEditingPlan(plan)
    setForm({
      code: plan.code || '',
      name: plan.name || '',
      description: plan.description || '',
      price: plan.price ?? '',
      currency: plan.currency || 'VND',
      billingInterval: plan.billingInterval || 'MONTH',
      intervalCount: plan.intervalCount || 1,
      active: plan.active !== false,
      recommended: plan.recommended === true,
      badge: plan.badge || '',
      featuresText: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      sortOrder: plan.sortOrder || 0
    })
    setFormOpen(true)
  }

  const handleSavePlan = async (event) => {
    event.preventDefault()
    const features = form.featuresText.split('\n').map((item) => item.trim()).filter(Boolean)
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      currency: form.currency.trim().toUpperCase(),
      billingInterval: form.billingInterval,
      intervalCount: Number(form.intervalCount),
      active: Boolean(form.active),
      recommended: Boolean(form.recommended),
      badge: form.badge.trim(),
      features,
      sortOrder: Number(form.sortOrder || 0)
    }

    if (!payload.code || !payload.name || !Number.isFinite(payload.price) || payload.price <= 0) {
      toast.warning('Code, name, and a positive price are required.')
      return
    }

    try {
      setSaving(true)
      if (editingPlan) {
        await updateAdminSubscriptionPlanApi(editingPlan.id, payload)
        toast.success('Subscription plan updated.')
      } else {
        await createAdminSubscriptionPlanApi(payload)
        toast.success('Subscription plan created.')
      }
      setFormOpen(false)
      await loadPlans()
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || 'Unable to save the subscription plan.')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePlan = async (plan) => {
    try {
      await updateAdminSubscriptionPlanStatusApi(plan.id, !plan.active)
      setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, active: !plan.active } : item))
      toast.success(`Plan ${plan.active ? 'disabled' : 'enabled'}.`)
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || 'Unable to update plan status.')
    }
  }

  const applySearch = (event) => {
    event.preventDefault()
    setPage(0)
    setAppliedQuery(query.trim())
  }

  return (
    <AdminLayout activeNav="subscriptions">
      <div className="admin-page-header subscription-admin-header">
        <div className="admin-page-header-info">
          <h1>Subscriptions & Stripe Payments</h1>
          <p>Manage reader plans, sandbox prices, and verified payment logs</p>
        </div>
        {tab === 'plans' && (
          <button type="button" className="admin-btn admin-btn--primary" onClick={openCreate}>
            <Plus size={16} /> Add Plan
          </button>
        )}
      </div>

      <div className="subscription-admin-tabs">
        <button type="button" className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>Plans</button>
        <button type="button" className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>Payment Logs</button>
      </div>

      {tab === 'plans' ? (
        <section className="subscription-admin-section">
          {plansLoading ? (
            <div className="subscription-admin-empty"><span className="admin-spinner-sm" /> Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className="subscription-admin-empty">No plans have been configured.</div>
          ) : (
            <div className="subscription-admin-plan-grid">
              {plans.map((plan) => (
                <article key={plan.id} className={`subscription-admin-plan ${plan.active ? '' : 'inactive'}`}>
                  <div className="subscription-admin-plan-top">
                    <div>
                      <span className="subscription-plan-code">{plan.code}</span>
                      <h2>{plan.name}</h2>
                    </div>
                    <span className={`status-badge ${plan.active ? 'active' : 'inactive'}`}>
                      {plan.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="subscription-admin-price">{formatMoney(plan.price, plan.currency)}</div>
                  <p className="subscription-admin-interval">
                    Every {plan.intervalCount || 1} {plan.billingInterval === 'YEAR' ? 'year' : 'month'}{Number(plan.intervalCount || 1) > 1 ? 's' : ''}
                  </p>
                  {plan.badge && <span className="subscription-admin-badge">{plan.badge}</span>}
                  <ul>
                    {(plan.features || []).slice(0, 5).map((feature) => <li key={feature}>{feature}</li>)}
                  </ul>
                  <div className="subscription-admin-plan-actions">
                    <button type="button" onClick={() => openEdit(plan)}><Edit3 size={15} /> Edit</button>
                    <button type="button" onClick={() => handleTogglePlan(plan)}>
                      {plan.active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
                      {plan.active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="subscription-admin-section">
          <div className="subscription-log-summary">
            <div><span>Records</span><strong>{pagination.totalElements.toLocaleString()}</strong></div>
            <div><span>Paid on this page</span><strong>{formatMoney(paidRevenue, logs[0]?.currency || 'VND')}</strong></div>
            <div><span>Provider</span><strong>Stripe Sandbox</strong></div>
          </div>

          <form className="subscription-log-filters" onSubmit={applySearch}>
            <div className="subscription-search-box">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Email, plan, session, subscription..." />
            </div>
            <select value={logStatus} onChange={(event) => { setLogStatus(event.target.value); setPage(0) }}>
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="EXPIRED">Expired</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <button type="submit" className="admin-btn admin-btn--primary">Search</button>
            <button type="button" className="admin-btn" onClick={loadLogs}><RefreshCw size={15} /> Refresh</button>
          </form>

          <div className="admin-data-table-wrapper subscription-payment-table">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Reader</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Stripe references</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr><td colSpan="6" className="subscription-table-message"><span className="admin-spinner-sm" /> Loading payment logs...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan="6" className="subscription-table-message">No payment logs found.</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.createdAt)}</td>
                    <td><strong>{log.userEmail}</strong></td>
                    <td><span className="subscription-plan-code">{log.planCode}</span><br />{log.planName}</td>
                    <td className="subscription-log-amount">{formatMoney(log.amount, log.currency)}</td>
                    <td><span className={`subscription-payment-status ${String(log.status).toLowerCase()}`}>{log.status}</span></td>
                    <td className="subscription-stripe-refs">
                      <span title={log.stripeCheckoutSessionId || ''}>{log.stripeCheckoutSessionId || '—'}</span>
                      <span title={log.stripeSubscriptionId || ''}>{log.stripeSubscriptionId || '—'}</span>
                      {log.failureReason && <small>{log.failureReason}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="subscription-pagination">
            <button type="button" disabled={page <= 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
            <span>Page {page + 1} of {Math.max(pagination.totalPages, 1)}</span>
            <button type="button" disabled={page + 1 >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </section>
      )}

      {formOpen && (
        <div className="subscription-admin-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false) }}>
          <form className="subscription-admin-modal" onSubmit={handleSavePlan}>
            <div className="subscription-admin-modal-header">
              <div>
                <h2>{editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}</h2>
                <p>Stripe product and recurring price are created lazily on the first checkout.</p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)}><X size={20} /></button>
            </div>

            <div className="subscription-plan-form-grid">
              <label>Plan code<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} maxLength={50} required /></label>
              <label>Plan name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} required /></label>
              <label>Price<input type="number" min="0.01" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></label>
              <label>Currency<input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} maxLength={3} required /></label>
              <label>Billing interval<select value={form.billingInterval} onChange={(e) => setForm({ ...form, billingInterval: e.target.value })}><option value="MONTH">Month</option><option value="YEAR">Year</option></select></label>
              <label>Interval count<input type="number" min="1" max="12" value={form.intervalCount} onChange={(e) => setForm({ ...form, intervalCount: e.target.value })} /></label>
              <label>Badge<input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} maxLength={80} placeholder="Most Popular" /></label>
              <label>Sort order<input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></label>
              <label className="full">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} rows="3" /></label>
              <label className="full">Features, one per line<textarea value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} rows="6" /></label>
            </div>

            <div className="subscription-form-switches">
              <label><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
              <label><input type="checkbox" checked={form.recommended} onChange={(e) => setForm({ ...form, recommended: e.target.checked })} /> Recommended</label>
            </div>

            <div className="subscription-admin-modal-actions">
              <button type="button" className="admin-btn" onClick={() => setFormOpen(false)}>Cancel</button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>{saving ? 'Saving...' : 'Save Plan'}</button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  )
}

export default SubscriptionManagement
