import { useNavigate } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'

// Import assets
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'

function Trending() {
  const navigate = useNavigate()

  const trendingComics = [
    { id: 2, title: 'Dragon Legacy', cover: comicAdventure, genre: 'Adventure', tagline: 'The last dragon rider rises to save the kingdom from ancient ashes.', chapters: '372', views: '2.4M', rating: '4.9', trend: 'stable' },
    { id: 1, title: 'Battle Chronicles', cover: comicAction, genre: 'Action', chapters: '184', views: '1.2M', rating: '4.9', trend: 'up' },
    { id: 4, title: 'Infinite Journey', cover: comicAdventure, genre: 'Adventure', chapters: '120', views: '1.1M', rating: '4.8', trend: 'up' },
    { id: 3, title: 'Neon Genesis', cover: comicScifi, genre: 'Sci-Fi', chapters: '95', views: '850K', rating: '4.7', trend: 'down' },
    { id: 5, title: 'Solo Adventure', cover: comicAction, genre: 'Action', chapters: '45', views: '400K', rating: '4.6', trend: 'stable' },
    { id: 6, title: 'Cyber Odyssey', cover: comicScifi, genre: 'Sci-Fi', chapters: '62', views: '320K', rating: '4.5', trend: 'up' },
    { id: 7, title: 'Shadow Legend', cover: comicAction, genre: 'Action', chapters: '88', views: '180K', rating: '4.4', trend: 'up' },
    { id: 8, title: 'Sky Realm', cover: comicAdventure, genre: 'Adventure', chapters: '104', views: '210K', rating: '4.3', trend: 'down' }
  ]

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <span style={{ color: '#10b981', fontWeight: 'bold' }}>▲</span>
      case 'down':
        return <span style={{ color: '#ef4444', fontWeight: 'bold' }}>▼</span>
      case 'stable':
      default:
        return <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>●</span>
    }
  }

  return (
    <HomeLayout>
      <div className="home-sections-container" style={{ paddingTop: '40px' }}>
        <div className="home-section">
          <div className="section-header" style={{ borderLeftColor: '#ec4899' }}>
            <div className="section-title-group">
              <h2 className="section-title">Trending Now</h2>
              <span className="section-subtitle">Most read and active series on ComiVerse today</span>
            </div>
          </div>

          <div className="hot-section-split" style={{ marginTop: '20px' }}>
            {/* Left Column: Rank #1 */}
            <div className="hot-featured-wrapper">
              <div
                className="hot-featured-card"
                onClick={() => navigate(`/comic/${trendingComics[0].id}`)}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <div className="hot-featured-cover" style={{ flexGrow: 1, height: 'auto', minHeight: '340px' }}>
                  <img src={trendingComics[0].cover} alt={trendingComics[0].title} style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
                  <div className="hot-rank-pill-featured">
                    <span>🏆</span> RANK #01
                  </div>
                </div>
                <div className="hot-featured-info" style={{ background: 'linear-gradient(to bottom, #0d0919, #05030a)' }}>
                  <h3 className="hot-featured-title" style={{ fontSize: '24px' }}>{trendingComics[0].title}</h3>
                  <p className="hot-featured-tagline" style={{ fontSize: '14px', margin: '8px 0 20px' }}>{trendingComics[0].tagline}</p>
                  <div className="hot-featured-meta">
                    <span style={{ color: '#ec4899', fontWeight: '700', fontSize: '14px' }}>{trendingComics[0].genre}</span>
                    <span style={{ fontSize: '14px' }}>⭐ {trendingComics[0].rating}  •  👁️ {trendingComics[0].views}  •  📖 {trendingComics[0].chapters} Ch.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Rank #2 to #8 */}
            <div className="hot-ranking-list">
              {trendingComics.slice(1).map((comic, index) => (
                <div
                  key={comic.id}
                  className="ranking-item"
                  onClick={() => navigate(`/comic/${comic.id}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span className={`rank-number top-${index + 2}`} style={{ fontSize: '26px' }}>
                      0{index + 2}
                    </span>
                    <div className="rank-item-thumb" style={{ width: '52px', height: '70px' }}>
                      <img src={comic.cover} alt={comic.title} />
                    </div>
                    <div className="rank-item-details">
                      <h4 className="rank-item-title" style={{ fontSize: '16px' }}>{comic.title}</h4>
                      <span className="rank-item-genre" style={{ fontSize: '12px' }}>{comic.genre}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                    <div className="rank-item-meta" style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                      <div className="rank-item-meta-item" style={{ color: '#fbbf24' }}>
                        <span>⭐</span> {comic.rating}
                      </div>
                      <div className="rank-item-meta-item">
                        <span>👁️</span> {comic.views}
                      </div>
                      <div className="rank-item-meta-item">
                        <span>📖</span> {comic.chapters} Ch.
                      </div>
                    </div>
                    <div style={{ width: '20px', textAlign: 'center', fontSize: '14px' }}>
                      {getTrendIcon(comic.trend)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HomeLayout>
  )
}

export default Trending
