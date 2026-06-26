import { useState } from 'react'

function ProjectTeams({
  projectTeams,
  setProjectTeams,
  comics,
  availableTranslators,
  showCreateTeamModal,
  setShowCreateTeamModal,
  createTeamStep,
  setCreateTeamStep,
  createTeamForm,
  setCreateTeamForm,
  handleCreateProjectTeam,
  handleRemoveProjectTeam
}) {

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

      {/* Stats Summary row */}
      <div className="mod-stats-cards-row">
        <div className="mod-stat-overview-card">
          <span className="stat-label">Total Projects</span>
          <span className="stat-value">{projectTeams.length}</span>
        </div>
        <div className="mod-stat-overview-card">
          <span className="stat-label">Active</span>
          <span className="stat-value active-count">{projectTeams.filter(t => t.status === 'Active').length}</span>
        </div>
        <div className="mod-stat-overview-card">
          <span className="stat-label">Paused</span>
          <span className="stat-value paused-count">{projectTeams.filter(t => t.status === 'Paused').length}</span>
        </div>
      </div>

      {/* Project Teams Cards list */}
      <div className="project-team-cards-list">
        {projectTeams.length === 0 ? (
          <div className="moderator-empty-state">
            <h3>No translation project teams</h3>
            <p>Click "Create Project Team" on the top right to start a new project team.</p>
          </div>
        ) : (
          projectTeams.map(team => (
            <div className="project-team-row-card" key={team.id}>
              <div className="project-team-card-header">
                <div>
                  <div className="project-team-card-title-group">
                    <h3>{team.title}</h3>
                    <span className={`comic-status-badge ${team.status.toLowerCase()}`}>
                      {team.status}
                    </span>
                    <span className={`priority-badge ${team.priority.toLowerCase()}`} style={{ textTransform: 'capitalize', fontSize: '11px', padding: '2px 8px' }}>
                      {team.priority} Priority
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
                    onClick={() => {
                      const newLeader = prompt(`Enter new group leader name (Available: ${availableTranslators.map(t => t.name).join(', ')}):`, team.leaderName);
                      if (newLeader && newLeader.trim()) {
                        setProjectTeams(prev =>
                          prev.map(t =>
                            t.id === team.id
                              ? {
                                  ...t,
                                  leaderName: newLeader.trim(),
                                  leaderInitials: newLeader.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                }
                              : t
                          )
                        );
                      }
                    }}
                  >
                    👑 Assign Leader
                  </button>
                  <button 
                    className="comic-btn-action archive"
                    onClick={() => handleRemoveProjectTeam(team.id, team.title, team.comicName)}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="project-team-progress-section">
                <div className="project-team-progress-header">
                  <span>Translation & Review Progress</span>
                  <span>{team.progress}%</span>
                </div>
                <div className="project-team-progress-bar-bg">
                  <div 
                    className="project-team-progress-bar-fill"
                    style={{ width: `${team.progress}%` }}
                  />
                </div>
              </div>

              {/* Footer: Group Leader profile & Deadline */}
              <div className="project-team-card-footer">
                <div className="project-team-leader-info">
                  <div className="project-team-leader-avatar">
                    {team.leaderInitials}
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
          ))
        )}
      </div>

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
                    <select 
                      className="mod-select-field"
                      value={createTeamForm.leaderName}
                      onChange={(e) => setCreateTeamForm({ ...createTeamForm, leaderName: e.target.value })}
                    >
                      {availableTranslators.map((t, idx) => (
                        <option key={idx} value={t.name}>{t.name} ({t.initials})</option>
                      ))}
                    </select>
                  </div>

                  <div className="mod-form-group">
                    <label className="mod-label">Translation Priority *</label>
                    <select 
                      className="mod-select-field"
                      value={createTeamForm.priority}
                      onChange={(e) => setCreateTeamForm({ ...createTeamForm, priority: e.target.value })}
                    >
                      <option value="High">🔴 High Priority (Rushed)</option>
                      <option value="Medium">🟡 Medium Priority (Normal)</option>
                      <option value="Low">🟢 Low Priority (Casual)</option>
                    </select>
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
    </div>
  )
}

export default ProjectTeams
