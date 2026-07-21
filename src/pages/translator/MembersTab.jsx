import { useState, useEffect } from 'react'
import { getTeamMembersApi } from '../../services/api/TeamWorkspaceApi'

// Maps one row from GET /{teamId}/members into the shape this tab renders.
// NOTE: adjust the field names on the right (m.xxx) if your actual member DTO
// uses different property names than what's assumed here.
// Backend DTO (GetTeamMembers -> TeamMemberDto) only sends { id, name, avatar }.
// role is derived client-side by comparing against the team's leaderName; status,
// joinDate and contributions aren't returned by this endpoint yet, so they show
// as placeholders until the backend adds them.
function mapTeamMember(m, leaderName) {
  const name = m.name || 'Unknown'
  const isLeader = !!leaderName && name.toLowerCase().trim() === leaderName.toLowerCase().trim()
  return {
    id: m.id,
    name,
    role: isLeader ? 'Group Leader' : 'Member',
    status: 'Active',
    joinDate: '—',
    contributions: '—',
    avatar: m.avatar || name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)
  }
}

// =============================================================================
// Tab 2: Members
// Self-contained: fetches its own roster from GET /{teamId}/members instead of
// depending on the parent having pre-loaded it.
// =============================================================================

function MembersTab({ teamId, leaderName, memberSearch, setMemberSearch, onMembersLoaded }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!teamId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    getTeamMembersApi(teamId) // GET /{teamId}/members
      .then((list) => {
        if (cancelled) return
        const raw = Array.isArray(list) ? list : []
        const mapped = raw.map((m) => mapTeamMember(m, leaderName))
        setMembers(mapped)
        onMembersLoaded?.(mapped)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Could not load team members:', err)
        setError('Failed to load members.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [teamId, leaderName])

  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()))

  return (
    <div className="members-tab-container fade-in">
      <div className="members-actions-bar">
        <input
          type="text"
          className="trans-form-input"
          placeholder="Search members..."
          style={{ maxWidth: '300px' }}
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
        />
        <span className="members-count-indicator">{members.length} members</span>
      </div>

      {loading ? (
        <p style={{ fontStyle: 'italic', color: 'var(--trans-text-muted)', textAlign: 'center', padding: '20px' }}>
          Loading members...
        </p>
      ) : error ? (
        <p style={{ color: '#f87171', textAlign: 'center', padding: '20px' }}>{error}</p>
      ) : (
        <div className="members-table-wrapper">
          <table className="members-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Join Date</th>
                <th>Contributions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member, idx) => (
                <tr key={member.id ?? idx}>
                  <td>
                    <div className="member-cell-info">
                      <div className="chat-avatar" style={{ background: member.role === 'Group Leader' ? '#f59e0b' : '', color: member.role === 'Group Leader' ? '#ffffff' : '' }}>
                        {member.avatar}
                      </div>
                      <div className="member-status-details">
                        <span className="member-name-text">{member.name}</span>
                        <div className="member-status-row">
                          <span className={`status-dot ${member.status.toLowerCase()}`}></span>
                          <span>{member.status}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`member-role-badge ${member.role === 'Group Leader' ? 'leader' : ''}`}>
                      {member.role}
                    </span>
                  </td>
                  <td style={{ color: 'var(--trans-text-secondary)' }}>{member.joinDate}</td>
                  <td style={{ fontWeight: '600' }}>{member.contributions}</td>
                  <td>
                    <button className="table-action-dots-btn">⋮</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MembersTab