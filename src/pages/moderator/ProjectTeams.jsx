import { useState } from 'react'
import '../../assets/style/moderator/project-teams.css'
import { toast } from 'react-toastify'
import { searchTranslatorsApi } from '../../services/api/AccountApi'
import { updateProjectTeamApi } from '../../services/api/ProjectTeamApi'

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

  const [activeViewTab, setActiveViewTab] = useState('teams') // 'teams' | 'jobs'
  const [jobsCurrentPage, setJobsCurrentPage] = useState(1)

  // Assign Leader Modal states
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignTeamId, setAssignTeamId] = useState(null)
  const [leaderSearch, setLeaderSearch] = useState('')
  const [leaderSearchResults, setLeaderSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  // Create Team - leader search states
  const [createLeaderSearch, setCreateLeaderSearch] = useState('')
  const [createLeaderResults, setCreateLeaderResults] = useState([])

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

  const confirmAssignLeader = (translator) => {
    const displayName = translator.fullName || translator.username;
    setProjectTeams(prev =>
      prev.map(t =>
        t.id === assignTeamId
          ? {
              ...t,
              leaderName: displayName,
              leaderInitials: translator.initials || displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            }
          : t
      )
    )
    toast.success(`${displayName} assigned as Group Leader!`)
    setShowAssignModal(false)
  }

  const selectCreateLeader = (translator) => {
    const displayName = translator.fullName || translator.username;
    setCreateTeamForm(prev => ({ ...prev, leaderName: displayName }))
    setCreateLeaderSearch(displayName)
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
      deadline: '',
      sourceLang: 'Japanese',
      targetLang: 'English',
      leaderName: 'John Smith',
      priority: 'High'
    })
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
          className="mod-btn approve"
          style={{ background: '#0f172a', padding: '10px 18px' }}
          onClick={triggerOpenCreate}
        >
          ➕ Create Project Team
        </button>
      </div>

      {(() => {
        const claimedTeams = projectTeams.filter(t => !t.status || t.status.toUpperCase() !== 'UNCLAIMED')
        return (
          <div className="mod-stats-cards-row">
            <div className="mod-stat-overview-card">
              <span className="stat-label">Total Projects</span>
              <span className="stat-value">{claimedTeams.length}</span>
            </div>
            <div className="mod-stat-overview-card">
              <span className="stat-label">Active</span>
              <span className="stat-value active-count">{claimedTeams.filter(t => t.status && t.status.toUpperCase() === 'ACTIVE').length}</span>
            </div>
            <div className="mod-stat-overview-card">
              <span className="stat-label">Paused</span>
              <span className="stat-value paused-count">{claimedTeams.filter(t => t.status && t.status.toUpperCase() === 'PAUSED').length}</span>
            </div>
          </div>
        )
      })()}      {/* Sub-tab Switcher */}
      {(() => {
        const claimedTeams = projectTeams.filter(t => !t.status || t.status.toUpperCase() !== 'UNCLAIMED')
        return (
          <div className="moderator-sub-tabs-container" style={{ marginTop: '24px', marginBottom: '20px' }}>
            <button 
              className={`moderator-sub-tab-btn ${activeViewTab === 'teams' ? 'active' : ''}`}
              onClick={() => { setActiveViewTab('teams'); setJobsCurrentPage(1); }}
            >
              🧑‍🤝‍🧑 Active Project Teams ({claimedTeams.length})
            </button>
            <button 
              className={`moderator-sub-tab-btn ${activeViewTab === 'jobs' ? 'active' : ''}`}
              onClick={() => { setActiveViewTab('jobs'); setJobsCurrentPage(1); }}
            >
              📋 Translation Job Postings ({projectTeams.length})
            </button>
          </div>
        )
      })()}

      {activeViewTab === 'teams' ? (
        /* Project Teams Cards list */
        <div className="project-team-cards-list">
          {projectTeams.filter(t => !t.status || t.status.toUpperCase() !== 'UNCLAIMED').length === 0 ? (
            <div className="moderator-empty-state">
              <h3>No translation project teams</h3>
              <p>Click "Create Project Team" on the top right to start a new project team.</p>
            </div>
          ) : (
            projectTeams.filter(t => !t.status || t.status.toUpperCase() !== 'UNCLAIMED').map(team => (
              <div className="project-team-row-card" key={team.id}>
                <div className="project-team-card-header">
                  <div>
                    <div className="project-team-card-title-group">
                      <h3>{team.title}</h3>
                      <span className={`comic-status-badge ${team.status.toLowerCase()}`}>
                        {team.status}
                      </span>
                    </div>
                    <div className="project-team-meta-desc" style={{ marginTop: '6px' }}>
                      Linked Comic: <strong>{team.comicName}</strong> · {team.membersCount} members · {team.chaptersCount} chapters
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="comic-btn-action"
                      style={{ color: '#d97706', borderColor: 'rgba(217, 119, 6, 0.2)' }}
                      onClick={() => handleToggleStatus(team.id, team.status)}
                    >
                      {team.status.toUpperCase() === 'ACTIVE' ? '⏸️ Pause' : '▶️ Activate'}
                    </button>
                    <button 
                      className="comic-btn-action"
                      style={{ color: '#a855f7', borderColor: 'rgba(168, 85, 247, 0.2)' }}
                      onClick={() => openAssignLeaderModal(team.id)}
                    >
                      👤 Assign Leader
                    </button>
                  </div>
                </div>

                <div className="project-team-card-body">
                  <div className="project-team-progress-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--mod-text-secondary)' }}>
                      <span>Translation & Review Progress</span>
                      <span>{team.progress || '0'}%</span>
                    </div>
                    <div className="project-team-progress-bar-bg" style={{ marginTop: '6px' }}>
                      <div 
                        className="project-team-progress-bar-fill" 
                        style={{ width: `${team.progress || 0}%`, background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }}
                      />
                    </div>
                  </div>

                  <div className="project-team-footer-meta">
                    <div className="project-team-leader-badge">
                      <div className="project-team-leader-avatar">
                        {team.leaderInitials || 'TL'}
                      </div>
                      <div className="project-team-leader-details">
                        <span className="project-team-leader-name">{team.leaderName}</span>
                        <span className="project-team-leader-role">
                          👑 Group Leader
                        </span>
                      </div>
                    </div>

                    <div className="project-team-deadline-info">
                      📅 Deadline: <strong>{team.deadline}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Translation Job Postings view */
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '20px',
          backdropFilter: 'blur(10px)',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--mod-text-primary)' }}>Translation Job Postings</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--mod-text-secondary)' }}>Track all requested and claimed translation jobs.</p>
            </div>
          </div>
          {projectTeams.length === 0 ? (
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--mod-text-secondary)' }}>No jobs have been posted yet.</p>
          ) : (
            (() => {
              const jobsTotalPages = Math.ceil(projectTeams.length / 10)
              const paginatedJobs = projectTeams.slice((jobsCurrentPage - 1) * 10, jobsCurrentPage * 10)

              return (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--mod-text-secondary)' }}>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Comic Name</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Target Language</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Deadline</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status</th>
                          <th style={{ padding: '12px 16px', fontWeight: '600' }}>Assignee / Group Leader</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedJobs.map(job => {
                          const isUnclaimed = job.status && job.status.toUpperCase() === 'UNCLAIMED'
                          const isPending = job.status && job.status.toUpperCase() === 'PENDING'
                          
                          let statusColor = '#3b82f6'
                          let statusBg = 'rgba(59, 130, 246, 0.15)'
                          let statusBorder = 'rgba(59, 130, 246, 0.3)'
                          let statusLabel = job.status

                          if (isUnclaimed) {
                            statusColor = '#f59e0b'
                            statusBg = 'rgba(245, 158, 11, 0.15)'
                            statusBorder = 'rgba(245, 158, 11, 0.3)'
                            statusLabel = 'Unclaimed (Pool)'
                          } else if (isPending) {
                            statusColor = '#a855f7'
                            statusBg = 'rgba(168, 85, 247, 0.15)'
                            statusBorder = 'rgba(168, 85, 247, 0.3)'
                            statusLabel = 'Pending Assignee'
                          } else if (job.status && job.status.toUpperCase() === 'ACTIVE') {
                            statusColor = '#10b981'
                            statusBg = 'rgba(16, 185, 129, 0.15)'
                            statusBorder = 'rgba(16, 185, 129, 0.3)'
                            statusLabel = 'Claimed & Active'
                          } else if (job.status && job.status.toUpperCase() === 'PAUSED') {
                            statusColor = '#ef4444'
                            statusBg = 'rgba(239, 68, 68, 0.15)'
                            statusBorder = 'rgba(239, 68, 68, 0.3)'
                            statusLabel = 'Paused'
                          }

                          return (
                            <tr key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--mod-text-primary)' }}>
                              <td style={{ padding: '16px', fontWeight: '600' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>📖</span>
                                  {job.comicName || job.title}
                                </span>
                              </td>
                              <td style={{ padding: '16px' }}>{job.targetLang || 'unspecified'}</td>
                              <td style={{ padding: '16px', color: 'var(--mod-text-secondary)' }}>{job.deadline || 'unspecified'}</td>
                              <td style={{ padding: '16px' }}>
                                <span style={{
                                  background: statusBg,
                                  color: statusColor,
                                  border: `1px solid ${statusBorder}`,
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  display: 'inline-block'
                                }}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td style={{ padding: '16px', color: isUnclaimed ? 'var(--mod-text-secondary)' : '#ffffff' }}>
                                {isUnclaimed ? '—' : (job.leaderName || 'Assigning...')}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {jobsTotalPages > 1 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '12px',
                      marginTop: '20px',
                      padding: '10px 0'
                    }}>
                      <button
                        disabled={jobsCurrentPage === 1}
                        onClick={() => setJobsCurrentPage(prev => Math.max(1, prev - 1))}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: jobsCurrentPage === 1 ? 'rgba(255,255,255,0.2)' : 'white',
                          cursor: jobsCurrentPage === 1 ? 'not-allowed' : 'pointer',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                      >
                        Previous
                      </button>
                      <span style={{ fontSize: '13px', color: 'var(--mod-text-secondary)' }}>
                        Page <strong style={{ color: 'white' }}>{jobsCurrentPage}</strong> of {jobsTotalPages}
                      </span>
                      <button
                        disabled={jobsCurrentPage === jobsTotalPages}
                        onClick={() => setJobsCurrentPage(prev => Math.min(jobsTotalPages, prev + 1))}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: jobsCurrentPage === jobsTotalPages ? 'rgba(255,255,255,0.2)' : 'white',
                          cursor: jobsCurrentPage === jobsTotalPages ? 'not-allowed' : 'pointer',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )
            })()
          )}
        </div>
      )}

      {/* ── MODAL: CREATE PROJECT TEAM ──────────────── */}
      {showCreateTeamModal && (
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
                    <label className="mod-label">Comic / Series Name *</label>
                    <select 
                      className="mod-select-field"
                      value={createTeamForm.comicName}
                      onChange={(e) => setCreateTeamForm({ ...createTeamForm, comicName: e.target.value })}
                    >
                      <option value="">-- Select Comic to Translate --</option>
                      {comics.map(c => (
                        <option key={c.id} value={c.title}>{c.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mod-form-group">
                    <label className="mod-label">Deadline</label>
                    <input 
                      type="date" 
                      className="mod-input" 
                      value={createTeamForm.deadline}
                      onChange={(e) => setCreateTeamForm({ ...createTeamForm, deadline: e.target.value })}
                    />
                  </div>

                  <div className="mod-form-row">
                    <div className="mod-form-group">
                      <label className="mod-label">Source Language</label>
                      <select 
                        className="mod-select-field"
                        value={createTeamForm.sourceLang}
                        onChange={(e) => setCreateTeamForm({ ...createTeamForm, sourceLang: e.target.value })}
                      >
                        <option value="Japanese">Japanese</option>
                        <option value="Chinese">Chinese</option>
                        <option value="Korean">Korean</option>
                      </select>
                    </div>
                    
                    <div className="mod-form-group">
                      <label className="mod-label">Target Language</label>
                      <select 
                        className="mod-select-field"
                        value={createTeamForm.targetLang}
                        onChange={(e) => setCreateTeamForm({ ...createTeamForm, targetLang: e.target.value })}
                      >
                        <option value="English">English</option>
                        <option value="Vietnamese">Vietnamese</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* STEP 2: LEADER AND PRIORITY */
                <div className="fade-in">
                  <div className="mod-form-group">
                    <label className="mod-label">Assign Group Leader *</label>
                    <div className="leader-search-container">
                      <input 
                        type="text" 
                        className="mod-input"
                        placeholder="Search by name, username, or email..."
                        value={createLeaderSearch}
                        onChange={(e) => handleCreateLeaderSearch(e.target.value)}
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
                    </div>
                    {createTeamForm.leaderName && (
                      <div className="leader-selected-tag">
                        ✅ Selected: <strong>{createTeamForm.leaderName}</strong>
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
        </div>
      )}

      {/* ── MODAL: ASSIGN LEADER ─────────────────────── */}
      {showAssignModal && (
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
        </div>
      )}
    </div>
  )
}

export default ProjectTeams
