import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom';
import '../../assets/style/translator/team-projects.css'
import ModernButton from '../../components/common/ModernButton'
import ModernPagination from '../../components/common/ModernPagination'
import { getMyProjectTeamsApi, getMyProjectTeamsPageApi, getAllProjectTeamsApi, updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { getAllSubmissionsApi } from '../../services/api/SubmissionApi'
import { getAllComicsApi, getComicsPageApi } from '../../services/api/ComicApi'
import { getChaptersByComicIdApi } from '../../services/api/ChapterApi'
import { getAuthorComicChaptersApi } from '../../services/api/AuthorComicApi'
import { getAuth } from '../../utils/Auth'
import { exportToCsv } from '../../utils/exportToCsv'
import { uploadImageApi } from '../../services/api/UploadApi'
const getProjectCover = (proj, dbComics = [], dbSubs = []) => {
  if (!proj) return '';
  const rawCover = proj.cover || proj.coverImage || proj.coverImageUrl || proj.coverUrl || proj.imageUrl || '';
  
  if (rawCover && typeof rawCover === 'string' && (
    rawCover.startsWith('http://') ||
    rawCover.startsWith('https://') ||
    rawCover.startsWith('data:') ||
    rawCover.startsWith('/') ||
    rawCover.includes('.')
  ) && !rawCover.includes('🔮') && !rawCover.includes('📚')) {
    return rawCover;
  }

  const cleanName = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/\s*(-.*)?(\s+translation\s+team|\s+team|\s+english\s+translation|\s+english)$/i, '')
      .toLowerCase()
      .trim();
  };

  const targetId = String(proj.comicId || proj.id || '').toLowerCase().trim();
  const targetTitle = cleanName(proj.comicName || proj.title || proj.comicTitle || proj.team || '');

  const findCoverInList = (list) => {
    if (!Array.isArray(list) || list.length === 0) return '';
    const match = list.find(item => {
      if (!item) return false;
      const itemId = String(item.id || item.comicId || '').toLowerCase().trim();
      if (targetId && itemId && (itemId === targetId || itemId === `comic-${targetId}`)) return true;
      const itemTitle = cleanName(item.title || item.comicName || item.comicTitle || item.name || '');
      return targetTitle && itemTitle && (itemTitle === targetTitle || itemTitle.includes(targetTitle) || targetTitle.includes(itemTitle));
    });
    if (match) {
      const c = match.cover || match.coverImage || match.coverImageUrl || match.coverUrl || match.imageUrl;
      if (c && typeof c === 'string' && (c.startsWith('http') || c.startsWith('data:') || c.startsWith('/') || c.includes('.')) && !c.includes('🔮') && !c.includes('📚')) {
        return c;
      }
    }
    return '';
  };

  let found = findCoverInList(dbComics) || findCoverInList(dbSubs);
  if (!found) {
    const storageKeys = [
      'comiverse_moderator_submissions_override',
      'comiverse_author_submissions',
      'comiverse_comics_override',
      'comiverse_admin_comics',
      'comiverse_comics_list'
    ];
    for (const key of storageKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          found = findCoverInList(parsed);
          if (found) break;
        }
      } catch (e) {}
    }
  }
  if (!found) {
    try {
      const sess = sessionStorage.getItem('comiverse_comics_cache');
      if (sess) {
        found = findCoverInList(JSON.parse(sess));
      }
    } catch (e) {}
  }
  if (!found) {
    try {
      const sessTeams = sessionStorage.getItem('comiverse_teams_list_cache');
      if (sessTeams) {
        found = findCoverInList(JSON.parse(sessTeams));
      }
    } catch (e) {}
  }

  return found || ((rawCover && !rawCover.includes('🔮') && !rawCover.includes('📚')) ? rawCover : '');
};

import {
  getTeamAnnouncementsApi,
  createTeamAnnouncementApi,
  likeTeamAnnouncementApi,
  pinTeamAnnouncementApi,
  updateTeamAnnouncementApi,
  createTeamPostCommentApi,
  likeTeamPostCommentApi,
  updateTeamPostCommentApi,
  deleteTeamPostCommentApi,
  getTeamPostCommentsApi,
  getTeamTasksApi,
  getTeamMembersApi,
  getTeamChaptersApi,
  createTeamTaskApi,
  updateTeamTaskApi,
  handoverTeamTaskApi,
  getTeamRequestsApi,
  decideTeamRequestApi,
  deleteTeamAnnouncementApi,
  removeTeamMemberApi,
  banUserFromTeamApi,
  unbanUserFromTeamApi,
  getBannedUsersApi
} from '../../services/api/TeamWorkspaceApi'
import { toast } from 'react-toastify'

import HomeTab from './HomeTab'
import MembersTab from './MembersTab'
import RequestsTab from './RequestsTab'
import TasksTab, { CreateTaskModal, EditTaskModal, parseTaskTitle, getTaskColumn } from './TasksTab'
import SettingsTab from './SettingsTab'

function parseCompletedPageNumbers(value) {
  const result = new Set()
  String(value || '').split(',').map(part => part.trim()).filter(Boolean).forEach((part) => {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/)
    if (range) {
      const start = Number(range[1])
      const end = Number(range[2])
      for (let page = Math.min(start, end); page <= Math.max(start, end); page += 1) result.add(page)
      return
    }
    const page = Number(part)
    if (Number.isInteger(page) && page > 0) result.add(page)
  })
  return [...result].sort((a, b) => a - b)
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

function ProjectsListView({
  teamProjectsList,
  searchTerm,
  onSearchChange,
  sourceLang,
  onSourceLangChange,
  targetLang,
  onTargetLangChange,
  statusFilter,
  onStatusFilterChange,
  roleFilter,
  onRoleFilterChange,
  availableSourceLangs,
  availableTargetLangs,
  onResetFilters,
  totalResults,
  onOpenDetails,
  onQuickTranslate,
  onOpenEdit,
  isLeaderMatch,
  currentPage,
  totalPages,
  onPageChange
}) {
  const handleExportProjects = () => {
    if (!teamProjectsList || teamProjectsList.length === 0) {
      return
    }

    const headers = [
      'Team ID',
      'Team Name',
      'Comic Title',
      'Leader Name',
      'Source Language',
      'Target Language',
      'Status',
      'Recruiting Status',
      'Members Count',
      'Max Members Capacity',
      'Chapters Count',
      'Progress'
    ]

    const rows = teamProjectsList.map(p => [
      p.id || '',
      p.team || p.title || '',
      p.comicName || p.title || '',
      p.leaderName || '',
      p.sourceLang || 'Any',
      p.targetLang || 'Vietnamese',
      p.status || 'ACTIVE',
      p.isRecruiting ? 'Open for Recruiting' : 'Closed',
      p.membersCount || 1,
      (Number(p.maxMembers) || 5) + 1,
      p.chaptersCount || 0,
      p.progress ? `${p.progress}%` : '0%'
    ])

    exportToCsv('ComiVerse_Translation_Projects_Export', headers, rows)
  }

  const hasActiveFilters = Boolean(searchTerm || sourceLang || targetLang || statusFilter || roleFilter)

  return (
    <div className="fade-in">
      <div className="translator-page-header">
        <div className="translator-page-header-info">
          <h1>Translation Projects</h1>
          <p>All group translation project teams registered on the platform.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            className="trans-form-input"
            placeholder="Search comics, teams, leaders..."
            style={{ width: '280px' }}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button
            type="button"
            onClick={handleExportProjects}
            disabled={teamProjectsList.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              fontSize: '13px',
              cursor: teamProjectsList.length === 0 ? 'not-allowed' : 'pointer',
              opacity: teamProjectsList.length === 0 ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              transition: 'all 0.2s ease',
              height: '38px',
              whiteSpace: 'nowrap'
            }}
            title="Export projects list to Excel CSV"
          >
            📥 Export Projects
          </button>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="trans-filter-bar">
        {/* Source Language Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="trans-filter-label">Origin:</span>
          <select
            className={`trans-form-select ${sourceLang ? 'active' : ''}`}
            value={sourceLang}
            onChange={(e) => onSourceLangChange(e.target.value)}
          >
            <option value="">🌐 All Source Languages</option>
            {availableSourceLangs.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* Target Language Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="trans-filter-label">Target:</span>
          <select
            className={`trans-form-select ${targetLang ? 'active' : ''}`}
            value={targetLang}
            onChange={(e) => onTargetLangChange(e.target.value)}
          >
            <option value="">🎯 All Target Languages</option>
            {availableTargetLangs.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* Status / Recruiting Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="trans-filter-label">Status:</span>
          <select
            className={`trans-form-select ${statusFilter ? 'active' : ''}`}
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="">⚡ All Statuses</option>
            <option value="RECRUITING">🟢 Open for Recruiting</option>
            <option value="CLOSED">🔒 Full / Closed</option>
            <option value="ACTIVE">✅ Active Status</option>
            <option value="PAUSED">⏸️ Paused</option>
          </select>
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="trans-filter-label">Role:</span>
          <select
            className={`trans-form-select ${roleFilter ? 'active' : ''}`}
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
          >
            <option value="">👑 All Roles</option>
            <option value="LEADER">⭐ Led by Me</option>
            <option value="MEMBER">👥 Member Only</option>
          </select>
        </div>

        {/* Reset Filter button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              padding: '6px 14px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
          >
            ✕ Reset Filters
          </button>
        )}

        {/* Total Results Counter */}
        <div className="trans-filter-results">
          Found: <span style={{ color: '#c084fc', fontWeight: '700' }}>{totalResults}</span> teams
        </div>
      </div>

      <div className="trans-projects-list">
        {teamProjectsList.length === 0 ? (
          <div className="translator-empty-state">
            <h3>No translation projects found</h3>
            <p>Change your search or language filters and try again.</p>
          </div>
        ) : (
          teamProjectsList.map(proj => (
            <div className="trans-project-card" key={proj.id}>
              <div className="trans-project-cover">
                {getProjectCover(proj) ? (
                  <img
                    src={getProjectCover(proj)}
                    alt={proj.title || 'Comic Cover'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 'inherit', fontSize: '28px' }}>
                    📖
                  </div>
                )}
              </div>
              <div className="trans-project-info">
                <h3 className="trans-project-title">{proj.title}</h3>
                <p className="trans-project-meta">
                  🧑‍🤝‍🧑 Language: <strong>{proj.sourceLang || 'Any'} ➔ {proj.targetLang}</strong>
                </p>
                <p className="trans-project-meta" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#cbd5e1', fontSize: '12.5px' }}>
                    👥 Capacity: <strong>{proj.membersCount || 1} / {(Number(proj.maxMembers) || 5) + 1}</strong> members
                  </span>
                  <span style={{ 
                    padding: '2px 10px', 
                    borderRadius: '12px', 
                    fontSize: '11.5px', 
                    fontWeight: '600',
                    background: (proj.isRecruiting && (proj.membersCount || 1) < (Number(proj.maxMembers) || 5) + 1) ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: (proj.isRecruiting && (proj.membersCount || 1) < (Number(proj.maxMembers) || 5) + 1) ? '#34d399' : '#f87171',
                    border: (proj.isRecruiting && (proj.membersCount || 1) < (Number(proj.maxMembers) || 5) + 1) ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    {(proj.isRecruiting && (proj.membersCount || 1) < (Number(proj.maxMembers) || 5) + 1) ? '● Open for Recruiting' : '● Closed'}
                  </span>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <span className={`status-badge ${proj.status.toLowerCase()}`}>{proj.status}</span>
                  {isLeaderMatch(proj.leaderName) ? (
                    <span className="status-badge leader">⭐ Led by Me</span>
                  ) : (
                    <span className="status-badge">👤 Member</span>
                  )}
                </div>
              </div>
              <div className="trans-project-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <ModernButton variant={2} label="Workspace" onClick={() => onOpenDetails(proj)} />
                <button
                  className="dash-quick-action-btn"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                    padding: '8px 14px',
                    fontSize: '12.5px'
                  }}
                  title="Open Translation Editor Directly"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onQuickTranslate) onQuickTranslate(proj)
                  }}
                >
                  Translate
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <ModernPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}

