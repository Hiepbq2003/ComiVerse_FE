import { useState } from 'react'
import '../../assets/style/moderator/comic-management.css'
import { createTranslationRequestApi } from '../../services/api/TranslationPoolApi'
import { toast } from 'react-toastify'
import { updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { updateComicApi } from '../../services/api/ComicApi'

function ComicManagement({ comics, projectTeams, handleSaveEditComic, handleArchiveComic, handleTriggerAssignTeam, fetchAllData }) {
  // Search & Filters local states
  const [comicSearch, setComicSearch] = useState('')
  const [comicStatusFilter, setComicStatusFilter] = useState('All Status')
  const [comicGenreFilter, setComicGenreFilter] = useState('All Genres')
  const [comicAuthorFilter, setComicAuthorFilter] = useState('All Authors')
  const [comicTeamFilter, setComicTeamFilter] = useState('All Project Teams')

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
      author: comic.author,
      status: comic.status,
      genres: comic.genres.join(', ')
    })
  }

  const saveEditModal = () => {
    if (!editingComic) return
    const updatedData = {
      title: editComicForm.title.trim(),
      author: editComicForm.author.trim(),
      status: editComicForm.status,
      genres: editComicForm.genres.split(',').map(g => g.trim()).filter(Boolean)
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
            {['Action', 'Fantasy', 'Adventure', 'Mystery', 'Cultivation', 'Drama', 'Martial Arts'].map((g, idx) => (
              <option key={idx} value={g}>{g}</option>
            ))}
          </select>

          <select 
            className="moderator-select"
            value={comicAuthorFilter}
            onChange={(e) => setComicAuthorFilter(e.target.value)}
          >
            <option>All Authors</option>
            {Array.from(new Set(comics.map(c => c.author))).map((author, idx) => (
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
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {comics
              .filter(c => {
                const searchLower = comicSearch.toLowerCase();
                const matchesSearch = c.title.toLowerCase().includes(searchLower) ||
                  c.author.toLowerCase().includes(searchLower) ||
                  c.projectTeam.toLowerCase().includes(searchLower);
                
                const matchesStatus = comicStatusFilter === 'All Status' || c.status === comicStatusFilter;
                const matchesGenre = comicGenreFilter === 'All Genres' || c.genres.includes(comicGenreFilter);
                const matchesAuthor = comicAuthorFilter === 'All Authors' || c.author === comicAuthorFilter;
                const matchesTeam = comicTeamFilter === 'All Project Teams' || c.projectTeam === comicTeamFilter;

                return matchesSearch && matchesStatus && matchesGenre && matchesAuthor && matchesTeam;
              })
              .map(comic => (
                <tr key={comic.id}>
                  <td>
                    <div className="comic-cell-info">
                      <div className="comic-cell-thumbnail">
                        {comic.title.toLowerCase().includes('sword') ? '⚔️' : comic.title.toLowerCase().includes('spirit') ? '🔮' : comic.title.toLowerCase().includes('demon') ? '👑' : '📚'}
                      </div>
                      <div className="comic-cell-details">
                        <span className="comic-cell-title">{comic.title}</span>
                        <div className="comic-cell-genres">
                          {comic.genres.map((g, idx) => (
                            <span key={idx} className="comic-genre-tag">{g}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{comic.author}</td>
                  <td>
                    {comic.projectTeam === '-' ? (
                      <span style={{ color: 'var(--mod-text-muted)', fontSize: '13px' }}>Unassigned</span>
                    ) : (
                      <span style={{ fontWeight: '500' }}>{comic.projectTeam}</span>
                    )}
                  </td>
                  <td><strong>{comic.chapters}</strong></td>
                  <td>{comic.views}</td>
                  <td>
                    <span className={`comic-status-badge ${comic.status.toLowerCase()}`}>
                      {comic.status}
                    </span>
                  </td>
                  <td>
                    <div className="comic-actions-cell">
                      <button 
                        className="comic-btn-action"
                        onClick={() => openEditModal(comic)}
                        title="Edit Info"
                      >
                        📝 Edit
                      </button>
                      <button 
                        className="comic-btn-action assign"
                        onClick={() => openDirectAssignModal(comic)}
                        title="Assign Translation Team"
                      >
                        🔗 Assign Team
                      </button>
                      <button 
                        className="comic-btn-action translate"
                        onClick={() => openTranslationRequestModal(comic)}
                        title="Request Translation"
                      >
                        🌐 Translate
                      </button>
                      <button 
                        className="comic-btn-action archive"
                        onClick={() => handleArchiveComic(comic.id)}
                        title="Archive Comic"
                      >
                        🗑️ Archive
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ── MODAL: EDIT COMIC INFO ─────────────────── */}
      {editingComic && (
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
                    <option value="Ongoing">Ongoing</option>
                    <option value="Paused">Paused</option>
                    <option value="Completed">Completed</option>
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
              </div>
            </div>

            <div className="mod-modal-footer">
              <button 
                className="mod-btn review"
                onClick={() => setEditingComic(null)}
              >
                Cancel
              </button>
              <button 
                className="mod-btn approve"
                onClick={saveEditModal}
                disabled={!editComicForm.title.trim()}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REQUEST TRANSLATION ─────────────── */}
      {showTransReqModal && transReqComic && (
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

            <div className="mod-modal-footer">
              <button 
                className="mod-btn review"
                onClick={() => setShowTransReqModal(false)}
              >
                Cancel
              </button>
              <button 
                className="mod-btn approve"
                onClick={handleSubmitTranslationRequest}
                disabled={transReqForm.targetLanguages.length === 0}
              >
                Submit Request ({transReqForm.targetLanguages.length} language{transReqForm.targetLanguages.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DIRECT ASSIGN TEAM ────────────────── */}
      {showDirectAssignModal && (
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

            <div className="mod-modal-footer">
              <button 
                className="mod-btn review"
                onClick={() => setShowDirectAssignModal(false)}
              >
                Cancel
              </button>
              <button 
                className="mod-btn approve"
                onClick={handleSubmitDirectAssignment}
                disabled={!directAssignForm.targetLang || !selectedTeamId}
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ComicManagement
