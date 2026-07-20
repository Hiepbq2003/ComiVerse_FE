import { useState } from 'react'
import { createPortal } from 'react-dom'
import '../../assets/style/moderator/comic-management.css'
import ModernButton from '../../components/common/ModernButton'
import { SkeletonLoader } from '../../components/common/SkeletonLoader'
import { createTranslationRequestApi } from '../../services/api/TranslationPoolApi'
import { toast } from 'react-toastify'
import { updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { updateComicApi } from '../../services/api/ComicApi'
import { getChaptersByComicIdApi, deleteChapterApi } from '../../services/api/ChapterApi'

function ComicManagement({ comics, projectTeams, genres, handleSaveEditComic, handleArchiveComic, handleTriggerAssignTeam, fetchAllData }) {
  // Search & Filters local states
  const [comicSearch, setComicSearch] = useState('')
  const [comicStatusFilter, setComicStatusFilter] = useState('All Status')
  const [comicGenreFilter, setComicGenreFilter] = useState('All Genres')
  const [comicAuthorFilter, setComicAuthorFilter] = useState('All Authors')
  const [comicTeamFilter, setComicTeamFilter] = useState('All Project Teams')
  const [viewsSort, setViewsSort] = useState('All Views')
  const [comicTimeFilter, setComicTimeFilter] = useState('All Time')
  const [chapterUpdateSort, setChapterUpdateSort] = useState('Sort by Update Time')

  // Archive confirmation modal states
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [comicToArchive, setComicToArchive] = useState(null)

  // Edit modal local states
  const [editingComic, setEditingComic] = useState(null)
  const [editComicForm, setEditComicForm] = useState({
    title: '',
    author: '',
    status: 'Ongoing',
    genres: ''
  })

  // Translation Request modal states
  const AVAILABLE_LANGUAGES = ['English', 'Vietnamese', 'Japanese', 'Korean', 'Chinese', 'Spanish', 'French', 'Thai']
  const [showTransReqModal, setShowTransReqModal] = useState(false)
  const [transReqComic, setTransReqComic] = useState(null)
  const [transReqForm, setTransReqForm] = useState({
    sourceLang: 'Japanese',
    targetLanguages: [],
    priority: 'Medium',
    deadline: '',
    notes: ''
  })

  // Direct Assignment modal states
  const [showDirectAssignModal, setShowDirectAssignModal] = useState(false)
  const [directAssignComic, setDirectAssignComic] = useState(null)
  const [directAssignForm, setDirectAssignForm] = useState({
    targetLang: '',
    deadline: ''
  })
  const [selectedTeamId, setSelectedTeamId] = useState('')

  // Chapter Management modal states
  const [showChaptersModal, setShowChaptersModal] = useState(false)
  const [chaptersComic, setChaptersComic] = useState(null)
  const [chaptersList, setChaptersList] = useState([])
  const [chaptersLoading, setChaptersLoading] = useState(false)

  const openChaptersModal = async (comic) => {
    setChaptersComic(comic)
    setChaptersList([])
    setChaptersLoading(true)
    setShowChaptersModal(true)
    try {
      const response = await getChaptersByComicIdApi(comic.id)
      const data = response?.data?.data || response?.data || response || []
      setChaptersList(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error('Failed to load chapters.')
    } finally {
      setChaptersLoading(false)
    }
  }

  const handleDeleteChapter = async (chapterId) => {
    if (!window.confirm('Are you sure you want to delete this chapter? This action cannot be undone.')) {
      return
    }
    try {
      await deleteChapterApi(chapterId)
      toast.success('Chapter deleted successfully!')
      // Refresh the chapters list
      if (chaptersComic) {
        const response = await getChaptersByComicIdApi(chaptersComic.id)
        const data = response?.data?.data || response?.data || response || []
        setChaptersList(Array.isArray(data) ? data : [])
      }
      // Refresh the main comics table to update the chapter count!
      if (fetchAllData) {
        fetchAllData()
      }
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete chapter.'
      toast.error(message)
    }
  }

  const openTranslationRequestModal = (comic) => {
    setTransReqComic(comic)
    setTransReqForm({
      sourceLang: 'Japanese',
      targetLanguages: [],
      priority: 'Medium',
      deadline: '',
      notes: ''
    })
    setShowTransReqModal(true)
  }

  const toggleTargetLang = (lang) => {
    setTransReqForm(prev => ({
      ...prev,
      targetLanguages: prev.targetLanguages.includes(lang)
        ? prev.targetLanguages.filter(l => l !== lang)
        : [...prev.targetLanguages, lang]
    }))
  }

  const handleSubmitTranslationRequest = async () => {
    if (!transReqComic || transReqForm.targetLanguages.length === 0) {
      toast.warn('Please select at least one target language.')
      return
    }
    try {
      await createTranslationRequestApi({
        comicId: transReqComic.id,
        comicTitle: transReqComic.title,
        sourceLang: transReqForm.sourceLang,
        targetLanguages: transReqForm.targetLanguages,
        priority: transReqForm.priority,
        deadline: transReqForm.deadline || null,
        notes: transReqForm.notes.trim() || null
      })
      toast.success(`Translation request submitted for ${transReqForm.targetLanguages.length} language(s)!`)
      setShowTransReqModal(false)
      if (fetchAllData) {
        await fetchAllData()
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit translation request.')
    }
  }

  const openDirectAssignModal = (comic) => {
    const existing = projectTeams
      ? projectTeams.filter(t => t.comicName && t.comicName.toLowerCase() === comic.title.toLowerCase())
      : [];
    const availableLangs = AVAILABLE_LANGUAGES.filter(lang => 
      !existing.some(t => t.targetLang && t.targetLang.toLowerCase() === lang.toLowerCase())
    );

    setDirectAssignComic(comic)
    setDirectAssignForm({
      targetLang: availableLangs[0] || '',
      deadline: ''
    })
    setSelectedTeamId('')
    setShowDirectAssignModal(true)
  }

  const handleSubmitDirectAssignment = async () => {
    if (!directAssignForm.targetLang) {
      toast.warn('Please select a target language.')
      return
    }

    if (!selectedTeamId) {
      toast.warn('Please select a project team.')
      return
    }

    const selectedTeamObj = projectTeams.find(t => t.id === selectedTeamId)
    if (!selectedTeamObj) return

    try {
      await updateProjectTeamApi(selectedTeamId, {
        ...selectedTeamObj,
        comicName: directAssignComic.title,
        targetLang: directAssignForm.targetLang,
        status: 'PENDING',
        deadline: directAssignForm.deadline || 'unspecified'
      })

      await updateComicApi(directAssignComic.id, {
        ...directAssignComic,
        projectTeam: selectedTeamObj.title
      })

      toast.success(`Successfully assigned team ${selectedTeamObj.title} for ${directAssignForm.targetLang} (pending leader approval)!`)
      setShowDirectAssignModal(false)
      if (fetchAllData) {
        await fetchAllData()
      } else if (handleSaveEditComic) {
        handleSaveEditComic(directAssignComic.id, { projectTeam: selectedTeamObj.title })
      } else {
        window.location.reload()
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to assign project team.')
    }
  }

  const openEditModal = (comic) => {
    setEditingComic(comic)
    setEditComicForm({
      title: comic.title,
      author: comic.authorName || comic.author || '',
      status: comic.status,
      genres: comic.genres.map(g => typeof g === 'object' && g !== null ? g.name : g).join(', ')
    })
  }

  const saveEditModal = () => {
    if (!editingComic) return
    const inputGenreNames = editComicForm.genres.split(',').map(g => g.trim().toLowerCase()).filter(Boolean)
    const matchedGenreIds = (genres || [])
      .filter(g => inputGenreNames.includes((g.name || '').toLowerCase()))
      .map(g => g.id)

    const updatedData = {
      title: editComicForm.title.trim(),
      authorName: editComicForm.author.trim(),
      status: editComicForm.status?.toUpperCase(),
      genreIds: matchedGenreIds
    }
    handleSaveEditComic(editingComic.id, updatedData)
    setEditingComic(null)
  }

  return (
    <div className="fade-in">
      <div className="comic-mgmt-header">
        <div className="moderator-page-header">
          <h1>Comic Management</h1>
          <p>Browse catalog comics, edit details, archive, or assign translator teams.</p>
        </div>
      </div>

      {/* Statistics overview cards row */}
      <div className="mod-stats-cards-row" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="mod-stat-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Total Comics</span>
            <svg viewBox="0 0 100 30" className="stat-sparkline" style={{ width: '50px', height: '18px', color: 'var(--mod-purple)', opacity: 0.7 }}>
              <path d="M0 20 Q 25 5, 50 15 T 100 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stat-value">{comics.length}</span>
        </div>
        <div className="mod-stat-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Ongoing</span>
            <svg viewBox="0 0 100 30" className="stat-sparkline" style={{ width: '50px', height: '18px', color: 'var(--mod-green)', opacity: 0.7 }}>
              <path d="M0 25 C 20 25, 40 5, 60 10 C 80 15, 90 2, 100 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stat-value active-count">{comics.filter(c => c.status?.toUpperCase() === 'ONGOING').length}</span>
        </div>
        <div className="mod-stat-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Completed</span>
            <svg viewBox="0 0 100 30" className="stat-sparkline" style={{ width: '50px', height: '18px', color: '#3b82f6', opacity: 0.7 }}>
              <path d="M0 25 C 30 25, 50 20, 70 8 C 85 2, 95 10, 100 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stat-value" style={{ color: '#3b82f6' }}>{comics.filter(c => c.status?.toUpperCase() === 'COMPLETED').length}</span>
        </div>
        <div className="mod-stat-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Paused</span>
            <svg viewBox="0 0 100 30" className="stat-sparkline" style={{ width: '50px', height: '18px', color: '#d97706', opacity: 0.7 }}>
              <path d="M0 10 C 20 10, 40 25, 60 20 C 80 15, 90 25, 100 25" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stat-value paused-count">{comics.filter(c => c.status?.toUpperCase() === 'PAUSED').length}</span>
        </div>
      </div>

      <div className="comic-search-filter-row">
        <div className="comic-search-input-wrapper">
          <input 
            type="text" 
            className="comic-search-input" 
            placeholder="Search comics, authors, project teams..." 
            value={comicSearch}
            onChange={(e) => setComicSearch(e.target.value)}
          />
        </div>
        
        <div className="comic-filters-group">
          <select 
            className="moderator-select"
            value={comicStatusFilter}
            onChange={(e) => setComicStatusFilter(e.target.value)}
          >
            <option>All Status</option>
            <option>Ongoing</option>
            <option>Paused</option>
            <option>Completed</option>
          </select>

          <select 
            className="moderator-select"
            value={comicGenreFilter}
            onChange={(e) => setComicGenreFilter(e.target.value)}
          >
            <option>All Genres</option>
            {genres && genres.map((g) => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>

          <select 
            className="moderator-select"
            value={comicAuthorFilter}
            onChange={(e) => setComicAuthorFilter(e.target.value)}
          >
            <option>All Authors</option>
            {Array.from(new Set(comics.map(c => c.authorName || c.author).filter(Boolean))).map((author, idx) => (
              <option key={idx} value={author}>{author}</option>
            ))}
          </select>

          <select 
            className="moderator-select"
            value={comicTeamFilter}
            onChange={(e) => setComicTeamFilter(e.target.value)}
          >
            <option>All Project Teams</option>
            {Array.from(new Set(comics.map(c => c.projectTeam).filter(t => t !== '-'))).map((team, idx) => (
              <option key={idx} value={team}>{team}</option>
            ))}
          </select>

          <select 
            className="moderator-select"
            value={viewsSort}
            onChange={(e) => setViewsSort(e.target.value)}
          >
            <option>All Views</option>
            <option>Most Viewed</option>
            <option>Least Viewed</option>
          </select>

          <select 
            className="moderator-select"
            value={comicTimeFilter}
            onChange={(e) => setComicTimeFilter(e.target.value)}
          >
            <option>All Time</option>
            <option>Updated Today</option>
            <option>Updated Last 7 Days</option>
            <option>Updated Last 30 Days</option>
          </select>

          <select 
            className="moderator-select"
            value={chapterUpdateSort}
            onChange={(e) => setChapterUpdateSort(e.target.value)}
          >
            <option>Sort by Update Time</option>
            <option>Newest Chapters First</option>
            <option>Oldest Chapters First</option>
          </select>
        </div>
      </div>

      <div className="comic-table-card">
        <table className="comic-table">
          <thead>
            <tr>
              <th>Comic</th>
              <th>Author</th>
              <th>Project Team</th>
              <th>Chapters</th>
              <th>Views</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {comics
              .filter(c => {
                const searchLower = comicSearch.toLowerCase();
                const matchesSearch = c.title.toLowerCase().includes(searchLower) ||
                  (c.authorName || '').toLowerCase().includes(searchLower) ||
                  (c.author || '').toLowerCase().includes(searchLower) ||
                  c.projectTeam.toLowerCase().includes(searchLower);
                
                const matchesStatus = comicStatusFilter === 'All Status' || c.status?.toUpperCase() === comicStatusFilter.toUpperCase();
                const matchesGenre = comicGenreFilter === 'All Genres' || c.genres.some(g => (typeof g === 'object' && g !== null ? g.name : g) === comicGenreFilter);
                const matchesAuthor = comicAuthorFilter === 'All Authors' || c.authorName === comicAuthorFilter || c.author === comicAuthorFilter;
                const matchesTeam = comicTeamFilter === 'All Project Teams' || c.projectTeam === comicTeamFilter;

                let matchesTime = true;
                if (comicTimeFilter !== 'All Time') {
                  const targetTime = c.lastChapterUpdatedAt || c.createdAt || c.timestamp;
                  if (targetTime) {
                    const updateDate = new Date(targetTime);
                    const now = new Date();
                    if (comicTimeFilter === 'Updated Today') {
                      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                      matchesTime = updateDate >= oneDayAgo;
                    } else if (comicTimeFilter === 'Updated Last 7 Days') {
                      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                      matchesTime = updateDate >= sevenDaysAgo;
                    } else if (comicTimeFilter === 'Updated Last 30 Days') {
                      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                      matchesTime = updateDate >= thirtyDaysAgo;
                    }
                  } else {
                    matchesTime = false;
                  }
                }

                return matchesSearch && matchesStatus && matchesGenre && matchesAuthor && matchesTeam && matchesTime;
              })
              .sort((a, b) => {
                if (chapterUpdateSort === 'Newest Chapters First') {
                  const tA = new Date(a.lastChapterUpdatedAt || a.createdAt || a.timestamp || 0).getTime();
                  const tB = new Date(b.lastChapterUpdatedAt || b.createdAt || b.timestamp || 0).getTime();
                  return tB - tA;
                } else if (chapterUpdateSort === 'Oldest Chapters First') {
                  const tA = new Date(a.lastChapterUpdatedAt || a.createdAt || a.timestamp || 0).getTime();
                  const tB = new Date(b.lastChapterUpdatedAt || b.createdAt || b.timestamp || 0).getTime();
                  return tA - tB;
                }

                const aViews = a.viewCount !== undefined ? a.viewCount : (a.views || 0);
                const bViews = b.viewCount !== undefined ? b.viewCount : (b.views || 0);
                if (viewsSort === 'Most Viewed') {
                  return bViews - aViews;
                } else if (viewsSort === 'Least Viewed') {
                  return aViews - bViews;
                }
                return 0;
              })
              .map(comic => (
                <tr key={comic.id}>
                  <td>
                    <div className="comic-cell-info">
                      <div className="comic-cell-thumbnail">
                        {(comic.cover || comic.coverImageUrl) ? (
                          <img 
                            src={comic.cover || comic.coverImageUrl} 
                            alt={comic.title} 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML = comic.title.toLowerCase().includes('sword') ? '⚔️' : comic.title.toLowerCase().includes('spirit') ? '🔮' : comic.title.toLowerCase().includes('demon') ? '👑' : '📚';
                            }}
                          />
                        ) : (
                          comic.title.toLowerCase().includes('sword') ? '⚔️' : comic.title.toLowerCase().includes('spirit') ? '🔮' : comic.title.toLowerCase().includes('demon') ? '👑' : '📚'
                        )}
                      </div>
                      <div className="comic-cell-details">
                        <span className="comic-cell-title">{comic.title}</span>
                        <div className="comic-cell-genres">
                          {comic.genres.map((g, idx) => (
                            <span key={idx} className="comic-genre-tag">
                              {typeof g === 'object' && g !== null ? g.name : g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{comic.authorName || comic.author || 'Original Author'}</td>
                  <td>
                    {comic.projectTeam === '-' ? (
                      <span style={{ color: 'var(--mod-text-muted)', fontSize: '13px' }}>Unassigned</span>
                    ) : (
                      <span style={{ fontWeight: '500' }}>{comic.projectTeam}</span>
                    )}
                  </td>
                  <td>
                    <strong>{comic.chapterCount !== undefined ? comic.chapterCount : (comic.chapters || 0)}</strong>
                    {comic.lastChapterUpdatedAt && (
                      <div style={{ fontSize: '11px', color: 'var(--mod-text-secondary)', marginTop: '4px' }}>
                        🕒 {new Date(comic.lastChapterUpdatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </td>
                  <td>{comic.viewCount !== undefined ? comic.viewCount : (comic.views || 0)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#f59e0b' }}>
                      <span style={{ fontSize: '15px' }}>★</span>
                      <span>{comic.ratingAverage !== undefined ? comic.ratingAverage.toFixed(1) : (comic.rating !== undefined ? comic.rating.toFixed(1) : '0.0')}</span>
                      <span style={{ fontSize: '11px', color: 'var(--mod-text-secondary)', fontWeight: 'normal' }}>
                        ({comic.ratingCount || 0})
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`comic-status-badge ${comic.status.toLowerCase()}`}>
                      {comic.status}
                    </span>
                  </td>
                  <td>
                    <div className="comic-actions-cell">
                      <ModernButton 
                        variant={2} 
                        label="📖 Chapters" 
                        className="btn-view"
                        onClick={() => openChaptersModal(comic)} 
                      />
                      <ModernButton 
                        variant={2} 
                        label="📝 Edit" 
                        className="btn-edit"
                        onClick={() => openEditModal(comic)} 
                      />
                      <ModernButton 
                        variant={5} 
                        label="🗑️ Archive" 
                        className="btn-archive"
                        onClick={() => { setComicToArchive(comic); setShowArchiveModal(true); }} 
                      />
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ── MODAL: EDIT COMIC INFO ─────────────────── */}
      {editingComic && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card">
            <div className="mod-modal-header">
              <h3>Edit Comic Information</h3>
              <button className="mod-modal-close-btn" onClick={() => setEditingComic(null)}>×</button>
            </div>

            <div className="mod-modal-body">
              <div className="mod-form-group">
                <label className="mod-label">Comic Title *</label>
                <input 
                  type="text" 
                  className="mod-input" 
                  value={editComicForm.title}
                  onChange={(e) => setEditComicForm({ ...editComicForm, title: e.target.value })}
                />
              </div>

              <div className="mod-form-group">
                <label className="mod-label">Author Name</label>
                <input 
                  type="text" 
                  className="mod-input" 
                  value={editComicForm.author}
                  onChange={(e) => setEditComicForm({ ...editComicForm, author: e.target.value })}
                />
              </div>

              <div className="mod-form-row">
                <div className="mod-form-group">
                  <label className="mod-label">Status</label>
                  <select 
                    className="mod-select-field"
                    value={editComicForm.status}
                    onChange={(e) => setEditComicForm({ ...editComicForm, status: e.target.value })}
                  >
                    <option value="ONGOING">Ongoing</option>
                    <option value="PAUSED">Paused</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div className="mod-form-group">
                <label className="mod-label">Genres (Comma separated)</label>
                <input 
                  type="text" 
                  className="mod-input" 
                  placeholder="e.g. Action, Fantasy, Cultivation"
                  value={editComicForm.genres}
                  onChange={(e) => setEditComicForm({ ...editComicForm, genres: e.target.value })}
                />
                {genres && genres.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <label className="mod-label" style={{ fontSize: '12px', color: 'var(--mod-text-secondary)', marginBottom: '6px', display: 'block' }}>
                       Or select from registered genres (Click to toggle):
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                      {genres.map((g) => {
                        const activeGenres = editComicForm.genres
                          .split(',')
                          .map((item) => item.trim().toLowerCase())
                          .filter(Boolean);
                        const isActive = activeGenres.includes(g.name.toLowerCase());
                        return (
                          <span
                            key={g.id}
                            onClick={() => {
                              const currentList = editComicForm.genres
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean);
                              
                              let newList;
                              if (isActive) {
                                newList = currentList.filter(
                                  (item) => item.toLowerCase() !== g.name.toLowerCase()
                                );
                              } else {
                                newList = [...currentList, g.name];
                              }
                              setEditComicForm({
                                ...editComicForm,
                                genres: newList.join(', ')
                              });
                            }}
                            style={{
                              background: isActive
                                ? 'rgba(168, 85, 247, 0.2)'
                                : 'rgba(255, 255, 255, 0.03)',
                              border: isActive
                                ? '1px solid #c084fc'
                                : '1px solid rgba(255, 255, 255, 0.08)',
                              color: isActive ? '#c084fc' : '#cbd5e1',
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {g.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={2} 
                label="Cancel" 
                className="btn-cancel"
                onClick={() => setEditingComic(null)} 
                style={{ width: '130px' }}
              />
              <ModernButton 
                variant={2} 
                label="Save Changes" 
                onClick={saveEditModal}
                disabled={!editComicForm.title.trim()}
                style={{ width: '130px' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: REQUEST TRANSLATION ─────────────── */}
      {showTransReqModal && transReqComic && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card" style={{ maxWidth: '560px' }}>
            <div className="mod-modal-header">
              <h3>🌐 Request Translation</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowTransReqModal(false)}>×</button>
            </div>

            <div className="mod-modal-body">
              {/* Comic info */}
              <div className="mod-form-group">
                <label className="mod-label">Comic</label>
                <div className="trans-req-comic-name">{transReqComic.title}</div>
              </div>

              {/* Source Language */}
              <div className="mod-form-group">
                <label className="mod-label">Source Language</label>
                <select 
                  className="mod-select-field"
                  value={transReqForm.sourceLang}
                  onChange={(e) => setTransReqForm({ ...transReqForm, sourceLang: e.target.value })}
                >
                  {AVAILABLE_LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              {/* Target Languages - Checkbox Grid */}
              <div className="mod-form-group">
                <label className="mod-label">Target Languages <span style={{ fontSize: '11px', color: 'var(--mod-text-secondary)' }}>(select one or more)</span></label>
                <div className="lang-checkbox-grid">
                  {AVAILABLE_LANGUAGES
                    .filter(lang => lang !== transReqForm.sourceLang)
                    .filter(lang => {
                      const existing = projectTeams
                        ? projectTeams.filter(t => t.comicName && transReqComic && t.comicName.toLowerCase() === transReqComic.title.toLowerCase())
                        : [];
                      const isAlreadyTranslated = existing.some(t => t.targetLang && t.targetLang.toLowerCase() === lang.toLowerCase());
                      return !isAlreadyTranslated;
                    })
                    .map(lang => (
                      <button
                        key={lang}
                        type="button"
                        className={`lang-checkbox-item ${transReqForm.targetLanguages.includes(lang) ? 'checked' : ''}`}
                        onClick={() => toggleTargetLang(lang)}
                      >
                        <span className="lang-checkbox-tick">{transReqForm.targetLanguages.includes(lang) ? '✓' : ''}</span>
                        {lang}
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Priority & Deadline row */}
              <div className="mod-form-row">
                <div className="mod-form-group">
                  <label className="mod-label">Priority</label>
                  <select 
                    className="mod-select-field"
                    value={transReqForm.priority}
                    onChange={(e) => setTransReqForm({ ...transReqForm, priority: e.target.value })}
                  >
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🟢 Low</option>
                  </select>
                </div>
                <div className="mod-form-group">
                  <label className="mod-label">Deadline</label>
                  <input 
                    type="date" 
                    className="mod-input"
                    value={transReqForm.deadline}
                    onChange={(e) => setTransReqForm({ ...transReqForm, deadline: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="mod-form-group">
                <label className="mod-label">Notes for Translator (optional)</label>
                <textarea 
                  className="mod-textarea"
                  rows="3"
                  placeholder="Any special instructions, terminology guides, or context..."
                  value={transReqForm.notes}
                  onChange={(e) => setTransReqForm({ ...transReqForm, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={5} 
                label="Cancel" 
                onClick={() => setShowTransReqModal(false)} 
              />
              <ModernButton 
                variant={2} 
                label={`Submit Request (${transReqForm.targetLanguages.length} language${transReqForm.targetLanguages.length !== 1 ? 's' : ''})`} 
                onClick={handleSubmitTranslationRequest}
                disabled={transReqForm.targetLanguages.length === 0}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: DIRECT ASSIGN TEAM ────────────────── */}
      {showDirectAssignModal && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card" style={{ maxWidth: '520px' }}>
            <div className="mod-modal-header">
              <h3>🔗 Assign Translation Team</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowDirectAssignModal(false)}>×</button>
            </div>

            <div className="mod-modal-body">
              <div className="mod-form-group">
                <label className="mod-label">Comic / Series Name</label>
                <input 
                  type="text" 
                  className="mod-input" 
                  value={directAssignComic?.title || ''} 
                  disabled 
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
              </div>

              {/* Target Language */}
              <div className="mod-form-group">
                <label className="mod-label">Target Language *</label>
                {AVAILABLE_LANGUAGES.filter(lang => {
                  const existing = projectTeams
                    ? projectTeams.filter(t => t.comicName && directAssignComic && t.comicName.toLowerCase() === directAssignComic.title.toLowerCase())
                    : [];
                  return !existing.some(t => t.targetLang && t.targetLang.toLowerCase() === lang.toLowerCase());
                }).length === 0 ? (
                  <p style={{ color: 'var(--mod-red)', fontSize: '13px', margin: '4px 0 0' }}>
                    ⚠️ This comic has already been assigned/requested in all available target languages.
                  </p>
                ) : (
                  <select 
                    className="mod-select-field"
                    value={directAssignForm.targetLang}
                    onChange={(e) => setDirectAssignForm({ ...directAssignForm, targetLang: e.target.value })}
                  >
                    {AVAILABLE_LANGUAGES.filter(lang => {
                      const existing = projectTeams
                        ? projectTeams.filter(t => t.comicName && directAssignComic && t.comicName.toLowerCase() === directAssignComic.title.toLowerCase())
                        : [];
                      return !existing.some(t => t.targetLang && t.targetLang.toLowerCase() === lang.toLowerCase());
                    }).map(lang => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Deadline */}
              <div className="mod-form-group">
                <label className="mod-label">Deadline</label>
                <input 
                  type="date" 
                  className="mod-input"
                  value={directAssignForm.deadline}
                  onChange={(e) => setDirectAssignForm({ ...directAssignForm, deadline: e.target.value })}
                />
              </div>

              {/* EXISTING TEAM SELECTION */}
              <div className="mod-form-group">
                <label className="mod-label">Select Existing Project Team *</label>
                {projectTeams && projectTeams.length === 0 ? (
                  <p style={{ color: 'var(--mod-text-secondary)', fontSize: '13px' }}>No teams available.</p>
                ) : (
                  <select
                    className="mod-select-field"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
                    <option value="">-- Choose a Project Team --</option>
                    {projectTeams && projectTeams
                      .filter(t => !t.status || t.status.toUpperCase() !== 'UNCLAIMED')
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.title} {t.leaderName ? `(Leader: ${t.leaderName})` : '(No Leader)'} {t.comicName && t.comicName !== '-' ? `[translating ${t.comicName}]` : '[Idle]'}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={5} 
                label="Cancel" 
                onClick={() => setShowDirectAssignModal(false)} 
              />
              <ModernButton 
                variant={2} 
                label="Confirm Assignment" 
                onClick={handleSubmitDirectAssignment}
                disabled={!directAssignForm.targetLang || !selectedTeamId}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* ── MODAL: MANAGE CHAPTERS ─────────────── */}
      {showChaptersModal && chaptersComic && createPortal(
        <div className="mod-modal-overlay">
          <div className="mod-modal-card" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="mod-modal-header">
              <h3>📖 Chapters of {chaptersComic.title}</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowChaptersModal(false)}>×</button>
            </div>

            <div className="mod-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {chaptersLoading ? (
                <SkeletonLoader count={5} height={40} style={{ marginBottom: '10px' }} />
              ) : chaptersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--mod-text-secondary)' }}>
                  No chapters found for this comic.
                </div>
              ) : (
                <table className="mod-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--mod-border)' }}>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Chapter #</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Title</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Created Date</th>
                      <th style={{ textAlign: 'left', padding: '12px' }}>Views</th>
                      <th style={{ textAlign: 'right', padding: '12px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chaptersList.map((chap) => (
                      <tr key={chap.id} style={{ borderBottom: '1px solid var(--mod-border)' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>Chapter {chap.chapterNumber}</td>
                        <td style={{ padding: '12px' }}>{chap.title || <span style={{ color: 'var(--mod-text-muted)', fontStyle: 'italic' }}>Untitled</span>}</td>
                        <td style={{ padding: '12px' }}>
                          <span className={`comic-status-badge ${chap.isPremium ? 'paused' : 'ongoing'}`} style={{ fontSize: '11px', padding: '2px 6px' }}>
                            {chap.isPremium ? 'Premium' : 'Free'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px' }}>
                          {chap.createdAt ? new Date(chap.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                        </td>
                        <td style={{ padding: '12px' }}>{chap.viewCount || 0}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <ModernButton 
                            variant={5} 
                            label="🗑️ Delete" 
                            className="btn-archive"
                            onClick={() => handleDeleteChapter(chap.id)}
                            style={{ height: '30px', minHeight: '30px', minWidth: '70px', padding: '0 10px', fontSize: '12px' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 0 0' }}>
              <ModernButton 
                variant={2} 
                label="Close" 
                className="btn-cancel"
                onClick={() => setShowChaptersModal(false)}
                style={{ width: '100px' }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* ── MODAL: ARCHIVE COMIC CONFIRMATION ───────── */}
      {showArchiveModal && comicToArchive && createPortal(
        <div className="mod-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="mod-modal-card" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div className="mod-modal-body" style={{ padding: '28px 20px' }}>
              <div style={{ fontSize: '42px', marginBottom: '16px' }}>🗑️</div>
              <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: 'white' }}>Archive Comic</h3>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--mod-text-secondary)', lineHeight: '1.5' }}>
                Are you sure you want to archive the comic <strong style={{ color: 'white' }}>"{comicToArchive.title}"</strong>?
                This will soft-delete the comic catalog entry.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center' }}>
                 <ModernButton 
                   variant={5} 
                   label="Cancel" 
                   onClick={() => {
                     setShowArchiveModal(false)
                     setComicToArchive(null)
                   }} 
                 />
                 <ModernButton 
                   variant={2} 
                   label="Archive" 
                   className="btn-archive"
                   onClick={() => {
                     handleArchiveComic(comicToArchive.id)
                     setShowArchiveModal(false)
                     setComicToArchive(null)
                   }} 
                 />
               </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ComicManagement
