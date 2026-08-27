import { useEffect, useRef, useState } from 'react'

function getBubbleBoundingBox(selection) {
  if (selection.shape === 'polygon' && selection.points?.length) {
    const xs = selection.points.map((p) => p.x)
    const ys = selection.points.map((p) => p.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY }
  }
  return { x: selection.x, y: selection.y, width: selection.width, height: selection.height }
}

function BubbleOverlay({ bubbles, displayedHeightPx }) {
  if (!Array.isArray(bubbles) || bubbles.length === 0) return null
  // Avoid a flash of oversized/default-sized text before the container has
  // actually been measured (e.g. right on first paint before ResizeObserver
  // fires) — better to render nothing for one frame than to show text at
  // the wrong size.
  if (!displayedHeightPx) return null

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
        const box = getBubbleBoundingBox(sel)
        const shapeStyle =
          sel.shape === 'ellipse'
            ? { borderRadius: '50%' }
            : sel.shape === 'polygon' && Array.isArray(sel.points) && sel.points.length > 0 && box.width > 0 && box.height > 0
            ? {
                clipPath: `polygon(${sel.points
                  .map((p) => `${((p.x - box.x) / box.width) * 100}% ${((p.y - box.y) / box.height) * 100}%`)
                  .join(', ')})`,
              }
            : {}

        // sel.fontSize is stored as a percentage of the displayed image
        // height (same basis used throughout the translate/review
        // workspaces) — convert it to real pixels using the page's actual
        // measured height, instead of relying on CSS container-query units
        // (cqh), which turned out to render text far too large — very
        // likely falling back to the browser/body default font-size
        // whenever the container-query context wasn't reliably established.
        const fontSizePct = typeof sel.fontSize === 'number' ? sel.fontSize : 1.2
        const fontSizePx = (fontSizePct / 100) * displayedHeightPx

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
              boxSizing: 'border-box',
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
        )
      })}
    </div>
  )
}

/**
 * Reusable, high-performance copy-protected comic page canvas.
 * Handles lazy loading, secure in-memory decryption, rendering to canvas,
 * and immediate Object URL cleanup to prevent link harvesting.
 * 
 * @param {Object} props
 * @param {string} props.src URL of the image
 * @param {number} props.pageIndex The index of the page (for alt/logging)
 * @param {boolean} [props.isEncrypted=false] If true, decrypts the stream before rendering
 * @param {number} [props.xorKey=0x5A] The XOR decryption key to use
 * @param {string} [props.fallbackSrc] Backup URL to use if loading fails
 */
