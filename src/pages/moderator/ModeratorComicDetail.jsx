import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import ModeratorLayout from '../../components/layout/ModeratorLayout'
import { getComicByIdApi } from '../../services/api/ComicApi'
import { getChaptersByComicIdApi, getChapterDetailApi, deleteChapterApi } from '../../services/api/ChapterApi'
import { getAllProjectTeamsApi } from '../../services/api/ProjectTeamApi'
import { SkeletonLoader } from '../../components/common/SkeletonLoader'
import ModernButton from '../../components/common/ModernButton'
import { toast } from 'react-toastify'
import '../../assets/style/moderator/comic-detail.css'

const getLanguageFlag = (lang) => {
  const n = (lang || '').toLowerCase().trim()
  if (n.includes('japan') || n === 'ja' || n === 'jp') return '🇯🇵'
  if (n.includes('korea') || n === 'ko' || n === 'kr') return '🇰🇷'
  if (n.includes('china') || n.includes('chinese') || n === 'zh' || n === 'cn') return '🇨🇳'
  if (n.includes('eng') || n === 'en' || n === 'us') return '🇺🇸'
  if (n.includes('viet') || n === 'vi' || n === 'vn') return '🇻🇳'
  if (n.includes('span') || n === 'es') return '🇪🇸'
  if (n.includes('fren') || n === 'fr') return '🇫🇷'
  if (n.includes('thai') || n === 'th') return '🇹🇭'
  return '🌐'
}

const getAuthorRawLanguage = (comic) => {
  if (!comic) return 'Not Specified'
  const raw = comic.language || comic.rawLanguage || comic.originalLanguage || comic.lang || comic.originalLang
  if (raw && String(raw).trim()) {
    return String(raw).trim()
  }
  return 'Not Specified'
}

