import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import ModeratorLayout from '../../components/layout/ModeratorLayout'
import { getComicByIdApi, getAllComicsApi, updateComicApi, getComicsPageApi } from '../../services/api/ComicApi'
import { getChaptersByComicIdApi, getChapterDetailApi, deleteChapterApi } from '../../services/api/ChapterApi'
import { getAllProjectTeamsApi } from '../../services/api/ProjectTeamApi'
import { getAllSubmissionsApi } from '../../services/api/SubmissionApi'
import { getAllGenresApi } from '../../services/api/GenreApi'
import { MOCK_COMICS } from '../../utils/mockComics'
import { SkeletonLoader } from '../../components/common/SkeletonLoader'
import ModernButton from '../../components/common/ModernButton'
import { toast } from 'react-toastify'
import { useTheme } from '../../context/ThemeContext'
import '../../assets/style/moderator/comic-detail.css'
import { getAuth } from '../../utils/Auth'
import { isLanguageInModeratorScope, getModeratorScope } from '../../utils/moderatorScope'

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
  if (!comic) return 'Original Raw'
  const raw = comic.language || comic.rawLanguage || comic.originalLanguage || comic.lang || comic.originalLang
  if (raw && String(raw).trim() && String(raw).trim().toLowerCase() !== 'unknown') {
    return String(raw).trim()
  }
  return 'Original Raw'
}

const getChapterDisplayTitle = (chap, idx = 0) => {
  if (!chap) return `Chapter ${idx + 1}`;
  const rawTitle = (
    chap.title ||
    chap.manuscriptTitle ||
    chap.chapterTitle ||
    chap.chapter ||
    chap.name ||
    chap.originalSubmissionItem?.title ||
    ''
  ).toString().trim();

  if (rawTitle && rawTitle.toLowerCase() !== 'untitled' && rawTitle.toLowerCase() !== 'raw draft' && rawTitle.toLowerCase() !== 'none') {
    return rawTitle;
  }

  const num = chap.chapterNumber || chap.number || (idx + 1);
  return `Chapter ${num}`;
};

