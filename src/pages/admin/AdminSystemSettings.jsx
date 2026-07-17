import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import AdminLayout from '../../components/layout/AdminLayout'
import { getAdminPremiumPlanSettingsApi, updateAdminPremiumPlanSettingsApi } from '../../services/api/PlanApi'
import '../../assets/style/admin/system-settings.css'

const DEFAULT_SETTINGS = {
  monthlyPrice: 79000,
  yearlyPrice: 790000,
  benefits: [
    'Read without ads',
    'Early access to newest chapters',
    'Offline chapter downloads',
    'Exclusive Premium badge',
    'Priority support'
  ]
}

function AdminSystemSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [newBenefit, setNewBenefit] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetchSettings = async () => {
      try {
        setLoading(true)
        const data = await getAdminPremiumPlanSettingsApi()
        if (mounted && data) {
          setSettings({
            monthlyPrice: data.monthlyPrice ?? DEFAULT_SETTINGS.monthlyPrice,
            yearlyPrice: data.yearlyPrice ?? DEFAULT_SETTINGS.yearlyPrice,
            benefits: Array.isArray(data.benefits) && data.benefits.length > 0 ? data.benefits : DEFAULT_SETTINGS.benefits
          })
        }
      } catch (err) {
        console.error(err)
        toast.error('Failed to load premium plan settings.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchSettings()
    return () => { mounted = false }
  }, [])

  const formatVnd = (value) => {
    const number = Number(value || 0)
    return number.toLocaleString('vi-VN') + 'd'
  }

  const handlePriceChange = (field, value) => {
    const normalized = value.replace(/[^0-9]/g, '')
    setSettings((prev) => ({ ...prev, [field]: normalized }))
  }

  const handleAddBenefit = () => {
    const benefit = newBenefit.trim()
    if (!benefit) return
    if (settings.benefits.some((item) => item.toLowerCase() === benefit.toLowerCase())) {
      toast.warning('This benefit already exists.')
      return
    }
    if (settings.benefits.length >= 12) {
      toast.warning('You can add up to 12 benefits only.')
      return
    }
    setSettings((prev) => ({ ...prev, benefits: [...prev.benefits, benefit] }))
    setNewBenefit('')
  }

  const handleRemoveBenefit = (index) => {
    if (settings.benefits.length <= 1) {
      toast.warning('Please keep at least one premium benefit.')
      return
    }
    setSettings((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, benefitIndex) => benefitIndex !== index)
    }))
  }

  const handleSave = async () => {
    const monthlyPrice = Number(settings.monthlyPrice)
    const yearlyPrice = Number(settings.yearlyPrice)
    const benefits = settings.benefits.map((item) => item.trim()).filter(Boolean)

    if (Number.isNaN(monthlyPrice) || monthlyPrice < 0 || Number.isNaN(yearlyPrice) || yearlyPrice < 0) {
      toast.error('Premium prices must be valid non-negative numbers.')
      return
    }
    if (benefits.length === 0) {
      toast.error('Please keep at least one premium benefit before saving.')
      return
    }

    try {
      setSaving(true)
      const saved = await updateAdminPremiumPlanSettingsApi({ monthlyPrice, yearlyPrice, benefits })
      setSettings({
        monthlyPrice: saved.monthlyPrice,
        yearlyPrice: saved.yearlyPrice,
        benefits: saved.benefits
      })
      toast.success('Premium plan settings saved.')
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to save premium plan settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout activeNav="settings">
      <div className="admin-page-header">
        <div className="admin-page-header-info">
          <h1>System Settings</h1>
          <p>Manage premium plan pricing displayed to readers</p>
        </div>
      </div>

      <div className="admin-data-table-wrapper" style={{ maxWidth: 900, padding: 28 }}>
        <div className="admin-page-header" style={{ marginBottom: 24 }}>
          <div className="admin-page-header-info">
            <h1 style={{ fontSize: 20 }}>Premium Plans</h1>
            <p>Prices shown to users on the Premium upgrade page</p>
          </div>
        </div>

        {loading ? (
          <div className="admin-empty-state">
            <div className="admin-spinner-sm" />
            <p>Loading settings...</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))', gap: 20, marginBottom: 28 }}>
              <div style={{ border: '1px solid var(--admin-border)', borderRadius: 12, padding: 20, position: 'relative' }}>
                <span className="role-badge admin" style={{ position: 'absolute', right: 16, top: -12 }}>Popular</span>
                <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Monthly</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    className="admin-form-input"
                    value={settings.monthlyPrice}
                    onChange={(e) => handlePriceChange('monthlyPrice', e.target.value)}
                    inputMode="numeric"
                  />
                  <span style={{ color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>VND/month</span>
                </div>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: 13, margin: '10px 0 0' }}>{formatVnd(settings.monthlyPrice)}</p>
              </div>

              <div style={{ border: '1px solid var(--admin-border)', borderRadius: 12, padding: 20, position: 'relative' }}>
                <span className="role-badge translator" style={{ position: 'absolute', right: 16, top: -12 }}>Best Value</span>
                <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>Yearly</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    className="admin-form-input"
                    value={settings.yearlyPrice}
                    onChange={(e) => handlePriceChange('yearlyPrice', e.target.value)}
                    inputMode="numeric"
                  />
                  <span style={{ color: 'var(--admin-text-muted)', whiteSpace: 'nowrap' }}>VND/year</span>
                </div>
                <p style={{ color: 'var(--admin-green)', fontSize: 13, margin: '10px 0 0' }}>{formatVnd(settings.yearlyPrice)}</p>
              </div>
            </div>

            <h3 style={{ fontSize: 16, margin: '0 0 14px' }}>Premium Benefits</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {settings.benefits.map((benefit, index) => (
                <div
                  key={`${benefit}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    border: '1px solid var(--admin-border)',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)'
                  }}
                >
                  <span style={{ color: 'var(--admin-green)', fontWeight: 700 }}>✓</span>
                  <span style={{ flex: 1, color: 'var(--admin-text-secondary)' }}>{benefit}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBenefit(index)}
                    className="admin-action-btn admin-action-btn--delete"
                    title="Remove benefit"
                  >
                    ×
                  </button>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <input
                  className="admin-form-input"
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddBenefit()
                    }
                  }}
                  placeholder="Add a premium benefit..."
                  maxLength={140}
                />
                <button type="button" className="admin-btn admin-btn--primary" onClick={handleAddBenefit}>
                  + Add
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <button className="admin-btn admin-btn--primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? <><span className="admin-spinner-sm" /> Saving...</> : 'Save Settings'}
        </button>
      </div>
    </AdminLayout>
  )
}

export default AdminSystemSettings
