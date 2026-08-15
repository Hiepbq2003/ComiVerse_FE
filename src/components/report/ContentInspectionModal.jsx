import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  BookOpen,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  User,
  Layers,
  AlertCircle,
  FileText
} from 'lucide-react';
import { toast } from 'react-toastify';
import { formatTimeAgo } from '../../utils/formatTimeAgo';
import { getComicByIdApi } from '../../services/api/ComicApi';
import { getChapterDetailApi, getChapterTranslationByIdApi } from '../../services/api/ChapterApi';
import comicAction from '../../assets/comic_action.png';
import comicAdventure from '../../assets/comic_adventure.png';
import comicScifi from '../../assets/comic_scifi.png';

export default function ContentInspectionModal({
  report,
  onClose,
  onProcess
}) {
  const [actionType, setActionType] = useState(null); // 'ACCEPT' | 'REJECT' | null
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeImagePreview, setActiveImagePreview] = useState(null);
  
  // Real-time target metadata
  const [targetDetails, setTargetDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTargetData = async () => {
      const targetId = report?.target_id || report?.targetId;
      if (!targetId) return;

      const type = (report?.target_type || report?.targetType || 'COMIC').toUpperCase();
      setLoadingDetails(true);

      try {
        if (type === 'COMIC') {
          const res = await getComicByIdApi(targetId);
          const data = res?.data || res;
          if (isMounted && data) {
            setTargetDetails(data);
          }
        } else if (type === 'CHAPTER') {
          const res = await getChapterDetailApi(targetId);
          const data = res?.data || res;
          if (isMounted && data) {
            setTargetDetails(data);
          }
        } else if (type === 'CHAPTER_TRANSLATIONS') {
          const res = await getChapterTranslationByIdApi(targetId);
          const data = res?.data || res;
          if (isMounted && data) {
            setTargetDetails(data);
          }
        }
      } catch (err) {
        console.warn('[ContentInspectionModal] Failed to fetch target details:', err);
      } finally {
        if (isMounted) setLoadingDetails(false);
      }
    };

    fetchTargetData();
    return () => {
      isMounted = false;
    };
  }, [report]);

  if (!report) return null;

  const targetType = (report.target_type || report.targetType || 'COMIC').toUpperCase();
  const rawPages = targetDetails?.pages || targetDetails?.rawPages || report.raw_pages || report.chapter_raw_pages || [];

  // Resolve comic data (from targetDetails or report.comic_info fallback)
  const comicObj = targetDetails || report.comic_info || {};

  // Author resolution matching ComicDetail.jsx
  const resolvedAuthorDisplayName =
    comicObj.authorName ||
    comicObj.authorDisplayName ||
    (typeof comicObj.author === 'object' ? (comicObj.author?.displayName || comicObj.author?.username || comicObj.author?.name) : comicObj.author) ||
    report.comic_info?.author ||
    report.comic_info?.authorName ||
    'Unknown';

  // Cover image resolution with fallbacks
  const getCoverImage = (coverPath, titleVal, comicId) => {
    if (coverPath && typeof coverPath === 'string') {
      return coverPath;
    }
    const t = (titleVal || '').toLowerCase();
    if (t.includes('action') || t.includes('battle')) return comicAction;
    if (t.includes('adventure') || t.includes('dragon')) return comicAdventure;
    if (t.includes('sci-fi') || t.includes('neon') || t.includes('cyber')) return comicScifi;
    const fallbacks = [comicAction, comicAdventure, comicScifi];
    const idHash = typeof comicId === 'string' ? comicId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : comicId || 0;
    return fallbacks[idHash % 3] || comicAction;
  };

  const displayCover = getCoverImage(
    comicObj.cover || comicObj.coverImage || comicObj.cover_image || comicObj.imageUrl || report.comic_info?.cover_image || report.raw_pages?.[0]?.image_url,
    comicObj.title || report.target_title,
    comicObj.id || report.target_id || report.targetId
  );

  const displayTitle = 
    comicObj.title || 
    report.comic_info?.title || 
    (report.target_title ? report.target_title.replace(/^Comic:\s*/i, '') : '') || 
    'Untitled Comic';

  const displayGenres = Array.isArray(comicObj.genres)
    ? comicObj.genres.map(g => (typeof g === 'object' && g !== null ? g.name : g))
    : (Array.isArray(report.comic_info?.genres) ? report.comic_info.genres : []);

  const displaySummary =
    comicObj.summary ||
    comicObj.description ||
    report.comic_info?.description ||
    'Comic has been flagged for review regarding content standards or metadata.';

  const comicTargetId = comicObj.id || report.target_id || report.targetId;

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
        style={{ maxWidth: '860px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="rep-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`rep-target-badge ${targetType.toLowerCase()}`}>
              <BookOpen size={13} /> {targetType}
            </span>
            <h3>Content Inspection: #{report.id}</h3>
          </div>
          <button className="rep-tool-btn" onClick={onClose} title="Close Inspection">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="rep-modal-body">
          {/* Reporter & Issue Summary Card */}
          <div className="rep-inspect-card">
            <div className="rep-inspect-reporter">
              <div className="rep-inspect-user">
                <img
                  src={report.reporter_avatar_url || report.reporter_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                  alt={report.reporter_name}
                  className="rep-inspect-avatar"
                />
                <div>
                  <div className="rep-inspect-username">{report.reporter_name || 'Anonymous Reader'}</div>
                  <div className="rep-inspect-useremail">{report.reporter_email || 'reader@comiverse.vn'}</div>
                </div>
              </div>
              <div className="rep-inspect-time">
                <Clock size={14} /> Reported: {formatTimeAgo(report.created_at || report.createdAt)}
              </div>
            </div>

            {/* Violation Category & Description Box */}
            <div className="rep-inspect-desc-box">
              <div className="rep-inspect-category-title">
                <AlertCircle size={15} />
                <span>{report.category_name || report.categoryName || 'General Violation'}:</span>
              </div>
              <p className="rep-inspect-desc-text">
                {report.description_text || report.description || 'No detailed description provided by the reporting user.'}
              </p>
            </div>
          </div>

          {/* ── CONDITIONAL TARGET INSPECTION ── */}

          {/* CASE 1: COMIC INSPECTION */}
          {targetType === 'COMIC' && (
            <div className="rep-inspect-target-box">
              <div className="rep-inspect-cover-wrapper">
                {loadingDetails ? (
                  <div style={{ color: 'var(--rep-text-muted)', fontSize: '11px', textAlign: 'center', padding: '10px' }}>
                    Loading cover...
                  </div>
                ) : (
                  <img
                    src={displayCover}
                    alt={displayTitle}
                    className="rep-inspect-cover-img"
                  />
                )}
              </div>

              <div className="rep-inspect-info">
                <h4 className="rep-inspect-title">
                  {displayTitle}
                </h4>

                <div className="rep-inspect-meta-row">
                  <div className="rep-inspect-author">
                    Author / Creator: <strong>{resolvedAuthorDisplayName}</strong>
                  </div>

                  {comicObj.publicationStatus && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: comicObj.publicationStatus === 'COMPLETED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: comicObj.publicationStatus === 'COMPLETED' ? '#22c55e' : '#3b82f6'
                    }}>
                      {comicObj.publicationStatus}
                    </span>
                  )}
                </div>

                {displayGenres.length > 0 && (
                  <div className="rep-inspect-genres">
                    {displayGenres.map((g, idx) => (
                      <span key={idx} className="rep-inspect-genre-tag">
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                <p className="rep-inspect-synopsis">
                  {displaySummary}
                </p>

                <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <a
                    href={`/comic/${comicTargetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rep-btn rep-btn-primary"
                    style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '13px' }}
                  >
                    <ExternalLink size={14} /> Open Comic Detail Page
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* CASE 2: CHAPTER IMAGE VIEWER (Corrupt / Broken Pages) */}
          {targetType === 'CHAPTER' && (
            <div className="rep-inspect-card" style={{ gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '14.5px', display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--rep-text-primary)' }}>
                  <ImageIcon size={17} color="#38bdf8" /> Chapter Imagery Inspector ({rawPages.length} pages)
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--rep-text-muted)' }}>
                  Click an image to zoom preview
                </span>
              </div>

              {rawPages.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '12px',
                  maxHeight: '290px',
                  overflowY: 'auto',
                  padding: '10px',
                  background: 'rgba(0, 0, 0, 0.05)',
                  borderRadius: '10px',
                  border: '1px solid var(--rep-border)'
                }}>
                  {rawPages.map((p, idx) => {
                    const imgUrl = p.image_url || p.imageUrl || p.url || p;
                    return (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid var(--rep-border)',
                          cursor: 'pointer',
                          background: '#000',
                          height: '140px'
                        }}
                        onClick={() => setActiveImagePreview(imgUrl)}
                      >
                        <img
                          src={imgUrl}
                          alt={`Page ${p.page_number || p.pageNumber || idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                        <span style={{
                          position: 'absolute',
                          bottom: '4px',
                          left: '4px',
                          background: 'rgba(0, 0, 0, 0.75)',
                          color: '#fff',
                          fontSize: '10.5px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          Page {p.page_number || p.pageNumber || idx + 1}
                        </span>
                      </div>
                    );
                  })}
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
            <div className="rep-inspect-card" style={{ gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '14.5px', color: '#f472b6', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Sparkles size={17} /> Translation Quality & Community Standards Inspection
                </strong>
                <span className="rep-badge in_progress">Content Review</span>
              </div>
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--rep-text-secondary)', lineHeight: 1.5 }}>
                Inspecting: <strong style={{ color: 'var(--rep-text-primary)' }}>{report.target_title}</strong>. Please check whether the translated dialogue contains spam advertisements, prohibited links, or community guideline violations.
              </p>
            </div>
          )}

          {/* ── RESOLUTION FORM SECTION ── */}
          <div className="rep-inspect-action-bar">
            <label className="rep-form-label">
              Moderator Action Decision:
            </label>

            <div className="rep-inspect-decision-buttons">
              <button
                type="button"
                className={`rep-inspect-dec-btn ${actionType === 'ACCEPT' ? 'accept active' : 'accept'}`}
                onClick={() => {
                  setActionType('ACCEPT');
                  setResolutionNote('Confirmed violation. Action taken to suspend comic / remove content.');
                }}
              >
                <CheckCircle2 size={17} /> Accept Report (ACCEPT)
              </button>

              <button
                type="button"
                className={`rep-inspect-dec-btn ${actionType === 'REJECT' ? 'reject active' : 'reject'}`}
                onClick={() => {
                  setActionType('REJECT');
                  setResolutionNote('');
                }}
              >
                <XCircle size={17} /> Reject Report (REJECT)
              </button>
            </div>

            {actionType && (
              <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                <div className="rep-form-group">
                  <label className="rep-form-label">
                    {actionType === 'ACCEPT' ? 'Action Summary / Resolution Note:' : 'Rejection Reason (Sent back to reporter):'}
                  </label>
                  <textarea
                    className="rep-form-textarea"
                    placeholder={
                      actionType === 'ACCEPT'
                        ? 'e.g., Suspended duplicate comic, notified author regarding policy guidelines...'
                        : 'e.g., Verified content authenticity; no violation found based on submitted report...'
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
                    className="rep-inspect-dec-btn ghost"
                    style={{ flex: 'none', padding: '10px 20px' }}
                    onClick={() => setActionType(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`rep-inspect-dec-btn ${actionType === 'ACCEPT' ? 'accept active' : 'reject active'}`}
                    style={{ flex: 'none', padding: '10px 24px' }}
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

