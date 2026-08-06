import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AdminLayout from '../../components/layout/AdminLayout'
import '../../assets/style/admin/payout.css'
import {
  getAdminPayoutSettingsApi,
  updateAdminPayoutSettingsApi,
  upsertAdminPayoutCurrencyApi,
} from '../../services/api/PayoutApi'

const MONEY_MAX = 1_000_000
const UNIT_MAX = 1_000_000_000

const SETTING_FIELDS = [
  { name: 'minimumPayoutUsd', label: 'Minimum payout (USD)', min: 0, max: MONEY_MAX, step: 0.01 },
  { name: 'translatorTaskRateUsd', label: 'Default translator rate / page (USD)', min: 0.01, max: MONEY_MAX, step: 0.01 },
  { name: 'translatorMonthlyLimitUsd', label: 'Legacy translator monthly limit (unused)', min: 0.01, max: MONEY_MAX, step: 0.01 },
  { name: 'authorViewsPerUnit', label: 'Author views per unit', min: 1, max: UNIT_MAX, step: 1, integer: true },
  { name: 'authorViewUnitRateUsd', label: 'Author reward / view unit (USD)', min: 0.01, max: MONEY_MAX, step: 0.01 },
  { name: 'authorFollowsPerUnit', label: 'Author follows per unit', min: 1, max: UNIT_MAX, step: 1, integer: true },
  { name: 'authorFollowUnitRateUsd', label: 'Author reward / follow unit (USD)', min: 0.01, max: MONEY_MAX, step: 0.01 },
  { name: 'authorMonthlyLimitUsd', label: 'Author monthly limit (USD)', min: 0.01, max: MONEY_MAX, step: 0.01 },
]

const defaultSettings = {
  minimumPayoutUsd: '10.00',
  translatorTaskRateUsd: '1.20',
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
  ...Object.fromEntries(SETTING_FIELDS.map((field) => [
    field.name,
    String(source[field.name] ?? defaultSettings[field.name]),
  ])),
  supportedCurrencies: Array.isArray(source.supportedCurrencies) ? source.supportedCurrencies : [],
})

const countFractionDigits = (value) => {
  const normalized = String(value)
  const dot = normalized.indexOf('.')
  return dot < 0 ? 0 : normalized.length - dot - 1
}

