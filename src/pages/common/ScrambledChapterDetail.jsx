import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import HomeLayout from '../../components/layout/HomeLayout';
import ScrambledComicPageCanvas from '../../components/common/ScrambledComicPageCanvas';
import useReaderSecurity, { isDevToolsOpenSync } from '../../hooks/useReaderSecurity';
import { getAuth } from '../../utils/Auth';
import { getProtectedChapterPagesApi } from '../../services/api/ChapterApi';
import { toast } from 'react-toastify';
import { Flag, ArrowLeft, ChevronLeft, ChevronRight, Layers, Lock, ShieldAlert } from 'lucide-react';
import '../../assets/style/reader/chapter-detail.css';

const DEFAULT_CHAPTER_ID = '019fcee8-c68f-798d-b0c3-854b165f811e';
const DEFAULT_BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMTlmMTNlMy0yZmNiLTdmODctOThjYy00MTk1MzFlM2Y0MTgiLCJyb2xlIjoiTU9ERVJBVE9SIiwidG9rZW5UeXBlIjoiQUNDRVNTIiwiaWF0IjoxNzg3MjgwMzAzLCJleHAiOjE3ODczNjY3MDN9.usANG7avI8xYeVtP0Uh2vFUZQOf9k9Do9vvNGvn_j8c';

