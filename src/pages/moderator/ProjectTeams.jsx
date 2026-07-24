import { useState } from 'react'
import { createPortal } from 'react-dom'
import '../../assets/style/moderator/project-teams.css'
import { toast } from 'react-toastify'
import { searchTranslatorsApi } from '../../services/api/AccountApi'
import { updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import ModernPagination from '../../components/common/ModernPagination'

function ProjectTeams({
  projectTeams,
  setProjectTeams,
  comics,
  showCreateTeamModal,
  setShowCreateTeamModal,
  createTeamStep,
  setCreateTeamStep,
  createTeamForm,
  setCreateTeamForm,
  handleCreateProjectTeam
}) {

  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 6
  const totalPages = Math.ceil(projectTeams.length / ITEMS_PER_PAGE)
  const activePage = Math.min(currentPage, Math.max(1, totalPages))
  const paginatedTeams = projectTeams.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE
  )

  // Assign Leader Modal states
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignTeamId, setAssignTeamId] = useState(null)
  const [leaderSearch, setLeaderSearch] = useState('')
  const [leaderSearchResults, setLeaderSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  // Create Team - leader search states
  const [createLeaderSearch, setCreateLeaderSearch] = useState('')
  const [createLeaderResults, setCreateLeaderResults] = useState([])
  const [selectedLeader, setSelectedLeader] = useState(null)

  const handleLeaderSearch = async (query) => {
    setLeaderSearch(query)
    if (query.trim().length >= 2) {
      setSearching(true)
      try {
        const data = await searchTranslatorsApi(query)
        setLeaderSearchResults(data || [])
      } catch (err) {
        console.error(err)
        setLeaderSearchResults([])
      } finally {
        setSearching(false)
      }
    } else {
      setLeaderSearchResults([])
    }
  }

  const handleCreateLeaderSearch = async (query) => {
    setCreateLeaderSearch(query)
    if (query.trim().length >= 2) {
      try {
        const data = await searchTranslatorsApi(query)
        setCreateLeaderResults(data || [])
      } catch (err) {
        console.error(err)
        setCreateLeaderResults([])
      }
    } else {
      setCreateLeaderResults([])
    }
  }

  const openAssignLeaderModal = (teamId) => {
    setAssignTeamId(teamId)
    setLeaderSearch('')
    setLeaderSearchResults([])
    setShowAssignModal(true)
  }

  const confirmAssignLeader = async (translator) => {
    const displayName = translator.fullName || translator.username;
    const team = projectTeams.find(t => t.id === assignTeamId)
    if (!team) return

    const leaderInitials = translator.initials || displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    try {
      await updateProjectTeamApi(assignTeamId, {
        ...team,
        leaderId: translator.id,
        leaderName: displayName,
        leaderInitials
      })
      setProjectTeams(prev =>
        prev.map(t => t.id === assignTeamId
          ? { ...t, leaderId: translator.id, leaderName: displayName, leaderInitials }
          : t
        )
      )
      toast.success(`${displayName} assigned as Group Leader!`)
      setShowAssignModal(false)
    } catch (err) {
      console.error(err)
      toast.error('Failed to assign the project leader.')
    }
  }

  const selectCreateLeader = (translator) => {
    const displayName = translator.fullName || translator.username;
    setCreateTeamForm(prev => ({ ...prev, leaderId: translator.id, leaderName: displayName }))
    setSelectedLeader(translator)
    setCreateLeaderSearch('')
    setCreateLeaderResults([])
  }

  const clearSelectedLeader = () => {
    setSelectedLeader(null)
    setCreateTeamForm(prev => ({ ...prev, leaderId: '', leaderName: '' }))
    setCreateLeaderSearch('')
    setCreateLeaderResults([])
  }

  const handleToggleStatus = async (teamId, currentStatus) => {
    const isActive = currentStatus && currentStatus.toUpperCase() === 'ACTIVE';
    const nextStatus = isActive ? 'PAUSED' : 'ACTIVE';
    const team = projectTeams.find(t => t.id === teamId);
    if (!team) return;

    const updatedData = { ...team, status: nextStatus };
    try {
      await updateProjectTeamApi(teamId, updatedData);
      setProjectTeams(prev =>
        prev.map(t => (t.id === teamId ? { ...t, status: nextStatus } : t))
      );
      toast.success(`Project Team status updated to ${nextStatus}!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update team status on database.');
    }
  };

  const triggerOpenCreate = () => {
    setCreateTeamForm({
      title: '',
      comicName: comics[0]?.title || '',
      sourceLang: 'Japanese',
      targetLang: 'English',
      leaderName: '',
      leaderId: '',
      priority: 'High'
    })
    setCreateLeaderSearch('')
    setCreateLeaderResults([])
    setSelectedLeader(null)
    setCreateTeamStep(1)
    setShowCreateTeamModal(true)
  }

  return (
    <div className="fade-in">
      <div className="comic-mgmt-header">
        <div className="moderator-page-header">
          <h1>Project Teams</h1>
          <p>Create and manage translation project teams. Assign leaders from translator members.</p>
        </div>
        <button 
          className="mod-btn approve mod-btn-create"
          style={{ padding: '10px 18px' }}
          onClick={triggerOpenCreate}
        >
          <span style={{ fontWeight: '800', fontSize: '16px', color: '#ffffff', marginRight: '6px' }}>+</span> Create Project Team
        </button>
      </div>

      <div className="mod-stats-cards-row">
        <div className="mod-stat-overview-card">
          <span className="stat-label">Total Projects</span>
          <span className="stat-value">{projectTeams.length}</span>
        </div>
        <div className="mod-stat-overview-card">
          <span className="stat-label">Active</span>
          <span className="stat-value active-count">{projectTeams.filter(t => t.status && t.status.toUpperCase() === 'ACTIVE').length}</span>
        </div>
        <div className="mod-stat-overview-card">
          <span className="stat-label">Paused</span>
          <span className="stat-value paused-count">{projectTeams.filter(t => t.status && t.status.toUpperCase() === 'PAUSED').length}</span>
        </div>
      </div>

      {projectTeams.length === 0 ? (
        <div className="project-team-cards-list" style={{ marginTop: '24px' }}>
          <div className="moderator-empty-state">
            <h3>No translation project teams</h3>
            <p>Click "Create Project Team" on the top right to start a new project team.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="project-team-cards-grid" style={{ marginTop: '24px' }}>
            {paginatedTeams.map(team => (
              <div className="project-team-grid-card" key={team.id}>
                <div className="project-team-card-header">
                  <div className="project-team-card-title-group">
                    <h3 title={team.title}>{team.title}</h3>
                    <span className={`comic-status-badge ${team.status ? team.status.toLowerCase() : 'active'}`}>
                      {team.status || 'Active'}
                    </span>
                  </div>
                </div>

                <div className="project-team-card-body">
                  <div className="project-team-info-item">
                    <span className="info-label">Linked Comic:</span>
                    <strong className="info-value" title={team.comicName}>{team.comicName}</strong>
                  </div>
                  
                  <div className="project-team-info-row">
                    <div className="info-col">
                      <span className="info-label">Language:</span>
                      <strong>{team.targetLang || 'English'}</strong>
                    </div>
                    <div className="info-col">
                      <span className="info-label">Priority:</span>
                      <span className={`priority-tag ${team.priority ? team.priority.toLowerCase() : 'high'}`}>
                        {team.priority || 'High'}
                      </span>
                    </div>
                  </div>

                  <div className="project-team-stats">
                    <span className="stat-pill">👥 {team.membersCount || 0} members</span>
                    <span className="stat-pill">📖 {team.chaptersCount || 0} chs</span>
                  </div>

                  <div className="project-team-leader-section">
                    <div className="project-team-leader-badge">
                      <div className="project-team-leader-avatar">
                        {team.leaderInitials || 'TL'}
                      </div>
                      <div className="project-team-leader-details">
                        <span className="project-team-leader-name" title={team.leaderName || 'Assigning...'}>
                          {team.leaderName || 'Assigning...'}
                        </span>
                        <span className="project-team-leader-role">👑 Group Leader</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="project-team-card-actions">
                  <button 
                    className="comic-btn-action btn-action-pause"
                    onClick={() => handleToggleStatus(team.id, team.status)}
                  >
                    {team.status && team.status.toUpperCase() === 'ACTIVE' ? '⏸️ Pause' : '▶️ Activate'}
                  </button>
                  <button 
                    className="comic-btn-action btn-action-assign"
                    onClick={() => openAssignLeaderModal(team.id)}
                  >
                    👤 Leader
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="project-teams-pagination-wrap" style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
              <ModernPagination 
                currentPage={activePage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
                variant="pills"
              />
            </div>
          )}
        </>
      )}

      {/* ── MODAL: CREATE PROJECT TEAM ──────────────── */}
      {showCreateTeamModal && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card">
            <div className="mod-modal-header">
              <h3>Create Project Team</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowCreateTeamModal(false)}>×</button>
            </div>

            <div className="mod-modal-body">
              {/* Step indicator */}
              <div className="mod-step-tracker">
                <div className="mod-step-text">Step {createTeamStep} of 2</div>
                <div className="mod-step-bar-bg">
                  <div 
                    className="mod-step-bar-fill" 
                    style={{ width: createTeamStep === 1 ? '50%' : '100%' }}
                  />
                </div>
              </div>

              {createTeamStep === 1 ? (
                /* STEP 1: GENERAL INFO */
                <div className="fade-in">
                  <div className="mod-form-group">
                    <label className="mod-label">Project Title *</label>
                    <input 
                      type="text" 
                      className="mod-input" 
                      placeholder="e.g. Invincible Sword God Group"
                      value={createTeamForm.title}
                      onChange={(e) => setCreateTeamForm({ ...createTeamForm, title: e.target.value })}
                    />
                  </div>

                  <div className="mod-form-group">
                    <label className="mod-label">Source Comic *</label>
                    <select 
                      className="mod-input select"
                      value={createTeamForm.comicName}
                      onChange={(e) => {
                        const selectedTitle = e.target.value;
                        const selectedComic = comics.find(c => c.title === selectedTitle);
                        const autoLang = selectedComic?.language && selectedComic.language !== 'Unknown' ? selectedComic.language : 'Japanese';
                        setCreateTeamForm({ 
                          ...createTeamForm, 
                          comicName: selectedTitle,
                          sourceLang: autoLang
                        });
                      }}
                    >
                      <option value="">-- Select a Comic --</option>
                      {comics.map((c) => (
                        <option key={c.id} value={c.title}>
                          {c.title} ({c.language || 'Unknown'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mod-form-row">
                    <div className="mod-form-group half">
                      <label className="mod-label">Source Language 🔒</label>
                      <input 
                        type="text"
                        className="mod-input"
                        value={createTeamForm.sourceLang || 'Auto-detected'}
                        disabled
                        readOnly
                        style={{ 
                          opacity: 0.85, 
                          cursor: 'not-allowed', 
                          fontWeight: '600'
                        }}
                        title="Source language is inherited directly from the original comic specification."
                      />
                    </div>

                    <div className="mod-form-group half">
                      <label className="mod-label">Target Language *</label>
                      <select 
                        className="mod-input select"
                        value={createTeamForm.targetLang}
                        onChange={(e) => setCreateTeamForm({ ...createTeamForm, targetLang: e.target.value })}
                      >
                        <option value="English">English</option>
                        <option value="Vietnamese">Vietnamese</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Korean">Korean</option>
                        <option value="Chinese">Chinese</option>
                        <option value="German">German</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* STEP 2: LEADER AND PRIORITY */
                <div className="fade-in">
                  <div className="mod-form-group">
                    <label className="mod-label">Assign Group Leader *</label>

                    {selectedLeader ? (
                      /* ── Selected Leader Card ── */
                      <div className="leader-selected-card">
                        <span className="leader-result-avatar">{selectedLeader.initials}</span>
                        <div className="leader-result-info">
                          <span className="leader-result-name">{selectedLeader.fullName || selectedLeader.username}</span>
                          <span className="leader-result-email">{selectedLeader.email || 'Translator'}</span>
                        </div>
                        <button
                          type="button"
                          className="leader-change-btn"
                          onClick={clearSelectedLeader}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      /* ── Search Input ── */
                      <div className="leader-search-container">
                        <input 
                          type="text" 
                          className="mod-input"
                          placeholder="Search by name, username, or email..."
                          value={createLeaderSearch}
                          onChange={(e) => handleCreateLeaderSearch(e.target.value)}
                          autoFocus
                        />
                        {createLeaderResults.length > 0 && (
                          <div className="leader-search-dropdown">
                            {createLeaderResults.map((t, idx) => (
                              <button
                                key={t.id || idx}
                                type="button"
                                className="leader-search-result"
                                onClick={() => selectCreateLeader(t)}
                              >
                                <span className="leader-result-avatar">{t.initials}</span>
                                <div className="leader-result-info">
                                  <span className="leader-result-name">{t.fullName || t.username}</span>
                                  <span className="leader-result-email">{t.email || 'Translator'}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {createLeaderSearch.trim().length >= 2 && createLeaderResults.length === 0 && (
                          <div className="leader-search-dropdown">
                            <div className="leader-search-empty">No translators found matching "{createLeaderSearch}"</div>
                          </div>
                        )}
                        {createLeaderSearch.trim().length < 2 && (
                          <div className="leader-search-hint-inline">
                            🔍 Type at least 2 characters to search translators
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mod-modal-footer">
              <button 
                className="mod-btn review"
                onClick={() => {
                  if (createTeamStep === 2) {
                    setCreateTeamStep(1);
                  } else {
                    setShowCreateTeamModal(false);
                  }
                }}
              >
                {createTeamStep === 2 ? '← Back' : 'Cancel'}
              </button>
              <button 
                className="mod-btn approve"
                onClick={() => {
                  if (createTeamStep === 1) {
                    const exists = projectTeams.some(
                      t => t.comicName && t.comicName.toLowerCase() === createTeamForm.comicName.toLowerCase() &&
                           t.targetLang && t.targetLang.toLowerCase() === createTeamForm.targetLang.toLowerCase()
                    );
                    if (exists) {
                      toast.error(`A translation team for "${createTeamForm.comicName}" in "${createTeamForm.targetLang}" already exists!`);
                      return;
                    }
                    setCreateTeamStep(2);
                  } else {
                    handleCreateProjectTeam();
                  }
                }}
                disabled={createTeamStep === 1 && (!createTeamForm.comicName || !createTeamForm.title.trim())}
              >
                {createTeamStep === 1 ? 'Next →' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: ASSIGN LEADER ─────────────────────── */}
      {showAssignModal && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card" style={{ maxWidth: '480px' }}>
            <div className="mod-modal-header">
              <h3>👑 Assign Group Leader</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowAssignModal(false)}>×</button>
            </div>

            <div className="mod-modal-body">
              <div className="mod-form-group">
                <label className="mod-label">Search Translator</label>
                <input 
                  type="text" 
                  className="mod-input"
                  placeholder="Type username or email to search..."
                  value={leaderSearch}
                  onChange={(e) => handleLeaderSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="leader-search-results-list">
                {searching && (
                  <div className="leader-search-empty">Searching...</div>
                )}
                {!searching && leaderSearch.trim().length >= 2 && leaderSearchResults.length === 0 && (
                  <div className="leader-search-empty">No translators found matching "{leaderSearch}"</div>
                )}
                {!searching && leaderSearchResults.map((t, idx) => {
                  const displayName = t.fullName || t.username;
                  return (
                    <button
                      key={t.id || idx}
                      type="button"
                      className="leader-search-result-card"
                      onClick={() => confirmAssignLeader(t)}
                    >
                      <span className="leader-result-avatar">{t.initials}</span>
                      <div className="leader-result-info">
                        <span className="leader-result-name">{displayName}</span>
                        <span className="leader-result-email">{t.email}</span>
                      </div>
                      <span className="leader-result-assign-hint">Click to assign</span>
                    </button>
                  );
                })}
                {leaderSearch.trim().length < 2 && (
                  <div className="leader-search-hint">
                    <span>🔍</span>
                    <p>Type at least 2 characters to search for translators in the system.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mod-modal-footer">
              <button 
                className="mod-btn review"
                onClick={() => setShowAssignModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ProjectTeams