function EditProjectModal({ editForm, setEditForm, onCancel, onSave }) {
  return (
    <div className="trans-modal-overlay">
      <div className="trans-modal-card">
        <div className="trans-modal-header">
          <h3>Edit Translation Project Info</h3>
          <button className="trans-modal-close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="trans-modal-body">
          <div className="trans-form-group">
            <label className="trans-form-label">Project Team Name</label>
            <input
              type="text"
              className="trans-form-input"
              value={editForm.team}
              onChange={(e) => setEditForm({ ...editForm, team: e.target.value })}
            />
          </div>

          <div className="trans-form-group">
            <label className="trans-form-label">Project Status</label>
            <select
              className="trans-form-input"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
            </select>
          </div>

          <div className="trans-form-group">
            <label className="trans-form-label">Description / Synopses</label>
            <textarea
              className="trans-form-input textarea"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
        </div>

        <div className="trans-modal-footer">
          <button className="trans-btn secondary" onClick={onCancel}>Cancel</button>
          <button className="trans-btn primary" onClick={onSave}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

function BanUserModal({ modalData, teamName, onClose, onConfirm }) {
  const [reason, setReason] = useState(modalData?.reason || 'Spam applications / Not a good fit')
  const [submitting, setSubmitting] = useState(false)

  if (!modalData) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason.trim()) return
    setSubmitting(true)
    try {
      await onConfirm(reason.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="trans-modal-overlay fade-in" style={{ zIndex: 10000 }}>
      <div
        className="trans-modal-card"
        style={{
          maxWidth: '520px',
          width: '92%',
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(239, 68, 68, 0.18)',
          background: 'linear-gradient(145deg, #161022 0%, #0d0818 100%)'
        }}
      >
        {/* Header */}
        <div
          className="trans-modal-header"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(22, 16, 34, 0.8) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px'
              }}
            >
              🚫
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.01em' }}>
                Ban Applicant from Team
              </h3>
              <span style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                Target User: <strong style={{ color: '#fca5a5' }}>{modalData.name}</strong>
              </span>
            </div>
          </div>
          <button className="trans-modal-close-btn" onClick={onClose} disabled={submitting} style={{ fontSize: '24px', color: '#94a3b8' }}>×</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="trans-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                padding: '14px 16px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '12px',
                fontSize: '13.5px',
                color: '#fca5a5',
                lineHeight: '1.5'
              }}
            >
              ⚠️ Are you sure you want to ban <strong>{modalData.name}</strong> from <strong>{teamName || 'this team'}</strong>? Banning will reject their application and block them from submitting future join requests.
            </div>

            <div className="trans-form-group" style={{ margin: 0 }}>
              <label
                className="trans-form-label"
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#cbd5e1',
                  marginBottom: '8px',
                  display: 'block'
                }}
              >
                Reason for Ban *
              </label>
              <textarea
                className="trans-form-input textarea"
                rows={3}
                placeholder="Enter specific reason for banning this applicant..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                style={{
                  width: '100%',
                  background: 'rgba(10, 6, 18, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  color: '#ffffff',
                  padding: '12px 16px',
                  fontSize: '14px',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Presets */}
            <div>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Quick Preset Reasons:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  'Spam applications / Not a good fit',
                  'Inappropriate CV or portfolio link',
                  'Violates team community standards',
                  'Repeated low-quality submissions'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      background: reason === preset ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      color: reason === preset ? '#fca5a5' : '#cbd5e1',
                      border: reason === preset ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="trans-modal-footer"
            style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(10, 6, 18, 0.6)',
              display: 'flex',
              justify: 'flex-end',
              gap: '12px'
            }}
          >
            <button
              type="button"
              className="trans-btn secondary"
              onClick={onClose}
              disabled={submitting}
              style={{ borderRadius: '10px', padding: '10px 18px', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="trans-btn primary"
              disabled={!reason.trim() || submitting}
              style={{
                borderRadius: '10px',
                padding: '10px 22px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                fontWeight: '700',
                border: 'none',
                boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                opacity: (!reason.trim() || submitting) ? 0.6 : 1,
                cursor: submitting ? 'wait' : 'pointer'
              }}
            >
              {submitting ? 'Banning User...' : '🚫 Confirm Ban'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UnbanUserModal({ modalData, teamName, onClose, onConfirm }) {
  const [submitting, setSubmitting] = useState(false)

  if (!modalData) return null

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await onConfirm()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="trans-modal-overlay fade-in" style={{ zIndex: 10000 }}>
      <div
        className="trans-modal-card"
        style={{
          maxWidth: '460px',
          width: '92%',
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(16, 185, 129, 0.18)',
          background: 'linear-gradient(145deg, #161022 0%, #0d0818 100%)'
        }}
      >
        {/* Header */}
        <div
          className="trans-modal-header"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(22, 16, 34, 0.8) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px'
              }}
            >
              🔓
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
                Unban User
              </h3>
              <span style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                Target User: <strong style={{ color: '#6ee7b7' }}>{modalData.name}</strong>
              </span>
            </div>
          </div>
          <button className="trans-modal-close-btn" onClick={onClose} disabled={submitting} style={{ fontSize: '24px', color: '#94a3b8' }}>×</button>
        </div>

        {/* Body */}
        <div className="trans-modal-body" style={{ padding: '24px' }}>
          <p style={{ margin: 0, fontSize: '14.5px', lineHeight: '1.6', color: '#cbd5e1' }}>
            Are you sure you want to unban <strong>{modalData.name}</strong> from <strong>{teamName || 'this team'}</strong>? They will be allowed to submit join requests to the team again.
          </p>
        </div>

        {/* Footer */}
        <div
          className="trans-modal-footer"
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(10, 6, 18, 0.6)',
            display: 'flex',
            justify: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            type="button"
            className="trans-btn secondary"
            onClick={onClose}
            disabled={submitting}
            style={{ borderRadius: '10px', padding: '10px 18px', background: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="trans-btn primary"
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              borderRadius: '10px',
              padding: '10px 22px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontWeight: '700',
              border: 'none',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
              cursor: submitting ? 'wait' : 'pointer'
            }}
          >
            {submitting ? 'Unbanning...' : '🔓 Confirm Unban'}
          </button>
        </div>
      </div>
    </div>
  )
}

function WorkspaceBreadcrumbs({ title, onBack }) {
  return (
    <div className="workspace-breadcrumbs">
      <button className="breadcrumb-back" onClick={onBack}>&lt; Projects</button>
      <span className="breadcrumb-divider">/</span>
      <span className="breadcrumb-current">{title}</span>
    </div>
  )
}

