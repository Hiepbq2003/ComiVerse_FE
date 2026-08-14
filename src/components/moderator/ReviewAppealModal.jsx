import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import ModernButton from '../common/ModernButton'
import { getPendingAppealByTargetApi, resolveAppealApi } from '../../services/api/AppealApi'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import '../../assets/style/moderator/review-queue.css'

function ReviewAppealModal({ isOpen, onClose, comic, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [appealData, setAppealData] = useState(null)

  useEffect(() => {
    if (isOpen && comic) {
      setLoading(true)
      setAppealData(null)
      
      // Fetch appeal data
      getPendingAppealByTargetApi(comic.id || comic.comicId)
        .then(res => {
          const data = res?.data || res
          if (data && data.length > 0) {
             setAppealData(data[0])
          } else if (data && !Array.isArray(data)) {
             setAppealData(data)
          }
        })
        .catch(err => {
          console.error('Failed to fetch appeal:', err)
          toast.error('Failed to load appeal details')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, comic])

  if (!isOpen || !comic) return null

  const handleAcceptAppeal = async () => {
    if (!appealData || !appealData.id) {
      toast.error('Appeal data not found')
      return
    }

    setSubmitting(true)
    try {
      await resolveAppealApi(appealData.id, { 
        status: 'APPROVED',
        note: 'Appeal accepted by moderator. Original content restored.'
      })
      try {
        const comicId = comic.id || comic.comicId
        const existing = JSON.parse(localStorage.getItem('appealedComics') || '[]')
        const updated = existing.filter((id) => String(id) !== String(comicId))
        localStorage.setItem('appealedComics', JSON.stringify(updated))
        window.dispatchEvent(new Event('appealStateChanged'))
      } catch (e) {
        console.error('Error clearing local appeal state:', e)
      }
      toast.success('Appeal accepted successfully. Comic restored.')
      if (onSuccess) onSuccess()
      onClose()
    } catch (error) {
      console.error('Error resolving appeal:', error)
      toast.error(error?.response?.data?.message || error?.message || 'Failed to accept appeal')
    } finally {
      setSubmitting(false)
    }
  }

  const modalContent = (
    <div className="mod-modal-overlay" onClick={onClose} style={{ zIndex: 100000 }}>
      <div className="mod-modal-card appeal-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="mod-modal-header" style={{ padding: '24px 32px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Review Author Appeal</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>Evaluating author's request to restore the rejected content</p>
        </div>

        <div className="mod-modal-body" style={{ padding: '24px 32px', flex: 1, overflowY: 'auto' }}>
          {/* Target Info */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--bg-secondary, rgba(0,0,0,0.03))', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <img 
              src={comic.cover || comic.coverImage || comic.thumbnail} 
              alt={comic.title} 
              style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: '6px' }} 
              onError={(e) => { e.target.src = 'https://via.placeholder.com/60x80?text=No+Cover' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ margin: '0 0 4px', color: 'var(--text)', fontSize: '1.1rem' }}>{comic.title}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Author: {comic.authorName || comic.submittedBy || 'Unknown'}</p>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              {/* Author's Appeal Reason */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 10px', color: 'var(--text)', fontSize: '0.95rem' }}>Author's Explanation:</h4>
                <div style={{ 
                  background: 'var(--bg-secondary, rgba(0,0,0,0.03))', 
                  border: '1px solid var(--border)', 
                  padding: '16px', 
                  borderRadius: '10px',
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                  lineHeight: '1.6'
                }}>
                  {appealData?.appealReason || appealData?.reason || appealData?.content || appealData?.description || comic.appealReason || comic.appealContent || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No explanation provided by author.</span>}
                </div>
                {appealData?.createdAt && (
                  <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    Submitted {formatTimeAgo(appealData.createdAt)}
                  </div>
                )}
              </div>

              {/* Rejection Reason or Original Content */}
              {(comic.previousStateSnapshot) ? (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 10px', color: 'var(--text)', fontSize: '0.95rem' }}>Original Content to Restore:</h4>
                  <div style={{ 
                    background: 'var(--bg-secondary, rgba(0,0,0,0.03))', 
                    border: '1px solid var(--border)', 
                    padding: '16px', 
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {(() => {
                      try {
                        const original = JSON.parse(comic.previousStateSnapshot);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Object.keys(original).filter(key => {
                              const ignoredKeys = ['updatedAt', 'createdAt', 'moderationStatus', 'isAppealed', 'appealReason', 'rejectionReason', 'isModEdited', 'previousStateSnapshot', 'chapterCount', 'rejectedChapterCount', 'pendingChapterCount', 'lastChapterUpdatedAt', 'approvedAt', 'approvedBy', 'viewCount', 'likeCount', 'saveCount', 'ratingCount', 'ratingAverage', 'latestChapterNumber', 'genreIds'];
                              if (ignoredKeys.includes(key)) return false;
                              // Ensure they are actually different
                              return JSON.stringify(original[key]) !== JSON.stringify(comic[key]);
                            }).map(key => (
                              <div key={key} style={{ display: 'flex', flexDirection: 'column', paddingBottom: '8px', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', wordBreak: 'break-word' }}>
                                  <span style={{ textDecoration: 'line-through', color: 'var(--mod-red, #ef4444)', opacity: 0.8, flex: 1 }}>
                                    {(() => {
                                      const val = comic[key];
                                      if (val == null || (Array.isArray(val) && val.length === 0) || val === '') return 'None';
                                      if (Array.isArray(val)) return val.map(v => typeof v === 'object' ? v.name || JSON.stringify(v) : v).join(', ');
                                      return typeof val === 'object' ? JSON.stringify(val) : String(val);
                                    })()}
                                  </span>
                                  <span style={{ color: 'var(--mod-green, #10b981)', fontWeight: '500', flex: 1 }}>
                                    {(() => {
                                      const val = original[key];
                                      if (val == null || (Array.isArray(val) && val.length === 0) || val === '') return 'None';
                                      if (Array.isArray(val)) return val.map(v => typeof v === 'object' ? v.name || JSON.stringify(v) : v).join(', ');
                                      return typeof val === 'object' ? JSON.stringify(val) : String(val);
                                    })()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      } catch (e) {
                        return <span style={{ color: 'var(--text-muted)' }}>{comic.previousStateSnapshot}</span>;
                      }
                    })()}
                  </div>
                </div>
              ) : comic.rejectionReason ? (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 10px', color: 'var(--text)', fontSize: '0.95rem' }}>Moderator's Rejection Reason:</h4>
                  <div style={{ 
                    background: 'rgba(239, 68, 68, 0.05)', 
                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                    padding: '16px', 
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    color: 'var(--text)'
                  }}>
                    {comic.rejectionReason}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ margin: '0 0 10px', color: 'var(--text)', fontSize: '0.95rem' }}>Original Content to Restore:</h4>
                  <div style={{ 
                    background: 'var(--bg-secondary, rgba(0,0,0,0.03))', 
                    border: '1px solid var(--border)', 
                    padding: '16px', 
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    color: 'var(--text-muted)'
                  }}>
                    No edit history or rejection reason found. Accepting this appeal will restore the comic to its previous status.
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mod-modal-footer" style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <ModernButton 
            variant={2} 
            label="Close" 
            onClick={onClose} 
            disabled={submitting}
          />
          <button 
            className="btn-primary"
            onClick={handleAcceptAppeal} 
            disabled={loading || submitting || (!appealData && !comic.appealReason)}
            style={{ padding: '8px 16px', borderRadius: '8px', fontWeight: '600', whiteSpace: 'nowrap' }}
          >
            {submitting ? "Accepting..." : "✓ Accept Appeal"}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default ReviewAppealModal
