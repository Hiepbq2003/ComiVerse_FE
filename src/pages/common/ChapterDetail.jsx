import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getComicByIdApi } from '../../services/api/ComicApi'
import { getChaptersByComicIdApi, getChapterDetailApi, getChapterTranslationsApi } from '../../services/api/ChapterApi'
import { toast } from 'react-toastify'
import useReaderSecurity from '../../hooks/useReaderSecurity'
import ComicPageCanvas from '../../components/common/ComicPageCanvas'
import '../../assets/style/reader/chapter-detail.css'
import '../../assets/style/reader/comments.css'
import { isValidUuid } from '../../utils/uuid'
import { getAuth } from '../../utils/Auth'
import CommentSection from '../../components/common/CommentSection'

// pagesBubbles is a JSON string: [{ pageNumber, imageUrl, bubbles }, ...]
// where `bubbles` is itself a JSON string ({"selections":[...]}) — same
// shape ReviewController.buildPagesBubblesJson produces. Returns a
// { [pageNumber]: selections[] } lookup for quick per-page access.
function parseTranslationBubblesByPage(pagesBubblesJson) {
  if (!pagesBubblesJson) return {}
  try {
    const pages = JSON.parse(pagesBubblesJson)
    if (!Array.isArray(pages)) return {}
    const map = {}
    pages.forEach((p) => {
      let selections = []
      try {
        const parsed = JSON.parse(p.bubbles || '{}')
        selections = Array.isArray(parsed) ? parsed : parsed?.selections || []
      } catch {
        selections = []
      }
      map[p.pageNumber] = selections
    })
    return map
  } catch {
    return {}
  }
}

function ChapterDetail() {
  const { comicId, chapterId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const targetCommentIdFromUrl = searchParams.get('comment')

  // States
  const [comic, setComic] = useState(null)
  const [currentChapter, setCurrentChapter] = useState(null)
  const [chaptersList, setChaptersList] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMockData, setIsMockData] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false)
  const [translations, setTranslations] = useState([])
  const [selectedLanguage, setSelectedLanguage] = useState(searchParams.get('lang') || '')

  // User state
  const [user, setUser] = useState(null)

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
    disableDetector: true
  })

  // Scroll to top on chapter change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [chapterId])

  // Get current user on mount
  useEffect(() => {
    const auth = getAuth()
    if (auth && auth.user) {
      setUser(auth.user)
    }
  }, [])

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

        if (!chapterId || !isValidUuid(chapterId)) {
          throw new Error('Using local preview data for a demo route')
        }

        // Fetch current chapter detail, comic detail, all chapters of the
        // comic, and available translations, in parallel
        const [chapterRes, chaptersListRes, comicRes, translationsRes] = await Promise.all([
          getChapterDetailApi(chapterId),
          getChaptersByComicIdApi(comicId),
          getComicByIdApi(comicId),
          getChapterTranslationsApi(chapterId).catch(() => ({ data: [] }))
        ])

        const chapterData = chapterRes?.data || chapterRes
        const translationsData = translationsRes?.data || translationsRes || []

        if (!chapterData) {
          throw new Error('Chapter details not found')
        }

        const effectiveComicId = (comicId && isValidUuid(comicId)) ? comicId : chapterData.comicId

        let listData = []
        let comicData = null

        if (effectiveComicId && isValidUuid(effectiveComicId)) {
          const [chaptersListRes, comicRes] = await Promise.all([
            getChaptersByComicIdApi(effectiveComicId),
            getComicByIdApi(effectiveComicId)
          ])
          listData = chaptersListRes?.data || chaptersListRes || []
          comicData = comicRes?.data || comicRes
        }

        setCurrentChapter(chapterData)
        setChaptersList(listData)
        setComic(comicData)
        setTranslations(Array.isArray(translationsData) ? translationsData : [])
        setIsMockData(false)
      } catch (err) {
        console.error('API failed for chapter detail:', err.message)
        setIsMockData(false)
        setCurrentChapter(null)
        setChaptersList([])
        setComic(null)
        setTranslations([])
      } finally {
        setLoading(false)
      }
    }

    if (chapterId) {
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

  const buildChapterUrl = (targetChapterId) => {
    const langQuery = selectedLanguage ? `?lang=${encodeURIComponent(selectedLanguage)}` : ''
    return `/comic/${comicId}/chapter/${targetChapterId}${langQuery}`
  }

  const handleGoToPrevChapter = () => {
    if (hasPrevChapter) {
      const prevChap = sortedChapters[currentChapterIndex - 1]
      navigate(buildChapterUrl(prevChap.id))
    }
  }

  const handleGoToNextChapter = () => {
    if (hasNextChapter) {
      const nextChap = sortedChapters[currentChapterIndex + 1]
      navigate(buildChapterUrl(nextChap.id))
    }
  }

  const handleSelectChapter = (e) => {
    const targetId = e.target.value
    if (targetId) {
      navigate(buildChapterUrl(targetId))
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

  // Only show languages that actually have data for THIS chapter — the
  // comic-level picker (ComicDetail) may list languages that some
  // individual chapters don't have a translation for yet.
  const availableLanguagesForChapter = translations.map((t) => t.languageCode)
  const activeTranslation = translations.find((t) => t.languageCode === selectedLanguage)
  const selectedBubblesByPageNumber = activeTranslation
    ? parseTranslationBubblesByPage(activeTranslation.pagesBubbles)
    : {}
  console.log("[DEBUG translations]", {
    selectedLanguage,
    translations,
    availableLanguagesForChapter,
    activeTranslation,
    selectedBubblesByPageNumber,
  })
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
                            navigate(buildChapterUrl(ch.id))
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

              {availableLanguagesForChapter.length > 0 && (
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  title="Reading language"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: 'white',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="" style={{ color: '#111', background: '#fff' }}>Original</option>
                  {availableLanguagesForChapter.map((lang) => (
                    <option key={lang} value={lang} style={{ color: '#111', background: '#fff' }}>
                      {lang}
                    </option>
                  ))}
                </select>
              )}
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
                bubbles={selectedBubblesByPageNumber[index + 1]}
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

        {/* Comments Section */}
        <div className="chapter-comments-section-wrapper" style={{
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto 80px',
          padding: '24px',
          background: 'var(--chapter-surface)',
          border: '1px solid var(--chapter-border-subtle)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px var(--chapter-shadow)',
          boxSizing: 'border-box'
        }}>
          <CommentSection
            targetType="chapter"
            targetId={chapterId}
            user={user}
            targetCommentIdFromUrl={targetCommentIdFromUrl}
          />
        </div>

      </div>
    </HomeLayout>
  )
}

export default ChapterDetail