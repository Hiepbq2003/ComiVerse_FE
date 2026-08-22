import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AdminLayout from '../../components/layout/AdminLayout'
import '../../assets/style/admin/payout.css'
import {
  getAdminPayoutSettingsApi,
  updateAdminPayoutSettingsApi,
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


function PayoutSettings() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(() => toSettingsForm(defaultSettings))
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


  return (
    <AdminLayout activeNav="payout">
      <div className="admin-payout-screen admin-payout-settings-page">
        <div className="admin-page-header">
          <div className="admin-page-header-info">
            <h1>Payment Settings</h1>
            <p>Configure USD payout formulas and withdrawal limits.</p>
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
            <button className="payout-liquid-btn" onClick={saveSettings} disabled={saving || loading}>{saving ? 'Saving...' : 'Save settings'}</button>
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
            <div><h3>Settlement currency</h3><p>All creator earnings, limits, requests, and Stripe transfers use USD.</p></div>
            <strong>USD — US Dollar ($)</strong>
          </div>
        </section>
      </div>
    </AdminLayout>
  )
}

export default PayoutSettings
