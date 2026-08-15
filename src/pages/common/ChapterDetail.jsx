import { useCallback, useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { getComicByIdApi } from '../../services/api/ComicApi'
import { getChaptersByComicIdApi, getChapterDetailApi, getChapterTranslationsApi } from '../../services/api/ChapterApi'
import { toast } from 'react-toastify'
import useReaderSecurity, { isDevToolsOpenSync } from '../../hooks/useReaderSecurity'
import ComicPageCanvas from '../../components/common/ComicPageCanvas'
import '../../assets/style/reader/chapter-detail.css'
import '../../assets/style/reader/comments.css'
import { isValidUuid } from '../../utils/uuid'
import { useAuth } from '../../context/AuthContext'
import CommentSection from '../../components/common/CommentSection'
import SubscriptionPlanModal from '../../components/common/SubscriptionPlanModal'
import ReadingLanguageSelector, { normalizeLanguageCode } from '../../components/common/ReadingLanguageSelector'
import ReportSubmitModal from '../../components/report/ReportSubmitModal'
import { Flag } from 'lucide-react'

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
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [readerLayout, setReaderLayout] = useState('vertical') // 'vertical' | 'single'
  const [pageIndex, setPageIndex] = useState(0)
  const closeSubscriptionModal = useCallback(() => setShowSubscriptionModal(false), [])

  const { user, refreshSubscription } = useAuth()

  const dropdownRef = useRef(null)

  // Enforce client-side copy-protection security
  useReaderSecurity({
    onDevToolsOpen: () => {
      setIsDevToolsOpen(true)

      setCurrentChapter(null)
      setComic(null)
      setChaptersList([])

      toast.error('Security alert: Developer tools detected. Reading session is suspended.', {
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
    setPageIndex(0)
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
      // Pre-flight check: if DevTools is already open when loading,
      // prevent leaking API endpoints and image requests in Network panel
      if (isDevToolsOpenSync()) {
        setIsDevToolsOpen(true)
        setLoading(false)
        return
      }

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

  const rawUserRole = typeof user?.role === 'string'
    ? user.role
    : (user?.role?.roleName || user?.roleName || '')
  const hasInternalChapterAccess = ['ADMIN', 'MODERATOR', 'AUTHOR', 'TRANSLATOR', 'PROJECT_LEADER']
    .includes(String(rawUserRole).trim().toUpperCase())

  const openChapter = async (chapter) => {
    if (!chapter) return

    if (chapter.isPremium && !hasInternalChapterAccess) {
      if (!user) {
        toast.info('Please sign in and upgrade to Premium to read this chapter.')
        navigate('/auth?mode=signin')
        return
      }

      try {
        const latestSubscription = await refreshSubscription()
        if (!latestSubscription?.premiumActive) {
          setShowSubscriptionModal(true)
          return
        }
      } catch (error) {
        console.error('Unable to verify Premium access:', error)
        toast.error('Unable to verify your Premium subscription. Please try again.')
        return
      }
    }

    navigate(buildChapterUrl(chapter.id))
  }

  const handleGoToPrevChapter = () => {
    if (hasPrevChapter) {
      openChapter(sortedChapters[currentChapterIndex - 1])
    }
  }

  const handleGoToNextChapter = () => {
    if (hasNextChapter) {
      openChapter(sortedChapters[currentChapterIndex + 1])
    }
  }

  const handleSelectChapter = (e) => {
    const targetId = e.target.value
    const targetChapter = sortedChapters.find((chapter) => String(chapter.id) === String(targetId))
    if (targetChapter) {
      openChapter(targetChapter)
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
  // The backend decides access by returning chapter images only to authorized users.
  // Do not trust a possibly stale local premium flag when rendering the lock state.
  const isPremiumLocked = Boolean(
    currentChapter.isPremium
      && pages.length === 0
      && !hasInternalChapterAccess
  )

  const translationLanguage = (t) => t?.languageCode || t?.language_code || ''
  const translationRecordId = (t) =>
    t?.id || t?.translationId || t?.chapterTranslationId || t?._id || null

  // Only show languages that actually have data for THIS chapter — the
  // comic-level picker (ComicDetail) may list languages that some
  // individual chapters don't have a translation for yet.
  const availableLanguagesForChapter = translations.map(translationLanguage)
  const activeTranslation = translations.find((t) =>
    normalizeLanguageCode(translationLanguage(t)) === normalizeLanguageCode(selectedLanguage)
  )
  const activeTranslationId = translationRecordId(activeTranslation)
  const selectedBubblesByPageNumber = activeTranslation
    ? parseTranslationBubblesByPage(activeTranslation.pagesBubbles || activeTranslation.pages_bubbles)
    : {}
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
                            openChapter(ch)
                            setIsDropdownOpen(false)
                          }}
                        >
                          <span>
                            Ch. {ch.chapterNumber} {ch.title ? ` - ${ch.title}` : ''}
                            {ch.isPremium ? '  🔒' : ''}
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
                <ReadingLanguageSelector
                  languages={availableLanguagesForChapter}
                  selectedLanguage={selectedLanguage}
                  onChange={setSelectedLanguage}
                  compact={true}
                  showLabel={false}
                />
              )}

              {/* Layout Toggle */}
              <div className="reader-layout-toggle" style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                <button 
                  className={`btn-layout-toggle ${readerLayout === 'vertical' ? 'active' : ''}`}
                  onClick={() => setReaderLayout('vertical')}
                  title="Vertical scroll"
                  style={{ background: readerLayout === 'vertical' ? 'rgba(255,255,255,0.15)' : 'transparent', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                </button>
                <button 
                  className={`btn-layout-toggle ${readerLayout === 'single' ? 'active' : ''}`}
                  onClick={() => setReaderLayout('single')}
                  title="Single page"
                  style={{ background: readerLayout === 'single' ? 'rgba(255,255,255,0.15)' : 'transparent', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                </button>
              </div>

              <button
                className="btn-reader-nav"
                onClick={() => setShowReportModal(true)}
                title="Report issue with this chapter or translation"
                style={{
                  color: '#f87171',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Flag size={14} /> Report
              </button>
            </div>
          </div>
        </div>

        {/* Comic Pages Viewport */}
        <div className="chapter-pages-viewport" id="secure-comic-reader">
          {isPremiumLocked ? (
            <div style={{
              width: 'min(680px, calc(100% - 32px))',
              margin: '72px auto',
              padding: '48px 32px',
              textAlign: 'center',
              borderRadius: '20px',
              background: 'linear-gradient(145deg, rgba(88, 28, 135, 0.34), rgba(15, 23, 42, 0.96))',
              border: '1px solid rgba(192, 132, 252, 0.35)',
              boxShadow: '0 24px 80px rgba(0, 0, 0, 0.36)'
            }}>
              <div style={{ fontSize: '54px', marginBottom: '16px' }}>🔒</div>
              <h2 style={{ color: '#fff', margin: '0 0 12px' }}>Premium chapter</h2>
              <p style={{ color: '#cbd5e1', lineHeight: 1.7, margin: '0 auto 24px', maxWidth: '500px' }}>
                The opening chapters are free. Upgrade to an active Premium plan to unlock this chapter and every later Premium chapter.
              </p>
              <button
                type="button"
                className="btn-reader-action"
                onClick={() => {
                  if (!user) {
                    navigate('/auth?mode=signin')
                  } else {
                    setShowSubscriptionModal(true)
                  }
                }}
              >
                Upgrade Premium
              </button>
            </div>
          ) : pages.length === 0 ? (
            <div style={{ padding: '80px 20px', color: '#64748b', textAlign: 'center' }}>
              <p style={{ fontSize: '36px', margin: '0 0 16px' }}>📖</p>
              <p>This chapter contains no images yet.</p>
            </div>
          ) : readerLayout === 'single' ? (
            <div className="single-page-reader" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ComicPageCanvas
                key={`single-${pageIndex}`}
                src={pages[pageIndex]}
                pageIndex={pageIndex}
                isEncrypted={false}
                fallbackSrc="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80"
                bubbles={selectedBubblesByPageNumber[pageIndex + 1]}
              />
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px', paddingBottom: '24px' }}>
                <button 
                  className="btn-reader-secondary-action" 
                  disabled={pageIndex === 0} 
                  onClick={() => {
                    setPageIndex(p => Math.max(0, p - 1))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  ◀ Prev Page
                </button>
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', fontWeight: '500' }}>
                  {pageIndex + 1} / {pages.length}
                </span>
                <button 
                  className="btn-reader-secondary-action" 
                  disabled={pageIndex === pages.length - 1} 
                  onClick={() => {
                    setPageIndex(p => Math.min(pages.length - 1, p + 1))
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  Next Page ▶
                </button>
              </div>
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

      <SubscriptionPlanModal
        open={showSubscriptionModal}
        onClose={closeSubscriptionModal}
      />
      <ReportSubmitModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType={activeTranslationId ? 'CHAPTER_TRANSLATIONS' : 'CHAPTER'}
        targetId={activeTranslationId || chapterId}
        languageCode={activeTranslationId ? (selectedLanguage || translationLanguage(activeTranslation)) : ''}
        targetTitle={`${comic?.title || 'Comic'} - ${currentChapter?.title || `Chapter ${currentChapter?.chapterNumber || ''}`}${activeTranslationId ? ` (${(selectedLanguage || translationLanguage(activeTranslation)).toUpperCase()} Translation)` : ''}`}
        chapterNumber={currentChapter?.chapterNumber}
      />
    </HomeLayout>
  )
}

export default ChapterDetail