function ChapterReaderInspectorModal({ chapter, comic, availableTargetLangs = [], projectTeams = [], initialTargetLang, onClose }) {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState([])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)

  // Local state to hold chosen parallel checking language
  const [selectedLang, setSelectedLang] = useState(initialTargetLang || 'raw')
  const displayTargetLang = selectedLang !== 'raw' ? selectedLang : null

  // Find active team for the chosen language
  const assignedTeam = useMemo(() => {
    if (!displayTargetLang) return null
    return projectTeams.find(
      t => t.targetLang && t.targetLang.toLowerCase() === displayTargetLang.toLowerCase()
    ) || null
  }, [displayTargetLang, projectTeams])

  const rawLangLabel = getAuthorRawLanguage(comic)

  // Default viewMode: 'raw' if inspecting raw, else 'side-by-side'
  const isRawOnlyView = selectedLang === 'raw'
  const [viewMode, setViewMode] = useState(isRawOnlyView ? 'raw' : 'side-by-side') // 'raw' | 'translated' | 'side-by-side'
  const [renderLayout, setRenderLayout] = useState('single') // 'single' (Page by page) | 'vertical' (Continuous scroll)
  const [isFooterVisible, setIsFooterVisible] = useState(true)
  const scrollContainerRef = useRef(null)
  const lastScrollTopRef = useRef(0)

  const handleReaderScroll = (e) => {
    const currentScroll = e.currentTarget.scrollTop;
    const diff = currentScroll - lastScrollTopRef.current;

    if (diff > 12 && currentScroll > 50) {
      setIsFooterVisible(false);
    } else if (diff < -12) {
      setIsFooterVisible(true);
    }
    lastScrollTopRef.current = currentScroll;
  };

  const handleMouseMoveArea = (e) => {
    if (window.innerHeight - e.clientY < 70) {
      setIsFooterVisible(true);
    }
  };

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
          const fallbackPages = chapter?.pages || chapter?.images || []
          const pageList = Array.isArray(fallbackPages)
            ? fallbackPages.map((item, idx) => ({
                pageNumber: idx + 1,
                imageUrl: typeof item === 'string' ? item : (item?.imageUrl || item?.url || item),
                translatedImageUrl: typeof item === 'object' ? (item?.translatedImageUrl || item?.translatedUrl) : null
              }))
            : []
          setPages(pageList)
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
    <div className={`mod-inspector-overlay fade-in ${theme === 'light' ? 'light-theme' : 'dark-theme'}`}>
      {/* Top Navigation & Language / View Mode Controls */}
      <div className="mod-inspector-topbar">
        <div className="mod-inspector-title-group">
          <div>
            <h3 className="mod-inspector-title">
              📖 {comic?.title} — Chapter {chapter.chapterNumber}
            </h3>
            <span className="mod-inspector-subtitle">
              {getChapterDisplayTitle(chapter, 0)} {assignedTeam && displayTargetLang ? `• Team: ${assignedTeam.title}` : ''}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Parallel Language Check Dropdown */}
          <div className="mod-inspect-select-container">
            <span className="mod-inspect-select-label">Parallel Check:</span>
            <select
              className="mod-inspect-select"
              value={selectedLang}
              onChange={(e) => {
                const val = e.target.value
                setSelectedLang(val)
                if (val === 'raw') {
                  setViewMode('raw')
                } else {
                  setViewMode('side-by-side')
                }
              }}
            >
              <option value="raw">{getLanguageFlag(rawLangLabel)} Raw Original Only</option>
              {availableTargetLangs.map(lang => (
                <option key={lang} value={lang}>
                  {getLanguageFlag(lang)} {lang} Translation
                </option>
              ))}
            </select>
          </div>

          {/* Language / View Mode Switcher */}
          <div className="mod-inspector-mode-tabs">
            <button
              className={`mod-mode-tab ${viewMode === 'raw' ? 'active' : ''}`}
              onClick={() => setViewMode('raw')}
            >
              {getLanguageFlag(rawLangLabel)} Raw
            </button>
            {displayTargetLang && (
              <button
                className={`mod-mode-tab ${viewMode === 'translated' ? 'active' : ''}`}
                onClick={() => setViewMode('translated')}
              >
                {getLanguageFlag(displayTargetLang)} Translated
              </button>
            )}
            {displayTargetLang && (
              <button
                className={`mod-mode-tab ${viewMode === 'side-by-side' ? 'active' : ''}`}
                onClick={() => setViewMode('side-by-side')}
              >
                ↔️ Compare
              </button>
            )}
          </div>

          <button className="mod-inspector-close-btn" onClick={onClose} title="Close Inspector">
            ×
          </button>
        </div>
      </div>

      {/* Main Inspection Area */}
      <div className="mod-inspector-body" onMouseMove={handleMouseMoveArea}>
        <div className="mod-inspector-main-content" onScroll={handleReaderScroll}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', gap: '16px', color: '#94a3b8' }}>
              <SkeletonLoader count={1} width={300} height={400} />
              <p>Loading chapter pages for inspection...</p>
            </div>
          ) : pages.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#94a3b8' }}>
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
            <div className="mod-continuous-scroll-container" ref={scrollContainerRef} onScroll={handleReaderScroll}>
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
      </div>

      {/* Bottom Control Bar */}
      <div className={`mod-inspector-controls ${!isFooterVisible ? 'is-hidden' : ''}`}>
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

          <div className="mod-inspector-divider" />

          {/* Layout Dropdown Selector */}
          <div className="mod-inspect-select-container">
            <span className="mod-inspect-select-label">Reader Layout:</span>
            <select
              className="mod-inspect-select"
              value={renderLayout}
              onChange={(e) => setRenderLayout(e.target.value)}
            >
              <option value="single">📄 Single Page</option>
              <option value="vertical">📜 Scroll Mode</option>
            </select>
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

const formatSubmitterName = (submittedBy) => {
  if (!submittedBy) return '';
  if (typeof submittedBy === 'object') {
    const res = submittedBy.fullName || submittedBy.name || submittedBy.username || submittedBy.displayName || '';
    if (res && res !== 'Original Author' && res !== 'Unknown Author') return res;
    return '';
  }
  const str = String(submittedBy).trim();
  if (!str || str === 'Original Author' || str === 'Unknown Author' || str === 'Unknown') return '';
  if (str.includes('@')) {
    const parts = str.split('@');
    const namePart = parts[0].replace(/[._-]/g, ' ');
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }
  return str.replace(/^Author:\s*/i, '');
};

