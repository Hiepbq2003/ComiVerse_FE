import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getTeamMembersApi } from '../../services/api/TeamWorkspaceApi'
import { getAuth } from '../../utils/Auth'
import { toast } from 'react-toastify'
import ModernPagination from '../../components/common/ModernPagination'

export function mapTeamMember(m, leaderName) {
  const name = m?.name || m?.fullName || m?.username || 'Member'
  const isLeader = m?.role === 'Group Leader' || (!!leaderName && String(name).toLowerCase().trim() === String(leaderName).toLowerCase().trim())
  const online = m?.online === true
  return {
    id: m?.id || `mem-${Math.random()}`,
    name,
    role: isLeader ? 'Group Leader' : (m?.role || 'Member'),
    status: m?.status || (online ? 'Active' : 'Offline'),
    online,
    lastSeenAt: m?.lastSeenAt || null,
    joinDate: m?.joinDate || '—',
    contributions: m?.contributions || '0 chapters',
    avatar: m?.avatar || String(name).split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)
  }
}

export function formatMemberPresence(member, now = Date.now()) {
  if (member?.online) return 'Active now'
  if (!member?.lastSeenAt) return 'Offline'

  const lastSeen = new Date(member.lastSeenAt).getTime()
  if (!Number.isFinite(lastSeen)) return 'Offline'

  const elapsedSeconds = Math.max(0, Math.floor((now - lastSeen) / 1000))
  if (elapsedSeconds < 60) return 'Offline · just now'

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)
  if (elapsedMinutes < 60) return `Offline · ${elapsedMinutes}m ago`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `Offline · ${elapsedHours}h ago`

  const elapsedDays = Math.floor(elapsedHours / 24)
  return `Offline · ${elapsedDays}d ago`
}

