import { useState } from 'react'

const INITIAL_GENRES = [
  { name: 'Action', count: 245 },
  { name: 'Adventure', count: 189 },
  { name: 'Fantasy', count: 312 },
  { name: 'Romance', count: 156 },
  { name: 'Mystery', count: 98 },
  { name: 'Cultivation', count: 201 },
  { name: 'Drama', count: 134 },
  { name: 'Comedy', count: 87 }
]

function GenreManagement() {
  const [genres, setGenres] = useState(INITIAL_GENRES)

  const handleAddGenre = () => {
    const newName = prompt('Enter new genre name:')
    if (newName && newName.trim()) {
      const exists = genres.find(g => g.name.toLowerCase() === newName.trim().toLowerCase())
      if (exists) {
        alert('Genre already exists!')
        return
      }
      setGenres(prev => [...prev, { name: newName.trim(), count: 0 }])
    }
  }

  const handleEditGenre = (genre) => {
    const newName = prompt('Edit genre name:', genre.name)
    if (newName && newName.trim() && newName.trim() !== genre.name) {
      setGenres(prev =>
        prev.map(g => (g.name === genre.name ? { ...g, name: newName.trim() } : g))
      )
    }
  }

  const handleDeleteGenre = (name) => {
    if (window.confirm(`Are you sure you want to delete the genre "${name}"?`)) {
      setGenres(prev => prev.filter(g => g.name !== name))
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

      <div className="genres-list-grid">
        {genres.map((g, idx) => (
          <div className="genre-mgmt-card" key={idx}>
            <div className="genre-mgmt-info">
              <h4>{g.name}</h4>
              <p>{g.count} comics</p>
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
                onClick={() => handleDeleteGenre(g.name)}
                title="Delete Genre"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GenreManagement
