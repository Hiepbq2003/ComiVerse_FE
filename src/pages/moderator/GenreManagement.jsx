import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import '../../assets/style/moderator/genre-management.css'
import { getAllGenresApi, createGenreApi, updateGenreApi, deleteGenreApi } from '../../services/api/GenreApi'
import { toast } from 'react-toastify'

function GenreManagement({ comics }) {
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
  const getComicCountForGenre = (genreName) => {
    if (!comics) return 0
    return comics.filter(c => 
      (c.genres || []).some(g => {
        const name = typeof g === 'object' && g !== null ? g.name : g
        return name && name.toLowerCase() === genreName.toLowerCase()
      })
    ).length
  }

  const getMostPopularGenre = () => {
    if (genres.length === 0 || !comics || comics.length === 0) return 'None'
    let maxCount = -1
    let popularName = 'None'
    for (const g of genres) {
      const cnt = getComicCountForGenre(g.name)
      if (cnt > maxCount) {
        maxCount = cnt
        popularName = g.name
      }
    }
    return maxCount > 0 ? `${popularName} (${maxCount})` : 'None'
  }

  return (
    <div className="fade-in">
      <div className="comic-mgmt-header">
        <div className="moderator-page-header">
          <h1>Genre Management</h1>
          <p>Organize categories and genre lists for readers browsing the platform catalog.</p>
        </div>
        <button 
          className="mod-btn approve mod-btn-create"
          style={{ padding: '10px 18px' }}
          onClick={() => {
            setAddGenreName('')
            setShowAddModal(true)
          }}
        >
          <span style={{ fontWeight: '800', fontSize: '16px', color: '#ffffff', marginRight: '6px' }}>+</span> Add Genre
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
            <span className="stat-label">Most Popular Genre</span>
            <svg viewBox="0 0 100 30" className="stat-sparkline" style={{ width: '60px', height: '20px', color: '#10b981', opacity: 0.7 }}>
              <path d="M0 10 C 20 10, 40 25, 60 20 C 80 15, 90 25, 100 25" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stat-value" style={{ color: '#10b981', fontSize: getMostPopularGenre().length > 15 ? '20px' : '24px' }}>
            {getMostPopularGenre()}
          </span>
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
                <p>{getComicCountForGenre(g.name)} comics</p>
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
                  title="Archive Genre"
                >
                  📥 Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: ADD GENRE ─────────────────────────── */}
      {showAddModal && createPortal(
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
                  style={{ background: 'rgba(128,128,128,0.1)', color: 'var(--mod-text-primary)', border: '1px solid var(--mod-border)' }}
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
        </div>,
        document.body
      )}

      {/* ── MODAL: EDIT GENRE ────────────────────────── */}
      {showEditModal && editingGenre && createPortal(
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
                  style={{ background: 'rgba(128,128,128,0.1)', color: 'var(--mod-text-primary)', border: '1px solid var(--mod-border)' }}
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
        </div>,
        document.body
      )}

      {/* ── MODAL: DELETE (ARCHIVE) GENRE ──────────────── */}
      {showDeleteModal && genreToDelete && createPortal((() => {
        const linkedComicCount = getComicCountForGenre(genreToDelete.name);
        const hasLinkedComics = linkedComicCount > 0;
        return (
          <div className="mod-modal-overlay" style={{ zIndex: 9999 }}>
            <div className="mod-modal-card" style={{ maxWidth: '440px', textAlign: 'center' }}>
              <div className="mod-modal-body" style={{ padding: '24px 16px' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>📥</div>
                <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: 'var(--mod-text-primary)' }}>
                  Archive Genre
                </h3>
                {hasLinkedComics ? (
                  <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--mod-text-secondary)', lineHeight: '1.5' }}>
                    The genre <strong style={{ color: 'var(--mod-text-primary)' }}>"{genreToDelete.name}"</strong> is currently linked to <strong style={{ color: 'var(--mod-purple, #a855f7)', fontWeight: '700' }}>{linkedComicCount}</strong> comics. 
                    Archiving this genre will hide it from the platform browse filters and new creators, but existing comics will still preserve their labels.
                    Are you sure you want to suspend/archive this genre?
                  </p>
                ) : (
                  <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--mod-text-secondary)', lineHeight: '1.5' }}>
                    Are you sure you want to archive/suspend the genre <strong style={{ color: 'var(--mod-text-primary)' }}>"{genreToDelete.name}"</strong>? 
                    This will hide it from the public platform catalog and creators.
                  </p>
                )}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button 
                    className="mod-btn" 
                    style={{ 
                      background: 'rgba(128,128,128,0.1)', 
                      color: 'var(--mod-text-primary)', 
                      border: '1px solid var(--mod-border)',
                      padding: '8px 20px' 
                    }}
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="mod-btn approve" 
                    style={{ 
                      padding: '8px 20px', 
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      border: 'none',
                      color: '#ffffff'
                    }}
                    onClick={submitDeleteGenre}
                  >
                    Archive
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  )
}

export default GenreManagement
