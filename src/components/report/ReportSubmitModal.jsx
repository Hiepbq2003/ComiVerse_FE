import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Flag,
  AlertTriangle,
  AlertCircle,
  LogIn,
  Info,
  ChevronDown,
  Tag,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getActiveReportCategoriesApi, createReportApi } from '../../services/api/ReportApi';
import { getAuth } from '../../utils/Auth';

export default function ReportSubmitModal({
  isOpen,
  onClose,
  targetType = 'COMIC', // 'COMIC' | 'CHAPTER' | 'CHAPTER_TRANSLATIONS'
  targetId,
  targetTitle = '',
  chapterNumber = null,
  languageCode = ''
}) {
  const navigate = useNavigate();
  const auth = getAuth();
  const isLoggedIn = !!(auth && auth.token);

  // States
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [descriptionText, setDescriptionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fetch active categories strictly for the current targetType
  useEffect(() => {
    if (!isOpen) return;

    const fetchCategories = async () => {
      setLoadingCategories(true);
      setError('');
      setIsDropdownOpen(false);
      try {
        const cats = await getActiveReportCategoriesApi(targetType);
        const activeCats = Array.isArray(cats) ? cats.filter(c => c.is_active !== false) : [];
        setCategories(activeCats);
        if (activeCats.length > 0) {
          setSelectedCategoryId(activeCats[0].id);
        } else {
          setSelectedCategoryId('');
        }
      } catch (err) {
        console.error('Failed to load report categories:', err);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [targetType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      toast.info('Please sign in to submit a report.');
      navigate('/auth?mode=signin');
      return;
    }

    if (!selectedCategoryId) {
      setError('Please select an issue category.');
      return;
    }

    if (!descriptionText.trim() || descriptionText.trim().length < 10) {
      setError('Please provide at least 10 characters describing the issue.');
      return;
    }

    if (!targetId) {
      setError('This item cannot be reported yet.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await createReportApi({
        target_type: targetType,
        target_id: targetId,
        category_id: selectedCategoryId,
        description_text: descriptionText.trim(),
        ...(languageCode ? { language_code: languageCode } : {})
      });

      toast.success('Thank you for reporting! Our moderation team will review this issue shortly.');
      setDescriptionText('');
      onClose();
    } catch (err) {
      console.error('Failed to submit report:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to submit report. Please try again.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryObj = categories.find(c => String(c.id) === String(selectedCategoryId));

  // Target type label formatter
  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'CHAPTER_TRANSLATIONS':
        return 'Translation & Typeset';
      case 'CHAPTER':
        return 'Chapter Image Pages';
      case 'COMIC':
      default:
        return 'Comic Series';
    }
  };

  return (
    <div className="rep-modal-backdrop" onClick={onClose}>
      <div
        className="rep-modal-card"
        style={{ maxWidth: '580px', width: '92%' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="rep-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              padding: '6px',
              borderRadius: '8px',
              display: 'inline-flex'
            }}>
              <Flag size={18} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>
                Report {getTargetTypeLabel()} Issue
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--rep-text-muted)' }}>
                Help our moderation team keep ComiVerse accurate and safe.
              </span>
            </div>
          </div>
          <button className="rep-tool-btn" onClick={onClose} title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content / Form */}
        <form onSubmit={handleSubmit}>
          <div className="rep-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Target Information Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--rep-border)',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--rep-text-muted)', fontWeight: '700' }}>
                Target:
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--rep-text-primary)' }}>
                {targetTitle || `Item #${targetId}`}
                {chapterNumber && ` · Chapter ${chapterNumber}`}
              </div>
            </div>

            {/* Issue Category Select Dropdown */}
            <div className="rep-form-group" style={{ marginBottom: 0 }}>
              <label className="rep-form-label">
                <span>Select Report Category <strong style={{ color: '#ef4444' }}>*</strong>:</span>
              </label>

              {loadingCategories ? (
                <div className="rep-custom-dropdown-loading">
                  <Loader2 size={16} className="rep-spinner" color="#c084fc" />
                  <span>Loading report categories...</span>
                </div>
              ) : categories.length === 0 ? (
                <div className="rep-category-empty-banner">
                  <AlertTriangle size={16} />
                  <span>No specific categories available. General review will be applied.</span>
                </div>
              ) : (
                <div className="rep-dropdown-wrapper" ref={dropdownRef}>
                  {/* Accessible select keeping HTML form validation & tests synchronized */}
                  <select
                    className="rep-select rep-accessible-select"
                    value={selectedCategoryId}
                    onChange={e => setSelectedCategoryId(e.target.value)}
                    required
                    aria-label="Select Report Category"
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: '1px', width: '1px' }}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  {/* Custom Glass Dropdown Trigger Button */}
                  <button
                    type="button"
                    className={`rep-custom-dropdown-trigger ${isDropdownOpen ? 'open' : ''}`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={isDropdownOpen}
                  >
                    <div className="rep-custom-dropdown-trigger-left">
                      <span className="rep-custom-dropdown-trigger-icon">
                        <Tag size={14} color="#c084fc" />
                      </span>
                      <span className="rep-custom-dropdown-trigger-text">
                        {selectedCategoryObj?.name || 'Select a report category...'}
                      </span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`rep-custom-dropdown-chevron ${isDropdownOpen ? 'open' : ''}`}
                    />
                  </button>

                  {/* Floating Glass Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="rep-custom-dropdown-menu" role="listbox">
                      <div className="rep-custom-dropdown-list">
                        {categories.map(cat => {
                          const isSelected = String(cat.id) === String(selectedCategoryId);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              className={`rep-custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                setSelectedCategoryId(cat.id);
                                setIsDropdownOpen(false);
                              }}
                            >
                              <div className="rep-custom-dropdown-item-content">
                                <div className="rep-custom-dropdown-item-title">
                                  {cat.name}
                                </div>
                                {cat.description && (
                                  <div className="rep-custom-dropdown-item-desc">
                                    {cat.description}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selected Category Guideline Hint Card */}
                  {selectedCategoryObj?.description && (
                    <div className="rep-category-guideline-card">
                      <div className="rep-guideline-header">
                        <Info size={14} color="#c084fc" />
                        <span>Category Guidance</span>
                      </div>
                      <div className="rep-guideline-body">
                        {selectedCategoryObj.description}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description Textarea */}
            <div className="rep-form-group" style={{ marginBottom: 0 }}>
              <label className="rep-form-label">
                <span>Issue Description & Details <strong style={{ color: '#ef4444' }}>*</strong>:</span>
                <span style={{ fontSize: '11.5px', color: descriptionText.length < 10 ? '#f87171' : 'var(--rep-text-muted)' }}>
                  {descriptionText.length}/1000 (Min 10 chars)
                </span>
              </label>
              <textarea
                className="rep-form-textarea"
                rows={4}
                maxLength={1000}
                placeholder={
                  targetType === 'COMIC'
                    ? 'Please describe what is wrong with this comic (e.g., copyright violation, duplicate series, misleading metadata or spam description)...'
                    : targetType === 'CHAPTER_TRANSLATIONS'
                    ? 'Please describe translation or typeset errors (e.g., page 3 dialogue inverted, missing text bubbles, unauthorized gambling links)...'
                    : 'Please specify the corrupted or broken pages (e.g., page 2 and 4 image 404 error, blurry images, missing pages)...'
                }
                value={descriptionText}
                onChange={e => setDescriptionText(e.target.value)}
                required
              />
            </div>

            {/* Error banner */}
            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            {!isLoggedIn && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                color: '#fbbf24',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <LogIn size={15} />
                You must sign in to submit reports and track resolution status.
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="rep-modal-footer">
            <button
              type="button"
              className="rep-btn rep-btn-ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rep-btn rep-btn-danger"
              disabled={submitting || (isLoggedIn && descriptionText.trim().length < 10)}
              title={descriptionText.trim().length < 10 ? 'Please provide at least 10 characters describing the issue (Min 10 chars)' : ''}
            >
              <Flag size={15} />
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