function ChapterReaderInspectorModal({ chapter, comic, targetLang, assignedTeam, onClose }) {
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState([])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  
  const rawLangLabel = getAuthorRawLanguage(comic)
  const displayTargetLang = (targetLang && targetLang !== 'raw')
    ? targetLang
    : (assignedTeam?.targetLang || assignedTeam?.language || null)

  // Default viewMode: 'raw' if inspecting raw, else 'translated'
  const isRawOnlyView = !targetLang || targetLang === 'raw'
  const [viewMode, setViewMode] = useState(isRawOnlyView ? 'raw' : (displayTargetLang ? 'translated' : 'raw')) // 'raw' | 'translated' | 'side-by-side'
  const [renderLayout, setRenderLayout] = useState('single') // 'single' (Page by page) | 'vertical' (Continuous scroll)
  const scrollContainerRef = useRef(null)

  useEffect(() => {
    let isMounted = true
    const fetchPages = async () => {
      setLoading(true)
      try {
        const response = await getChapterDetailApi(chapter.id)
        const data = response?.data?.data || response?.data || response
        const rawPages = data?.pages || data?.images || (Array.isArray(data) ? data : [])
        const pageList = Array.isArray(rawPages)
          ? rawPages.map((item, idx) => {
              if (typeof item === 'string') {
                return { pageNumber: idx + 1, imageUrl: item, url: item, translatedImageUrl: null }
              }
              return {
                ...item,
                pageNumber: item?.pageNumber || idx + 1,
                imageUrl: item?.imageUrl || item?.url || item?.pageUrl || item,
                translatedImageUrl: item?.translatedImageUrl || item?.translatedUrl || item?.translatedPageUrl || null
              }
            })
          : []
        if (isMounted) {
          setPages(pageList)
        }
      } catch (err) {
        console.error('Failed to load chapter pages detail:', err)
        if (isMounted) {
          toast.error('Failed to load chapter pages.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    fetchPages()
    return () => { isMounted = false }
  }, [chapter.id])

  const currentPage = pages[currentPageIndex] || null

  const handleScrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return createPortal(
    <div className="mod-inspector-overlay fade-in">
      {/* Top Navigation & Language / View Mode Controls */}
      <div className="mod-inspector-topbar">
        <div className="mod-inspector-title-group">
          <div>
            <h3 className="mod-inspector-title">
              📖 {comic?.title} — Chapter {chapter.chapterNumber}
            </h3>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {chapter.title || 'Untitled Chapter'} {assignedTeam && displayTargetLang ? `• Team: ${assignedTeam.title}` : ''}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Language / View Mode Switcher */}
          <div className="mod-inspector-mode-tabs">
            <button
              className={`mod-mode-tab ${viewMode === 'raw' ? 'active' : ''}`}
              onClick={() => setViewMode('raw')}
            >
              {getLanguageFlag(rawLangLabel)} Raw ({rawLangLabel})
            </button>
            {displayTargetLang && (
              <button
                className={`mod-mode-tab ${viewMode === 'translated' ? 'active' : ''}`}
                onClick={() => setViewMode('translated')}
              >
                {getLanguageFlag(displayTargetLang)} Translated ({displayTargetLang})
              </button>
            )}
            {displayTargetLang && (
              <button
                className={`mod-mode-tab ${viewMode === 'side-by-side' ? 'active' : ''}`}
                onClick={() => setViewMode('side-by-side')}
              >
                ↔️ Compare (Song Song)
              </button>
            )}
          </div>
        </div>

        <button className="mod-inspector-close-btn" onClick={onClose} title="Close Inspector">
          ×
        </button>
      </div>

      {/* Main Inspection Area */}
      <div className="mod-inspector-body">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '16px', color: '#94a3b8' }}>
            <SkeletonLoader count={1} width={300} height={400} />
            <p>Loading chapter pages for inspection...</p>
          </div>
        ) : pages.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: '#94a3b8' }}>
            No pages found for this chapter.
          </div>
        ) : renderLayout === 'single' ? (
          /* SINGLE PAGE DISPLAY MODE */
          <div className="mod-comparison-view">
            {/* RAW ORIGINAL PANE */}
            {(viewMode === 'side-by-side' || viewMode === 'raw') && (
              <div className="mod-pane">
                <div className="mod-pane-header">
                  <span className="mod-pane-title mod-pane-title--raw">
                    {getLanguageFlag(rawLangLabel)} Raw Original — {rawLangLabel} (Page {currentPageIndex + 1})
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Submitted by Author</span>
                </div>
                <div className="mod-pane-content">
                  <img
                    src={currentPage?.imageUrl || currentPage?.pageUrl || currentPage?.url || ''}
                    alt={`Raw Page ${currentPageIndex + 1}`}
                    className="mod-page-image"
                  />
                </div>
              </div>
            )}

            {/* TRANSLATED PANE */}
            {(viewMode === 'side-by-side' || viewMode === 'translated') && (
              <div className="mod-pane">
                <div className="mod-pane-header">
                  <span className="mod-pane-title mod-pane-title--translated">
                    {getLanguageFlag(displayTargetLang || 'Target')} Translated ({displayTargetLang || 'No Language'}) — Page {currentPageIndex + 1}
                  </span>
                  <span style={{ fontSize: '11px', color: assignedTeam ? '#34d399' : '#f87171', fontWeight: 600 }}>
                    {assignedTeam ? `Team: ${assignedTeam.title}` : '⚠️ No Team Assigned'}
                  </span>
                </div>
                <div className="mod-pane-content" style={{ position: 'relative' }}>
                  {currentPage?.translatedImageUrl ? (
                    <img
                      src={currentPage.translatedImageUrl}
                      alt={`Translated Page ${currentPageIndex + 1}`}
                      className="mod-page-image"
                    />
                  ) : (
                    <div className="mod-no-translation-notice">
                      <div className="mod-no-trans-icon">🌐</div>
                      <h4 style={{ color: 'var(--mod-text-primary)', margin: '8px 0 4px 0' }}>Not Translated Yet</h4>
                      <p style={{ fontSize: '13px', margin: 0, maxWidth: '340px' }}>
                        {displayTargetLang
                          ? `Page ${currentPageIndex + 1} has not been translated into ${displayTargetLang} yet.`
                          : 'No target translation language selected.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CONTINUOUS VERTICAL SCROLL MODE (WEBTOON) */
          <div className="mod-continuous-scroll-container" ref={scrollContainerRef}>
            {pages.map((page, idx) => (
              <div key={idx} className="mod-continuous-row">
                {/* RAW COLUMN */}
                {(viewMode === 'side-by-side' || viewMode === 'raw') && (
                  <div className="mod-continuous-column mod-continuous-column--raw">
                    <div className="mod-page-label">
                      {getLanguageFlag(rawLangLabel)} Raw Page {idx + 1} ({rawLangLabel})
                    </div>
                    <img
                      src={page.imageUrl || page.url || ''}
                      alt={`Raw Page ${idx + 1}`}
                      className="mod-webtoon-image"
                    />
                  </div>
                )}

                {/* TRANSLATED COLUMN */}
                {(viewMode === 'side-by-side' || viewMode === 'translated') && (
                  <div className="mod-continuous-column mod-continuous-column--translated">
                    <div className="mod-page-label">
                      {getLanguageFlag(displayTargetLang || 'Target')} Translated Page {idx + 1} ({displayTargetLang || 'Target'})
                    </div>
                    {page.translatedImageUrl ? (
                      <img
                        src={page.translatedImageUrl}
                        alt={`Translated Page ${idx + 1}`}
                        className="mod-webtoon-image"
                      />
                    ) : (
                      <div className="mod-webtoon-no-trans">
                        ⚠️ Page {idx + 1} Not Translated {displayTargetLang ? `(${displayTargetLang})` : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="mod-inspector-controls">
        <div className="mod-page-nav-group">
          {renderLayout === 'single' ? (
            <>
              <button
                className="mod-nav-arrow"
                onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                disabled={currentPageIndex === 0 || loading}
              >
                ← Previous Page
              </button>
              <span className="mod-page-indicator">
                Page {pages.length > 0 ? currentPageIndex + 1 : 0} of {pages.length}
              </span>
              <button
                className="mod-nav-arrow"
                onClick={() => setCurrentPageIndex(prev => Math.min(pages.length - 1, prev + 1))}
                disabled={currentPageIndex >= pages.length - 1 || loading}
              >
                Next Page →
              </button>
            </>
          ) : (
            <>
              <span className="mod-page-indicator">
                📜 Continuous Webtoon View • Total {pages.length} Pages
              </span>
              <button className="mod-nav-arrow" onClick={handleScrollToTop}>
                ⬆️ Scroll to Top
              </button>
            </>
          )}

          {/* Compact Reading Mode Switcher (Single Page vs Continuous Scroll) */}
          <div className="mod-render-layout-toggle-sm">
            <button
              className={`mod-layout-btn-sm ${renderLayout === 'single' ? 'active' : ''}`}
              onClick={() => setRenderLayout('single')}
              title="Single Page View (Trang đơn)"
            >
              📄 Single Page
            </button>
            <button
              className={`mod-layout-btn-sm ${renderLayout === 'vertical' ? 'active' : ''}`}
              onClick={() => setRenderLayout('vertical')}
              title="Continuous Scroll Mode (Cuộn vô cực)"
            >
              📜 Scroll Mode
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <ModernButton
            variant={2}
            label="Close Viewer"
            onClick={onClose}
            style={{ minWidth: '110px' }}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}

function ModeratorComicDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [comic, setComic] = useState(null)
  const [chapters, setChapters] = useState([])
  const [projectTeams, setProjectTeams] = useState([])
  const [loading, setLoading] = useState(true)

  // Selected View Language (Defaults to Raw / Original language of comic)
  const [selectedViewLang, setSelectedViewLang] = useState('raw')

  // Chapter inspector modal state
  const [inspectingChapter, setInspectingChapter] = useState(null)

  const fetchComicAndChapters = useCallback(async () => {
    setLoading(true)
    try {
      const [comicRes, chaptersRes, teamsRes] = await Promise.all([
        getComicByIdApi(id),
        getChaptersByComicIdApi(id, {}, true),
        getAllProjectTeamsApi()
      ])

      const comicData = comicRes?.data?.data || comicRes?.data || comicRes
      const chaptersData = chaptersRes?.data?.data || chaptersRes?.data || chaptersRes || []
      const teamsData = teamsRes?.data?.data || teamsRes?.data || teamsRes || []

      setComic(comicData)
      setChapters(Array.isArray(chaptersData) ? chaptersData : [])
      setProjectTeams(Array.isArray(teamsData) ? teamsData : [])
    } catch (err) {
      console.error('Failed to fetch comic details:', err)
      toast.error('Failed to load comic information.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchComicAndChapters()
  }, [fetchComicAndChapters])

  const handleDeleteChapterItem = async (chapterId) => {
    if (!window.confirm('Are you sure you want to delete this chapter?')) return
    try {
      await deleteChapterApi(chapterId)
      toast.success('Chapter deleted successfully!')
      setChapters(prev => prev.filter(c => c.id !== chapterId))
    } catch (err) {
      toast.error('Failed to delete chapter.')
    }
  }

  // Filter project teams assigned to this comic
  const assignedTeamsForComic = useMemo(() => {
    if (!comic?.title) return []
    return projectTeams.filter(
      t => t.comicName && t.comicName.toLowerCase() === comic.title.toLowerCase()
    )
  }, [comic, projectTeams])

  // Get available target languages strictly from DB assigned teams
  const availableTargetLangs = useMemo(() => {
    const langs = new Set()
    assignedTeamsForComic.forEach(t => {
      if (t.targetLang && t.targetLang.trim()) langs.add(t.targetLang.trim())
    })
    return Array.from(langs)
  }, [assignedTeamsForComic])

  // Get currently selected team when viewing a target language
  const activeSelectedTeam = useMemo(() => {
    if (selectedViewLang === 'raw') return null
    return assignedTeamsForComic.find(
      t => t.targetLang && t.targetLang.toLowerCase() === selectedViewLang.toLowerCase()
    ) || null
  }, [selectedViewLang, assignedTeamsForComic])

  return (
    <ModeratorLayout activeNav="comic-management">
      <div className="mod-detail-container fade-in">
        {/* Navigation Breadcrumb */}
        <div className="mod-detail-header-nav">
          <Link to="/moderator" state={{ activeNav: 'comic-management' }} className="mod-back-btn">
            ← Back to Comic Management
          </Link>
          <span className="mod-detail-breadcrumb">/ Comic Details & Chapter Inspector</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <SkeletonLoader count={4} height={60} style={{ marginBottom: '16px' }} />
          </div>
        ) : !comic ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <h3>Comic not found or failed to load.</h3>
          </div>
        ) : (
          <>
            {/* Comic Overview Card */}
            <div className="mod-comic-overview-card">
              <div className="mod-comic-cover-wrapper">
                <img
                  src={comic.cover || comic.coverImageUrl || 'https://via.placeholder.com/200x280?text=No+Cover'}
                  alt={comic.title}
                  className="mod-comic-cover-img"
                />
              </div>

              <div className="mod-comic-info-content">
                <div>
                  <div className="mod-comic-title-row">
                    <h1 className="mod-comic-title">{comic.title}</h1>
                  </div>

                  <div className="mod-comic-meta-pills">
                    <span className="mod-meta-pill mod-meta-pill--lang">
                      {getLanguageFlag(getAuthorRawLanguage(comic))} Author Input Raw: <strong>{getAuthorRawLanguage(comic)}</strong>
                    </span>

                    <span className={`mod-meta-pill mod-meta-pill--status-${(comic.publicationStatus || 'ONGOING').toLowerCase()}`}>
                      Status: {comic.publicationStatus || 'ONGOING'}
                    </span>

                    <span className="mod-meta-pill">
                      ⭐ Rating: {comic.ratingAverage !== undefined ? comic.ratingAverage.toFixed(1) : (comic.rating !== undefined ? comic.rating.toFixed(1) : '0.0')} ({comic.ratingCount || 0})
                    </span>

                    <span className="mod-meta-pill">
                      📖 {chapters.length} Chapters
                    </span>
                  </div>

                  {Array.isArray(comic.genres) && comic.genres.length > 0 && (
                    <div className="mod-comic-genres">
                      {comic.genres.map((g, idx) => (
                        <span key={idx} className="mod-genre-tag">
                          {typeof g === 'string' ? g : g.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {comic.description && (
                    <p className="mod-comic-description">{comic.description}</p>
                  )}
                </div>

                <div style={{ fontSize: '13px', color: 'var(--mod-text-secondary)', display: 'flex', gap: '12px' }}>
                  <span>Author: <strong style={{ color: 'var(--mod-text-primary)' }}>{comic.authorName || comic.author || 'N/A'}</strong></span>
                </div>
              </div>
            </div>

            {/* View Language Tabs & Active Team Leader Info */}
            <div className="mod-lang-tabs-card">
              <div className="mod-lang-tabs-header">
                🌐 Select View Language & Translation Team
              </div>

              <div className="mod-lang-tabs-strip">
                <button
                  className={`mod-lang-tab-btn ${selectedViewLang === 'raw' ? 'active' : ''}`}
                  onClick={() => setSelectedViewLang('raw')}
                >
                  {getLanguageFlag(getAuthorRawLanguage(comic))} {getAuthorRawLanguage(comic)} (Author Original Input)
                </button>

                {availableTargetLangs.map(lang => (
                  <button
                    key={lang}
                    className={`mod-lang-tab-btn ${selectedViewLang.toLowerCase() === lang.toLowerCase() ? 'active' : ''}`}
                    onClick={() => setSelectedViewLang(lang)}
                  >
                    {getLanguageFlag(lang)} {lang}
                  </button>
                ))}
              </div>

              {/* Active Team Leader Info Banner */}
              {selectedViewLang !== 'raw' && (
                <div className="mod-active-team-banner fade-in">
                  {activeSelectedTeam ? (
                    <div className="mod-team-info-main">
                      <div className="mod-team-avatar-circle">
                        {(activeSelectedTeam.leaderName || activeSelectedTeam.title || 'T')[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="mod-team-title-text">
                          Project Team: {activeSelectedTeam.title}
                        </h4>
                        <div className="mod-team-leader-sub">
                          👑 Team Leader: <strong>{activeSelectedTeam.leaderName || 'Translator Leader'}</strong> • Target: <strong>{activeSelectedTeam.targetLang || selectedViewLang}</strong> • Status: <span className="comic-status-badge ongoing" style={{ fontSize: '11px', padding: '2px 8px' }}>{activeSelectedTeam.status || 'ACTIVE'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div>
                        <h4 className="mod-team-title-text" style={{ color: '#ef4444' }}>
                          ⚠️ No Team Assigned for {selectedViewLang}
                        </h4>
                        <div className="mod-team-leader-sub">
                          This comic does not have an active translator team assigned for <strong>{selectedViewLang}</strong> yet.
                        </div>
                      </div>
                      <ModernButton
                        variant={2}
                        label="Assign Team"
                        onClick={() => navigate('/moderator', { state: { activeNav: 'comic-management' } })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chapters Table Section */}
            <div className="mod-chapters-section">
              <h3 className="mod-card-title">
                <span>
                  📖 Chapters Catalog ({chapters.length})
                  {selectedViewLang !== 'raw' && (
                    <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--mod-text-secondary)', marginLeft: '12px' }}>
                      Viewing Mode: {getLanguageFlag(selectedViewLang)} {selectedViewLang}
                    </span>
                  )}
                </span>
              </h3>

              {chapters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No chapters uploaded for this comic yet.
                </div>
              ) : (
                <table className="mod-chapters-table">
                  <thead>
                    <tr>
                      <th>Chapter</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Uploaded Date</th>
                      <th>Views</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map(chap => (
                      <tr key={chap.id}>
                        <td>
                          <strong>Chapter {chap.chapterNumber}</strong>
                        </td>
                        <td>{chap.title || <span style={{ color: '#64748b', fontStyle: 'italic' }}>Untitled</span>}</td>
                        <td>
                          <span className={`comic-status-badge ${chap.isPremium ? 'paused' : 'ongoing'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                            {chap.isPremium ? 'Premium' : 'Free'}
                          </span>
                        </td>
                        <td>
                          {chap.createdAt ? new Date(chap.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                        </td>
                        <td>{chap.viewCount || 0}</td>
                        <td>
                          <div className="mod-chap-actions">
                            <button
                              className="btn-inspect-chap"
                              onClick={() => setInspectingChapter(chap)}
                            >
                              👁️ Inspect Raw vs Translated
                            </button>
                            <ModernButton
                              variant={5}
                              label="🗑️ Delete"
                              onClick={() => handleDeleteChapterItem(chap.id)}
                              style={{ height: '30px', minHeight: '30px', minWidth: '70px', padding: '0 10px', fontSize: '12px' }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Side-by-Side Chapter Inspector Modal */}
        {inspectingChapter && comic && (
          <ChapterReaderInspectorModal
            chapter={inspectingChapter}
            comic={comic}
            targetLang={selectedViewLang === 'raw' ? null : selectedViewLang}
            assignedTeam={activeSelectedTeam}
            onClose={() => setInspectingChapter(null)}
          />
        )}
      </div>
    </ModeratorLayout>
  )
}

export default ModeratorComicDetail