const parseGenresList = (input) => {
  if (!input) return [];
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseGenresList(parsed);
      } catch (e) {}
    }
    return trimmed.split(',').map(s => s.trim().replace(/^['"\[\]]+|['"\[\]]+$/g, '')).filter(Boolean);
  }
  if (Array.isArray(input)) {
    let result = [];
    input.forEach(item => {
      if (typeof item === 'string') {
        result.push(...parseGenresList(item));
      } else if (typeof item === 'object' && item !== null) {
        const name = item.name || item.genreName || item.title || item.label || '';
        if (name) result.push(String(name).trim());
      } else if (item) {
        result.push(String(item).trim());
      }
    });
    return Array.from(new Set(result)).filter(Boolean);
  }
  return [];
};

const getChapterViews = (chap, comicObj = null, totalChapsCount = 1) => {
  if (!chap) return 0;
  let views = chap.viewCount ?? chap.views ?? chap.view ?? chap.viewsCount ?? chap.reads ?? chap.readCount ?? chap.totalViews ?? chap.metrics?.views ?? chap.metrics?.viewCount;

  if (views !== undefined && views !== null && !isNaN(Number(views)) && Number(views) > 0) {
    return Number(views);
  }

  const comicTotalViews = Number(comicObj?.viewCount || comicObj?.views || comicObj?.totalViews || comicObj?.viewsCount || 0);
  if (comicTotalViews > 0) {
    if (totalChapsCount <= 1) {
      return comicTotalViews;
    }
    return Math.max(1, Math.round(comicTotalViews / totalChapsCount));
  }

  return 0;
};

const formatChapterViews = (count) => {
  const num = Number(count || 0);
  if (isNaN(num) || num <= 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
};

// Module-level memory cache for heavy dashboard lookup datasets (60s TTL)
const DATA_CACHE = {
  allComics: null,
  submissions: null,
  accounts: null,
  teams: null,
  timestamp: 0
};
const CACHE_TTL = 60000;

const getCachedOrFetch = async (key, fetchFn) => {
  const now = Date.now();
  if (DATA_CACHE[key] && (now - DATA_CACHE.timestamp < CACHE_TTL)) {
    return DATA_CACHE[key];
  }
  try {
    const res = await fetchFn();
    const data = res?.data?.data || res?.data || res || [];
    DATA_CACHE[key] = Array.isArray(data) ? data : [];
    DATA_CACHE.timestamp = now;
    return DATA_CACHE[key];
  } catch (e) {
    return DATA_CACHE[key] || [];
  }
};

function ModeratorComicDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const locationComic = location.state?.comic || null

  const [comic, setComic] = useState(locationComic)
  const [chapters, setChapters] = useState([])
  const [projectTeams, setProjectTeams] = useState([])
  const [systemGenres, setSystemGenres] = useState([])
  const [loading, setLoading] = useState(true) // ALWAYS start loading as true to wait for real data

  // Selected View Language (Defaults to Raw / Original language of comic)
  const [selectedViewLang, setSelectedViewLang] = useState('raw')

  // Chapter inspector modal state
  const [inspectingChapter, setInspectingChapter] = useState(null)
  
  // Edit Comic state
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  const fetchComicAndChapters = useCallback(async () => {
    setLoading(true) // Unconditionally show skeleton while fetching
    try {
      const withTimeout = (promise, fallbackValue = [], ms = 2000) => {
        return Promise.race([
          promise,
          new Promise(resolve => setTimeout(() => resolve(fallbackValue), ms))
        ]).catch(() => fallbackValue);
      };

      // Launch ALL API calls (Stage 1 & Stage 2) concurrently to eliminate waterfall delays
      const [comicRes, chaptersRes, teamsData, genresData] = await Promise.all([
        getComicByIdApi(id).catch(() => null),
        getChaptersByComicIdApi(id, {}, true).catch(() => []),
        getCachedOrFetch('teams', getAllProjectTeamsApi),
        getCachedOrFetch('genres', () => withTimeout(getAllGenresApi({ timeout: 2000 })))
      ]);
      
      const allComicsData = [];
      const submissionsData = [];

      let comicData = comicRes ? (comicRes.data?.data || comicRes.data || comicRes) : null;
      let chaptersData = chaptersRes ? (chaptersRes.data?.data || chaptersRes.data || chaptersRes || []) : [];

      if (Array.isArray(chaptersData) && chaptersData.length > 0) {
        const approvedChaps = chaptersData.filter(c => {
          const s = (c.status || c.moderationStatus || '').toUpperCase();
          return s === 'PUBLISHED' || s === 'APPROVED' || !s;
        });
        setChapters(approvedChaps.map((c, idx) => ({ ...c, title: getChapterDisplayTitle(c, idx) })));
      }
      setProjectTeams(Array.isArray(teamsData) ? teamsData : []);

      if (genresData && (Array.isArray(genresData) || Array.isArray(genresData.data))) {
        setSystemGenres(genresData.data || genresData);
      }

      // If comicData was completely missing, build from fallbacks
      if (!comicData || !comicData.id || comicData.message || comicData.status === 500) {
        const targetIdStr = String(id).toLowerCase().trim();
        let found = (allComicsData || []).find(c => String(c.id).toLowerCase() === targetIdStr || String(c.comicId || '').toLowerCase() === targetIdStr || (c.title && c.title.toLowerCase().trim() === targetIdStr));

        if (!found) {
          const matchedSub = (submissionsData || []).find(s => (s.status === 'approved' || s.isApproved === true) && (String(s.id).toLowerCase() === targetIdStr || String(s.comicId || '').toLowerCase() === targetIdStr || (s.title && s.title.toLowerCase().trim() === targetIdStr))) ||
                             (submissionsData || []).find(s => String(s.id).toLowerCase() === targetIdStr || String(s.comicId || '').toLowerCase() === targetIdStr || (s.title && s.title.toLowerCase().trim() === targetIdStr));
          if (matchedSub) {
            found = {
              id: matchedSub.comicId || matchedSub.id,
              title: matchedSub.title || matchedSub.comicName || matchedSub.comicTitle || 'Untitled Comic',
              author: matchedSub.submittedBy || matchedSub.author || matchedSub.submittedByEmail || matchedSub.authorName,
              authorName: matchedSub.submittedBy || matchedSub.author || matchedSub.submittedByEmail || matchedSub.authorName,
              genres: matchedSub.genres,
              cover: matchedSub.cover || matchedSub.coverImage || matchedSub.coverUrl || '',
              coverImage: matchedSub.cover || matchedSub.coverImage || matchedSub.coverUrl || '',
              coverImageUrl: matchedSub.cover || matchedSub.coverImage || matchedSub.coverUrl || '',
              language: matchedSub.language || matchedSub.rawLanguage || 'Japanese',
              description: matchedSub.description || matchedSub.synopsis || '',
              publicationStatus: 'ONGOING',
              status: 'Active'
            };
          }
        }

        if (!found && locationComic) found = locationComic;

        comicData = found ? { ...found } : { id };
      }

      // Deep enrichment of authorName & genres
      if (comicData) {
        const targetIdStr = String(id || comicData.id || '').toLowerCase().trim();
        const targetTitleStr = String(comicData.title || locationComic?.title || comicData.comicTitle || '').toLowerCase().trim();

        const matchedFromAll = (allComicsData || []).find(c =>
          (c.id && String(c.id).toLowerCase().trim() === targetIdStr) ||
          (c.comicId && String(c.comicId).toLowerCase().trim() === targetIdStr) ||
          (targetTitleStr && c.title && c.title.toLowerCase().trim() === targetTitleStr)
        );

        const matchedSub = (submissionsData || []).find(s => {
          const sId = String(s.id || s.submissionId || '').toLowerCase().trim();
          const sComicId = String(s.comicId || '').toLowerCase().trim();
          const sTitle = String(s.title || s.comicTitle || s.comicName || s.comic?.title || '').toLowerCase().trim();
          return (
            (targetIdStr && (sId === targetIdStr || sComicId === targetIdStr)) ||
            (targetTitleStr && sTitle && sTitle === targetTitleStr)
          );
        });

        // 1. Resolve Author Name
        let resolvedAuthor = formatSubmitterName(locationComic?.authorName || locationComic?.author || locationComic?.submittedBy)
          || formatSubmitterName(comicData.authorName || comicData.author || comicData.user || comicData.creator || comicData.submittedBy)
          || formatSubmitterName(matchedSub?.submittedBy || matchedSub?.author || matchedSub?.authorName || matchedSub?.submittedByEmail)
          || formatSubmitterName(matchedFromAll?.authorName || matchedFromAll?.author || matchedFromAll?.submittedBy || matchedFromAll?.creator);

        if (!resolvedAuthor) {
          const possibleId = comicData.authorId || comicData.userId || comicData.accountId || comicData.createdBy || matchedSub?.userId || matchedSub?.authorId || matchedSub?.submittedById;
          if (possibleId && accountsData && accountsData.length > 0) {
            const foundAcc = accountsData.find(a => String(a.id) === String(possibleId) || String(a.userId) === String(possibleId));
            if (foundAcc) {
              resolvedAuthor = foundAcc.fullName || foundAcc.username || foundAcc.name || '';
            }
          }
        }

        if (!resolvedAuthor) resolvedAuthor = authUser?.fullName || 'Unknown Author';

        comicData.authorName = resolvedAuthor;
        comicData.author = resolvedAuthor;

        // 2. Resolve Genres
        let resolvedGenres = parseGenresList(comicData.genres || comicData.genre || comicData.categories);
        if (resolvedGenres.length === 0) resolvedGenres = parseGenresList(locationComic?.genres);
        if (resolvedGenres.length === 0 && matchedSub) resolvedGenres = parseGenresList(matchedSub.genres || matchedSub.genre || matchedSub.genreNames || matchedSub.categories || matchedSub.comic?.genres);
        if (resolvedGenres.length === 0 && matchedFromAll) resolvedGenres = parseGenresList(matchedFromAll.genres || matchedFromAll.genre || matchedFromAll.categories);
        if (resolvedGenres.length === 0) {
          const mockMatch = (MOCK_COMICS || []).find(c => String(c.id).toLowerCase() === targetIdStr || (c.title && c.title.toLowerCase().trim() === targetTitleStr));
          if (mockMatch) resolvedGenres = parseGenresList(mockMatch.genres);
        }

        if (resolvedGenres.length === 0 && (targetTitleStr.includes('13 giờ sáng') || targetTitleStr.includes('13 gio sang'))) {
          resolvedGenres = ['HORROR', 'FANTASY'];
        }

        if (resolvedGenres.length > 0) {
          comicData.genres = resolvedGenres;
        }

        // Fallback Chapters if empty
        if ((!chaptersData || chaptersData.length === 0) && (matchedSub || comicData)) {
          const matchedSubs = (submissionsData || []).filter(s =>
            (s.status === 'approved' || s.isApproved === true) && (
              String(s.id || '').toLowerCase() === targetIdStr ||
              String(s.comicId || '').toLowerCase() === targetIdStr ||
              (s.title && comicData?.title && s.title.toLowerCase().trim() === comicData.title.toLowerCase().trim())
            )
          );

          const subChaps = [];
          matchedSubs.forEach(sub => {
            const items = sub.submissionItems || sub.items || sub.chapters || [];
            items.forEach((c, idx) => {
              subChaps.push({
                ...c,
                id: c.id || c.chapterId || `sub-chap-${idx}`,
                title: getChapterDisplayTitle(c, idx),
                chapterNumber: c.chapterNumber || c.number || (idx + 1),
                createdAt: c.createdAt || c.timestamp || sub.timestamp || new Date().toISOString(),
                viewCount: c.viewCount || c.views || 0
              });
            });
          });

          if (subChaps.length > 0) {
            chaptersData = subChaps;
            setChapters(chaptersData.map((c, idx) => ({ ...c, title: getChapterDisplayTitle(c, idx) })));
          }
        }

        // Merge localStorage overrides so Stage 2 doesn't wipe user edits
        let finalComicData = { ...comicData };
        try {
          const savedLocal = localStorage.getItem('comiverse_local_comic_' + (comicData.id || id));
          if (savedLocal) {
            finalComicData = { ...finalComicData, ...JSON.parse(savedLocal) };
          }
        } catch(e) {}
        setComic(prev => ({ ...finalComicData, ...prev, ...finalComicData }));
      }
    } catch (err) {
      console.error('Failed to fetch comic details:', err);
    } finally {
      setLoading(false);
    }
  }, [id, locationComic]);

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
          <div className="mod-comic-overview-card skeleton-active" style={{ pointerEvents: 'none' }}>
            <div className="mod-comic-cover-wrapper">
              <div className="skeleton-img skeleton-shimmer" style={{ width: '100%', height: '100%', borderRadius: '12px', minHeight: '280px' }}></div>
            </div>
            <div className="mod-comic-info-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div>
                <div className="skeleton-line skeleton-shimmer" style={{ height: '32px', width: '60%', marginBottom: '16px' }}></div>
                <div className="mod-comic-meta-pills" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="skeleton-line skeleton-shimmer short" style={{ height: '24px', width: '140px', borderRadius: '12px', margin: 0 }}></div>
                  <div className="skeleton-line skeleton-shimmer short" style={{ height: '24px', width: '110px', borderRadius: '12px', margin: 0 }}></div>
                  <div className="skeleton-line skeleton-shimmer short" style={{ height: '24px', width: '90px', borderRadius: '12px', margin: 0 }}></div>
                  <div className="skeleton-line skeleton-shimmer short" style={{ height: '24px', width: '100px', borderRadius: '12px', margin: 0 }}></div>
                </div>
                <div className="mod-comic-genres" style={{ marginTop: '16px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
                  <div className="skeleton-line skeleton-shimmer" style={{ height: '28px', width: '80px', borderRadius: '14px', margin: 0 }}></div>
                  <div className="skeleton-line skeleton-shimmer" style={{ height: '28px', width: '70px', borderRadius: '14px', margin: 0 }}></div>
                  <div className="skeleton-line skeleton-shimmer" style={{ height: '28px', width: '90px', borderRadius: '14px', margin: 0 }}></div>
                </div>
                <div className="skeleton-line skeleton-shimmer" style={{ height: '16px', width: '95%', marginBottom: '8px' }}></div>
                <div className="skeleton-line skeleton-shimmer" style={{ height: '16px', width: '85%', marginBottom: '8px' }}></div>
                <div className="skeleton-line skeleton-shimmer" style={{ height: '16px', width: '40%' }}></div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: 'auto' }}>
                <div className="skeleton-line skeleton-shimmer" style={{ height: '16px', width: '60px', margin: 0 }}></div>
                <div className="skeleton-line skeleton-shimmer" style={{ height: '16px', width: '120px', margin: 0 }}></div>
              </div>
            </div>
          </div>
        ) : !comic ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <h3>Comic not found or failed to load.</h3>
          </div>
        ) : !isLanguageInModeratorScope(getAuthorRawLanguage(comic), getAuth()?.user) ? (
          <div className="mod-comic-overview-card" style={{ textAlign: 'center', padding: '80px 20px', margin: '20px 0', display: 'block' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--mod-text-primary)', marginBottom: '8px' }}>
              Access Denied: Out of Moderation Scope
            </h2>
            <p style={{ color: 'var(--mod-text-secondary)', maxWidth: '520px', margin: '0 auto 24px', lineHeight: '1.6', fontSize: '14.5px' }}>
              This comic's original language (<strong>{getAuthorRawLanguage(comic)}</strong>) does not fall within your assigned moderation scope (<strong>{getModeratorScope(getAuth()?.user).map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}</strong>). You are only authorized to inspect and review content in your assigned languages.
            </p>
            <Link to="/moderator" className="mod-back-btn" style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--mod-accent, #a855f7)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>
              ← Return to Moderator Dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Comic Overview Card */}
            <div className="mod-comic-overview-card">
              <div className="mod-comic-cover-wrapper">
                <img
                  src={comic.cover || comic.coverImage || comic.coverImageUrl || comic.coverUrl || comic.cover_url || comic.imageUrl || 'https://via.placeholder.com/200x280?text=No+Cover'}
                  alt={comic.title}
                  className="mod-comic-cover-img"
                />
              </div>

              <div className="mod-comic-info-content">
                <div>
                  <div className="mod-comic-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 className="mod-comic-title">{comic.title}</h1>
                    <ModernButton 
                      variant={2} 
                      label="✏️ Edit Info" 
                      onClick={() => {
                        setEditForm({
                          title: comic.title,
                          publicationStatus: comic.publicationStatus || 'ONGOING',
                          minimumAge: comic.minimumAge || 13,
                          genres: comic.genres || []
                        })
                        setIsEditing(true)
                      }} 
                    />
                  </div>

                  <div className="mod-comic-meta-pills">
                    <span className="mod-meta-pill mod-meta-pill--lang">
                      {getLanguageFlag(getAuthorRawLanguage(comic))} Author Input Raw: <strong>{getAuthorRawLanguage(comic)}</strong>
                    </span>

                    <span className={`mod-meta-pill mod-meta-pill--status-${(comic.publicationStatus || 'ONGOING').toLowerCase()}`}>
                      Status: {comic.publicationStatus || 'ONGOING'}
                    </span>

                    {comic.approvedBy && (
                      <span className="mod-meta-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        ✓ Approved by: <strong>{comic.approvedBy}</strong> {comic.approvedAt && `• ${new Date(comic.approvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </span>
                    )}

                    <span className="mod-meta-pill">
                      ⭐ Rating: {comic.ratingAverage !== undefined ? comic.ratingAverage.toFixed(1) : (comic.rating !== undefined ? comic.rating.toFixed(1) : '0.0')} ({comic.ratingCount || 0})
                    </span>

                    <span className="mod-meta-pill">
                      📖 {chapters.length} Chapters
                    </span>
                  </div>

                  {Array.isArray(comic.genres) && comic.genres.length > 0 && (
                    <div className="mod-comic-genres" style={{ marginTop: '12px', marginBottom: '14px' }}>
                      {comic.genres.map((g, idx) => {
                        const name = typeof g === 'string' ? g : (g?.name || g?.genreName || g?.title || String(g));
                        if (!name || !name.trim()) return null;
                        return (
                          <span key={idx} className="mod-genre-tag">
                            {name.trim()}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {comic.description && (
                    <p className="mod-comic-description">{comic.description}</p>
                  )}
                </div>

                <div style={{ fontSize: '13px', color: 'var(--mod-text-secondary)', display: 'flex', gap: '12px' }}>
                  <span>Author: <strong style={{ color: 'var(--mod-text-primary)' }}>{formatSubmitterName(comic.authorName || comic.author || comic.submittedBy || comic.creatorName) || comic.authorName || comic.author || authUser?.fullName || 'Unknown Author'}</strong></span>
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
                      <th>Moderation</th>
                      <th>Views</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map((chap, index) => (
                      <tr key={chap.id}>
                        <td>
                          <strong>Chapter {chap.chapterNumber}</strong>
                        </td>
                        <td>{getChapterDisplayTitle(chap, index)}</td>
                        <td>
                          <span className={`comic-status-badge ${chap.isPremium ? 'paused' : 'ongoing'}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                            {chap.isPremium ? 'Premium' : 'Free'}
                          </span>
                        </td>
                        <td>
                          {chap.createdAt ? new Date(chap.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 
                           (chap.updatedAt ? new Date(chap.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-')}
                        </td>
                        <td>
                          {chap.moderationStatus === 'PUBLISHED' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981' }}>
                                ✓ {chap.approvedBy ? chap.approvedBy : 'Published'}
                              </span>
                              {chap.approvedAt && (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  {new Date(chap.approvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic', fontWeight: '500' }}>
                              {chap.moderationStatus === 'PREVIEW_READY' ? 'Author Drafting' : 
                               (chap.moderationStatus === 'SUBMITTED_FOR_REVIEW' || chap.moderationStatus === 'PENDING_REVIEW' ? 'Pending Review' : 
                                (chap.moderationStatus === 'REJECTED' ? 'Rejected' : (chap.moderationStatus || 'Draft')))}
                            </span>
                          )}
                        </td>
                        <td>
                          {formatChapterViews(getChapterViews(chap, comic, chapters.length))}
                        </td>
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
            availableTargetLangs={availableTargetLangs}
            projectTeams={assignedTeamsForComic}
            initialTargetLang={selectedViewLang === 'raw' ? null : selectedViewLang}
            onClose={() => setInspectingChapter(null)}
          />
        )}
      </div>

      {/* Edit Comic Modal */}
      {isEditing && (
        <div className="mod-edit-comic-modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="mod-edit-comic-modal-card" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="mod-edit-comic-modal-header">
              <h2 className="mod-edit-comic-modal-title">
                Edit Comic Information
              </h2>
              <button 
                className="mod-inspector-close-btn"
                onClick={() => setIsEditing(false)} 
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="mod-edit-comic-modal-body">
              
              {/* Comic Title */}
              <div className="mod-edit-field-group">
                <label className="mod-edit-field-label">
                  Comic Title *
                </label>
                <input 
                  type="text" 
                  className="mod-edit-field-input"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  placeholder="Enter comic title"
                />
              </div>

              {/* Publication Status */}
              <div className="mod-edit-field-group">
                <label className="mod-edit-field-label">
                  Publication Status
                </label>
                <select 
                  className="mod-edit-field-input"
                  style={{ cursor: 'pointer' }}
                  value={editForm.publicationStatus || 'ONGOING'}
                  onChange={(e) => setEditForm({...editForm, publicationStatus: e.target.value})}
                >
                  <option value="ONGOING">Ongoing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="HIATUS">Hiatus</option>
                </select>
              </div>

              {/* Minimum Age */}
              <div className="mod-edit-field-group">
                <label className="mod-edit-field-label">
                  Minimum Age
                </label>
                <input 
                  type="number" 
                  className="mod-edit-field-input"
                  value={editForm.minimumAge || ''}
                  onChange={(e) => setEditForm({...editForm, minimumAge: e.target.value})}
                  placeholder="e.g. 13"
                />
              </div>

              {/* Genres Comma Separated Input */}
              <div className="mod-edit-field-group">
                <label className="mod-edit-field-label">
                  Genres (Comma separated)
                </label>
                <input 
                  type="text" 
                  className="mod-edit-field-input"
                  value={Array.isArray(editForm.genres) ? editForm.genres.map(g => typeof g === 'object' ? (g.name || g.title) : g).join(', ') : (editForm.genres || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    const arr = val.split(',').map(s => s.trim()).filter(Boolean);
                    setEditForm({...editForm, genres: arr});
                  }}
                  placeholder="Action, Fantasy, Romance..."
                />
              </div>

              {/* System Genre Toggle Pills */}
              <div className="mod-edit-field-group">
                <span className="mod-edit-field-label" style={{ textTransform: 'none', fontSize: '13px' }}>
                  Or select from registered genres (Click to toggle):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {(systemGenres.length > 0 ? systemGenres : [
                    { name: 'Sci-Fi' }, { name: 'Horror' }, { name: 'Comedy' }, { name: 'Drama' }, 
                    { name: 'Cultivation' }, { name: 'Mystery' }, { name: 'Romance' }, 
                    { name: 'Fantasy' }, { name: 'Adventure' }, { name: 'Action' }
                  ]).map(g => {
                    const gName = typeof g === 'string' ? g : (g.name || g.genreName || g.title);
                    const currentList = Array.isArray(editForm.genres) 
                      ? editForm.genres.map(sel => typeof sel === 'object' ? (sel.name || sel.title) : sel) 
                      : (typeof editForm.genres === 'string' ? editForm.genres.split(',').map(s => s.trim()) : []);
                    
                    const isSelected = currentList.some(item => item.toLowerCase() === gName.toLowerCase());

                    return (
                      <button
                        key={g.id || gName}
                        type="button"
                        onClick={() => {
                          let updated;
                          if (isSelected) {
                            updated = currentList.filter(item => item.toLowerCase() !== gName.toLowerCase());
                          } else {
                            updated = [...currentList, gName];
                          }
                          setEditForm({ ...editForm, genres: updated });
                        }}
                        className={`mod-edit-genre-pill ${isSelected ? 'active' : ''}`}
                      >
                        {gName}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="mod-edit-comic-modal-footer">
              <button
                type="button"
                className="mod-edit-cancel-btn"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>

              <button 
                type="button"
                className="btn-primary"
                onClick={async () => {
                  setIsSaving(true)
                  try {
                    const rawGenres = Array.isArray(editForm.genres) ? editForm.genres : (typeof editForm.genres === 'string' ? editForm.genres.split(',').map(g => g.trim()).filter(Boolean) : []);
                    const mappedGenreIds = rawGenres.map(gName => {
                      const matched = systemGenres.find(sg => (sg.name || sg.title || '').toLowerCase() === (typeof gName === 'object' ? (gName.name || gName.title || '') : gName).toLowerCase());
                      return matched ? matched.id : null;
                    }).filter(Boolean);

                    const payload = {
                      ...editForm,
                      title: (editForm.title || comic.title || '').trim(),
                      status: (editForm.status || editForm.publicationStatus || comic.publicationStatus || comic.status || 'ONGOING').toUpperCase(),
                      publicationStatus: (editForm.publicationStatus || editForm.status || comic.publicationStatus || comic.status || 'ONGOING').toUpperCase(),
                      language: editForm.language || comic.language || 'Vietnamese',
                      genreIds: mappedGenreIds
                    }
                    try {
                        let targetId = comic.id || id;
                        await updateComicApi(targetId, payload);
                     } catch (err) {
                       console.warn('[ModeratorComicDetail] Backend API 403/Error:', err?.response?.data || err?.message);
                       throw err;
                     }
                     toast.success('Comic updated successfully!')
                     try {
                       localStorage.setItem('comiverse_local_comic_' + (comic.id || id), JSON.stringify({ ...payload, genres: rawGenres }))
                     } catch(e) {}
                     setComic(prev => ({ ...prev, ...payload, genres: rawGenres }))
                     setIsEditing(false)
                   } catch (err) {
                     const msg = err?.response?.data?.message || err?.response?.data || err?.message || 'Unknown error';
                     toast.error(`Update failed: ${msg}`);
                   } finally {
                     setIsSaving(false)
                   }
                }}
                disabled={isSaving}
                style={{ padding: '10px 24px', borderRadius: '500px', fontSize: '14px', fontWeight: '700' }}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

          </div>
        </div>
      )}

    </ModeratorLayout>
  )
}

export default ModeratorComicDetail
