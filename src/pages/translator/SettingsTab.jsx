// =============================================================================
// Tab 5: Group Settings
// =============================================================================

function SettingsTab({ selectedDetails, setSelectedDetails, members, onSaveWorkspaceSettings }) {
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
          <h3 className="settings-section-title">Recruitment & Capacity</h3>

          <div className="trans-form-group">
            <label className="trans-form-label">Recruitment Status</label>
            <select
              className="trans-form-input"
              value={selectedDetails.isRecruiting ? "true" : "false"}
              onChange={(e) => setSelectedDetails({ ...selectedDetails, isRecruiting: e.target.value === "true" })}
            >
              <option value="true">Open — recruiting new members (Visible in pool)</option>
              <option value="false">Closed — not accepting new members</option>
            </select>
          </div>

          <div className="trans-form-group" style={{ marginTop: '16px' }}>
            <label className="trans-form-label">Max Members Limit</label>
            <input
              type="number"
              min="1"
              max="50"
              className="trans-form-input"
              value={selectedDetails.maxMembers || 5}
              onChange={(e) => setSelectedDetails({ ...selectedDetails, maxMembers: Math.max(1, Number(e.target.value) || 5) })}
            />
          </div>

          <div className="trans-form-group" style={{ marginTop: '16px' }}>
            <label className="trans-form-label">Recruitment Urgency / Priority</label>
            <select
              className="trans-form-input"
              value={selectedDetails.priority || 'Medium'}
              onChange={(e) => setSelectedDetails({ ...selectedDetails, priority: e.target.value })}
            >
              <option value="Urgent">🔥 Urgent (Recruiting Urgently)</option>
              <option value="High">🟠 High Priority</option>
              <option value="Medium">🟣 Medium Priority</option>
              <option value="Low">⚪ Low Priority</option>
            </select>
          </div>

          <div style={{ marginTop: '16px' }}>
            {selectedDetails.isRecruiting ? (
              (selectedDetails.maxMembers || 5) - members.length > 0 ? (
                <div className="capacity-info-alert recruiting" style={{
                  background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)',
                  color: '#4ade80', padding: '10px 14px', borderRadius: '6px', fontSize: '13px'
                }}>
                  <span>🟢 Open Recruiting: <strong>{Math.max(0, (selectedDetails.maxMembers || 5) - members.length)}</strong> spots available to join</span>
                </div>
              ) : (
                <div className="capacity-info-alert full" style={{
                  background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: '#f87171', padding: '10px 14px', borderRadius: '6px', fontSize: '13px'
                }}>
                  <span>🔴 Team is full (0 spots available)</span>
                </div>
              )
            ) : (
              <div className="capacity-info-alert full" style={{
                background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94a3b8', padding: '10px 14px', borderRadius: '6px', fontSize: '13px'
              }}>
                <span>⚪ Recruitment Closed</span>
              </div>
            )}
          </div>

          <button className="trans-btn primary" style={{ marginTop: '16px', width: '100%' }} onClick={onSaveWorkspaceSettings}>
            Save Recruitment Settings
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
            All other members are assigned as Member. Roles are managed automatically.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SettingsTab