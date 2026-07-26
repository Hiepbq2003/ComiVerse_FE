import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import '../../assets/style/moderator/review-queue.css'
import '../../assets/style/moderator/comic-detail.css'
import ModernButton from '../../components/common/ModernButton'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import ModernPagination from '../../components/common/ModernPagination'
import { getChaptersByComicIdApi, getChapterDetailApi } from '../../services/api/ChapterApi'
import { getAuthorComicChaptersApi } from '../../services/api/AuthorComicApi'
import { useTheme } from '../../context/ThemeContext'
import { SkeletonLoader } from '../../components/common/SkeletonLoader'
import { getAuth } from '../../utils/Auth'
import { isLanguageInModeratorScope } from '../../utils/moderatorScope'

const formatSubmitterName = (submittedBy) => {
  if (!submittedBy) return 'Unknown';
  let name = submittedBy;
  let isAuthor = false;
  if (name.startsWith('Author: ')) {
    name = name.substring(8);
    isAuthor = true;
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(name)) {
    name = `User_${name.substring(0, 7)}`;
  }
  
  return isAuthor ? `Author: ${name}` : name;
};

const cleanTargetLabel = (label) => (label || '').replace(/\s*\(\d+%\s*,\s*\d+%\)/g, '').trim();

const renderCommentBadge = (c, globalPinIndex = null) => {
  const cleanLabel = cleanTargetLabel(c.targetLabel);
  const isPointPin = c.targetType === 'point' || (c.xPercentage !== null && c.xPercentage !== undefined);

  if (isPointPin) {
    return (
      <span className="mod-doc-comment-target-badge point-pin">
        📍 {cleanLabel} · Pin #{globalPinIndex || 1}
      </span>
    );
  } else if (c.targetType === 'page') {
    return (
      <span className="mod-doc-comment-target-badge page-note">
        📄 {cleanLabel} · Page Note
      </span>
    );
  } else {
    return (
      <span className="mod-doc-comment-target-badge field-note">
        💬 {cleanLabel}
      </span>
    );
  }
};

