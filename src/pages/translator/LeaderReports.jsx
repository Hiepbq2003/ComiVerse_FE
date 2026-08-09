import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getAdminReportsApi,
  getActiveReportCategoriesApi,
  processReportApi
} from '../../services/api/ReportApi';
import TranslationSplitScreenReview from '../../components/report/TranslationSplitScreenReview';
import '../../assets/style/report/report-system.css';
import { formatTimeAgo } from '../../utils/formatTimeAgo';

export default function LeaderReports() {
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [targetTypeFilter, setTargetTypeFilter] = useState('CHAPTER_TRANSLATIONS');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 8;

  // Split-Screen Review Modal state
  const [selectedReviewReport, setSelectedReviewReport] = useState(null);

  // Quick Action Modal state for table rows
  const [quickActionReport, setQuickActionReport] = useState(null);
  const [quickActionType, setQuickActionType] = useState('ACCEPT');
  const [quickActionNote, setQuickActionNote] = useState('');
  const [processingQuick, setProcessingQuick] = useState(false);

  // Fetch report categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const data = await getActiveReportCategoriesApi();
        setCategories(data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCats();
  }, []);

  // Fetch reports based on active filters
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminReportsApi({
        assigned_role: 'PROJECT_LEADER',
        status: statusFilter,
        target_type: targetTypeFilter,
        category_id: categoryFilter,
        start_date: startDate,
        end_date: endDate,
        search: searchQuery,
        page,
        limit
      });

      setReports(res?.reports || []);
      setTotalCount(res?.total || 0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load leader reports.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, targetTypeFilter, categoryFilter, startDate, endDate, searchQuery, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Handle Process report (Accept/Reject)
  const handleProcessReport = async (reportId, { action, resolution_note }) => {
    const result = await processReportApi(reportId, {
      action,
      resolution_note
    });
    await fetchReports();
    return result;
  };

  // Quick process submit from table modal
  const handleQuickActionSubmit = async (e) => {
    e.preventDefault();
    if (quickActionType === 'REJECT' && !quickActionNote.trim()) {
      toast.warn('Please enter a rejection reason.');
      return;
    }

    setProcessingQuick(true);
    try {
      await handleProcessReport(quickActionReport.id, {
        action: quickActionType,
        resolution_note: quickActionNote.trim() || (quickActionType === 'ACCEPT' ? 'Report confirmed and assigned for translation revision.' : 'Report dismissed as invalid.')
      });
      toast.success(quickActionType === 'ACCEPT' ? 'Report approved successfully!' : 'Report rejected successfully!');
      setQuickActionReport(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to process report.');
    } finally {
      setProcessingQuick(false);
    }
  };

  const pendingCount = reports.filter(r => r.status === 'PENDING').length;
  const progressCount = reports.filter(r => r.status === 'IN_PROGRESS').length;
  const acceptedCount = reports.filter(r => r.status === 'ACCEPTED').length;
  const rejectedCount = reports.filter(r => r.status === 'REJECTED').length;

  return (
    <div className="rep-container">
      {/* ── HEADER ── */}
      <div className="rep-header">
        <div className="rep-title-group">
          <h1>Translation Review & Reports Dashboard (Project Leader)</h1>
          <p>Side-by-Side Split View translation review, synchronized scroll verification, typo and typeset resolution.</p>
        </div>

        <div className="rep-header-actions">
          <button className="rep-btn rep-btn-ghost" onClick={fetchReports} title="Refresh data">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="rep-stats-grid">
        <div className="rep-stat-card" onClick={() => setStatusFilter('ALL')} style={{ cursor: 'pointer' }}>
          <div className="rep-stat-icon total">
            <Layers size={22} />
          </div>
          <div className="rep-stat-info">
            <div className="rep-stat-value">{totalCount}</div>
            <div className="rep-stat-label">Total Reports</div>
          </div>
        </div>

        <div className="rep-stat-card" onClick={() => setStatusFilter('PENDING')} style={{ cursor: 'pointer' }}>
          <div className="rep-stat-icon pending">
            <Clock size={22} />
          </div>
          <div className="rep-stat-info">
            <div className="rep-stat-value">{pendingCount}</div>
            <div className="rep-stat-label">Pending Review</div>
          </div>
        </div>

        <div className="rep-stat-card" onClick={() => setStatusFilter('IN_PROGRESS')} style={{ cursor: 'pointer' }}>
          <div className="rep-stat-icon progress">
            <AlertTriangle size={22} />
          </div>
          <div className="rep-stat-info">
            <div className="rep-stat-value">{progressCount}</div>
            <div className="rep-stat-label">In Progress</div>
          </div>
        </div>

        <div className="rep-stat-card" onClick={() => setStatusFilter('ACCEPTED')} style={{ cursor: 'pointer' }}>
          <div className="rep-stat-icon accepted">
            <CheckCircle2 size={22} />
          </div>
          <div className="rep-stat-info">
            <div className="rep-stat-value">{acceptedCount}</div>
            <div className="rep-stat-label">Approved</div>
          </div>
        </div>

        <div className="rep-stat-card" onClick={() => setStatusFilter('REJECTED')} style={{ cursor: 'pointer' }}>
          <div className="rep-stat-icon rejected">
            <XCircle size={22} />
          </div>
          <div className="rep-stat-info">
            <div className="rep-stat-value">{rejectedCount}</div>
            <div className="rep-stat-label">Rejected</div>
          </div>
        </div>
      </div>

      {/* ── CONTROLS, TABS & ADVANCED FILTERS ── */}
      <div className="rep-controls-card">
        {/* Status Filter Tabs */}
        <div className="rep-status-tabs">
          {[
            { key: 'ALL', label: 'All Reports', count: totalCount },
            { key: 'PENDING', label: 'Pending (PENDING)', count: pendingCount },
            { key: 'IN_PROGRESS', label: 'In Progress (IN_PROGRESS)', count: progressCount },
            { key: 'ACCEPTED', label: 'Approved (ACCEPTED)', count: acceptedCount },
            { key: 'REJECTED', label: 'Rejected (REJECTED)', count: rejectedCount }
          ].map(tab => (
            <button
              key={tab.key}
              className={`rep-status-tab ${statusFilter === tab.key ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter(tab.key);
                setPage(1);
              }}
            >
              <span>{tab.label}</span>
              <span className="rep-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="rep-filters-row">
          {/* Search bar */}
          <div className="rep-search-box">
            <Search size={16} color="var(--rep-text-muted)" />
            <input
              type="text"
              className="rep-search-input"
              placeholder="Search by comic title, report ID, reporter, or description..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Advanced Dropdown Filters */}
          <div className="rep-dropdown-filters">
            {/* Target Type Filter */}
            <select
              className="rep-select"
              value={targetTypeFilter}
              onChange={e => {
                setTargetTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Target Types</option>
              <option value="CHAPTER_TRANSLATIONS">Chapter Translations (CHAPTER_TRANSLATIONS)</option>
              <option value="CHAPTER">Chapter Pages (CHAPTER)</option>
              <option value="COMIC">Comic Series (COMIC)</option>
            </select>

            {/* Category Filter */}
            <select
              className="rep-select"
              value={categoryFilter}
              onChange={e => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Issue Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Date range filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                className="rep-date-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                title="Start Date"
              />
              <span style={{ color: 'var(--rep-text-muted)', fontSize: '12px' }}>-</span>
              <input
                type="date"
                className="rep-date-input"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                title="End Date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── REPORTS DATA TABLE ── */}
      <div className="rep-table-card">
        <div className="rep-table-responsive">
          <table className="rep-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Reporter</th>
                <th>Reported Target</th>
                <th>Category</th>
                <th>Submitted At</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <RefreshCw size={24} className="spin" style={{ color: 'var(--rep-accent)', marginBottom: '8px' }} />
                    <div style={{ color: 'var(--rep-text-muted)' }}>Loading reports...</div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="rep-empty-state">
                      <CheckCircle2 size={44} className="rep-empty-icon" style={{ color: '#10b981' }} />
                      <h3>No matching reports found</h3>
                      <p>All clean! There are no translation reports matching the current filter criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id}>
                    {/* Report ID */}
                    <td style={{ fontFamily: 'var(--rep-mono)', fontWeight: '700', fontSize: '13px' }}>
                      #{report.id}
                    </td>

                    {/* Reporter Info */}
                    <td>
                      <div className="rep-reporter-cell">
                        {report.reporter_avatar && (
                          <img
                            src={report.reporter_avatar}
                            alt={report.reporter_name}
                            className="rep-reporter-avatar"
                          />
                        )}
                        <div>
                          <div className="rep-reporter-name">{report.reporter_name || 'Reader'}</div>
                          <div className="rep-reporter-email">{report.reporter_email || 'user@comiverse.vn'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Reported Target */}
                    <td>
                      <span className="rep-target-title" title={report.target_title}>
                        {report.target_title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span className={`rep-target-badge ${(report.target_type || '').toLowerCase()}`}>
                          {report.target_type}
                        </span>
                        {report.target_url && (
                          <a
                            href={report.target_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--rep-accent)', display: 'inline-flex', alignItems: 'center' }}
                            title="Open Link"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <div className="rep-target-desc" title={report.description_text}>
                        "{report.description_text}"
                      </div>
                    </td>

                    {/* Category */}
                    <td>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--rep-text-primary)' }}>
                        {report.category_name}
                      </span>
                    </td>

                    {/* Sent Time */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>
                        {formatTimeAgo(report.created_at)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--rep-text-muted)' }}>
                        {new Date(report.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span className={`rep-badge ${(report.status || 'pending').toLowerCase()}`}>
                        {report.status === 'PENDING' && <Clock size={12} />}
                        {report.status === 'IN_PROGRESS' && <AlertTriangle size={12} />}
                        {report.status === 'ACCEPTED' && <CheckCircle2 size={12} />}
                        {report.status === 'REJECTED' && <XCircle size={12} />}
                        {report.status}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                        {/* Split-Screen Review trigger for Translations */}
                        <button
                          className="rep-btn rep-btn-review"
                          onClick={() => setSelectedReviewReport(report)}
                          title="Open Side-by-Side Split View"
                        >
                          <Layers size={14} /> Review Translation
                        </button>

                        {/* Quick Process button */}
                        {report.status === 'PENDING' && (
                          <button
                            className="rep-btn rep-btn-ghost"
                            onClick={() => {
                              setQuickActionReport(report);
                              setQuickActionType('ACCEPT');
                              setQuickActionNote('');
                            }}
                            title="Quick Process"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalCount > limit && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderTop: '1px solid var(--rep-border)'
          }}>
            <span style={{ fontSize: '13px', color: 'var(--rep-text-secondary)' }}>
              Showing {reports.length} of {totalCount} reports
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="rep-btn rep-btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button
                className="rep-btn rep-btn-ghost"
                disabled={page * limit >= totalCount}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── TRANSLATION SPLIT-SCREEN MODAL ── */}
      {selectedReviewReport && (
        <TranslationSplitScreenReview
          report={selectedReviewReport}
          onClose={() => setSelectedReviewReport(null)}
          onProcess={handleProcessReport}
        />
      )}

      {/* ── QUICK ACTION MODAL ── */}
      {quickActionReport && (
        <div className="rep-modal-backdrop" onClick={() => setQuickActionReport(null)}>
          <div className="rep-modal-card" onClick={e => e.stopPropagation()}>
            <div className="rep-modal-header">
              <h3>Quick Resolve Report #{quickActionReport.id}</h3>
              <button className="rep-tool-btn" onClick={() => setQuickActionReport(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickActionSubmit}>
              <div className="rep-modal-body">
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--rep-text-secondary)' }}>
                  Target: <strong>{quickActionReport.target_title}</strong>
                </p>

                <div className="rep-form-group">
                  <label className="rep-form-label">Select Action:</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      className={`rep-btn ${quickActionType === 'ACCEPT' ? 'rep-btn-success' : 'rep-btn-ghost'}`}
                      style={{ flex: 1, padding: '10px' }}
                      onClick={() => setQuickActionType('ACCEPT')}
                    >
                      <CheckCircle2 size={16} /> Accept (ACCEPT)
                    </button>
                    <button
                      type="button"
                      className={`rep-btn ${quickActionType === 'REJECT' ? 'rep-btn-danger' : 'rep-btn-ghost'}`}
                      style={{ flex: 1, padding: '10px' }}
                      onClick={() => setQuickActionType('REJECT')}
                    >
                      <XCircle size={16} /> Reject (REJECT)
                    </button>
                  </div>
                </div>

                <div className="rep-form-group">
                  <label className="rep-form-label">
                    {quickActionType === 'ACCEPT' ? 'Revision Instructions (Optional):' : 'Rejection Reason (Required):'}
                  </label>
                  <textarea
                    className="rep-form-textarea"
                    placeholder={
                      quickActionType === 'ACCEPT'
                        ? 'Enter instructions for translator revision...'
                        : 'Explain why this report is rejected...'
                    }
                    value={quickActionNote}
                    onChange={e => setQuickActionNote(e.target.value)}
                    required={quickActionType === 'REJECT'}
                  />
                </div>
              </div>

              <div className="rep-modal-footer">
                <button
                  type="button"
                  className="rep-btn rep-btn-ghost"
                  onClick={() => setQuickActionReport(null)}
                  disabled={processingQuick}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`rep-btn ${quickActionType === 'ACCEPT' ? 'rep-btn-success' : 'rep-btn-danger'}`}
                  disabled={processingQuick}
                >
                  {processingQuick ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