function WorkspaceTabs({ workspaceTab, setWorkspaceTab, membersCount, isCurrentLeader, joinRequestsCount, tasksCount }) {
  return (
    <>
      <style>{`.workspace-tabs::-webkit-scrollbar { display: none; }`}</style>
      <div
        className="workspace-tabs"
        style={{ overflowY: 'hidden', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button
          className={`workspace-tab-btn ${workspaceTab === 'home' ? 'active' : ''}`}
          onClick={() => setWorkspaceTab('home')}
        >
          Home
        </button>
        <button
          className={`workspace-tab-btn ${workspaceTab === 'members' ? 'active' : ''}`}
          onClick={() => setWorkspaceTab('members')}
        >
          Members <span className={`tab-badge ${workspaceTab === 'members' ? 'active-badge' : ''}`}>{membersCount}</span>
        </button>
        {isCurrentLeader && (
          <button
            className={`workspace-tab-btn ${workspaceTab === 'requests' ? 'active' : ''}`}
            onClick={() => setWorkspaceTab('requests')}
          >
            Requests {joinRequestsCount > 0 && <span className="tab-badge alert-badge">{joinRequestsCount}</span>}
          </button>
        )}
        <button
          className={`workspace-tab-btn ${workspaceTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setWorkspaceTab('tasks')}
        >
          Tasks <span className={`tab-badge ${workspaceTab === 'tasks' ? 'active-badge' : ''}`}>{tasksCount}</span>
        </button>
        {isCurrentLeader && (
          <button
            className={`workspace-tab-btn ${workspaceTab === 'settings' ? 'active' : ''}`}
            onClick={() => setWorkspaceTab('settings')}
          >
            Group Settings
          </button>
        )}
      </div>
    </>
  )
}

function WorkspaceDetailView({
  selectedDetails,
  setSelectedDetails,
  onBackToProjects,
  tasksLoading,
  workspaceTab,
  setWorkspaceTab,
  isCurrentLeader,
  members,
  memberSearch,
  setMemberSearch,
  onMembersLoaded,
  onLeaveTeam,
  onRemoveMember,
  bannedUsers,
  onUnbanUser,
  joinRequests,
  onApproveRequest,
  onRejectRequest,
  onBanUser,
  newPostText,
  setNewPostText,
  onPostAnnouncement,
  announcements,
  onLikePost,
  onTogglePinPost,
  onDeletePost,
  onEditPost,
  onAddComment,
  onLikeComment,
  onEditComment,
  onDeleteComment,
  comicName,
  tasks,
  activeTasks,
  pausedTasks,
  lockedColumns,
  setLockedColumns,
  highlightedColumns,
  setHighlightedColumns,
  sortedColumns,
  setSortedColumns,
  openDropdownCol,
  setOpenDropdownCol,
  onCreateTaskClick,
  onMoveAllToDone,
  onMoveTask,
  onOpenTaskDetails,
  getAssigneeInitials,
  showCreateTask,
  newTaskData,
  setNewTaskData,
  chapterOptions,
  teamMembersForAssign,
  onCancelCreateTask,
  onCreateTask,
  selectedTask,
  editTaskData,
  setEditTaskData,
  onCancelEditTask,
  onSaveEditTask,
  onContinueToWorkspace,
  onSaveWorkspaceSettings,
  onContinueToReviewWorkspace
}) {
  return (
    <div className="project-detail-workspace fade-in">
      <WorkspaceBreadcrumbs title={selectedDetails.title} onBack={onBackToProjects} />

      <WorkspaceTabs
        workspaceTab={workspaceTab}
        setWorkspaceTab={setWorkspaceTab}
        membersCount={members.length}
        isCurrentLeader={isCurrentLeader}
        joinRequestsCount={joinRequests.length}
        tasksCount={tasks.length}
      />

      {workspaceTab === 'home' && (
        <HomeTab
          selectedDetails={selectedDetails}
          isCurrentLeader={isCurrentLeader}
          newPostText={newPostText}
          setNewPostText={setNewPostText}
          onPostAnnouncement={onPostAnnouncement}
          announcements={announcements}
          onLikePost={onLikePost}
          onTogglePinPost={onTogglePinPost}
          onDeletePost={onDeletePost}
          onEditPost={onEditPost}
          onAddComment={onAddComment}
          onLikeComment={onLikeComment}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
        />
      )}

      {workspaceTab === 'members' && (
        <MembersTab
          teamId={selectedDetails.id}
          leaderName={selectedDetails.leaderName}
          isCurrentLeader={isCurrentLeader}
          members={members}
          tasks={tasks}
          memberSearch={memberSearch}
          setMemberSearch={setMemberSearch}
          onMembersLoaded={onMembersLoaded}
          onLeaveTeam={onLeaveTeam}
          onRemoveMember={onRemoveMember}
          bannedUsers={bannedUsers}
          onUnbanUser={onUnbanUser}
        />
      )}

      {workspaceTab === 'requests' && (
        <RequestsTab joinRequests={joinRequests} onApprove={onApproveRequest} onReject={onRejectRequest} onBan={onBanUser} />
      )}

      {workspaceTab === 'tasks' && (
        <>
          {tasksLoading ? (
            <div className="fade-in" style={{ padding: '40px 0', textAlign: 'center' }}>
              <div className="skeleton-dash-shimmer" style={{ width: '100%', height: '48px', borderRadius: '12px', marginBottom: '24px' }}></div>
              <div className="skeleton-dash-shimmer" style={{ width: '100%', height: '320px', borderRadius: '16px' }}></div>
            </div>
          ) : (
            <TasksTab
              comicName={comicName}
              comicId={selectedDetails?.comicId}
              tasks={tasks}
              activeTasks={activeTasks}
              pausedTasks={pausedTasks}
              lockedColumns={lockedColumns}
              setLockedColumns={setLockedColumns}
              highlightedColumns={highlightedColumns}
              setHighlightedColumns={setHighlightedColumns}
              sortedColumns={sortedColumns}
              setSortedColumns={setSortedColumns}
              openDropdownCol={openDropdownCol}
              setOpenDropdownCol={setOpenDropdownCol}
              onCreateTaskClick={onCreateTaskClick}
              onMoveAllToDone={onMoveAllToDone}
              onMoveTask={onMoveTask}
              onOpenTaskDetails={onOpenTaskDetails}
              getAssigneeInitials={getAssigneeInitials}
              members={members}
              isCurrentLeader={isCurrentLeader}
              chapterOptions={chapterOptions}
              onOpenCreateTaskWithChapter={onCreateTaskClick}
              onCreateTask={onCreateTask}
            />
          )}

          {showCreateTask && (
            <CreateTaskModal
              comicName={comicName}
              newTaskData={newTaskData}
              setNewTaskData={setNewTaskData}
              chapterOptions={chapterOptions}
              teamMembersForAssign={teamMembersForAssign}
              tasks={tasks}
              onCancel={onCancelCreateTask}
              onCreate={onCreateTask}
            />
          )}

          {selectedTask && (
            <EditTaskModal
              editTaskData={editTaskData}
              setEditTaskData={setEditTaskData}
              teamMembersForAssign={teamMembersForAssign}
              isProjectLeader={isCurrentLeader}
              onCancel={onCancelEditTask}
              onSave={onSaveEditTask}
              onContinue={onContinueToWorkspace}
              onReview={onContinueToReviewWorkspace}
            />
          )}
        </>
      )}

      {workspaceTab === 'settings' && (
        <SettingsTab
          selectedDetails={selectedDetails}
          setSelectedDetails={setSelectedDetails}
          members={members}
          onSaveWorkspaceSettings={onSaveWorkspaceSettings}
        />
      )}
    </div>
  )
}

function TeamProjects() {
  const navigate = useNavigate()
  const location = useLocation()

  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceLang, setSourceLang] = useState('')
  const [targetLang, setTargetLang] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const ITEMS_PER_PAGE = 4

  const auth = getAuth()
  const currentUserName = (auth?.user?.fullName || '').toLowerCase().trim()
  const currentUsername = (auth?.user?.username || '').toLowerCase().trim()
  const currentUserId = auth?.user?.id || auth?.user?.userId
  const user = auth?.user || {}

  const [allMatchedTeams, setAllMatchedTeams] = useState([])

  // Instant 0ms Load on Mount from Session Cache
  useEffect(() => {
    let hasCache = false
    try {
      const cached = sessionStorage.getItem('comiverse_projects_cache') || sessionStorage.getItem('comiverse_dash_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        const list = Array.isArray(parsed) ? parsed : (parsed.projects || [])
        if (Array.isArray(list) && list.length > 0) {
          setAllMatchedTeams(list)
          setLoadingProjects(false)
          hasCache = true
        }
      }
    } catch (e) {}

    fetchProjects(hasCache)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dynamic Available Language Options
  const availableSourceLangs = useMemo(() => {
    const langs = new Set(['Korean', 'Japanese', 'Chinese', 'English', 'Vietnamese'])
    allMatchedTeams.forEach(t => {
      if (t.sourceLang && t.sourceLang !== '-' && t.sourceLang !== 'Any') {
        langs.add(t.sourceLang.trim())
      }
    })
    return Array.from(langs).sort()
  }, [allMatchedTeams])

  const availableTargetLangs = useMemo(() => {
    const langs = new Set(['Vietnamese', 'English', 'Japanese', 'Chinese', 'Korean'])
    allMatchedTeams.forEach(t => {
      if (t.targetLang && t.targetLang !== '-' && t.targetLang !== 'Any') {
        langs.add(t.targetLang.trim())
      }
    })
    return Array.from(langs).sort()
  }, [allMatchedTeams])

  // Instant In-Memory Multi-Field Filtering
  const filteredProjects = useMemo(() => {
    const cleanSearch = (searchTerm || '').toLowerCase().trim()

    return allMatchedTeams.filter(p => {
      // 1. Search Query
      if (cleanSearch) {
        const titleMatch = (p.title || '').toLowerCase().includes(cleanSearch)
        const teamMatch = (p.team || '').toLowerCase().includes(cleanSearch)
        const leaderMatch = (p.leaderName || '').toLowerCase().includes(cleanSearch)
        const comicNameMatch = (p.comicName || '').toLowerCase().includes(cleanSearch)
        if (!titleMatch && !teamMatch && !leaderMatch && !comicNameMatch) return false
      }

      // 2. Source Language Filter
      if (sourceLang) {
        const sLang = (p.sourceLang || '').toLowerCase().trim()
        if (sLang !== sourceLang.toLowerCase().trim()) return false
      }

      // 3. Target Language Filter
      if (targetLang) {
        const tLang = (p.targetLang || '').toLowerCase().trim()
        if (tLang !== targetLang.toLowerCase().trim()) return false
      }

      // 4. Status Filter
      if (statusFilter) {
        if (statusFilter === 'RECRUITING' && !p.isRecruiting) return false
        if (statusFilter === 'CLOSED' && p.isRecruiting) return false
        if (statusFilter === 'ACTIVE' && (p.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') return false
        if (statusFilter === 'PAUSED' && (p.status || '').toUpperCase() !== 'PAUSED') return false
      }

      // 5. Role Filter
      if (roleFilter) {
        const leaderName = (p.leaderName || '').toLowerCase().trim()
        const leaderId = p.leaderId || p.createdById
        const isLeader = (currentUserName && leaderName === currentUserName) ||
                         (currentUsername && leaderName === currentUsername) ||
                         (currentUserId && leaderId === currentUserId)

        if (roleFilter === 'LEADER' && !isLeader) return false
        if (roleFilter === 'MEMBER' && isLeader) return false
      }

      return true
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatchedTeams, searchTerm, sourceLang, targetLang, statusFilter, roleFilter, currentUserName, currentUsername, currentUserId])

  // Sync Paging State instantly
  useEffect(() => {
    const totalPagesCalc = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE))
    setTotalPages(totalPagesCalc)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    setProjects(filteredProjects.slice(startIndex, startIndex + ITEMS_PER_PAGE))
  }, [filteredProjects, currentPage])

  const handleResetFilters = () => {
    setSearchTerm('')
    setSourceLang('')
    setTargetLang('')
    setStatusFilter('')
    setRoleFilter('')
    setCurrentPage(1)
  }

  const handleSearchChange = (val) => {
    setSearchTerm(val)
    setCurrentPage(1)
  }

  const handleSourceLangChange = (val) => {
    setSourceLang(val)
    setCurrentPage(1)
  }

  const handleTargetLangChange = (val) => {
    setTargetLang(val)
    setCurrentPage(1)
  }

  const handleStatusFilterChange = (val) => {
    setStatusFilter(val)
    setCurrentPage(1)
  }

  const handleRoleFilterChange = (val) => {
    setRoleFilter(val)
    setCurrentPage(1)
  }

  const fetchProjects = async (silent = false) => {
    try {
      if (!silent && projects.length === 0) setLoadingProjects(true)

      // Check session cache for instant load
      let cachedComics = []
      let cachedSubs = []
      try {
        const c1 = sessionStorage.getItem('comiverse_comics_cache')
        if (c1) cachedComics = JSON.parse(c1)
        const c2 = sessionStorage.getItem('comiverse_subs_cache')
        if (c2) cachedSubs = JSON.parse(c2)
      } catch (e) {}

      const fetchComicsPromise = cachedComics.length > 0 ? Promise.resolve(cachedComics) : getAllComicsApi().catch(() => [])
      const fetchSubsPromise = cachedSubs.length > 0 ? Promise.resolve(cachedSubs) : getAllSubmissionsApi().catch(() => [])

      const [allTeamsRes, myTeamsRes, allComicsRes, submissionsRes] = await Promise.all([
        getAllProjectTeamsApi().catch(() => []),
        getMyProjectTeamsApi().catch(() => []),
        fetchComicsPromise,
        fetchSubsPromise
      ])

      const dbComics = Array.isArray(allComicsRes) ? allComicsRes : (allComicsRes?.data?.data || allComicsRes?.data || cachedComics);
      const dbSubs = Array.isArray(submissionsRes) ? submissionsRes : (submissionsRes?.data?.data || submissionsRes?.data || cachedSubs);

      try {
        if (Array.isArray(dbComics) && dbComics.length > 0) sessionStorage.setItem('comiverse_comics_cache', JSON.stringify(dbComics))
        if (Array.isArray(dbSubs) && dbSubs.length > 0) sessionStorage.setItem('comiverse_subs_cache', JSON.stringify(dbSubs))
      } catch (e) {}

      let allTeams = [];
      if (Array.isArray(allTeamsRes)) {
        allTeams = allTeamsRes;
      } else if (allTeamsRes?.data?.data || allTeamsRes?.data || allTeamsRes?.content) {
        allTeams = allTeamsRes.data?.data || allTeamsRes.data || allTeamsRes.content || [];
      } else if (Array.isArray(myTeamsRes)) {
        allTeams = myTeamsRes;
      } else if (myTeamsRes?.data?.data || myTeamsRes?.data || myTeamsRes?.content) {
        allTeams = myTeamsRes.data?.data || myTeamsRes.data || myTeamsRes.content || [];
      }

      const currentUserName = (user.fullName || '').toLowerCase().trim();
      const currentUsername = (user.username || '').toLowerCase().trim();
      const currentUserId = user.id || user.userId;

      const filtered = allTeams.filter(p => {
        const leaderName = (p.leaderName || '').toLowerCase().trim();
        const leaderId = p.leaderId || p.createdById;
        const isLeader = (currentUserName && leaderName === currentUserName) ||
                         (currentUsername && leaderName === currentUsername) ||
                         (currentUserId && leaderId === currentUserId);

        const localApprovedKey = `comiverse_approved_members_${p.id}`;
        let savedMems = [];
        try {
          savedMems = JSON.parse(localStorage.getItem(localApprovedKey) || '[]');
        } catch (e) {}

        const isApprovedMember = savedMems.some(m => {
          const mn = (m.name || m.username || '').toLowerCase().trim();
          return (currentUserName && mn === currentUserName) || (currentUsername && mn === currentUsername);
        }) || (Array.isArray(p.members) && p.members.some(m => m.userId === currentUserId || (m.name || '').toLowerCase().trim() === currentUserName));

        return isLeader || isApprovedMember;
      });

      const allMapped = filtered.map(p => {
        const realCount = Math.max(1, p.membersCount || 0);
        const maxCap = (Number(p.maxMembers) || 5) + 1;

        const localStatusKey = `comiverse_is_recruiting_${p.id}`;
        const manualStatus = localStorage.getItem(localStatusKey);

        let isRecruiting = true;
        if (manualStatus !== null) {
          isRecruiting = manualStatus === 'true';
        } else if (typeof p.isRecruiting === 'boolean') {
          isRecruiting = p.isRecruiting;
        }

        if (realCount >= maxCap) {
          isRecruiting = false;
        }

        return {
          ...p,
          team: p.title || p.name || 'Unnamed Team',
          title: p.comicName || p.title || 'Untitled Comic',
          cover: getProjectCover(p, dbComics, dbSubs),
          membersCount: realCount,
          isRecruiting: isRecruiting
        };
      });

      setAllMatchedTeams(allMapped);

      // Cache to sessionStorage for instantaneous future tab switches
      try {
        sessionStorage.setItem('comiverse_projects_cache', JSON.stringify(allMapped))
      } catch (e) {}
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingProjects(false)
    }
  }

  const [selectedDetails, setSelectedDetails] = useState(null)
  const [selectedEdit, setSelectedEdit] = useState(null)
  const [editForm, setEditForm] = useState({ description: '', status: 'Active', team: '' })

  const [workspaceTab, setWorkspaceTab] = useState('home')
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)

  const [announcements, setAnnouncements] = useState([])
  const [newPostText, setNewPostText] = useState('')
  const [joinRequests, setJoinRequests] = useState([])
  const [tasks, setTasks] = useState([])
  const [lockedColumns, setLockedColumns] = useState([])
  const [highlightedColumns, setHighlightedColumns] = useState([])
  const [sortedColumns, setSortedColumns] = useState([])
  const [openDropdownCol, setOpenDropdownCol] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [editTaskData, setEditTaskData] = useState({
    title: '', status: 'backlog', priority: 'Medium', assigneeId: null, originalAssigneeId: null, dueDate: '', chapterRewardUsd: '', handoverCompletedPages: '', handoverFactor: '1.00', handoverReason: '', totalPages: 0
  })

  const [members, setMembers] = useState([])
  const [teamMembersForAssign, setTeamMembersForAssign] = useState([])
  const [bannedUsers, setBannedUsers] = useState([])
  const [chapterOptions, setChapterOptions] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [newTaskData, setNewTaskData] = useState({
    title: '', column: 'backlog', assigneeId: null, dueDate: '', priority: 'Medium', chapterId: null, chapterRewardUsd: '', taskType: 'REGULAR'
  })

  const getAssigneeInitials = (memberId) => {
    const member = teamMembersForAssign.find(m => m.id === memberId)
    return member?.avatar || '?'
  }

  const openCreateTaskModal = (chap = null, customTaskType = 'REGULAR') => {
    const chId = (chap && typeof chap === 'object') ? (chap.id || chap.chapterId || null) : null;
    const isRevision = !!(chap && typeof chap === 'object' && chap.revision);
    const defaultTitle = (chap && typeof chap === 'object' && chap.title)
      ? `${chap.title} - ${isRevision ? 'Revision' : 'Translation & Proofreading'}`
      : '';
    setNewTaskData({
      title: defaultTitle,
      column: 'backlog',
      assigneeId: null,
      dueDate: '',
      priority: 'Medium',
      chapterId: chId,
      chapterRewardUsd: '',
      taskType: isRevision ? 'REVISION' : customTaskType
    })
    setShowCreateTask(true)
  }


  useEffect(() => {
    if (selectedDetails) {
      const updated = projects.find(p => p.id === selectedDetails.id)
      if (updated) setSelectedDetails(updated)
    } else if (projects && projects.length > 0) {
      const stateTeamId = location.state?.teamId
      const stateTeamName = location.state?.teamName
      let matching = null;
      if (stateTeamId) {
        matching = projects.find(p => String(p.id) === String(stateTeamId))
      } else if (stateTeamName) {
        const matchName = stateTeamName.toLowerCase().trim();
        matching = projects.find(p => {
          const pTitle = p.title ? p.title.toLowerCase().trim() : '';
          const pComicName = p.comicName ? p.comicName.toLowerCase().trim() : '';
          return pTitle === matchName || pComicName === matchName;
        })
      }
      if (!matching) {
        const targetId = localStorage.getItem('comiverse_active_project_id')
        if (targetId) {
          matching = projects.find(p => String(p.id) === String(targetId))
        }
      }
      
      if (matching) {
        handleOpenDetails(matching, location.state?.tab || 'home')
      }
    }
  }, [projects, location.state])

  useEffect(() => {
    const handleGlobalClick = () => setOpenDropdownCol(null)
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  const handleOpenDetails = async (project, initialTab = 'home') => {
    if (!project || !project.id) return;
    localStorage.setItem('comiverse_active_project_id', String(project.id));
    setSelectedDetails(project)
    setWorkspaceTab(initialTab)
    setTasks([])
    setTasksLoading(true)

    setMembers([]);
    setAnnouncements([]);
    setJoinRequests([]);
    setLoadingWorkspace(true);

    const leaderJoinDate = project.createdAt 
      ? new Date(project.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      : '01/15/2024';

    const initialLeader = {
      id: `leader-${project.id}`,
      name: project.leaderName || userFullName,
      role: 'Group Leader',
      status: 'Offline',
      online: false,
      joinDate: leaderJoinDate,
      contributions: 0,
      revoked: 0,
      avatar: project.leaderInitials || 'TL'
    };

    // Load saved approved members from LocalStorage
    const localApprovedKey = `comiverse_approved_members_${project.id}`;
    let savedApprovedMems = [];
    try {
      const saved = localStorage.getItem(localApprovedKey);
      if (saved) savedApprovedMems = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    try {
      const [annList, taskList, reqList, teamMembersList, bannedUsersList, teamChaptersList] = await Promise.all([
        getTeamAnnouncementsApi(project.id),
        getTeamTasksApi(project.id),
        getTeamRequestsApi(project.id),
        getTeamMembersApi(project.id).catch((err) => {
          console.error('Could not load real team members for assignee picker:', err)
          return []
        }),
        getBannedUsersApi(project.id).catch(() => []),
        getTeamChaptersApi(project.id).catch((err) => {
          console.warn('Could not load team chapter flags:', err)
          return []
        })
      ])

      const rawComicTitle = project.comicName || project.title || 'Comic';
      let finalChapters = [];

      let effectiveComicId = project.comicId || project.comic_id || project.comic?.id;
      if (!effectiveComicId && project.comicName) {
        try {
          const pageRes = await getComicsPageApi(1, 10, project.comicName);
          const list = pageRes?.content || pageRes?.data?.content || pageRes?.data || (Array.isArray(pageRes) ? pageRes : []);
          const matchC = list.find(c => c.title && c.title.toLowerCase().trim() === project.comicName.toLowerCase().trim()) || list[0];
          if (matchC) effectiveComicId = matchC.id || matchC.comicId;
        } catch (e) {
          console.warn('Could not find comic by name', e);
        }
      }
      if (effectiveComicId) {
        // Fallback: fetch chapters directly from the comic's chapter list (using both public and author APIs like Moderator)
        try {
          let chapList = [];
          try {
            const comicChapters = await getChaptersByComicIdApi(effectiveComicId, {}, true);
            const list = Array.isArray(comicChapters) ? comicChapters : (comicChapters?.content || comicChapters?.data || []);
            if (list.length > 0) chapList = list;
          } catch (e) { /* ignore */ }

          if (chapList.length === 0) {
            try {
              const authorChapters = await getAuthorComicChaptersApi(effectiveComicId);
              const list = Array.isArray(authorChapters) ? authorChapters : (authorChapters?.content || authorChapters?.data || []);
              if (list.length > 0) chapList = list;
            } catch (e) { /* ignore */ }
          }

          if (chapList.length > 0) {
            // Filter to only approved chapters
            const approvedChapters = chapList.filter(ch => {
              const status = (ch.status || ch.moderationStatus || '').toUpperCase();
              return !status || status === 'APPROVED' || status === 'PUBLISHED' || status === 'READY';
            });
            
            finalChapters = approvedChapters.map((ch, idx) => {
              const realChId = ch.id || ch.chapterId || ch.chapter_id;
              return {
                ...ch,
                id: realChId || `ch-${project.id}-${idx + 1}`,
                comicId: ch.comicId || effectiveComicId,
                title: ch.title || `${rawComicTitle} - Chapter ${idx + 1}`,
                pagesCount: ch.pagesCount || ch.pages?.length || ch.images?.length || ch.pageCount || 24,
                pages: ch.pages || ch.images || [],
                status: 'Approved Raw Manuscript'
              };
            });
          }
        } catch (chErr) {
          console.error('Could not load chapters from comic:', chErr);
        }
      }

      // Attempt to load mock images from moderator's local override
      try {
        const overrideRaw = localStorage.getItem('comiverse_moderator_submissions_override');
        if (overrideRaw) {
          const parsed = JSON.parse(overrideRaw);
          const targetName = (project.comicName || project.title || '').toLowerCase().trim();
          const matchSub = parsed.find(s => (s.title && s.title.toLowerCase().trim() === targetName) || (s.comicName && s.comicName.toLowerCase().trim() === targetName));
          if (matchSub) {
            const chaps = matchSub.allChapters || matchSub.chapters || [];
            if (chaps.length > 0) {
              const enrichedChapters = chaps.map((ch, idx) => {
                const realChId = ch.id || ch.chapterId || ch.chapter_id;
                return {
                  ...ch,
                  id: realChId || `ch-${project.id}-${idx + 1}`,
                  comicId: ch.comicId || effectiveComicId,
                  title: ch.title || `${rawComicTitle} - Chapter ${idx + 1}`,
                  pagesCount: ch.pagesCount || ch.pages?.length || ch.images?.length || ch.pageCount || 24,
                  pages: ch.pages || ch.images || [],
                  status: 'Approved Raw Manuscript'
                };
              });
              
              if (finalChapters.length > 0) {
                finalChapters = finalChapters.map((fc, i) => {
                  const match = enrichedChapters.find(ec => ec.title === fc.title || ec.id === fc.id) || enrichedChapters[i];
                  return match && (match.pages?.length > 0) ? { ...fc, pages: match.pages, pagesCount: match.pagesCount } : fc;
                });
              } else {
                finalChapters = enrichedChapters;
              }
            }
          }
        }
      } catch (e) { /* ignore */ }

      // Default: Every approved comic submitted by author has at least Chapter 1 (Approved Raw Manuscript)
      if (finalChapters.length === 0) {
        finalChapters = [
          {
            id: `ch-${project.id}-1`,
            comicId: project.comicId,
            title: `${rawComicTitle} - Chapter 1`,
            pagesCount: 24,
            pages: [],
            status: 'Approved Raw Manuscript'
          }
        ];
      }

      const teamChapList = Array.isArray(teamChaptersList)
        ? teamChaptersList
        : (Array.isArray(teamChaptersList?.data) ? teamChaptersList.data : []);
      if (teamChapList.length > 0) {
        const flagsById = new Map();
        for (const tc of teamChapList) {
          const id = String(tc.chapterId || tc.id || '');
          if (id) flagsById.set(id, tc);
        }
        finalChapters = finalChapters.map((ch) => {
          const extra = flagsById.get(String(ch.id));
          if (!extra) return ch;
          return {
            ...ch,
            revision: extra.revision === true,
            canCreateTask: extra.canCreateTask,
            previousTaskId: extra.previousTaskId || extra.previous_task_id || null,
            resolutionNote: extra.resolutionNote || extra.resolution_note || null
          };
        });
        for (const tc of teamChapList) {
          const id = String(tc.chapterId || tc.id || '');
          if (!id || finalChapters.some((ch) => String(ch.id) === id)) continue;
          if (tc.canCreateTask === false && tc.revision !== true) continue;
          finalChapters.push({
            id: tc.chapterId || tc.id,
            comicId: tc.comicId,
            title: tc.title,
            pagesCount: tc.pagesCount || tc.pages || 0,
            pages: [],
            status: 'Approved Raw Manuscript',
            revision: tc.revision === true,
            canCreateTask: tc.canCreateTask,
            previousTaskId: tc.previousTaskId || tc.previous_task_id || null,
            resolutionNote: tc.resolutionNote || tc.resolution_note || null
          });
        }
      }

      setChapterOptions(finalChapters);

      // Load saved pinned post IDs from LocalStorage
      const localPinnedKey = `comiverse_pinned_posts_${project.id}`;
      let savedPinnedIds = [];
      try {
        const savedPin = localStorage.getItem(localPinnedKey);
        if (savedPin) savedPinnedIds = JSON.parse(savedPin);
      } catch (e) {}

      const now = Date.now();
      const mappedAnnouncements = await Promise.all((annList || []).map(async (p, idx) => {
        let ts = 0;
        const rawTime = p.createdAt || p.time || p.timestamp;
        if (rawTime && rawTime !== 'Just now') {
          const d = new Date(rawTime);
          if (!isNaN(d.getTime())) ts = d.getTime();
        }
        // If timestamp is missing or 'Just now', assign realistic descending timestamps (1h, 2h, 3h ago...)
        if (!ts) {
          ts = now - (idx + 1) * 3600000;
        }

        const cmtKey = `comiverse_announcement_comments_${project.id}_${p.id}`;
        let savedComments = [];
        try {
          const savedCmt = localStorage.getItem(cmtKey);
          if (savedCmt) savedComments = JSON.parse(savedCmt);
        } catch (e) {}

        let backendComments = [];
        try {
          if (p.id && typeof p.id === 'string' && !p.id.startsWith('temp-')) {
            const cRes = await getTeamPostCommentsApi(p.id);
            backendComments = Array.isArray(cRes) ? cRes : (cRes?.data || []);
          }
        } catch (e) {}

        const combinedCommentsMap = new Map();
        (p.comments || []).forEach(c => { if (c && c.id) combinedCommentsMap.set(c.id, c); });
        backendComments.forEach(c => { if (c && c.id) combinedCommentsMap.set(c.id, c); });
        savedComments.forEach(c => { if (c && c.id) combinedCommentsMap.set(c.id, c); });

        const finalComments = Array.from(combinedCommentsMap.values()).map(c => ({
          ...c,
          isEdited: Boolean(c.isEdited || c.edited)
        }));

        return {
          ...p,
          timestamp: ts,
          createdAt: p.createdAt || new Date(ts).toISOString(),
          isPinned: Boolean(p.isPinned || savedPinnedIds.includes(p.id)),
          isEdited: Boolean(p.isEdited || p.edited),
          attachedImage: p.imageUrl || p.attachedImage || null,
          comments: finalComments
        };
      }));
      setAnnouncements(mappedAnnouncements)
      
      // Tasks always come straight from the API — no localStorage merge.
      // Merging in a locally-cached copy caused tasks that failed to save to the
      // backend (or were left over from earlier tests) to keep reappearing in the
      // UI even after they were deleted/changed directly in the database.
      const finalCombinedTasks = Array.isArray(taskList) ? taskList : [];
      setTasks(finalCombinedTasks);
      setTasksLoading(false);

      const mappedRequests = (Array.isArray(reqList) ? reqList : [])
        .filter(r => r && (!r.status || r.status.toUpperCase() === 'PENDING'))
        .map(r => ({ ...r, roles: typeof r.roles === 'string' ? r.roles.split(',') : r.roles }));
      setJoinRequests(mappedRequests)

      const backendMems = Array.isArray(teamMembersList) ? teamMembersList : [];
      const combinedMap = new Map();

      // 1. Add Leader
      combinedMap.set((initialLeader.name || '').toLowerCase().trim(), initialLeader);

      // 2. Add backend members
      backendMems.forEach(m => {
        if (m && m.name) {
          const mappedMember = { ...m };
          if (mappedMember.joinDate) {
            mappedMember.joinDate = new Date(mappedMember.joinDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
          } else {
            mappedMember.joinDate = 'Recent';
          }
          const key = mappedMember.name.toLowerCase().trim();
          const existing = combinedMap.get(key);
          combinedMap.set(key, existing ? { ...existing, ...mappedMember } : mappedMember);
        }
      });

      const finalMembersList = Array.from(combinedMap.values());
      setMembers(finalMembersList);
      setTeamMembersForAssign(finalMembersList);
      
      const parsedBans = Array.isArray(bannedUsersList) ? bannedUsersList : (bannedUsersList?.data || []);
      setBannedUsers(parsedBans);

      const realCount = finalMembersList.length;
      const maxCap = (Number(project.maxMembers) || 5) + 1;

      // Recruitment status: Default to OPEN unless full or manually closed by leader
      const localStatusKey = `comiverse_is_recruiting_${project.id}`;
      const manualStatus = localStorage.getItem(localStatusKey);

      let isRecruiting = true;
      if (manualStatus !== null) {
        isRecruiting = manualStatus === 'true';
      } else if (typeof project.isRecruiting === 'boolean') {
        isRecruiting = project.isRecruiting;
      }

      // Automatically close ONLY if team capacity is FULL
      if (realCount >= maxCap) {
        isRecruiting = false;
      }

      const updatedDetails = {
        ...project,
        membersCount: realCount,
        isRecruiting: isRecruiting
      };

      setSelectedDetails(updatedDetails);
      setProjects(prev => prev.map(p => p.id === project.id ? updatedDetails : p));

      } catch (err) {
      console.error(err)
    } finally {
      setLoadingWorkspace(false)
      setTasksLoading(false)
    }
  }

  useEffect(() => {
    if (loadingProjects) return
    const targetTeamId = location.state?.teamId
    const targetTeamName = location.state?.teamName
    const hasRoutingState = targetTeamId || targetTeamName || location.state?.openCreateTask || location.state?.tab

    if (!hasRoutingState) return

    const targetProject = projects.find(p => {
      if (p.id === targetTeamId) return true;
      if (!targetTeamName) return false;
      const matchName = targetTeamName.toLowerCase().trim();
      const pTitle = p.title ? p.title.toLowerCase().trim() : '';
      const pComicName = p.comicName ? p.comicName.toLowerCase().trim() : '';
      return pTitle === matchName || pComicName === matchName;
    });
    if (targetProject) {
      handleOpenDetails(targetProject).then(() => {
        const targetTab = location.state?.tab || 'home';
        setWorkspaceTab(targetTab);
        if (location.state?.openCreateTask) {
          setNewTaskData({
            title: location.state?.defaultTitle || '',
            column: 'backlog',
            assigneeId: null,
            dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
            priority: 'High',
            chapterId: location.state?.chapterId || null,
            chapterRewardUsd: '',
            taskType: location.state?.taskType || 'REGULAR'
          });
          setShowCreateTask(true);
        }
      })
    }

    navigate(location.pathname, { replace: true, state: {} })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProjects, projects, location.state])


  const handleOpenEdit = (project, e) => {
    e.stopPropagation()
    setSelectedEdit(project)
    setEditForm({
      description: project.description || '',
      status: project.status || 'Active',
      team: project.title || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!selectedEdit) return
    try {
      const updated = await updateProjectTeamApi(selectedEdit.id, {
        id: selectedEdit.id,
        title: editForm.team,
        comicName: selectedEdit.title,
        status: editForm.status,
        description: editForm.description,
        deadline: selectedEdit.deadline,
        sourceLang: selectedEdit.sourceLang,
        targetLang: selectedEdit.targetLang,
        priority: selectedEdit.priority,
        cover: selectedEdit.cover,
        isRecruiting: selectedEdit.isRecruiting,
        maxMembers: selectedEdit.maxMembers,
        leaderName: selectedEdit.leaderName,
        leaderInitials: selectedEdit.leaderInitials,
        membersCount: selectedEdit.membersCount,
        chaptersCount: selectedEdit.chaptersCount,
        progress: selectedEdit.progress,
        assignedToMe: selectedEdit.assignedToMe
      })
      const mappedUpdated = { ...updated, team: updated.title, title: updated.comicName }
      setProjects(prev => prev.map(proj => (proj.id === selectedEdit.id ? mappedUpdated : proj)))
      toast.success('Project details updated successfully!')
      setSelectedEdit(null)
      if (selectedDetails && selectedDetails.id === selectedEdit.id) {
        setSelectedDetails(mappedUpdated)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to save project updates.')
    }
  }

  const handleSaveWorkspaceSettings = async () => {
    if (!selectedDetails) return

    // Calculate current capacity
    const currentMembersCount = members.length || selectedDetails.membersCount || 1;
    const totalCapacity = (Number(selectedDetails.maxMembers) || 5) + 1;
    const isFull = currentMembersCount >= totalCapacity;
    
    // Force isRecruiting to false if team is at full capacity
    const finalIsRecruiting = isFull ? false : selectedDetails.isRecruiting;

    // Save manual recruitment status choice to LocalStorage
    localStorage.setItem(`comiverse_is_recruiting_${selectedDetails.id}`, String(finalIsRecruiting))

    try {
      const updated = await updateProjectTeamApi(selectedDetails.id, {
        id: selectedDetails.id,
        title: selectedDetails.team,
        comicName: selectedDetails.title,
        status: selectedDetails.status,
        description: selectedDetails.description,
        deadline: selectedDetails.deadline,
        sourceLang: selectedDetails.sourceLang,
        targetLang: selectedDetails.targetLang,
        priority: selectedDetails.priority,
        cover: selectedDetails.cover,
        isRecruiting: finalIsRecruiting,
        maxMembers: Number(selectedDetails.maxMembers) || 5,
        leaderName: selectedDetails.leaderName,
        leaderInitials: selectedDetails.leaderInitials,
        membersCount: selectedDetails.membersCount,
        chaptersCount: selectedDetails.chaptersCount,
        progress: selectedDetails.progress,
        assignedToMe: selectedDetails.assignedToMe,
        notes: selectedDetails.description || selectedDetails.notes || ''
      })
      const mappedUpdated = { ...selectedDetails, ...updated, team: updated.title || selectedDetails.team, title: updated.comicName || selectedDetails.title, isRecruiting: finalIsRecruiting }
      setProjects(prev => {
        const newList = prev.map(proj => (proj.id === selectedDetails.id ? mappedUpdated : proj));
        return newList;
      })
      setSelectedDetails(mappedUpdated)
      toast.success('Workspace details saved successfully!')
    } catch (err) {
      console.warn('Backend update workspace settings fallback:', err)
      setProjects(prev => prev.map(proj => (proj.id === selectedDetails.id ? selectedDetails : proj)))
      toast.success('Workspace details saved locally!')
    }
  }

  const handleTogglePinPost = async (postId) => {
    try {
      if (typeof postId === 'string' && !postId.startsWith('temp-')) {
        await pinTeamAnnouncementApi(postId)
      }
      let wasPinned = false
      setAnnouncements(prev => {
        const updated = prev.map(p => {
          if (p.id === postId) {
            wasPinned = !p.isPinned
            return { ...p, isPinned: !p.isPinned }
          }
          return p
        })
        if (selectedDetails?.id) {
          const localPinnedKey = `comiverse_pinned_posts_${selectedDetails.id}`
          const pinnedIds = updated.filter(p => p.isPinned).map(p => p.id)
          localStorage.setItem(localPinnedKey, JSON.stringify(pinnedIds))
        }
        return updated
      })
      if (wasPinned) {
        toast.success('📌 Post pinned to top of feed!')
      } else {
        toast.info('Post unpinned.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to pin post.')
    }
  }

  const handleDeletePost = async (postId) => {
    try {
      if (typeof postId !== 'string' || !postId.startsWith('temp-')) {
        await deleteTeamAnnouncementApi(postId)
      }
      setAnnouncements(prev => prev.filter(p => p.id !== postId))
      toast.success('Post deleted successfully.')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete post.')
    }
  }

  const handlePostAnnouncement = async (customText, attachedImage = null) => {
    const textToPost = typeof customText === 'string' ? customText : newPostText
    if (!textToPost.trim() && !attachedImage) return
    const nowMs = Date.now()
    const nowIso = new Date(nowMs).toISOString()
    try {
      let finalImageUrl = undefined;
      
      if (attachedImage instanceof File) {
        const loadingToastId = toast.loading('Uploading image...')
        try {
          const uploadRes = await uploadImageApi(attachedImage)
          finalImageUrl = typeof uploadRes === 'string' ? uploadRes : (uploadRes?.url || uploadRes?.data || uploadRes)
          toast.dismiss(loadingToastId)
        } catch (uploadErr) {
          toast.dismiss(loadingToastId)
          toast.error('Failed to upload image.')
          return
        }
      } else if (typeof attachedImage === 'string') {
        finalImageUrl = attachedImage
      }

      const created = await createTeamAnnouncementApi(selectedDetails.id, {
        author: userFullName,
        role: (selectedDetails.leaderName || '').toLowerCase().trim() === userFullName.toLowerCase().trim() ? 'Group Leader' : 'Member',
        avatar: userFullName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2),
        time: nowIso,
        createdAt: nowIso,
        content: textToPost.trim(),
        imageUrl: finalImageUrl
      })
      const newPostObj = {
        ...created,
        timestamp: nowMs,
        createdAt: created?.createdAt || nowIso,
        time: created?.time || nowIso,
        attachedImage: finalImageUrl || created?.imageUrl || null,
        isPinned: false,
        comments: []
      }
      setAnnouncements(prev => [newPostObj, ...prev])
      setNewPostText('')
      toast.success('Announcement posted to group feed!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to post announcement.')
    }
  }

  const handleEditPost = async (postId, newContent) => {
    if (!newContent || !newContent.trim()) {
      toast.error('Post content cannot be empty.')
      return
    }
    const cleanContent = newContent.trim()
    setAnnouncements(prev => prev.map(p => p.id === postId ? { ...p, content: cleanContent, isEdited: true } : p))
    toast.success('Post updated successfully!')

    try {
      if (typeof postId === 'string' && !postId.startsWith('temp-')) {
        await updateTeamAnnouncementApi(postId, { content: cleanContent })
      }
    } catch (err) {
      console.error('Failed to update post on server:', err)
    }
  }

  const handleAddComment = async (postId, commentText, replyTarget = null) => {
    if (!commentText || !commentText.trim()) return
    const nowIso = new Date().toISOString()
    const newComment = {
      id: `cmt-${Date.now()}`,
      author: userFullName,
      avatar: userFullName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2),
      createdAt: nowIso,
      timestamp: Date.now(),
      text: commentText.trim(),
      content: commentText.trim(),
      likes: 0,
      replyToAuthor: replyTarget?.author || null
    }

    try {
      if (typeof postId === 'string' && !postId.startsWith('temp-')) {
        const created = await createTeamPostCommentApi(postId, {
          author: newComment.author,
          avatar: newComment.avatar,
          time: newComment.createdAt,
          content: newComment.text,
          replyToAuthor: newComment.replyToAuthor
        });
        newComment.id = created.id;
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to post comment.');
      return;
    }

    setAnnouncements(prev => {
      return prev.map(post => {
        if (post.id === postId) {
          const updatedComments = [...(post.comments || []), newComment]
          // Save to LocalStorage for this project & post
          if (selectedDetails?.id) {
            const cmtKey = `comiverse_announcement_comments_${selectedDetails.id}_${postId}`
            try {
              localStorage.setItem(cmtKey, JSON.stringify(updatedComments))
            } catch (e) { console.warn(e) }
          }
          return { ...post, comments: updatedComments }
        }
        return post
      })
    })

    if (replyTarget?.author) {
      toast.info(`🔔 Replied to @${replyTarget.author}!`)
    } else {
      const targetPost = announcements.find(p => p.id === postId);
      toast.info(`🔔 Replied to ${targetPost?.author || 'post'}!`)
    }
  }

  const handleLikeComment = (postId, commentId) => {
    setAnnouncements(prev => {
      return prev.map(post => {
        if (post.id === postId) {
          const updatedComments = (post.comments || []).map(cmt => {
            if (cmt.id === commentId) {
              return { ...cmt, likes: (cmt.likes || 0) + 1 }
            }
            return cmt
          })
          if (selectedDetails?.id) {
            const cmtKey = `comiverse_announcement_comments_${selectedDetails.id}_${postId}`
            try {
              localStorage.setItem(cmtKey, JSON.stringify(updatedComments))
            } catch (e) { console.warn(e) }
          }
          return { ...post, comments: updatedComments }
        }
        return post
      })
    })

    // Also fire backend like asynchronously
    try {
      if (typeof commentId === 'string' && !commentId.startsWith('cmt-')) {
        likeTeamPostCommentApi(commentId)
      }
    } catch (e) {}
  }

  const handleEditComment = async (postId, commentId, newContent) => {
    if (!newContent || !newContent.trim()) {
      toast.error('Comment content cannot be empty.')
      return
    }
    const cleanContent = newContent.trim()

    // 1. Optimistic UI update
    setAnnouncements(prev => {
      return prev.map(post => {
        if (post.id === postId) {
          const updatedComments = (post.comments || []).map(cmt => {
            if (cmt.id === commentId) {
              return { ...cmt, text: cleanContent, content: cleanContent, isEdited: true }
            }
            return cmt
          })
          if (selectedDetails?.id) {
            const cmtKey = `comiverse_announcement_comments_${selectedDetails.id}_${postId}`
            try {
              localStorage.setItem(cmtKey, JSON.stringify(updatedComments))
            } catch (e) { console.warn(e) }
          }
          return { ...post, comments: updatedComments }
        }
        return post
      })
    })

    toast.success('Comment updated successfully!')

    // 2. Call backend if valid ID
    try {
      if (typeof commentId === 'string' && !commentId.startsWith('cmt-')) {
        await updateTeamPostCommentApi(commentId, cleanContent)
      }
    } catch (err) {
      console.error('Failed to update comment on backend:', err)
    }
  }

  const handleDeleteComment = async (postId, commentId) => {
    // 1. Optimistic UI update
    setAnnouncements(prev => {
      return prev.map(post => {
        if (post.id === postId) {
          const updatedComments = (post.comments || []).filter(cmt => cmt.id !== commentId)
          if (selectedDetails?.id) {
            const cmtKey = `comiverse_announcement_comments_${selectedDetails.id}_${postId}`
            try {
              localStorage.setItem(cmtKey, JSON.stringify(updatedComments))
            } catch (e) { console.warn(e) }
          }
          return { ...post, comments: updatedComments }
        }
        return post
      })
    })

    toast.info('Comment deleted.')

    // 2. Call backend if valid ID
    try {
      if (typeof commentId === 'string' && !commentId.startsWith('cmt-')) {
        await deleteTeamPostCommentApi(commentId)
      }
    } catch (err) {
      console.error('Failed to delete comment on backend:', err)
    }
  }

  const handleLeaveTeam = (teamId) => {
    const localApprovedKey = `comiverse_approved_members_${teamId}`
    try {
      localStorage.removeItem(localApprovedKey)
    } catch (e) {}

    setProjects(prev => prev.filter(p => p.id !== teamId))
    setSelectedDetails(null)
    toast.info('You have left the project team.')
  }

  const handleRemoveMember = async (teamId, memberId, memberName) => {
    try {
      await removeTeamMemberApi(teamId, memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
      toast.success(`Removed ${memberName} from the project team.`)
    } catch (err) {
      console.error('Failed to remove member:', err)
      toast.error(`Failed to remove ${memberName}.`)
    }
  }

  const handleLikePost = async (id) => {
    try {
      const updated = await likeTeamAnnouncementApi(id)
      setAnnouncements(prev => prev.map(post => post.id === id ? { ...post, likes: updated.likes } : post))
    } catch (err) {
      console.error(err)
    }
  }

  const handleApproveRequest = async (id, name, requestObj = {}) => {
    const reqId = typeof id === 'object' ? id?.id : id
    const reqName = typeof id === 'object' ? id?.name : name
    const requesterId = typeof id === 'object' ? id?.requesterId : requestObj?.requesterId

    if (!reqId) {
      console.error('[TeamProjects] Cannot approve request: Missing request ID', { id, name, requestObj })
      toast.error('Failed to approve request: Invalid request ID.')
      return
    }

    try {
      await decideTeamRequestApi(reqId, 'approved')
    } catch (err) {
      console.error('[TeamProjects] Backend decide team request error:', err)
      const errorMsg = err.response?.data?.message || 'Failed to approve request.'
      toast.error(errorMsg)
      return // Abort UI update if backend validation fails
    }

    // 1. Update local UI states instantly
    setJoinRequests(prev => prev.filter(req => req.id !== reqId))

    const newMem = {
      id: requesterId || `mem-${Date.now()}`,
      name: reqName || 'Member',
      role: 'Member',
      status: 'Offline',
      online: false,
      joinDate: new Date().toLocaleDateString('en-US'),
      contributions: 0,
      revoked: 0,
      avatar: (reqName || 'M').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)
    }

    // Persist approved member to LocalStorage immediately
    if (selectedDetails?.id) {
      const localApprovedKey = `comiverse_approved_members_${selectedDetails.id}`;
      try {
        const existingSaved = JSON.parse(localStorage.getItem(localApprovedKey) || '[]');
        const isAlreadySaved = existingSaved.some(m => (m.name || '').toLowerCase().trim() === (newMem.name || '').toLowerCase().trim());
        if (!isAlreadySaved) {
          existingSaved.push(newMem);
          localStorage.setItem(localApprovedKey, JSON.stringify(existingSaved));
        }
      } catch (e) { console.warn(e); }
    }

    setMembers(prev => {
      const exists = prev.some(m => (m.name || '').toLowerCase().trim() === (newMem.name || '').toLowerCase().trim());
      return exists ? prev : [...prev, newMem];
    });

    setTeamMembersForAssign(prev => {
      const exists = prev.some(m => (m.name || '').toLowerCase().trim() === (newMem.name || '').toLowerCase().trim());
      return exists ? prev : [...prev, newMem];
    });

    if (selectedDetails) {
      const newCount = (members.length || 1) + 1
      const maxCapacityWithLeader = (Number(selectedDetails.maxMembers) || 5) + 1
      const isStillRecruiting = newCount < maxCapacityWithLeader && selectedDetails.isRecruiting

      const updatedDetails = {
        ...selectedDetails,
        membersCount: newCount,
        isRecruiting: isStillRecruiting
      }

      setSelectedDetails(updatedDetails)
      setProjects(prev => prev.map(p => p.id === selectedDetails.id ? updatedDetails : p))
    }

    toast.success(`🎉 Approved ${reqName} and added to project members!`)
  }

  const handleRejectRequest = async (id, name) => {
    const reqId = typeof id === 'object' ? id?.id : id
    const reqName = typeof id === 'object' ? id?.name : name

    if (!reqId) {
      console.error('[TeamProjects] Cannot reject request: Missing request ID', { id, name })
      toast.error('Failed to reject request: Invalid request ID.')
      return
    }

    // Optimistically remove from UI instantly
    setJoinRequests(prev => prev.filter(req => req.id !== reqId))
    toast.info(`Rejected request from ${reqName}.`)

    try {
      await decideTeamRequestApi(reqId, 'rejected')
    } catch (err) {
      console.error(err)
    }
  }

  const [banModalData, setBanModalData] = useState(null)
  const [unbanModalData, setUnbanModalData] = useState(null)

  const handleBanUser = (userId, name, requestId) => {
    if (!userId) {
      toast.error('Cannot ban user: Missing user ID.')
      return
    }
    setBanModalData({
      userId,
      name: name || 'Applicant',
      requestId,
      reason: 'Spam applications / Not a good fit'
    })
  }

  const handleConfirmBanUser = async (reason) => {
    if (!banModalData) return
    const { userId, name, requestId } = banModalData

    if (requestId) {
      setJoinRequests(prev => prev.filter(req => req.id !== requestId))
    }

    try {
      await banUserFromTeamApi(selectedDetails.id, userId, reason)
      toast.success(`${name} has been banned from this team.`)
      setBanModalData(null)
      // Refresh bans
      getBannedUsersApi(selectedDetails.id).then(res => {
        setBannedUsers(Array.isArray(res) ? res : res?.data || [])
      }).catch(console.error)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to ban user.')
    }
  }

  const handleUnbanUser = (userId, name) => {
    setUnbanModalData({ userId, name: name || 'User' })
  }

  const handleConfirmUnbanUser = async () => {
    if (!unbanModalData) return
    const { userId, name } = unbanModalData

    try {
      await unbanUserFromTeamApi(selectedDetails.id, userId)
      toast.success(`${name} has been unbanned.`)
      setBannedUsers(prev => prev.filter(b => b.userId !== userId))
      setUnbanModalData(null)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to unban user.')
    }
  }

  const handleCreateTask = async (customData = null) => {
    if (!isLeaderMatch(selectedDetails?.leaderName)) {
      toast.error('Only the Project Leader can create or assign team tasks.')
      return
    }
    const data = customData || newTaskData
    if (!data || !data.title || !data.title.trim()) return
    if (!data.chapterId) {
      toast.error('Please select a chapter.')
      return
    }
    

    const comicName = selectedDetails?.comicName || selectedDetails?.title || 'Unknown Comic'
    const cleanTitle = data.title.trim()
    const formattedTitle = cleanTitle.startsWith('[') ? cleanTitle : `[${(data.priority || 'MEDIUM').toUpperCase()}] [${comicName}] ${cleanTitle}`
    const dueDateVal = data.dueDate || new Date().toISOString().split('T')[0]

    const taskTypeVal = data.taskType || 'REGULAR';
    const initialStatus = 'backlog';

    const newTaskObj = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: formattedTitle,
      status: initialStatus,
      assigneeId: data.assigneeId,
      chapterId: data.chapterId,
      taskType: taskTypeVal,
      dueDate: dueDateVal,
      createdAt: new Date().toISOString()
    }

    let taskToSave = null

    try {
      const created = await createTeamTaskApi(selectedDetails.id, {
        title: formattedTitle,
        status: initialStatus,
        assigneeId: data.assigneeId,
        chapterId: data.chapterId,
        taskType: taskTypeVal,
        dueDate: dueDateVal
      })
      taskToSave = (created && (created.id || created.title)) ? { ...newTaskObj, ...created } : newTaskObj
    } catch (err) {
      console.error('Backend createTeamTaskApi error, task was NOT created:', err)
      toast.error(err.response?.data?.message || 'Failed to create task. Please try again.')
      return
    }

    const updatedTasks = [...tasks, taskToSave]
    setTasks(updatedTasks)

    if (!customData) {
      setNewTaskData({ title: '', column: 'backlog', assigneeId: null, dueDate: '', priority: 'Medium', chapterId: null, chapterRewardUsd: '', taskType: 'REGULAR' })
      setShowCreateTask(false)
    }

    toast.success('Task created successfully!')
  }

  const handleMoveTask = async (id, newCol) => {
    if (!isLeaderMatch(selectedDetails?.leaderName)) {
      toast.error('Only the Project Leader can change task status.')
      return
    }
    const previousTasks = tasks
    const updatedTasks = tasks.map(task => task.id === id ? { ...task, status: newCol } : task)
    setTasks(updatedTasks)

    try {
      await updateTeamTaskApi(id, { status: newCol })
    } catch (err) {
      console.error('Backend updateTeamTaskApi error, reverting move:', err)
      toast.error('Failed to move task. Please try again.')
      setTasks(previousTasks)
    }
  }

  const handleOpenTaskDetails = (task) => {
    const comicFallback = selectedDetails?.comicName || selectedDetails?.title || 'Unknown Comic'
    const { priority, cleanTitle, comicProject } = parseTaskTitle(task.title, comicFallback)
    setSelectedTask(task)
    setEditTaskData({
      title: cleanTitle,
      comic: comicProject || '',
      status: getTaskColumn(task),
      priority: priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase(),
      assigneeId: task.assigneeId || null,
      originalAssigneeId: task.assigneeId || null,
      dueDate: task.dueDate || '',
      chapterRewardUsd: task.chapterRewardUsd ?? '',
      handoverCompletedPages: '',
      handoverFactor: '1.00',
      handoverReason: '',
      totalPages: Number(task.totalPages || 0),
      taskId: task.id || task._id || task.taskId || task.TaskID || 'KHONG-TIM-THAY-ID'
    })
  }

  const handleSaveEditTask = async () => {
    if (!selectedTask || !editTaskData) return
    if (!isLeaderMatch(selectedDetails?.leaderName)) {
      toast.error('Only the Project Leader can edit team tasks.')
      return
    }
    const comicFallback = selectedDetails?.comicName || selectedDetails?.title || 'Unknown Comic'
    const formattedTitle = `[${(editTaskData.priority || 'MEDIUM').toUpperCase()}] [${editTaskData.comic || comicFallback}] ${editTaskData.title.trim()}`

    const targetId = selectedTask.id || selectedTask._id || selectedTask.taskId
    const updatedTaskObj = {
      ...selectedTask,
      title: formattedTitle,
      assigneeId: editTaskData.assigneeId,
      dueDate: editTaskData.dueDate
    }

    const previousTasks = tasks
    const updatedTasks = tasks.map(t => (t.id === targetId || t._id === targetId) ? updatedTaskObj : t)
    setTasks(updatedTasks)

    try {
      const assigneeChanged = String(editTaskData.originalAssigneeId || '') !== String(editTaskData.assigneeId || '')
      await updateTeamTaskApi(targetId, {
        title: formattedTitle,
        assigneeId: assigneeChanged ? editTaskData.originalAssigneeId : editTaskData.assigneeId,
        dueDate: editTaskData.dueDate
      })

      if (assigneeChanged) {
        if (!String(editTaskData.handoverReason || '').trim()) {
          throw new Error('A handover reason is required when changing the assignee.')
        }
        await handoverTeamTaskApi(targetId, {
          newAssigneeId: editTaskData.assigneeId,
          completedPageNumbers: parseCompletedPageNumbers(editTaskData.handoverCompletedPages),
          responsibilityFactor: Number(editTaskData.handoverFactor || 1),
          reason: String(editTaskData.handoverReason).trim()
        })
      }
    } catch (err) {
      console.error('Backend updateTeamTaskApi error, reverting edit:', err)
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save task changes. Please try again.')
      setTasks(previousTasks)
      return
    }

    toast.success('Task updated successfully!')
    setSelectedTask(null)
  }

  const handleMoveAllToDone = async () => {
    if (!isLeaderMatch(selectedDetails?.leaderName)) {
      toast.error('Only the Project Leader can manage team tasks.')
      return
    }
    toast.info('Bulk completion is disabled. Each chapter must finish every page and pass Project Leader review before payment settlement.')
  }

  const isLeaderMatch = (leaderName) => {
    if (!leaderName) return false
    const ln = leaderName.toLowerCase().trim()
    const username = (authUser?.username || '').toLowerCase().trim()
    const fullName = (authUser?.fullName || '').toLowerCase().trim()
    return ln === username || ln === fullName
  }

  const teamProjectsList = projects.filter(proj =>
    (proj.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (proj.comicName || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loadingProjects && projects.length === 0) {
    return (
      <div className="fade-in trans-projects-container" style={{ padding: '0 0 40px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div className="skeleton-dash-shimmer" style={{ width: '240px', height: '28px', marginBottom: '8px' }}></div>
          <div className="skeleton-dash-shimmer" style={{ width: '380px', height: '16px' }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="skeleton-dash-shimmer" style={{ height: '100px', borderRadius: '16px' }}></div>
          <div className="skeleton-dash-shimmer" style={{ height: '100px', borderRadius: '16px' }}></div>
          <div className="skeleton-dash-shimmer" style={{ height: '100px', borderRadius: '16px' }}></div>
        </div>
      </div>
    )
  }

  if (selectedDetails) {
    if (loadingWorkspace && members.length === 0) {
      return (
        <div className="fade-in trans-projects-container" style={{ padding: '0 0 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div className="skeleton-dash-shimmer" style={{ width: '280px', height: '28px', marginBottom: '8px' }}></div>
              <div className="skeleton-dash-shimmer" style={{ width: '180px', height: '16px' }}></div>
            </div>
            <div className="skeleton-dash-shimmer" style={{ width: '120px', height: '36px', borderRadius: '10px' }}></div>
          </div>
          <div className="skeleton-dash-shimmer" style={{ width: '100%', height: '48px', borderRadius: '12px', marginBottom: '24px' }}></div>
          <div className="skeleton-dash-shimmer" style={{ width: '100%', height: '320px', borderRadius: '16px' }}></div>
        </div>
      )
    }

    const isCurrentLeader = isLeaderMatch(selectedDetails.leaderName)

    const boardTasks = tasks.filter(t => String(t?.status || t?.column || '').toLowerCase() !== 'superseded')
    const activeTasks = boardTasks.filter(t => getTaskColumn(t) !== 'paused')
    const pausedTasks = boardTasks.filter(t => getTaskColumn(t) === 'paused')
    const comicName = selectedDetails?.comicName || selectedDetails?.title
    const filteredMembers = members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()))

    return (
      <>
        <WorkspaceDetailView
          selectedDetails={selectedDetails}
          setSelectedDetails={setSelectedDetails}
          tasksLoading={tasksLoading}
          onBackToProjects={() => {
            localStorage.removeItem('comiverse_active_project_id');
            setSelectedDetails(null);
          }}
          workspaceTab={workspaceTab}
          setWorkspaceTab={setWorkspaceTab}
          isCurrentLeader={isCurrentLeader}
          members={members}
          memberSearch={memberSearch}
          setMemberSearch={setMemberSearch}
          onMembersLoaded={setMembers}
          onLeaveTeam={handleLeaveTeam}
          onRemoveMember={handleRemoveMember}
          bannedUsers={bannedUsers}
          onUnbanUser={handleUnbanUser}
          joinRequests={joinRequests}
          onApproveRequest={handleApproveRequest}
          onRejectRequest={handleRejectRequest}
          onBanUser={handleBanUser}
          newPostText={newPostText}
          setNewPostText={setNewPostText}
          onPostAnnouncement={handlePostAnnouncement}
          announcements={announcements}
          onLikePost={handleLikePost}
          onTogglePinPost={handleTogglePinPost}
          onDeletePost={handleDeletePost}
          onEditPost={handleEditPost}
          onAddComment={handleAddComment}
          onLikeComment={handleLikeComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          comicName={comicName}
          tasks={boardTasks}
          activeTasks={activeTasks}
          pausedTasks={pausedTasks}
          lockedColumns={lockedColumns}
          setLockedColumns={setLockedColumns}
          highlightedColumns={highlightedColumns}
          setHighlightedColumns={setHighlightedColumns}
          sortedColumns={sortedColumns}
          setSortedColumns={setSortedColumns}
          openDropdownCol={openDropdownCol}
          setOpenDropdownCol={setOpenDropdownCol}
          onCreateTaskClick={openCreateTaskModal}
          onMoveAllToDone={handleMoveAllToDone}
          onMoveTask={handleMoveTask}
          onOpenTaskDetails={handleOpenTaskDetails}
          getAssigneeInitials={getAssigneeInitials}
          showCreateTask={showCreateTask}
          newTaskData={newTaskData}
          setNewTaskData={setNewTaskData}
          chapterOptions={chapterOptions}
          teamMembersForAssign={teamMembersForAssign}
          onCancelCreateTask={() => setShowCreateTask(false)}
          onCreateTask={handleCreateTask}
          selectedTask={selectedTask}
          editTaskData={editTaskData}
          setEditTaskData={setEditTaskData}
          onCancelEditTask={() => setSelectedTask(null)}
          onSaveEditTask={handleSaveEditTask}
          onContinueToWorkspace={() => navigate(`/translator/translate-workspace/task/${selectedTask.id}`)}
          onContinueToReviewWorkspace={() => navigate(`/translator/review-workspace/task/${selectedTask.id}`)}
          onSaveWorkspaceSettings={handleSaveWorkspaceSettings}
        />
        {banModalData && (
          <BanUserModal
            modalData={banModalData}
            teamName={selectedDetails?.teamName || selectedDetails?.title || 'this team'}
            onClose={() => setBanModalData(null)}
            onConfirm={handleConfirmBanUser}
          />
        )}
        {unbanModalData && (
          <UnbanUserModal
            modalData={unbanModalData}
            teamName={selectedDetails?.teamName || selectedDetails?.title || 'this team'}
            onClose={() => setUnbanModalData(null)}
            onConfirm={handleConfirmUnbanUser}
          />
        )}
      </>
    )
  }

  const handleQuickTranslate = async (proj) => {
    try {
      let taskList = [];
      try {
        const tRes = await getTeamTasksApi(proj.id);
        taskList = Array.isArray(tRes) ? tRes : (tRes?.data || tRes?.content || []);
      } catch (e) {}

      let targetTask = taskList.find(t => {
        const col = (t.column || t.status || '').toLowerCase();
        return col.includes('progress') || col.includes('doing');
      }) || taskList[0];

      const targetTaskId = targetTask?.id || `task-${proj.id}`;

      const rawComicTitle = proj.comicName || proj.title || 'Comic';
      const cleanTitle = targetTask?.title || `${rawComicTitle} - Chapter 1 - Translation`;
      const chId = targetTask?.chapterId || `ch-${proj.id}-1`;

      const cacheKey = `comiverse_ws_cache_${targetTaskId}`;
      if (!sessionStorage.getItem(cacheKey)) {
        try {
          const cachedPages = sessionStorage.getItem(`comiverse_chapter_pages_${chId}`);
          let pages = [];
          if (cachedPages) {
            pages = JSON.parse(cachedPages);
          } else if (Array.isArray(targetTask?.pages) && targetTask.pages.length > 0) {
            pages = targetTask.pages;
          }

          if (pages.length > 0) {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              chapter: {
                id: chId,
                title: cleanTitle,
                comicTitle: rawComicTitle,
                pagesCount: pages.length,
                pages: pages
              },
              pages: pages
            }));
          }
        } catch (e) {}
      }

      navigate(`/translator/translate-workspace/task/${targetTaskId}`);
    } catch (err) {
      navigate(`/translator/translate-workspace/task/task-${proj.id}`);
    }
  };

  return (
    <>
      <ProjectsListView
        teamProjectsList={teamProjectsList}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        sourceLang={sourceLang}
        onSourceLangChange={handleSourceLangChange}
        targetLang={targetLang}
        onTargetLangChange={handleTargetLangChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        roleFilter={roleFilter}
        onRoleFilterChange={handleRoleFilterChange}
        availableSourceLangs={availableSourceLangs}
        availableTargetLangs={availableTargetLangs}
        onResetFilters={handleResetFilters}
        totalResults={filteredProjects.length}
        onOpenDetails={handleOpenDetails}
        onQuickTranslate={handleQuickTranslate}
        onOpenEdit={handleOpenEdit}
        isLeaderMatch={isLeaderMatch}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
      {selectedEdit && (
        <EditProjectModal
          editForm={editForm}
          setEditForm={setEditForm}
          onCancel={() => setSelectedEdit(null)}
          onSave={handleSaveEdit}
        />
      )}
    </>
  )
}

export default TeamProjects