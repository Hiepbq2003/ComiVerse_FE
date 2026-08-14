import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { createAppealApi, getPendingAppealByTargetApi } from '../../services/api/AppealApi'
import { formatTimeAgo } from '../../utils/formatTimeAgo'

const APPEAL_CATEGORIES = [
  { id: 'PUBLICATION_STATUS', label: 'Publication Status Dispute', icon: '🔄' },
  { id: 'GENRES', label: 'Genre Classification Dispute', icon: '🏷️' },
  { id: 'AGE_RATING', label: 'Age Rating & Advisory', icon: '🔞' },
  { id: 'CHAPTER_REJECTION', label: 'Chapter Rejection Dispute', icon: '⚠️' },
  { id: 'OTHER', label: 'Other Moderation Disputes', icon: '💬' },
]

function AuthorAppealModal({ comic, initialCategory = 'PUBLICATION_STATUS', initialContext = '', onClose, onSubmitted }) {
  const [category, setCategory] = useState(initialCategory)
  const [statement, setStatement] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(true)
  const [existingAppeal, setExistingAppeal] = useState(null)
  const [error, setError] = useState('')

  if (!comic) return null

  const comicId = comic.id || comic.comicId
  const comicTitle = comic.title || 'Comic'
  const cleanTargetId = String(comicId).replace(/^(comic|sub|chap)-/, '')

  useEffect(() => {
    let mounted = true
    setCheckingExisting(true)
    getPendingAppealByTargetApi(cleanTargetId)
      .then((res) => {
        if (!mounted) return
        const data = res?.data || res
        if (data && (data.id || (Array.isArray(data) && data.length > 0))) {
          const ticket = Array.isArray(data) ? data[0] : data
          setExistingAppeal(ticket)
        } else {
          setExistingAppeal(null)
        }
      })
      .catch((err) => {
        console.warn('Failed to check existing appeal from API:', err?.message || err)
      })
      .finally(() => {
        if (mounted) setCheckingExisting(false)
      })

    return () => {
      mounted = false
    }
  }, [cleanTargetId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (existingAppeal) {
      toast.info('An active appeal is already pending review for this item.')
      return
    }

    const trimmedStatement = statement.trim()
    if (trimmedStatement.length < 10) {
      setError('Please provide an appeal explanation with at least 10 characters.')
      return
    }
    if (trimmedStatement.length > 2000) {
      setError('Appeal statement cannot exceed 2000 characters.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const fullReason = initialContext 
        ? `[Moderator Action: ${initialContext}] ${trimmedStatement}`
        : trimmedStatement

      const res = await createAppealApi({
        targetId: cleanTargetId,
        targetType: 'COMIC_EDIT',
        appealReason: fullReason,
        evidenceUrls: ''
      })

      toast.success('Appeal submitted successfully! Moderators will review your request.')
      if (onSubmitted) onSubmitted(cleanTargetId, res?.data || res)
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit appeal. Please try again.'
      if (msg.toLowerCase().includes('already exists')) {
        setExistingAppeal({
          appealReason: trimmedStatement || 'Appeal submitted and awaiting moderator review.',
          createdAt: new Date().toISOString(),
          status: 'PENDING'
        })
      }
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="author-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="author-modal author-appeal-modal" onSubmit={handleSubmit}>
        <div className="author-modal-head">
          <div>
            <h2>⚖️ Appeal Moderation Decision</h2>
            <p>Submit a formal dispute or explanation to the Senior Moderation Team</p>
          </div>
          <button type="button" className="author-icon-btn ghost" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="author-modal-body">
          {/* Comic Summary Card */}
          <div className="author-appeal-target-box">
            <div style={{ width: '40px', height: '56px', borderRadius: '4px', overflow: 'hidden', background: '#e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(comic?.cover || comic?.coverImage || comic?.coverImageUrl || comic?.coverUrl || comic?.cover_url || comic?.imageUrl) ? (
                <img 
                  src={comic.cover || comic.coverImage || comic.coverImageUrl || comic.coverUrl || comic.cover_url || comic.imageUrl} 
                  alt={comicTitle} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = '<span style="font-size: 24px;">📚</span>';
                  }}
                />
              ) : (
                <span style={{ fontSize: '24px' }}>📚</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="author-appeal-target-title">{comicTitle}</div>
              <div className="author-appeal-target-meta">
                Publication: <strong>{comic.publicationStatus || 'ONGOING'}</strong> | Moderation: <strong>{comic.moderationStatus || comic.approvalStatus || 'REJECTED'}</strong>
              </div>
            </div>
          </div>

          {initialContext && (
            <div className="author-appeal-context-box">
              <strong>Moderator Review Note:</strong> {initialContext}
            </div>
          )}

          {/* Active Appeal Banner if already submitted */}
          {existingAppeal ? (
            <div style={{ 
              background: 'rgba(245, 158, 11, 0.1)', 
              border: '1px solid rgba(245, 158, 11, 0.35)', 
              borderRadius: '10px', 
              padding: '16px', 
              marginBottom: '16px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
                <span>⏳</span> Active Appeal Under Review
              </div>
              <div style={{ fontSize: '13px', color: 'var(--author-text, #334155)', lineHeight: '1.5' }}>
                You have already submitted an appeal for this item:
                <div style={{ background: 'rgba(0,0,0,0.04)', padding: '10px', borderRadius: '6px', marginTop: '6px', fontStyle: 'italic' }}>
                  "{existingAppeal.appealReason || existingAppeal.reason || 'Pending moderation review'}"
                </div>
              </div>
              {existingAppeal.createdAt && (
                <div style={{ fontSize: '12px', color: 'var(--author-text-muted, #94a3b8)', marginTop: '8px', textAlign: 'right' }}>
                  Submitted {formatTimeAgo(existingAppeal.createdAt)}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Category Selector */}
              <label className="author-form-label">
                Appeal Category *
              </label>
              <div className="author-appeal-categories">
                {APPEAL_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`author-appeal-cat-btn ${category === cat.id ? 'active' : ''}`}
                    onClick={() => setCategory(cat.id)}
                  >
                    <span>{cat.icon}</span>
                    <span style={{ flex: 1 }}>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Statement Input */}
              <label className="author-form-label">
                Detailed Appeal Statement & Justification *
                <textarea
                  className="author-input author-appeal-textarea"
                  placeholder="State clearly why the moderation decision should be revised or explain the adjustments made (minimum 10 characters)..."
                  value={statement}
                  onChange={(e) => {
                    setStatement(e.target.value)
                    if (error) setError('')
                  }}
                  required
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--author-text-muted, #94a3b8)', marginTop: '4px' }}>
                <span>Minimum 10 characters</span>
                <span>{statement.length}/2000</span>
              </div>
            </>
          )}

          {error && (
            <div className="author-form-error" style={{ marginTop: '10px' }}>
              ⚠️ {error}
            </div>
          )}

          <div className="author-appeal-notice-box">
            ℹ️ <strong>Notice:</strong> Submitting an appeal will immediately notify the Senior Moderation Team and workspace administrators for re-evaluation.
          </div>
        </div>

        <div className="author-modal-actions">
          <button type="button" className="btn-author-action ghost" onClick={onClose} disabled={submitting}>
            {existingAppeal ? 'Close' : 'Cancel'}
          </button>
          {!existingAppeal && (
            <button type="submit" className="btn-author-action primary" disabled={submitting || checkingExisting || statement.trim().length < 10}>
              {submitting ? 'Submitting...' : '⚖️ Submit Appeal'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default AuthorAppealModal
