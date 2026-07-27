import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import HomeLayout from '../../components/layout/HomeLayout'
import { getExploreComicsApi } from '../../services/api/ComicApi'
import { getAllGenresApi } from '../../services/api/GenreApi'
import ComicCard from '../../components/common/ComicCard'
import { toast } from 'react-toastify'
import { mapToComicDTO } from '../../utils/comicModels'


function Explore() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialSortBy = searchParams.get('sortBy') || 'Default'
  
  // Data states
  const [comics, setComics] = useState([])
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter & Sort states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenres, setSelectedGenres] = useState(['All'])
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [sortBy, setSortBy] = useState(initialSortBy)
  
  // Dropdown visibility states & refs
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [isGenresOpen, setIsGenresOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  
  const sortDropdownRef = useRef(null)
  const genresDropdownRef = useRef(null)
  const statusDropdownRef = useRef(null)

  // Cursor pagination states & refs
  const [hasMore, setHasMore] = useState(false)
  const pageCursorsRef = useRef([{ cursor: null, referenceId: null }])
  const prevFiltersRef = useRef({
    selectedGenres,
    selectedStatus,
    sortBy,
    searchQuery
  })

  // Sync sortBy state if search parameters change
  useEffect(() => {
    const urlSortBy = searchParams.get('sortBy')
    if (urlSortBy) {
      setSortBy(urlSortBy)
    }
  }, [searchParams])

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

  const abortControllerRef = useRef(null)

  // Load genres on mount
  useEffect(() => {
    const controller = new AbortController()
    const fetchGenres = async () => {
      try {
        const data = await getAllGenresApi({ signal: controller.signal })
        setGenres(data?.data || data || [])
      } catch (err) {
        if (err.name !== 'CanceledError' && !axios.isCancel(err)) {
          console.error('Failed to load genres:', err)
        }
      }
    }
    fetchGenres()
    return () => {
      controller.abort()
    }
  }, [])

  // Cancel any active fetchData request on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Cover image helper
  const getCoverImage = (comic) => {
    return comic.cover || comic.coverImage || comic.coverImageUrl || '';
  }

  // Helper to format views
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

  // Fetch explore comics logic
  const fetchData = async (page, cursorObj) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      setLoading(true)
      
      // Get selected genre IDs matching their names
      const genreIds = selectedGenres
        .filter(gName => gName !== 'All')
        .map(gName => genres.find(g => g.name === gName)?.id)
        .filter(Boolean)

      const statusParam = selectedStatus !== 'All' ? selectedStatus.toUpperCase() : undefined
      const sortByParam = sortBy !== 'Default' ? sortBy : undefined

      const params = {
        size: ITEMS_PER_PAGE,
        cursor: cursorObj?.cursor || undefined,
        referenceId: cursorObj?.referenceId || undefined,
        genres: genreIds.length > 0 ? genreIds.join(',') : undefined,
        publicationStatus: statusParam,
        sortBy: sortByParam
      }

      const response = await getExploreComicsApi(params, { signal: controller.signal })
      
      let comicsList = []
      let nextCursor = null
      let nextReferenceId = null
      let apiHasMore = false

      if (response) {
        if (Array.isArray(response)) {
          comicsList = response
        } else if (response.data && Array.isArray(response.data)) {
          comicsList = response.data
          nextCursor = response.nextCursor
          nextReferenceId = response.nextReferenceId
          apiHasMore = response.hasMore || false
        } else if (response.success && response.data) {
          const nested = response.data
          comicsList = nested.data || []
          nextCursor = nested.nextCursor
          nextReferenceId = nested.nextReferenceId
          apiHasMore = nested.hasMore || false
        }
      }

      // Preprocess each comic to ensure compatibility with ComicCard component props
      const processedList = comicsList.map(item => {
        const mappedComic = mapToComicDTO(item)
        if (!mappedComic) return null

        const coverUrl = getCoverImage(mappedComic)
        const rating = mappedComic.ratingAverage !== undefined ? mappedComic.ratingAverage.toFixed(1) : '0.0'
        const views = mappedComic.viewCount !== undefined ? formatViews(mappedComic.viewCount) : '0'
        const chapters = mappedComic.chaptersCount || mappedComic.chapterCount || mappedComic.chapters || mappedComic.totalChapters || '0'
        
        return {
          ...mappedComic,
          cover: coverUrl,
          rating,
          views,
          chapters
        }
      }).filter(Boolean)

      setComics(processedList)
      setHasMore(apiHasMore)

      if (apiHasMore) {
        pageCursorsRef.current[page] = { cursor: nextCursor, referenceId: nextReferenceId }
      }
    } catch (err) {
      if (err.name !== 'CanceledError' && !axios.isCancel(err)) {
        console.error('Failed to load explore comics:', err)
        toast.error('Failed to load comics!')
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }

  // Unified effect to handle both pagination and filter resets
  useEffect(() => {
    const filtersChanged = 
      prevFiltersRef.current.selectedGenres !== selectedGenres ||
      prevFiltersRef.current.selectedStatus !== selectedStatus ||
      prevFiltersRef.current.sortBy !== sortBy ||
      prevFiltersRef.current.searchQuery !== searchQuery

    let targetPage = currentPage
    let cursorObj = pageCursorsRef.current[currentPage - 1] || { cursor: null, referenceId: null }

    if (filtersChanged) {
      pageCursorsRef.current = [{ cursor: null, referenceId: null }]
      targetPage = 1
      cursorObj = { cursor: null, referenceId: null }
      
      prevFiltersRef.current = {
        selectedGenres,
        selectedStatus,
        sortBy,
        searchQuery
      }

      if (currentPage !== 1) {
        setCurrentPage(1)
        return
      }
    }

    const hasGenreFilter = selectedGenres.some(gName => gName !== 'All')
    if (hasGenreFilter && genres.length === 0) {
      return
    }

    fetchData(targetPage, cursorObj)
  }, [currentPage, selectedGenres, selectedStatus, sortBy, searchQuery, genres])

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
                    {['All', 'Ongoing', 'Completed', 'Hiatus'].map((status) => {
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
                  Showing <strong>{comics.length}</strong> results
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
              ) : comics.length > 0 ? (
                <>
                  <div 
                    className="explore-grid" 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                      gap: '24px'
                    }}
                  >
                    {comics.map((comic) => (
                      <ComicCard key={comic.id} comic={comic} />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {(currentPage > 1 || hasMore) && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1 || loading}
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
                        Page <strong>{currentPage}</strong>
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        disabled={!hasMore || loading}
                        style={{
                          background: !hasMore ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          color: !hasMore ? '#64748b' : 'white',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          fontSize: '13px',
                          cursor: !hasMore ? 'not-allowed' : 'pointer',
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
