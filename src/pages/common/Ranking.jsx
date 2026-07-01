import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'

// Import assets
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'

function Ranking() {
  const navigate = useNavigate()
  const [currentPage, setCurrentPage] = useState(1)
  const [timeframe, setTimeframe] = useState('weekly')
  const ITEMS_PER_PAGE = 5

  const trendingComics = [
    { id: 2, title: 'Dragon Legacy', cover: comicAdventure, genre: 'Adventure', tagline: 'The last dragon rider rises to save the kingdom from ancient ashes.', chapters: '372', views: '2.4M', rating: '4.9', trend: 'stable' },
    { id: 1, title: 'Battle Chronicles', cover: comicAction, genre: 'Action', chapters: '184', views: '1.2M', rating: '4.9', trend: 'up' },
    { id: 4, title: 'Infinite Journey', cover: comicAdventure, genre: 'Adventure', chapters: '120', views: '1.1M', rating: '4.8', trend: 'up' },
    { id: 3, title: 'Neon Genesis', cover: comicScifi, genre: 'Sci-Fi', chapters: '95', views: '850K', rating: '4.7', trend: 'down' },
    { id: 5, title: 'Solo Adventure', cover: comicAction, genre: 'Action', chapters: '45', views: '400K', rating: '4.6', trend: 'stable' },
    { id: 6, title: 'Cyber Odyssey', cover: comicScifi, genre: 'Sci-Fi', chapters: '62', views: '320K', rating: '4.5', trend: 'up' },
    { id: 7, title: 'Shadow Legend', cover: comicAction, genre: 'Action', chapters: '88', views: '180K', rating: '4.4', trend: 'up' },
    { id: 8, title: 'Sky Realm', cover: comicAdventure, genre: 'Adventure', chapters: '104', views: '210K', rating: '4.3', trend: 'down' },
    { id: 9, title: 'Aether Hunter', cover: comicAction, genre: 'Action', chapters: '76', views: '195K', rating: '4.5', trend: 'up' },
    { id: 10, title: 'Star Bound', cover: comicScifi, genre: 'Sci-Fi', chapters: '110', views: '340K', rating: '4.6', trend: 'stable' },
    { id: 11, title: 'Mystic Blade', cover: comicAction, genre: 'Action', chapters: '54', views: '150K', rating: '4.2', trend: 'up' },
    { id: 12, title: 'Chrono Rift', cover: comicScifi, genre: 'Sci-Fi', chapters: '40', views: '125K', rating: '4.1', trend: 'down' },
    { id: 13, title: 'Wild Frontier', cover: comicAdventure, genre: 'Adventure', chapters: '92', views: '310K', rating: '4.4', trend: 'up' },
    { id: 14, title: 'Void Walker', cover: comicScifi, genre: 'Sci-Fi', chapters: '67', views: '280K', rating: '4.5', trend: 'stable' },
    { id: 15, title: 'Phoenix Rise', cover: comicAction, genre: 'Action', chapters: '130', views: '420K', rating: '4.7', trend: 'up' }
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

  const getSortedTrendingComics = (tf) => {
    let list = [...trendingComics];
    if (tf === 'daily') {
      return [
        list[4], // Solo Adventure becomes #1
        list[14], // Phoenix Rise #2
        list[0],  // Dragon Legacy #3
        list[5],  // Cyber Odyssey #4
        list[1],  // Battle Chronicles #5
        list[9],  // Star Bound #6
        list[10], // Mystic Blade #7
        list[2],  // Infinite Journey #8
        list[3],  // Neon Genesis #9
        list[6],  // Shadow Legend #10
        list[7],  // Sky Realm #11
        list[8],  // Aether Hunter #12
        list[11], // Chrono Rift #13
        list[12], // Wild Frontier #14
        list[13], // Void Walker #15
      ];
    } else if (tf === 'weekly') {
      return [
        list[1],  // Battle Chronicles #1
        list[0],  // Dragon Legacy #2
        list[2],  // Infinite Journey #3
        list[4],  // Solo Adventure #4
        list[3],  // Neon Genesis #5
        list[5],  // Cyber Odyssey #6
        list[6],  // Shadow Legend #7
        list[7],  // Sky Realm #8
        list[8],  // Aether Hunter #9
        list[9],  // Star Bound #10
        list[10], // Mystic Blade #11
        list[11], // Chrono Rift #12
        list[12], // Wild Frontier #13
        list[13], // Void Walker #14
        list[14], // Phoenix Rise #15
      ];
    }
    return list;
  };

  const sortedTrendingComics = getSortedTrendingComics(timeframe)
  const featuredComic = sortedTrendingComics[0]
  const rightListComics = sortedTrendingComics.slice(1)
  
  const totalPages = Math.ceil(rightListComics.length / ITEMS_PER_PAGE)
  const paginatedRightList = rightListComics.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <HomeLayout>
      <div className="home-sections-container" style={{ paddingTop: '40px' }}>
        <div className="home-section">
          <div className="section-header" style={{ borderLeftColor: '#ec4899', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-title-group">
              <h2 className="section-title">Trending Now</h2>
              <span className="section-subtitle">Most read and active series on ComiVerse today</span>
            </div>
            
            {/* Timeframe selector bar */}
            <div style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '4px',
              gap: '4px'
            }}>
              {['daily', 'weekly', 'monthly'].map((t) => {
                const isActive = timeframe === t
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setTimeframe(t)
                      setCurrentPage(1)
                    }}
                    style={{
                      background: isActive ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' : 'transparent',
                      border: 'none',
                      color: isActive ? 'white' : '#cbd5e1',
                      borderRadius: '16px',
                      padding: '6px 16px',
                      fontSize: '12.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 2px 8px rgba(168, 85, 247, 0.4)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = '#cbd5e1'
                    }}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="hot-section-split" style={{ marginTop: '20px' }}>
            {/* Left Column: Rank #1 */}
            <div className="hot-featured-wrapper">
              <div
                className="hot-featured-card"
                onClick={() => navigate(`/comic/${featuredComic.id}`)}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <div className="hot-featured-cover" style={{ flexGrow: 1, height: 'auto', minHeight: '340px' }}>
                  <img src={featuredComic.cover} alt={featuredComic.title} style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
                  <div className="hot-rank-pill-featured">
                    <span>🏆</span> RANK #01
                  </div>
                </div>
                <div className="hot-featured-info" style={{ background: 'linear-gradient(to bottom, #0d0919, #05030a)' }}>
                  <h3 className="hot-featured-title" style={{ fontSize: '24px' }}>{featuredComic.title}</h3>
                  <p className="hot-featured-tagline" style={{ fontSize: '14px', margin: '8px 0 20px' }}>{featuredComic.tagline || 'An epic fantasy series on ComiVerse.'}</p>
                  <div className="hot-featured-meta">
                    <span style={{ color: '#ec4899', fontWeight: '700', fontSize: '14px' }}>{featuredComic.genre}</span>
                    <span style={{ fontSize: '14px' }}>⭐ {featuredComic.rating}  •  👁️ {featuredComic.views}  •  📖 {featuredComic.chapters} Ch.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Rank #2 to #15 */}
            <div className="hot-ranking-list">
              {paginatedRightList.map((comic, index) => {
                const rankNum = (currentPage - 1) * ITEMS_PER_PAGE + index + 2
                const formattedRankNum = String(rankNum).padStart(2, '0')
                return (
                  <div
                    key={comic.id}
                    className="ranking-item"
                    onClick={() => navigate(`/comic/${comic.id}`)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <span className={`rank-number top-${rankNum}`} style={{ fontSize: '26px' }}>
                        {formattedRankNum}
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
                )
              })}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      background: currentPage === 1 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: currentPage === 1 ? '#64748b' : 'white',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Prev
                  </button>
                  <span style={{ fontSize: '12.5px', color: '#cbd5e1' }}>
                    Page <strong>{currentPage}</strong> of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      background: currentPage === totalPages ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: currentPage === totalPages ? '#64748b' : 'white',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </HomeLayout>
  )
}

export default Ranking
