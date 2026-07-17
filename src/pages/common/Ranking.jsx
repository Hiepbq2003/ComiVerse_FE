import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getComicLeaderboardApi } from '../../services/api/ComicApi'

// Import assets
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'


function Ranking() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTimeframe = searchParams.get('timeframe') || 'day'

  const [currentPage, setCurrentPage] = useState(1)
  const [timeframe, setTimeframe] = useState(initialTimeframe)
  const [comics, setComics] = useState([])
  const [loading, setLoading] = useState(true)
  const ITEMS_PER_PAGE = 5

  const isEmoji = (str) => {
    if (!str) return false
    return !str.includes('/') && !str.includes('.') && str.trim().length <= 4
  }

  const getArrayOrData = (res) => {
    if (!res) return []
    if (Array.isArray(res)) return res
    if (res.data && Array.isArray(res.data)) return res.data
    if (res.data?.data && Array.isArray(res.data.data)) return res.data.data
    return []
  }

  useEffect(() => {
    const urlTimeframe = searchParams.get('timeframe')
    if (urlTimeframe) {
      setTimeframe(urlTimeframe)
    }
  }, [searchParams])

  useEffect(() => {
    let isMounted = true
    const fetchTrending = async () => {
      try {
        setLoading(true)
        const res = await getComicLeaderboardApi({ timeframe })
        const dataList = getArrayOrData(res)
        if (isMounted) {
          setComics(dataList)
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err)
        if (isMounted) {
          setComics([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    fetchTrending()
    return () => {
      isMounted = false
    }
  }, [timeframe])

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

  const activeComics = comics || []
  const featuredComic = activeComics[0]
  const rightListComics = activeComics.slice(1)
  
  const totalPages = Math.ceil(rightListComics.length / ITEMS_PER_PAGE)
  const paginatedRightList = rightListComics.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const getCoverImage = (comic) => {
    if (comic.cover && typeof comic.cover === 'string') {
      return comic.cover
    }
    const fallbacks = [comicAction, comicAdventure, comicScifi]
    const idHash = typeof comic.id === 'string' ? comic.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : comic.id || 0
    return fallbacks[idHash % 3] || comicAction
  }

  const formatViews = (count) => {
    if (count === undefined || count === null) return '0'
    const num = Number(count)
    if (isNaN(num)) return String(count)
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return String(num)
  }

  const getRating = (comic) => {
    const val = comic.rating !== undefined ? comic.rating : comic.ratingAverage
    return val !== undefined ? Number(val).toFixed(1) : '0.0'
  }

  const getViews = (comic) => {
    const val = comic.views !== undefined ? comic.views : comic.viewCount
    return val !== undefined ? formatViews(val) : '0'
  }

  const getChapters = (comic) => {
    return comic.chapters || comic.chaptersCount || comic.chapterCount || '0'
  }

  const getPrimaryGenre = (comic) => {
    if (comic.genres && comic.genres.length > 0) {
      const first = comic.genres[0]
      return typeof first === 'object' && first !== null ? first.name : first
    } else if (comic.genre) {
      return typeof comic.genre === 'object' && comic.genre !== null ? comic.genre.name : comic.genre
    }
    return 'Fantasy'
  }

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
              {['day', 'week', 'month'].map((t) => {
                const isActive = timeframe === t
                const labels = { day: 'Daily', week: 'Weekly', month: 'Monthly' }
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
                    {labels[t]}
                  </button>
                )
              })}
            </div>
          </div>

          {loading ? (
            <div className="hot-section-split" style={{ marginTop: '20px' }}>
              <div className="hot-featured-wrapper">
                <div className="skeleton-comic-card" style={{ height: '500px', width: '100%' }}>
                  <div className="skeleton-img skeleton-shimmer" style={{ height: '70%' }}></div>
                  <div className="skeleton-line skeleton-shimmer short" style={{ marginTop: '12px' }}></div>
                  <div className="skeleton-line skeleton-shimmer long"></div>
                </div>
              </div>
              <div className="hot-ranking-list">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="ranking-item skeleton-shimmer" style={{ height: '70px', background: 'rgba(255,255,255,0.02)', padding: '10px 16px', display: 'flex', alignItems: 'center', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="skeleton-circle" style={{ width: '40px', height: '40px', marginRight: '16px' }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton-line short" style={{ margin: 0, height: '10px' }}></div>
                      <div className="skeleton-line medium" style={{ marginTop: '8px', marginBottom: 0, height: '8px' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="hot-section-split" style={{ marginTop: '20px' }}>
              {/* Left Column: Rank #1 */}
              {featuredComic && (
                <div className="hot-featured-wrapper">
                  <div
                    className="hot-featured-card"
                    onClick={() => navigate(`/comic/${featuredComic.id}`)}
                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                  >
                    <div className="hot-featured-cover" style={{ flexGrow: 1, height: 'auto', minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)' }}>
                      {isEmoji(getCoverImage(featuredComic)) ? (
                        <div style={{ fontSize: '10rem', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.2) 0%, rgba(13, 9, 25, 0.98) 100%)' }}>{getCoverImage(featuredComic)}</div>
                      ) : (
                        <img src={getCoverImage(featuredComic)} alt={featuredComic.title} style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
                      )}
                      <div className="hot-rank-pill-featured">
                        <span>🏆</span> RANK #01
                      </div>
                    </div>
                    <div className="hot-featured-info" style={{ background: 'linear-gradient(to bottom, #0d0919, #05030a)' }}>
                      <h3 className="hot-featured-title" style={{ fontSize: '24px' }}>{featuredComic.title}</h3>
                      <p className="hot-featured-tagline" style={{ fontSize: '14px', margin: '8px 0 20px' }}>{featuredComic.tagline || featuredComic.summary || 'An epic fantasy series on ComiVerse.'}</p>
                      <div className="hot-featured-meta">
                        <span style={{ color: '#ec4899', fontWeight: '700', fontSize: '14px' }}>{getPrimaryGenre(featuredComic)}</span>
                        <span style={{ fontSize: '14px' }}>⭐ {getRating(featuredComic)}  •  👁️ {getViews(featuredComic)}  •  📖 {getChapters(featuredComic)} Ch.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1, minWidth: 0 }}>
                        <span className={`rank-number top-${rankNum}`} style={{ fontSize: '26px', flexShrink: 0 }}>
                          {formattedRankNum}
                        </span>
                        <div className="rank-item-thumb" style={{ width: '52px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                          {isEmoji(getCoverImage(comic)) ? (
                            <div style={{ fontSize: '1.8rem' }}>{getCoverImage(comic)}</div>
                          ) : (
                            <img src={getCoverImage(comic)} alt={comic.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          )}
                        </div>
                        <div className="rank-item-details">
                          <h4 className="rank-item-title" style={{ fontSize: '16px' }}>{comic.title}</h4>
                          <span className="rank-item-genre" style={{ fontSize: '12px' }}>{getPrimaryGenre(comic)}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '30px', flexShrink: 0 }}>
                        <div className="rank-item-meta" style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                          <div className="rank-item-meta-item" style={{ color: '#fbbf24' }}>
                            <span>⭐</span> {getRating(comic)}
                          </div>
                          <div className="rank-item-meta-item">
                            <span>👁️</span> {getViews(comic)}
                          </div>
                          <div className="rank-item-meta-item">
                            <span>📖</span> {getChapters(comic)} Ch.
                          </div>
                        </div>
                        <div style={{ width: '20px', textAlign: 'center', fontSize: '14px' }}>
                          {getTrendIcon(comic.trend || 'stable')}
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
          )}
        </div>
      </div>
    </HomeLayout>
  )
}

export default Ranking
