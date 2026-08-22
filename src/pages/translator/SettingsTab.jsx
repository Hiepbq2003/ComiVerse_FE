// =============================================================================
// Tab 5: Group Settings
// =============================================================================

export function normalizeProjectStatus(status) {
  const value = String(status || '').toLowerCase().trim();
  if (value === 'completed' || value === 'complete' || value === 'done') return 'completed';
  if (value === 'paused') return 'paused';
  return 'ongoing';
}

function SettingsTab({ selectedDetails, setSelectedDetails, members, onSaveWorkspaceSettings }) {
  const recruitedLimit = Number(selectedDetails.maxMembers) || 5;
  const totalCapacity = recruitedLimit + 1; // 1 Leader + N Members
  const currentMembersCount = members.length || selectedDetails.membersCount || 1;
  const spotsAvailable = Math.max(0, totalCapacity - currentMembersCount);
  const isOpen = selectedDetails.isRecruiting && spotsAvailable > 0;
  const projectStatus = normalizeProjectStatus(selectedDetails.status);

  return (
    <div className="group-settings-tab-container fade-in">
      <div className="settings-tab-card">
        <h3 className="settings-section-title">Group Information</h3>

        <div className="trans-form-group">
          <label className="trans-form-label">Group Name</label>
          <input
            type="text"
            className="trans-form-input"
            value={selectedDetails.team}
            onChange={(e) => setSelectedDetails({ ...selectedDetails, team: e.target.value })}
          />
        </div>

        <div className="trans-form-group" style={{ marginTop: '16px' }}>
          <label className="trans-form-label">Description</label>
          <textarea
            className="trans-form-input textarea"
            style={{ height: '150px' }}
            value={selectedDetails.description || ''}
            onChange={(e) => setSelectedDetails({ ...selectedDetails, description: e.target.value })}
          />
        </div>

        <button className="trans-btn primary" style={{ marginTop: '20px' }} onClick={onSaveWorkspaceSettings}>
          Save Changes
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="settings-tab-card" style={{ maxWidth: '100%' }}>
          <h3 className="settings-section-title">Project Settings</h3>

          <div className="trans-form-group">
            <label className="trans-form-label">Project Status</label>
            <select
              className="trans-form-input"
              value={projectStatus}
              onChange={(e) => setSelectedDetails({ ...selectedDetails, status: e.target.value })}
              onWheel={(e) => e.target.blur()}
            >
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="trans-form-group" style={{ marginTop: '16px' }}>
            <label className="trans-form-label">Recruitment Status</label>
            <select
              className="trans-form-input"
              value={(selectedDetails.isRecruiting && spotsAvailable > 0) ? "true" : "false"}
              onChange={(e) => setSelectedDetails({ ...selectedDetails, isRecruiting: e.target.value === "true" })}
              disabled={spotsAvailable <= 0}
              onWheel={(e) => e.target.blur()}
            >
              <option value="true">Open — recruiting new members</option>
              <option value="false">Closed — not accepting new members</option>
            </select>
            {spotsAvailable <= 0 && (
              <span style={{ fontSize: '12px', color: '#f87171', display: 'block', marginTop: '6px' }}>
                Team is at full capacity. Recruitment is automatically closed.
              </span>
            )}
          </div>

          <div className="trans-form-group" style={{ marginTop: '16px' }}>
            <label className="trans-form-label">Recruited Members Limit (Excluding Leader)</label>
            <input
              type="number"
              min="1"
              max="50"
              className="trans-form-input"
              value={selectedDetails.maxMembers || 5}
              onChange={(e) => setSelectedDetails({ ...selectedDetails, maxMembers: Math.max(1, Number(e.target.value) || 5) })}
            />
            <span style={{ fontSize: '12px', color: '#cbd5e1', display: 'block', marginTop: '6px' }}>
              💡 Total Capacity: <strong>{totalCapacity}</strong>
            </span>
          </div>

          <div className="trans-form-group" style={{ marginTop: '16px' }}>
            <label className="trans-form-label">Recruitment Urgency / Priority</label>
            <select
              className="trans-form-input"
              value={selectedDetails.priority || 'Medium'}
              onChange={(e) => setSelectedDetails({ ...selectedDetails, priority: e.target.value })}
              onWheel={(e) => e.target.blur()}
            >
              <option value="Urgent">🔥 Urgent (Recruiting Urgently)</option>
              <option value="High">🟠 High Priority</option>
              <option value="Medium">🟣 Medium Priority</option>
              <option value="Low">⚪ Low Priority</option>
            </select>
          </div>

          <div style={{ marginTop: '16px' }}>
            {isOpen ? (
              <div className="capacity-info-alert recruiting" style={{
                background: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.3)',
                color: '#34d399', padding: '10px 14px', borderRadius: '8px', fontSize: '13px'
              }}>
                <span>🟢 Open for Recruitment: <strong>{spotsAvailable}</strong> of {recruitedLimit} member spots available ({currentMembersCount}/{totalCapacity} total capacity)</span>
              </div>
            ) : selectedDetails.isRecruiting && spotsAvailable === 0 ? (
              <div className="capacity-info-alert full" style={{
                background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '13px'
              }}>
                <span>🔴 Team is FULL ({currentMembersCount}/{totalCapacity} total capacity, 0 member spots left)</span>
              </div>
            ) : (
              <div className="capacity-info-alert closed" style={{
                background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1', padding: '10px 14px', borderRadius: '8px', fontSize: '13px'
              }}>
                <span>⚪ Recruitment Closed ({currentMembersCount}/{totalCapacity} total members)</span>
              </div>
            )}
          </div>

          <button className="trans-btn primary" style={{ marginTop: '16px', width: '100%' }} onClick={onSaveWorkspaceSettings}>
            Save Project Settings
          </button>
        </div>

        <div className="settings-leader-card" style={{ maxWidth: '100%', marginTop: 0 }}>
          <h3 className="settings-section-title">Group Leader</h3>
          <div className="member-cell-info">
            <div className="chat-avatar" style={{ background: '#f59e0b', color: '#ffffff' }}>
              {selectedDetails.leaderInitials || 'TL'}
            </div>
            <div className="member-status-details">
              <span className="member-name-text">{selectedDetails.leaderName || 'No Leader'}</span>
              <span className="post-time" style={{ textTransform: 'uppercase', fontWeight: '700', fontSize: '9px', color: '#d97706' }}>
                Group Leader · {selectedDetails.chaptersCount || 0} chapters contributed
              </span>
            </div>
          </div>
          <p style={{ fontSize: '12.5px', color: 'var(--trans-text-muted)', margin: '14px 0 0' }}>
            All approved applicants are added to the Project Members list.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;