import { useState, useEffect } from 'react'
import '../../assets/style/moderator/genre-management.css'
import { getAllGenresApi, createGenreApi, updateGenreApi, deleteGenreApi } from '../../services/api/GenreApi'
import { toast } from 'react-toastify'

function GenreManagement() {
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)

  // Custom modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [addGenreName, setAddGenreName] = useState('')
  
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingGenre, setEditingGenre] = useState(null)
  const [editGenreName, setEditGenreName] = useState('')
  
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [genreToDelete, setGenreToDelete] = useState(null)

  useEffect(() => {
    fetchGenres()
  }, [])

  const fetchGenres = async () => {
    try {
      setLoading(true)
      const data = await getAllGenresApi()
      setGenres(data?.data || data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load genres!')
    } finally {
      setLoading(false)
    }
  }

  const submitAddGenre = async () => {
    if (!addGenreName || !addGenreName.trim()) {
      toast.warn('Please enter a genre name.')
      return
    }
    const nameTrimmed = addGenreName.trim()
    const exists = genres.find(g => g.name.toLowerCase() === nameTrimmed.toLowerCase())
    if (exists) {
      toast.error('Genre already exists!')
      return
    }
    try {
      const newGenre = await createGenreApi({
        name: nameTrimmed,
        slug: nameTrimmed.toLowerCase().replace(/\s+/g, '-')
      })
      setGenres(prev => [...prev, newGenre])
      toast.success('Genre added successfully!')
      setShowAddModal(false)
      setAddGenreName('')
    } catch (err) {
      console.error(err)
      toast.error('Failed to add genre!')
    }
  }

  const handleOpenEditModal = (genre) => {
    setEditingGenre(genre)
    setEditGenreName(genre.name)
    setShowEditModal(true)
  }

  const submitEditGenre = async () => {
    if (!editGenreName || !editGenreName.trim()) {
      toast.warn('Please enter a genre name.')
      return
    }
    const nameTrimmed = editGenreName.trim()
    if (nameTrimmed === editingGenre.name) {
      setShowEditModal(false)
      return
    }
    try {
      const updated = await updateGenreApi(editingGenre.id, {
        name: nameTrimmed,
        slug: nameTrimmed.toLowerCase().replace(/\s+/g, '-')
      })
      setGenres(prev =>
        prev.map(g => (g.id === editingGenre.id ? updated : g))
      )
      toast.success('Genre updated successfully!')
      setShowEditModal(false)
      setEditingGenre(null)
    } catch (err) {
      console.error(err)
      toast.error('Failed to update genre!')
    }
  }

  const handleOpenDeleteModal = (genre) => {
    setGenreToDelete(genre)
    setShowDeleteModal(true)
  }

  const submitDeleteGenre = async () => {
    if (!genreToDelete) return
    try {
      await deleteGenreApi(genreToDelete.id)
      setGenres(prev => prev.filter(g => g.id !== genreToDelete.id))
      toast.success('Genre deleted successfully!')
      setShowDeleteModal(false)
      setGenreToDelete(null)
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete genre!')
    }
  }

  // Calculate statistics metrics
  const emptyGenresCount = genres.filter(g => (g.count || 0) === 0).length

  return (
    <div className="fade-in">
      <div className="comic-mgmt-header">
        <div className="moderator-page-header">
          <h1>Genre Management</h1>
          <p>Organize categories and genre lists for readers browsing the platform catalog.</p>
        </div>
        <button 
          className="mod-btn approve"
          style={{ background: '#0f172a', padding: '10px 18px' }}
          onClick={() => {
            setAddGenreName('')
            setShowAddModal(true)
          }}
        >
          ➕ Add Genre
        </button>
      </div>

      {/* Statistics Row */}
      <div className="mod-stats-cards-row" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="mod-stat-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Total Genres</span>
            <svg viewBox="0 0 100 30" className="stat-sparkline" style={{ width: '60px', height: '20px', color: 'var(--mod-purple)', opacity: 0.7 }}>
              <path d="M0 25 C 20 25, 30 10, 50 15 C 70 20, 80 5, 100 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stat-value">{genres.length}</span>
        </div>
        <div className="mod-stat-overview-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Empty Genres</span>
            <svg viewBox="0 0 100 30" className="stat-sparkline" style={{ width: '60px', height: '20px', color: '#d97706', opacity: 0.7 }}>
              <path d="M0 10 C 20 10, 40 25, 60 20 C 80 15, 90 25, 100 25" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stat-value paused-count">{emptyGenresCount}</span>
        </div>
      </div>

      {loading ? (
        <div className="moderator-empty-state">
          <p>Loading genres...</p>
        </div>
      ) : (
        <div className="genres-list-grid">
          {genres.map((g, idx) => (
            <div className="genre-mgmt-card" key={g.id || idx}>
              <div className="genre-mgmt-info">
                <h4>{g.name}</h4>
                <p>{g.count || 0} comics</p>
              </div>
              <div className="genre-mgmt-actions">
                <button 
                  className="comic-btn-action" 
                  onClick={() => handleOpenEditModal(g)}
                  title="Edit Genre"
                >
                  ✏️ Edit
                </button>
                <button 
                  className="comic-btn-action archive" 
                  onClick={() => handleOpenDeleteModal(g)}
                  title="Delete Genre"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: ADD GENRE ─────────────────────────── */}
      {showAddModal && (
        <div className="mod-modal-overlay">
          <div className="mod-modal-card">
            <div className="mod-modal-header">
              <h3>Create New Genre</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="mod-modal-body">
              <div className="mod-form-group">
                <label className="mod-label">Genre Name *</label>
                <input 
                  type="text" 
                  className="mod-input" 
                  value={addGenreName}
                  onChange={(e) => setAddGenreName(e.target.value)}
                  placeholder="e.g. Action, Comedy, Fantasy"
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button 
                  className="mod-btn" 
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="mod-btn approve" 
                  onClick={submitAddGenre}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT GENRE ────────────────────────── */}
      {showEditModal && editingGenre && (
        <div className="mod-modal-overlay">
          <div className="mod-modal-card">
            <div className="mod-modal-header">
              <h3>Modify Genre</h3>
              <button className="mod-modal-close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="mod-modal-body">
              <div className="mod-form-group">
                <label className="mod-label">Genre Name *</label>
                <input 
                  type="text" 
                  className="mod-input" 
                  value={editGenreName}
                  onChange={(e) => setEditGenreName(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button 
                  className="mod-btn" 
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="mod-btn approve" 
                  onClick={submitEditGenre}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE GENRE ──────────────────────── */}
      {showDeleteModal && genreToDelete && (
        <div className="mod-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="mod-modal-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="mod-modal-body" style={{ padding: '24px 16px' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
              <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: 'white' }}>Delete Genre</h3>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--mod-text-secondary)', lineHeight: '1.5' }}>
                Are you sure you want to permanently delete the genre <strong style={{ color: 'white' }}>"{genreToDelete.name}"</strong>?
                This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button 
                  className="mod-btn" 
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'white', padding: '8px 20px' }}
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="mod-btn reject" 
                  style={{ padding: '8px 20px' }}
                  onClick={submitDeleteGenre}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GenreManagement
