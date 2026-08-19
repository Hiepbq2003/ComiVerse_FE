import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import ModernButton from '../common/ModernButton'
import { getPendingAppealByTargetApi, resolveAppealApi } from '../../services/api/AppealApi'
import { getComicByIdApi } from '../../services/api/ComicApi'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import '../../assets/style/moderator/review-queue.css'

function ReviewAppealModal({ isOpen, onClose, comic, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [appealData, setAppealData] = useState(null)
  const [liveComic, setLiveComic] = useState(null)

  useEffect(() => {
    if (isOpen && comic) {
      const rawTargetId = String(comic.targetId || comic.id || comic.comicId || '')
      const cleanTargetId = rawTargetId.replace(/^(comic|sub|chap)-/, '')
      
      setLoading(true)
      setLiveComic(null)

      if (comic.rawTicket) {
        setAppealData(comic.rawTicket)
      } else {
        setAppealData(null)
      }

      const promises = []

      if (!comic.rawTicket && cleanTargetId) {
        promises.push(
          getPendingAppealByTargetApi(cleanTargetId)
            .then(res => {
              const data = res?.data || res
              if (data && Array.isArray(data) && data.length > 0) {
                 setAppealData(data[0])
              } else if (data && !Array.isArray(data) && data.id) {
                 setAppealData(data)
              } else if (comic.appealReason || comic.reason) {
                 setAppealData({
                   id: comic.id || comic.comicId,
                   targetId: cleanTargetId,
                   targetType: 'COMIC_EDIT',
                   appealReason: comic.appealReason || comic.reason,
                   authorName: comic.authorName || comic.author || 'Author',
                   createdAt: comic.updatedAt || new Date().toISOString(),
                   status: 'PENDING'
                 })
              }
            })
            .catch(err => {
              console.warn('Appeal ticket not found or already processed:', err?.message)
              if (comic.appealReason || comic.reason) {
                 setAppealData({
                   id: comic.id || comic.comicId,
                   targetId: cleanTargetId,
                   targetType: 'COMIC_EDIT',
                   appealReason: comic.appealReason || comic.reason,
                   authorName: comic.authorName || comic.author || 'Author',
                   createdAt: comic.updatedAt || new Date().toISOString(),
                   status: 'PENDING'
                 })
              }
            })
        )
      }

      if (cleanTargetId) {
        promises.push(
          getComicByIdApi(cleanTargetId)
            .then(res => {
              const data = res?.data || res
              if (data) setLiveComic(data)
            })
            .catch(err => {
              console.warn('Failed to fetch live comic data:', err?.message)
            })
        )
      }

      Promise.all(promises).finally(() => {
        setLoading(false)
      })
    }
  }, [isOpen, comic])

  if (!isOpen || !comic) return null

  const handleAcceptAppeal = async () => {
    const ticketId = appealData?.id || comic.appealTicketId || comic.rawTicket?.id
    if (!ticketId) {
      toast.error('Appeal data not found')
      return
    }

    setSubmitting(true)
    try {
      await resolveAppealApi(ticketId, { 
        status: 'APPROVED',
        resolvedReason: 'Appeal accepted by moderator. Original content restored.',
        note: 'Appeal accepted by moderator. Original content restored.'
      })
      try {
        const comicId = comic.targetId || comic.id || comic.comicId
        const existing = JSON.parse(localStorage.getItem('appealedComics') || '[]')
        const updated = existing.filter((id) => String(id) !== String(comicId))
        localStorage.setItem('appealedComics', JSON.stringify(updated))
        
        // CRITICAL: Clear localStorage comic cache so restored data from backend is displayed
        // Without this, ModeratorComicDetail merges stale mod-edited values over fresh API data
        localStorage.removeItem('comiverse_local_comic_' + comicId)
        
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
              {/* SLA Protection Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
                padding: '12px 16px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '10px',
                fontSize: '0.86rem',
                color: 'var(--text)'
              }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🛡️</span>
                <div>
                  <strong>Author Protection SLA Policy (3 Days):</strong> If moderators do not take action within 3 days, this appeal will be <strong>automatically approved & restored</strong> to protect the author's creative control.
                </div>
              </div>

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
              {(() => {
                const snapshotRaw = appealData?.previousStateSnapshot || comic.previousStateSnapshot || liveComic?.previousStateSnapshot || comic.rawTicket?.previousStateSnapshot || comic.rawComic?.previousStateSnapshot;
                if (!snapshotRaw) {
                  if (comic.rejectionReason) {
                    return (
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
                    );
                  }
                  return (
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
                  );
                }

                try {
                  const original = typeof snapshotRaw === 'string'
                    ? JSON.parse(snapshotRaw)
                    : snapshotRaw;

                  const currentTarget = liveComic || comic.rawComic || comic;

                  const formatVal = (k, v) => {
                    if (v == null || v === '') return 'None';
                    if (k === 'genres' || k === 'genreIds') {
                      if (Array.isArray(v)) {
                        if (v.length === 0) return 'None';
                        return v.map(g => (typeof g === 'object' ? g?.name || g?.title || g?.label || '' : String(g))).filter(Boolean).join(', ') || 'None';
                      }
                      if (typeof v === 'string') return v.trim() || 'None';
                    }
                    if (k === 'minimumAge') return `${v}+`;
                    if (k === 'publicationStatus') return String(v).toUpperCase();
                    if (typeof v === 'object') {
                      if (Array.isArray(v)) return v.join(', ') || 'None';
                      return JSON.stringify(v);
                    }
                    return String(v);
                  };

                  const keysToCheck = [
                    { key: 'title', label: 'Title' },
                    { key: 'summary', label: 'Summary' },
                    { key: 'genres', label: 'Genres' },
                    { key: 'publicationStatus', label: 'Publication Status' },
                    { key: 'minimumAge', label: 'Age Rating' },
                    { key: 'language', label: 'Language' },
                    { key: 'cover', label: 'Cover Image' }
                  ];

                  const diffItems = keysToCheck.map(({ key, label }) => {
                    let origRaw = original[key];
                    if (origRaw === undefined) {
                      if (key === 'genres') origRaw = original.genreIds;
                      if (key === 'publicationStatus') origRaw = original.publication_status || original.status;
                    }

                    let curRaw = currentTarget[key];
                    if (curRaw === undefined) {
                      if (key === 'genres') curRaw = currentTarget.genreIds || currentTarget.genresList;
                      if (key === 'publicationStatus') curRaw = currentTarget.publication_status || (currentTarget.status && currentTarget.status !== 'appealed' && currentTarget.status !== 'pending' ? currentTarget.status : undefined);
                    }

                    if (origRaw === undefined && curRaw === undefined) return null;
                    const origFormatted = formatVal(key, origRaw);
                    const curFormatted = formatVal(key, curRaw);
                    if (origFormatted.toLowerCase().trim() === curFormatted.toLowerCase().trim() && origFormatted !== 'None') return null;
                    if (origFormatted === curFormatted) return null;
                    return { key, label, orig: origFormatted, cur: curFormatted };
                  }).filter(Boolean);

                  return (
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
                        {diffItems.length === 0 ? (
                          <span style={{ color: 'var(--text-muted)' }}>No differences detected between snapshots.</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {diffItems.map(({ key, label, orig, cur }) => (
                              <div key={key} style={{ display: 'flex', flexDirection: 'column', paddingBottom: '8px', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                  {label}
                                </span>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', wordBreak: 'break-word' }}>
                                  <span style={{ textDecoration: 'line-through', color: 'var(--mod-red, #ef4444)', opacity: 0.85, flex: 1 }}>
                                    Current: {cur}
                                  </span>
                                  <span style={{ color: 'var(--mod-green, #10b981)', fontWeight: '600', flex: 1 }}>
                                    Restore to: {orig}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } catch (e) {
                  return (
                    <div style={{ marginBottom: '16px' }}>
                      <h4 style={{ margin: '0 0 10px', color: 'var(--text)', fontSize: '0.95rem' }}>Original Content to Restore:</h4>
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '16px', borderRadius: '10px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{String(snapshotRaw)}</span>
                      </div>
                    </div>
                  );
                }
              })()}
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
            type="button"
            className="btn-primary"
            onClick={handleAcceptAppeal} 
            disabled={loading || submitting || (!appealData && !comic.appealReason)}
            style={{ padding: '8px 18px', borderRadius: '8px', fontWeight: '700', whiteSpace: 'nowrap' }}
          >
            {submitting ? "Accepting & Restoring..." : "✓ Accept & Restore Appeal"}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default ReviewAppealModal
