import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  BookOpen,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { toast } from 'react-toastify';
import { formatTimeAgo } from '../../utils/formatTimeAgo';

export default function ContentInspectionModal({
  report,
  onClose,
  onProcess
}) {
  const [actionType, setActionType] = useState(null); // 'ACCEPT' | 'REJECT' | null
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeImagePreview, setActiveImagePreview] = useState(null);

  if (!report) return null;

  const targetType = (report.target_type || 'COMIC').toUpperCase();
  const rawPages = report.raw_pages || report.chapter_raw_pages || [];

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (actionType === 'REJECT' && !resolutionNote.trim()) {
      toast.warn('Please enter a rejection reason to inform the reporter.');
      return;
    }

    setSubmitting(true);
    try {
      await onProcess(report.id, {
        action: actionType,
        resolution_note: resolutionNote.trim() || (actionType === 'ACCEPT' ? 'Violation addressed and action taken.' : 'Report dismissed due to insufficient evidence.')
      });
      toast.success(actionType === 'ACCEPT' ? 'Report approved and action taken!' : 'Report rejected successfully.');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to process violation report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rep-modal-backdrop" onClick={onClose}>
      <div
        className="rep-modal-card"
        style={{ maxWidth: '840px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="rep-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="rep-target-badge comic">
              <BookOpen size={13} /> {targetType}
            </span>
            <h3>Content Inspection: #{report.id}</h3>
          </div>
          <button className="rep-tool-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="rep-modal-body">
          {/* Submitter & Report Overview */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--rep-border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={report.reporter_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                  alt={report.reporter_name}
                  className="rep-reporter-avatar"
                />
                <div>
                  <div className="rep-reporter-name">{report.reporter_name || 'Anonymous Reader'}</div>
                  <div className="rep-reporter-email">{report.reporter_email || 'reader@comiverse.vn'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--rep-text-muted)', fontSize: '12px' }}>
                <Clock size={14} /> Reported: {formatTimeAgo(report.created_at)}
              </div>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--rep-accent)' }}>
              <strong style={{ fontSize: '13px', color: 'var(--rep-accent)', display: 'block', marginBottom: '2px' }}>
                {report.category_name || 'Report Category'}:
              </strong>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--rep-text-primary)', lineHeight: 1.45 }}>
                {report.description_text || 'No description provided by user.'}
              </p>
            </div>
          </div>

          {/* ── CONDITIONAL TARGET INSPECTION ── */}

          {/* CASE 1: COMIC INSPECTION */}
          {targetType === 'COMIC' && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--rep-border)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              {report.comic_info?.cover_image || report.raw_pages?.[0]?.image_url ? (
                <img
                  src={report.comic_info?.cover_image || report.raw_pages?.[0]?.image_url}
                  alt="Comic Cover"
                  style={{ width: '130px', height: '180px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--rep-border)' }}
                />
              ) : null}
              <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--rep-text-primary)' }}>
                  {report.comic_info?.title || report.target_title}
                </h4>
                <div style={{ fontSize: '13px', color: 'var(--rep-text-secondary)' }}>
                  Author / Publisher: <strong>{report.comic_info?.author || 'Unknown'}</strong>
                </div>
                {Array.isArray(report.comic_info?.genres) && report.comic_info.genres.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {report.comic_info.genres.map((g, idx) => (
                      <span key={idx} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                        {g}
                      </span>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: '12.5px', color: 'var(--rep-text-muted)', lineHeight: 1.4, margin: '4px 0 0 0' }}>
                  {report.comic_info?.description || 'Comic has been flagged for review regarding content standards or metadata.'}
                </p>

                {report.target_url && (
                  <a
                    href={report.target_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rep-btn rep-btn-primary"
                    style={{ alignSelf: 'flex-start', marginTop: 'auto', textDecoration: 'none' }}
                  >
                    <ExternalLink size={14} /> Open Comic Page ({report.target_url})
                  </a>
                )}
              </div>
            </div>
          )}

          {/* CASE 2: CHAPTER IMAGE VIEWER (Corrupt / Broken Pages) */}
          {targetType === 'CHAPTER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={16} color="#38bdf8" /> Chapter Image Inspector ({rawPages.length} pages)
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--rep-text-muted)' }}>
                  Click an image for fullscreen inspection
                </span>
              </div>

              {rawPages.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '12px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  padding: '8px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '10px',
                  border: '1px solid var(--rep-border)'
                }}>
                  {rawPages.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: '1px solid var(--rep-border)',
                        cursor: 'pointer',
                        background: '#000'
                      }}
                      onClick={() => setActiveImagePreview(p.image_url || p.url)}
                    >
                      <img
                        src={p.image_url || p.url}
                        alt={`Page ${p.page_number || idx + 1}`}
                        style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                        loading="lazy"
                      />
                      <span style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '4px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: '#fff',
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '3px'
                      }}>
                        Page {p.page_number || idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rep-empty-state" style={{ padding: '24px' }}>
                  <p>No chapter pages currently loaded for preview.</p>
                </div>
              )}
            </div>
          )}

          {/* CASE 3: CHAPTER TRANSLATIONS */}
          {targetType === 'CHAPTER_TRANSLATIONS' && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--rep-border)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '14px', color: '#f472b6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} /> Translation Quality & Community Standards Inspection
                </strong>
                <span className="rep-badge in_progress">Content Review</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--rep-text-secondary)', lineHeight: 1.4 }}>
                Inspecting: <strong>{report.target_title}</strong>. Please check whether the translated pages contain unauthorized advertisements, prohibited links, or community guideline violations.
              </p>
            </div>
          )}

          {/* ── RESOLUTION FORM SECTION ── */}
          <div style={{
            borderTop: '1px solid var(--rep-border)',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <label className="rep-form-label">
              Moderator Action Decision:
            </label>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className={`rep-btn ${actionType === 'ACCEPT' ? 'rep-btn-success' : 'rep-btn-ghost'}`}
                style={{ flex: 1, padding: '12px' }}
                onClick={() => {
                  setActionType('ACCEPT');
                  setResolutionNote('Confirmed violation. Action taken to hide chapter / remove spam.');
                }}
              >
                <CheckCircle2 size={16} /> Accept Report (ACCEPT)
              </button>

              <button
                type="button"
                className={`rep-btn ${actionType === 'REJECT' ? 'rep-btn-danger' : 'rep-btn-ghost'}`}
                style={{ flex: 1, padding: '12px' }}
                onClick={() => {
                  setActionType('REJECT');
                  setResolutionNote('');
                }}
              >
                <XCircle size={16} /> Reject Report (REJECT)
              </button>
            </div>

            {actionType && (
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                <div className="rep-form-group">
                  <label className="rep-form-label">
                    {actionType === 'ACCEPT' ? 'Action Summary / Resolution Note:' : 'Rejection Reason (Sent back to reporter):'}
                  </label>
                  <textarea
                    className="rep-form-textarea"
                    placeholder={
                      actionType === 'ACCEPT'
                        ? 'e.g., Hidden broken chapter, issued warning to publisher regarding spam ads...'
                        : 'e.g., Verified chapter imagery; pages load properly without errors...'
                    }
                    value={resolutionNote}
                    onChange={e => setResolutionNote(e.target.value)}
                    required={actionType === 'REJECT'}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    className="rep-btn rep-btn-ghost"
                    onClick={() => setActionType(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`rep-btn ${actionType === 'ACCEPT' ? 'rep-btn-success' : 'rep-btn-danger'}`}
                    disabled={submitting}
                  >
                    {submitting ? 'Processing...' : (actionType === 'ACCEPT' ? 'Confirm Action' : 'Confirm Rejection')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Lightbox zoomed preview */}
        {activeImagePreview && (
          <div className="rep-lightbox-overlay" onClick={() => setActiveImagePreview(null)}>
            <button className="rep-lightbox-close" onClick={() => setActiveImagePreview(null)}>
              <X size={20} />
            </button>
            <img src={activeImagePreview} alt="Zoom preview" className="rep-lightbox-img" />
          </div>
        )}
      </div>
    </div>
  );
}
