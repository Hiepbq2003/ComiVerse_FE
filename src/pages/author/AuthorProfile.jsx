import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import '../../assets/style/author/profile.css'
import { getAuthorProfileApi, saveAuthorProfileApi } from '../../services/api/AuthorProfileApi'

const emptyProfile = {
  username: '',
  fullName: '',
  email: '',
  authorType: 'INDIVIDUAL',
  displayName: '',
  legalName: '',
  contactEmail: '',
  avatarUrl: '',
  bio: '',
  note: '',
  countryCode: 'VN',
}

const authorTypeOptions = [
  { value: 'INDIVIDUAL', label: 'Individual creator' },
  { value: 'STUDIO', label: 'Studio / team' },
  { value: 'PUBLISHER', label: 'Licensed publisher' },
  { value: 'COMPANY', label: 'Company' },
]

function AuthorProfile() {
  const [profile, setProfile] = useState(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const previewName = useMemo(() => {
    return profile.displayName || profile.fullName || profile.username || 'Author'
  }, [profile.displayName, profile.fullName, profile.username])

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      try {
        setLoading(true)
        const data = await getAuthorProfileApi()
        if (!mounted) return
        setProfile({
          ...emptyProfile,
          ...data,
          authorType: data?.authorType || 'INDIVIDUAL',
          displayName: data?.displayName || data?.fullName || data?.username || '',
          legalName: data?.legalName || data?.fullName || '',
          contactEmail: data?.contactEmail || data?.email || '',
          avatarUrl: data?.avatarUrl || '',
          bio: data?.bio || '',
          note: data?.note || '',
          countryCode: data?.countryCode || 'VN',
        })
      } catch (error) {
        toast.error(error.response?.data?.message || 'Cannot load author profile')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      mounted = false
    }
  }, [])

  const updateField = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!profile.displayName.trim()) {
      toast.error('Display name is required')
      return
    }

    const payload = {
      authorType: profile.authorType,
      displayName: profile.displayName.trim(),
      legalName: profile.legalName?.trim() || null,
      contactEmail: profile.contactEmail?.trim() || null,
      avatarUrl: profile.avatarUrl?.trim() || null,
      bio: profile.bio?.trim() || null,
      note: profile.note?.trim() || null,
      countryCode: (profile.countryCode || 'VN').trim().toUpperCase(),
    }

    try {
      setSaving(true)
      const saved = await saveAuthorProfileApi(payload)
      setProfile((prev) => ({ ...prev, ...saved }))
      toast.success('Author profile saved successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Cannot save author profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="author-page-header">
        <h1>Author Profile</h1>
        <p>Fill in the public author information used by your comics and moderation workflow.</p>
      </div>

      <div className="settings-grid author-profile-grid">
        <div className="author-section-card author-profile-preview-card">
          <h2 className="author-section-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Public Preview
          </h2>

          <div className="author-profile-preview-box">
            <div className="author-profile-avatar-preview">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt={previewName} /> : previewName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3>{previewName}</h3>
              <p>{authorTypeOptions.find((item) => item.value === profile.authorType)?.label || profile.authorType}</p>
            </div>
          </div>

          <div className="author-profile-preview-meta">
            <div>
              <span>Contact email</span>
              <strong>{profile.contactEmail || profile.email || 'Not set'}</strong>
            </div>
            <div>
              <span>Payout country</span>
              <strong>{profile.countryCode || 'VN'}</strong>
            </div>
          </div>
          <p className="author-profile-preview-bio">
            {profile.bio || 'No bio has been added yet.'}
          </p>
        </div>

        <div className="author-section-card">
          <h2 className="author-section-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Edit Profile
          </h2>

          {loading ? (
            <div className="author-empty-state">Loading author profile...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group-row">
                <div className="form-group-cell">
                  <label>Username</label>
                  <input className="form-control-premium" value={profile.username || ''} disabled />
                </div>

                <div className="form-group-cell">
                  <label>Login Email</label>
                  <input className="form-control-premium" value={profile.email || ''} disabled />
                </div>

                <div className="form-group-cell">
                  <label>Author Type</label>
                  <select
                    className="form-control-premium"
                    value={profile.authorType}
                    onChange={(e) => updateField('authorType', e.target.value)}
                  >
                    {authorTypeOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group-cell">
                  <label>Display Name *</label>
                  <input
                    className="form-control-premium"
                    value={profile.displayName}
                    onChange={(e) => updateField('displayName', e.target.value)}
                    placeholder="Name shown on comic pages"
                    maxLength={150}
                    required
                  />
                </div>

                <div className="form-group-cell">
                  <label>Legal Name</label>
                  <input
                    className="form-control-premium"
                    value={profile.legalName || ''}
                    onChange={(e) => updateField('legalName', e.target.value)}
                    placeholder="Real/company legal name"
                    maxLength={255}
                  />
                </div>

                <div className="form-group-cell">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    className="form-control-premium"
                    value={profile.contactEmail || ''}
                    onChange={(e) => updateField('contactEmail', e.target.value)}
                    placeholder="Public/business contact email"
                    maxLength={255}
                  />
                </div>


                <div className="form-group-cell">
                  <label>Country Code</label>
                  <input
                    className="form-control-premium"
                    value={profile.countryCode || 'VN'}
                    onChange={(e) => updateField('countryCode', e.target.value.toUpperCase())}
                    placeholder="VN"
                    maxLength={2}
                    pattern="[A-Za-z]{2}"
                    list="author-country-codes"
                    title="Use a 2-letter ISO country code, for example VN, US, JP"
                  />
                  <datalist id="author-country-codes">
                    <option value="VN">Vietnam</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="JP">Japan</option>
                    <option value="KR">South Korea</option>
                  </datalist>
                  <small>Admin maps this country code to the payout currency and manual sandbox conversion rate.</small>
                </div>

                <div className="form-group-cell full-width">
                  <label>Avatar URL</label>
                  <input
                    className="form-control-premium"
                    value={profile.avatarUrl || ''}
                    onChange={(e) => updateField('avatarUrl', e.target.value)}
                    placeholder="https://..."
                    maxLength={500}
                  />
                </div>
                <div className="form-group-cell full-width">
                  <label>Bio</label>
                  <textarea
                    className="form-control-premium"
                    value={profile.bio || ''}
                    onChange={(e) => updateField('bio', e.target.value)}
                    placeholder="Introduce the author/studio/publisher"
                    maxLength={3000}
                  />
                </div>

                <div className="form-group-cell full-width">
                  <label>Author Note</label>
                  <textarea
                    className="form-control-premium"
                    value={profile.note || ''}
                    onChange={(e) => updateField('note', e.target.value)}
                    placeholder="Optional verification or publishing note"
                    maxLength={2000}
                  />
                </div>
              </div>

              <button type="submit" className="btn-author-action primary" style={{ marginTop: '20px' }} disabled={saving}>
                {saving ? 'Saving...' : 'Save Author Profile'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

export default AuthorProfile
