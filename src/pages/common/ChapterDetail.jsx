import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getComicByIdApi } from '../../services/api/ComicApi'
import { getChaptersByComicIdApi, getChapterDetailApi } from '../../services/api/ChapterApi'
import { toast } from 'react-toastify'
import useReaderSecurity from '../../hooks/useReaderSecurity'
import ComicPageCanvas from '../../components/common/ComicPageCanvas'
import '../../assets/style/reader/chapter-detail.css'

function ChapterDetail() {
  const { comicId, chapterId } = useParams()
  const navigate = useNavigate()

  // States
  const [comic, setComic] = useState(null)
  const [currentChapter, setCurrentChapter] = useState(null)
  const [chaptersList, setChaptersList] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMockData, setIsMockData] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)

  const dropdownRef = useRef(null)

  // Enforce client-side copy-protection security
  useReaderSecurity({
    onDevToolsOpen: () => {
      setIsDevToolsOpen(true)

      setCurrentChapter(null)
      setComic(null)
      setChaptersList([])

      toast.error('Security alert: Inspect element or developer tool opened. Reading session is suspended.', {
        position: 'top-right',
        autoClose: 5000,
        theme: 'dark'
      })
    },
    disableDetector: false
  })

  // Scroll to top on chapter change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [chapterId])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch API details or fall back to mock
  useEffect(() => {
    const fetchChapterAndComicInfo = async () => {
      try {
        setLoading(true)

        // Fetch current chapter detail, comic detail, and all chapters of the comic in parallel
        const [chapterRes, chaptersListRes, comicRes] = await Promise.all([
          getChapterDetailApi(chapterId),
          getChaptersByComicIdApi(comicId),
          getComicByIdApi(comicId)
        ])

        const chapterData = chapterRes?.data || chapterRes
        const listData = chaptersListRes?.data || chaptersListRes || []
        const comicData = comicRes?.data || comicRes

        if (!chapterData) {
          throw new Error('Chapter details not found')
        }

        setCurrentChapter(chapterData)
        setChaptersList(listData)
        setComic(comicData)
        setIsMockData(false)
      } catch (err) {
        console.error('API failed for chapter detail, using mock fallbacks:', err.message)
        setIsMockData(true)

        // Try to fetch comic metadata alone if chapter API was the only one that failed
        let fallbackComic = null
        try {
          const cRes = await getComicByIdApi(comicId)
          fallbackComic = cRes?.data || cRes
        } catch (e) {
          fallbackComic = { id: comicId, title: 'Battle Chronicles' }
        }
        setComic(fallbackComic)

        // Try to fetch chapters list if possible
        let fallbackChapters = []
        try {
          const lRes = await getChaptersByComicIdApi(comicId)
          fallbackChapters = lRes?.data || lRes || []
        } catch (e) {
          // Generate mock chapter list
          fallbackChapters = [
            { id: 'chap-1', chapterNumber: '1', title: 'Chapter 1: The Awakening' },
            { id: 'chap-2', chapterNumber: '2', title: 'Chapter 2: Training Arc' },
            { id: 'chap-3', chapterNumber: '3', title: 'Chapter 3: Unexpected Enemies' },
            { id: 'chap-4', chapterNumber: '4', title: 'Chapter 4: Ultimate Strength' }
          ]
        }

        // Ensure current chapter is mock represented
        const currentMockChap = fallbackChapters.find(ch => ch.id === chapterId) || fallbackChapters[0] || {
          id: chapterId,
          chapterNumber: '1',
          title: 'Chapter 1'
        }

        // Add real Cloudinary comic pages for full demonstration in mockup fallback mode
        const mockImages = [
          "https://res.cloudinary.com/dhabvzzaa/image/upload/v1783236066/comiverse/chapters/019f3126-d38a-70d1-8a1b-1637b91e1679/chapter-1/001-01-13357c12-9bdc-40c6-b0c3-b8f302f43e0c.jpg",
          "https://res.cloudinary.com/dhabvzzaa/image/upload/v1783236069/comiverse/chapters/019f3126-d38a-70d1-8a1b-1637b91e1679/chapter-1/002-02-4e49699f-75d7-4b2a-b208-f2d69e61cb57.jpg",
          "https://res.cloudinary.com/dhabvzzaa/image/upload/v1783236072/comiverse/chapters/019f3126-d38a-70d1-8a1b-1637b91e1679/chapter-1/003-03-0be649d7-12a9-4324-b426-3cf1c80177db.jpg",
          "https://res.cloudinary.com/dhabvzzaa/image/upload/v1783236074/comiverse/chapters/019f3126-d38a-70d1-8a1b-1637b91e1679/chapter-1/004-04-fdbf37d5-83f1-4cc9-85f3-599cf61c6abc.jpg",
          "https://res.cloudinary.com/dhabvzzaa/image/upload/v1783236077/comiverse/chapters/019f3126-d38a-70d1-8a1b-1637b91e1679/chapter-1/005-05-2d1b619a-fdf5-4d26-b19d-6c1c10f72386.jpg",
          "https://res.cloudinary.com/dhabvzzaa/image/upload/v1783236080/comiverse/chapters/019f3126-d38a-70d1-8a1b-1637b91e1679/chapter-1/006-06-b76a1e0e-bdd9-4694-8155-e26a32b4168e.jpg",
          "https://res.cloudinary.com/dhabvzzaa/image/upload/v1783236083/comiverse/chapters/019f3126-d38a-70d1-8a1b-1637b91e1679/chapter-1/007-07-01c276d3-cf7a-4e00-a638-0265021246ca.jpg"
        ]

        setCurrentChapter({
          ...currentMockChap,
          images: currentMockChap.images || mockImages
        })
        setChaptersList(fallbackChapters)
      } finally {
        setLoading(false)
      }
    }

    if (comicId && chapterId) {
      fetchChapterAndComicInfo()
    }
  }, [comicId, chapterId])

  // Sorting helper for chapters list: Sort numerically ascending based on chapterNumber
  const sortedChapters = [...chaptersList].sort((a, b) => {
    return Number(a.chapterNumber || 0) - Number(b.chapterNumber || 0)
  })

  // Find index of current chapter
  const currentChapterIndex = sortedChapters.findIndex(
    ch => String(ch.id) === String(chapterId)
  )

  const hasPrevChapter = currentChapterIndex > 0
  const hasNextChapter = currentChapterIndex < sortedChapters.length - 1

  const handleGoToPrevChapter = () => {
    if (hasPrevChapter) {
      const prevChap = sortedChapters[currentChapterIndex - 1]
      navigate(`/comic/${comicId}/chapter/${prevChap.id}`)
    }
  }

  const handleGoToNextChapter = () => {
    if (hasNextChapter) {
      const nextChap = sortedChapters[currentChapterIndex + 1]
      navigate(`/comic/${comicId}/chapter/${nextChap.id}`)
    }
  }

  const handleSelectChapter = (e) => {
    const targetId = e.target.value
    if (targetId) {
      navigate(`/comic/${comicId}/chapter/${targetId}`)
    }
  }

  if (isDevToolsOpen) {
    return (
      <HomeLayout>
        <div className="chapter-reader-container" style={{ justifyContent: 'center' }}>
          <div className="reader-loading-container" style={{ padding: '80px 24px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <span style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</span>
            <h2 style={{ color: '#ef4444', fontWeight: '700', marginBottom: '8px' }}>Security Violation</h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', maxWidth: '400px', textAlign: 'center', lineHeight: '1.6' }}>
              Developer tools are active. For copyrighted content protection, viewing is disabled while DevTools is open.
            </p>
            <button
              className="btn-reader-action"
              style={{ marginTop: '24px' }}
              onClick={() => window.location.reload()}
            >
              Retry Reading
            </button>
          </div>
        </div>
      </HomeLayout>
    )
  }

  if (loading) {
    return (
      <HomeLayout>
        <div className="chapter-reader-container">
          <div className="reader-loading-container">
            <div className="reader-spinner"></div>
            <p>Loading chapter pages...</p>
          </div>
        </div>
      </HomeLayout>
    )
  }

  if (!currentChapter) {
    return (
      <HomeLayout>
        <div className="chapter-reader-container">
          <div className="reader-loading-container">
            <h3>Chapter not found</h3>
            <p>We couldn't load the requested chapter details.</p>
            <Link to={`/comic/${comicId}`} className="btn-reader-secondary-action" style={{ textDecoration: 'none', marginTop: '16px' }}>
              Back to Comic Detail
            </Link>
          </div>
        </div>
      </HomeLayout>
    )
  }

  const pages = currentChapter.images || []
  const currentChapterNumberStr = currentChapter.chapterNumber || '?'
  const currentChapterTitleStr = currentChapter.title || `Chapter ${currentChapterNumberStr}`
  const comicTitleStr = comic?.title || 'Comic Series'

  return (
    <HomeLayout>
      <div className="chapter-reader-container">
        {/* Mock Data Banner Notice */}
        {isMockData && (
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
            color: 'white',
            padding: '8px 24px',
            fontSize: '12px',
            fontWeight: '600',
            width: '100%',
            textAlign: 'center',
            letterSpacing: '0.5px'
          }}>
            🔌 Server offline. Operating in simulation mode with mock chapter content.
          </div>
        )}

        {/* Sticky Control Header */}
        <div className="reader-control-header">
          <div className="reader-header-inner">
            <div className="reader-header-left">
              <Link to={`/comic/${comicId}`} className="btn-reader-back">
                ← Back to Detail
              </Link>
              <div className="reader-comic-title-info">
                <h2 className="reader-comic-meta-title" title={comicTitleStr}>
                  {comicTitleStr}
                </h2>
                <span className="reader-chapter-meta-subtitle">
                  {currentChapterTitleStr}
                </span>
              </div>
            </div>

            <div className="reader-nav-controls">
              <button
                className="btn-reader-nav"
                onClick={handleGoToPrevChapter}
                disabled={!hasPrevChapter}
                title="Previous Chapter"
              >
                ◀ Prev
              </button>

              <div className="reader-chapter-dropdown-container" ref={dropdownRef}>
                <div
                  className={`reader-chapter-dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <span>
                    Ch. {currentChapterNumberStr} {currentChapter.title ? ` - ${currentChapter.title}` : ''}
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
                    className="dropdown-chevron"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>

                {isDropdownOpen && (
                  <div className="reader-chapter-dropdown-menu">
                    {sortedChapters.map((ch) => {
                      const isSelected = String(ch.id) === String(chapterId)
                      return (
                        <div
                          key={ch.id}
                          className={`reader-chapter-dropdown-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            navigate(`/comic/${comicId}/chapter/${ch.id}`)
                            setIsDropdownOpen(false)
                          }}
                        >
                          <span>
                            Ch. {ch.chapterNumber} {ch.title ? ` - ${ch.title}` : ''}
                          </span>
                          {isSelected && (
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="item-check-icon">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <button
                className="btn-reader-nav"
                onClick={handleGoToNextChapter}
                disabled={!hasNextChapter}
                title="Next Chapter"
              >
                Next ▶
              </button>
            </div>
          </div>
        </div>

        {/* Comic Pages Viewport */}
        <div className="chapter-pages-viewport" id="secure-comic-reader">
          {pages.length === 0 ? (
            <div style={{ padding: '80px 20px', color: '#64748b', textAlign: 'center' }}>
              <p style={{ fontSize: '36px', margin: '0 0 16px' }}>📖</p>
              <p>This chapter contains no images yet.</p>
            </div>
          ) : (
            pages.map((imgUrl, index) => (
              <ComicPageCanvas
                key={index}
                src={imgUrl}
                pageIndex={index}
                isEncrypted={false} // Toggle to true if backend is encryption-enabled
                fallbackSrc="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80"
              />
            ))
          )}
        </div>

        {/* Bottom Nav Controls */}
        <div className="reader-bottom-nav">
          <button
            className="btn-reader-secondary-action"
            onClick={handleGoToPrevChapter}
            disabled={!hasPrevChapter}
          >
            ◀ Previous Chapter
          </button>

          <button
            className="btn-reader-secondary-action"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            ▲ Back to Top
          </button>

          {hasNextChapter ? (
            <button
              className="btn-reader-action"
              onClick={handleGoToNextChapter}
            >
              Next Chapter ▶
            </button>
          ) : (
            <Link
              to={`/comic/${comicId}`}
              className="btn-reader-action"
              style={{ textDecoration: 'none' }}
            >
              Back to Details
            </Link>
          )}
        </div>
      </div>
    </HomeLayout>
  )
}

export default ChapterDetail
