import { useNavigate } from 'react-router-dom'

function ComicCard({ comic }) {
  const navigate = useNavigate()
  
  if (!comic) return null

  // Extract fields with fallbacks to handle different API schemas
  const id = comic.id
  const title = comic.title
  const cover = comic.cover
  const rating = comic.rating || '0.0'
  const views = comic.views || '0'
  const chapters = comic.chapters || comic.chaptersCount || '0'
  
  // Determine primary genre
  let genre = 'Fantasy'
  if (comic.genres && comic.genres.length > 0) {
    genre = comic.genres[0]
  } else if (comic.genre) {
    genre = comic.genre
  }

  // Determine badge class for styling
  let badgeClass = 'fantasy'
  const genreLower = genre.toLowerCase()
  if (genreLower.includes('action')) {
    badgeClass = 'action'
  } else if (genreLower.includes('adventure')) {
    badgeClass = 'adventure'
  } else if (genreLower.includes('sci-fi') || genreLower.includes('scifi')) {
    badgeClass = 'scifi'
  }

  const handleClick = () => {
    navigate(`/comic/${id}`)
  }

  return (
    <div className="home-comic-card" onClick={handleClick}>
      <div className="card-cover-wrapper">
        <img src={cover} alt={title} />
        <div className={`card-badge ${badgeClass}`}>{genre.toUpperCase()}</div>
        <div className="card-rating-badge">
          <span>⭐</span> {rating}
        </div>
      </div>
      <div className="card-info-area">
        <h3 className="card-title">{title}</h3>
        <div className="card-chapter-row">
          <span className="card-chapter-number">Ch. {chapters}</span>
          <span className="card-views">👁️ {views}</span>
        </div>
      </div>
    </div>
  )
}

export default ComicCard
