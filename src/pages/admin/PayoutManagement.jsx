import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import AdminLayout from '../../components/layout/AdminLayout'
import '../../assets/style/admin/payout.css'
import {
  approveAdminPayoutApi,
  getAdminPayoutsApi,
  getAdminPayoutSettingsApi,
  payAdminPayoutApi,
  rejectAdminPayoutApi,
  updateAdminPayoutSettingsApi,
  upsertAdminPayoutCurrencyApi,
} from '../../services/api/PayoutApi'

// React StrictMode mounts components twice in development.
// Share an in-flight request so the second mount reuses the same HTTP call.
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
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Failed', value: 'FAILED' },
]

const MONEY_MAX = 1_000_000_000_000
const UNIT_MAX = 1_000_000_000

const SETTING_FIELDS = [
  { name: 'minimumPayoutVnd', label: 'Minimum payout (VND)', min: 0, max: MONEY_MAX, step: 1000 },
  { name: 'translatorTaskRateVnd', label: 'Translator / completed task', min: 1, max: MONEY_MAX, step: 1000 },
  { name: 'translatorMonthlyLimitVnd', label: 'Translator monthly limit', min: 1, max: MONEY_MAX, step: 1000 },
  { name: 'authorViewsPerUnit', label: 'Author views per unit', min: 1, max: UNIT_MAX, step: 1 },
  { name: 'authorViewUnitRateVnd', label: 'Author reward / view unit', min: 1, max: MONEY_MAX, step: 1000 },
  { name: 'authorFollowsPerUnit', label: 'Author follows per unit', min: 1, max: UNIT_MAX, step: 1 },
  { name: 'authorFollowUnitRateVnd', label: 'Author reward / follow unit', min: 1, max: MONEY_MAX, step: 1000 },
  { name: 'authorMonthlyLimitVnd', label: 'Author monthly limit', min: 1, max: MONEY_MAX, step: 1000 },
]

const defaultSettings = {
  minimumPayoutVnd: '50000',
  translatorTaskRateVnd: '50000',
  translatorMonthlyLimitVnd: '5000000',
  authorViewsPerUnit: '1000',
  authorViewUnitRateVnd: '1000000',
  authorFollowsPerUnit: '100',
  authorFollowUnitRateVnd: '1000000',
  authorMonthlyLimitVnd: '12000000',
  currencyRates: [],
}

const toSettingsForm = (source = {}) => ({
  ...defaultSettings,
  ...source,
  minimumPayoutVnd: String(source.minimumPayoutVnd ?? defaultSettings.minimumPayoutVnd),
  translatorTaskRateVnd: String(source.translatorTaskRateVnd ?? defaultSettings.translatorTaskRateVnd),
  translatorMonthlyLimitVnd: String(source.translatorMonthlyLimitVnd ?? defaultSettings.translatorMonthlyLimitVnd),
  authorViewsPerUnit: String(source.authorViewsPerUnit ?? defaultSettings.authorViewsPerUnit),
  authorViewUnitRateVnd: String(source.authorViewUnitRateVnd ?? defaultSettings.authorViewUnitRateVnd),
  authorFollowsPerUnit: String(source.authorFollowsPerUnit ?? defaultSettings.authorFollowsPerUnit),
  authorFollowUnitRateVnd: String(source.authorFollowUnitRateVnd ?? defaultSettings.authorFollowUnitRateVnd),
  authorMonthlyLimitVnd: String(source.authorMonthlyLimitVnd ?? defaultSettings.authorMonthlyLimitVnd),
  currencyRates: Array.isArray(source.currencyRates) ? source.currencyRates : [],
})

