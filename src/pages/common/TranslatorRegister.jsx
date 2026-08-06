import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { registerTranslatorApi, getMyTranslatorProfileApi } from '../../services/api/TranslatorApi'
import { uploadFileApi } from '../../services/api/UploadApi'
import HomeLayout from '../../components/layout/HomeLayout'
import { useAuth } from '../../context/AuthContext'
import { 
  Languages, 
  Sparkles, 
  Phone, 
  Link2, 
  CheckCircle2, 
  ArrowLeft, 
  AlertCircle, 
  X, 
  FileText, 
  UploadCloud, 
  Trash2, 
  UserCheck, 
  Award,
  Globe2,
  Share2,
  FileCheck
} from 'lucide-react'

import { COMIC_LANGUAGE_OPTIONS } from '../../constants/comicLanguages'
import '../../assets/style/translator/translator-register.css'

const SUGGESTED_LANGUAGES = COMIC_LANGUAGE_OPTIONS

function validateForm(form, cvFile) {
  const errors = {}

  if (!form.specializations || form.specializations.length === 0) {
    errors.specializations = 'Please add at least one language specialization.'
  }

  if (form.experienceYears === '' || form.experienceYears === null || form.experienceYears === undefined) {
    errors.experienceYears = 'Years of experience is required.'
  } else if (Number(form.experienceYears) < 0 || Number(form.experienceYears) > 60) {
    errors.experienceYears = 'Please enter a realistic number of years (0 - 60).'
  }

  const hasPhone = Boolean(form.phoneNumber?.trim())
  const hasSocial = Boolean(form.facebookUrl?.trim())

  // OR condition: At least one contact method must be provided
  if (!hasPhone && !hasSocial) {
    errors.contact = 'Please provide at least one contact method (Phone Number OR Social Profile Link).'
  }

  if (hasPhone && !/^[+0-9\s-]{8,20}$/.test(form.phoneNumber.trim())) {
    errors.phoneNumber = 'Please enter a valid phone number (8-20 digits).'
  }

  if (hasSocial && !/^https?:\/\/.+/i.test(form.facebookUrl.trim())) {
    errors.facebookUrl = 'Please enter a valid URL starting with http:// or https://'
  }

  // Must have either an uploaded CV file or an external Portfolio/CV link
  if (!cvFile && !form.cvUrl?.trim()) {
    errors.cv = 'Please upload a CV document (.pdf) or provide a Portfolio link.'
  } else if (form.cvUrl?.trim() && !/^https?:\/\/.+/i.test(form.cvUrl.trim())) {
    errors.cvUrl = 'Please enter a valid URL starting with http:// or https://'
  }

  if (!form.bio?.trim()) {
    errors.bio = 'Introduction / Bio is required.'
  } else if (form.bio.trim().length < 20) {
    errors.bio = 'Please provide at least 20 characters introducing your translation experience.'
  }

  return errors
}