function ComicPageCanvas({ src, pageIndex, isEncrypted = false, xorKey = 0x5A, fallbackSrc, bubbles }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const pageFrameRef = useRef(null)
  
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [displayedHeightPx, setDisplayedHeightPx] = useState(0)

  // Bubble coords are % of the displayed image, not the outer wrapper
  // (which has minHeight + flex centering). Measure the canvas frame.
  useEffect(() => {
    if (loading || error) return
    const el = pageFrameRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = (height) => {
      if (height > 0) setDisplayedHeightPx(height)
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        update(entry.contentRect.height)
      }
    })
    observer.observe(el)
    update(el.clientHeight)
    return () => observer.disconnect()
  }, [loading, error])

  // Intersection Observer for Lazy Loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '400px 0px', // Start loading when page is within 400px of viewport
        threshold: 0.01,
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current)
      }
    }
  }, [])

  // Render / Decrypt loop
  useEffect(() => {
    if (!isVisible || !src) return

    let isAborted = false
    let objectUrl = null

    const renderImage = async () => {
      setLoading(true)
      setError(false)

      try {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let imgElement = new Image()

        // Decryption Flow: Fetch -> Decrypt -> Object URL -> Draw
        const attemptSecureRender = async () => {
          const response = await fetch(src, { mode: 'cors' })
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`)
          }

          const arrayBuffer = await response.arrayBuffer()
          if (isAborted) return

          let processedBuffer = arrayBuffer
          if (isEncrypted) {
            // Memory-safe simple XOR decryption
            const view = new Uint8Array(arrayBuffer)
            const decrypted = new Uint8Array(view.length)
            for (let i = 0; i < view.length; i++) {
              decrypted[i] = view[i] ^ xorKey
            }
            processedBuffer = decrypted.buffer
          }

          const blob = new Blob([processedBuffer], { type: 'image/jpeg' })
          objectUrl = URL.createObjectURL(blob)

          await new Promise((resolve, reject) => {
            imgElement.onload = resolve
            imgElement.onerror = () => reject(new Error('Decrypted blob load failed'))
            imgElement.src = objectUrl
          })
        }

        // Fallback Flow: Load directly into Image element (e.g. for external URLs with CORS or fetch failure)
        const attemptFallbackRender = async (errorMsg) => {
          console.warn(`Secure fetch/decryption failed for page ${pageIndex + 1}: ${errorMsg}. Falling back to standard image rendering.`)
          
          imgElement = new Image()
          imgElement.crossOrigin = 'anonymous'
          imgElement.src = src

          await new Promise((resolve, reject) => {
            imgElement.onload = resolve
            imgElement.onerror = () => {
              if (fallbackSrc) {
                console.warn(`Primary image failed, attempting fallback source.`)
                imgElement.src = fallbackSrc
                imgElement.onload = resolve
                imgElement.onerror = () => reject(new Error('Both primary and fallback images failed to load'))
              } else {
                reject(new Error('Image failed to load'))
              }
            }
          })
        }

        try {
          await attemptSecureRender()
        } catch (secErr) {
          if (isAborted) return
          // Clean up object URL if it was created before error
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl)
            objectUrl = null
          }
          // Attempt fallback load
          await attemptFallbackRender(secErr.message)
        }

        if (isAborted) return

        // Set canvas backing store size to match natural image size
        canvas.width = imgElement.naturalWidth || 800
        canvas.height = imgElement.naturalHeight || 1200

        // Draw image onto Canvas
        ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height)
        setLoading(false)

      } catch (err) {
        console.error(`Error rendering page ${pageIndex + 1}:`, err)
        if (!isAborted) {
          setError(true)
          setLoading(false)
        }
      } finally {
        // Crucial Layer 4 Requirement: Clean up ObjectURL immediately after rendering
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
        }
      }
    }

    renderImage()

    return () => {
      isAborted = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [src, isVisible, isEncrypted, xorKey, pageIndex, fallbackSrc])

  return (
    <div
      ref={containerRef}
      className="chapter-page-image-wrapper no-select no-pointer"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        minHeight: '400px',
        backgroundColor: 'var(--chapter-bg)'
      }}
    >
      {/* Loading Shimmer */}
      {loading && (
        <div 
          className="skeleton-shimmer" 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'var(--chapter-control-bg)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10
          }}
        >
          <div className="reader-spinner" style={{ width: '32px', height: '32px' }}></div>
        </div>
      )}

      {/* Error state */}
      {error ? (
        <div style={{ padding: '40px', color: '#ef4444', textAlign: 'center', zIndex: 5 }}>
          <p style={{ fontSize: '24px', margin: '0 0 8px' }}>⚠️</p>
          <p style={{ fontSize: '13px' }}>Failed to load page {pageIndex + 1}</p>
        </div>
      ) : (
        <div
          ref={pageFrameRef}
          className="chapter-page-frame"
          style={{
            position: 'relative',
            width: '100%',
            lineHeight: 0,
            maxWidth: '100%',
            height: 'auto',
            display: loading ? 'none' : 'block',
            // Layer 2 requirements:
            pointerEvents: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            msUserSelect: 'none'
          }}
        >
          <canvas
            ref={canvasRef}
            className="chapter-page-canvas no-select no-pointer no-drag"
            draggable="false"
            style={{
              width: '100%',
              maxWidth: '100%',
              height: 'auto',
              display: loading ? 'none' : 'block',
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              msUserSelect: 'none'
            }}
          />
          {!loading && <BubbleOverlay bubbles={bubbles} displayedHeightPx={displayedHeightPx} />}
        </div>
      )}
    </div>
  )
}

export default ComicPageCanvas