const blockNonIntegerKeys = (event) => {
  if (['e', 'E', '+', '-', '.', ','].includes(event.key)) {
    event.preventDefault()
  }
}

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
  const [settings, setSettings] = useState(() => toSettingsForm(defaultSettings))
  const [currencyDraft, setCurrencyDraft] = useState({ countryCode: 'VN', currencyCode: 'VND', vndPerUnit: 1, active: true })
  const [loading, setLoading] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [workingId, setWorkingId] = useState('')
  const [error, setError] = useState('')

  const loadPayouts = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const requestKey = `admin-payouts:${activeStatus || 'ALL'}:100`
      const result = await runDedupedRequest(
        requestKey,
        () => getAdminPayoutsApi({
          status: activeStatus || undefined,
          size: 100,
        }),
      )
      setData(result || { items: [], counts: {}, totals: {} })
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load payout requests.')
    } finally {
      setLoading(false)
    }
  }, [activeStatus])

  const loadSettings = useCallback(async () => {
    try {
      setSettingsLoading(true)
      const result = await runDedupedRequest(
        'admin-payout-settings',
        () => getAdminPayoutSettingsApi(),
      )
      setSettings(toSettingsForm(result || {}))
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load payout settings.')
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPayouts()
  }, [loadPayouts])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const items = Array.isArray(data?.items) ? data.items : []
  const summaryCards = useMemo(() => ['PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED'].map((status) => ({
    status,
    count: Number(data?.counts?.[status]) || 0,
    total: Number(data?.totals?.[status]) || 0,
  })), [data])

  const updateSettingField = (name, value) => {
    // Keep the draft as text so Admin can clear a field and type a new value.
    // Conversion to number happens only after validation on Save.
    const digitsOnly = value.replace(/\D/g, '')
    setSettings((current) => ({ ...current, [name]: digitsOnly }))
  }

  const buildSettingsPayload = () => {
    const payload = {}

    for (const field of SETTING_FIELDS) {
      const rawValue = String(settings[field.name] ?? '').trim()

      if (!rawValue) {
        throw new Error(`${field.label} is required.`)
      }

      if (!/^\d+$/.test(rawValue)) {
        throw new Error(`${field.label} must be a whole number.`)
      }

      const value = Number(rawValue)
      if (!Number.isSafeInteger(value)) {
        throw new Error(`${field.label} is too large.`)
      }

      if (value < field.min || value > field.max) {
        throw new Error(
          `${field.label} must be from ${field.min.toLocaleString('vi-VN')} to ${field.max.toLocaleString('vi-VN')}.`,
        )
      }

      payload[field.name] = value
    }

    return payload
  }

  const saveSettings = async () => {
    let payload

    try {
      payload = buildSettingsPayload()
    } catch (validationError) {
      const message = validationError?.message || 'Please check the payout settings.'
      setError(message)
      toast.warning(message)
      return
    }

    try {
      setSavingSettings(true)
      setError('')
      const result = await updateAdminPayoutSettingsApi(payload)
      setSettings(toSettingsForm(result || {}))
      toast.success('Payout calculation settings saved.')
    } catch (err) {
      const validationErrors = err?.response?.data?.errors
      const firstValidationError = validationErrors && Object.values(validationErrors)[0]
      const message = firstValidationError
        || err?.response?.data?.message
        || err?.message
        || 'Could not save payout settings.'
      setError(message)
      toast.error(message)
    } finally {
      setSavingSettings(false)
    }
  }

  const saveCurrency = async () => {
    try {
      setSavingSettings(true)
      await upsertAdminPayoutCurrencyApi({
        countryCode: currencyDraft.countryCode.trim().toUpperCase(),
        currencyCode: currencyDraft.currencyCode.trim().toUpperCase(),
        vndPerUnit: Number(currencyDraft.vndPerUnit),
        active: Boolean(currencyDraft.active),
      })
      toast.success('Author test currency conversion saved.')
      await loadSettings()
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not save currency conversion.'
      setError(message)
      toast.error(message)
    } finally {
      setSavingSettings(false)
    }
  }

  const editCurrency = (rate) => {
    setCurrencyDraft({
      countryCode: rate.countryCode || '',
      currencyCode: rate.currencyCode || '',
      vndPerUnit: Number(rate.vndPerUnit) || 1,
      active: rate.active !== false,
    })
  }

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
          <p>Manage reward formulas, monthly withdrawal limits, Author test FX rates, and Stripe sandbox transfers.</p>
        </div>
        <button className="btn-table-action" onClick={() => { loadPayouts(); loadSettings() }} disabled={loading}>Refresh</button>
      </div>

      <section className="admin-payout-settings">
        <div className="admin-payout-settings-head">
          <div><h2>Revenue & withdrawal rules</h2><p>All calculation values are stored in VND. Currency rates apply only to Author payouts and are manual sandbox rates, not live FX.</p></div>
          <button className="btn-table-action payout-mark-paid" onClick={saveSettings} disabled={savingSettings || settingsLoading}>{savingSettings ? 'Saving...' : 'Save settings'}</button>
        </div>
        <div className="admin-payout-settings-grid">
          {SETTING_FIELDS.map((field) => (
            <label key={field.name}>
              {field.label}
              <input
                type="number"
                inputMode="numeric"
                min={field.min}
                max={field.max}
                step={field.step}
                value={settings[field.name]}
                disabled={settingsLoading || savingSettings}
                onKeyDown={blockNonIntegerKeys}
                onWheel={(event) => event.currentTarget.blur()}
                onChange={(event) => updateSettingField(field.name, event.target.value)}
                aria-label={field.label}
              />
              <small className="admin-payout-field-hint">
                Maximum: {field.max.toLocaleString('vi-VN')}
              </small>
            </label>
          ))}
        </div>

        <div className="admin-payout-currency-editor">
          <div><h3>Author country currency conversion</h3><p>Only Author payouts use this mapping. Translator payouts always remain in VND. Example: US / USD / 25000 means 1 USD equals 25,000 VND.</p></div>
          <input maxLength="2" value={currencyDraft.countryCode} onChange={(e) => setCurrencyDraft((c) => ({ ...c, countryCode: e.target.value }))} placeholder="VN" />
          <input maxLength="3" value={currencyDraft.currencyCode} onChange={(e) => setCurrencyDraft((c) => ({ ...c, currencyCode: e.target.value }))} placeholder="VND" />
          <input type="number" min="0.000001" step="0.000001" value={currencyDraft.vndPerUnit} onChange={(e) => setCurrencyDraft((c) => ({ ...c, vndPerUnit: e.target.value }))} />
          <label className="admin-payout-checkbox"><input type="checkbox" checked={currencyDraft.active} onChange={(e) => setCurrencyDraft((c) => ({ ...c, active: e.target.checked }))} /> Active</label>
          <button className="btn-table-action" onClick={saveCurrency} disabled={savingSettings}>Save currency</button>
        </div>
        <div className="admin-payout-rate-list">
          {(settings.currencyRates || []).map((rate) => (
            <button type="button" key={rate.id || rate.countryCode} onClick={() => editCurrency(rate)}>
              <strong>{rate.countryCode}</strong><span>{rate.currencyCode}</span><span>1 = {Number(rate.vndPerUnit).toLocaleString('vi-VN')} VND</span><em>{rate.active ? 'Active' : 'Disabled'}</em>
            </button>
          ))}
        </div>
      </section>

      <div className="payout-summary-grid">
        {summaryCards.map((card) => (
          <div key={card.status} className="payout-summary-card">
            <span className={`payout-summary-badge payout-summary-badge--${card.status.toLowerCase()}`}>{card.status}</span>
            <div className="payout-summary-count">{card.count}</div>
            <div className="payout-summary-total">{formatMoney(card.total, 'VND')}</div>
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
          <thead><tr><th>Creator</th><th>Role</th><th>Month</th><th>Payout</th><th>Base / cap</th><th>Stripe account</th><th>Status</th><th>Requested</th><th>Details</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" className="admin-payout-empty">Loading payout requests...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan="10" className="admin-payout-empty">No payout requests match this filter.</td></tr>
            ) : items.map((payout) => (
              <tr key={payout.id}>
                <td><div className="payout-user-cell"><span className="cell-name">{payout.userName || payout.userEmail}</span><span className="payout-reason">{payout.userEmail}</span></div></td>
                <td><span className={`role-badge ${(payout.role || '').toLowerCase()}`}>{payout.role}</span></td>
                <td>{payout.payoutMonth}</td>
                <td className="payout-amount">{formatMoney(payout.amount, payout.currency)}<small>{payout.accountCountry || 'VN'} · {payout.currency}</small></td>
                <td className="payout-amount"><span>{formatMoney(payout.baseAmountVnd, 'VND')}</span><small>Gross {formatMoney(payout.grossAmountVnd, 'VND')} · cap {formatMoney(payout.monthlyLimitVnd, 'VND')}</small></td>
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