import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import HomeLayout from '../../components/layout/HomeLayout'
import ComicCard from '../../components/common/ComicCard'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import {
  getExploreComicsApi,
  getComicRecommendationsApi,
  getComicLeaderboardApi
} from '../../services/api/ComicApi'
import { getChaptersByComicIdApi } from '../../services/api/ChapterApi'

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

  // Carousel Slider & Prefetch States
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visibleItems, setVisibleItems] = useState(6)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const isMountedRef = useRef(true)
  const nextCursorRef = useRef(null)
  const nextReferenceIdRef = useRef(null)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Handle responsive visible items matching the CSS breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width <= 480) {
        setVisibleItems(2)
      } else if (width <= 768) {
        setVisibleItems(3)
      } else if (width <= 1200) {
        setVisibleItems(4)
      } else {
        setVisibleItems(6)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Helper to detect if cover is an emoji character
  const isEmoji = (str) => {
    if (!str) return false
    return !str.includes('/') && !str.includes('.') && str.trim().length <= 4
  }

  const syncWithLocalOverride = (comic) => {
    try {
      const savedLocal = localStorage.getItem('comiverse_local_comic_' + comic.id);
      if (savedLocal) {
        const parsed = JSON.parse(savedLocal);
        const merged = { ...comic, ...parsed };
        
        // Don't let an older local timestamp overwrite a fresh one
        if (comic.lastChapterUpdatedAt && parsed.lastChapterUpdatedAt) {
          if (new Date(comic.lastChapterUpdatedAt) > new Date(parsed.lastChapterUpdatedAt)) {
            merged.lastChapterUpdatedAt = comic.lastChapterUpdatedAt;
          }
        }
        
        // Don't let older local chapters override the freshly merged chapters
        if (comic.chaptersList && (!parsed.chaptersList || parsed.chaptersList.length < comic.chaptersList.length)) {
          merged.chaptersList = comic.chaptersList;
        }
        
        return merged;
      }
    } catch(e) {}
    return comic;
  };

  // Helper to reliably extract arrays from AxiosClient-unwrapped API responses
  const getArrayOrData = (res) => {
    let arr = []
    if (!res) arr = []
    else if (Array.isArray(res)) arr = res
    else if (res.data && Array.isArray(res.data)) arr = res.data
    else if (res.data?.data && Array.isArray(res.data.data)) arr = res.data.data
    return arr.map(syncWithLocalOverride)
  }

  const handleFetchRecommendations = async (isInitial = false, signal = undefined) => {
    if (!isInitial && loadingMoreRef.current) return
    if (!isInitial && !hasMore) return

    try {
      if (isInitial) {
        setRecsLoading(true)
      } else {
        setLoadingMore(true)
        loadingMoreRef.current = true
      }

      const params = {
        size: 8,
        cursor: isInitial ? undefined : (nextCursorRef.current || undefined),
        referenceId: isInitial ? undefined : (nextReferenceIdRef.current || undefined)
      }

      const res = await getComicRecommendationsApi(params, { signal })
      
      let newList = []
      let newNextCursor = null
      let newNextReferenceId = null
      let newHasMore = false

      if (res) {
        if (Array.isArray(res)) {
          newList = res
          newHasMore = false
        } else if (res.data && Array.isArray(res.data)) {
          newList = res.data
          newNextCursor = res.nextCursor
          newNextReferenceId = res.nextReferenceId
          newHasMore = res.hasMore || false
        } else if (res.success && res.data) {
          const nested = res.data
          newList = nested.data || []
          newNextCursor = nested.nextCursor
          newNextReferenceId = nested.nextReferenceId
          newHasMore = nested.hasMore || false
        }
      }

      newList = newList.map(syncWithLocalOverride)

      if (!isMountedRef.current) return

      nextCursorRef.current = newNextCursor
      nextReferenceIdRef.current = newNextReferenceId
      setHasMore(newHasMore)

      if (isInitial) {
        setRecommended(newList)
      } else {
        setRecommended(prev => {
          const existingIds = new Set(prev.map(item => item.id))
          const filteredNewList = newList.filter(item => !existingIds.has(item.id))
          return [...prev, ...filteredNewList]
        })
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && !axios.isCancel(err)) {
        console.error('Failed to fetch recommendations:', err)
        if (isInitial && isMountedRef.current) {
          setRecommended([])
        }
      }
    } finally {
      if (isMountedRef.current) {
        // Prevent setting loading state if request was aborted
        if (!isInitial || (signal && !signal.aborted) || !signal) {
          if (isInitial) {
            setRecsLoading(false)
          } else {
            setLoadingMore(false)
            loadingMoreRef.current = false
          }
        }
      }
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < recommended.length - visibleItems) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)

      // Prefetch check: trigger when the 7th item (index = nextIndex + visibleItems - 1) is visible
      // but only if we have more and aren't already loading.
      if (hasMore && !loadingMoreRef.current && nextIndex + visibleItems - 1 >= recommended.length - 2) {
        handleFetchRecommendations(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    // 1. Fetch initial recommendations
    handleFetchRecommendations(true, signal)

    // 2. Fetch trending/leaderboard (timeframe = day)
    getComicLeaderboardApi({ timeframe: 'day' }, { signal })
      .then((res) => {
        if (isMountedRef.current) {
          setTrending(getArrayOrData(res))
        }
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && !axios.isCancel(err)) {
          console.error('Failed to fetch leaderboard:', err)
          if (isMountedRef.current) setTrending([])
        }
      })
      .finally(() => {
        if (isMountedRef.current && !signal.aborted) {
          setTrendingLoading(false)
        }
      })

    // 3. Fetch explore/recently updated (sortBy = updatedAt, size = 8)
    getExploreComicsApi({ sortBy: 'updatedAt', size: 8 }, { signal })
      .then(async (res) => {
        let exploreList = getArrayOrData(res)

        try {
          const subsStr = localStorage.getItem('comiverse_moderator_submissions_override');
          if (subsStr) {
            const subs = JSON.parse(subsStr).filter(s => s.status === 'approved' && (s.title || s.comicTitle || s.comicName));
            subs.forEach(sub => {
              const comicTitle = (sub.title || sub.comicTitle || sub.comicName).trim();
              const stableId = sub.comicId || (sub.id ? `comic-${sub.id}` : (sub.submissionId ? `comic-${sub.submissionId}` : `comic-${comicTitle.replace(/\s+/g, '-').toLowerCase()}`));
              
              let chapsList = Array.isArray(sub.allChapters) ? sub.allChapters : (Array.isArray(sub.chapters) ? (typeof sub.chapters[0] === 'object' ? sub.chapters : []) : []);
              if (chapsList.length === 0 && (sub.chapterNumber || sub.number)) {
                chapsList = [{
                  id: sub.chapterId || sub.id || sub.submissionId || Date.now(),
                  chapterNumber: sub.chapterNumber || sub.number,
                  createdAt: sub.approvedAt || new Date().toISOString()
                }];
              }
              const latestChapTime = chapsList.length > 0 ? (chapsList[chapsList.length - 1].createdAt || sub.approvedAt || new Date().toISOString()) : (sub.approvedAt || new Date().toISOString());

              const existingIdx = exploreList.findIndex(c => c.id === stableId || c.title?.toLowerCase() === comicTitle.toLowerCase());
              if (existingIdx !== -1) {
                const existingChaps = exploreList[existingIdx].chaptersList || [];
                // Merge the new chapters into existing chapters list
                const mergedChaps = [...existingChaps];
                chapsList.forEach(newChap => {
                  if (!mergedChaps.some(c => c.chapterNumber === newChap.chapterNumber || c.id === newChap.id)) {
                    mergedChaps.push(newChap);
                  }
                });
                exploreList[existingIdx] = { ...exploreList[existingIdx], lastChapterUpdatedAt: latestChapTime, chaptersList: mergedChaps };
              } else {
                exploreList.push({
                  id: stableId,
                  title: comicTitle,
                  cover: sub.cover || sub.coverImage || sub.coverImageUrl,
                  lastChapterUpdatedAt: latestChapTime,
                  chaptersList: chapsList
                });
              }
            });
          }
        } catch(e) {}

        exploreList = exploreList.map(syncWithLocalOverride).filter(c => !c.archived);
        exploreList.sort((a, b) => new Date(b.lastChapterUpdatedAt || 0) - new Date(a.lastChapterUpdatedAt || 0));
        exploreList = exploreList.slice(0, 8);

        if (exploreList.length === 0) {
          if (isMountedRef.current) {
            setNewUpdates([])
            setUpdatesLoading(false)
          }
          return
        }

        try {
          const resolved = await Promise.all(
            exploreList.map(async (comic) => {
              if (comic.chaptersList && comic.chaptersList.length > 0) {
                 const chaps = comic.chaptersList.slice(-2).reverse().map(ch => ({
                   id: ch.id || ch.chapterId,
                   num: `Ch. ${ch.chapterNumber || ch.number || ''}`,
                   time: formatTimeAgo(ch.createdAt || comic.lastChapterUpdatedAt)
                 }));
                 return { ...comic, chapters: chaps }
              }

              try {
                const chRes = await getChaptersByComicIdApi(comic.id, { signal })
                const chData = getArrayOrData(chRes)
                const chapters = chData.slice(0, 2).map((ch) => ({
                  id: ch.id,
                  num: `Ch. ${ch.chapterNumber || ch.number || ''}`,
                  time: formatTimeAgo(ch.createdAt),
                }))
                return { ...comic, chapters }
              } catch (chErr) {
                if (chErr.name === 'CanceledError' || axios.isCancel(chErr)) {
                  throw chErr // Bubble up to cancel the whole Promise.all if aborted
                }
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
          if (isMountedRef.current) {
            setNewUpdates(resolved)
          }
        } catch (err) {
          if (err.name !== 'CanceledError' && !axios.isCancel(err)) {
            console.error('Failed to resolve chapters:', err)
            if (isMountedRef.current) {
              setNewUpdates(exploreList)
            }
          }
        } finally {
          if (isMountedRef.current && !signal.aborted) {
            setUpdatesLoading(false)
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'CanceledError' && !axios.isCancel(err)) {
          console.error('Failed to fetch recently updated explore:', err)
          if (isMountedRef.current) {
            setNewUpdates([])
            setUpdatesLoading(false)
          }
        }
      })

    return () => {
      controller.abort()
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
            <div className="recommended-slider-container">
              {/* Back button */}
              <button 
                className="slider-nav-btn prev-btn" 
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label="Previous recommendations"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              {/* Slider Viewport */}
              <div className="recommended-slider-viewport">
                <div 
                  className="recommended-slider-track"
                  style={{
                    transform: `translateX(calc(-${currentIndex} * ((100% - ${(visibleItems - 1) * 20}px) / ${visibleItems} + 20px)))`
                  }}
                >
                  {recommended.map((comic) => (
                    <div key={comic.id} className="recommended-slider-item">
                      <ComicCard comic={comic} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Next button */}
              <button 
                className="slider-nav-btn next-btn" 
                onClick={handleNext}
                disabled={(currentIndex >= recommended.length - visibleItems && !hasMore) || (currentIndex >= recommended.length - visibleItems && loadingMore)}
                aria-label="Next recommendations"
              >
                {loadingMore && currentIndex >= recommended.length - visibleItems ? (
                  <span className="slider-spinner" />
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </button>
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
                <div className="skeleton-comic-card" style={{ height: '508px', width: '100%' }}>
                  <div className="skeleton-img skeleton-shimmer" style={{ height: '70%' }}></div>
                  <div className="skeleton-line skeleton-shimmer short" style={{ marginTop: '12px' }}></div>
                  <div className="skeleton-line skeleton-shimmer long"></div>
                </div>
              </div>
              <div className="hot-ranking-list">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="ranking-item skeleton-shimmer" style={{ height: '92px', background: 'rgba(255,255,255,0.02)', padding: '10px 16px', display: 'flex', alignItems: 'center', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
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

              {/* Right Column: Rank list 2 to 6 */}
              <div className="hot-ranking-list">
                {trending.slice(1, 6).map((comic, index) => (
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
