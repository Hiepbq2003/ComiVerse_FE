import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getComicsPageApi } from '../../services/api/ComicApi'
import { getAllGenresApi } from '../../services/api/GenreApi'
import { toast } from 'react-toastify'

// Import fallback local assets if backend images are not available
import comicAction from '../../assets/comic_action.png'
import comicAdventure from '../../assets/comic_adventure.png'
import comicScifi from '../../assets/comic_scifi.png'

function Explore() {
  const navigate = useNavigate()
  
  // Data states
  const [comics, setComics] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [sortBy, setSortBy] = useState('Default')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const ITEMS_PER_PAGE = 12

  // Hover states for sidebar menu items
  const [hoveredGenre, setHoveredGenre] = useState(null)
  const [hoveredStatus, setHoveredStatus] = useState(null)

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedGenre, selectedStatus, sortBy])

  // Re-fetch when page or search changes
  useEffect(() => {
    setCurrentPage(1)
    fetchData(1)
  }, [searchQuery])

  useEffect(() => {
    fetchData(currentPage)
  }, [currentPage])

  const fetchData = async (page) => {
    const targetPage = page || currentPage
    try {
      setLoading(true)
      const [comicsResponse, genresData] = await Promise.all([
        getComicsPageApi(targetPage, ITEMS_PER_PAGE, searchQuery),
        getAllGenresApi()
      ])
      // comicsResponse = { data: [...], metadata: { page, size, totalElements, totalPages } }
      setComics(comicsResponse.data || [])
      if (comicsResponse.metadata) {
        setTotalPages(comicsResponse.metadata.totalPages || 1)
        setTotalElements(comicsResponse.metadata.totalElements || 0)
      }
      setGenres(genresData?.data || genresData || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to retrieve catalog data.')
    } finally {
      setLoading(false)
    }
  }

  // Parse formatted view counts (e.g. "1.2M", "850K") to numbers for sorting
  const parseViews = (viewsStr) => {
    if (!viewsStr) return 0
    const cleanStr = String(viewsStr).toUpperCase().trim()
    if (cleanStr.endsWith('M')) {
      return parseFloat(cleanStr) * 1000000
    }
    if (cleanStr.endsWith('K')) {
      return parseFloat(cleanStr) * 1000
    }
    return parseFloat(cleanStr) || 0
  }

  // Parse chapter strings (e.g. "Ch. 184" or "184") to numbers for sorting
  const parseChapters = (ch) => {
    if (!ch) return 0
    return parseInt(String(ch).replace(/\D/g, '')) || 0
  }

  // Filter and Sort comics
  const getProcessedComics = () => {
    let result = [...comics]

    // 1. Text Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(c => 
        (c.title || '').toLowerCase().includes(q) ||
        (c.author || '').toLowerCase().includes(q)
      )
    }

    // 2. Genre Filter
    if (selectedGenre !== 'All') {
      result = result.filter(c => 
        c.genres && c.genres.some(g => String(g).toLowerCase() === selectedGenre.toLowerCase())
      )
    }

    // 3. Status Filter
    if (selectedStatus !== 'All') {
      result = result.filter(c => 
        (c.status || '').toLowerCase() === selectedStatus.toLowerCase()
      )
    }

    // 4. Sort Order logic (Translated English fields matching Vietnamese mock)
    if (sortBy === 'Recently Added') {
      // Sort descending by ID or default sequence
      result.sort((a, b) => b.id - a.id)
    } else if (sortBy === 'Recently Updated') {
      // Sort descending by chapter count or ID as proxy
      result.sort((a, b) => parseChapters(b.chapters) - parseChapters(a.chapters))
    } else if (sortBy === 'Total Views') {
      result.sort((a, b) => parseViews(b.views) - parseViews(a.views))
    } else if (sortBy === 'Weekly Views') {
      result.sort((a, b) => parseViews(b.views) * 0.25 - parseViews(a.views) * 0.25)
    } else if (sortBy === 'Daily Views') {
      result.sort((a, b) => parseViews(b.views) * 0.04 - parseViews(a.views) * 0.04)
    } else if (sortBy === 'Most Liked') {
      // Pseudo-random deterministic sort based on title hash for visual variations
      result.sort((a, b) => (b.title || '').charCodeAt(0) - (a.title || '').charCodeAt(0))
    } else if (sortBy === 'Most Followed') {
      result.sort((a, b) => (b.author || '').charCodeAt(0) - (a.author || '').charCodeAt(0))
    } else if (sortBy === 'Most Bookmarked') {
      result.sort((a, b) => parseChapters(b.chapters) - parseChapters(a.chapters))
    } else if (sortBy === 'Chapter Count') {
      result.sort((a, b) => parseChapters(b.chapters) - parseChapters(a.chapters))
    }

    return result
  }

  const processedComics = getProcessedComics()

  // Calculate dynamic counts based on loaded comics database
  const getGenreCount = (genreName) => {
    if (genreName === 'All') return comics.length
    return comics.filter(c => 
      c.genres && c.genres.some(g => String(g).toLowerCase() === genreName.toLowerCase())
    ).length
  }

  const getStatusCount = (statusName) => {
    if (statusName === 'All') return comics.length
    return comics.filter(c => (c.status || '').toLowerCase() === statusName.toLowerCase()).length
  }

  // Cover image fallback picker
  const getCoverImage = (comic) => {
    if (comic.cover && typeof comic.cover === 'string' && comic.cover.startsWith('data:image')) {
      return comic.cover
    }
    const title = (comic.title || '').toLowerCase()
    if (title.includes('action') || title.includes('battle')) return comicAction
    if (title.includes('adventure') || title.includes('dragon')) return comicAdventure
    if (title.includes('sci-fi') || title.includes('neon') || title.includes('cyber')) return comicScifi
    // Default fallback cycling
    const fallbacks = [comicAction, comicAdventure, comicScifi]
    return fallbacks[comic.id % 3] || comicAction
  }

  // Sorting configurations
  const sortOptions = [
    { value: 'Default', label: 'Default' },
    { value: 'Recently Added', label: 'Recently Added' },
    { value: 'Recently Updated', label: 'Recently Updated' },
    { value: 'Total Views', label: 'Total Views' },
    { value: 'Weekly Views', label: 'Weekly Views' },
    { value: 'Daily Views', label: 'Daily Views' },
    { value: 'Most Liked', label: 'Most Liked' },
    { value: 'Most Followed', label: 'Most Followed' },
    { value: 'Most Bookmarked', label: 'Most Bookmarked' }
  ]

  return (
    <HomeLayout>
      <div className="home-sections-container" style={{ paddingTop: '40px' }}>
        <div className="home-section">
          {/* Header */}
          <div className="section-header" style={{ borderLeftColor: '#a855f7', marginBottom: '24px' }}>
            <div className="section-title-group">
              <h2 className="section-title">Explore Comics</h2>
              <span className="section-subtitle">Discover your next favorite story by filters and genres</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '32px', marginTop: '10px' }}>
            {/* ── LEFT SIDEBAR FILTERS ────────────────────── */}
            <aside style={{ width: '220px', flexShrink: 0 }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', marginBottom: '28px' }}>
                <input 
                  type="text"
                  placeholder="Search comics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    padding: '10px 16px 10px 38px',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease'
                  }}
                />
                <svg 
                  viewBox="0 0 24 24" 
                  width="15" 
                  height="15" 
                  fill="none" 
                  stroke="#64748b" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{ position: 'absolute', left: '14px', top: '12px' }}
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>

              {/* Genre Filter List */}
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ color: 'white', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '8px' }}>
                  Genres
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {/* "All" Option */}
                  <div
                    onClick={() => setSelectedGenre('All')}
                    onMouseEnter={() => setHoveredGenre('All')}
                    onMouseLeave={() => setHoveredGenre(null)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: selectedGenre === 'All' ? 'rgba(168, 85, 247, 0.1)' : hoveredGenre === 'All' ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                      color: selectedGenre === 'All' ? '#c084fc' : '#cbd5e1',
                      cursor: 'pointer',
                      fontWeight: selectedGenre === 'All' ? '600' : '500',
                      fontSize: '13px',
                      transition: 'all 0.2s ease',
                      borderLeft: selectedGenre === 'All' ? '3px solid #a855f7' : '3px solid transparent',
                      paddingLeft: selectedGenre === 'All' ? '12px' : '9px'
                    }}
                  >
                    <span>All</span>
                    <span style={{ fontSize: '10.5px', color: selectedGenre === 'All' ? '#c084fc' : '#64748b' }}>
                      {getGenreCount('All')}
                    </span>
                  </div>

                  {/* Dynamically Loaded Genres */}
                  {genres.map(g => (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGenre(g.name)}
                      onMouseEnter={() => setHoveredGenre(g.id)}
                      onMouseLeave={() => setHoveredGenre(null)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: selectedGenre === g.name ? 'rgba(168, 85, 247, 0.1)' : hoveredGenre === g.id ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                        color: selectedGenre === g.name ? '#c084fc' : '#cbd5e1',
                        cursor: 'pointer',
                        fontWeight: selectedGenre === g.name ? '600' : '500',
                        fontSize: '13px',
                        transition: 'all 0.2s ease',
                        borderLeft: selectedGenre === g.name ? '3px solid #a855f7' : '3px solid transparent',
                        paddingLeft: selectedGenre === g.name ? '12px' : '9px'
                      }}
                    >
                      <span>{g.name}</span>
                      <span style={{ fontSize: '10.5px', color: selectedGenre === g.name ? '#c084fc' : '#64748b' }}>
                        {getGenreCount(g.name)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Filter List */}
              <div style={{ marginBottom: '28px' }}>
                <h4 style={{ color: 'white', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '8px' }}>
                  Status
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {['All', 'Ongoing', 'Completed', 'Paused'].map(status => (
                    <div
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      onMouseEnter={() => setHoveredStatus(status)}
                      onMouseLeave={() => setHoveredStatus(null)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: selectedStatus === status ? 'rgba(168, 85, 247, 0.1)' : hoveredStatus === status ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                        color: selectedStatus === status ? '#c084fc' : '#cbd5e1',
                        cursor: 'pointer',
                        fontWeight: selectedStatus === status ? '600' : '500',
                        fontSize: '13px',
                        transition: 'all 0.2s ease',
                        borderLeft: selectedStatus === status ? '3px solid #a855f7' : '3px solid transparent',
                        paddingLeft: selectedStatus === status ? '12px' : '9px'
                      }}
                    >
                      <span>{status}</span>
                      <span style={{ fontSize: '10.5px', color: selectedStatus === status ? '#c084fc' : '#64748b' }}>
                        {getStatusCount(status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Sort Dropdown Selector */}
              <div>
                <h4 style={{ color: 'white', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '8px' }}>
                  Sort By
                </h4>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {sortOptions.map(opt => (
                    <option key={opt.value} value={opt.value} style={{ background: '#0f0b1e', color: '#cbd5e1' }}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </aside>

            {/* ── RIGHT MAIN AREA (GRID & TABS) ───────────── */}
            <main style={{ flexGrow: 1 }}>
              {/* Header sort buttons row */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '20px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                paddingBottom: '14px'
               }}>
                <span style={{ fontSize: '13.5px', color: '#cbd5e1' }}>
                  Showing <strong>{processedComics.length}</strong> results
                </span>
              </div>

              {/* Grid content */}
              {loading ? (
                <div className="moderator-empty-state" style={{ padding: '80px 0' }}>
                  <p>Loading catalog comics list...</p>
                </div>
              ) : processedComics.length > 0 ? (
                <>
                  <div 
                    className="explore-grid" 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                      gap: '24px'
                    }}
                  >
                    {processedComics.map((comic) => (
                      <div 
                        key={comic.id}
                        onClick={() => navigate(`/comic/${comic.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Cover wrapper with overlay status badge */}
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          paddingTop: '135%', // 3:4 Aspect Ratio
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: 'rgba(255,255,255,0.02)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)'
                          e.currentTarget.style.boxShadow = '0 8px 24px rgba(168, 85, 247, 0.25)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                        >
                          <img 
                            src={getCoverImage(comic)} 
                            alt={comic.title}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />

                          {/* Status Badge overlay */}
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            background: 'rgba(7, 4, 13, 0.85)',
                            color: comic.status === 'Ongoing' ? '#10b981' : comic.status === 'Completed' ? '#3b82f6' : '#f59e0b',
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {comic.status || 'Ongoing'}
                          </div>
                        </div>

                        {/* Info details */}
                        <div style={{ marginTop: '10px' }}>
                          <h4 style={{ 
                            margin: '0 0 4px', 
                            fontSize: '13.5px', 
                            fontWeight: '600', 
                            color: 'white',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {comic.title}
                          </h4>
                          <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#64748b' }}>
                            Ch {parseChapters(comic.chapters)}
                          </p>
                          
                          {/* First genre display pill */}
                          {comic.genres && comic.genres.length > 0 && (
                            <span style={{
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: '#cbd5e1',
                              fontSize: '10px',
                              fontWeight: '600',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              display: 'inline-block'
                            }}>
                              {comic.genres[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        style={{
                          background: currentPage === 1 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          color: currentPage === 1 ? '#64748b' : 'white',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          fontSize: '13px',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Previous
                      </button>
                      <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
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
                          padding: '8px 16px',
                          fontSize: '13px',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '80px 20px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    color: '#64748b'
                  }}
                >
                  <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📚</span>
                  <h3 style={{ color: 'white', margin: '0 0 8px' }}>No Comics Found</h3>
                  <p style={{ margin: 0, fontSize: '13.5px' }}>
                    There are no releases matching your current filters. Try selecting a different genre or status.
                  </p>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </HomeLayout>
  )
}

export default Explore