function MembersTab({
  teamId,
  leaderName,
  isCurrentLeader,
  memberSearch = '',
  setMemberSearch,
  members: parentMembers = [],
  onMembersLoaded,
  onLeaveTeam,
  onRemoveMember,
}) {
  const [members, setMembers] = useState(parentMembers)
  const [loading, setLoading] = useState(parentMembers.length === 0)
  const [error, setError] = useState(null)
  const [activeDropdownMemberId, setActiveDropdownMemberId] = useState(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })
  const dotsBtnRefs = useRef({})
  const onMembersLoadedRef = useRef(onMembersLoaded)

  // Filters & Sorting state
  const [joinDateSort, setJoinDateSort] = useState('newest')
  const [contribFilter, setContribFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const authUser = getAuth()?.user
  const currentUserName = (authUser?.fullName || authUser?.username || '').toLowerCase().trim()

  useEffect(() => {
    onMembersLoadedRef.current = onMembersLoaded
  }, [onMembersLoaded])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMembers(current => [...current])
    }, 60000)
    return () => window.clearInterval(intervalId)
  }, [])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [memberSearch, joinDateSort, contribFilter])

  // Sync parent members state (e.g. when approving new applicants)
  useEffect(() => {
    if (parentMembers && parentMembers.length > 0) {
      const mapped = parentMembers.map(m => mapTeamMember(m, leaderName))
      setMembers(current => {
        const currentById = new Map(current.map(member => [String(member.id), member]))
        return mapped.map(member => {
          const existing = currentById.get(String(member.id))
          if (!existing || typeof parentMembers.find(item => String(item.id) === String(member.id))?.online === 'boolean') {
            return member
          }
          return {
            ...member,
            online: existing.online,
            status: existing.status,
            lastSeenAt: existing.lastSeenAt,
          }
        })
      })
      setLoading(false)
    }
  }, [parentMembers, leaderName])

  // Presence is refreshed while this tab is open; relative time updates separately above.
  useEffect(() => {
    if (!teamId) return
    let cancelled = false
    const showInitialLoader = parentMembers.length === 0
    if (showInitialLoader) setLoading(true)
    setError(null)

    const loadMembers = () => getTeamMembersApi(teamId)
      .then(list => {
        if (cancelled) return
        const raw = Array.isArray(list) ? list : []

        // Get active auth user for leader fallback name
        const authUser = getAuth()?.user;
        const actualLeaderName = leaderName || authUser?.fullName || authUser?.username || 'Group Leader';
        const leaderInitials = (actualLeaderName || 'TL').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);

        const initialLeader = {
          id: `leader-${teamId}`,
          name: actualLeaderName,
          role: 'Group Leader',
          status: 'Offline',
          online: false,
          joinDate: '01/15/2024',
          contributions: '0 chapters',
          avatar: leaderInitials
        };

        // Load saved approved members from LocalStorage for this team
        let savedApproved = [];
        try {
          const rawSaved = localStorage.getItem(`comiverse_approved_members_${teamId}`);
          if (rawSaved) savedApproved = JSON.parse(rawSaved);
        } catch (e) {}

        const memberMap = new Map();

        // 1. Always put Leader first
        memberMap.set(actualLeaderName.toLowerCase().trim(), initialLeader);

        // 2. Put raw backend members
        raw.forEach(m => {
          if (m && (m.name || m.fullName || m.username)) {
            const mName = m.name || m.fullName || m.username;
            const key = mName.toLowerCase().trim();
            const existing = memberMap.get(key);
            memberMap.set(key, existing ? { ...existing, ...m, name: mName } : { ...m, name: mName });
          }
        });

        // 3. Put saved approved members
        savedApproved.forEach(m => {
          if (m && (m.name || m.fullName || m.username)) {
            const mName = m.name || m.fullName || m.username;
            const key = mName.toLowerCase().trim();
            const existing = memberMap.get(key);
            memberMap.set(key, existing ? { ...existing, ...m, name: mName } : { ...m, name: mName });
          }
        });

        // 4. Put parentMembers
        (parentMembers || []).forEach(m => {
          if (m && (m.name || m.fullName || m.username)) {
            const mName = m.name || m.fullName || m.username;
            const key = mName.toLowerCase().trim();
            const existing = memberMap.get(key);
            memberMap.set(key, existing ? { ...existing, ...m, name: mName } : { ...m, name: mName });
          }
        });

        const mapped = Array.from(memberMap.values()).map((m) => mapTeamMember(m, actualLeaderName));
        setMembers(mapped)
        onMembersLoadedRef.current?.(mapped)
        setError(null)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Could not load team members:', err)
        if (showInitialLoader) setError('Failed to load members.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    loadMembers()
    const pollInterval = window.setInterval(loadMembers, 15000)
    const handleFocus = () => loadMembers()
    window.addEventListener('focus', handleFocus)

    return () => {
      cancelled = true
      window.clearInterval(pollInterval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [teamId, leaderName, parentMembers.length])

  // Close dropdown on scroll or outside click
  useEffect(() => {
    if (!activeDropdownMemberId) return
    const handleClose = () => setActiveDropdownMemberId(null)
    window.addEventListener('scroll', handleClose, true)
    return () => window.removeEventListener('scroll', handleClose, true)
  }, [activeDropdownMemberId])

  // Filter & Sort logic (Group Leader is ALWAYS pinned to top!)
  const processedMembers = members
    .filter(m => {
      const matchesSearch = m.name.toLowerCase().includes((memberSearch || '').toLowerCase())
      const count = parseInt(String(m.contributions || '0')) || 0
      const matchesContrib = contribFilter !== 'active' || count > 0
      return matchesSearch && matchesContrib
    })
    .sort((a, b) => {
      // 1. Group Leader ALWAYS stays at the very top
      if (a.role === 'Group Leader' && b.role !== 'Group Leader') return -1
      if (a.role !== 'Group Leader' && b.role === 'Group Leader') return 1

      // 2. Sub-sorting for other members by contributions if selected
      if (contribFilter === 'desc') {
        const countA = parseInt(String(a.contributions || '0')) || 0
        const countB = parseInt(String(b.contributions || '0')) || 0
        if (countB !== countA) return countB - countA
      } else if (contribFilter === 'asc') {
        const countA = parseInt(String(a.contributions || '0')) || 0
        const countB = parseInt(String(b.contributions || '0')) || 0
        if (countB !== countA) return countA - countB
      }

      // 3. Sub-sorting by Join Date
      if (joinDateSort === 'oldest') {
        const dateA = new Date(a.joinDate).getTime() || 0
        const dateB = new Date(b.joinDate).getTime() || 0
        return dateA - dateB
      } else {
        const dateA = new Date(a.joinDate).getTime() || 0
        const dateB = new Date(b.joinDate).getTime() || 0
        return dateB - dateA
      }
    })

  // Pagination calculations (10 per page)
  const totalPages = Math.max(1, Math.ceil(processedMembers.length / ITEMS_PER_PAGE))
  const displayedMembers = processedMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleToggleDropdown = useCallback((memberId, e) => {
    e.stopPropagation()
    if (activeDropdownMemberId === memberId) {
      setActiveDropdownMemberId(null)
      return
    }
    const btnEl = dotsBtnRefs.current[memberId]
    if (btnEl) {
      const rect = btnEl.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.right - 180,
      })
    }
    setActiveDropdownMemberId(memberId)
  }, [activeDropdownMemberId])

  const handleLeaveClick = (member) => {
    setActiveDropdownMemberId(null)
    if (window.confirm(`Are you sure you want to leave this project team?`)) {
      if (onLeaveTeam) {
        onLeaveTeam(teamId)
      } else {
        toast.info('You have left the team.')
      }
    }
  }

  const handleRemoveClick = (member) => {
    setActiveDropdownMemberId(null)
    if (window.confirm(`Are you sure you want to remove ${member.name} from the team?`)) {
      if (onRemoveMember) {
        onRemoveMember(teamId, member.id, member.name)
      } else {
        setMembers(prev => prev.filter(m => m.id !== member.id))
        toast.success(`Removed ${member.name} from the team.`)
      }
    }
  }

  // Find data for active dropdown to render in portal
  const activeDropdownMember = activeDropdownMemberId
    ? displayedMembers.find((m, idx) => (m.id ?? idx) === activeDropdownMemberId)
    : null
  const activeIsMe = activeDropdownMember
    ? activeDropdownMember.name.toLowerCase().trim() === currentUserName
    : false
  const activeCanLeave = activeIsMe && activeDropdownMember?.role !== 'Group Leader'
  const activeCanRemove = isCurrentLeader && !activeIsMe && activeDropdownMember?.role !== 'Group Leader'

  return (
    <div className="members-tab-container fade-in" onClick={() => setActiveDropdownMemberId(null)}>
      {/* Search & Filter Toolbar */}
      <div className="members-actions-bar">
        <div className="members-filter-group">
          <input
            type="text"
            className="trans-form-input members-search-input"
            placeholder="Search members..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />

          <select
            className="trans-form-input members-filter-select"
            value={joinDateSort}
            onChange={(e) => setJoinDateSort(e.target.value)}
          >
            <option value="newest">📅 Join Date: Newest First</option>
            <option value="oldest">📅 Join Date: Oldest First</option>
          </select>

          <select
            className="trans-form-input members-sort-select"
            value={contribFilter}
            onChange={(e) => setContribFilter(e.target.value)}
          >
            <option value="all">🏆 Contribution: All</option>
            <option value="desc">🏆 Contribution: High to Low</option>
            <option value="asc">🏆 Contribution: Low to High</option>
            <option value="active">🏆 Contribution: Active (&gt; 0 chapters)</option>
          </select>
        </div>

        <span className="members-count-indicator">
          {processedMembers.length} member{processedMembers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <p className="members-status-text">Loading members...</p>
      ) : error ? (
        <p className="members-error-text">{error}</p>
      ) : processedMembers.length === 0 ? (
        <p className="members-status-text">No members found matching filters.</p>
      ) : (
        <>
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
                {displayedMembers.map((member, idx) => {
                  const memberId = member?.id ?? idx
                  const memName = String(member?.name || member?.fullName || member?.username || 'Member')
                  const isMe = memName.toLowerCase().trim() === currentUserName
                  const canLeave = isMe && member?.role !== 'Group Leader'
                  const canRemove = isCurrentLeader && !isMe && member?.role !== 'Group Leader'
                  const statusClass = String(member?.status || (member?.online ? 'active' : 'offline')).toLowerCase()

                  return (
                    <tr key={memberId}>
                      <td>
                        <div className="member-cell-info">
                          <div className={`chat-avatar ${member?.role === 'Group Leader' ? 'avatar-leader' : 'avatar-member'}`}>
                            {member?.avatar || memName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="member-status-details">
                            <span className="member-name-text">
                              {memName} {isMe && <small className="member-you-tag">(You)</small>}
                            </span>
                            <div className="member-status-row">
                              <span className={`status-dot ${statusClass}`}></span>
                              <span>{formatMemberPresence(member)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`member-role-badge ${member.role === 'Group Leader' ? 'leader' : ''}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="member-join-date">{member.joinDate}</td>
                      <td className="member-contributions">{member.contributions}</td>
                      <td className="member-actions-cell">
                        {(canLeave || canRemove) && (
                          <button
                            ref={el => { dotsBtnRefs.current[memberId] = el }}
                            className={`table-action-dots-btn ${activeDropdownMemberId === memberId ? 'active' : ''}`}
                            onClick={(e) => handleToggleDropdown(memberId, e)}
                          >
                            ⋮
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Fixed-position dropdown rendered via portal to avoid overflow clipping */}
          {activeDropdownMemberId && activeDropdownMember && (activeCanLeave || activeCanRemove) && createPortal(
            <>
              <div className="member-dropdown-backdrop" onClick={() => setActiveDropdownMemberId(null)} />
              <div
                className="member-action-dropdown"
                style={{ top: dropdownPos.top, left: dropdownPos.left }}
                onClick={(e) => e.stopPropagation()}
              >
                {activeCanLeave && (
                  <button
                    className="member-dropdown-btn member-dropdown-btn--danger"
                    onClick={() => handleLeaveClick(activeDropdownMember)}
                  >
                    🚪 Leave Project Team
                  </button>
                )}
                {activeCanRemove && (
                  <button
                    className="member-dropdown-btn member-dropdown-btn--danger"
                    onClick={() => handleRemoveClick(activeDropdownMember)}
                  >
                    ❌ Remove Member
                  </button>
                )}
              </div>
            </>,
            document.body
          )}

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="members-pagination-wrapper">
              <ModernPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                variant="pills"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default MembersTab