function ReviewQueue({ submissions = [], handleApprove, handleConfirmReject }) {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'approved' | 'rejected'
  
  const [sortFilter, setSortFilter] = useState('Newest')
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedReview, setSelectedReview] = useState(null)
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [previewTab, setPreviewTab] = useState('reader') // 'reader' | 'script' | 'chapters' | 'synopsis'
  const [pageIndex, setPageIndex] = useState(0)
  const [readerLayout, setReaderLayout] = useState('single') // 'single' | 'vertical'

  const [selectedReject, setSelectedReject] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [fetchingChapters, setFetchingChapters] = useState(false)
  const chapterCacheRef = useRef(new Map())

  // Google Docs Style Contextual Comment States with Permanent LocalStorage Persistence
  const [docCommentsMap, setDocCommentsMap] = useState(() => {
    try {
      const saved = localStorage.getItem('comiverse_moderator_doc_comments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('comiverse_moderator_doc_comments', JSON.stringify(docCommentsMap));
    } catch (e) {
      console.error('Failed to persist docCommentsMap:', e);
    }
  }, [docCommentsMap])
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(true)
  const [activePinTarget, setActivePinTarget] = useState(null)
  const [pinCommentText, setPinCommentText] = useState('')
  const [fieldCommentModalTarget, setFieldCommentModalTarget] = useState(null)
  const [isPinLocationMode, setIsPinLocationMode] = useState(false)
  const [sidebarCommentTab, setSidebarCommentTab] = useState('all') // 'all' | 'page' | 'point'
  const [isFooterVisible, setIsFooterVisible] = useState(true)
  const lastScrollTopRef = useRef(0)

  const handleReaderAreaScroll = (e) => {
    const currentScroll = e.currentTarget.scrollTop;
    const diff = currentScroll - lastScrollTopRef.current;

    if (diff > 12 && currentScroll > 50) {
      setIsFooterVisible(false);
    } else if (diff < -12) {
      setIsFooterVisible(true);
    }
    lastScrollTopRef.current = currentScroll;
  };

  const handleReaderAreaMouseMove = (e) => {
    if (window.innerHeight - e.clientY < 70) {
      setIsFooterVisible(true);
    }
  };
  
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, sortFilter, searchQuery])

  // 1. High-Performance Memoized Tab Counts
  const tabCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    submissions.forEach(item => {
      if (item.status && counts[item.status] !== undefined) {
        counts[item.status]++;
      }
    });
    return counts;
  }, [submissions]);

  // 2. High-Performance Instant Query Filter & Sort
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const authUser = getAuth()?.user;
    
    return submissions
      .filter(item => isLanguageInModeratorScope(item.language || item.rawLanguage || item.targetLanguage || item.targetLang, authUser))
      .filter(item => item.status === activeTab)
      .filter(item => {
        if (!query) return true;
        return (
          item.title?.toLowerCase().includes(query) ||
          item.submittedBy?.toLowerCase().includes(query) ||
          item.submittedByEmail?.toLowerCase().includes(query) ||
          item.chapter?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const timeA = a.timestamp || 0;
        const timeB = b.timestamp || 0;
        return sortFilter === 'Newest' ? timeB - timeA : timeA - timeB;
      });
  }, [submissions, activeTab, searchQuery, sortFilter]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  const paginatedItems = useMemo(() => {
    return filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const onApproveClick = (id) => {
    handleApprove(id)
    setSelectedReview(null)
    setSelectedChapter(null)
  }

  const onOpenReject = (item) => {
    setSelectedReject(item)
    setRejectionReason('')
  }

  const handleJumpToPageFromReport = (item, comment) => {
    setSelectedReject(null);
    handleOpenReviewModal(item);
    
    if (comment.targetKey && comment.targetKey.startsWith('page-')) {
      const pNum = parseInt(comment.targetKey.replace('page-', ''), 10);
      if (!isNaN(pNum) && pNum > 0) {
        const targetIndex = pNum - 1;
        setPageIndex(targetIndex);
        if (readerLayout === 'vertical') {
          scrollToPageElement(pNum);
        }
      }
    }
  }

  const onConfirmRejectClick = () => {
    if (!selectedReject) return
    const comments = docCommentsMap[selectedReject.id] || selectedReject.notes || [];
    const userOverallNote = rejectionReason.trim();
    let finalPayload = '';

    if (userOverallNote && comments.length > 0) {
      const formattedComments = comments.map((c, i) => `${i + 1}. [${c.targetLabel}]: ${c.text}`).join('\n');
      finalPayload = `${userOverallNote}\n\n--- DETAILED INSPECTION FEEDBACK REPORT (${comments.length} PINNED ITEMS) ---\n${formattedComments}`;
    } else if (comments.length > 0) {
      const formattedComments = comments.map((c, i) => `${i + 1}. [${c.targetLabel}]: ${c.text}`).join('\n');
      finalPayload = `--- DETAILED INSPECTION FEEDBACK REPORT (${comments.length} PINNED ITEMS) ---\n${formattedComments}`;
    } else {
      finalPayload = userOverallNote;
    }

    handleConfirmReject(selectedReject.id, finalPayload)
    
    setSelectedReview(null)
    setSelectedChapter(null)
    setSelectedReject(null)
    setRejectionReason('')
  }

  const handleAddDocComment = (submissionId, targetType, targetKey, targetLabel, text, coords = null) => {
    if (!text || !text.trim()) return
    const newComment = {
      id: `doc-comment-${Date.now()}`,
      submissionId,
      targetType,
      targetKey,
      targetLabel,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      author: 'Moderator',
      xPercentage: coords?.x !== undefined ? coords.x : null,
      yPercentage: coords?.y !== undefined ? coords.y : null
    }

    setDocCommentsMap(prev => ({
      ...prev,
      [submissionId]: [...(prev[submissionId] || []), newComment]
    }))
    setActivePinTarget(null)
    setPinCommentText('')
    setFieldCommentModalTarget(null)
    setShowCommentsSidebar(true)
  }

  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  const handleStartEditDocComment = (comment) => {
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.text)
  }

  const handleSaveEditDocComment = (submissionId, commentId) => {
    if (!editingCommentText.trim()) return
    setDocCommentsMap(prev => ({
      ...prev,
      [submissionId]: (prev[submissionId] || []).map(c => 
        c.id === commentId ? { ...c, text: editingCommentText.trim(), editedAt: new Date().toISOString() } : c
      )
    }))
    setEditingCommentId(null)
    setEditingCommentText('')
  }

  const scrollToPageElement = (pNum) => {
    setTimeout(() => {
      const targetEl = document.getElementById(`page-container-${pNum}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  const handleDeleteDocComment = (submissionId, commentId) => {
    setDocCommentsMap(prev => ({
      ...prev,
      [submissionId]: (prev[submissionId] || []).filter(c => c.id !== commentId)
    }))
  }

  // Normalize a chapter object from the backend: map 'images' to 'pages'
  const normalizeChapter = (chap, idx) => {
    const pages = Array.isArray(chap.pages) && chap.pages.length > 0
      ? chap.pages
      : Array.isArray(chap.images) && chap.images.length > 0
        ? chap.images
        : [];
    return {
      ...chap,
      id: chap.id || `chap-${idx}-${Date.now()}`,
      number: chap.chapterNumber || chap.number || idx + 1,
      title: chap.title || chap.chapter || `Chapter ${chap.chapterNumber || chap.number || idx + 1}`,
      pages,
      content: chap.content || null,
      words: chap.words || chap.wordCount || null,
      timestamp: chap.createdAt || chap.timestamp || Date.now()
    };
  };

  // Extract real DB submitted chapter list for a raw comic submission
  const getSubmissionChapters = (item) => {
    if (!item) return [];
    
    if (Array.isArray(item.chapters) && item.chapters.length > 0) {
      return item.chapters.map((c, i) => normalizeChapter(c, i));
    }

    const pages = Array.isArray(item.pages) && item.pages.length > 0
      ? item.pages
      : Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : [];

    if (item.chapter || item.content || pages.length > 0) {
      return [normalizeChapter({
        id: item.id || `chap-${Date.now()}`,
        chapterNumber: item.chapterNumber || 1,
        title: item.chapter ? (item.chapter.toLowerCase().startsWith('chapter') ? item.chapter : `Chapter ${item.chapter}`) : 'Chapter 1',
        pages,
        content: item.content || null,
        words: item.words || null,
        timestamp: item.timestamp || Date.now()
      }, 0)];
    }

    return [];
  };

  // Accelerated Backend Chapter Fetching with In-Memory Cache
  const fetchChaptersFromBackend = async (comicId) => {
    if (!comicId) return [];
    if (chapterCacheRef.current.has(comicId)) {
      return chapterCacheRef.current.get(comicId);
    }

    try {
      let chaptersData = null;
      try {
        chaptersData = await getChaptersByComicIdApi(comicId, {}, true);
      } catch {
        chaptersData = await getAuthorComicChaptersApi(comicId);
      }
      const list = chaptersData?.data || chaptersData || [];
      if (!Array.isArray(list) || list.length === 0) return [];

      // Parallel batch fetching for maximum throughput
      const detailed = await Promise.allSettled(
        list.map(ch => getChapterDetailApi(ch.id))
      );

      const result = list.map((ch, idx) => {
        const detailResult = detailed[idx];
        const detail = detailResult?.status === 'fulfilled'
          ? (detailResult.value?.data || detailResult.value || {})
          : {};
        return normalizeChapter({ ...ch, ...detail }, idx);
      });

      chapterCacheRef.current.set(comicId, result);
      return result;
    } catch (err) {
      console.warn('Failed to fetch chapters from backend:', err?.message);
      return [];
    }
  };

  const handleOpenReviewModal = async (item) => {
    setSelectedReview(item);
    setPageIndex(0);
    setFetchingChapters(true);

    // First try to use inline chapter data
    let chaps = getSubmissionChapters(item);

    // If no pages found and we have a comicId, fetch from backend
    const hasPages = chaps.some(c => Array.isArray(c.pages) && c.pages.length > 0);
    if (!hasPages && item.comicId) {
      const backendChaps = await fetchChaptersFromBackend(item.comicId);
      if (backendChaps.length > 0) {
        chaps = backendChaps;
        // Cache the fetched chapters back into the item for future access
        item.chapters = chaps;
      }
    }

    const firstChap = chaps[0] || null;
    setSelectedChapter(firstChap);
    setPreviewTab(firstChap && Array.isArray(firstChap.pages) && firstChap.pages.length > 0 ? 'reader' : 'chapters');
    setFetchingChapters(false);
  };

  const handleSelectChapterItem = (chap) => {
    setSelectedChapter(chap);
    setPageIndex(0);
    setPreviewTab('reader');
  };

  // Accelerated Image Preloading Strategy
  useEffect(() => {
    if (!selectedReview || previewTab !== 'reader') return
    const chaptersList = getSubmissionChapters(selectedReview)
    const activeChap = selectedChapter || chaptersList[0] || null
    const pages = (activeChap && Array.isArray(activeChap.pages)) ? activeChap.pages : []

    if (pages.length > 0) {
      const preloadIndices = [pageIndex, pageIndex + 1, pageIndex - 1, pageIndex + 2]
      preloadIndices.forEach(idx => {
        if (idx >= 0 && idx < pages.length && pages[idx]) {
          const rawUrl = typeof pages[idx] === 'string' ? pages[idx] : (pages[idx].imageUrl || pages[idx].url || pages[idx].pageUrl)
          if (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) {
            const img = new Image()
            img.src = rawUrl
          }
        }
      })
    }
  }, [selectedReview, selectedChapter, previewTab, pageIndex])

  // Instant Keyboard Navigation for Reader Mode
  useEffect(() => {
    if (!selectedReview || previewTab !== 'reader') return
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return

      const chaptersList = getSubmissionChapters(selectedReview)
      const activeChap = selectedChapter || chaptersList[0] || null
      const pages = (activeChap && Array.isArray(activeChap.pages)) ? activeChap.pages : []

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (pageIndex < pages.length - 1) {
          setPageIndex(prev => prev + 1)
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (pageIndex > 0) {
          setPageIndex(prev => prev - 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedReview, selectedChapter, previewTab, pageIndex])

  return (
    <div className="fade-in">
      <div className="moderator-page-header">
        <h1>Raw Content Review Queue</h1>
        <p>Review and verify author submission inputs (Title, Language, Min Age, Description, Genres, Cover & Chapters), inspect raw chapter manuscripts, and approve catalog publication.</p>
      </div>

      {/* Dynamic Statistics Ribbon */}
      {(() => {
        const total = submissions.length;
        const pending = tabCounts.pending;
        const approved = tabCounts.approved;
        const rejected = tabCounts.rejected;
        const rate = (approved + rejected) > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0;

        return (
          <div className="moderator-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', margin: '20px 0 24px' }}>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <span style={{ fontSize: '13px', color: 'var(--mod-text-secondary)', display: 'block', marginBottom: '6px' }}>Total Submissions</span>
              <strong style={{ fontSize: '24px', color: '#ffffff' }}>{total}</strong>
            </div>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.12)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(168, 85, 247, 0.8)', display: 'block', marginBottom: '6px' }}>Pending Review</span>
              <strong style={{ fontSize: '24px', color: '#c084fc' }}>{pending}</strong>
            </div>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(16, 185, 129, 0.8)', display: 'block', marginBottom: '6px' }}>Approved Items</span>
              <strong style={{ fontSize: '24px', color: '#34d399' }}>{approved}</strong>
            </div>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.12)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(239, 68, 68, 0.8)', display: 'block', marginBottom: '6px' }}>Rejected Items</span>
              <strong style={{ fontSize: '24px', color: '#f87171' }}>{rejected}</strong>
            </div>
            <div className="mod-overview-card" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.12)' }}>
              <span style={{ fontSize: '13px', color: 'rgba(59, 130, 246, 0.8)', display: 'block', marginBottom: '6px' }}>Approval Rate</span>
              <strong style={{ fontSize: '24px', color: '#60a5fa' }}>{rate}%</strong>
            </div>
          </div>
        );
      })()}

      {/* Main Status Tabs */}
      <div className="moderator-tabs">
        <button 
          className={`moderator-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Review
          <span className="moderator-tab-btn-badge">{tabCounts.pending}</span>
        </button>
        <button 
          className={`moderator-tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
          onClick={() => setActiveTab('approved')}
        >
          Approved
          <span className="moderator-tab-btn-badge">{tabCounts.approved}</span>
        </button>
        <button 
          className={`moderator-tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          Rejected
          <span className="moderator-tab-btn-badge">{tabCounts.rejected}</span>
        </button>
      </div>

      {/* Filter and Sort bar */}
      <div className="moderator-filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', flexWrap: 'wrap', marginBottom: '20px' }}>
        <input 
          type="text"
          className="moderator-select"
          placeholder="Search raw comics by title, author name, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '240px', outline: 'none' }}
        />

        <select 
          className="moderator-select"
          value={sortFilter}
          onChange={(e) => setSortFilter(e.target.value)}
        >
          <option>Newest</option>
          <option>Oldest</option>
        </select>
      </div>

      {/* Submissions List Grid */}
      <div className="moderator-cards-list">
        {filteredItems.length === 0 ? (
          <div className="moderator-empty-state">
            <h3>No submissions found</h3>
            <p>There are no raw comic submissions matching your active filters.</p>
          </div>
        ) : (
          paginatedItems.map(item => (
            <div className="submission-card" key={item.id}>
              <div className="submission-cover-placeholder">
                {item.cover && (item.cover.startsWith('http') || item.cover.includes('/')) ? (
                  <img src={item.cover} alt={item.title} className="submission-cover-img" />
                ) : (
                  item.cover || '📚'
                )}
              </div>

              <div className="submission-info">
                <h3 className="submission-title">{item.title}</h3>
                <p className="submission-meta">
                  <span><strong>Author:</strong> {formatSubmitterName(item.submittedBy).replace('Author: ', '')}</span>
                  {item.language && <span> · <strong>Lang:</strong> {item.language}</span>}
                  {item.minAge && <span> · <strong>Age:</strong> {item.minAge}</span>}
                </p>
                <div className="submission-extra">
                  <span className="submission-extra-item">⏱️ {formatTimeAgo(item.timestamp)}</span>
                  <span className="submission-extra-item">📄 {item.words || 'Raw Draft'}</span>
                </div>
              </div>

              <div className="submission-right-side">
                <div className="submission-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <ModernButton 
                    variant={2} 
                    label="👁️ Review Content" 
                    className="btn-review"
                    onClick={() => handleOpenReviewModal(item)} 
                  />

                  {item.status === 'pending' && (
                    <>
                      <ModernButton 
                        variant={2} 
                        label="✓ Approve" 
                        className="btn-approve"
                        onClick={() => onApproveClick(item.id)} 
                      />

                      <ModernButton 
                        variant={2} 
                        label="✗ Reject" 
                        className="btn-reject"
                        onClick={() => onOpenReject(item)} 
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center' }}>
          <ModernPagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
            variant="pills"
          />
        </div>
      )}

      {/* ── FULL-SCREEN WIDE CHAPTER CONTENT & MANUSCRIPT READER OVERLAY ────────── */}
      {selectedReview && createPortal(
        <div className={`mod-inspector-overlay fade-in ${theme === 'light' ? 'light-theme' : 'dark-theme'}`}>
          {/* Topbar Navigation & Review Actions */}
          {(() => {
            const chaptersList = getSubmissionChapters(selectedReview);
            const activeChap = selectedChapter || chaptersList[0] || null;
            const pages = (activeChap && Array.isArray(activeChap.pages)) ? activeChap.pages : [];
            const activeComments = docCommentsMap[selectedReview.id] || [];

            return (
              <div className="mod-inspector-topbar">
                {/* Left: Truncated Title & Subtitle Group */}
                <div className="mod-inspector-title-group" style={{ maxWidth: '340px' }}>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <h3 className="mod-inspector-title" title={`${selectedReview.title}${selectedChapter ? ` — ${selectedChapter.title}` : ''}`}>
                      📖 {selectedReview.title} {selectedChapter ? `— ${selectedChapter.title}` : ''}
                    </h3>
                    <div className="mod-inspector-subtitle">
                      {formatSubmitterName(selectedReview.submittedBy)} · {formatTimeAgo(selectedReview.timestamp)}
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
                    className={`mod-mode-tab ${previewTab === 'chapters' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('chapters')}
                  >
                    📋 Chapters ({chaptersList.length})
                  </button>
                  <button
                    type="button"
                    className={`mod-mode-tab ${previewTab === 'synopsis' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('synopsis')}
                  >
                    ℹ️ Details & Inputs
                  </button>
                </div>

                {/* Right: Toggle Comments Drawer, Review Actions & Close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <button
                    type="button"
                    className={`mod-mode-tab ${showCommentsSidebar ? 'active' : ''}`}
                    onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
                    title="Toggle Google Docs Style Feedback Comments"
                  >
                    💬 Feedback Pins ({activeComments.length})
                  </button>

                  {selectedReview.status === 'pending' && (
                    <>
                      <ModernButton 
                        variant={2} 
                        label="✓ Approve" 
                        className="btn-approve"
                        onClick={() => onApproveClick(selectedReview.id)} 
                      />

                      <ModernButton 
                        variant={2} 
                        label="✗ Reject" 
                        className="btn-reject"
                        onClick={() => onOpenReject(selectedReview)} 
                      />
                    </>
                  )}
                  <button 
                    className="mod-inspector-close-btn" 
                    onClick={() => { setSelectedReview(null); setSelectedChapter(null); }}
                    title="Close Viewer"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Main Workspace Body Container with Right Comment Sidebar */}
          <div className="mod-inspector-body">
            {/* Left Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
              {(() => {
                const chaptersList = getSubmissionChapters(selectedReview);
                const activeChap = selectedChapter || chaptersList[0] || null;
                const pages = (activeChap && Array.isArray(activeChap.pages)) ? activeChap.pages : [];

                /* MODE 1: RAW IMAGE READER VIEW */
                if (previewTab === 'reader') {
                  if (pages.length === 0) {
                    return (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
                        <h3 className="mod-inspector-title" style={{ margin: '0 0 8px' }}>No Manuscript Page Images Attached</h3>
                        <p className="mod-inspector-subtitle" style={{ margin: '0 0 20px', fontSize: '14px', maxWidth: '480px', textAlign: 'center' }}>
                          This submission does not contain uploaded raw page images for {activeChap ? activeChap.title : 'this chapter'}. You can inspect script text or chapter list tabs.
                        </p>
                        {chaptersList.length > 1 && (
                          <button
                            type="button"
                            className="mod-mode-tab active"
                            onClick={() => setPreviewTab('chapters')}
                          >
                            📋 View Chapter List ({chaptersList.length} Chapters)
                          </button>
                        )}
                      </div>
                    );
                  }

                  const currentPageUrl = pages[pageIndex] || pages[0];
                  const pageComments = (docCommentsMap[selectedReview.id] || [])
                    .filter(c => c.targetKey === `page-${pageIndex + 1}`);

                  return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
                      {/* Top sub-header for active chapter label & Pin Instruction */}
                      <div className="mod-inspector-subbanner">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="mod-pane-title--raw" style={{ fontWeight: '700' }}>
                            🌐 Original Raw Manuscript — {activeChap ? activeChap.title : 'Chapter Page'} (Page {pageIndex + 1} of {pages.length})
                          </span>
                          <span className="mod-inspector-subtitle" style={{ fontSize: '12px' }}>
                            💡 Click anywhere on image to drop a Google Docs style comment pin!
                          </span>
                        </div>

                        {chaptersList.length > 1 && (
                          <div className="mod-inspect-select-container">
                            <span className="mod-inspect-select-label">Switch Chapter:</span>
                            <select
                              className="mod-inspect-select"
                              value={activeChap?.id}
                              onChange={(e) => {
                                const found = chaptersList.find(c => c.id === e.target.value);
                                if (found) handleSelectChapterItem(found);
                              }}
                            >
                              {chaptersList.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Central Wide Reader Container with Click Pinning */}
                      <div
                        className="mod-inspector-reader-area"
                        onClick={() => setActivePinTarget(null)}
                        onScroll={handleReaderAreaScroll}
                        onMouseMove={handleReaderAreaMouseMove}
                        style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: readerLayout === 'single' ? 'center' : 'flex-start', padding: '24px 24px 90px 24px' }}
                      >
                        {readerLayout === 'single' ? (
                          <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', textAlign: 'center' }}>
                            <img
                              src={currentPageUrl}
                              alt={`Page ${pageIndex + 1}`}
                              decoding="async"
                              loading="eager"
                              onClick={(e) => {
                                if (!isPinLocationMode) {
                                  // Mode A: Normal Page View Mode — Select Page without modal popup!
                                  return;
                                }
                                // Mode B: Pin Location Mode — Drop Coordinate Pin!
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                setFieldCommentModalTarget({
                                  targetType: 'point',
                                  targetKey: `page-${pageIndex + 1}`,
                                  targetLabel: `Page ${pageIndex + 1}`,
                                  coords: { x, y }
                                });
                              }}
                              style={{
                                maxHeight: '75vh',
                                maxWidth: '100%',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                cursor: isPinLocationMode ? 'crosshair' : 'pointer'
                              }}
                              title={isPinLocationMode ? "Click to drop a location pin comment on this image" : `Page ${pageIndex + 1}`}
                            />

                            {/* Render Pinned Comment Markers over Image */}
                            {pageComments.map((c) => {
                              const globalPinIndex = (docCommentsMap[selectedReview.id] || []).findIndex(item => item.id === c.id) + 1;

                              return (
                                c.xPercentage !== null && (
                                  <div
                                    key={c.id}
                                    className={`mod-doc-comment-pin ${activePinTarget === c.id ? 'active' : ''}`}
                                    style={{ left: `${c.xPercentage}%`, top: `${c.yPercentage}%` }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowCommentsSidebar(true);
                                      setActivePinTarget(prev => prev === c.id ? null : c.id);
                                      const el = document.getElementById(`doc-comment-card-${c.id}`);
                                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                    }}
                                  >
                                    📌 {globalPinIndex > 0 ? globalPinIndex : 1}

                                    {/* Glassmorphic Floating Tooltip Card */}
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
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', width: '100%', maxWidth: '850px' }}>
                            {pages.map((imgUrl, pIdx) => {
                              const pNum = pIdx + 1;
                              const pComments = (docCommentsMap[selectedReview.id] || [])
                                .filter(c => c.targetKey === `page-${pNum}`);

                              return (
                                <div key={pIdx} id={`page-container-${pNum}`} style={{ width: '100%', textAlign: 'center', position: 'relative' }}>
                                  <img
                                    src={imgUrl}
                                    alt={`Page ${pNum}`}
                                    decoding="async"
                                    loading="lazy"
                                    onClick={(e) => {
                                      if (selectedReview.status !== 'pending') return;
                                      
                                      setPageIndex(pIdx);

                                      if (!isPinLocationMode) {
                                        // Mode A: Normal Page View Mode — Select Page & Smooth Scroll without modal popup!
                                        scrollToPageElement(pNum);
                                        return;
                                      }

                                      // Mode B: Pin Location Mode — Drop Coordinate Pin!
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                      const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                      setFieldCommentModalTarget({
                                        targetType: 'point',
                                        targetKey: `page-${pNum}`,
                                        targetLabel: `Page ${pNum}`,
                                        coords: { x, y }
                                      });
                                    }}
                                    style={{
                                      width: '100%',
                                      maxHeight: '90vh',
                                      objectFit: 'contain',
                                      borderRadius: '8px',
                                      boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
                                      border: '1px solid rgba(148, 163, 184, 0.2)',
                                      cursor: selectedReview.status === 'pending' ? (isPinLocationMode ? 'crosshair' : 'pointer') : 'default'
                                    }}
                                    title={selectedReview.status === 'pending' ? (isPinLocationMode ? 'Click to drop a location pin comment on this image' : `Click to select Page ${pNum}`) : `Page ${pNum}`}
                                  />

                                  {/* Render Pinned Comment Markers over Image in Vertical Scroll Mode */}
                                  {pComments.map((c) => {
                                    const globalPinIndex = (docCommentsMap[selectedReview.id] || []).findIndex(item => item.id === c.id) + 1;

                                    return (
                                      c.xPercentage !== null && (
                                        <div
                                          key={c.id}
                                          className={`mod-doc-comment-pin ${activePinTarget === c.id ? 'active' : ''}`}
                                          style={{ left: `${c.xPercentage}%`, top: `${c.yPercentage}%` }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowCommentsSidebar(true);
                                            setActivePinTarget(prev => prev === c.id ? null : c.id);
                                            const el = document.getElementById(`doc-comment-card-${c.id}`);
                                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                          }}
                                        >
                                          📌 {globalPinIndex > 0 ? globalPinIndex : 1}

                                          {/* Glassmorphic Floating Tooltip Card */}
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
                                    );
                                  })}

                                  <span className="mod-inspector-subtitle" style={{ display: 'inline-block', marginTop: '6px', fontSize: '11.5px' }}>
                                    Page {pNum} of {pages.length}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Bottom Reader Toolbar Controls */}
                      <div className={`mod-inspector-controls ${!isFooterVisible ? 'is-hidden' : ''}`}>
                        <div className="mod-page-nav-group">
                          <button
                            type="button"
                            className="mod-nav-arrow"
                            onClick={() => {
                              const targetP = Math.max(0, pageIndex - 1);
                              setPageIndex(targetP);
                              if (readerLayout === 'vertical') scrollToPageElement(targetP + 1);
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
                                const targetP = Number(e.target.value);
                                setPageIndex(targetP);
                                if (readerLayout === 'vertical') scrollToPageElement(targetP + 1);
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
                              const targetP = Math.min(pages.length - 1, pageIndex + 1);
                              setPageIndex(targetP);
                              if (readerLayout === 'vertical') scrollToPageElement(targetP + 1);
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

                          <ModernButton 
                            variant={2} 
                            label="Close Viewer" 
                            onClick={() => { setSelectedReview(null); setSelectedChapter(null); }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }


                /* MODE 3: SUBMITTED CHAPTER LIST TABLE */
                if (previewTab === 'chapters') {
                  return (
                    <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h4 className="mod-inspector-title" style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>
                            📖 Submitted Chapters ({chaptersList.length} Chapters)
                          </h4>
                          <span className="mod-inspector-subtitle" style={{ fontSize: '13px' }}>Click "👁️ View Chapter" to switch reader focus</span>
                        </div>

                        {chaptersList.length === 0 ? (
                          <div className="mod-inspector-card" style={{ padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
                            <p className="mod-inspector-title" style={{ margin: '0 0 6px', fontWeight: '700', fontSize: '16px' }}>Raw Comic Profile Entry</p>
                            <p className="mod-inspector-subtitle" style={{ margin: 0 }}>This is an initial raw comic catalog profile submission. No chapters have been uploaded yet.</p>
                          </div>
                        ) : (
                          <div className="mod-inspector-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                            <table className="mod-chapters-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                              <thead>
                                <tr>
                                  <th style={{ padding: '14px 18px', color: theme === 'light' ? '#334155' : '#cbd5e1', fontWeight: '800' }}>Chapter #</th>
                                  <th style={{ padding: '14px 18px', color: theme === 'light' ? '#334155' : '#cbd5e1', fontWeight: '800' }}>Manuscript Title</th>
                                  <th style={{ padding: '14px 18px', color: theme === 'light' ? '#334155' : '#cbd5e1', fontWeight: '800' }}>Pages / Length</th>
                                  <th style={{ padding: '14px 18px', color: theme === 'light' ? '#334155' : '#cbd5e1', fontWeight: '800' }}>Submitted Time</th>
                                  <th style={{ padding: '14px 18px', textAlign: 'right', color: theme === 'light' ? '#334155' : '#cbd5e1', fontWeight: '800' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {chaptersList.map((chap, idx) => {
                                  const isSelected = activeChap && activeChap.id === chap.id;
                                  const rowTextColor = isSelected
                                    ? (theme === 'light' ? '#581c87' : '#e9d5ff')
                                    : (theme === 'light' ? '#0f172a' : '#f1f5f9');
                                  
                                  return (
                                    <tr 
                                      key={chap.id || idx} 
                                      className={isSelected ? 'selected' : ''}
                                      style={{
                                        background: isSelected
                                          ? (theme === 'light' ? '#f3e8ff' : 'rgba(168,85,247,0.18)')
                                          : 'transparent'
                                      }}
                                    >
                                      <td style={{ padding: '14px 18px', fontWeight: '800', color: rowTextColor }}>
                                        Chapter {chap.number || idx + 1}
                                      </td>
                                      <td style={{ padding: '14px 18px', fontWeight: '700', color: rowTextColor }}>
                                        {chap.title}
                                      </td>
                                      <td style={{ padding: '14px 18px', fontWeight: '600', color: rowTextColor }}>
                                        📄 {Array.isArray(chap.pages) ? chap.pages.length : (Array.isArray(chap.images) ? chap.images.length : 0)} Pages {chap.words ? `· ${chap.words}` : ''}
                                      </td>
                                      <td style={{ padding: '14px 18px', fontWeight: '600', color: rowTextColor }}>
                                        ⏱️ {formatTimeAgo(chap.timestamp || selectedReview.timestamp)}
                                      </td>
                                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                        <ModernButton
                                          variant={2}
                                          label={isSelected ? '✓ Inspecting' : '👁️ View Chapter'}
                                          onClick={() => handleSelectChapterItem(chap)}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                /* MODE 4: AUTHOR INPUT DATA REVIEW WORKBENCH (DEFAULT/SYNOPSIS) */
                return (
                  <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
                    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      
                      {/* Author Input Fields Review Card */}
                      <div className="mod-inspector-card" style={{
                        borderRadius: '16px',
                        padding: '24px'
                      }}>
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '24px' }}>
                          {/* Cover Image Input Preview */}
                          <div style={{
                            width: '150px',
                            height: '210px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                            border: '1px solid rgba(148,163,184,0.2)',
                            flexShrink: 0
                          }}>
                            {selectedReview.cover && (selectedReview.cover.startsWith('http') || selectedReview.cover.includes('/')) ? (
                              <img src={selectedReview.cover} alt={selectedReview.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: '#7c3aed' }}>
                                {selectedReview.cover || '📚'}
                              </div>
                            )}
                          </div>

                          {/* Core Input Fields */}
                          <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                              <span className="mod-pane-title--raw" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
                                Comic Title *
                              </span>
                              <h2 className="mod-inspector-title" style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>
                                {selectedReview.title}
                              </h2>
                            </div>

                            {/* Author Input Fields Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                              <div className="mod-inspector-card" style={{ padding: '10px 12px', borderRadius: '8px' }}>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block' }}>Original Language *</span>
                                <strong style={{ fontSize: '13.5px', display: 'block', marginTop: '4px' }}>{selectedReview.language || 'Japanese'}</strong>
                              </div>

                              <div className="mod-inspector-card" style={{ padding: '10px 12px', borderRadius: '8px' }}>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block' }}>Minimum Age</span>
                                <strong style={{ fontSize: '13.5px', display: 'block', marginTop: '4px' }}>{selectedReview.minAge || selectedReview.ageRating || '13+'}</strong>
                              </div>

                              <div className="mod-inspector-card" style={{ padding: '10px 12px', borderRadius: '8px' }}>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block' }}>Publication Status</span>
                                <strong style={{ fontSize: '13.5px', color: '#10b981', display: 'block', marginTop: '4px' }}>{selectedReview.publicationStatus || selectedReview.comicStatus || 'Ongoing'}</strong>
                              </div>

                              <div className="mod-inspector-card" style={{ padding: '10px 12px', borderRadius: '8px' }}>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block' }}>Author Account</span>
                                <strong style={{ fontSize: '13.5px', display: 'block', marginTop: '4px' }}>{formatSubmitterName(selectedReview.submittedBy).replace('Author: ', '')}</strong>
                              </div>
                            </div>

                            {/* Genres Input Field Display */}
                            {selectedReview.genres && selectedReview.genres.length > 0 && (
                              <div>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Genres</span>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                  {selectedReview.genres.map((genre, idx) => (
                                    <span key={idx} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: 'rgba(124,58,237,0.15)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)' }}>
                                      {genre}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Description Field Review */}
                        <div style={{ borderTop: '1px solid rgba(148,163,184,0.15)', paddingTop: '16px', marginTop: '12px' }}>
                          <span className="mod-pane-title--raw" style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>
                            Description
                          </span>
                          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {selectedReview.description || selectedReview.synopsis || 'No description has been added yet.'}
                          </p>
                        </div>
                      </div>

                      {/* Rejection Feedback if Rejected */}
                      {selectedReview.status === 'rejected' && (
                        <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderLeft: '4px solid #ef4444' }}>
                          <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                            Rejection Feedback:
                          </strong>
                          <span style={{ fontStyle: 'italic', fontSize: '13.5px' }}>
                            "{selectedReview.rejectionReason || 'No feedback recorded.'}"
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right Collapsible Google Docs Style Feedback Comments Sidebar Drawer */}
            {showCommentsSidebar && (
              <div className="mod-doc-comments-sidebar">
                {/* Sidebar Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(148,163,184,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 className="mod-inspector-title" style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>
                      💬 Contextual Feedback ({ (docCommentsMap[selectedReview.id] || []).length })
                    </h4>
                    <span className="mod-inspector-subtitle" style={{ fontSize: '11.5px' }}>
                      Google Docs style pinned comments
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

                {/* Sub-tabs for filtering sidebar comments */}
                {(() => {
                  const allList = docCommentsMap[selectedReview.id] || [];
                  const pageNotesList = allList.filter(c => c.targetType === 'page' || (!c.coords && c.targetType !== 'field'));
                  const pointPinsList = allList.filter(c => c.targetType === 'point' || c.xPercentage !== null);

                  const displayList = allList.filter(c => {
                    if (sidebarCommentTab === 'page') return c.targetType === 'page' || (!c.coords && c.targetType !== 'field');
                    if (sidebarCommentTab === 'point') return c.targetType === 'point' || c.xPercentage !== null;
                    return true;
                  });

                  return (
                    <>
                      <div className="mod-doc-comments-sidebar-tabs">
                        <button
                          type="button"
                          className={`mod-sidebar-tab-btn ${sidebarCommentTab === 'all' ? 'active-all' : ''}`}
                          onClick={() => setSidebarCommentTab('all')}
                        >
                          All ({allList.length})
                        </button>
                        <button
                          type="button"
                          className={`mod-sidebar-tab-btn ${sidebarCommentTab === 'page' ? 'active-notes' : ''}`}
                          onClick={() => {
                            setSidebarCommentTab('page');
                            setIsPinLocationMode(false);
                          }}
                        >
                          📄 Notes ({pageNotesList.length})
                        </button>
                        <button
                          type="button"
                          className={`mod-sidebar-tab-btn ${sidebarCommentTab === 'point' ? 'active-pins' : ''}`}
                          onClick={() => {
                            setSidebarCommentTab('point');
                            setIsPinLocationMode(true);
                          }}
                        >
                          📍 Pins ({pointPinsList.length})
                        </button>
                      </div>

                      {/* Sidebar Body with Comment List */}
                      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Quick Add Feedback Form inside Sidebar — Only for Pending Submissions */}
                        {selectedReview.status === 'pending' ? (
                          sidebarCommentTab === 'point' || isPinLocationMode ? (
                            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#c084fc', letterSpacing: '0.5px' }}>
                                  📍 Location Pin Drop Mode
                                </span>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', color: '#a855f7', fontWeight: '700' }}>
                                  Target: Page {pageIndex + 1}
                                </span>
                              </div>

                              <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.2)' }}>
                                <p style={{ margin: 0, fontSize: '12.5px', lineHeight: '1.4', color: theme === 'light' ? '#334155' : '#e2e8f0' }}>
                                  👇 <strong>Click anywhere directly on Page {pageIndex + 1} image panel</strong> to drop an exact coordinate pin marker!
                                </p>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                                <span style={{ fontSize: '11.5px', color: '#a855f7', fontWeight: '700' }}>
                                  📍 Pin Mode ACTIVE
                                </span>
                                <button
                                  type="button"
                                  style={{
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(148,163,184,0.3)',
                                    background: 'transparent',
                                    color: theme === 'light' ? '#475569' : '#cbd5e1',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    setIsPinLocationMode(false);
                                    setSidebarCommentTab('page');
                                  }}
                                >
                                  Switch to 📄 Page Note
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ padding: '14px', borderRadius: '12px', background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.15)', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#0ea5e9', letterSpacing: '0.5px' }}>
                                  ➕ Quick Add Page Note
                                </span>
                                <span className="mod-inspector-subtitle" style={{ fontSize: '11px', fontWeight: '600' }}>
                                  Target: Page {pageIndex + 1}
                                </span>
                              </div>

                              <textarea
                                className="rejection-reason-textarea"
                                placeholder={`Type general page note for Page ${pageIndex + 1}...`}
                                value={pinCommentText}
                                onChange={(e) => setPinCommentText(e.target.value)}
                                style={{ minHeight: '70px', padding: '10px 12px', fontSize: '12.5px', borderRadius: '8px', boxSizing: 'border-box', width: '100%' }}
                              />

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                <button
                                  type="button"
                                  style={{
                                    width: '100%',
                                    padding: '8px 14px',
                                    fontSize: '12.5px',
                                    fontWeight: '700',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: pinCommentText.trim() ? 'pointer' : 'not-allowed',
                                    background: pinCommentText.trim() ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : 'rgba(148,163,184,0.2)',
                                    color: pinCommentText.trim() ? '#ffffff' : 'rgba(255,255,255,0.4)',
                                    boxShadow: pinCommentText.trim() ? '0 4px 12px rgba(14,165,233,0.3)' : 'none',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                  }}
                                  onClick={() => {
                                    if (!pinCommentText.trim()) return;
                                    handleAddDocComment(
                                      selectedReview.id,
                                      'page',
                                      `page-${pageIndex + 1}`,
                                      `Page ${pageIndex + 1}`,
                                      pinCommentText
                                    );
                                    setPinCommentText('');
                                  }}
                                  disabled={!pinCommentText.trim()}
                                >
                                  📄 Add Page Note
                                </button>
                              </div>
                            </div>
                          )
                        ) : (
                          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', fontSize: '12px', textAlign: 'center', lineHeight: '1.5' }}>
                            🔒 Submission is <strong style={{ color: '#7c3aed' }}>{selectedReview.status.toUpperCase()}</strong> — Comments & Inspection Notes are frozen in read-only mode.
                          </div>
                        )}

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
                              id={`doc-comment-card-${c.id}`}
                              className={`mod-doc-comment-card ${activePinTarget === c.id ? 'active-highlight' : ''}`}
                              onClick={() => {
                                setActivePinTarget(c.id);
                                if (c.targetKey.startsWith('page-')) {
                                  const pNum = parseInt(c.targetKey.replace('page-', ''), 10);
                                  if (!isNaN(pNum)) {
                                    setPageIndex(pNum - 1);
                                    setPreviewTab('reader');
                                    if (readerLayout === 'vertical') {
                                      scrollToPageElement(pNum);
                                    }
                                  }
                                }
                              }}
                              style={{
                                cursor: c.targetKey.startsWith('page-') ? 'pointer' : 'default',
                                borderColor: activePinTarget === c.id ? '#7c3aed' : undefined,
                                boxShadow: activePinTarget === c.id ? '0 0 16px rgba(124, 58, 237, 0.4)' : undefined
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {renderCommentBadge(c, allList.findIndex(item => item.id === c.id) + 1)}

                                {/* Edit & Delete Action Buttons for Pending Submissions */}
                                {selectedReview.status === 'pending' && (
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditDocComment(c);
                                      }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', opacity: 0.7 }}
                                      title="Edit Comment"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDocComment(selectedReview.id, c.id);
                                      }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', opacity: 0.7 }}
                                      title="Delete Comment"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Inline Comment Editing View */}
                              {editingCommentId === c.id ? (
                                <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                                  <textarea
                                    className="rejection-reason-textarea"
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    style={{ minHeight: '60px', padding: '8px 10px', fontSize: '12.5px' }}
                                    autoFocus
                                  />
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      className="mod-mode-tab"
                                      style={{ padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer' }}
                                      onClick={() => setEditingCommentId(null)}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className="mod-mode-tab active"
                                      style={{ padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer' }}
                                      onClick={() => handleSaveEditDocComment(selectedReview.id, c.id)}
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                                  {c.text}
                                </p>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginTop: '4px' }}>
                                <span style={{ fontWeight: '700', color: '#7c3aed' }}>🛡️ {c.author || 'Moderator'}</span>
                                <span className="mod-inspector-subtitle">{formatTimeAgo(c.createdAt)} {c.editedAt ? '(edited)' : ''}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: PIN COMMENT MODAL (FOR FIELDS & PAGES) ───────────────── */}
      {fieldCommentModalTarget && selectedReview && createPortal(
        <div className="mod-modal-overlay mod-inspector-high-priority">
          <div className="mod-modal-card">
            <div className="mod-modal-header">
              <h3>📌 Add Pinned Feedback Comment</h3>
              <button className="mod-modal-close-btn" onClick={() => setFieldCommentModalTarget(null)}>×</button>
            </div>

            <div className="mod-modal-body">
              <p style={{ fontSize: '13.5px', margin: '0 0 12px', color: 'var(--mod-text-secondary)' }}>
                Targeting: <strong style={{ color: '#7c3aed' }}>{fieldCommentModalTarget.targetLabel}</strong>
              </p>
              
              <textarea
                className="rejection-reason-textarea"
                placeholder="Type your specific inspection comment (e.g. Dialogue text typo, missing panel background, cover resolution too low)..."
                value={pinCommentText}
                onChange={(e) => setPinCommentText(e.target.value)}
                autoFocus
              />
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={2} 
                label="Cancel" 
                className="btn-cancel"
                onClick={() => setFieldCommentModalTarget(null)} 
              />
              <ModernButton 
                variant={2} 
                label="📌 Pin Comment" 
                className="btn-approve"
                onClick={() => {
                  handleAddDocComment(
                    selectedReview.id,
                    fieldCommentModalTarget.targetType,
                    fieldCommentModalTarget.targetKey,
                    fieldCommentModalTarget.targetLabel,
                    pinCommentText,
                    fieldCommentModalTarget.coords || null
                  );
                }}
                disabled={!pinCommentText.trim()}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: REJECTION REMARKS (UPGRADED WITH PAGE THUMBNAILS & PINNED COMMENTS REPORT) ───────────────── */}
      {selectedReject && createPortal(
        <div className="mod-reject-modal-overlay">
          <div className="mod-modal-card" style={{ maxWidth: '680px', width: '90%', borderRadius: '16px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="mod-modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#ef4444' }}>
                  ✗ Confirm Submission Rejection
                </h3>
                <span className="mod-inspector-subtitle" style={{ fontSize: '12px' }}>
                  {selectedReject.title} · Author: {formatSubmitterName(selectedReject.submittedBy).replace('Author: ', '')}
                </span>
              </div>
              <button className="mod-modal-close-btn" onClick={() => setSelectedReject(null)}>×</button>
            </div>

            <div className="mod-modal-body" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13.5px', margin: 0, lineHeight: '1.5', color: 'var(--mod-text-secondary)' }}>
                You are about to reject raw submission <strong>"{selectedReject.title}"</strong>. Review the attached inspection feedback report below before sending it to the author.
              </p>

              {/* Detailed Pinned Comments Preview Report with Page Thumbnails */}
              {(() => {
                const comments = docCommentsMap[selectedReject.id] || selectedReject.notes || [];
                const chaptersList = getSubmissionChapters(selectedReject);
                const firstChap = selectedChapter || chaptersList[0] || null;
                const pages = (firstChap && Array.isArray(firstChap.pages)) ? firstChap.pages : [];

                if (comments.length === 0) return null;

                return (
                  <div style={{ padding: '14px', borderRadius: '12px', background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.15)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#7c3aed' }}>
                        📋 Inspection Feedback Report ({comments.length} Pinned Items)
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                      {comments.map((c, idx) => {
                        let pageThumb = null;
                        if (c.targetKey && c.targetKey.startsWith('page-')) {
                          const pNum = parseInt(c.targetKey.replace('page-', ''), 10);
                          if (!isNaN(pNum) && pages[pNum - 1]) {
                            pageThumb = pages[pNum - 1];
                          }
                        }

                        return (
                          <div key={c.id || idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(148,163,184,0.15)' }}>
                            {pageThumb ? (
                              <img
                                src={pageThumb}
                                alt={c.targetLabel}
                                style={{ width: '42px', height: '56px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(148,163,184,0.2)', flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{ width: '42px', height: '56px', borderRadius: '4px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                                📌
                              </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                {renderCommentBadge(c, idx + 1)}
                                {c.targetKey && c.targetKey.startsWith('page-') && (
                                  <button
                                    type="button"
                                    style={{
                                      padding: '3px 8px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(124,58,237,0.3)',
                                      background: 'rgba(124,58,237,0.1)',
                                      color: '#a855f7',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => handleJumpToPageFromReport(selectedReject, c)}
                                    title="Jump directly to this page in inspector to re-check"
                                  >
                                    👁️ View Page {parseInt(c.targetKey.replace('page-', ''), 10)}
                                  </button>
                                )}
                              </div>
                              <p style={{ margin: 0, fontSize: '12.5px', whiteSpace: 'pre-wrap', color: theme === 'light' ? '#0f172a' : '#f1f5f9' }}>
                                {c.text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Editable Rejection Reason Area */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--mod-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Rejection Message / Overall Remarks (Optional if pins attached)
                </label>
                <textarea
                  className="rejection-reason-textarea"
                  placeholder="Type optional overall rejection remarks or specific revision instructions for the author..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{ width: '100%', minHeight: '110px', padding: '12px', borderRadius: '8px', fontSize: '13.5px', outline: 'none' }}
                />
              </div>
            </div>

            <div className="mod-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid rgba(148,163,184,0.15)', display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={2} 
                label="Cancel" 
                className="btn-cancel"
                onClick={() => setSelectedReject(null)} 
              />
              {(() => {
                const comments = selectedReject ? (docCommentsMap[selectedReject.id] || selectedReject.notes || []) : [];
                const isFormDisabled = !rejectionReason.trim() && comments.length === 0;
                return (
                  <ModernButton 
                    variant={2} 
                    label="✗ Confirm & Send Rejection" 
                    className="btn-reject"
                    onClick={onConfirmRejectClick}
                    disabled={isFormDisabled}
                  />
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ReviewQueue
