import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import '../../assets/style/moderator/review-queue.css'
import '../../assets/style/moderator/comic-detail.css'
import ModernButton from '../../components/common/ModernButton'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import ModernPagination from '../../components/common/ModernPagination'

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

function ReviewQueue({ submissions = [], handleApprove, handleConfirmReject }) {
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
    
    return submissions
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

  const onConfirmRejectClick = () => {
    if (!selectedReject) return
    handleConfirmReject(selectedReject.id, rejectionReason)
    
    setSelectedReview(null)
    setSelectedChapter(null)
    setSelectedReject(null)
    setRejectionReason('')
  }

  // Extract real DB submitted chapter list for a raw comic submission
  const getSubmissionChapters = (item) => {
    if (!item) return [];
    
    if (Array.isArray(item.chapters) && item.chapters.length > 0) {
      return item.chapters;
    }

    if (item.chapter || item.content || (Array.isArray(item.pages) && item.pages.length > 0)) {
      return [{
        id: item.id || `chap-${Date.now()}`,
        number: item.chapterNumber || 1,
        title: item.chapter ? (item.chapter.toLowerCase().startsWith('chapter') ? item.chapter : `Chapter ${item.chapter}`) : 'Chapter 1',
        pages: Array.isArray(item.pages) ? item.pages : [],
        content: item.content || null,
        words: item.words || null,
        timestamp: item.timestamp || Date.now()
      }];
    }

    return [];
  };

  const handleOpenReviewModal = (item) => {
    setSelectedReview(item);
    const chaps = getSubmissionChapters(item);
    const firstChap = chaps[0] || null;
    setSelectedChapter(firstChap);
    setPageIndex(0);
    setPreviewTab(firstChap && Array.isArray(firstChap.pages) && firstChap.pages.length > 0 ? 'reader' : 'chapters');
  };

  const handleSelectChapterItem = (chap) => {
    setSelectedChapter(chap);
    setPageIndex(0);
    setPreviewTab('reader');
  };

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
        <div className="mod-inspector-overlay fade-in">
          {/* Topbar Navigation & Review Actions */}
          {(() => {
            const chaptersList = getSubmissionChapters(selectedReview);
            const activeChap = selectedChapter || chaptersList[0] || null;
            const pages = (activeChap && Array.isArray(activeChap.pages)) ? activeChap.pages : [];

            return (
              <div className="mod-inspector-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: '64px', minHeight: '64px', maxHeight: '64px', background: 'rgba(15, 10, 26, 0.98)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', flexWrap: 'nowrap', gap: '16px', zIndex: 10 }}>
                {/* Left: Truncated Title & Subtitle Group */}
                <div className="mod-inspector-title-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, maxWidth: '340px', flexShrink: 1 }}>
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <h3 className="mod-inspector-title" style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${selectedReview.title}${selectedChapter ? ` — ${selectedChapter.title}` : ''}`}>
                      📖 {selectedReview.title} {selectedChapter ? `— ${selectedChapter.title}` : ''}
                    </h3>
                    <div style={{ fontSize: '11.5px', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatSubmitterName(selectedReview.submittedBy)} · {formatTimeAgo(selectedReview.timestamp)}
                    </div>
                  </div>
                </div>

                {/* Center: Mode Tabs (Strictly Single Row) */}
                <div className="mod-inspector-mode-tabs" style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255, 255, 255, 0.08)', padding: '3px 4px', borderRadius: '500px', border: '1px solid rgba(255, 255, 255, 0.12)', flexShrink: 0, flexWrap: 'nowrap', height: '38px' }}>
                  <button
                    type="button"
                    className={`mod-mode-tab ${previewTab === 'reader' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('reader')}
                    style={{ padding: '0 14px', height: '32px', fontSize: '12px', borderRadius: '500px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    🖼️ Image Reader ({pages.length})
                  </button>
                  <button
                    type="button"
                    className={`mod-mode-tab ${previewTab === 'script' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('script')}
                    style={{ padding: '0 14px', height: '32px', fontSize: '12px', borderRadius: '500px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    📝 Script
                  </button>
                  <button
                    type="button"
                    className={`mod-mode-tab ${previewTab === 'chapters' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('chapters')}
                    style={{ padding: '0 14px', height: '32px', fontSize: '12px', borderRadius: '500px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    📋 Chapters ({chaptersList.length})
                  </button>
                  <button
                    type="button"
                    className={`mod-mode-tab ${previewTab === 'synopsis' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('synopsis')}
                    style={{ padding: '0 14px', height: '32px', fontSize: '12px', borderRadius: '500px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    ℹ️ Details & Inputs
                  </button>
                </div>

                {/* Right: Review Actions & Close */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'nowrap' }}>
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

          {/* Main Full-Screen Body Container */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#090614', position: 'relative' }}>
            {(() => {
              const chaptersList = getSubmissionChapters(selectedReview);
              const activeChap = selectedChapter || chaptersList[0] || null;
              const pages = (activeChap && Array.isArray(activeChap.pages)) ? activeChap.pages : [];

              /* MODE 1: RAW IMAGE READER VIEW */
              if (previewTab === 'reader') {
                if (pages.length === 0) {
                  return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#cbd5e1' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
                      <h3 style={{ color: '#ffffff', margin: '0 0 8px' }}>No Manuscript Page Images Attached</h3>
                      <p style={{ margin: '0 0 20px', fontSize: '14px', maxWidth: '480px', textAlign: 'center', color: '#cbd5e1' }}>
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

                return (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                    {/* Top sub-header for active chapter label */}
                    <div style={{ padding: '8px 24px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: '#c084fc', fontWeight: '600' }}>
                        🌐 Original Raw Manuscript — {activeChap ? activeChap.title : 'Chapter Page'} (Page {pageIndex + 1} of {pages.length})
                      </span>
                      {chaptersList.length > 1 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Switch Chapter:</span>
                          <select
                            className="mod-inspect-select"
                            value={activeChap?.id}
                            onChange={(e) => {
                              const found = chaptersList.find(c => c.id === e.target.value);
                              if (found) handleSelectChapterItem(found);
                            }}
                            style={{ padding: '3px 8px', fontSize: '12px' }}
                          >
                            {chaptersList.map(c => (
                              <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Central Wide Reader Container */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: readerLayout === 'single' ? 'center' : 'flex-start', padding: '24px' }}>
                      {readerLayout === 'single' ? (
                        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', textAlign: 'center' }}>
                          <img
                            src={currentPageUrl}
                            alt={`Page ${pageIndex + 1}`}
                            style={{
                              maxHeight: '75vh',
                              maxWidth: '100%',
                              objectFit: 'contain',
                              borderRadius: '8px',
                              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', width: '100%', maxWidth: '850px' }}>
                          {pages.map((imgUrl, pIdx) => (
                            <div key={pIdx} style={{ width: '100%', textAlign: 'center' }}>
                              <img
                                src={imgUrl}
                                alt={`Page ${pIdx + 1}`}
                                style={{
                                  width: '100%',
                                  maxHeight: '90vh',
                                  objectFit: 'contain',
                                  borderRadius: '8px',
                                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                                  border: '1px solid rgba(255,255,255,0.1)'
                                }}
                              />
                              <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', color: '#cbd5e1' }}>
                                Page {pIdx + 1} of {pages.length}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Reader Toolbar Controls */}
                    <div style={{ padding: '12px 24px', background: 'rgba(15, 10, 26, 0.95)', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="mod-mode-tab"
                          onClick={() => setPageIndex(prev => Math.max(0, prev - 1))}
                          disabled={pageIndex === 0 || readerLayout === 'vertical'}
                          style={{ opacity: (pageIndex === 0 || readerLayout === 'vertical') ? 0.4 : 1, padding: '6px 14px' }}
                        >
                          ← Previous Page
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#ffffff', minWidth: '100px', textAlign: 'center' }}>
                          Page {pageIndex + 1} of {pages.length}
                        </span>
                        <button
                          type="button"
                          className="mod-mode-tab"
                          onClick={() => setPageIndex(prev => Math.min(pages.length - 1, prev + 1))}
                          disabled={pageIndex >= pages.length - 1 || readerLayout === 'vertical'}
                          style={{ opacity: (pageIndex >= pages.length - 1 || readerLayout === 'vertical') ? 0.4 : 1, padding: '6px 14px' }}
                        >
                          Next Page →
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12.5px', color: '#cbd5e1' }}>Reader Layout:</span>
                        <select
                          className="mod-inspect-select"
                          value={readerLayout}
                          onChange={(e) => setReaderLayout(e.target.value)}
                          style={{ padding: '4px 10px', fontSize: '12.5px' }}
                        >
                          <option value="single">📖 Single Page</option>
                          <option value="vertical">📜 Continuous Vertical Scroll</option>
                        </select>

                        <button 
                          className="mod-mode-tab" 
                          onClick={() => { setSelectedReview(null); setSelectedChapter(null); }}
                          style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', color: '#ffffff' }}
                        >
                          Close Viewer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              /* MODE 2: SCRIPT / DIALOGUE VIEW */
              if (previewTab === 'script') {
                return (
                  <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                    <div style={{ maxWidth: '900px', margin: '0 auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '24px' }}>
                      <h4 style={{ margin: '0 0 16px', fontSize: '16px', color: '#ffffff' }}>
                        📝 Raw Manuscript Script & Dialogue ({activeChap ? activeChap.title : 'Chapter'})
                      </h4>

                      {activeChap && activeChap.content ? (
                        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: '#f8fafc', background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {activeChap.content}
                        </pre>
                      ) : (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                          No text dialogue script attached for this chapter.
                        </div>
                      )}
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
                        <h4 style={{ margin: 0, fontSize: '17px', color: '#ffffff', fontWeight: '700' }}>
                          📖 Submitted Chapters ({chaptersList.length} Chapters)
                        </h4>
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Click "👁️ View Chapter in Reader" to switch reader focus</span>
                      </div>

                      {chaptersList.length === 0 ? (
                        <div style={{ padding: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center', color: '#94a3b8' }}>
                          <p style={{ margin: '0 0 6px', fontWeight: '700', fontSize: '16px', color: '#ffffff' }}>Raw Comic Profile Entry</p>
                          <p style={{ margin: 0 }}>This is an initial raw comic catalog profile submission. No chapters have been uploaded yet.</p>
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                          <table className="mod-chapters-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                              <tr style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', textAlign: 'left' }}>
                                <th style={{ padding: '14px 18px', color: '#cbd5e1', fontWeight: '700' }}>Chapter #</th>
                                <th style={{ padding: '14px 18px', color: '#cbd5e1', fontWeight: '700' }}>Manuscript Title</th>
                                <th style={{ padding: '14px 18px', color: '#cbd5e1', fontWeight: '700' }}>Pages / Length</th>
                                <th style={{ padding: '14px 18px', color: '#cbd5e1', fontWeight: '700' }}>Submitted Time</th>
                                <th style={{ padding: '14px 18px', textAlign: 'right', color: '#cbd5e1', fontWeight: '700' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {chaptersList.map((chap, idx) => {
                                const isSelected = activeChap && activeChap.id === chap.id;
                                return (
                                  <tr 
                                    key={chap.id || idx} 
                                    style={{ 
                                      borderBottom: idx < chaptersList.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                                      background: isSelected ? 'rgba(168,85,247,0.22)' : 'transparent'
                                    }}
                                  >
                                    <td style={{ padding: '14px 18px', fontWeight: '700', color: isSelected ? '#e9d5ff' : '#c084fc' }}>
                                      Chapter {chap.number || idx + 1}
                                    </td>
                                    <td style={{ padding: '14px 18px', fontWeight: '600', color: '#ffffff' }}>
                                      {chap.title}
                                    </td>
                                    <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                                      📄 {Array.isArray(chap.pages) ? chap.pages.length : 0} Pages {chap.words ? `· ${chap.words}` : ''}
                                    </td>
                                    <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                                      ⏱️ {formatTimeAgo(chap.timestamp || selectedReview.timestamp)}
                                    </td>
                                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectChapterItem(chap)}
                                        style={{
                                          padding: '7px 16px',
                                          borderRadius: '20px',
                                          border: isSelected ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.2)',
                                          background: isSelected ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'rgba(255,255,255,0.08)',
                                          color: '#ffffff',
                                          fontSize: '12px',
                                          fontWeight: '600',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {isSelected ? '✓ Inspecting' : '👁️ View Chapter in Reader'}
                                      </button>
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

              /* MODE 4: AUTHOR INPUT DATA REVIEW WORKBENCH */
              return (
                <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', background: '#090614' }}>
                  <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Author Input Fields Review Card */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '24px' }}>
                        {/* Cover Image Input Preview */}
                        <div style={{
                          width: '150px',
                          height: '210px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                          border: '1px solid rgba(255,255,255,0.18)',
                          flexShrink: 0,
                          background: '#120c24'
                        }}>
                          {selectedReview.cover && (selectedReview.cover.startsWith('http') || selectedReview.cover.includes('/')) ? (
                            <img src={selectedReview.cover} alt={selectedReview.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: '#c084fc', background: 'rgba(255,255,255,0.05)' }}>
                              {selectedReview.cover || '📚'}
                            </div>
                          )}
                        </div>

                        {/* Core Input Fields */}
                        <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#c084fc', display: 'block', marginBottom: '4px' }}>
                              Comic Title *
                            </span>
                            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#ffffff' }}>
                              {selectedReview.title}
                            </h2>
                          </div>

                          {/* Author Input Fields Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Original Language *</span>
                              <strong style={{ fontSize: '13.5px', color: '#ffffff' }}>{selectedReview.language || 'Japanese'}</strong>
                            </div>

                            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Minimum Age</span>
                              <strong style={{ fontSize: '13.5px', color: '#ffffff' }}>{selectedReview.minAge || selectedReview.ageRating || '13+'}</strong>
                            </div>

                            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Publication Status</span>
                              <strong style={{ fontSize: '13.5px', color: '#34d399' }}>{selectedReview.publicationStatus || selectedReview.comicStatus || 'Ongoing'}</strong>
                            </div>

                            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Author Account</span>
                              <strong style={{ fontSize: '13.5px', color: '#ffffff' }}>{formatSubmitterName(selectedReview.submittedBy).replace('Author: ', '')}</strong>
                            </div>
                          </div>

                          {/* Genres Input Field Display */}
                          {selectedReview.genres && selectedReview.genres.length > 0 && (
                            <div>
                              <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '6px' }}>Genres</span>
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {selectedReview.genres.map((genre, idx) => (
                                  <span key={idx} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', background: 'rgba(168,85,247,0.2)', color: '#e9d5ff', border: '1px solid rgba(168,85,247,0.35)' }}>
                                    {genre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description Field Review */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', marginTop: '12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#c084fc', display: 'block', marginBottom: '6px' }}>
                          Description
                        </span>
                        <p style={{ margin: 0, color: '#f1f5f9', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                          {selectedReview.description || selectedReview.synopsis || 'No description has been added yet.'}
                        </p>
                      </div>
                    </div>

                    {/* Rejection Feedback if Rejected */}
                    {selectedReview.status === 'rejected' && (
                      <div style={{ padding: '16px 20px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderLeft: '4px solid #ef4444' }}>
                        <strong style={{ color: '#f87171', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                          Rejection Feedback:
                        </strong>
                        <span style={{ fontStyle: 'italic', color: '#f1f5f9', fontSize: '13.5px' }}>
                          "{selectedReview.rejectionReason || 'No feedback recorded.'}"
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: REJECTION REMARKS ───────────────── */}
      {selectedReject && createPortal(
        <div className="mod-modal-overlay" style={{ zIndex: 100000 }}>
          <div className="mod-modal-card">
            <div className="mod-modal-header">
              <h3>Confirm Rejection</h3>
              <button className="mod-modal-close-btn" onClick={() => setSelectedReject(null)}>×</button>
            </div>

            <div className="mod-modal-body">
              <p style={{ fontSize: '14px', margin: '0 0 16px', color: 'var(--mod-text-secondary)' }}>
                Please provide a clear reason why raw submission <em>{selectedReject.title}</em> is being rejected. This feedback will be sent to the author.
              </p>
              
              <textarea
                className="rejection-reason-textarea"
                placeholder="Type the rejection reason here (e.g. low resolution covers, duplicate submission, violates content policy)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>

            <div className="mod-modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <ModernButton 
                variant={2} 
                label="Cancel" 
                className="btn-cancel"
                onClick={() => setSelectedReject(null)} 
              />
              <ModernButton 
                variant={2} 
                label="Confirm Rejection" 
                className="btn-reject"
                onClick={onConfirmRejectClick}
                disabled={!rejectionReason.trim()}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ReviewQueue
