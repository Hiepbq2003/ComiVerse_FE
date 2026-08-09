import React, { useState, useEffect } from 'react';
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

  return (
    <div className="rep-modal-backdrop" onClick={onClose}>
      <div
        className="rep-modal-card"
        style={{ maxWidth: '640px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="rep-modal-header">
          <h3>{category ? 'Edit Report Category' : 'Create New Report Category'}</h3>
          <button className="rep-tool-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit}>
          <div className="rep-modal-body">
            {/* Name */}
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
                placeholder="e.g., Translation Accuracy / Image Corruption / Content Policy..."
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
            <div className="rep-form-group">
              <label className="rep-form-label">
                <span>Detailed Description & Guidelines:</span>
              </label>
              <textarea
                className="rep-form-textarea"
                placeholder="Describe when readers should select this report category..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Assigned Role */}
            <div className="rep-form-group">
              <label className="rep-form-label">
                <span>Assigned Handler Role:</span>
              </label>
              <div className="rep-role-cards">
                <div
                  className={`rep-role-card ${formData.assigned_role === 'MODERATOR' ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, assigned_role: 'MODERATOR' })}
                >
                  <div className="rep-role-title" style={{ color: '#fb923c' }}>
                    <Shield size={16} /> MODERATOR
                  </div>
                  <div className="rep-role-desc">
                    Handles image corruptions, broken pages, unauthorized ads, spam and community standards.
                  </div>
                </div>

                <div
                  className={`rep-role-card ${formData.assigned_role === 'PROJECT_LEADER' ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, assigned_role: 'PROJECT_LEADER' })}
                >
                  <div className="rep-role-title" style={{ color: '#a78bfa' }}>
                    <Users size={16} /> PROJECT LEADER
                  </div>
                  <div className="rep-role-desc">
                    Responsible for translation side-by-side quality, grammatical accuracy, and typeset reviews.
                  </div>
                </div>
              </div>
            </div>

            {/* Target Types Checkboxes */}
            <div className="rep-form-group">
              <label className="rep-form-label">
                <span>Applicable Target Types <strong style={{ color: '#ef4444' }}>*</strong></span>
              </label>
              <div className="rep-targets-grid">
                {/* COMIC */}
                <div
                  className={`rep-target-checkbox-card ${formData.target_types.includes('COMIC') ? 'checked' : ''}`}
                  onClick={() => handleToggleTargetType('COMIC')}
                >
                  <BookOpen size={16} color="#c084fc" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>COMIC</div>
                    <div style={{ fontSize: '11px', color: 'var(--rep-text-muted)' }}>Comic Series</div>
                  </div>
                  {formData.target_types.includes('COMIC') && <Check size={16} color="#c084fc" />}
                </div>

                {/* CHAPTER */}
                <div
                  className={`rep-target-checkbox-card ${formData.target_types.includes('CHAPTER') ? 'checked' : ''}`}
                  onClick={() => handleToggleTargetType('CHAPTER')}
                >
                  <FileImage size={16} color="#38bdf8" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>CHAPTER</div>
                    <div style={{ fontSize: '11px', color: 'var(--rep-text-muted)' }}>Chapter Image Pages</div>
                  </div>
                  {formData.target_types.includes('CHAPTER') && <Check size={16} color="#38bdf8" />}
                </div>

                {/* CHAPTER_TRANSLATIONS */}
                <div
                  className={`rep-target-checkbox-card ${formData.target_types.includes('CHAPTER_TRANSLATIONS') ? 'checked' : ''}`}
                  onClick={() => handleToggleTargetType('CHAPTER_TRANSLATIONS')}
                >
                  <Languages size={16} color="#f472b6" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>TRANSLATION</div>
                    <div style={{ fontSize: '11px', color: 'var(--rep-text-muted)' }}>Chapter Translation</div>
                  </div>
                  {formData.target_types.includes('CHAPTER_TRANSLATIONS') && <Check size={16} color="#f472b6" />}
                </div>
              </div>
              {errors.target_types && (
                <span style={{ color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={13} /> {errors.target_types}
                </span>
              )}
            </div>

            {/* Active Toggle */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--rep-border)'
            }}>
              <label className="rep-switch-label">
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: '600' }}>Active Status (is_active)</div>
                  <div style={{ fontSize: '12px', color: 'var(--rep-text-muted)' }}>
                    {formData.is_active ? 'Category is currently active and available for reports' : 'Category is disabled'}
                  </div>
                </div>
                <label className="rep-switch">
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

          {/* Footer */}
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
              className="rep-btn rep-btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : (category ? 'Update Category' : 'Create Category')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