function ScrambledChapterDetail() {
  const routeParams = useParams();
  const chapterId = routeParams.chapterId || DEFAULT_CHAPTER_ID;
  const navigate = useNavigate();

  // States
  const [pagesData, setPagesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [readerLayout, setReaderLayout] = useState('vertical'); // 'vertical' | 'single'
  const [pageIndex, setPageIndex] = useState(0);
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);

  const viewportRef = useRef(null);
  const layoutDropdownRef = useRef(null);

  // Security enforcement: Disable contextmenu, DevTools detection, PrintScreen
  useReaderSecurity({
    onDevToolsOpen: () => {
      setIsDevToolsOpen(true);
      setPagesData([]);
      toast.error('Security alert: Developer tools detected. Reading session is suspended.', {
        position: 'top-right',
        autoClose: 5000,
        theme: 'dark',
      });
    },
    disableDetector: false,
  });

  const scrollToViewer = useCallback((behavior = 'smooth') => {
    if (viewportRef.current) {
      const y = viewportRef.current.getBoundingClientRect().top + window.scrollY - 10;
      window.scrollTo({ top: y, behavior });
    } else {
      window.scrollTo({ top: 0, behavior });
    }
  }, []);

  // Fetch API pages using base URL Axios client and endpoint /chapters/{chapterId}/pages
  useEffect(() => {
    const fetchProtectedPages = async () => {
      if (isDevToolsOpenSync()) {
        setIsDevToolsOpen(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg('');

      try {
        const auth = getAuth();
        const config = {};
        if (!auth?.token && DEFAULT_BEARER_TOKEN) {
          config.headers = {
            Authorization: `Bearer ${DEFAULT_BEARER_TOKEN}`
          };
        }

        // Endpoint: /chapters/{chapterId}/pages via AxiosClient (follows API_BASE_URL)
        let data = await getProtectedChapterPagesApi(chapterId, config);

        // Unwrap nested API response structure if present
        if (data && data.data !== undefined) {
          data = data.data;
        }

        if (Array.isArray(data)) {
          setPagesData(data);
        } else if (data && Array.isArray(data.protectedPages)) {
          setPagesData(data.protectedPages);
        } else {
          throw new Error('Invalid response format received from server');
        }
      } catch (err) {
        console.error('Failed to fetch scrambled chapter pages:', err);
        setErrorMsg(err.response?.data?.message || err.message || 'Error loading chapter pages');
      } finally {
        setLoading(false);
      }
    };

    fetchProtectedPages();
  }, [chapterId]);

  // Click outside listener for layout dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(event.target)) {
        setIsLayoutDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Single page mode keyboard navigation
  useEffect(() => {
    if (readerLayout !== 'single') return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'd') {
        if (pageIndex < pagesData.length - 1) {
          setPageIndex((p) => p + 1);
          scrollToViewer('smooth');
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        if (pageIndex > 0) {
          setPageIndex((p) => p - 1);
          scrollToViewer('smooth');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readerLayout, pageIndex, pagesData.length, scrollToViewer]);

  if (isDevToolsOpen) {
    return (
      <HomeLayout>
        <div className="chapter-reader-container" style={{ justifyContent: 'center' }}>
          <div
            className="reader-loading-container"
            style={{
              padding: '80px 24px',
              background: 'rgba(239, 68, 68, 0.05)',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              maxWidth: '500px',
              margin: '60px auto',
              textAlign: 'center'
            }}
          >
            <ShieldAlert size={56} color="#ef4444" style={{ marginBottom: '16px' }} />
            <h2 style={{ color: '#ef4444', fontWeight: '700', marginBottom: '8px' }}>
              Security Protection Active
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6' }}>
              Developer Tools detected. Reading session is suspended to prevent unauthorized image scraping.
            </p>
            <button
              className="btn-reader-action"
              style={{ marginTop: '24px' }}
              onClick={() => window.location.reload()}
            >
              Reload Session
            </button>
          </div>
        </div>
      </HomeLayout>
    );
  }

  return (
    <HomeLayout>
      <div
        className="chapter-reader-container no-select"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        {/* Top Control Bar */}
        <div className="reader-control-header">
          <div className="reader-header-inner">
            <div className="reader-header-left">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-reader-back"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div className="reader-comic-title-info">
                <h2 className="reader-comic-meta-title">
                  Protected Scrambled Comic Reader
                </h2>
                <span className="reader-chapter-meta-subtitle">
                  Chapter ID: {chapterId}
                </span>
              </div>
            </div>

            <div className="reader-nav-controls">
              {/* Layout Switcher Dropdown */}
              <div className="reader-chapter-dropdown-container" ref={layoutDropdownRef} style={{ minWidth: '170px' }}>
                <div
                  className={`reader-chapter-dropdown-trigger ${isLayoutDropdownOpen ? 'active' : ''}`}
                  onClick={() => setIsLayoutDropdownOpen(!isLayoutDropdownOpen)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '999px',
                    color: 'var(--reader-purple, #a855f7)',
                    borderColor: 'rgba(168, 85, 247, 0.5)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={16} />
                    {readerLayout === 'single' ? 'Single Page' : 'Vertical Scroll'}
                  </span>
                </div>

                {isLayoutDropdownOpen && (
                  <div className="reader-chapter-dropdown-menu">
                    <div
                      className={`reader-chapter-dropdown-item ${readerLayout === 'vertical' ? 'selected' : ''}`}
                      onClick={() => {
                        setReaderLayout('vertical');
                        setIsLayoutDropdownOpen(false);
                      }}
                    >
                      <span>Continuous Vertical Scroll</span>
                    </div>
                    <div
                      className={`reader-chapter-dropdown-item ${readerLayout === 'single' ? 'selected' : ''}`}
                      onClick={() => {
                        setReaderLayout('single');
                        setIsLayoutDropdownOpen(false);
                      }}
                    >
                      <span>Single Page Mode</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="btn-reader-report"
                onClick={() => toast.info('Report functionality ready')}
              >
                <Flag size={14} /> Report
              </button>
            </div>
          </div>
        </div>

        {/* Content Viewport */}
        <div className="chapter-pages-viewport" id="secure-comic-reader" ref={viewportRef}>
          {loading ? (
            <div className="reader-loading-container" style={{ padding: '80px 24px' }}>
              <div className="reader-spinner"></div>
              <p style={{ marginTop: '16px', color: '#94a3b8' }}>
                Fetching protected chapter pages...
              </p>
            </div>
          ) : errorMsg ? (
            <div
              className="reader-loading-container"
              style={{
                padding: '60px 24px',
                background: 'rgba(239, 68, 68, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                maxWidth: '600px',
                margin: '40px auto',
              }}
            >
              <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>Failed to Load Chapter</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>{errorMsg}</p>
              <button
                className="btn-reader-action"
                onClick={() => window.location.reload()}
              >
                Retry Request
              </button>
            </div>
          ) : pagesData.length === 0 ? (
            <div style={{ padding: '80px 20px', color: '#64748b', textAlign: 'center' }}>
              <p style={{ fontSize: '36px', margin: '0 0 16px' }}>📖</p>
              <p>No pages returned for this chapter.</p>
            </div>
          ) : readerLayout === 'single' ? (
            /* Single Page Navigation Mode */
            <div className="premium-single-page-wrapper">
              <div
                className="premium-page-nav-zone left"
                onClick={() => {
                  if (pageIndex > 0) {
                    setPageIndex((p) => Math.max(0, p - 1));
                    scrollToViewer('smooth');
                  }
                }}
              >
                <div className="premium-page-nav-icon">
                  <ChevronLeft size={24} />
                </div>
              </div>

              {/* Scrambled Canvas Component */}
              <ScrambledComicPageCanvas
                key={`single-${pageIndex}`}
                pageNumber={pagesData[pageIndex]?.pageNumber || pageIndex + 1}
                scrambledImageUrl={pagesData[pageIndex]?.scrambledImageUrl}
                cols={pagesData[pageIndex]?.cols || 4}
                rows={pagesData[pageIndex]?.rows || 4}
                encryptedMapping={pagesData[pageIndex]?.encryptedMapping}
                token={pagesData[pageIndex]?.token}
              />

              <div
                className="premium-page-nav-zone right"
                onClick={() => {
                  if (pageIndex < pagesData.length - 1) {
                    setPageIndex((p) => Math.min(pagesData.length - 1, p + 1));
                    scrollToViewer('smooth');
                  }
                }}
              >
                <div className="premium-page-nav-icon">
                  <ChevronRight size={24} />
                </div>
              </div>

              {/* Floating Counter */}
              <div className="premium-page-counter">
                <span style={{ opacity: 0.7 }}>Page</span>
                <span>
                  {pageIndex + 1} <span style={{ opacity: 0.5 }}>/</span> {pagesData.length}
                </span>
              </div>
            </div>
          ) : (
            /* Continuous Vertical Scroll Mode */
            pagesData.map((pageItem, idx) => (
              <ScrambledComicPageCanvas
                key={pageItem.pageNumber || idx}
                pageNumber={pageItem.pageNumber || idx + 1}
                scrambledImageUrl={pageItem.scrambledImageUrl}
                cols={pageItem.cols || 4}
                rows={pageItem.rows || 4}
                encryptedMapping={pageItem.encryptedMapping}
                token={pageItem.token}
              />
            ))
          )}
        </div>

        {/* Bottom Bar */}
        <div className="reader-bottom-nav">
          <button
            type="button"
            className="btn-reader-secondary-action"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            ▲ Back to Top
          </button>
        </div>
      </div>
    </HomeLayout>
  );
}

export default ScrambledChapterDetail;
