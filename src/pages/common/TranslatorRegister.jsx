import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { registerTranslatorApi, getMyTranslatorProfileApi } from '../../services/api/TranslatorApi'
import HomeLayout from "../../components/layout/HomeLayout"
import { useAuth } from '../../context/AuthContext'
import { Languages, Sparkles, Phone, Link2, CheckCircle2, ArrowLeft, AlertCircle, X } from "lucide-react"

const SUGGESTED_LANGUAGES = [
  'English', 'Japanese', 'Korean', 'Chinese', 'Vietnamese',
  'French', 'Spanish'
]

const cardStyle = {
  background: 'var(--trans-card-bg, #1a1225)',
  border: '1px solid var(--trans-border, rgba(255,255,255,0.08))',
  borderRadius: '14px'
}

const errorTextStyle = { color: '#f87171', fontSize: '12px', marginTop: '4px' }

function validateForm(form) {
  const errors = {}

  if (!form.specializations || form.specializations.length === 0) {
    errors.specializations = 'Please add at least one language.'
  }

  if (form.experienceYears === '' || form.experienceYears === null || form.experienceYears === undefined) {
    errors.experienceYears = 'Years of experience is required.'
  } else if (Number(form.experienceYears) < 0 || Number(form.experienceYears) > 60) {
    errors.experienceYears = 'Please enter a value between 0 and 60.'
  }

  if (!form.phoneNumber.trim()) {
    errors.phoneNumber = 'Phone number is required.'
  } else if (!/^[+0-9\s-]{8,20}$/.test(form.phoneNumber.trim())) {
    errors.phoneNumber = 'Please enter a valid phone number.'
  }

  if (!form.facebookUrl.trim()) {
    errors.facebookUrl = 'Facebook profile URL is required.'
  } else if (!/^https?:\/\/.+/.test(form.facebookUrl.trim())) {
    errors.facebookUrl = 'Please enter a valid URL (starting with http:// or https://).'
  }

  return errors
}

