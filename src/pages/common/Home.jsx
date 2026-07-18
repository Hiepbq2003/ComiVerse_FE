import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import ComicCard from '../../components/common/ComicCard'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import {
  getExploreComicsApi,
  getComicRecommendationsApi,
  getComicLeaderboardApi
} from '../../services/api/ComicApi'
import { getChaptersByComicIdApi } from '../../services/api/ChapterApi'

// Import assets
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'

const DEFAULT_SPOTLIGHT = {
  id: '',
  title: 'Welcome to ComiVerse',
  tagline: 'Discover thousands of amazing comics, mangas, and webcomics from all over the world. Start reading today!',
  cover: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200',
  rating: '0.0',
  views: '0',
  chapters: '0',
  tags: ['Comics', 'Manga']
}

function Home() {
  const navigate = useNavigate()
  const [recommended, setRecommended] = useState([])
  const [trending, setTrending] = useState([])
  const [newUpdates, setNewUpdates] = useState([])
  const [recsLoading, setRecsLoading] = useState(true)
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [updatesLoading, setUpdatesLoading] = useState(true)

  // Helper to detect if cover is an emoji character
  const isEmoji = (str) => {
    if (!str) return false
    return !str.includes('/') && !str.includes('.') && str.trim().length <= 4
  }

  // Helper to reliably extract arrays from AxiosClient-unwrapped API responses
  const getArrayOrData = (res) => {
    if (!res) return []
    if (Array.isArray(res)) return res
    if (res.data && Array.isArray(res.data)) return res.data
    if (res.data?.data && Array.isArray(res.data.data)) return res.data.data
    return []
  }

  useEffect(() => {
    let isMounted = true

    // 1. Fetch recommendations (size = 6)
    getComicRecommendationsApi({ size: 6 })
      .then((res) => {
        if (isMounted) {
          setRecommended(getArrayOrData(res))
        }
      })
      .catch((err) => {
        console.error('Failed to fetch recommendations:', err)
        if (isMounted) setRecommended([])
      })
      .finally(() => {
        if (isMounted) setRecsLoading(false)
      })

    // 2. Fetch trending/leaderboard (timeframe = day)
    getComicLeaderboardApi({ timeframe: 'day' })
      .then((res) => {
        if (isMounted) {
          setTrending(getArrayOrData(res))
        }
      })
      .catch((err) => {
        console.error('Failed to fetch leaderboard:', err)
        if (isMounted) setTrending([])
      })
      .finally(() => {
        if (isMounted) setTrendingLoading(false)
      })

    // 3. Fetch explore/recently updated (sortBy = Recently Updated, size = 8)
    getExploreComicsApi({ sortBy: 'Recently Updated', size: 8 })
      .then(async (res) => {
        const exploreList = getArrayOrData(res)
        if (exploreList.length === 0) {
          if (isMounted) {
            setNewUpdates([])
            setUpdatesLoading(false)
          }
          return
        }

        try {
          const resolved = await Promise.all(
            exploreList.map(async (comic) => {
              try {
                const chRes = await getChaptersByComicIdApi(comic.id)
                const chData = getArrayOrData(chRes)
                const chapters = chData.slice(0, 2).map((ch) => ({
                  id: ch.id,
                  num: `Ch. ${ch.chapterNumber || ch.number || ''}`,
                  time: formatTimeAgo(ch.createdAt),
                }))
                return { ...comic, chapters }
              } catch (chErr) {
                console.warn(`Failed to fetch chapters for ${comic.id}:`, chErr.message)
                const chapters = []
                if (comic.latestChapterNumber !== undefined && comic.latestChapterNumber !== null) {
                  chapters.push({
                    num: `Ch. ${comic.latestChapterNumber}`,
                    time: formatTimeAgo(comic.lastChapterUpdatedAt),
                  })
                }
                return { ...comic, chapters }
              }
            })
          )
          if (isMounted) {
            setNewUpdates(resolved)
          }
        } catch (err) {
          console.error('Failed to resolve chapters:', err)
          if (isMounted) {
            setNewUpdates(exploreList)
          }
        } finally {
          if (isMounted) setUpdatesLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch recently updated explore:', err)
        if (isMounted) {
          setNewUpdates([])
          setUpdatesLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Spotlight comic (top comic in trending, recommended, or fallback to default welcome banner)
  const spotlightComic = trending[0] || recommended[0] || DEFAULT_SPOTLIGHT
  const spotlightTitle = spotlightComic.title
  const spotlightCover = spotlightComic.cover
  const spotlightRating = spotlightComic.rating !== undefined ? spotlightComic.rating : (spotlightComic.ratingAverage ?? '0.0')
  const spotlightViews = spotlightComic.views || spotlightComic.viewCount || '0'
  const spotlightChapters = spotlightComic.chapters || spotlightComic.chaptersCount || spotlightComic.chapterCount || '0'
  const spotlightTagline = spotlightComic.tagline || spotlightComic.summary || 'Unlock the power within and follow the legacy of legendary warriors.'
  const spotlightTags = spotlightComic.tags || (spotlightComic.genres ? spotlightComic.genres.map(g => typeof g === 'object' ? g.name : g) : ['Action', 'Fantasy'])

  // Helper to determine single genre name
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
      {/* HERO SECTION */}
      <section className="home-hero-section">
        {isEmoji(spotlightCover) ? (
          <div className="hero-banner-bg-emoji-fallback">{spotlightCover}</div>
        ) : (
          <div className="hero-banner-bg" style={{ backgroundImage: `url(${spotlightCover})` }} />
        )}
        <div className="hero-banner-overlay" />
        <div className="hero-content">
          <div className="hero-text-area">
            <div className="hero-badge-hot">
              <span>🔥 Spotlight</span>
            </div>
            <h1 className="hero-title">{spotlightTitle}</h1>

            <div className="hero-meta-row">
              {spotlightTags.slice(0, 3).map((tag, idx) => (
                <span key={idx} className="hero-genre-tag">{tag}</span>
              ))}
              <div className="hero-meta-item rating">
                <span>⭐</span> {spotlightRating}
              </div>
              <div className="hero-meta-item">
                <span>👁️</span> {spotlightViews} Views
              </div>
              <div className="hero-meta-item">
                <span>📖</span> {spotlightChapters} Chapters
              </div>
            </div>

            <p className="hero-tagline">{spotlightTagline}</p>

            <div className="hero-buttons-row">
              <button
                onClick={() => navigate(`/comic/${spotlightComic.id || 1}`)}
                className="btn-home-primary"
                style={{ padding: '12px 28px', fontSize: '15px' }}
              >
                Read Comic
              </button>
              <button onClick={() => navigate(`/comic/${spotlightComic.id || 1}`)} className="btn-hero-outline">
                + Add to Library
              </button>
            </div>
          </div>

          <div className="hero-cover-area">
            <div className="hero-glow-card" onClick={() => navigate(`/comic/${spotlightComic.id || 1}`)}>
              {isEmoji(spotlightCover) ? (
                <div className="hero-cover-emoji-fallback">{spotlightCover}</div>
              ) : (
                <img src={spotlightCover} alt={spotlightTitle} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTIONS WRAPPER */}
      <div className="home-sections-container">

        {/* SECTION 1: RECOMMENDED COMICS */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-title-group">
              <h2 className="section-title">Recommended for You</h2>
              <span className="section-subtitle">Specially curated series based on your interests</span>
            </div>
          </div>

          {recsLoading ? (
            <div className="recommended-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-comic-card">
                  <div className="skeleton-img skeleton-shimmer" style={{ aspectRatio: '0.7', height: 'auto' }}></div>
                  <div className="skeleton-line skeleton-shimmer short" style={{ marginTop: '12px' }}></div>
                  <div className="skeleton-line skeleton-shimmer medium"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="recommended-grid">
              {recommended.map((comic) => (
                <ComicCard key={comic.id} comic={comic} />
              ))}
            </div>
          )}
        </section>

        {/* SECTION 2: HOT COMICS (SPLIT VIEW) */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-title-group">
              <h2 className="section-title">Trending Comics</h2>
              <span className="section-subtitle">Most read and discussed series this week</span>
            </div>
            <span style={{ cursor: 'pointer' }} className="section-view-all" onClick={() => navigate('/ranking?timeframe=day')}>
              Full Leaderboard <span>›</span>
            </span>
          </div>

          {trendingLoading ? (
            <div className="hot-section-split">
              <div className="hot-featured-wrapper">
                <div className="skeleton-comic-card" style={{ height: '360px', width: '100%' }}>
                  <div className="skeleton-img skeleton-shimmer" style={{ height: '70%' }}></div>
                  <div className="skeleton-line skeleton-shimmer short" style={{ marginTop: '12px' }}></div>
                  <div className="skeleton-line skeleton-shimmer long"></div>
                </div>
              </div>
              <div className="hot-ranking-list">
                {[...Array(4)].map((_, i) => (
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
            <div className="hot-section-split">
              {/* Left Column: #1 Hot Comic Feature Card */}
              {trending[0] && (
                <div className="hot-featured-wrapper">
                  <div
                    className="hot-featured-card"
                    onClick={() => navigate(`/comic/${trending[0].id}`)}
                  >
                    <div className="hot-featured-cover">
                      {isEmoji(trending[0].cover) ? (
                        <div className="hot-featured-cover-emoji-fallback">{trending[0].cover}</div>
                      ) : (
                        <img src={trending[0].cover} alt={trending[0].title} />
                      )}
                      <div className="hot-rank-pill-featured">
                        <span>🏆</span> RANK #1
                      </div>
                    </div>
                    <div className="hot-featured-info">
                      <h3 className="hot-featured-title">{trending[0].title}</h3>
                      <p className="hot-featured-tagline">{trending[0].tagline || trending[0].summary || 'The top ranked comic of the day.'}</p>
                      <div className="hot-featured-meta">
                        <span style={{ color: '#ec4899', fontWeight: '600' }}>{getPrimaryGenre(trending[0])}</span>
                        <span>⭐ {trending[0].rating !== undefined ? trending[0].rating : (trending[0].ratingAverage ?? '0.0')} ({trending[0].views || trending[0].viewCount || 0} views)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Right Column: Rank list 2 to 5 */}
              <div className="hot-ranking-list">
                {trending.slice(1, 5).map((comic, index) => (
                  <div
                    key={comic.id}
                    className="ranking-item"
                    onClick={() => navigate(`/comic/${comic.id}`)}
                  >
                    <span className={`rank-number top-${index + 2}`}>
                      0{index + 2}
                    </span>
                    <div className="rank-item-thumb">
                      {isEmoji(comic.cover) ? (
                        <div className="rank-item-thumb-emoji-fallback">{comic.cover}</div>
                      ) : (
                        <img src={comic.cover} alt={comic.title} />
                      )}
                    </div>
                    <div className="rank-item-details">
                      <h4 className="rank-item-title">{comic.title}</h4>
                      <span className="rank-item-genre">{getPrimaryGenre(comic)}</span>
                    </div>
                    <div className="rank-item-meta">
                      <div className="rank-item-meta-item" style={{ color: '#fbbf24' }}>
                        <span>⭐</span> {comic.rating !== undefined ? comic.rating : (comic.ratingAverage ?? '0.0')}
                      </div>
                      <div className="rank-item-meta-item">
                        <span>👁️</span> {comic.views || comic.viewCount || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3: NEWLY UPDATED COMICS */}
        <section className="home-section">
          <div className="section-header">
            <div className="section-title-group">
              <h2 className="section-title">New Chapters</h2>
              <span className="section-subtitle">Freshly updated series from our creators</span>
            </div>
            <span style={{ cursor: 'pointer' }} className="section-view-all" onClick={() => navigate('/explore?sortBy=Recently Updated')}>
              Explore <span>›</span>
            </span>
          </div>

          {updatesLoading ? (
            <div className="updates-grid">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton-comic-card" style={{ flexDirection: 'row', gap: '16px', padding: '12px' }}>
                  <div className="skeleton-img skeleton-shimmer" style={{ width: '80px', height: '110px', flexShrink: 0 }}></div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="skeleton-line medium" style={{ height: '12px' }}></div>
                    <div className="skeleton-line short" style={{ height: '10px', opacity: 0.6 }}></div>
                    <div className="skeleton-line long" style={{ marginTop: '12px', height: '8px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="updates-grid">
              {newUpdates.map((comic) => (
                <div
                  key={comic.id}
                  className="update-card"
                >
                  <div className="update-thumb" onClick={() => navigate(`/comic/${comic.id}`)}>
                    {isEmoji(comic.cover) ? (
                      <div className="update-thumb-emoji-fallback">{comic.cover}</div>
                    ) : (
                      <img src={comic.cover} alt={comic.title} />
                    )}
                    <span className="update-badge-new">NEW</span>
                  </div>
                  <div className="update-info">
                    <div className="update-title-block">
                      <h3 className="update-title" onClick={() => navigate(`/comic/${comic.id}`)}>{comic.title}</h3>
                      <span className="update-genre">{getPrimaryGenre(comic)}</span>
                    </div>

                    <div className="update-chapters-list">
                      {comic.chapters && comic.chapters.length > 0 ? (
                        comic.chapters.map((ch, idx) => (
                          <span
                            key={idx}
                            className="update-chapter-row"
                            onClick={() => {
                              if (ch.id) {
                                navigate(`/comic/${comic.id}/chapter/${ch.id}`)
                              } else {
                                navigate(`/comic/${comic.id}`)
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <span className="update-chapter-num">{ch.num}</span>
                            <span className="update-chapter-time">{ch.time}</span>
                          </span>
                        ))
                      ) : (
                        <span className="update-chapter-row" onClick={() => navigate(`/comic/${comic.id}`)} style={{ cursor: 'pointer' }}>
                          <span className="update-chapter-num">No Chapters</span>
                          <span className="update-chapter-time">-</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </HomeLayout>
  )
}

export default Home
