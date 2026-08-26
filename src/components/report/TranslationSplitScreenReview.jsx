import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  XCircle,
  Link2,
  Unlink2,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Layers,
  AlertTriangle,
  HelpCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';
import { formatTimeAgo } from '../../utils/formatTimeAgo';
import { getReportDetailApi, getUserReportByIdApi } from '../../services/api/ReportApi';
import {
  getChapterDetailApi,
  getChapterTranslationsApi,
  getChapterTranslationByIdApi
} from '../../services/api/ChapterApi';
import '../../assets/style/translator/review-workspace.css';
import '../../assets/style/report/report-system.css';

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getBoundingBox(selection) {
  if (!selection) return { x: 0, y: 0, width: 0, height: 0 };
  if (selection.shape === 'polygon' && selection.points?.length) {
    const xs = selection.points.map((p) => num(p.x));
    const ys = selection.points.map((p) => num(p.y));
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
  }
  return {
    x: num(selection.x),
    y: num(selection.y),
    width: num(selection.width),
    height: num(selection.height)
  };
}

function parseBubblesPayload(raw) {
  if (!raw) return [];
  try {
    let parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {}
    }
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.selections)) return parsed.selections;
    return [];
  } catch {
    return [];
  }
}

// Stored coords are % of the image (same as Review). Convert to px on the
// measured bitmap so height does not collapse when the overlay parent is height:auto.
function bubbleRectPx(sel, imgW, imgH) {
  const box = getBoundingBox(sel);
  const maxVal = Math.max(Math.abs(box.x), Math.abs(box.y), Math.abs(box.width), Math.abs(box.height));
  if (!(imgW > 0) || !(imgH > 0)) return { x: 0, y: 0, width: 0, height: 0 };
  if (maxVal > 100) {
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }
  return {
    x: (box.x / 100) * imgW,
    y: (box.y / 100) * imgH,
    width: (box.width / 100) * imgW,
    height: (box.height / 100) * imgH
  };
}

