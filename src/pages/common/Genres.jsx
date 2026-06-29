import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import ComicCard from '../../components/common/ComicCard'

// Import assets
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'

function Genres() {
  const navigate = useNavigate()
  const [selectedGenre, setSelectedGenre] = useState('All')

  const genresList = [
    { name: 'All', count: 8 },
    { name: 'Action', count: 4 },
    { name: 'Adventure', count: 4 },
    { name: 'Sci-Fi', count: 2 },
    { name: 'Fantasy', count: 6 },
    { name: 'Romance', count: 0 },
    { name: 'Drama', count: 0 }
  ]

  const allComics = [
    { id: 1, title: 'Battle Chronicles', cover: comicAction, genres: ['Action', 'Fantasy', 'Adventure'], chapters: '184', views: '1.2M', rating: '4.9', badgeClass: 'action' },
    { id: 2, title: 'Dragon Legacy', cover: comicAdventure, genres: ['Adventure', 'Fantasy'], chapters: '372', views: '2.4M', rating: '4.8', badgeClass: 'adventure' },
    { id: 3, title: 'Neon Genesis', cover: comicScifi, genres: ['Sci-Fi', 'Action'], chapters: '95', views: '850K', rating: '4.7', badgeClass: 'scifi' },
    { id: 4, title: 'Infinite Journey', cover: comicAdventure, genres: ['Adventure', 'Fantasy'], chapters: '120', views: '1.1M', rating: '4.8', badgeClass: 'adventure' },
    { id: 5, title: 'Solo Adventure', cover: comicAction, genres: ['Action', 'Fantasy'], chapters: '45', views: '400K', rating: '4.6', badgeClass: 'action' },
    { id: 6, title: 'Cyber Odyssey', cover: comicScifi, genres: ['Sci-Fi'], chapters: '62', views: '320K', rating: '4.5', badgeClass: 'scifi' },
    { id: 7, title: 'Shadow Legend', cover: comicAction, genres: ['Action', 'Fantasy'], chapters: '88', views: '180K', rating: '4.4', badgeClass: 'action' },
    { id: 8, title: 'Sky Realm', cover: comicAdventure, genres: ['Adventure', 'Fantasy'], chapters: '104', views: '210K', rating: '4.3', badgeClass: 'adventure' }
  ]

  const filteredComics = selectedGenre === 'All'
    ? allComics
    : allComics.filter(c => c.genres.includes(selectedGenre))

  return (
    <HomeLayout>
      <div className="home-sections-container" style={{ paddingTop: '40px' }}>
        <div className="home-section">
          <div className="section-header" style={{ borderLeftColor: '#a855f7' }}>
            <div className="section-title-group">
              <h2 className="section-title">Explore Genres</h2>
              <span className="section-subtitle">Discover your next favorite story by category</span>
            </div>
          </div>

          {/* Genre Pills */}
          <div
            className="genre-pills-container"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              margin: '20px 0 30px'
            }}
          >
            {genresList.map((genre) => (
              <button
                key={genre.name}
                onClick={() => setSelectedGenre(genre.name)}
                style={{
                  background: selectedGenre === genre.name
                    ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: selectedGenre === genre.name
                    ? '1px solid transparent'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  color: selectedGenre === genre.name ? 'white' : '#cbd5e1',
                  padding: '10px 22px',
                  borderRadius: '24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: selectedGenre === genre.name
                    ? '0 4px 15px rgba(168, 85, 247, 0.3)'
                    : 'none'
                }}
                className="genre-pill"
              >
                <span>{genre.name}</span>
                <span
                  style={{
                    fontSize: '11px',
                    background: selectedGenre === genre.name ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    color: selectedGenre === genre.name ? 'white' : '#94a3b8'
                  }}
                >
                  {genre.count}
                </span>
              </button>
            ))}
          </div>

          {/* Comics Grid */}
          {filteredComics.length > 0 ? (
            <div className="recommended-grid">
              {filteredComics.map((comic) => (
                <ComicCard key={comic.id} comic={comic} />
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: '#0d0919',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                color: '#64748b'
              }}
            >
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📚</span>
              <h3 style={{ color: 'white', margin: '0 0 8px' }}>No Comics Found</h3>
              <p style={{ margin: 0, fontSize: '14px' }}>We are currently updating our database. Check back soon for new releases in this category!</p>
            </div>
          )}
        </div>
      </div>
    </HomeLayout>
  )
}

export default Genres
