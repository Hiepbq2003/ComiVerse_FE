import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { getTeamMembersApi } from '../../services/api/TeamWorkspaceApi'
import { getAuth } from '../../utils/Auth'
import { toast } from 'react-toastify'
import ModernPagination from '../../components/common/ModernPagination'

function MemberProfileModal({ member, onClose }) {
  if (!member) return null;
  return (
    <div className="trans-modal-overlay fade-in" onClick={onClose} style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
      <div className="trans-modal-card" onClick={e => e.stopPropagation()} style={{ width: '360px', padding: '0', overflow: 'hidden', background: '#1e1e2d', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)', padding: '30px 20px 24px', textAlign: 'center', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', transition: 'all 0.2s ease' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>×</button>
          
          <div className={`chat-avatar ${member.role === 'Group Leader' ? 'avatar-leader' : 'avatar-member'}`} style={{ width: '80px', height: '80px', fontSize: '32px', margin: '0 auto 15px', border: '3px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
            {member.avatar || (member.name || '').substring(0, 2).toUpperCase()}
          </div>
          
          <h3 style={{ margin: '0 0 8px', color: '#fff', fontSize: '20px', fontWeight: '600' }}>
            {member.role === 'Group Leader' && '👑 '}
            {member.name}
          </h3>
          <span className={`member-role-badge ${member.role === 'Group Leader' ? 'leader' : ''}`} style={{ display: 'inline-block', margin: '0 auto' }}>
            {member.role}
          </span>
        </div>
        
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#1e1e2d', maxHeight: '50vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-dot ${member.online ? 'active' : 'offline'}`} style={{ width: '8px', height: '8px' }}></span>
              <span style={{ color: '#f8fafc', fontSize: '13.5px', fontWeight: '500' }}>{formatMemberPresence(member)}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Join Date</span>
            <span style={{ color: '#f8fafc', fontSize: '13.5px', fontWeight: '500' }}>{member.joinDate}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Projects Joined</span>
            <span style={{ color: '#f8fafc', fontSize: '13.5px', fontWeight: '500' }}>{member.joinedProjectCount || 0}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Experience</span>
            <span style={{ color: '#f8fafc', fontSize: '13.5px', fontWeight: '500' }}>{member.experienceYears || 0} years</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Contributions</span>
            <span style={{ color: '#f8fafc', fontSize: '13.5px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>🏆</span> {member.contributions}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Revoked</span>
            <span style={{ color: '#ef4444', fontSize: '13.5px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px' }}>❌</span> {member.revoked}
            </span>
          </div>

          {member.specializations && member.specializations.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Specializations</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {member.specializations.map((spec, i) => (
                  <span key={i} style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c4b5fd', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {member.bio && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Bio</span>
              <textarea 
                readOnly 
                value={member.bio}
                style={{ 
                  color: '#e2e8f0', 
                  fontSize: '13px', 
                  margin: 0, 
                  lineHeight: 1.5,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '10px',
                  minHeight: '80px',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit'
                }} 
              />
            </div>
          )}

          {(member.phoneNumber || member.facebookUrl || member.cvUrl) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Contact & Links</span>
              {member.phoneNumber && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontSize: '13.5px' }}>
                  📞 {member.phoneNumber}
                </div>
              )}
              {member.facebookUrl && (
                <a href={member.facebookUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontSize: '13.5px', textDecoration: 'none' }}>
                  🌐 Facebook Profile
                </a>
              )}
              {member.cvUrl && (
                <a 
                  href={member.cvUrl}
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const res = await fetch(member.cvUrl);
                      if (!res.ok) throw new Error('Network error');
                      const blob = await res.blob();
                      // Force PDF mime type just in case
                      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                      const blobUrl = window.URL.createObjectURL(pdfBlob);
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = `CV_${member.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(blobUrl);
                    } catch (err) {
                      console.warn('CORS or fetch failed, falling back to new tab:', err);
                      window.open(member.cvUrl, '_blank');
                    }
                  }}
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '13.5px', textDecoration: 'none', cursor: 'pointer' }}
                >
                  📄 Download CV
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


export function mapTeamMember(m, leaderName) {
  const name = m?.name || m?.fullName || m?.username || 'Member'
  const isLeader = m?.role === 'Group Leader' || (!!leaderName && String(name).toLowerCase().trim() === String(leaderName).toLowerCase().trim())
  const online = m?.online === true
  const formattedJoinDate = m?.joinDate && new Date(m.joinDate).getTime() > 0 
    ? new Date(m.joinDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) 
    : 'Recent'

  return {
    id: m?.id || `mem-${Math.random()}`,
    name,
    role: isLeader ? 'Group Leader' : (m?.role || 'Member'),
    status: m?.status || (online ? 'Active' : 'Offline'),
    online,
    lastSeenAt: m?.lastSeenAt || null,
    joinDate: formattedJoinDate,
    contributions: m?.contributions || 0,
    revoked: m?.revoked || 0,
    avatar: m?.avatar || String(name).split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2),
    specializations: m?.specializations || [],
    experienceYears: m?.experienceYears || 0,
    phoneNumber: m?.phoneNumber || '',
    facebookUrl: m?.facebookUrl || '',
    cvUrl: m?.cvUrl || '',
    bio: m?.bio || '',
    joinedProjectCount: m?.joinedProjectCount || 0
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

export function getTaskPageCount(t) {
  if (!t) return 0
  if (typeof t.pagesCount === 'number' && t.pagesCount > 0) return t.pagesCount
  if (typeof t.pageCount === 'number' && t.pageCount > 0) return t.pageCount
  if (Array.isArray(t.pages) && t.pages.length > 0) return t.pages.length
  if (Array.isArray(t.images) && t.images.length > 0) return t.images.length
  if (t.chapter) {
    if (typeof t.chapter.pagesCount === 'number' && t.chapter.pagesCount > 0) return t.chapter.pagesCount
    if (typeof t.chapter.pageCount === 'number' && t.chapter.pageCount > 0) return t.chapter.pageCount
    if (Array.isArray(t.chapter.pages) && t.chapter.pages.length > 0) return t.chapter.pages.length
    if (Array.isArray(t.chapter.images) && t.chapter.images.length > 0) return t.chapter.images.length
  }
  return 24
}

// A task counts as "published" once its translation work is fully done —
// i.e. status reached "completed" in the kanban pipeline (backlog -> in_progress
// -> under_review -> completed). Contribution is calculated based on the total number of
// completed/published pages for each member.
function isPublishedTaskStatus(status) {
  const s = String(status || '').toLowerCase().trim()
  return s === 'completed' || s === 'done' || s === 'published'
}

function MembersTab({
  teamId,
  leaderName,
  isCurrentLeader,
  memberSearch = '',
  setMemberSearch,
  members: parentMembers = [],
  tasks = [],
  onMembersLoaded,
  onLeaveTeam,
  onRemoveMember,
  bannedUsers = [],
  onUnbanUser
}) {
  const [members, setMembers] = useState(parentMembers)
  const [loading, setLoading] = useState(parentMembers.length === 0)
  const [error, setError] = useState(null)
  const [activeDropdownMemberId, setActiveDropdownMemberId] = useState(null)
  const [activeProfileMember, setActiveProfileMember] = useState(null)
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
          contributions: 0,
          revoked: 0,
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

  // Count completed ("published") translated pages per member.
  // Supports granular per-page translator tracking (page.translatedBy / page.translatorId / task.pageContributions),
  // so if Member A translated pages 1..5 before quitting/reassignment, those 5 pages stay credited to Member A,
  // while Member B gets credited for pages translated by Member B.
  const { contributionCounts, revokedCounts } = useMemo(() => {
    const contributions = new Map()
    const revoked = new Map()

    ;(tasks || []).forEach(t => {
      if (!t) return

      const isTaskApproved = String(t.status).toLowerCase() === 'completed' || String(t.status).toLowerCase() === 'published' || isPublishedTaskStatus(t.status)
      const isTaskRevoked = String(t.status).toLowerCase() === 'revoked'
      let recordedPagesForTask = false

      // 1. Check if task has explicit pageContributions map
      if (t.pageContributions && typeof t.pageContributions === 'object') {
        Object.entries(t.pageContributions).forEach(([userId, pageCount]) => {
          if (userId && typeof pageCount === 'number' && pageCount > 0) {
            recordedPagesForTask = true
            const key = String(userId)
            if (isTaskRevoked) {
              revoked.set(key, (revoked.get(key) || 0) + pageCount)
            } else {
              contributions.set(key, (contributions.get(key) || 0) + pageCount)
            }
          }
        })
      }

      // 2. Check if task has pages with individual translatedBy/translatorId info
      if (!recordedPagesForTask && Array.isArray(t.pages) && t.pages.length > 0) {
        const pagesWithTranslator = t.pages.filter(p => p && (p.translatedBy || p.translatorId || p.completedBy))
        if (pagesWithTranslator.length > 0) {
          recordedPagesForTask = true
          t.pages.forEach(p => {
            if (!p) return
            const pStatus = String(p.status || '').toUpperCase()
            const isDone = pStatus === 'DONE' || isTaskApproved || isTaskRevoked
            if (isDone) {
              const translatedById = String(p.translatedBy || p.translatorId || p.completedBy || '')
              const assigneeId = String(t.assigneeId || '')
              
              const contributors = new Set()
              if (translatedById) contributors.add(translatedById)
              if (assigneeId) contributors.add(assigneeId)
              
              contributors.forEach(uid => {
                if (isTaskRevoked) {
                  revoked.set(uid, (revoked.get(uid) || 0) + 1)
                } else {
                  contributions.set(uid, (contributions.get(uid) || 0) + 1)
                }
              })
            }
          })
        }
      }

      // 3. Fallback
      if (!recordedPagesForTask && t.assigneeId && (isTaskApproved || isTaskRevoked)) {
        const key = String(t.assigneeId)
        const pageCount = getTaskPageCount(t)
        if (isTaskRevoked) {
          revoked.set(key, (revoked.get(key) || 0) + pageCount)
        } else {
          contributions.set(key, (contributions.get(key) || 0) + pageCount)
        }
      }
    })

    return { contributionCounts: contributions, revokedCounts: revoked }
  }, [tasks])

  const membersWithContributions = useMemo(() => {
    return members.map(m => {
      const contrib = contributionCounts.get(String(m.id)) || 0
      const rev = revokedCounts.get(String(m.id)) || 0
      return { 
        ...m, 
        contributions: contrib,
        revoked: rev
      }
    })
  }, [members, contributionCounts, revokedCounts])

  const teamLeader = membersWithContributions.find(m => m.role === 'Group Leader') || null

  // Filter & Sort logic — leader is shown separately above, so the table itself
  // only ever contains regular members now (no more pinning-to-top needed).
  const processedMembers = membersWithContributions
    .filter(m => m.role !== 'Group Leader')
    .filter(m => {
      const matchesSearch = m.name.toLowerCase().includes((memberSearch || '').toLowerCase())
      const count = parseInt(String(m.contributions || '0')) || 0
      const matchesContrib = contribFilter !== 'active' || count > 0
      return matchesSearch && matchesContrib
    })
    .sort((a, b) => {
      // 1. Sub-sorting by contributions if selected
      if (contribFilter === 'desc') {
        const countA = parseInt(String(a.contributions || '0')) || 0
        const countB = parseInt(String(b.contributions || '0')) || 0
        if (countB !== countA) return countB - countA
      } else if (contribFilter === 'asc') {
        const countA = parseInt(String(a.contributions || '0')) || 0
        const countB = parseInt(String(b.contributions || '0')) || 0
        if (countB !== countA) return countA - countB
      }

      // 2. Sub-sorting by Join Date
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
      {/* Group Leader — shown separately, not mixed into the members table */}
      {teamLeader && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '16px 20px',
            marginBottom: '16px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            cursor: 'pointer'
          }}
          onClick={() => setActiveProfileMember(teamLeader)}
        >
          <div className="chat-avatar avatar-leader">
            {teamLeader.avatar || teamLeader.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="member-status-details" style={{ flex: 1 }}>
            <span className="member-name-text">
              👑 {teamLeader.name} {teamLeader.name.toLowerCase().trim() === currentUserName && <small className="member-you-tag">(You)</small>}
            </span>
              <div className="member-status-row">
                {(() => {
                  const presenceText = formatMemberPresence(teamLeader);
                  const isActuallyOnline = presenceText === 'Active now';
                  return (
                    <>
                      <span className={`status-dot ${isActuallyOnline ? 'active' : 'offline'}`}></span>
                      <span className={`presence-text ${isActuallyOnline ? 'active' : ''}`}>{presenceText}</span>
                    </>
                  );
                })()}
              </div>
          </div>
          <span className="member-role-badge leader">Group Leader</span>
        </div>
      )}

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
            <option value="active">🏆 Contribution: Active (&gt; 0 contributions)</option>
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
                  <th style={{ textAlign: 'center' }}>Contributions</th>
                  <th style={{ textAlign: 'center' }}>Revoked</th>
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
                    <tr key={memberId} style={{ cursor: 'pointer' }} onClick={() => setActiveProfileMember(member)}>
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
                                {(() => {
                                  const presenceText = formatMemberPresence(member);
                                  const isActuallyOnline = presenceText === 'Active now';
                                  return (
                                    <>
                                      <span className={`status-dot ${isActuallyOnline ? 'active' : 'offline'}`}></span>
                                      <span className={`presence-text ${isActuallyOnline ? 'active' : ''}`}>{presenceText}</span>
                                    </>
                                  );
                                })()}
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
                      <td className="member-contributions" style={{ textAlign: 'center' }}>{member.contributions}</td>
                      <td className="member-revoked" style={{ color: '#ef4444', textAlign: 'center' }}>{member.revoked}</td>
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
          
          {activeProfileMember && createPortal(
            <MemberProfileModal 
              member={activeProfileMember} 
              onClose={() => setActiveProfileMember(null)} 
            />,
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

          {/* Banned Users Section for Leaders */}
          {isCurrentLeader && bannedUsers && bannedUsers.length > 0 && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <h4 style={{ color: '#ef4444', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🚫</span> Banned Users
              </h4>
              <div className="members-table-wrapper" style={{ opacity: 0.85 }}>
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Reason</th>
                      <th>Date Banned</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bannedUsers.map((ban, idx) => (
                      <tr key={ban.id || idx}>
                        <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{ban.userId}</td>
                        <td style={{ color: '#94a3b8', fontStyle: 'italic', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ban.reason}
                        </td>
                        <td className="member-join-date">
                          {ban.createdAt ? new Date(ban.createdAt).toLocaleDateString() : 'Unknown'}
                        </td>
                        <td className="member-actions-cell">
                          <button
                            className="trans-btn secondary"
                            onClick={() => onUnbanUser && onUnbanUser(ban.userId, 'User')}
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(16, 185, 129, 0.05)',
                              color: '#10b981',
                              borderColor: 'rgba(16, 185, 129, 0.3)',
                              fontSize: '12px'
                            }}
                          >
                            Unban
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default MembersTab