function PayoutSettings() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(() => toSettingsForm(defaultSettings))
  const [currencyDraft, setCurrencyDraft] = useState({ currencyCode: 'USD', unitsPerUsd: '1.000000', active: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const result = await getAdminPayoutSettingsApi()
      setSettings(toSettingsForm(result || {}))
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load payout settings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const updateField = (field, rawValue) => {
    const normalized = rawValue.replace(',', '.')
    if (field.integer ? !/^\d*$/.test(normalized) : !/^\d*(\.\d{0,2})?$/.test(normalized)) return
    setSettings((current) => ({ ...current, [field.name]: normalized }))
  }

  const buildPayload = () => Object.fromEntries(SETTING_FIELDS.map((field) => {
    const rawValue = String(settings[field.name] ?? '').trim()
    if (!rawValue) throw new Error(`${field.label} is required.`)
    if (field.integer && !/^\d+$/.test(rawValue)) throw new Error(`${field.label} must be a whole number.`)
    if (!field.integer && !/^\d+(\.\d{1,2})?$/.test(rawValue)) throw new Error(`${field.label} must have at most 2 decimal places.`)
    const value = Number(rawValue)
    if (!Number.isFinite(value) || (field.integer && !Number.isSafeInteger(value))) throw new Error(`${field.label} is invalid.`)
    if (value < field.min || value > field.max) throw new Error(`${field.label} must be from ${field.min.toLocaleString('vi-VN')} to ${field.max.toLocaleString('vi-VN')}.`)
    return [field.name, value]
  }))

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError('')
      const result = await updateAdminPayoutSettingsApi(buildPayload())
      setSettings(toSettingsForm(result || {}))
      toast.success('Payout calculation settings saved.')
    } catch (err) {
      const validationErrors = err?.response?.data?.errors
      const message = (validationErrors && Object.values(validationErrors)[0]) || err?.response?.data?.message || err?.message || 'Could not save payout settings.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const saveCurrency = async () => {
    const currencyCode = currencyDraft.currencyCode.trim().toUpperCase()
    const unitsPerUsd = Number(currencyDraft.unitsPerUsd)
    if (!Number.isFinite(unitsPerUsd) || unitsPerUsd <= 0 || unitsPerUsd > 1_000_000 || countFractionDigits(currencyDraft.unitsPerUsd) > 6) {
      const message = 'Units per USD must be positive and have at most 6 decimal places.'
      setError(message)
      toast.warning(message)
      return
    }
    try {
      setSaving(true)
      setError('')
      await upsertAdminPayoutCurrencyApi({ currencyCode, unitsPerUsd, active: currencyCode === 'USD' || Boolean(currencyDraft.active) })
      toast.success('Payout currency conversion saved.')
      await loadSettings()
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Could not save currency conversion.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const editCurrency = (rate) => setCurrencyDraft({
    currencyCode: rate.currencyCode || 'USD',
    unitsPerUsd: String(rate.unitsPerUsd ?? 1),
    active: rate.active !== false,
  })

  return (
    <AdminLayout activeNav="payout">
      <div className="admin-payout-screen admin-payout-settings-page">
        <div className="admin-page-header">
          <div className="admin-page-header-info">
            <h1>Payment Settings</h1>
            <p>Configure payout formulas, withdrawal limits, and settlement currencies.</p>
          </div>
          <div className="admin-payout-header-actions">
            <button className="admin-payout-view-tab" onClick={() => navigate('/admin/payout/history')}>Payment history</button>
            <button className="admin-payout-view-tab active" onClick={() => navigate('/admin/payout/settings')}>Payment settings</button>
          </div>
        </div>

        {error && <div className="admin-payout-error">{error}</div>}

        <section className="admin-payout-settings">
          <div className="admin-payout-settings-head">
            <div><h2>Revenue & withdrawal rules</h2><p>Revenue formulas and limits are stored in USD.</p></div>
            <button className="btn-table-action payout-mark-paid" onClick={saveSettings} disabled={saving || loading}>{saving ? 'Saving...' : 'Save settings'}</button>
          </div>
          <div className="admin-payout-settings-grid">
            {SETTING_FIELDS.map((field) => (
              <label key={field.name}>{field.label}
                <input type="number" inputMode={field.integer ? 'numeric' : 'decimal'} min={field.min} max={field.max} step={field.step} value={settings[field.name]} disabled={loading || saving} onKeyDown={(event) => { if (['e', 'E', '+', '-'].includes(event.key) || (field.integer && ['.', ','].includes(event.key))) event.preventDefault() }} onWheel={(event) => event.currentTarget.blur()} onChange={(event) => updateField(field, event.target.value)} />
                <small className="admin-payout-field-hint">Maximum: {field.max.toLocaleString('vi-VN')}</small>
              </label>
            ))}
          </div>

          <div className="admin-payout-currency-editor">
            <div><h3>Supported payout currencies</h3><p>Set how many currency units equal 1 USD.</p></div>
            <select value={currencyDraft.currencyCode} onChange={(event) => setCurrencyDraft((current) => ({ ...current, currencyCode: event.target.value, unitsPerUsd: event.target.value === 'USD' ? '1.000000' : current.unitsPerUsd, active: event.target.value === 'USD' ? true : current.active }))}>
              <option value="USD">USD</option><option value="EUR">EUR</option><option value="CNY">CNY</option>
            </select>
            <input type="number" min="0.000001" max="1000000" step="0.000001" value={currencyDraft.unitsPerUsd} disabled={currencyDraft.currencyCode === 'USD'} onChange={(event) => setCurrencyDraft((current) => ({ ...current, unitsPerUsd: event.target.value }))} aria-label="Units per USD" />
            <label className="admin-payout-checkbox"><input type="checkbox" checked={currencyDraft.active} disabled={currencyDraft.currencyCode === 'USD'} onChange={(event) => setCurrencyDraft((current) => ({ ...current, active: event.target.checked }))} />Active</label>
            <button className="btn-table-action" onClick={saveCurrency} disabled={saving}>Save currency</button>
          </div>
          <div className="admin-payout-rate-list">
            {(settings.supportedCurrencies || []).map((rate) => (
              <button type="button" key={rate.currencyCode} onClick={() => editCurrency(rate)}><strong>{rate.currencyCode}</strong><span>{rate.symbol} {rate.displayName}</span><span>1 USD = {Number(rate.unitsPerUsd).toLocaleString('vi-VN', { maximumFractionDigits: 6 })} {rate.currencyCode}</span><em>{rate.active ? 'Active' : 'Disabled'}</em></button>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}

export default PayoutSettings
