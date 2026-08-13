import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { getAuthorComicChaptersApi, getAuthorChapterPreviewApi } from '../../services/api/AuthorComicApi'
import { getChapterDetailApi } from '../../services/api/ChapterApi'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import '../../assets/style/author/comics.css'
import '../../assets/style/moderator/comic-detail.css'

/* ────────────────────────── helpers ────────────────────────── */

const normalizeArrayResponse = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

const extractPages = (obj) => {
  if (!obj) return [];
  const raw = obj.pages || obj.images || obj.pageUrls || obj.pagesList || obj.urls || obj.chapterPages || (Array.isArray(obj.content) ? obj.content : []);
  return normalizeArrayResponse(raw);
};

function getChapterNumber(chapter) {
  if (!chapter) return ''
  return chapter.chapterNumber || chapter.number || chapter.order || 'N/A'
}

const normalizePage = (page, idx) => {
  const url = typeof page === 'string' ? page : (page?.imageUrl || page?.url || page?.pageUrl || page?.path || page?.src || '')
  const number = (typeof page === 'object' && page?.pageNumber) ? page.pageNumber : (idx + 1)
  return { url, number }
}

const cleanTargetLabel = (label) => (label || '').replace(/\s*\(\d+%\s*,\s*\d+%\)/g, '').trim()

const formatStatus = (status) => {
  const value = (status || '').toString().toUpperCase()
  if (value === 'APPROVED' || value === 'PUBLISHED') return '✓ Approved'
  if (value === 'HIDDEN' || value === 'UNPUBLISHED') return '🔒 Hidden'
  if (value === 'REJECTED') return '✕ Rejected'
  if (value === 'DRAFT') return 'Draft'
  if (value === 'PREVIEW_READY') return 'Preview Ready'
  if (value === 'SUBMITTED_FOR_REVIEW' || value === 'PENDING') return '⏳ Pending'
  return value || 'N/A'
}

function parseCommentsFromReport(reasonText) {
  if (!reasonText || !reasonText.includes('--- DETAILED INSPECTION FEEDBACK REPORT')) return []
  let reportSection = reasonText.split('--- DETAILED INSPECTION FEEDBACK REPORT')[1] || ''
  if (reportSection.includes('--- PRESERVED PAGES BLOCK ---')) {
    reportSection = reportSection.split('--- PRESERVED PAGES BLOCK ---')[0];
  }
  const lines = reportSection.split('\n')
  const parsedComments = []

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    if (!trimmed) return
    const match = trimmed.match(/^\d+\.\s*\[([^\]]+)\]:\s*(.+)$/)
    if (match) {
      const label = match[1].trim()
      const text = match[2].trim()

      let pageNum = 1
      const pMatch = label.match(/Page\s+(\d+)/i)
      if (pMatch) pageNum = parseInt(pMatch[1], 10)

      let xPercentage = null
      let yPercentage = null
      const coordMatch = label.match(/\((\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\)/)
      if (coordMatch) {
        xPercentage = parseFloat(coordMatch[1])
        yPercentage = parseFloat(coordMatch[2])
      }

      parsedComments.push({
        id: `parsed-doc-comment-${idx}-${Date.now()}`,
        targetType: coordMatch ? 'point' : (label.toLowerCase().includes('page') ? 'page' : 'field'),
        targetKey: `page-${pageNum}`,
        targetLabel: label,
        text,
        createdAt: new Date().toISOString(),
        author: 'Moderator',
        xPercentage,
        yPercentage
      })
    }
  })

  return parsedComments
}

function parsePagesFromReport(reasonText) {
  if (!reasonText || !reasonText.includes('--- PRESERVED PAGES BLOCK ---')) return []
  try {
    const jsonStr = reasonText.split('--- PRESERVED PAGES BLOCK ---')[1].trim()
    return JSON.parse(jsonStr)
  } catch (e) {
    return []
  }
}