function ReportPageFrame({
  page,
  idx,
  variant,
  zoomScale,
  showTextOverlay,
  selectedBubbleId,
  onSelectBubble,
  onLightbox
}) {
  const imgRef = useRef(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const isRaw = variant === 'raw';
  const pageBubbles = Array.isArray(page.bubbles) ? page.bubbles : [];
  const imgSrc = page.image_url || page.imageUrl || page.url || '';
  const showText = !isRaw && showTextOverlay;
  const hasSize = imgSize.width > 0 && imgSize.height > 0;

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return undefined;

    const measure = () => {
      setImgSize({ width: el.clientWidth, height: el.clientHeight });
    };

    if (el.complete) measure();
    el.addEventListener('load', measure);
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(el);
    }
    return () => {
      el.removeEventListener('load', measure);
      observer?.disconnect();
    };
  }, [imgSrc, zoomScale]);

  return (
    <div
      id={`${isRaw ? 'raw' : 'trans'}-page-${idx}`}
      className="rep-page-frame"
      style={{
        width: `${zoomScale * 680}px`,
        maxWidth: '95%',
        position: 'relative',
        minHeight: '260px',
        background: '#161722'
      }}
    >
      <span
        className="rep-page-badge"
        style={!isRaw ? { background: 'rgba(168, 85, 247, 0.85)' } : undefined}
      >
        {isRaw ? 'Raw' : 'Translated'} Page {page.page_number || idx + 1}
      </span>
      <button
        className="rep-page-zoom-trigger"
        onClick={() => imgSrc && onLightbox(imgSrc)}
        title="Fullscreen Preview"
      >
        <Maximize2 size={16} />
      </button>

      {imgSrc ? (
        <div style={{ position: 'relative' }}>
          <img
            ref={imgRef}
            src={imgSrc}
            alt={page.label || `${isRaw ? 'Raw' : 'Translated'} page ${idx + 1}`}
            className="rep-page-img"
            loading="eager"
            decoding="async"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            draggable={false}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              minHeight: '200px',
              objectFit: 'contain'
            }}
            onLoad={() => {
              const el = imgRef.current;
              if (el) setImgSize({ width: el.clientWidth, height: el.clientHeight });
            }}
          />
          {hasSize && pageBubbles.length > 0 && (
            <div
              className="rvw-bubble-overlay"
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'hidden'
              }}
            >
              {pageBubbles.map((sel, bIdx) => {
                const box = getBoundingBox(sel);
                const isSelected = selectedBubbleId === sel.id;
                const rect = bubbleRectPx(sel, imgSize.width, imgSize.height);
                const fontSizePx =
                  showText && typeof sel.fontSize === 'number' && imgSize.height > 0
                    ? (sel.fontSize > 8 ? sel.fontSize : (sel.fontSize / 100) * imgSize.height)
                    : undefined;
                return (
                  <div
                    key={sel.id || bIdx}
                    data-bubble-id={sel.id}
                    onClick={() => onSelectBubble(isSelected ? null : sel.id)}
                    className={`rvw-bubble ${sel.shape === 'ellipse' ? 'rvw-bubble--ellipse' : sel.shape === 'polygon' ? 'rvw-bubble--polygon' : ''} ${isSelected ? 'rvw-bubble--selected' : ''} ${showText ? 'rvw-bubble--text-only' : 'rvw-bubble--outline-only'}`}
                    style={{
                      position: 'absolute',
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.width}%`,
                      height: `${rect.height}px`,
                      minHeight: `${rect.height}px`,
                      boxSizing: 'border-box',
                      pointerEvents: 'auto',
                      cursor: 'pointer',
                      ...(fontSizePx ? { fontSize: `${fontSizePx}px` } : {}),
                      ...(showText && sel.textBgColor ? { '--bg-color': sel.textBgColor } : {}),
                      ...(showText && sel.textColor ? { '--text-color': sel.textColor } : {})
                    }}
                    title={`Bubble ${bIdx + 1}: ${sel.translation || sel.original || 'Speech Bubble'}`}
                  >
                    {!showText && <span className="rvw-bubble-index">{bIdx + 1}</span>}
                    {showText && (sel.translation || sel.original)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '13px' }}>
          {isRaw ? 'Raw Image Not Available' : 'Translated Image Not Available'}
        </div>
      )}
    </div>
  );
}

export default function TranslationSplitScreenReview({
  report,
  onClose,
  onProcess
}) {
  const [zoomScale, setZoomScale] = useState(1);
  const [syncScroll, setSyncScroll] = useState(true);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showTextOverlay, setShowTextOverlay] = useState(true);
  const [selectedBubbleId, setSelectedBubbleId] = useState(null);

  // Translation Metadata & Dynamic review pages loaded from API
  const [translationMeta, setTranslationMeta] = useState(null);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadedPages, setLoadedPages] = useState([]);

  // Action modal states
  const [showActionModal, setShowActionModal] = useState(null); // 'ACCEPT' | 'REJECT' | null
  const [resolutionNote, setResolutionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rawScrollRef = useRef(null);
  const transScrollRef = useRef(null);

  // Load pages & bubbles resiliently (supports pre-passed pages or asynchronous API fetch)
  useEffect(() => {
    if (!report) return;

    const initialRaw = report.raw_pages || report.chapter_raw_pages || [];
    const initialTrans = report.translated_pages || report.chapter_translated_pages || [];

    const hasValidInitialRaw = Array.isArray(initialRaw) && initialRaw.some(p => (typeof p === 'string' && p.startsWith('http')) || p?.image_url || p?.imageUrl || p?.url);
    const hasValidInitialTrans = Array.isArray(initialTrans) && initialTrans.some(p => (typeof p === 'string' && p.startsWith('http')) || p?.image_url || p?.imageUrl || p?.url);

    if (hasValidInitialRaw || hasValidInitialTrans) {
      const total = Math.max(initialRaw.length, initialTrans.length);
      const unified = [];
      for (let i = 0; i < total; i++) {
        const raw = initialRaw[i] || {};
        const trans = initialTrans[i] || {};
        const rawUrl = typeof raw === 'string' ? raw : (raw.image_url || raw.imageUrl || raw.url || '');
        const transUrl = typeof trans === 'string' ? trans : (trans.image_url || trans.imageUrl || trans.url || rawUrl);
        const bubbles = parseBubblesPayload(trans.bubbles || raw.bubbles);
        unified.push({
          pageNumber: i + 1,
          rawImageUrl: rawUrl || transUrl,
          transImageUrl: transUrl || rawUrl,
          bubbles
        });
      }
      setLoadedPages(unified);
      return;
    }

    let isCancelled = false;

    const fetchReviewData = async () => {
      setLoadingPages(true);
      try {
        // 1. Fetch detailed report information if needed
        let reportDetail = null;
        try {
          reportDetail = await getReportDetailApi(report.id);
        } catch {
          try {
            reportDetail = await getUserReportByIdApi(report.id);
          } catch {}
        }

        const detailRaw = reportDetail?.raw_pages || reportDetail?.chapter_raw_pages || [];
        const detailTrans = reportDetail?.translated_pages || reportDetail?.chapter_translated_pages || [];

        const hasValidDetailRaw = Array.isArray(detailRaw) && detailRaw.some(p => (typeof p === 'string' && p.startsWith('http')) || p?.image_url || p?.imageUrl || p?.url);
        const hasValidDetailTrans = Array.isArray(detailTrans) && detailTrans.some(p => (typeof p === 'string' && p.startsWith('http')) || p?.image_url || p?.imageUrl || p?.url);

        if (hasValidDetailRaw || hasValidDetailTrans) {
          const total = Math.max(detailRaw.length, detailTrans.length);
          const unified = [];
          for (let i = 0; i < total; i++) {
            const raw = detailRaw[i] || {};
            const trans = detailTrans[i] || {};
            const rawUrl = typeof raw === 'string' ? raw : (raw.image_url || raw.imageUrl || raw.url || '');
            const transUrl = typeof trans === 'string' ? trans : (trans.image_url || trans.imageUrl || trans.url || rawUrl);
            unified.push({
              pageNumber: i + 1,
              rawImageUrl: rawUrl || transUrl,
              transImageUrl: transUrl || rawUrl,
              bubbles: parseBubblesPayload(trans.bubbles || raw.bubbles)
            });
          }
          if (!isCancelled) setLoadedPages(unified);
          return;
        }

        // 2. Identify target translation ID or chapter ID
        const targetId =
          report.target_id ||
          report.translation_id ||
          report.translationId ||
          reportDetail?.target_id ||
          reportDetail?.translation_id ||
          reportDetail?.translationId ||
          reportDetail?.chapter_id ||
          report.chapter_id;

        if (!targetId) {
          if (!isCancelled) setLoadedPages([]);
          return;
        }

        // 3. Step 1: Call GET /chapters/translations/{translationId} to fetch translation object
        let translationData = null;
        try {
          const trRes = await getChapterTranslationByIdApi(targetId);
          translationData = trRes?.data?.data || trRes?.data || trRes;
        } catch (transErr) {
          console.warn('Direct translation fetch by targetId failed, attempting fallback resolution:', transErr);
        }

        // 4. Extract chapterId from translation data (or fallback to reportDetail / targetId)
        const effectiveChapterId =
          translationData?.chapterId ||
          reportDetail?.chapter_id ||
          reportDetail?.chapterId ||
          report.chapter_id ||
          report.chapterId ||
          (!translationData ? targetId : null);

        // 5. Step 2: Fetch chapter detail using chapterId to get raw benchmark images/pages
        let chapterData = null;
        if (effectiveChapterId) {
          try {
            const chRes = await getChapterDetailApi(effectiveChapterId);
            chapterData = chRes?.data?.data || chRes?.data || chRes;
          } catch (chErr) {
            console.warn('Chapter detail fetch failed:', chErr);
          }
        }

        // Fallback: If translationData was not found by targetId directly (e.g. targetId was chapterId),
        // fetch translations list for the chapter
        if (!translationData && effectiveChapterId) {
          try {
            const trListRes = await getChapterTranslationsApi(effectiveChapterId);
            const transList = trListRes?.data?.data || trListRes?.data || trListRes || [];
            if (Array.isArray(transList) && transList.length > 0) {
              translationData =
                transList.find(t => String(t.id) === String(targetId)) ||
                transList.find(t => String(t.chapterId) === String(effectiveChapterId)) ||
                transList[0];
            }
          } catch (listErr) {
            console.warn('Fallback chapter translations list fetch failed:', listErr);
          }
        }

        // Store translation metadata
        if (translationData && !isCancelled) {
          setTranslationMeta({
            id: translationData.id,
            chapterId: translationData.chapterId,
            chapterNumber: translationData.chapterNumber,
            comicId: translationData.comicId,
            comicTitle: translationData.comicTitle,
            languageCode: translationData.languageCode,
            projectTeamId: translationData.projectTeamId,
            createdAt: translationData.createdAt,
            updatedAt: translationData.updatedAt
          });
        }

        // 6. Parse pagesBubbles from translationData
        let parsedPagesBubbles = [];
        if (translationData?.pagesBubbles) {
          try {
            const rawPB = typeof translationData.pagesBubbles === 'string'
              ? JSON.parse(translationData.pagesBubbles)
              : translationData.pagesBubbles;
            parsedPagesBubbles = Array.isArray(rawPB) ? rawPB : [];
          } catch (e) {
            console.error('Failed to parse pagesBubbles:', e);
          }
        }

        // 7. Extract raw images from chapter details (can be images or pages array)
        const rawImages = Array.isArray(chapterData?.images)
          ? chapterData.images
          : Array.isArray(chapterData?.pages)
          ? chapterData.pages
          : (Array.isArray(chapterData) ? chapterData : []);

        // 8. Construct unified page list pairing raw benchmark and translated canvas
        const totalPages = Math.max(rawImages.length, parsedPagesBubbles.length, 1);
        const unified = [];

        for (let i = 0; i < totalPages; i++) {
          const rawItem = rawImages[i];
          const rawUrl = typeof rawItem === 'string'
            ? rawItem
            : (rawItem?.imageUrl || rawItem?.image_url || rawItem?.url || '');

          const transItem =
            parsedPagesBubbles.find(p => Number(p.pageNumber) === i + 1) ||
            parsedPagesBubbles[i] ||
            {};
          const transUrl =
            transItem.imageUrl ||
            transItem.image_url ||
            transItem.translatedImageUrl ||
            rawUrl;
          const bubbles = parseBubblesPayload(transItem.bubbles || transItem.selections);

          const finalRaw = rawUrl || transUrl;
          const finalTrans = transUrl || rawUrl;

          unified.push({
            pageNumber: i + 1,
            pageId: transItem.pageId || rawItem?.id || `p-${i + 1}`,
            rawImageUrl: finalRaw,
            transImageUrl: finalTrans,
            bubbles
          });
        }

        if (!isCancelled) {
          setLoadedPages(unified);
        }
      } catch (err) {
        console.error('Failed to load review report data:', err);
        if (!isCancelled) setLoadedPages([]);
      } finally {
        if (!isCancelled) setLoadingPages(false);
      }
    };

    fetchReviewData();

    return () => {
      isCancelled = true;
    };
  }, [report]);

  const rawPages = useMemo(() => {
    if (loadedPages.length > 0) {
      return loadedPages.map((p) => ({
        page_number: p.pageNumber,
        image_url: p.rawImageUrl,
        bubbles: p.bubbles
      }));
    }
    return report?.raw_pages || report?.chapter_raw_pages || [];
  }, [loadedPages, report]);

  const transPages = useMemo(() => {
    if (loadedPages.length > 0) {
      return loadedPages.map((p) => ({
        page_number: p.pageNumber,
        image_url: p.transImageUrl,
        bubbles: p.bubbles
      }));
    }
    return report?.translated_pages || report?.chapter_translated_pages || [];
  }, [loadedPages, report]);

  const totalPages = Math.max(rawPages.length, transPages.length, 1);
  const currentPageRaw = useMemo(() => rawPages[activePageIndex] || rawPages[0] || {}, [rawPages, activePageIndex]);
  const currentPageTrans = useMemo(() => transPages[activePageIndex] || transPages[0] || {}, [transPages, activePageIndex]);
  const currentBubbles = useMemo(() => currentPageTrans.bubbles || currentPageRaw.bubbles || [], [currentPageTrans.bubbles, currentPageRaw.bubbles]);

  // Bubble selection helpers
  const selectedBubble = useMemo(() => {
    if (!selectedBubbleId) return null;
    return currentBubbles.find((b) => b.id === selectedBubbleId) || null;
  }, [selectedBubbleId, currentBubbles]);

  const selectedBubbleIndex = useMemo(() => {
    if (!selectedBubbleId) return null;
    const idx = currentBubbles.findIndex((b) => b.id === selectedBubbleId);
    return idx >= 0 ? idx + 1 : null;
  }, [selectedBubbleId, currentBubbles]);

  const handleNextBubble = () => {
    if (currentBubbles.length === 0) return;
    const idx = currentBubbles.findIndex((b) => b.id === selectedBubbleId);
    const nextIdx = (idx + 1) % currentBubbles.length;
    setSelectedBubbleId(currentBubbles[nextIdx].id);
  };

  const handlePrevBubble = () => {
    if (currentBubbles.length === 0) return;
    const idx = currentBubbles.findIndex((b) => b.id === selectedBubbleId);
    const prevIdx = (idx - 1 + currentBubbles.length) % currentBubbles.length;
    setSelectedBubbleId(currentBubbles[prevIdx].id);
  };

  const activeDriverRef = useRef(null);
  const syncTimeoutRef = useRef(null);

  // Synchronized scrolling between Raw and Translation panels
  const handleScroll = (sourceKey, targetRef) => (e) => {
    if (!syncScroll) return;
    if (activeDriverRef.current && activeDriverRef.current !== sourceKey) return;

    activeDriverRef.current = sourceKey;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    const source = e.currentTarget;
    const target = targetRef.current;

    if (target) {
      const maxSource = source.scrollHeight - source.clientHeight;
      const maxTarget = target.scrollHeight - target.clientHeight;

      if (maxSource > 0 && maxTarget > 0) {
        const ratio = source.scrollTop / maxSource;
        target.scrollTop = ratio * maxTarget;
      } else {
        target.scrollTop = source.scrollTop;
      }
      target.scrollLeft = source.scrollLeft;
    }

    syncTimeoutRef.current = setTimeout(() => {
      activeDriverRef.current = null;
    }, 60);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showActionModal) return;

      if (e.key === 'Escape') {
        if (selectedBubbleId) setSelectedBubbleId(null);
        else if (lightboxImage) setLightboxImage(null);
        else onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
        setActivePageIndex(prev => Math.min(prev + 1, totalPages - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        setActivePageIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 's' || e.key === 'S') {
        setSyncScroll(prev => {
          const next = !prev;
          toast.info(`Scroll Sync: ${next ? 'ENABLED' : 'DISABLED'}`, { autoClose: 1200 });
          return next;
        });
      } else if (e.key === '+' || e.key === '=') {
        setZoomScale(z => Math.min(z + 0.25, 3));
      } else if (e.key === '-') {
        setZoomScale(z => Math.max(z - 0.25, 0.5));
      } else if (e.key === '0') {
        setZoomScale(1);
      } else if (e.key === 'a' || e.key === 'A') {
        setResolutionNote('Confirmed translation error. Assigned translator and typesetter for revisions.');
        setShowActionModal('ACCEPT');
      } else if (e.key === 'r' || e.key === 'R') {
        setResolutionNote('');
        setShowActionModal('REJECT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showActionModal, lightboxImage, selectedBubbleId, totalPages, onClose]);

  const scrollToPage = (index) => {
    setActivePageIndex(index);
    setSelectedBubbleId(null);
    const rawEl = document.getElementById(`raw-page-${index}`);
    const transEl = document.getElementById(`trans-page-${index}`);
    if (rawEl) rawEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (transEl) transEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    if (showActionModal === 'REJECT' && !resolutionNote.trim()) {
      toast.warn('Please enter a rejection reason to inform the reporter.');
      return;
    }

    setSubmitting(true);
    try {
      await onProcess(report.id, {
        action: showActionModal,
        resolution_note: resolutionNote.trim() || (showActionModal === 'ACCEPT' ? 'Report accepted and assigned for revision.' : 'Report dismissed as invalid.')
      });
      setShowActionModal(null);
      toast.success(showActionModal === 'ACCEPT' ? 'Report approved successfully!' : 'Report rejected successfully!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to process report.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalBubblesCount = useMemo(() => {
    return loadedPages.reduce((acc, p) => acc + (p.bubbles?.length || 0), 0);
  }, [loadedPages]);

  return (
    <div className="rep-split-container">
      {/* ── TOPBAR CONTROLS ── */}
      <header className="rep-split-header">
        <div className="rep-split-header-left">
          <button className="rep-tool-btn" onClick={onClose} title="Back to Reports (Esc)">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="rep-split-title-wrap">
            <h2 className="rep-split-title">
              <Layers size={18} color="var(--rep-accent)" />
              {translationMeta?.comicTitle
                ? `${translationMeta.comicTitle} - Chapter ${translationMeta.chapterNumber || ''}${translationMeta.languageCode ? ` (${translationMeta.languageCode})` : ''}`
                : (report?.target_title || 'Translation Side-by-Side Review')}
            </h2>
            <span className="rep-split-sub">
              {report?.category_name || 'Translation Report'} · Report #{report?.id}
              {translationMeta?.languageCode ? ` · Language: ${translationMeta.languageCode}` : ''}
              {report?.reporter_name ? ` · By ${report.reporter_name}` : ''}
            </span>
          </div>

          {totalBubblesCount > 0 && (
            <span className="rep-badge in_progress" style={{ marginLeft: '6px' }}>
              <Sparkles size={12} /> {totalBubblesCount} Dialogue Bubbles
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="rep-split-toolbar">
          {/* Synchronized Scroll Toggle */}
          <button
            className={`rep-tool-btn ${syncScroll ? 'active' : ''}`}
            onClick={() => setSyncScroll(!syncScroll)}
            title="Toggle Synchronized Scroll (Key: S)"
          >
            {syncScroll ? <Link2 size={16} /> : <Unlink2 size={16} />}
            <span>Sync Scroll {syncScroll ? '(ON)' : '(OFF)'}</span>
          </button>

          {/* Text Overlay Mode Toggle */}
          <button
            className={`rep-tool-btn ${showTextOverlay ? 'active' : ''}`}
            onClick={() => setShowTextOverlay(!showTextOverlay)}
            title="Toggle Speech Bubble Text Overlay"
          >
            {showTextOverlay ? <Eye size={15} /> : <EyeOff size={15} />}
            <span>{showTextOverlay ? 'Text View' : 'Outline View'}</span>
          </button>

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              className="rep-tool-btn"
              onClick={() => setZoomScale(z => Math.max(z - 0.25, 0.5))}
              title="Zoom Out (-)"
            >
              <ZoomOut size={16} />
            </button>
            <span style={{ fontSize: '12px', fontWeight: '700', minWidth: '46px', textAlign: 'center' }}>
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              className="rep-tool-btn"
              onClick={() => setZoomScale(z => Math.min(z + 0.25, 3))}
              title="Zoom In (+)"
            >
              <ZoomIn size={16} />
            </button>
            <button
              className="rep-tool-btn"
              onClick={() => setZoomScale(1)}
              title="Reset Zoom (Key: 0)"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Quick Page Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
            <button
              className="rep-tool-btn"
              disabled={activePageIndex <= 0}
              onClick={() => scrollToPage(activePageIndex - 1)}
              title="Previous Page (←)"
            >
              <ArrowLeft size={14} />
            </button>
            <span style={{ fontSize: '13px', fontWeight: '600', padding: '0 4px' }}>
              Page {activePageIndex + 1} / {totalPages}
            </span>
            <button
              className="rep-tool-btn"
              disabled={activePageIndex >= totalPages - 1}
              onClick={() => scrollToPage(activePageIndex + 1)}
              title="Next Page (→)"
            >
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Close button */}
          <button className="rep-tool-btn" onClick={onClose} style={{ marginLeft: '12px' }} title="Close">
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ── SIDE-BY-SIDE SPLIT VIEW ── */}
      <div className="rep-split-body">
        {loadingPages ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <Loader2 size={36} className="rep-spinner" color="#c084fc" />
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--rep-text-primary)' }}>Loading Chapter & Translation Pages...</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--rep-text-muted)' }}>Retrieving raw artwork and translated dialogue bubbles for inspection.</p>
          </div>
        ) : (
          <>
            {/* LEFT COLUMN: RAW (ORIGINAL BENCHMARK) */}
            <div className="rep-split-column left">
              <div className="rep-split-col-header raw">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} /> RAW BENCHMARK (ORIGINAL)
                </span>
                <span>{rawPages.length} Pages</span>
              </div>

              <div
                className="rep-split-viewport"
                ref={rawScrollRef}
                onMouseEnter={() => { activeDriverRef.current = 'raw'; }}
                onTouchStart={() => { activeDriverRef.current = 'raw'; }}
                onWheel={() => { activeDriverRef.current = 'raw'; }}
                onScroll={handleScroll('raw', transScrollRef)}
              >
                {rawPages.length > 0 ? (
                  rawPages.map((page, idx) => (
                    <ReportPageFrame
                      key={page.page_number || idx}
                      page={page}
                      idx={idx}
                      variant="raw"
                      zoomScale={zoomScale}
                      showTextOverlay={false}
                      selectedBubbleId={selectedBubbleId}
                      onSelectBubble={setSelectedBubbleId}
                      onLightbox={setLightboxImage}
                    />
                  ))
                ) : (
                  <div className="rep-empty-state">
                    <HelpCircle size={40} className="rep-empty-icon" />
                    <h3>No raw benchmark pages found</h3>
                    <p>Loading or chapter raw imagery is unavailable from the repository.</p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: TRANSLATION & TYPESET (TEAM WORK) */}
            <div className="rep-split-column right">
              <div className="rep-split-col-header translated">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} /> TRANSLATION & TYPESET (TEAM WORK)
                </span>
                <span>{transPages.length} Pages</span>
              </div>

              <div
                className="rep-split-viewport"
                ref={transScrollRef}
                onMouseEnter={() => { activeDriverRef.current = 'trans'; }}
                onTouchStart={() => { activeDriverRef.current = 'trans'; }}
                onWheel={() => { activeDriverRef.current = 'trans'; }}
                onScroll={handleScroll('trans', rawScrollRef)}
              >
                {transPages.length > 0 ? (
                  transPages.map((page, idx) => (
                    <ReportPageFrame
                      key={page.page_number || idx}
                      page={page}
                      idx={idx}
                      variant="translated"
                      zoomScale={zoomScale}
                      showTextOverlay={showTextOverlay}
                      selectedBubbleId={selectedBubbleId}
                      onSelectBubble={setSelectedBubbleId}
                      onLightbox={setLightboxImage}
                    />
                  ))
                ) : (
                  <div className="rep-empty-state">
                    <AlertTriangle size={40} className="rep-empty-icon" />
                    <h3>No translated pages found</h3>
                    <p>Please check the published assets for this chapter translation.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── SELECTED BUBBLE DETAILS INSPECTION CARD ── */}
      {selectedBubble && (
        <div className="rvw-selected-preview" style={{ margin: '8px 24px', background: 'rgba(28, 19, 48, 0.95)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)' }}>
          <div className="rvw-selected-preview-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'var(--rep-accent)', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px' }}>
                Bubble #{selectedBubbleIndex}
              </span>
              <span className="rvw-selected-preview-title" style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9' }}>
                Dialogue & Typeset Inspector
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="rep-tool-btn" onClick={handlePrevBubble} style={{ height: '28px', padding: '0 8px' }} title="Previous Bubble">
                <ChevronLeft size={14} />
              </button>
              <button className="rep-tool-btn" onClick={handleNextBubble} style={{ height: '28px', padding: '0 8px' }} title="Next Bubble">
                <ChevronRight size={14} />
              </button>
              <button className="rvw-selected-preview-close" onClick={() => setSelectedBubbleId(null)} title="Clear Selection">
                <X size={15} />
              </button>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#38bdf8', fontWeight: '700', marginBottom: '4px' }}>Original Transcript</div>
              <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.4 }}>
                {selectedBubble.original ? `"${selectedBubble.original}"` : <span style={{ color: '#64748b' }}>No original raw transcript recorded.</span>}
              </div>
            </div>
            <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#c084fc', fontWeight: '700', marginBottom: '4px' }}>Translated Line (Team Work)</div>
              <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: '500', lineHeight: 1.4 }}>
                {selectedBubble.translation ? `"${selectedBubble.translation}"` : <span style={{ color: '#94a3b8' }}>No translation text inside this bubble.</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM RESOLUTION ACTION BAR ── */}
      <footer className="rep-resolution-bar">
        <div className="rep-res-report-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span className="rep-badge in_progress">
              <AlertTriangle size={13} /> {report?.category_name || 'Report'}
            </span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--rep-text-primary)' }}>
              Issue Description:
            </span>
          </div>
          <p className="rep-res-desc" title={report?.description_text}>
            "{report?.description_text || 'No description provided by reporter.'}"
          </p>
        </div>

        <div className="rep-res-actions">
          <span style={{ fontSize: '12px', color: 'var(--rep-text-muted)', marginRight: '8px' }}>
            Shortcuts: <strong>A</strong> (Accept) · <strong>R</strong> (Reject) · <strong>S</strong> (Sync)
          </span>

          <button
            className="rep-btn rep-btn-danger"
            onClick={() => {
              setResolutionNote('');
              setShowActionModal('REJECT');
            }}
          >
            <XCircle size={16} /> Reject (REJECT)
          </button>

          <button
            className="rep-btn rep-btn-success"
            onClick={() => {
              setResolutionNote('Confirmed translation error. Assigned translator and typesetter for revisions.');
              setShowActionModal('ACCEPT');
            }}
          >
            <CheckCircle2 size={16} /> Accept (ACCEPT)
          </button>
        </div>
      </footer>

      {/* ── LIGHTBOX ZOOM MODAL ── */}
      {lightboxImage && (
        <div className="rep-lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <button className="rep-lightbox-close" onClick={() => setLightboxImage(null)}>
            <X size={20} />
          </button>
          <img src={lightboxImage} alt="Zoom Preview" className="rep-lightbox-img" />
        </div>
      )}

      {/* ── RESOLUTION NOTE CONFIRMATION MODAL (ACCEPT / REJECT) ── */}
      {showActionModal && (
        <div className="rep-modal-backdrop" onClick={() => setShowActionModal(null)}>
          <div className="rep-modal-card" onClick={e => e.stopPropagation()}>
            <div className="rep-modal-header">
              <h3>
                {showActionModal === 'ACCEPT' ? 'Confirm Report Approval' : 'Confirm Report Rejection'}
              </h3>
              <button className="rep-tool-btn" onClick={() => setShowActionModal(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleProcessSubmit}>
              <div className="rep-modal-body">
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 16px', borderRadius: '10px' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'var(--rep-text-secondary)' }}>
                    Target: <strong>{report?.target_title}</strong>
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--rep-text-muted)' }}>
                    Reported by: {report?.reporter_name} ({formatTimeAgo(report?.created_at)})
                  </p>
                </div>

                <div className="rep-form-group">
                  <label className="rep-form-label">
                    {showActionModal === 'ACCEPT' ? 'Revision Note / Action Plan (Optional):' : 'Rejection Reason (Required):'}
                    <span style={{ fontSize: '12px', color: 'var(--rep-text-muted)' }}>
                      {resolutionNote.length}/500
                    </span>
                  </label>
                  <textarea
                    className="rep-form-textarea"
                    placeholder={
                      showActionModal === 'ACCEPT'
                        ? 'e.g., Confirmed translation error on page 3. Re-assigned to translator for immediate revision...'
                        : 'Explain why the translation is accurate or why this report is invalid...'
                    }
                    value={resolutionNote}
                    onChange={e => setResolutionNote(e.target.value.slice(0, 500))}
                    required={showActionModal === 'REJECT'}
                    autoFocus
                  />
                </div>
              </div>

              <div className="rep-modal-footer">
                <button
                  type="button"
                  className="rep-btn rep-btn-ghost"
                  onClick={() => setShowActionModal(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`rep-btn ${showActionModal === 'ACCEPT' ? 'rep-btn-success' : 'rep-btn-danger'}`}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : (showActionModal === 'ACCEPT' ? 'Confirm Approval' : 'Confirm Rejection')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
