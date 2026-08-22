import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Shield,
  Users,
  BookOpen,
  FileImage,
  Languages,
  Check,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function CategoryModal({
  isOpen,
  category,
  onClose,
  onSubmit
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assigned_role: 'MODERATOR',
    target_types: ['COMIC', 'CHAPTER'],
    is_active: true
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        assigned_role: category.assigned_role || 'MODERATOR',
        target_types: Array.isArray(category.target_types) && category.target_types.length > 0
          ? category.target_types
          : ['COMIC'],
        is_active: category.is_active !== undefined ? category.is_active : true
      });
    } else {
      setFormData({
        name: '',
        description: '',
        assigned_role: 'MODERATOR',
        target_types: ['COMIC', 'CHAPTER'],
        is_active: true
      });
    }
    setErrors({});
  }, [category, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required.';
    } else if (formData.name.length > 150) {
      newErrors.name = 'Category name cannot exceed 150 characters.';
    }

    if (!formData.target_types || formData.target_types.length === 0) {
      newErrors.target_types = 'Please select at least one target type.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleToggleTargetType = (typeKey) => {
    setFormData(prev => {
      const exists = prev.target_types.includes(typeKey);
      const next = exists
        ? prev.target_types.filter(t => t !== typeKey)
        : [...prev.target_types, typeKey];
      return { ...prev, target_types: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit(formData);
      toast.success(category ? 'Category updated successfully!' : 'Category created successfully!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save report category.');
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div className="rep-modal-backdrop" onClick={onClose}>
      <div
        className="rep-modal-card"
        style={{
          maxWidth: '920px',
          width: '92%'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header (Fixed) */}
        <div className="rep-modal-header">
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
            {category ? 'Edit Report Category' : 'Create New Report Category'}
          </h3>
          <button className="rep-tool-btn" onClick={onClose} title="Close Modal">
            <X size={18} />
          </button>
        </div>

        {/* Body Form (Wide 2-Column Horizontal Layout) */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="rep-modal-body" style={{ padding: '20px 24px' }}>
            <div className="rep-category-modal-grid">
              
              {/* ── LEFT COLUMN: Text Info & Status ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Category Name */}
                <div className="rep-form-group">
                  <label className="rep-form-label">
                    <span>Category Name <strong style={{ color: '#ef4444' }}>*</strong></span>
                    <span style={{ fontSize: '11px', color: formData.name.length > 140 ? '#f59e0b' : 'var(--rep-text-muted)' }}>
                      {formData.name.length}/150
                    </span>
                  </label>
                  <input
                    type="text"
                    className="rep-form-input"
                    placeholder="e.g., Translation Accuracy / Image Corruption..."
                    value={formData.name}
                    maxLength={150}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    autoFocus
                  />
                  {errors.name && (
                    <span style={{ color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={13} /> {errors.name}
                    </span>
                  )}
                </div>

                {/* Description */}
                <div className="rep-form-group" style={{ flex: 1 }}>
                  <label className="rep-form-label">
                    <span>Detailed Description & Guidelines:</span>
                  </label>
                  <textarea
                    className="rep-form-textarea"
                    placeholder="Describe when readers should select this report category..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    style={{ height: '88px' }}
                  />
                </div>

                {/* Active Toggle Switch */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--rep-border)',
                  marginTop: 'auto'
                }}>
                  <label className="rep-switch-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--rep-text-primary)' }}>Active Status (is_active)</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--rep-text-muted)' }}>
                        {formData.is_active ? 'Category is currently active for reports' : 'Category is disabled'}
                      </div>
                    </div>
                    <label className="rep-switch" style={{ margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                      />
                      <span className="rep-slider"></span>
                    </label>
                  </label>
                </div>
              </div>

              {/* ── RIGHT COLUMN: Handler Role & Targets ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Assigned Role Selection */}
                <div className="rep-form-group">
                  <label className="rep-form-label">
                    <span>Assigned Handler Role:</span>
                  </label>
                  <div className="rep-role-cards">
                    <div
                      className={`rep-role-card ${formData.assigned_role === 'MODERATOR' ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, assigned_role: 'MODERATOR' })}
                      style={{ padding: '10px 12px' }}
                    >
                      <div className="rep-role-title" style={{ color: '#fb923c', fontSize: '13.5px' }}>
                        <Shield size={15} /> MODERATOR
                      </div>
                      <div className="rep-role-desc" style={{ fontSize: '11.5px' }}>
                        Handles image corruptions, broken pages, unauthorized ads, and content standards.
                      </div>
                    </div>

                    <div
                      className={`rep-role-card ${formData.assigned_role === 'PROJECT_LEADER' ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, assigned_role: 'PROJECT_LEADER' })}
                      style={{ padding: '10px 12px' }}
                    >
                      <div className="rep-role-title" style={{ color: '#a78bfa', fontSize: '13.5px' }}>
                        <Users size={15} /> PROJECT LEADER
                      </div>
                      <div className="rep-role-desc" style={{ fontSize: '11.5px' }}>
                        Responsible for translation side-by-side quality, grammatical accuracy, and reviews.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Applicable Target Types */}
                <div className="rep-form-group">
                  <label className="rep-form-label">
                    <span>Applicable Target Types <strong style={{ color: '#ef4444' }}>*</strong></span>
                  </label>
                  <div className="rep-targets-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    {/* COMIC */}
                    <div
                      className={`rep-target-checkbox-card ${formData.target_types.includes('COMIC') ? 'checked' : ''}`}
                      onClick={() => handleToggleTargetType('COMIC')}
                      style={{ padding: '8px 10px', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <BookOpen size={15} color="#c084fc" />
                        {formData.target_types.includes('COMIC') && <Check size={14} color="#c084fc" />}
                      </div>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '700' }}>COMIC</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--rep-text-muted)' }}>Comic Series</div>
                      </div>
                    </div>

                    {/* CHAPTER */}
                    <div
                      className={`rep-target-checkbox-card ${formData.target_types.includes('CHAPTER') ? 'checked' : ''}`}
                      onClick={() => handleToggleTargetType('CHAPTER')}
                      style={{ padding: '8px 10px', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <FileImage size={15} color="#38bdf8" />
                        {formData.target_types.includes('CHAPTER') && <Check size={14} color="#38bdf8" />}
                      </div>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '700' }}>CHAPTER</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--rep-text-muted)' }}>Image Pages</div>
                      </div>
                    </div>

                    {/* CHAPTER_TRANSLATIONS */}
                    <div
                      className={`rep-target-checkbox-card ${formData.target_types.includes('CHAPTER_TRANSLATIONS') ? 'checked' : ''}`}
                      onClick={() => handleToggleTargetType('CHAPTER_TRANSLATIONS')}
                      style={{ padding: '8px 10px', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Languages size={15} color="#f472b6" />
                        {formData.target_types.includes('CHAPTER_TRANSLATIONS') && <Check size={14} color="#f472b6" />}
                      </div>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: '700' }}>TRANSLATION</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--rep-text-muted)' }}>Translations</div>
                      </div>
                    </div>
                  </div>
                  {errors.target_types && (
                    <span style={{ color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <AlertCircle size={13} /> {errors.target_types}
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Footer (Fixed at Bottom - Always Visible) */}
          <div className="rep-modal-footer" style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="rep-btn rep-btn-ghost"
              onClick={onClose}
              disabled={submitting}
              style={{ padding: '10px 20px', fontSize: '13.5px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rep-btn rep-btn-primary"
              disabled={submitting}
              style={{ padding: '10px 24px', fontSize: '13.5px', fontWeight: '700' }}
            >
              {submitting ? 'Saving...' : (category ? 'Update Category' : 'Create Category')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