/* ────────────────── rejection data resolver ──────────────── */

function resolveRejectionInfo(preview, comicId) {
  let isRejected = false
  const statusStr = String(preview?.status || preview?.moderationStatus || '').toUpperCase()
  if (statusStr === 'REJECTED') isRejected = true

  let reason = preview?.rejectionReason || preview?.rejection_reason || preview?.rejectionNote || preview?.reason || preview?.notes || ''
  let docComments = []

  // If chapter is explicitly in a pre-submission or pending state, do not load old rejections.
  if (['DRAFT', 'PREVIEW_READY', 'SUBMITTED_FOR_REVIEW', 'PENDING'].includes(statusStr)) {
    return { isRejected: false, reason: '', docComments: [] }
  }

  const chapIdStr = String(preview?.id || preview?.chapterId || '')
  const subIdStr = String(preview?.submissionId || '')
  const comicIdStr = String(comicId || preview?.comicId || '')
  const chapNumStr = String(getChapterNumber(preview))

  let preservedPages = []

  // localStorage override removed for production readiness
  // Step 1: If reason contains structured report, parse exact comments from report FIRST
  if (reason) {
    const parsedFromReport = parseCommentsFromReport(reason)
    if (parsedFromReport.length > 0) {
      docComments = parsedFromReport
    }
    preservedPages = parsePagesFromReport(reason)
  }

  // localStorage document comments removed for production readiness
  return { isRejected, reason, docComments, preservedPages }
}

function parseOverallNote(reason) {
  if (!reason) return ''
  let cleanReason = reason;
  if (cleanReason.includes('--- PRESERVED PAGES BLOCK ---')) {
    cleanReason = cleanReason.split('--- PRESERVED PAGES BLOCK ---')[0];
  }
  if (cleanReason.includes('--- DETAILED INSPECTION FEEDBACK REPORT')) {
    return cleanReason.split('--- DETAILED INSPECTION FEEDBACK REPORT')[0].trim()
  }
  return cleanReason.trim()
}

/* ────────────────── badge renderer ──────────────── */

function renderCommentBadge(c, globalPinIndex) {
  const cleanLabel = cleanTargetLabel(c.targetLabel)
  const isPointPin = c.targetType === 'point' || (c.xPercentage !== null && c.xPercentage !== undefined)

  if (isPointPin) {
    return (
      <span className="mod-doc-comment-target-badge point-pin">
        📍 {cleanLabel} · Pin #{globalPinIndex || 1}
      </span>
    )
  } else if (c.targetType === 'page') {
    return (
      <span className="mod-doc-comment-target-badge page-note">
        📄 {cleanLabel} · Page Note
      </span>
    )
  } else {
    return (
      <span className="mod-doc-comment-target-badge field-note">
        💬 {cleanLabel}
      </span>
    )
  }
}

/* ════════════════════════════════════════════════════════════ */
/*                   MAIN COMPONENT                            */
/* ════════════════════════════════════════════════════════════ */

