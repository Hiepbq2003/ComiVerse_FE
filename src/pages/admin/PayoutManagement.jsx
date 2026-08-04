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

const MONEY_MAX = 1_000_000
const UNIT_MAX = 1_000_000_000

const SETTING_FIELDS = [
  {
    name: 'minimumPayoutUsd',
    label: 'Minimum payout (USD)',
    min: 0,
    max: MONEY_MAX,
    step: 0.01,
  },
  {
    name: 'translatorTaskRateUsd',
    label: 'Translator / completed task (USD)',
    min: 0.01,
    max: MONEY_MAX,
    step: 0.01,
  },
  {
    name: 'translatorMonthlyLimitUsd',
    label: 'Translator monthly limit (USD)',
    min: 0.01,
    max: MONEY_MAX,
    step: 0.01,
  },
  {
    name: 'authorViewsPerUnit',
    label: 'Author views per unit',
    min: 1,
    max: UNIT_MAX,
    step: 1,
    integer: true,
  },
  {
    name: 'authorViewUnitRateUsd',
    label: 'Author reward / view unit (USD)',
    min: 0.01,
    max: MONEY_MAX,
    step: 0.01,
  },
  {
    name: 'authorFollowsPerUnit',
    label: 'Author follows per unit',
    min: 1,
    max: UNIT_MAX,
    step: 1,
    integer: true,
  },
  {
    name: 'authorFollowUnitRateUsd',
    label: 'Author reward / follow unit (USD)',
    min: 0.01,
    max: MONEY_MAX,
    step: 0.01,
  },
  {
    name: 'authorMonthlyLimitUsd',
    label: 'Author monthly limit (USD)',
    min: 0.01,
    max: MONEY_MAX,
    step: 0.01,
  },
]

const defaultSettings = {
  accountingCurrency: 'USD',
  minimumPayoutUsd: '2.00',
  translatorTaskRateUsd: '2.00',
  translatorMonthlyLimitUsd: '200.00',
  authorViewsPerUnit: '1000',
  authorViewUnitRateUsd: '40.00',
  authorFollowsPerUnit: '100',
  authorFollowUnitRateUsd: '40.00',
  authorMonthlyLimitUsd: '480.00',
  supportedCurrencies: [],
}

const toSettingsForm = (source = {}) => ({
  ...defaultSettings,
  ...source,
  minimumPayoutUsd: String(
    source.minimumPayoutUsd ?? defaultSettings.minimumPayoutUsd,
  ),
  translatorTaskRateUsd: String(
    source.translatorTaskRateUsd ?? defaultSettings.translatorTaskRateUsd,
  ),
  translatorMonthlyLimitUsd: String(
    source.translatorMonthlyLimitUsd
    ?? defaultSettings.translatorMonthlyLimitUsd,
  ),
  authorViewsPerUnit: String(
    source.authorViewsPerUnit ?? defaultSettings.authorViewsPerUnit,
  ),
  authorViewUnitRateUsd: String(
    source.authorViewUnitRateUsd
    ?? defaultSettings.authorViewUnitRateUsd,
  ),
  authorFollowsPerUnit: String(
    source.authorFollowsPerUnit ?? defaultSettings.authorFollowsPerUnit,
  ),
  authorFollowUnitRateUsd: String(
    source.authorFollowUnitRateUsd
    ?? defaultSettings.authorFollowUnitRateUsd,
  ),
  authorMonthlyLimitUsd: String(
    source.authorMonthlyLimitUsd ?? defaultSettings.authorMonthlyLimitUsd,
  ),
  supportedCurrencies: Array.isArray(source.supportedCurrencies)
    ? source.supportedCurrencies
    : [],
})

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

const countFractionDigits = (value) => {
  const normalized = String(value)
  const dot = normalized.indexOf('.')
  return dot < 0 ? 0 : normalized.length - dot - 1
}

