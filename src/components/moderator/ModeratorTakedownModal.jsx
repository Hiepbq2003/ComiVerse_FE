import { useState } from 'react'
import { toast } from 'react-toastify'
import { takedownChapterApi } from '../../services/api/ChapterApi'
import ModernButton from '../common/ModernButton'

const TAKEDOWN_CATEGORIES = [
  { id: 'VIOLATION_NSFW', label: 'Prohibited Content (NSFW/Violence)', icon: '🔞' },
  { id: 'COPYRIGHT', label: 'Copyright Infringement', icon: '©️' },
  { id: 'POOR_QUALITY', label: 'Low Quality / Unreadable', icon: '📉' },
  { id: 'INCORRECT_CHAPTER', label: 'Wrong Chapter Uploaded', icon: '❌' },
  { id: 'OTHER', label: 'Other Reason', icon: '💬' },
]

function ModeratorTakedownModal({ chapter, comic, onClose, onSubmitted }) {
  const [category, setCategory] = useState('VIOLATION_NSFW')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!chapter) return null

  const chapterId = chapter.id
  const chapterTitle = chapter.title || `Chapter ${chapter.chapterNumber || '?'}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmedReason = reason.trim()
    if (trimmedReason.length < 10) {
      setError('Please provide a specific reason (min 10 characters).')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const categoryLabel = TAKEDOWN_CATEGORIES.find(c => c.id === category)?.label || category
      const fullReason = `[${categoryLabel}] ${trimmedReason}`

      await takedownChapterApi(chapterId, fullReason)

      toast.success('Chapter taken down successfully.')
      if (onSubmitted) onSubmitted(chapterId)
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to takedown chapter.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mod-modal-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mod-modal-card" style={{ maxWidth: '520px' }}>
        <div className="mod-modal-header">
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span> Takedown Chapter
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--mod-text-secondary, #94a3b8)', fontWeight: 'normal' }}>
              Reject a published chapter and notify the author.
            </p>
          </div>
          <button className="mod-modal-close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="mod-modal-body">
          <div className="mod-form-group">
            <div style={{ background: 'var(--mod-bg-hover, rgba(255,255,255,0.03))', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--mod-border, rgba(255,255,255,0.08))', fontSize: '14px' }}>
              <strong style={{ color: 'var(--mod-text-primary, #f8fafc)' }}>Target:</strong> <span style={{ color: 'var(--mod-text-secondary, #cbd5e1)' }}>{comic?.title || 'Unknown Comic'} - {chapterTitle}</span>
            </div>
          </div>

          <div className="mod-form-group">
            <label className="mod-label">Reason Category *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {TAKEDOWN_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  style={{
                    background: category === cat.id ? 'var(--mod-primary, #6366f1)' : 'var(--mod-bg-hover, rgba(255,255,255,0.05))',
                    color: category === cat.id ? '#ffffff' : 'var(--mod-text-secondary, #cbd5e1)',
                    border: `1px solid ${category === cat.id ? 'var(--mod-primary-hover, #4f46e5)' : 'var(--mod-border, rgba(255,255,255,0.1))'}`,
                    padding: '8px 14px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    fontWeight: category === cat.id ? '600' : 'normal'
                  }}
                  onMouseEnter={(e) => {
                    if (category !== cat.id) {
                      e.currentTarget.style.background = 'var(--mod-border, rgba(255,255,255,0.1))'
                      e.currentTarget.style.color = 'var(--mod-text-primary, #f8fafc)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (category !== cat.id) {
                      e.currentTarget.style.background = 'var(--mod-bg-hover, rgba(255,255,255,0.05))'
                      e.currentTarget.style.color = 'var(--mod-text-secondary, #cbd5e1)'
                    }
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{cat.icon}</span> 
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mod-form-group">
            <label className="mod-label">Specific Reason / Instruction for Author *</label>
            <textarea
              className="mod-textarea"
              value={reason}
              onChange={e => { setReason(e.target.value); setError(''); }}
              placeholder="e.g. Page 5 contains prohibited violent content. Please blur or remove it."
              required
              style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
            />
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '-4px' }}>
              <span>⚠️</span> {error}
            </div>
          )}
        </div>

        <div className="mod-modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <ModernButton 
            variant={5} 
            label="Cancel" 
            onClick={onClose} 
            disabled={submitting}
          />
          <button 
            type="button" 
            onClick={handleSubmit}
            disabled={submitting || reason.trim().length < 10}
            style={{ 
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
              border: 'none', 
              color: '#ffffff', 
              padding: '10px 20px', 
              borderRadius: '8px', 
              cursor: submitting || reason.trim().length < 10 ? 'not-allowed' : 'pointer',
              opacity: (submitting || reason.trim().length < 10) ? 0.6 : 1,
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!submitting && reason.trim().length >= 10) {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.35)'
              }
            }}
            onMouseLeave={(e) => {
              if (!submitting && reason.trim().length >= 10) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.25)'
              }
            }}
          >
            {submitting ? 'Processing...' : '⚠️ Take Down Chapter'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModeratorTakedownModal
