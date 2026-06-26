import { useState } from 'react'

function ComicManagement({ comics, handleSaveEditComic, handleArchiveComic, handleTriggerAssignTeam }) {
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
                      {comic.projectTeam === '-' && (
                        <button 
                          className="comic-btn-action assign"
                          onClick={() => handleTriggerAssignTeam(comic)}
                          title="Assign Translation Team"
                        >
                          🔗 Assign Team
                        </button>
                      )}
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
    </div>
  )
}

export default ComicManagement
