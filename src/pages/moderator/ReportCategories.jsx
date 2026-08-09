import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderPlus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Shield,
  Users,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getAllReportCategoriesApi,
  createReportCategoryApi,
  updateReportCategoryApi,
  deleteReportCategoryApi
} from '../../services/api/ReportApi';
import CategoryModal from '../../components/report/CategoryModal';
import '../../assets/style/report/report-system.css';

export default function ReportCategories({ roleScope = 'ALL' }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [targetTypeFilter, setTargetTypeFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Fetch all categories
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllReportCategoriesApi();
      setCategories(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load report categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Handle Quick Toggle is_active
  const handleToggleActive = async (category) => {
    const updatedStatus = !category.is_active;
    // Optimistic UI update
    setCategories(prev =>
      prev.map(c => c.id === category.id ? { ...c, is_active: updatedStatus } : c)
    );

    try {
      await updateReportCategoryApi(category.id, {
        ...category,
        is_active: updatedStatus
      });
      toast.success(
        updatedStatus
          ? `Category "${category.name}" enabled`
          : `Category "${category.name}" disabled`
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to update category status.');
      fetchCategories();
    }
  };

  // Handle Save (Create or Edit)
  const handleSaveCategory = async (formData) => {
    if (selectedCategory) {
      await updateReportCategoryApi(selectedCategory.id, formData);
    } else {
      await createReportCategoryApi(formData);
    }
    await fetchCategories();
  };

  // Handle Delete
  const handleDeleteCategory = async (cat) => {
    if (window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      try {
        await deleteReportCategoryApi(cat.id);
        toast.success(`Category "${cat.name}" deleted successfully`);
        await fetchCategories();
      } catch (err) {
        console.error(err);
        toast.error('Failed to delete category.');
      }
    }
  };

  // Filter logic
  const filteredCategories = categories.filter(c => {
    if (roleFilter !== 'ALL' && c.assigned_role !== roleFilter) return false;
    if (targetTypeFilter !== 'ALL' && (!Array.isArray(c.target_types) || !c.target_types.includes(targetTypeFilter))) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = c.name && c.name.toLowerCase().includes(q);
      const matchDesc = c.description && c.description.toLowerCase().includes(q);
      return matchName || matchDesc;
    }
    return true;
  });

  return (
    <div className="rep-container">
      {/* ── HEADER ── */}
      <div className="rep-header">
        <div className="rep-title-group">
          <h1>Report Categories Management</h1>
          <p>Configure issue categories for Comic series, Chapter images, and Translations with active status switches and role delegations.</p>
        </div>

        <div className="rep-header-actions">
          <button className="rep-btn rep-btn-ghost" onClick={fetchCategories} title="Refresh categories">
            <RefreshCw size={15} /> Refresh
          </button>

          <button
            className="rep-btn rep-btn-primary"
            onClick={() => {
              setSelectedCategory(null);
              setIsModalOpen(true);
            }}
          >
            <FolderPlus size={16} /> + Add New Category
          </button>
        </div>
      </div>

      {/* ── CONTROLS & FILTER BAR ── */}
      <div className="rep-controls-card">
        <div className="rep-filters-row">
          <div className="rep-search-box">
            <Search size={16} color="var(--rep-text-muted)" />
            <input
              type="text"
              className="rep-search-input"
              placeholder="Search categories by name or guidelines..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="rep-dropdown-filters">
            {/* Filter by assigned role */}
            <select
              className="rep-select"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="ALL">All Handler Roles</option>
              <option value="MODERATOR">MODERATOR</option>
              <option value="PROJECT_LEADER">PROJECT LEADER</option>
            </select>

            {/* Filter by target type */}
            <select
              className="rep-select"
              value={targetTypeFilter}
              onChange={e => setTargetTypeFilter(e.target.value)}
            >
              <option value="ALL">All Target Types</option>
              <option value="COMIC">COMIC (Comics)</option>
              <option value="CHAPTER">CHAPTER (Chapter Images)</option>
              <option value="CHAPTER_TRANSLATIONS">TRANSLATION (Translations)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── CATEGORIES TABLE ── */}
      <div className="rep-table-card">
        <div className="rep-table-responsive">
          <table className="rep-table">
            <thead>
              <tr>
                <th style={{ width: '260px' }}>Category Name</th>
                <th>Description & Guidelines</th>
                <th>Assigned Role</th>
                <th>Applicable Targets</th>
                <th>Active Status</th>
                <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <RefreshCw size={24} className="spin" style={{ color: 'var(--rep-accent)', marginBottom: '8px' }} />
                    <div style={{ color: 'var(--rep-text-muted)' }}>Loading categories...</div>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="rep-empty-state">
                      <AlertCircle size={44} className="rep-empty-icon" />
                      <h3>No report categories found</h3>
                      <p>Click "+ Add New Category" to create your first report category.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map(cat => (
                  <tr key={cat.id}>
                    {/* Name */}
                    <td>
                      <div style={{ fontWeight: '700', color: 'var(--rep-text-primary)', fontSize: '14px', marginBottom: '2px' }}>
                        {cat.name}
                      </div>
                    </td>

                    {/* Description */}
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--rep-text-secondary)', maxWidth: '420px', lineHeight: 1.4 }}>
                        {cat.description || 'No description provided.'}
                      </div>
                    </td>

                    {/* Assigned Role */}
                    <td>
                      <span className={`rep-role-badge ${cat.assigned_role === 'MODERATOR' ? 'moderator' : 'leader'}`}>
                        {cat.assigned_role === 'MODERATOR' ? <Shield size={12} /> : <Users size={12} />}
                        {cat.assigned_role}
                      </span>
                    </td>

                    {/* Target Types */}
                    <td>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {(Array.isArray(cat.target_types) ? cat.target_types : ['COMIC']).map((typeKey, idx) => (
                          <span key={idx} className={`rep-target-badge ${typeKey.toLowerCase()}`}>
                            {typeKey === 'CHAPTER_TRANSLATIONS' ? 'TRANSLATION' : typeKey}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* is_active Toggle */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="rep-switch">
                          <input
                            type="checkbox"
                            checked={cat.is_active !== false}
                            onChange={() => handleToggleActive(cat)}
                          />
                          <span className="rep-slider"></span>
                        </label>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '600',
                          color: cat.is_active !== false ? '#10b981' : 'var(--rep-text-muted)'
                        }}>
                          {cat.is_active !== false ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="rep-btn rep-btn-ghost"
                          style={{ padding: '6px 10px' }}
                          onClick={() => {
                            setSelectedCategory(cat);
                            setIsModalOpen(true);
                          }}
                          title="Edit category"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          className="rep-btn rep-btn-danger"
                          style={{ padding: '6px 10px' }}
                          onClick={() => handleDeleteCategory(cat)}
                          title="Delete category"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CREATE / EDIT CATEGORY MODAL ── */}
      <CategoryModal
        isOpen={isModalOpen}
        category={selectedCategory}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
        }}
        onSubmit={handleSaveCategory}
      />
    </div>
  );
}