function PayoutManagement() {
  const [activeStatus, setActiveStatus] = useState('')
  const [data, setData] = useState({ items: [], counts: {}, totals: {} })
  const [settings, setSettings] = useState(
    () => toSettingsForm(defaultSettings),
  )
  const [currencyDraft, setCurrencyDraft] = useState({
    currencyCode: 'USD',
    unitsPerUsd: '1.000000',
    active: true,
  })
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
      setError(
        err?.response?.data?.message
        || err?.message
        || 'Could not load payout requests.',
      )
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
      setError(
        err?.response?.data?.message
        || err?.message
        || 'Could not load payout settings.',
      )
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
  const totalsCurrency = data?.totalsCurrency || 'USD'
  const summaryCards = useMemo(
    () => [
      'PENDING',
      'APPROVED',
      'PROCESSING',
      'PAID',
      'REJECTED',
      'FAILED',
    ].map((status) => ({
      status,
      count: Number(data?.counts?.[status]) || 0,
      total: Number(data?.totals?.[status]) || 0,
    })),
    [data],
  )

  const updateSettingField = (field, rawValue) => {
    const normalized = rawValue.replace(',', '.')

    if (field.integer) {
      if (!/^\d*$/.test(normalized)) return
    } else if (!/^\d*(\.\d{0,2})?$/.test(normalized)) {
      return
    }

    setSettings((current) => ({
      ...current,
      [field.name]: normalized,
    }))
  }

  const buildSettingsPayload = () => {
    const payload = {}

    for (const field of SETTING_FIELDS) {
      const rawValue = String(settings[field.name] ?? '').trim()
      if (!rawValue) {
        throw new Error(`${field.label} is required.`)
      }

      if (field.integer && !/^\d+$/.test(rawValue)) {
        throw new Error(`${field.label} must be a whole number.`)
      }

      if (!field.integer && !/^\d+(\.\d{1,2})?$/.test(rawValue)) {
        throw new Error(`${field.label} must have at most 2 decimal places.`)
      }

      const value = Number(rawValue)
      if (!Number.isFinite(value)) {
        throw new Error(`${field.label} is invalid.`)
      }

      if (field.integer && !Number.isSafeInteger(value)) {
        throw new Error(`${field.label} is too large.`)
      }

      if (value < field.min || value > field.max) {
        throw new Error(
          `${field.label} must be from ${field.min.toLocaleString('vi-VN')} `
          + `to ${field.max.toLocaleString('vi-VN')}.`,
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
      const message = validationError?.message
        || 'Please check the payout settings.'
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
      const firstValidationError = validationErrors
        && Object.values(validationErrors)[0]
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
    const currencyCode = currencyDraft.currencyCode.trim().toUpperCase()
    const unitsPerUsd = Number(currencyDraft.unitsPerUsd)

    if (!['USD', 'EUR', 'CNY'].includes(currencyCode)) {
      const message = 'Currency must be USD, EUR, or CNY.'
      setError(message)
      toast.warning(message)
      return
    }

    if (!Number.isFinite(unitsPerUsd)
        || unitsPerUsd <= 0
        || unitsPerUsd > 1_000_000
        || countFractionDigits(currencyDraft.unitsPerUsd) > 6) {
      const message = 'Units per USD must be positive and have at most 6 decimal places.'
      setError(message)
      toast.warning(message)
      return
    }

    try {
      setSavingSettings(true)
      setError('')
      await upsertAdminPayoutCurrencyApi({
        currencyCode,
        unitsPerUsd,
        active: currencyCode === 'USD'
          ? true
          : Boolean(currencyDraft.active),
      })
      toast.success('Payout currency conversion saved.')
      await loadSettings()
    } catch (err) {
      const message = err?.response?.data?.message
        || err?.message
        || 'Could not save currency conversion.'
      setError(message)
      toast.error(message)
    } finally {
      setSavingSettings(false)
    }
  }

  const editCurrency = (rate) => {
    setCurrencyDraft({
      currencyCode: rate.currencyCode || 'USD',
      unitsPerUsd: String(rate.unitsPerUsd ?? 1),
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
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1>Payout Management</h1>
          <p>
            Manage USD accounting rules, USD/EUR/CNY sandbox conversion,
            and Stripe Connect transfers.
          </p>
        </div>
        <button
          className="btn-table-action"
          onClick={() => {
            loadPayouts()
            loadSettings()
          }}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <section className="admin-payout-settings">
        <div className="admin-payout-settings-head">
          <div>
            <h2>Revenue & withdrawal rules</h2>
            <p>
              Revenue formulas and limits are stored in USD. EUR and CNY are
              settlement conversions configured separately below.
            </p>
          </div>
          <button
            className="btn-table-action payout-mark-paid"
            onClick={saveSettings}
            disabled={savingSettings || settingsLoading}
          >
            {savingSettings ? 'Saving...' : 'Save settings'}
          </button>
        </div>

        <div className="admin-payout-settings-grid">
          {SETTING_FIELDS.map((field) => (
            <label key={field.name}>
              {field.label}
              <input
                type="number"
                inputMode={field.integer ? 'numeric' : 'decimal'}
                min={field.min}
                max={field.max}
                step={field.step}
                value={settings[field.name]}
                disabled={settingsLoading || savingSettings}
                onKeyDown={(event) => {
                  if (['e', 'E', '+', '-'].includes(event.key)
                      || (field.integer && ['.', ','].includes(event.key))) {
                    event.preventDefault()
                  }
                }}
                onWheel={(event) => event.currentTarget.blur()}
                onChange={(event) => updateSettingField(
                  field,
                  event.target.value,
                )}
                aria-label={field.label}
              />
              <small className="admin-payout-field-hint">
                Maximum: {field.max.toLocaleString('vi-VN')}
              </small>
            </label>
          ))}
        </div>

        <div className="admin-payout-currency-editor">
          <div>
            <h3>Supported payout currencies</h3>
            <p>
              Enter how many currency units equal 1 USD. Only USD, EUR, and CNY
              are accepted. USD is always active at 1.000000.
            </p>
          </div>
          <select
            value={currencyDraft.currencyCode}
            onChange={(event) => setCurrencyDraft((current) => ({
              ...current,
              currencyCode: event.target.value,
              unitsPerUsd: event.target.value === 'USD'
                ? '1.000000'
                : current.unitsPerUsd,
              active: event.target.value === 'USD'
                ? true
                : current.active,
            }))}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="CNY">CNY</option>
          </select>
          <input
            type="number"
            min="0.000001"
            max="1000000"
            step="0.000001"
            value={currencyDraft.unitsPerUsd}
            disabled={currencyDraft.currencyCode === 'USD'}
            onChange={(event) => setCurrencyDraft((current) => ({
              ...current,
              unitsPerUsd: event.target.value,
            }))}
            aria-label="Units per USD"
          />
          <label className="admin-payout-checkbox">
            <input
              type="checkbox"
              checked={currencyDraft.active}
              disabled={currencyDraft.currencyCode === 'USD'}
              onChange={(event) => setCurrencyDraft((current) => ({
                ...current,
                active: event.target.checked,
              }))}
            />
            Active
          </label>
          <button
            className="btn-table-action"
            onClick={saveCurrency}
            disabled={savingSettings}
          >
            Save currency
          </button>
        </div>

        <div className="admin-payout-rate-list">
          {(settings.supportedCurrencies || []).map((rate) => (
            <button
              type="button"
              key={rate.currencyCode}
              onClick={() => editCurrency(rate)}
            >
              <strong>{rate.currencyCode}</strong>
              <span>{rate.symbol} {rate.displayName}</span>
              <span>
                1 USD = {Number(rate.unitsPerUsd).toLocaleString('vi-VN', {
                  maximumFractionDigits: 6,
                })} {rate.currencyCode}
              </span>
              <em>{rate.active ? 'Active' : 'Disabled'}</em>
            </button>
          ))}
        </div>
      </section>

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
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.label}
            className={`payout-filter-tab ${activeStatus === tab.value ? 'active' : ''}`}
            onClick={() => setActiveStatus(tab.value)}
          >
            {tab.label}
            {tab.value
              ? ` (${Number(data?.counts?.[tab.value]) || 0})`
              : ''}
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
            ) : items.map((payout) => (
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
                  <span className={`status-badge ${(payout.status || '').toLowerCase()}`}>
                    {payout.status}
                  </span>
                </td>
                <td>{formatDate(payout.requestedAt || payout.createdAt)}</td>
                <td className="admin-payout-details">
                  {payout.failureReason
                    || payout.adminNote
                    || payout.calculationDetails
                    || payout.requestNote
                    || '—'}
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
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  )
}

export default PayoutManagement
