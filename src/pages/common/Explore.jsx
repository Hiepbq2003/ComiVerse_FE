import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getComicsPageApi } from '../../services/api/ComicApi'
import { getAllGenresApi } from '../../services/api/GenreApi'
import { toast } from 'react-toastify'
import { MOCK_COMICS } from '../../utils/mockComics'

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
  const [selectedGenres, setSelectedGenres] = useState(['All'])
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [sortBy, setSortBy] = useState('Default')
  
  // Dropdown visibility states & refs
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [isGenresOpen, setIsGenresOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  
  const sortDropdownRef = useRef(null)
  const genresDropdownRef = useRef(null)
  const statusDropdownRef = useRef(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setIsSortOpen(false)
      }
      if (genresDropdownRef.current && !genresDropdownRef.current.contains(event.target)) {
        setIsGenresOpen(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setIsStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Genre multi-select toggler
  const handleToggleGenre = (genreName) => {
    if (genreName === 'All') {
      setSelectedGenres(['All'])
    } else {
      setSelectedGenres(prev => {
        const filtered = prev.filter(g => g !== 'All')
        if (filtered.includes(genreName)) {
          const updated = filtered.filter(g => g !== genreName)
          return updated.length === 0 ? ['All'] : updated
        } else {
          return [...filtered, genreName]
        }
      })
    }
  }

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12

  // Hover states for sidebar menu items
  const [hoveredGenre, setHoveredGenre] = useState(null)
  const [hoveredStatus, setHoveredStatus] = useState(null)

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedGenres, selectedStatus, sortBy])

  // Re-fetch when page or search changes
  useEffect(() => {
    setCurrentPage(1)
    fetchData(1)
  }, [searchQuery])

  useEffect(() => {
    fetchData(currentPage)
  }, [currentPage])

  const fetchData = async (page) => {
    try {
      setLoading(true)
      setComics(MOCK_COMICS)
      setGenres([
        { id: 1, name: 'Action' },
        { id: 2, name: 'Adventure' },
        { id: 3, name: 'Fantasy' },
        { id: 4, name: 'Sci-Fi' }
      ])
    } catch (err) {
      console.error('Failed to load mock data:', err)
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
    if (selectedGenres.length > 0 && !selectedGenres.includes('All')) {
      result = result.filter(c => 
        c.genres && selectedGenres.every(selectedG => 
          c.genres.some(g => String(g).toLowerCase() === selectedG.toLowerCase())
        )
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
  const totalPages = Math.ceil(processedComics.length / ITEMS_PER_PAGE) || 1
  const paginatedComics = processedComics.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )



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

              {/* Genres Dropdown Selector */}
              <div ref={genresDropdownRef} style={{ position: 'relative', marginBottom: '28px' }}>
                <h4 style={{ color: 'white', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '8px' }}>
                  Genres
                </h4>
                <div
                  onClick={() => setIsGenresOpen(!isGenresOpen)}
                  style={{
                    width: '100%',
                    background: isGenresOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                    border: isGenresOpen ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    fontWeight: '500',
                    outline: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    if (!isGenresOpen) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                      e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isGenresOpen) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <span style={{ 
                    color: isGenresOpen ? 'white' : '#cbd5e1', 
                    transition: 'color 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginRight: '8px'
                  }}>
                    {selectedGenres.includes('All') ? 'All Genres' : selectedGenres.join(', ')}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isGenresOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      color: isGenresOpen ? '#c084fc' : '#94a3b8',
                      flexShrink: 0
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                {isGenresOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '0',
                      right: '0',
                      marginTop: '6px',
                      background: 'rgba(13, 9, 25, 0.95)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                      borderRadius: '10px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(168, 85, 247, 0.1)',
                      zIndex: 100,
                      overflowY: 'auto',
                      maxHeight: '210px',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(168, 85, 247, 0.4) transparent',
                      padding: '4px',
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* "All" Option */}
                    <div
                      onClick={() => handleToggleGenre('All')}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        color: selectedGenres.includes('All') ? 'white' : '#cbd5e1',
                        background: selectedGenres.includes('All') ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)' : 'transparent',
                        border: selectedGenres.includes('All') ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
                        fontSize: '13px',
                        fontWeight: selectedGenres.includes('All') ? '600' : '400',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '2px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedGenres.includes('All')) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                          e.currentTarget.style.color = 'white'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedGenres.includes('All')) {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = '#cbd5e1'
                        }
                      }}
                    >
                      <span>All</span>
                      {selectedGenres.includes('All') && (
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#c084fc' }}>
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>

                    {/* Dynamically Loaded Genres */}
                    {genres.map((g) => {
                      const isSelected = selectedGenres.includes(g.name)
                      return (
                        <div
                          key={g.id}
                          onClick={() => handleToggleGenre(g.name)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            color: isSelected ? 'white' : '#cbd5e1',
                            background: isSelected ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)' : 'transparent',
                            border: isSelected ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
                            fontSize: '13px',
                            fontWeight: isSelected ? '600' : '400',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '2px',
                            boxSizing: 'border-box'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                              e.currentTarget.style.color = 'white'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.color = '#cbd5e1'
                            }
                          }}
                        >
                          <span>{g.name}</span>
                          {isSelected && (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#c084fc' }}>
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Status Dropdown Selector */}
              <div ref={statusDropdownRef} style={{ position: 'relative', marginBottom: '28px' }}>
                <h4 style={{ color: 'white', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '8px' }}>
                  Status
                </h4>
                <div
                  onClick={() => setIsStatusOpen(!isStatusOpen)}
                  style={{
                    width: '100%',
                    background: isStatusOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                    border: isStatusOpen ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    fontWeight: '500',
                    outline: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    if (!isStatusOpen) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                      e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isStatusOpen) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <span style={{ color: isStatusOpen ? 'white' : '#cbd5e1', transition: 'color 0.2s' }}>
                    {selectedStatus === 'All' ? 'All Statuses' : selectedStatus}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isStatusOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      color: isStatusOpen ? '#c084fc' : '#94a3b8'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                {isStatusOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '0',
                      right: '0',
                      marginTop: '6px',
                      background: 'rgba(13, 9, 25, 0.95)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                      borderRadius: '10px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(168, 85, 247, 0.1)',
                      zIndex: 100,
                      overflowY: 'auto',
                      maxHeight: '210px',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(168, 85, 247, 0.4) transparent',
                      padding: '4px',
                      boxSizing: 'border-box'
                    }}
                  >
                    {['All', 'Ongoing', 'Completed', 'Paused'].map((status) => {
                      const isSelected = selectedStatus === status
                      return (
                        <div
                          key={status}
                          onClick={() => {
                            setSelectedStatus(status)
                            setIsStatusOpen(false)
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            color: isSelected ? 'white' : '#cbd5e1',
                            background: isSelected ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)' : 'transparent',
                            border: isSelected ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
                            fontSize: '13px',
                            fontWeight: isSelected ? '600' : '400',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '2px',
                            boxSizing: 'border-box'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                              e.currentTarget.style.color = 'white'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.color = '#cbd5e1'
                            }
                          }}
                        >
                          <span>{status}</span>
                          {isSelected && (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#c084fc' }}>
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Quick Sort Dropdown Selector */}
              <div ref={sortDropdownRef} style={{ position: 'relative' }}>
                <h4 style={{ color: 'white', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '8px' }}>
                  Sort By
                </h4>
                <div
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  style={{
                    width: '100%',
                    background: isSortOpen ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSortOpen ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#cbd5e1',
                    fontSize: '13px',
                    fontWeight: '500',
                    outline: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSortOpen) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                      e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.6)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSortOpen) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <span style={{ color: isSortOpen ? 'white' : '#cbd5e1', transition: 'color 0.2s' }}>
                    {sortOptions.find(opt => opt.value === sortBy)?.label || 'Default'}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isSortOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      color: isSortOpen ? '#c084fc' : '#94a3b8'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                {isSortOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '0',
                      right: '0',
                      marginTop: '6px',
                      background: 'rgba(13, 9, 25, 0.95)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                      borderRadius: '10px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(168, 85, 247, 0.1)',
                      zIndex: 100,
                      overflowY: 'auto',
                      maxHeight: '210px',
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(168, 85, 247, 0.4) transparent',
                      padding: '4px',
                      boxSizing: 'border-box'
                    }}
                  >
                    {sortOptions.map((opt) => {
                      const isSelected = opt.value === sortBy
                      return (
                        <div
                          key={opt.value}
                          onClick={() => {
                            setSortBy(opt.value)
                            setIsSortOpen(false)
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            color: isSelected ? 'white' : '#cbd5e1',
                            background: isSelected ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)' : 'transparent',
                            border: isSelected ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid transparent',
                            fontSize: '13px',
                            fontWeight: isSelected ? '600' : '400',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '2px',
                            boxSizing: 'border-box'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                              e.currentTarget.style.color = 'white'
                              e.currentTarget.style.paddingLeft = '14px'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'transparent'
                              e.currentTarget.style.color = '#cbd5e1'
                              e.currentTarget.style.paddingLeft = '12px'
                            }
                          }}
                        >
                          <span>{opt.label}</span>
                          {isSelected && (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#c084fc' }}>
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
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
                <div 
                  className="skeleton-comic-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                    gap: '24px',
                    width: '100%'
                  }}
                >
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="skeleton-comic-card">
                      <div className="skeleton-img skeleton-shimmer"></div>
                      <div className="skeleton-line skeleton-shimmer short" style={{ marginTop: '12px' }}></div>
                      <div className="skeleton-line skeleton-shimmer medium"></div>
                    </div>
                  ))}
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
                    {paginatedComics.map((comic) => (
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
