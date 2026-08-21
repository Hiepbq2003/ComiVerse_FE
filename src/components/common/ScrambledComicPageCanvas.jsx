import { useEffect, useRef, useState } from 'react';
import useScrambledImageDecoder from '../../hooks/useScrambledImageDecoder';

function getBubbleBoundingBox(selection) {
  if (selection.shape === 'polygon' && selection.points?.length) {
    const xs = selection.points.map((p) => p.x);
    const ys = selection.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
  }
  return { x: selection.x, y: selection.y, width: selection.width, height: selection.height };
}

function BubbleOverlay({ bubbles, displayedHeightPx }) {
  if (!Array.isArray(bubbles) || bubbles.length === 0) return null;
  if (!displayedHeightPx) return null;

  return (
    <div
      className="chapter-page-bubble-overlay no-select no-pointer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {bubbles.map((sel, i) => {
        const box = getBubbleBoundingBox(sel);
        const shapeStyle =
          sel.shape === 'ellipse'
            ? { borderRadius: '50%' }
            : sel.shape === 'polygon' && Array.isArray(sel.points) && sel.points.length > 0 && box.width > 0 && box.height > 0
            ? {
                clipPath: `polygon(${sel.points
                  .map((p) => `${((p.x - box.x) / box.width) * 100}% ${((p.y - box.y) / box.height) * 100}%`)
                  .join(', ')})`,
              }
            : {};

        const fontSizePct = typeof sel.fontSize === 'number' ? sel.fontSize : 1.2;
        const fontSizePx = (fontSizePct / 100) * displayedHeightPx;

        return (
          <div
            key={sel.id || i}
            className="chapter-page-bubble"
            style={{
              position: 'absolute',
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
              background: sel.textBgColor || '#ffffff',
              color: sel.textColor || '#000000',
              fontWeight: sel.isBold ? 700 : 400,
              fontStyle: sel.isItalic ? 'italic' : 'normal',
              textAlign: sel.textAlign || 'center',
              fontFamily: sel.fontFamily || undefined,
              fontSize: `${fontSizePx}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              lineHeight: 1.2,
              borderRadius: sel.shape === 'ellipse' ? undefined : '4px',
              ...shapeStyle,
            }}
          >
            {sel.translation || ''}
          </div>
        );
      })}
    </div>
  );
}

/**
 * High-performance, copy-protected canvas component for scrambled comic pages.
 * Decrypts AES mapping, reassembles image slices from Cloudinary CDN on Canvas,
 * and enforces right-click, selection, and drag protection.
 */
function ScrambledComicPageCanvas({
  pageNumber,
  scrambledImageUrl,
  cols = 4,
  rows = 4,
  encryptedMapping,
  secretKey,
  bubbles,
  fallbackSrc
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const [isVisible, setIsVisible] = useState(false);
  const [displayedHeightPx, setDisplayedHeightPx] = useState(0);

  const { loading, error, isRendered, drawToCanvas } = useScrambledImageDecoder({
    scrambledImageUrl,
    cols,
    rows,
    encryptedMapping,
    secretKey,
    enabled: isVisible
  });

  // Measure container height for overlay scaling
  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDisplayedHeightPx(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '400px 0px',
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  // Trigger canvas draw when element becomes visible
  useEffect(() => {
    if (isVisible && canvasRef.current) {
      drawToCanvas(canvasRef.current);
    }
  }, [isVisible, drawToCanvas]);

  return (
    <div
      ref={containerRef}
      className="chapter-page-image-wrapper no-select no-pointer"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        backgroundColor: 'var(--chapter-bg)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      {/* Loading State Shimmer */}
      {loading && (
        <div
          className="skeleton-shimmer"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'var(--chapter-control-bg, #1e1e2d)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            zIndex: 10,
          }}
        >
          <div className="reader-spinner" style={{ width: '32px', height: '32px' }}></div>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>
            Reassembling Page {pageNumber}...
          </span>
        </div>
      )}

      {/* Error state */}
      {error ? (
        <div style={{ padding: '40px', color: '#ef4444', textAlign: 'center', zIndex: 5 }}>
          <p style={{ fontSize: '28px', margin: '0 0 8px' }}>⚠️</p>
          <p style={{ fontSize: '14px', fontWeight: '600' }}>Failed to load & reassemble Page {pageNumber}</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{error}</p>
        </div>
      ) : (
        /* Protected HTML5 Canvas Element */
        <canvas
          ref={canvasRef}
          className="chapter-page-canvas no-select no-pointer no-drag"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          style={{
            width: '100%',
            height: 'auto',
            display: loading ? 'none' : 'block',
            pointerEvents: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            msUserSelect: 'none',
          }}
        />
      )}

      {!loading && !error && isRendered && (
        <BubbleOverlay bubbles={bubbles} displayedHeightPx={displayedHeightPx} />
      )}
    </div>
  );
}

export default ScrambledComicPageCanvas;