function LanguageTagInput({ selected, onAdd, onRemove }) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  const commitValue = (raw) => {
    const value = raw.trim()
    if (!value) return
    const alreadyAdded = selected.some((s) => s.toLowerCase() === value.toLowerCase())
    if (!alreadyAdded) {
      onAdd(value)
    }
    setInputValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitValue(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && selected.length > 0) {
      onRemove(selected[selected.length - 1])
    }
  }

  const remainingSuggestions = SUGGESTED_LANGUAGES.filter(
    (lang) => !selected.some((s) => s.toLowerCase() === lang.toLowerCase())
  )

  return (
    <div>
      <div
        className="trans-form-input d-flex flex-wrap align-items-center gap-2"
        style={{ minHeight: '46px', height: 'auto', paddingTop: '8px', paddingBottom: '8px', cursor: 'text' }}
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((lang) => (
          <span
            key={lang}
            className="d-inline-flex align-items-center gap-1"
            style={{
              padding: '4px 8px 4px 12px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #a855f7, #ec4899)'
            }}
          >
            {lang}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(lang)
              }}
              className="d-inline-flex align-items-center justify-content-center"
              style={{
                border: 'none',
                background: 'rgba(255,255,255,0.25)',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                color: '#fff',
                cursor: 'pointer',
                padding: 0
              }}
              aria-label={`Remove ${lang}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commitValue(inputValue)}
          placeholder={selected.length === 0 ? 'Type a language and press Enter…' : 'Add another…'}
          style={{
            flex: 1,
            minWidth: '140px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--trans-text-primary, #fff)',
            fontSize: '14px'
          }}
        />
      </div>

      {remainingSuggestions.length > 0 && (
        <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
          <span style={{ fontSize: '11px', color: 'var(--trans-text-muted, #94a3b8)' }}>Quick add:</span>
          {remainingSuggestions.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => onAdd(lang)}
              className="btn btn-sm rounded-pill px-3"
              style={{
                border: '1.5px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: 'var(--trans-text-secondary, #cbd5e1)',
                fontWeight: 600,
                fontSize: '12px'
              }}
            >
              + {lang}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return (
    <div style={errorTextStyle} className="d-flex align-items-center gap-1">
      <AlertCircle size={12} /> {message}
    </div>
  )
}

function TranslatorRegister() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)

  const [form, setForm] = useState({
    specializations: [],
    experienceYears: '',
    phoneNumber: '',
    facebookUrl: ''
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  useEffect(() => {
    let cancelled = false
    getMyTranslatorProfileApi()
      .then((profile) => {
        if (!cancelled && profile) {
          setAlreadyRegistered(true)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const addLanguage = (lang) => {
    setForm((prev) => ({ ...prev, specializations: [...prev.specializations, lang] }))
    setTouched((t) => ({ ...t, specializations: true }))
  }

  const removeLanguage = (lang) => {
    setForm((prev) => ({
      ...prev,
      specializations: prev.specializations.filter((s) => s !== lang)
    }))
    setTouched((t) => ({ ...t, specializations: true }))
  }

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setTouched((t) => ({ ...t, [field]: true }))
  }

  useEffect(() => {
    setErrors(validateForm(form))
  }, [form])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validationErrors = validateForm(form)
    setErrors(validationErrors)
    setTouched({
      specializations: true,
      experienceYears: true,
      phoneNumber: true,
      facebookUrl: true
    })

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fill in all required fields correctly.')
      return
    }

    setSubmitting(true)
    try {
      await registerTranslatorApi({
        specializations: form.specializations,
        experiencedYears: Number(form.experienceYears),
        phone: form.phoneNumber.trim(),
        facebookUrl: form.facebookUrl.trim()
      })

      if (user) {
        updateUser({ ...user, role: 'TRANSLATOR' })
      }

      toast.success('Translator profile created!')
      navigate('/translator/dashboard')
    } catch (err) {
      console.error(err)
      const serverMessage = err?.response?.data?.message
      toast.error(serverMessage || 'Failed to create translator profile. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <HomeLayout>
        <div className="container py-5 text-center">
          <h3 style={{ color: 'var(--trans-text-primary, #fff)' }}>⏳ Loading…</h3>
        </div>
      </HomeLayout>
    )
  }

  if (alreadyRegistered) {
    return (
      <HomeLayout>
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-6">
              <div className="p-4 text-center" style={cardStyle}>
                <CheckCircle2 className="mb-3" size={48} style={{ color: '#c084fc' }} />
                <h2 className="h4 fw-bold" style={{ color: 'var(--trans-text-primary, #fff)' }}>
                  You're already a registered translator
                </h2>
                <p className="mt-2" style={{ color: 'var(--trans-text-muted, #94a3b8)' }}>
                  Your translator profile already exists — no need to register again.
                </p>
                <button
                  className="btn btn-lg px-4 mt-3"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: '#fff', border: 'none' }}
                  onClick={() => navigate('/translator/dashboard')}
                >
                  Go to Translator Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </HomeLayout>
    )
  }

  return (
    <HomeLayout>
      <div className="container py-5">
        <div className="row mb-3">
          <div className="col-12">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-sm d-inline-flex align-items-center gap-1 px-3"
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--trans-text-secondary, #cbd5e1)'
              }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>
        </div>

        <div className="row mb-5">
          <div className="col-12 text-center">
            <h1 className="display-4 fw-bold" style={{ color: '#c084fc' }}>
              <Languages className="me-2" size={40} />
              Become a Translator
            </h1>
            <p style={{ color: 'var(--trans-text-muted, #94a3b8)' }}>
              Tell us a bit about your translation background — all fields below are required.
            </p>
          </div>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8">
            <form onSubmit={handleSubmit} noValidate>
              <div className="p-4 mb-4" style={cardStyle}>
                <section className="mb-5">
                  <h3 className="h4 mb-3 d-flex align-items-center" style={{ color: 'var(--trans-text-primary, #fff)' }}>
                    <Sparkles className="me-2" style={{ color: '#c084fc' }} /> Language Specializations *
                  </h3>
                  <p className="mb-3" style={{ color: 'var(--trans-text-secondary, #cbd5e1)' }}>
                    Add any language you're comfortable translating — not limited to the suggestions below.
                  </p>
                  <LanguageTagInput
                    selected={form.specializations}
                    onAdd={addLanguage}
                    onRemove={removeLanguage}
                  />
                  {touched.specializations && <FieldError message={errors.specializations} />}
                </section>

                <section className="mb-5">
                  <h3 className="h4 mb-3 d-flex align-items-center" style={{ color: 'var(--trans-text-primary, #fff)' }}>
                    <CheckCircle2 className="me-2" style={{ color: '#c084fc' }} /> Experience *
                  </h3>
                  <label className="form-label" style={{ color: 'var(--trans-text-secondary, #cbd5e1)' }}>
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    className="trans-form-input"
                    value={form.experienceYears}
                    onChange={(e) => handleFieldChange('experienceYears', e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, experienceYears: true }))}
                  />
                  {touched.experienceYears && <FieldError message={errors.experienceYears} />}
                </section>

                <section>
                  <h3 className="h4 mb-3 d-flex align-items-center" style={{ color: 'var(--trans-text-primary, #fff)' }}>
                    <Phone className="me-2" style={{ color: '#c084fc' }} /> Contact Information *
                  </h3>

                  <div className="mb-3">
                    <label className="form-label" style={{ color: 'var(--trans-text-secondary, #cbd5e1)' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      className="trans-form-input"
                      placeholder="e.g. +84 912 345 678"
                      value={form.phoneNumber}
                      onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, phoneNumber: true }))}
                    />
                    {touched.phoneNumber && <FieldError message={errors.phoneNumber} />}
                  </div>

                  <div>
                    <label className="form-label d-flex align-items-center" style={{ color: 'var(--trans-text-secondary, #cbd5e1)' }}>
                      <Link2 className="me-1" size={15} /> Facebook Profile
                    </label>
                    <input
                      type="url"
                      className="trans-form-input"
                      placeholder="https://facebook.com/your.profile"
                      value={form.facebookUrl}
                      onChange={(e) => handleFieldChange('facebookUrl', e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, facebookUrl: true }))}
                    />
                    {touched.facebookUrl && <FieldError message={errors.facebookUrl} />}
                  </div>
                </section>
              </div>

              <div className="p-4" style={cardStyle}>
                <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
                  <div>
                    <h5 className="mb-1" style={{ color: 'var(--trans-text-primary, #fff)' }}>Ready to submit?</h5>
                    <p className="mb-0 small" style={{ color: 'var(--trans-text-muted, #94a3b8)' }}>
                      All fields are required to create your translator profile.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-lg px-4"
                    style={{
                      background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                      color: '#fff',
                      border: 'none',
                      opacity: submitting ? 0.7 : 1
                    }}
                    disabled={submitting}
                  >
                    {submitting ? 'Creating…' : 'Create Translator Profile'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </HomeLayout>
  )
}

export default TranslatorRegister