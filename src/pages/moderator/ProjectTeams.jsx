import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import '../../assets/style/moderator/project-teams.css'
import { toast } from 'react-toastify'
import { searchTranslatorsApi, searchProjectLeadersApi } from '../../services/api/AccountApi'
import { updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import ModernPagination from '../../components/common/ModernPagination'
import { useTheme } from '../../context/ThemeContext'
import { COMIC_LANGUAGE_OPTIONS } from '../../constants/comicLanguages'

const LANGUAGE_FLAGS = {
  'English': '🇬🇧',
  'Vietnamese': '🇻🇳',
  'Japanese': '🇯🇵',
  'Chinese': '🇨🇳',
  'Korean': '🇰🇷',
  'French': '🇫🇷',
  'Spanish': '🇪🇸'
}

const ALL_TARGET_LANGUAGES = COMIC_LANGUAGE_OPTIONS.map(lang => ({
  code: lang,
  label: `${LANGUAGE_FLAGS[lang] || '🏳️'} ${lang}`
}))

function ProjectTeams({
  projectTeams,
  setProjectTeams,
  comics = [],
  submissions = [],
  genres = [],
  showCreateTeamModal,
  setShowCreateTeamModal,
  createTeamStep,
  setCreateTeamStep,
  createTeamForm,
  setCreateTeamForm,
  handleCreateProjectTeam
}) {
  const { theme } = useTheme()
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 6
  const totalPages = Math.ceil(projectTeams.length / ITEMS_PER_PAGE)
  const activePage = Math.min(currentPage, Math.max(1, totalPages))
  const paginatedTeams = projectTeams.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE
  )

  // Create Project Team Filter & Auto-Populate States
  const [dateApprovedFilter, setDateApprovedFilter] = useState('today') // 'today' | '7days' | '30days' | 'all'
  const [selectedGenre, setSelectedGenre] = useState('all')
  const [comicSearchQuery, setComicSearchQuery] = useState('')

  const existingTargetLangsForSelectedComic = useMemo(() => {
    if (!createTeamForm.comicName) return new Set();
    const selNameLower = createTeamForm.comicName.toLowerCase().trim();

    const set = new Set();
    (projectTeams || []).forEach(team => {
      const teamComicLower = (team.comicName || team.comicTitle || team.linkedComic || '').toLowerCase().trim();
      if (teamComicLower && selNameLower && (teamComicLower === selNameLower || teamComicLower.includes(selNameLower) || selNameLower.includes(teamComicLower))) {
        const lang = team.targetLang || team.language;
        if (lang) {
          set.add(lang.toLowerCase().trim());
        }
      }
    });
    return set;
  }, [createTeamForm.comicName, projectTeams]);

  const availableTargetLanguages = useMemo(() => {
    const sourceLower = String(createTeamForm.sourceLang || 'Japanese').toLowerCase().trim();
    return ALL_TARGET_LANGUAGES.filter(langObj => {
      const codeLower = langObj.code.toLowerCase().trim();
      const isAlreadyAssigned = existingTargetLangsForSelectedComic.has(codeLower);
      const isSourceLang = codeLower === sourceLower || langObj.label.toLowerCase().trim() === sourceLower || langObj.label.toLowerCase().includes(sourceLower);
      return !isAlreadyAssigned && !isSourceLang;
    });
  }, [existingTargetLangsForSelectedComic, createTeamForm.sourceLang]);

  const genreOptions = useMemo(() => {
    if (Array.isArray(genres) && genres.length > 0) {
      return genres.map(g => (typeof g === 'string' ? g : g.name || g.title)).filter(Boolean);
    }
    return ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Romance', 'Sci-Fi', 'Slice of Life'];
  }, [genres]);

  const isSameDay = (d1, d2) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const allApprovedItems = useMemo(() => {
    const approvedFromSubmissions = (submissions || [])
      .filter(s => s.status === 'approved')
      .map(s => ({
        id: s.id,
        title: s.title,
        language: s.language || s.rawLanguage || 'Japanese',
        genre: s.genre || s.genres?.[0] || 'General',
        genres: s.genres || [s.genre || 'General'],
        status: 'approved',
        approvedAt: s.approvedAt || s.lastChapterUpdatedAt || s.timestamp || s.createdAt || null,
        lastChapterUpdatedAt: s.lastChapterUpdatedAt || s.approvedAt || s.timestamp || s.createdAt || null,
        createdAt: s.createdAt || s.timestamp || null
      }));

    const approvedFromComics = (comics || []).map(c => ({
      ...c,
      approvedAt: c.approvedAt || c.lastChapterUpdatedAt || c.createdAt || c.timestamp || null,
      lastChapterUpdatedAt: c.lastChapterUpdatedAt || c.approvedAt || c.createdAt || c.timestamp || null,
      createdAt: c.createdAt || c.timestamp || null
    }));

    const mergedMap = new Map();

    [...approvedFromSubmissions, ...approvedFromComics].forEach(item => {
      if (!item.title) return;
      const key = item.title.trim().toLowerCase();
      if (!mergedMap.has(key)) {
        mergedMap.set(key, item);
      } else {
        const existing = mergedMap.get(key);
        const existingDate = existing.approvedAt || existing.lastChapterUpdatedAt || existing.createdAt;
        const newDate = item.approvedAt || item.lastChapterUpdatedAt || item.createdAt;

        const eTime = existingDate ? new Date(existingDate).getTime() : 0;
        const nTime = newDate ? new Date(newDate).getTime() : 0;

        mergedMap.set(key, {
          ...existing,
          ...item,
          approvedAt: (nTime >= eTime && nTime > 0) ? newDate : (existingDate || newDate),
          lastChapterUpdatedAt: (nTime >= eTime && nTime > 0) ? newDate : (existingDate || newDate)
        });
      }
    });

    return Array.from(mergedMap.values());
  }, [submissions, comics]);

  const filteredApprovedComics = useMemo(() => {
    const now = new Date();

    return allApprovedItems.filter(c => {
      // 1. Filter out unapproved / pending / rejected items
      if (c.status && ['pending', 'rejected'].includes(c.status.toLowerCase())) {
        return false;
      }

      // 2. Date Approved Filter
      const rawDate = c.approvedAt || c.lastChapterUpdatedAt || c.createdAt || c.timestamp || c.date;
      const comicDate = rawDate ? new Date(rawDate) : null;

      if (dateApprovedFilter === 'today') {
        if (!comicDate || isNaN(comicDate.getTime()) || !isSameDay(comicDate, now)) return false;
      } else if (dateApprovedFilter === '7days') {
        if (!comicDate || isNaN(comicDate.getTime())) return false;
        const diffDays = Math.ceil(Math.abs(now - comicDate) / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      } else if (dateApprovedFilter === '30days') {
        if (!comicDate || isNaN(comicDate.getTime())) return false;
        const diffDays = Math.ceil(Math.abs(now - comicDate) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) return false;
      }

      // 3. Genre Filter
      if (selectedGenre !== 'all') {
        const cGenres = Array.isArray(c.genres) ? c.genres.join(' ') : (c.genre || '');
        if (!cGenres.toLowerCase().includes(selectedGenre.toLowerCase())) return false;
      }

      // 4. Title Search Filter
      if (comicSearchQuery.trim()) {
        if (!c.title.toLowerCase().includes(comicSearchQuery.toLowerCase().trim())) return false;
      }

      return true;
    });
  }, [allApprovedItems, dateApprovedFilter, selectedGenre, comicSearchQuery]);

  const availableComicsDropdown = useMemo(() => {
    return filteredApprovedComics;
  }, [filteredApprovedComics]);

  const handleSelectApprovedComic = (selectedTitle) => {
    const foundComic = allApprovedItems.find(c => c.title === selectedTitle);
    const autoSourceLang = foundComic?.language || foundComic?.rawLanguage || foundComic?.originalLanguage || 'Japanese';
    
    // Find remaining available target languages for this comic
    const takenLangs = new Set();
    const selNameLower = (selectedTitle || '').toLowerCase().trim();
    (projectTeams || []).forEach(team => {
      const teamComicLower = (team.comicName || team.comicTitle || team.linkedComic || '').toLowerCase().trim();
      if (teamComicLower && selNameLower && (teamComicLower === selNameLower || teamComicLower.includes(selNameLower) || selNameLower.includes(teamComicLower))) {
        const lang = team.targetLang || team.language;
        if (lang) takenLangs.add(lang.toLowerCase().trim());
      }
    });

    const sourceLower = String(autoSourceLang || 'Japanese').toLowerCase().trim();
    const remaining = ALL_TARGET_LANGUAGES.filter(l => {
      const codeLower = l.code.toLowerCase().trim();
      return !takenLangs.has(codeLower) && codeLower !== sourceLower && l.label.toLowerCase().trim() !== sourceLower && !l.label.toLowerCase().includes(sourceLower);
    });
    const firstAvailable = remaining.length > 0 ? remaining[0].code : '';

    const autoTitle = selectedTitle && firstAvailable ? `${selectedTitle} - ${firstAvailable} Translation Team` : '';

    setCreateTeamForm(prev => ({
      ...prev,
      comicName: selectedTitle,
      sourceLang: autoSourceLang,
      targetLang: firstAvailable,
      title: autoTitle,
      cover: foundComic?.cover || foundComic?.coverImage || foundComic?.coverImageUrl || foundComic?.coverUrl || prev?.cover || '',
      comicId: foundComic?.id || foundComic?.comicId || prev?.comicId || ''
    }));
  };

  // Auto-sync targetLang and Title if currently selected targetLang is unavailable or out of sync
  useEffect(() => {
    if (!createTeamForm.comicName || availableTargetLanguages.length === 0) return;

    const currentLangLower = (createTeamForm.targetLang || '').toLowerCase().trim();
    const isAvailable = availableTargetLanguages.some(l => l.code.toLowerCase().trim() === currentLangLower);

    if (!isAvailable) {
      const firstAvailable = availableTargetLanguages[0].code;
      const newTitle = `${createTeamForm.comicName} - ${firstAvailable} Translation Team`;
      setCreateTeamForm(prev => ({
        ...prev,
        targetLang: firstAvailable,
        title: newTitle
      }));
    }
  }, [createTeamForm.comicName, availableTargetLanguages, createTeamForm.targetLang, setCreateTeamForm]);

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
    setSearching(true)
    try {
      const data = await searchProjectLeadersApi(query)
      setLeaderSearchResults(data || [])
    } catch (err) {
      console.error(err)
      setLeaderSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleCreateLeaderSearch = async (query) => {
    setCreateLeaderSearch(query)
    try {
      const data = await searchProjectLeadersApi(query)
      setCreateLeaderResults(data || [])
    } catch (err) {
      console.error(err)
      setCreateLeaderResults([])
    }
  }

  useEffect(() => {
    if (showCreateTeamModal && createTeamStep === 2 && !selectedLeader) {
      handleCreateLeaderSearch(createLeaderSearch || '')
    }
  }, [showCreateTeamModal, createTeamStep])

  useEffect(() => {
    if (showAssignModal) {
      handleLeaderSearch(leaderSearch || '')
    }
  }, [showAssignModal])

  const openAssignLeaderModal = (team) => {
    if (team.leaderId || team.leaderName) {
      const isConfirmed = window.confirm(
        `⚠️ WARNING: This team already has a Leader (${team.leaderName}).\n\nAssigning a new leader will revoke their permissions and might disrupt ongoing translations. Are you sure you want to Reassign the leader?`
      );
      if (!isConfirmed) return;
    }
    setAssignTeamId(team.id)
    setLeaderSearch('')
    setShowAssignModal(true)
  }

  const sendLeaderNotification = (leaderId, leaderName, comicTitle, sourceLang, targetLang) => {
    const targetKey = leaderId || leaderName;
    if (!targetKey) return;

    const userKey = `comiverse_user_notifications_${targetKey}`;
    let existing = [];
    try {
      const raw = localStorage.getItem(userKey);
      if (raw) existing = JSON.parse(raw);
    } catch (e) {}

    const newNotif = {
      id: `notif-${Date.now()}`,
      title: '👑 Assigned as Group Leader',
      message: `You have been assigned as Group Leader for translation project '${comicTitle}' (${sourceLang} → ${targetLang}). Raw manuscript chapters are ready in your workspace backlog!`,
      actionUrl: '/translator/project-teams',
      targetUserId: String(targetKey),
      isRead: false,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem(userKey, JSON.stringify([newNotif, ...existing]));
    window.dispatchEvent(new Event('notification:refresh'));
  };

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

      sendLeaderNotification(
        translator.id,
        displayName,
        team.comicName || team.title,
        team.sourceLang || 'Japanese',
        team.targetLang || 'English'
      );

      setShowAssignModal(false)
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || (err.response?.status === 409 ? 'Conflict: Leader was already assigned by another moderator or team was modified.' : 'Failed to assign the project leader.'))
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
      toast.error(err.response?.status === 409 ? 'Conflict: Team status was already changed by another moderator.' : 'Failed to update team status on database.');
    }
  };

  const triggerOpenCreate = () => {
    setDateApprovedFilter('today')
    setSelectedGenre('all')
    setComicSearchQuery('')

    const initialComic = availableComicsDropdown[0] || null;
    const initialTitle = initialComic ? `${initialComic.title} - English Translation Team` : '';
    const initialSourceLang = initialComic?.language || initialComic?.rawLanguage || initialComic?.originalLanguage || 'Japanese';

    setCreateTeamForm({
      title: initialTitle,
      comicName: initialComic?.title || '',
      sourceLang: initialSourceLang,
      targetLang: 'English',
      leaderName: '',
      leaderId: '',
      priority: 'High',
      cover: initialComic?.cover || initialComic?.coverImage || initialComic?.coverImageUrl || initialComic?.coverUrl || '',
      comicId: initialComic?.id || initialComic?.comicId || ''
    })
    setCreateLeaderSearch('')
    setCreateLeaderResults([])
    setSelectedLeader(null)
    setCreateTeamStep(1)
    setShowCreateTeamModal(true)
    handleCreateLeaderSearch('')
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
                    onClick={() => openAssignLeaderModal(team)}
                  >
                    👤 {team.leaderName || team.leaderId ? 'Reassign' : 'Leader'}
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
          <div className="mod-modal-card wide" style={{ maxWidth: '840px', width: '92%' }}>
            <div className="mod-modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Create Project Team</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowCreateTeamModal(false)}>×</button>
            </div>

            <div className="mod-modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '420px', maxHeight: '75vh' }}>
              {createTeamStep === 1 ? (
                /* STEP 1: APPROVED COMIC SELECTOR & LANGUAGE CONFIG */
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Filter Ribbon: 3 Filters in 1 Single Row */}
                  <div style={{ padding: '10px 14px', borderRadius: '12px', background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#c084fc', letterSpacing: '0.5px' }}>
                      🔍 Filter Approved Comics Catalog
                    </span>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 2fr', gap: '10px', alignItems: 'center' }}>
                      {/* 1. Date Approved Filter */}
                      <div>
                        <label style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--mod-text-secondary)', display: 'block', marginBottom: '3px' }}>
                          📅 Date Approved
                        </label>
                        <select
                          className="mod-input select"
                          value={dateApprovedFilter}
                          onChange={(e) => setDateApprovedFilter(e.target.value)}
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                        >
                          <option value="today">📅 Today</option>
                          <option value="7days">🗓️ Last 7 Days</option>
                          <option value="30days">📆 Last 30 Days</option>
                          <option value="all">🌐 All Time</option>
                        </select>
                      </div>

                      {/* 2. Genre Filter */}
                      <div>
                        <label style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--mod-text-secondary)', display: 'block', marginBottom: '3px' }}>
                          🎭 Genre
                        </label>
                        <select
                          className="mod-input select"
                          value={selectedGenre}
                          onChange={(e) => setSelectedGenre(e.target.value)}
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                        >
                          <option value="all">All Genres</option>
                          {genreOptions.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      {/* 3. Search Title */}
                      <div>
                        <label style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--mod-text-secondary)', display: 'block', marginBottom: '3px' }}>
                          🔎 Search Comic Title
                        </label>
                        <input
                          type="text"
                          className="mod-input"
                          placeholder="Type comic title..."
                          value={comicSearchQuery}
                          onChange={(e) => setComicSearchQuery(e.target.value)}
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Select Approved Comic Dropdown */}
                  <div className="mod-form-group">
                    <label htmlFor="approved-comic-select" className="mod-label" style={{ marginBottom: '4px' }}>
                      Select Approved Comic *
                    </label>
                    
                    <select
                      id="approved-comic-select"
                      className="mod-input select"
                      value={createTeamForm.comicName}
                      onChange={(e) => handleSelectApprovedComic(e.target.value)}
                    >
                      {availableComicsDropdown.length === 0 ? (
                        <option value="">-- No Approved Comics Found for Selected Filters --</option>
                      ) : (
                        <>
                          <option value="">-- Choose Approved Comic ({availableComicsDropdown.length} Available) --</option>
                          {availableComicsDropdown.map((c) => (
                            <option key={c.id} value={c.title}>
                              📚 {c.title} · {c.language || 'Japanese'}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  {/* Source Language & Target Language Selector */}
                  <div className="mod-form-row">
                    <div className="mod-form-group half">
                      <label className="mod-label">Source Language 🔒</label>
                      <input
                        type="text"
                        className="mod-input"
                        value={createTeamForm.sourceLang || 'Japanese'}
                        disabled
                        readOnly
                        style={{ opacity: 0.85, cursor: 'not-allowed', fontWeight: '700', color: '#c084fc' }}
                      />
                    </div>

                    <div className="mod-form-group half">
                      <label htmlFor="target-language-select" className="mod-label">Target Language *</label>
                      {availableTargetLanguages.length > 0 ? (
                        <select
                          id="target-language-select"
                          className="mod-input select"
                          value={createTeamForm.targetLang}
                          onChange={(e) => {
                            const target = e.target.value;
                            setCreateTeamForm(prev => ({
                              ...prev,
                              targetLang: target,
                              title: prev.comicName ? `${prev.comicName} - ${target} Translation Team` : prev.title
                            }));
                          }}
                        >
                          {availableTargetLanguages.map(l => (
                            <option key={l.code} value={l.code}>{l.label}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}>
                          🚫 All 7 target languages already assigned to teams for this comic!
                        </div>
                      )}
                      {existingTargetLangsForSelectedComic.size > 0 && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: '500' }}>
                          🔒 Assigned Languages for this comic: <span style={{ color: '#c084fc', fontWeight: '700' }}>{Array.from(existingTargetLangsForSelectedComic).map(l => l.toUpperCase()).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Team Title */}
                  <div className="mod-form-group">
                    <label className="mod-label">Project Team Title *</label>
                    <input
                      type="text"
                      className="mod-input"
                      placeholder="e.g. Invincible Sword God - English Translation Team"
                      value={createTeamForm.title}
                      onChange={(e) => setCreateTeamForm({ ...createTeamForm, title: e.target.value })}
                    />
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
                          <span className="leader-result-name">
                            {selectedLeader.fullName || selectedLeader.username}
                          </span>
                          <span className="leader-result-email">{selectedLeader.email || 'Project Leader'}</span>
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
                          placeholder="Search Project Leader by name, username, or email..."
                          value={createLeaderSearch}
                          onChange={(e) => handleCreateLeaderSearch(e.target.value)}
                          autoFocus
                        />
                        {createLeaderResults.length > 0 && (
                          <div className="leader-search-results-list" style={{ marginTop: '12px', maxHeight: '330px', overflowY: 'auto' }}>
                            {createLeaderResults.map((t, idx) => (
                              <button
                                key={t.id || idx}
                                type="button"
                                className="leader-search-result-card"
                                onClick={() => selectCreateLeader(t)}
                              >
                                <span className="leader-result-avatar">{t.initials}</span>
                                <div className="leader-result-info">
                                  <span className="leader-result-name">
                                    {t.fullName || t.username}
                                  </span>
                                  <span className="leader-result-email">{t.email || 'Project Leader'}</span>
                                </div>
                                <span className="leader-result-assign-hint">Click to assign</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {createLeaderResults.length === 0 && (
                          <div className="leader-search-results-list" style={{ marginTop: '12px' }}>
                            <div className="leader-search-empty">No Project Leaders found matching "{createLeaderSearch}".</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px' }}>
              {/* Step indicator in footer */}
              <div className="mod-step-tracker-footer" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: '#c084fc', letterSpacing: '0.5px' }}>
                  STEP {createTeamStep} OF 2
                </span>
                <div style={{ width: '90px', height: '6px', borderRadius: '4px', background: theme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: createTeamStep === 1 ? '50%' : '100%', 
                      height: '100%', 
                      background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                      borderRadius: '4px',
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  disabled={(() => {
                    const isDisabled = createTeamStep === 1 && (!createTeamForm.comicName || !createTeamForm.title.trim() || availableTargetLanguages.length === 0);
                    if (isDisabled) console.log("DISABLED REASON:", { step: createTeamStep, comic: createTeamForm.comicName, title: createTeamForm.title, langLen: availableTargetLanguages.length });
                    return isDisabled;
                  })()}
                >
                  {createTeamStep === 1 ? 'Next →' : 'Create Team'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: ASSIGN LEADER ─────────────────────── */}
      {showAssignModal && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card wide" style={{ maxWidth: '640px', width: '90%' }}>
            <div className="mod-modal-header">
              <h3>👑 Assign Group Leader</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowAssignModal(false)}>×</button>
            </div>

            <div className="mod-modal-body" style={{ minHeight: '380px', maxHeight: '75vh', overflowY: 'auto' }}>
              <div className="mod-form-group">
                <label className="mod-label">Assign Group Leader *</label>
                <input 
                  type="text" 
                  className="mod-input"
                  placeholder="Type Project Leader username or email to search..."
                  value={leaderSearch}
                  onChange={(e) => handleLeaderSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="leader-search-results-list" style={{ maxHeight: '290px', overflowY: 'auto' }}>
                {searching && (
                  <div className="leader-search-empty">Searching Project Leaders...</div>
                )}
                {!searching && leaderSearchResults.length === 0 && (
                  <div className="leader-search-empty">No Project Leaders found matching "{leaderSearch}".</div>
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
                        <span className="leader-result-name">
                          {displayName}
                        </span>
                        <span className="leader-result-email">{t.email || 'Project Leader'}</span>
                      </div>
                      <span className="leader-result-assign-hint">Click to assign</span>
                    </button>
                  );
                })}
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