export default function AuthorChapterPreview() {
  const { comicId, chapterId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme } = useTheme()

  const [preview, setPreview] = useState(location.state?.preview || null)
  const [loading, setLoading] = useState(!preview)

  // Reader state
  const [previewTab, setPreviewTab] = useState('reader') // 'reader' | 'details'
  const [pageIndex, setPageIndex] = useState(0)
  const [readerLayout, setReaderLayout] = useState('single') // 'single' | 'vertical'
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false)
  const [sidebarCommentTab, setSidebarCommentTab] = useState('all') // 'all' | 'page' | 'point'
  const [activePinTarget, setActivePinTarget] = useState(null)
  const [isFooterVisible, setIsFooterVisible] = useState(true)

  const readerAreaRef = useRef(null)
  const footerTimerRef = useRef(null)
  const serverRefreshAttemptedRef = useRef(false)

  /* ── Auth guard ─────────────────── */
  useEffect(() => {
    if (!user || user.role?.toUpperCase() !== 'AUTHOR') {
      navigate('/', { replace: true })
      return
    }

    const currentRawPages = extractPages(preview)

    const currentStatus = String(preview?.status || preview?.moderationStatus || '').toUpperCase()
    const currentReason = preview?.rejectionReason || preview?.rejection_reason || ''
    const needsRejectedFeedbackFetch = currentStatus === 'REJECTED' && !currentReason && !serverRefreshAttemptedRef.current
    const needsServerFetch = !preview || currentRawPages.length === 0 || needsRejectedFeedbackFetch

    if (needsServerFetch) {
      serverRefreshAttemptedRef.current = true
      const fetchChapter = async () => {
        try {
          let previewData = null

          // Primary: call the author chapter preview endpoint which returns pages
          try {
            const previewRes = await getAuthorChapterPreviewApi(comicId, chapterId)
            if (previewRes?.data || previewRes) {
              previewData = previewRes.data || previewRes
            }
          } catch {
            // ignore — may fail for rejected chapters
          }

          // Fallback: if preview didn't return pages, try chapter detail endpoint
          const pPages = extractPages(previewData)
          if (!previewData || pPages.length === 0) {
            try {
              const detailRes = await getChapterDetailApi(chapterId)
              if (detailRes?.data || detailRes) {
                previewData = { ...(previewData || {}), ...(detailRes.data || detailRes) }
              }
            } catch {
              // ignore
            }
          }

          const fetchedPages = previewPages.length > 0 ? previewPages : [];

          if (fetchedPages.length > 0) {
            setPreview(prev => ({
              ...prev,
              ...(previewData || {}),
              pages: fetchedPages,
              status: previewData?.status || prev?.status
            }))
          } else {
            const res = await getAuthorComicChaptersApi(comicId)
            const chapters = res?.data || res || []
            const chaptersList = normalizeArrayResponse(chapters)
            const found = chaptersList.find((c) => (
              String(c.id) === String(chapterId) ||
              String(c.chapterId) === String(chapterId) ||
              String(c.chapterNumber) === String(chapterId)
            ))
            
            if (found) {
              let detailData = null
              try {
                detailData = await getAuthorChapterPreviewApi(comicId, found.id || found.chapterId || chapterId)
              } catch {
                // ignore
              }
              const foundDetailPages = extractPages(detailData)
              if (!detailData || foundDetailPages.length === 0) {
                try {
                  const detailRes = await getChapterDetailApi(found.id || found.chapterId || chapterId)
                  if (detailRes?.data || detailRes) {
                    detailData = { ...(detailData || {}), ...(detailRes.data || detailRes) }
                  }
                } catch {
                  // ignore
                }
              }
              setPreview(prev => ({ ...prev, ...found, ...(detailData || {}) }))
            } else if (previewData) {
              setPreview(prev => ({ ...prev, ...(previewData || {}) }))
            }
          }
        } catch (error) {
          console.error('Failed to load chapter for preview:', error)
        } finally {
          setLoading(false)
        }
      }
      fetchChapter()
    }
  }, [preview, comicId, chapterId, user, navigate])

  /* ── Footer auto-hide on scroll ─── */
  const handleReaderAreaScroll = useCallback(() => {
    setIsFooterVisible(true)
    if (footerTimerRef.current) clearTimeout(footerTimerRef.current)
    footerTimerRef.current = setTimeout(() => setIsFooterVisible(false), 3000)
  }, [])

  const handleReaderAreaMouseMove = useCallback(() => {
    setIsFooterVisible(true)
    if (footerTimerRef.current) clearTimeout(footerTimerRef.current)
    footerTimerRef.current = setTimeout(() => setIsFooterVisible(false), 3000)
  }, [])

  /* ── Scroll to page in vertical mode ─── */
  const scrollToPageElement = useCallback((pageNum) => {
    const el = document.getElementById(`author-page-container-${pageNum}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  /* ── Loading / not found states ─── */
  if (loading) {
    return <div style={{ padding: '40px', color: '#fff', textAlign: 'center' }}>Loading preview...</div>
  }

  if (!preview) {
    return (
      <div style={{ padding: '40px', color: '#fff', textAlign: 'center' }}>
        <h2>Chapter not found</h2>
        <button onClick={() => navigate(`/author/comics/${comicId}`)} className="btn-author-action">
          Return to Comic
        </button>
      </div>
    )
  }

  /* ── Derive data ─── */
  const { isRejected, reason, docComments, preservedPages } = resolveRejectionInfo(preview, comicId)
  
  let rawPages = extractPages(preview)
  if (rawPages.length === 0 && preservedPages && preservedPages.length > 0) {
    rawPages = preservedPages
  }
  const pages = rawPages.map((p, idx) => normalizePage(p, idx))

  const overallNote = parseOverallNote(reason)

  // Comments for current page
  const currentPageComments = docComments.filter(c => c.targetKey === `page-${pageIndex + 1}`)

  // Sidebar filtering
  const allComments = docComments
  const pageNotesList = allComments.filter(c => c.targetType === 'page' || (!c.coords && c.targetType !== 'field' && c.xPercentage === null && c.xPercentage === undefined))
  const pointPinsList = allComments.filter(c => c.targetType === 'point' || (c.xPercentage !== null && c.xPercentage !== undefined))

  const displayList = allComments.filter(c => {
    if (sidebarCommentTab === 'page') return c.targetType === 'page' || (!c.coords && c.targetType !== 'field' && !c.xPercentage)
    if (sidebarCommentTab === 'point') return c.targetType === 'point' || (c.xPercentage !== null && c.xPercentage !== undefined)
    return true
  })

  /* ════════════════════════════ RENDER ════════════════════════════ */

  return createPortal(
    <div className={`mod-inspector-overlay fade-in ${theme === 'light' ? 'light-theme' : 'dark-theme'}`}>

      {/* ══════════ TOPBAR ══════════ */}
      <div className="mod-inspector-topbar">
        {/* Left: Title Group */}
        <div className="mod-inspector-title-group" style={{ maxWidth: '380px' }}>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <h3 className="mod-inspector-title" title={`Preview · Chapter ${getChapterNumber(preview)}`}>
              {isRejected ? '⛔' : '📖'} Preview · Chapter {getChapterNumber(preview)}
            </h3>
            <div className="mod-inspector-subtitle">
              {pages.length} pages · {isRejected ? 'Rejected by Moderator' : 'Chapter Preview'}
            </div>
          </div>
        </div>

        {/* Center: Mode Tabs */}
        <div className="mod-inspector-mode-tabs">
          <button
            type="button"
            className={`mod-mode-tab ${previewTab === 'reader' ? 'active' : ''}`}
            onClick={() => setPreviewTab('reader')}
          >
            🖼️ Image Reader ({pages.length})
          </button>
          <button
            type="button"
            className={`mod-mode-tab ${previewTab === 'details' ? 'active' : ''}`}
            onClick={() => setPreviewTab('details')}
          >
            ℹ️ Details & Feedback
          </button>
        </div>

        {/* Right: Sidebar toggle + Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {docComments.length > 0 && (
            <button
              type="button"
              className={`mod-mode-tab ${showCommentsSidebar ? 'active' : ''}`}
              onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
              title="Toggle Moderator Feedback Sidebar"
            >
              💬 Feedback Pins ({docComments.length})
            </button>
          )}

          <button
            className="mod-inspector-close-btn"
            onClick={() => navigate(`/author/comics/${comicId}`)}
            title="Close Preview"
          >
            ×
          </button>
        </div>
      </div>

      {/* ══════════ BODY ══════════ */}
      <div className="mod-inspector-body">

        {/* ── Left Content Area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>

          {/* === TAB: IMAGE READER === */}
          {previewTab === 'reader' && (
            <>
              {pages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
                  <h3 className="mod-inspector-title" style={{ margin: '0 0 8px' }}>No Pages Available</h3>
                  <p className="mod-inspector-subtitle" style={{ margin: 0, fontSize: '14px', maxWidth: '480px', textAlign: 'center' }}>
                    This chapter does not have any uploaded pages. Go back and upload a CBZ file first.
                  </p>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
                  {/* Sub-banner: Page info */}
                  <div className="mod-inspector-subbanner">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="mod-pane-title--raw" style={{ fontWeight: '700' }}>
                        🖼️ Chapter {getChapterNumber(preview)} — Page {pageIndex + 1} of {pages.length}
                      </span>
                      {isRejected && (
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          ⛔ REJECTED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Central Reader Area */}
                  <div
                    ref={readerAreaRef}
                    className="mod-inspector-reader-area"
                    onClick={() => setActivePinTarget(null)}
                    onScroll={handleReaderAreaScroll}
                    onMouseMove={handleReaderAreaMouseMove}
                    style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: readerLayout === 'single' ? 'center' : 'flex-start', padding: '24px 24px 90px 24px' }}
                  >
                    {readerLayout === 'single' ? (
                      /* ─── Single Page Mode ─── */
                      <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', textAlign: 'center' }}>
                        <img
                          src={pages[pageIndex]?.url || ''}
                          alt={`Page ${pageIndex + 1}`}
                          decoding="async"
                          loading="eager"
                          style={{
                            maxHeight: '75vh',
                            maxWidth: '100%',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            cursor: 'default'
                          }}
                          title={`Page ${pageIndex + 1}`}
                        />

                        {/* Pin markers on this page */}
                        {currentPageComments.map((c) => {
                          const globalPinIndex = allComments.findIndex(item => item.id === c.id) + 1
                          return (
                            c.xPercentage !== null && c.xPercentage !== undefined && (
                              <div
                                key={c.id}
                                className={`mod-doc-comment-pin ${activePinTarget === c.id ? 'active' : ''}`}
                                style={{ left: `${c.xPercentage}%`, top: `${c.yPercentage}%` }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowCommentsSidebar(true)
                                  setActivePinTarget(prev => prev === c.id ? null : c.id)
                                  const el = document.getElementById(`author-doc-comment-card-${c.id}`)
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                                }}
                              >
                                📌 {globalPinIndex > 0 ? globalPinIndex : 1}

                                {/* Glassmorphic Tooltip */}
                                <div className="mod-pin-hover-tooltip">
                                  <div className="mod-pin-tooltip-header">
                                    {renderCommentBadge(c, globalPinIndex)}
                                  </div>
                                  <p className="mod-pin-tooltip-body">{c.text}</p>
                                  <div className="mod-pin-tooltip-footer">
                                    <span>🛡️ {c.author || 'Moderator'}</span>
                                    <span>{formatTimeAgo(c.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          )
                        })}
                      </div>
                    ) : (
                      /* ─── Continuous Vertical Scroll Mode ─── */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', width: '100%', maxWidth: '850px' }}>
                        {pages.map((page, pIdx) => {
                          const pNum = pIdx + 1
                          const pComments = docComments.filter(c => c.targetKey === `page-${pNum}`)

                          return (
                            <div key={pIdx} id={`author-page-container-${pNum}`} style={{ width: '100%', textAlign: 'center', position: 'relative' }}>
                              <img
                                src={page.url}
                                alt={`Page ${pNum}`}
                                decoding="async"
                                loading="lazy"
                                onClick={() => setPageIndex(pIdx)}
                                style={{
                                  width: '100%',
                                  maxHeight: '90vh',
                                  objectFit: 'contain',
                                  borderRadius: '8px',
                                  boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                                  border: pageIndex === pIdx ? '2px solid #a855f7' : '1px solid rgba(148, 163, 184, 0.2)',
                                  cursor: 'pointer'
                                }}
                                title={`Page ${pNum}`}
                              />

                              {/* Pin markers */}
                              {pComments.map((c) => {
                                const globalPinIndex = allComments.findIndex(item => item.id === c.id) + 1
                                return (
                                  c.xPercentage !== null && c.xPercentage !== undefined && (
                                    <div
                                      key={c.id}
                                      className={`mod-doc-comment-pin ${activePinTarget === c.id ? 'active' : ''}`}
                                      style={{ left: `${c.xPercentage}%`, top: `${c.yPercentage}%` }}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setShowCommentsSidebar(true)
                                        setActivePinTarget(prev => prev === c.id ? null : c.id)
                                        const el = document.getElementById(`author-doc-comment-card-${c.id}`)
                                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                                      }}
                                    >
                                      📌 {globalPinIndex > 0 ? globalPinIndex : 1}

                                      <div className="mod-pin-hover-tooltip">
                                        <div className="mod-pin-tooltip-header">
                                          {renderCommentBadge(c, globalPinIndex)}
                                        </div>
                                        <p className="mod-pin-tooltip-body">{c.text}</p>
                                        <div className="mod-pin-tooltip-footer">
                                          <span>🛡️ {c.author || 'Moderator'}</span>
                                          <span>{formatTimeAgo(c.createdAt)}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )
                              })}

                              <span className="mod-inspector-subtitle" style={{ display: 'inline-block', marginTop: '6px', fontSize: '11.5px' }}>
                                Page {pNum} of {pages.length}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Bottom Toolbar */}
                  <div className={`mod-inspector-controls ${!isFooterVisible ? 'is-hidden' : ''}`}>
                    <div className="mod-page-nav-group">
                      <button
                        type="button"
                        className="mod-nav-arrow"
                        onClick={() => {
                          const targetP = Math.max(0, pageIndex - 1)
                          setPageIndex(targetP)
                          if (readerLayout === 'vertical') scrollToPageElement(targetP + 1)
                        }}
                        disabled={pageIndex === 0}
                      >
                        ← Previous Page
                      </button>

                      <div className="mod-inspect-select-container">
                        <span className="mod-inspect-select-label">Page</span>
                        <select
                          className="mod-inspect-select"
                          value={pageIndex}
                          onChange={(e) => {
                            const targetP = Number(e.target.value)
                            setPageIndex(targetP)
                            if (readerLayout === 'vertical') scrollToPageElement(targetP + 1)
                          }}
                        >
                          {pages.map((_, pIdx) => (
                            <option key={pIdx} value={pIdx}>{pIdx + 1} of {pages.length}</option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        className="mod-nav-arrow"
                        onClick={() => {
                          const targetP = Math.min(pages.length - 1, pageIndex + 1)
                          setPageIndex(targetP)
                          if (readerLayout === 'vertical') scrollToPageElement(targetP + 1)
                        }}
                        disabled={pageIndex >= pages.length - 1}
                      >
                        Next Page →
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="mod-inspect-select-container">
                        <span className="mod-inspect-select-label">Reader Layout:</span>
                        <select
                          className="mod-inspect-select"
                          value={readerLayout}
                          onChange={(e) => setReaderLayout(e.target.value)}
                        >
                          <option value="single">📖 Single Page</option>
                          <option value="vertical">📜 Continuous Vertical Scroll</option>
                        </select>
                      </div>

                      <div className="mod-inspector-divider" />

                      <button
                        type="button"
                        className="mod-mode-tab"
                        onClick={() => navigate(`/author/comics/${comicId}`)}
                        style={{ padding: '6px 14px', fontSize: '12.5px', cursor: 'pointer' }}
                      >
                        Close Viewer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* === TAB: DETAILS & FEEDBACK === */}
          {previewTab === 'details' && (
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Rejection Banner */}
                {isRejected && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(153, 27, 27, 0.3) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    boxShadow: '0 12px 36px rgba(239, 68, 68, 0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '22px' }}>⛔</span>
                      <h3 style={{ margin: 0, color: '#fca5a5', fontSize: '17px', fontWeight: '700' }}>
                        Chapter Rejected by Moderator — Action Required
                      </h3>
                    </div>

                    <div style={{
                      fontSize: '14px', color: '#f8fafc', lineHeight: '1.6', background: 'rgba(0,0,0,0.35)',
                      padding: '14px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      <strong style={{ color: '#fca5a5' }}>Moderator Overall Note:</strong>
                      <p style={{ margin: '6px 0 0 0', whiteSpace: 'pre-wrap', color: '#e2e8f0', fontSize: '13.5px' }}>
                        {overallNote || 'No overall remarks provided. Please inspect page feedback in the sidebar.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Chapter Info Card */}
                <div className="mod-inspector-card" style={{ padding: '20px', borderRadius: '12px' }}>
                  <h4 className="mod-inspector-title" style={{ margin: '0 0 12px', fontSize: '17px', fontWeight: '700' }}>
                    📖 Chapter {getChapterNumber(preview)} Details
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                    <div className="mod-inspector-card" style={{ padding: '10px 12px', borderRadius: '8px' }}>
                      <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block' }}>Total Pages</span>
                      <strong style={{ fontSize: '13.5px', display: 'block', marginTop: '4px' }}>{pages.length}</strong>
                    </div>

                    <div className="mod-inspector-card" style={{ padding: '10px 12px', borderRadius: '8px' }}>
                      <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block' }}>Status</span>
                      <strong style={{
                        fontSize: '13.5px', display: 'block', marginTop: '4px',
                        color: isRejected ? '#ef4444' : '#10b981'
                      }}>
                        {isRejected ? '✕ Rejected' : formatStatus(preview?.status || preview?.moderationStatus)}
                      </strong>
                    </div>

                    <div className="mod-inspector-card" style={{ padding: '10px 12px', borderRadius: '8px' }}>
                      <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block' }}>Feedback Count</span>
                      <strong style={{ fontSize: '13.5px', display: 'block', marginTop: '4px', color: '#c084fc' }}>{docComments.length} comments</strong>
                    </div>
                  </div>
                </div>

                {/* Feedback Summary */}
                {docComments.length > 0 && (
                  <div className="mod-inspector-card" style={{ padding: '20px', borderRadius: '12px' }}>
                    <h4 className="mod-inspector-title" style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '700' }}>
                      💬 All Moderator Feedback ({docComments.length})
                    </h4>
                    <p className="mod-inspector-subtitle" style={{ margin: '0 0 16px', fontSize: '12px' }}>
                      Click "💬 Feedback Pins" in the top bar to open the detailed sidebar panel.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {docComments.map((c, idx) => (
                        <div
                          key={c.id || idx}
                          style={{
                            padding: '12px 14px', borderRadius: '10px',
                            background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${c.targetType === 'point' ? 'rgba(168,85,247,0.3)' : 'rgba(14,165,233,0.3)'}`,
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            if (c.targetKey?.startsWith('page-')) {
                              const pNum = parseInt(c.targetKey.replace('page-', ''), 10)
                              if (!isNaN(pNum)) {
                                setPageIndex(pNum - 1)
                                setPreviewTab('reader')
                                setShowCommentsSidebar(true)
                                setActivePinTarget(c.id)
                              }
                            }
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            {renderCommentBadge(c, idx + 1)}
                            <span className="mod-inspector-subtitle" style={{ fontSize: '11px' }}>
                              {formatTimeAgo(c.createdAt)}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{c.text}</p>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#7c3aed', marginTop: '4px', display: 'block' }}>
                            🛡️ {c.author || 'Moderator'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Comment Sidebar ── */}
        {showCommentsSidebar && (
          <div className="mod-doc-comments-sidebar">
            {/* Sidebar Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(148,163,184,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 className="mod-inspector-title" style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>
                  💬 Moderator Feedback ({allComments.length})
                </h4>
                <span className="mod-inspector-subtitle" style={{ fontSize: '11.5px' }}>
                  Read-only — pinned comments from review
                </span>
              </div>
              <button
                type="button"
                className="mod-modal-close-btn"
                onClick={() => setShowCommentsSidebar(false)}
                title="Close Sidebar"
              >
                ×
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="mod-doc-comments-sidebar-tabs">
              <button
                type="button"
                className={`mod-sidebar-tab-btn ${sidebarCommentTab === 'all' ? 'active-all' : ''}`}
                onClick={() => setSidebarCommentTab('all')}
              >
                All ({allComments.length})
              </button>
              <button
                type="button"
                className={`mod-sidebar-tab-btn ${sidebarCommentTab === 'page' ? 'active-notes' : ''}`}
                onClick={() => setSidebarCommentTab('page')}
              >
                📄 Notes ({pageNotesList.length})
              </button>
              <button
                type="button"
                className={`mod-sidebar-tab-btn ${sidebarCommentTab === 'point' ? 'active-pins' : ''}`}
                onClick={() => setSidebarCommentTab('point')}
              >
                📍 Pins ({pointPinsList.length})
              </button>
            </div>

            {/* Sidebar Body */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Read-only banner */}
              <div style={{
                padding: '10px 14px', borderRadius: '8px',
                background: isRejected ? 'rgba(239, 68, 68, 0.08)' : 'rgba(124,58,237,0.08)',
                border: `1px solid ${isRejected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(124,58,237,0.2)'}`,
                fontSize: '12px', textAlign: 'center', lineHeight: '1.5'
              }}>
                🔒 Submission is <strong style={{ color: isRejected ? '#ef4444' : '#7c3aed' }}>
                  {isRejected ? 'REJECTED' : formatStatus(preview?.status || preview?.moderationStatus).toUpperCase()}
                </strong> — Comments & Inspection Notes are frozen in read-only mode.
              </div>

              {/* Comment cards */}
              {displayList.length === 0 ? (
                <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>💬</div>
                  <p className="mod-inspector-title" style={{ margin: '0 0 6px', fontWeight: '700', fontSize: '14px' }}>No Comments Found</p>
                  <p className="mod-inspector-subtitle" style={{ margin: 0, fontSize: '12px', lineHeight: '1.5' }}>
                    No comments match the selected filter category ({sidebarCommentTab}).
                  </p>
                </div>
              ) : (
                displayList.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    id={`author-doc-comment-card-${c.id}`}
                    className={`mod-doc-comment-card ${activePinTarget === c.id ? 'active-highlight' : ''}`}
                    onClick={() => {
                      setActivePinTarget(c.id)
                      if (c.targetKey?.startsWith('page-')) {
                        const pNum = parseInt(c.targetKey.replace('page-', ''), 10)
                        if (!isNaN(pNum)) {
                          setPageIndex(pNum - 1)
                          setPreviewTab('reader')
                          if (readerLayout === 'vertical') scrollToPageElement(pNum)
                        }
                      }
                    }}
                    style={{
                      cursor: c.targetKey?.startsWith('page-') ? 'pointer' : 'default',
                      borderColor: activePinTarget === c.id ? '#7c3aed' : undefined,
                      boxShadow: activePinTarget === c.id ? '0 0 16px rgba(124, 58, 237, 0.4)' : undefined
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {renderCommentBadge(c, allComments.findIndex(item => item.id === c.id) + 1)}
                    </div>

                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                      {c.text}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginTop: '4px' }}>
                      <span style={{ fontWeight: '700', color: '#7c3aed' }}>🛡️ {c.author || 'Moderator'}</span>
                      <span className="mod-inspector-subtitle">{formatTimeAgo(c.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