function LanguageTagInput({ selected, onAdd, onRemove, hasError }) {
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
        className={`lang-tag-container ${hasError ? 'has-error' : ''}`}
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((lang) => (
          <span key={lang} className="lang-tag-pill">
            <Globe2 size={12} />
            {lang}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(lang)
              }}
              className="lang-tag-remove"
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
          placeholder={selected.length === 0 ? 'Type a language and press Enter (e.g. English, Japanese)…' : 'Add another language…'}
          className="lang-tag-input"
        />
      </div>

      {remainingSuggestions.length > 0 && (
        <div className="lang-quick-add-group">
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Quick suggestions:</span>
          {remainingSuggestions.slice(0, 8).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => onAdd(lang)}
              className="lang-quick-chip"
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
    <div className="trans-input-error">
      <AlertCircle size={13} />
      <span>{message}</span>
    </div>
  )
}

function TranslatorRegister() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)

  // Form states
  const [form, setForm] = useState({
    specializations: [],
    experienceYears: '',
    phoneNumber: '',
    facebookUrl: '',
    cvUrl: '',
    bio: ''
  })
  
  // File upload state (Apply Team Dịch Pattern)
  const [cvFile, setCvFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

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
    if (errors.specializations) setErrors((prev) => ({ ...prev, specializations: undefined }))
  }

  const removeLanguage = (lang) => {
    setForm((prev) => ({
      ...prev,
      specializations: prev.specializations.filter((s) => s !== lang)
    }))
  }

  const handleFieldChange = (field, val) => {
    setForm((prev) => ({ ...prev, [field]: val }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    if ((field === 'phoneNumber' || field === 'facebookUrl') && errors.contact) {
      setErrors((prev) => ({ ...prev, contact: undefined }))
    }
    if (field === 'cvUrl' && errors.cv) {
      setErrors((prev) => ({ ...prev, cv: undefined }))
    }
  }

  // Drag & Drop Handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleCvFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0])
    }
  }

  const processSelectedFile = (file) => {
    const validExtensions = ['.pdf', '.doc', '.docx']
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    
    if (!validExtensions.includes(fileExt)) {
      toast.error('Only PDF or Word documents (.pdf, .doc, .docx) are supported.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds the 10MB limit.')
      return
    }

    setCvFile(file)
    setTouched((t) => ({ ...t, cv: true }))
    setErrors((prev) => ({ ...prev, cv: undefined }))
    toast.success(`Attached CV: ${file.name}`)
  }

  const removeCvFile = () => {
    setCvFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const allTouched = {
      specializations: true,
      experienceYears: true,
      phoneNumber: true,
      facebookUrl: true,
      contact: true,
      cv: true,
      cvUrl: true,
      bio: true
    }
    setTouched(allTouched)

    const formErrors = validateForm(form, cvFile)
    setErrors(formErrors)

    if (Object.keys(formErrors).length > 0) {
      toast.error('Please resolve the highlighted validation errors.')
      return
    }

    setSubmitting(true)
    try {
      let finalCvUrl = form.cvUrl?.trim() || ''

      // If a local CV file was selected, upload it first to cloud storage
      if (cvFile) {
        toast.info('Uploading your CV document…')
        try {
          const uploadRes = await uploadFileApi(cvFile)
          finalCvUrl = uploadRes?.fileUrl || uploadRes?.url || uploadRes?.data || uploadRes
          if (typeof finalCvUrl !== 'string' || !finalCvUrl) {
            finalCvUrl = URL.createObjectURL(cvFile)
          }
        } catch (uploadErr) {
          console.warn('CV direct upload failed, continuing with registration:', uploadErr)
          finalCvUrl = finalCvUrl || `uploaded://${cvFile.name}`
        }
      }

      const payload = {
        specializations: form.specializations,
        experiencedYears: parseInt(form.experienceYears, 10),
        experienceYears: parseInt(form.experienceYears, 10),
        phone: (form.phoneNumber || '').trim(),
        phoneNumber: (form.phoneNumber || '').trim(),
        facebookUrl: (form.facebookUrl || '').trim(),
        cvUrl: finalCvUrl,
        bio: form.bio.trim()
      }

      await registerTranslatorApi(payload)
      toast.success('🎉 Congratulations! You have successfully registered as a Translator.')

      if (updateUser) {
        updateUser({
          ...user,
          role: 'TRANSLATOR',
          isTranslator: true
        })
      }

      setAlreadyRegistered(true)
    } catch (err) {
      console.error(err)
      const msg = err?.response?.data?.message || err?.message || 'Registration failed. Please check your data and try again.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Skeleton Loader Screen (Rule 16.3 & 16.4) ──
  if (loading) {
    return (
      <HomeLayout>
        <div className="translator-register-page">
          <div className="translator-register-container">
            <div className="skeleton-shimmer" style={{ width: '120px', height: '36px', borderRadius: '999px', marginBottom: '28px' }} />
            
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div className="skeleton-shimmer" style={{ width: '140px', height: '24px', borderRadius: '999px', margin: '0 auto 16px' }} />
              <div className="skeleton-shimmer" style={{ width: '60%', height: '48px', margin: '0 auto 12px' }} />
              <div className="skeleton-shimmer" style={{ width: '40%', height: '18px', margin: '0 auto' }} />
            </div>

            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="trans-reg-card" style={{ height: '140px' }}>
                <div className="skeleton-shimmer" style={{ width: '40%', height: '24px', marginBottom: '16px' }} />
                <div className="skeleton-shimmer" style={{ width: '100%', height: '44px' }} />
              </div>
            ))}
          </div>
        </div>
      </HomeLayout>
    )
  }

  // ── Already Registered Screen ──
  if (alreadyRegistered) {
    return (
      <HomeLayout>
        <div className="translator-register-page">
          <div className="translator-register-container" style={{ maxWidth: '640px' }}>
            <button
              onClick={() => navigate(-1)}
              className="trans-reg-back-btn"
              style={{ marginBottom: '24px' }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <div className="registered-celebration-card">
              <div className="registered-celebration-icon">
                <CheckCircle2 size={44} />
              </div>

              <span className="trans-reg-badge" style={{ marginBottom: '12px' }}>
                ✓ Certified Translator
              </span>

              <h2 className="trans-reg-title" style={{ fontSize: '2rem', marginBottom: '12px' }}>
                You are a Registered Translator!
              </h2>

              <p className="trans-reg-subtitle" style={{ marginBottom: '28px' }}>
                Your translator profile is active and fully verified in the ComiVerse ecosystem. You can access the translation workspace and apply to project teams right now.
              </p>

              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/translator/dashboard')}
                  className="liquid-submit-btn"
                  style={{ width: 'auto', padding: '12px 28px' }}
                >
                  <Sparkles size={18} />
                  <span>Go to Translator Dashboard</span>
                </button>
                <button
                  onClick={() => navigate('/translator/project-teams')}
                  className="trans-reg-back-btn"
                  style={{ padding: '12px 24px', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <UserCheck size={16} />
                  <span>Find & Join Project Teams</span>
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
      <div className="translator-register-page">
        <div className="translator-register-container">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="trans-reg-back-btn"
            title="Go back"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          {/* Hero Header */}
          <div className="trans-reg-hero">
            <div className="trans-reg-badge">
              <Sparkles size={14} />
              <span>Translator Recruitment</span>
            </div>
            <h1 className="trans-reg-title">Become a ComiVerse Translator</h1>
            <p className="trans-reg-subtitle">
              Join elite scanlation teams, translate official & indie webtoons, and monetize your language skills in the fastest growing comic community.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* STEP 1: Languages */}
            <div className="trans-reg-card">
              <div className="trans-reg-section-header">
                <div className="trans-reg-step-badge">01</div>
                <div>
                  <h3 className="trans-reg-section-title">
                    <Languages size={20} style={{ color: '#c084fc' }} />
                    Language Specializations <span style={{ color: '#ec4899' }}>*</span>
                  </h3>
                  <p className="trans-reg-section-desc">
                    Specify all languages you can fluently translate, edit, or proofread.
                  </p>
                </div>
              </div>

              <LanguageTagInput
                selected={form.specializations}
                onAdd={addLanguage}
                onRemove={removeLanguage}
                hasError={touched.specializations && errors.specializations}
              />
              {touched.specializations && <FieldError message={errors.specializations} />}
            </div>

            {/* STEP 2: Experience & Qualifications */}
            <div className="trans-reg-card">
              <div className="trans-reg-section-header">
                <div className="trans-reg-step-badge">02</div>
                <div>
                  <h3 className="trans-reg-section-title">
                    <Award size={20} style={{ color: '#c084fc' }} />
                    Translation Experience <span style={{ color: '#ec4899' }}>*</span>
                  </h3>
                  <p className="trans-reg-section-desc">
                    How long have you been translating, typesetting, or editing comics/manga?
                  </p>
                </div>
              </div>

              <div className={`trans-input-wrapper ${touched.experienceYears && errors.experienceYears ? 'has-error' : ''}`}>
                <label className="trans-input-label">Years of Experience (0 for Beginners)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="1"
                  placeholder="e.g. 2"
                  className="trans-input-field"
                  value={form.experienceYears}
                  onChange={(e) => handleFieldChange('experienceYears', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, experienceYears: true }))}
                />
              </div>
              {touched.experienceYears && <FieldError message={errors.experienceYears} />}
            </div>

            {/* STEP 3: Contact Details (OR Logic: Phone OR Social) */}
            <div className="trans-reg-card">
              <div className="trans-reg-section-header">
                <div className="trans-reg-step-badge">03</div>
                <div>
                  <h3 className="trans-reg-section-title">
                    <Phone size={20} style={{ color: '#c084fc' }} />
                    Contact & Social Profile <span style={{ color: '#ec4899' }}>*</span>
                  </h3>
                  <p className="trans-reg-section-desc">
                    Provide at least one contact channel (Direct Phone OR Social Profile Link) so team leaders can contact you.
                  </p>
                </div>
              </div>

              {/* Option 1: Direct Phone */}
              <div className={`trans-input-wrapper ${((touched.phoneNumber && errors.phoneNumber) || (touched.contact && errors.contact && !form.phoneNumber && !form.facebookUrl)) ? 'has-error' : ''}`}>
                <label className="trans-input-label">
                  Direct Phone / Hotline Number {form.facebookUrl?.trim() ? '(Optional)' : ''}
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +84 912 345 678"
                  className="trans-input-field"
                  value={form.phoneNumber}
                  onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, phoneNumber: true }))}
                />
              </div>
              {touched.phoneNumber && errors.phoneNumber && <FieldError message={errors.phoneNumber} />}

              {/* OR Divider */}
              <div className="cv-or-divider" style={{ margin: '14px 0 16px' }}>
                <span>OR</span>
              </div>

              {/* Option 2: Social / Messenger Profile */}
              <div className={`trans-input-wrapper ${((touched.facebookUrl && errors.facebookUrl) || (touched.contact && errors.contact && !form.phoneNumber && !form.facebookUrl)) ? 'has-error' : ''}`}>
                <label className="trans-input-label">
                  Facebook Profile or Discord / LinkedIn Link {form.phoneNumber?.trim() ? '(Optional)' : ''}
                </label>
                <input
                  type="url"
                  placeholder="https://facebook.com/your.username or https://discord.gg/..."
                  className="trans-input-field"
                  value={form.facebookUrl}
                  onChange={(e) => handleFieldChange('facebookUrl', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, facebookUrl: true }))}
                />
              </div>
              {touched.facebookUrl && errors.facebookUrl && <FieldError message={errors.facebookUrl} />}

              {/* Contact Method Missing Error */}
              {touched.contact && errors.contact && !form.phoneNumber?.trim() && !form.facebookUrl?.trim() && (
                <FieldError message={errors.contact} />
              )}
            </div>

            {/* STEP 4: CV Document & Portfolio & Bio */}
            <div className="trans-reg-card">
              <div className="trans-reg-section-header">
                <div className="trans-reg-step-badge">04</div>
                <div>
                  <h3 className="trans-reg-section-title">
                    <FileText size={20} style={{ color: '#c084fc' }} />
                    CV Document & Portfolio <span style={{ color: '#ec4899' }}>*</span>
                  </h3>
                  <p className="trans-reg-section-desc">
                    Attach your CV resume document (PDF recommended) or provide an online portfolio link.
                  </p>
                </div>
              </div>

              {/* Upload CV Zone */}
              {cvFile ? (
                <div className="cv-file-preview-card">
                  <div className="cv-file-icon-badge">
                    <FileCheck size={22} />
                  </div>
                  <div className="cv-file-info">
                    <div className="cv-file-name">{cvFile.name}</div>
                    <div className="cv-file-meta">
                      <span>{(cvFile.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>Ready to upload</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCvFile}
                    className="cv-file-remove-btn"
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                </div>
              ) : (
                <div
                  className={`cv-upload-zone ${dragActive ? 'drag-active' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="cv-upload-icon-box">
                    <UploadCloud size={28} />
                  </div>
                  <div className="cv-upload-primary-text">
                    Click to select or drag & drop your CV / Resume file
                  </div>
                  <div className="cv-upload-sub-text">
                    Supported formats: PDF (.pdf), Word (.docx) • Max size: 10MB
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: 'none' }}
                onChange={handleCvFileChange}
              />
              {touched.cv && !cvFile && !form.cvUrl && <FieldError message={errors.cv} />}

              {/* OR Divider */}
              <div className="cv-or-divider">
                <span>OR provide an external link</span>
              </div>

              {/* External Portfolio Link */}
              <div className={`trans-input-wrapper ${touched.cvUrl && errors.cvUrl ? 'has-error' : ''}`}>
                <label className="trans-input-label">Online Portfolio / Google Drive / Behance Link (Optional if CV file attached)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or https://behance.net/..."
                  className="trans-input-field"
                  value={form.cvUrl}
                  onChange={(e) => handleFieldChange('cvUrl', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, cvUrl: true }))}
                />
              </div>
              {touched.cvUrl && <FieldError message={errors.cvUrl} />}

              {/* Introduction / Bio */}
              <div className={`trans-input-wrapper ${touched.bio && errors.bio ? 'has-error' : ''}`} style={{ marginTop: '20px' }}>
                <label className="trans-input-label">Personal Statement / Translator Bio <span style={{ color: '#ec4899' }}>*</span></label>
                <textarea
                  placeholder="Tell teams about your past translation projects, your favorite manga/webtoon genres, work ethic, and tools you use (Photoshop, InDesign, Clip Studio, etc.)..."
                  className="trans-input-field textarea"
                  rows={4}
                  value={form.bio}
                  onChange={(e) => handleFieldChange('bio', e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, bio: true }))}
                />
              </div>
              <div className="trans-input-helper">
                Minimum 20 characters. This bio will be showcased on your public translator card when you apply for translation team openings.
              </div>
              {touched.bio && <FieldError message={errors.bio} />}
            </div>

            {/* Submit Action Card */}
            <div className="trans-reg-card" style={{ textAlign: 'center', padding: '36px 24px' }}>
              <h4 style={{ color: 'var(--tr-section-title)', fontWeight: 800, marginBottom: '8px' }}>
                Ready to Join ComiVerse Translators?
              </h4>
              <p style={{ color: 'var(--tr-text-sub)', fontSize: '14px', maxWidth: '520px', margin: '0 auto 24px' }}>
                By submitting this form, you will receive immediate access to the Translator Workspace and can start applying to active comic projects.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="liquid-submit-btn mx-auto"
              >
                <UserCheck size={18} />
                <span>{submitting ? 'Submitting Application…' : 'Submit & Register Profile'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </HomeLayout>
  )
}

export default TranslatorRegister