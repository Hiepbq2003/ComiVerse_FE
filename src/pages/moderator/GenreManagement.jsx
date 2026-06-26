import { useState, useEffect } from 'react'
import { getAllGenresApi, createGenreApi, updateGenreApi, deleteGenreApi } from '../../services/api/GenreApi'
import { toast } from 'react-toastify'

function GenreManagement() {
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGenres()
  }, [])

  const fetchGenres = async () => {
    try {
      setLoading(true)
      const data = await getAllGenresApi()
      setGenres(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load genres!')
    } finally {
      setLoading(false)
    }
  }

  const handleAddGenre = async () => {
    const newName = prompt('Enter new genre name:')
    if (newName && newName.trim()) {
      const exists = genres.find(g => g.name.toLowerCase() === newName.trim().toLowerCase())
      if (exists) {
        alert('Genre already exists!')
        return
      }
      try {
        const newGenre = await createGenreApi({
          name: newName.trim(),
          slug: newName.trim().toLowerCase().replace(/\s+/g, '-')
        })
        setGenres(prev => [...prev, newGenre])
        toast.success('Genre added successfully!')
      } catch (err) {
        console.error(err)
        toast.error('Failed to add genre!')
      }
    }
  }

  const handleEditGenre = async (genre) => {
    const newName = prompt('Edit genre name:', genre.name)
    if (newName && newName.trim() && newName.trim() !== genre.name) {
      try {
        const updated = await updateGenreApi(genre.id, {
          name: newName.trim(),
          slug: newName.trim().toLowerCase().replace(/\s+/g, '-')
        })
        setGenres(prev =>
          prev.map(g => (g.id === genre.id ? updated : g))
        )
        toast.success('Genre updated successfully!')
      } catch (err) {
        console.error(err)
        toast.error('Failed to update genre!')
      }
    }
  }

  const handleDeleteGenre = async (genre) => {
    if (window.confirm(`Are you sure you want to delete the genre "${genre.name}"?`)) {
      try {
        await deleteGenreApi(genre.id)
        setGenres(prev => prev.filter(g => g.id !== genre.id))
        toast.success('Genre deleted successfully!')
      } catch (err) {
        console.error(err)
        toast.error('Failed to delete genre!')
      }
    }
  }

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
          onClick={handleAddGenre}
        >
          ➕ Add Genre
        </button>
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
                  onClick={() => handleEditGenre(g)}
                  title="Edit Genre"
                >
                  ✏️ Edit
                </button>
                <button 
                  className="comic-btn-action archive" 
                  onClick={() => handleDeleteGenre(g)}
                  title="Delete Genre"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default GenreManagement
