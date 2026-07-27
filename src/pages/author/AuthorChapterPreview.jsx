import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom'
import { getAuthorComicChaptersApi } from '../../services/api/AuthorComicApi'
import { useAuth } from '../../context/AuthContext'
import '../../assets/style/author/comics.css'

const normalizeArrayResponse = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.content)) return payload.content
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

function getChapterNumber(chapter) {
  if (!chapter) return ''
  return chapter.chapterNumber || chapter.number || chapter.order || 'N/A'
}

function parseRejectionPins(reason) {
  if (!reason) return { overall: reason, pagePins: {}, otherPins: [] };
  
  let overall = reason;
  const pagePins = {};
  const otherPins = [];
  
  const reportSplit = reason.split('--- DETAILED INSPECTION FEEDBACK REPORT');
  if (reportSplit.length > 1) {
    overall = reportSplit[0].trim();
    const details = reportSplit[1];
    
    const regex = /\[(.*?)\]:\s*(.+)/g;
    let match;
    while ((match = regex.exec(details)) !== null) {
      const label = match[1].trim();
      const text = match[2].trim();
      
      const pageMatch = label.match(/Page\s+(\d+)/i);
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[1], 10);
        if (!pagePins[pageNum]) pagePins[pageNum] = [];
        pagePins[pageNum].push(text);
      } else {
        otherPins.push({ label, text });
      }
    }
  }
  return { overall, pagePins, otherPins };
}

export default function AuthorChapterPreview() {
  const { comicId, chapterId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [preview, setPreview] = useState(location.state?.preview || null)
  const [viewMode, setViewMode] = useState('scroll')
  const [loading, setLoading] = useState(!preview)

  useEffect(() => {
    // Basic auth check
    if (!user || user.role?.toUpperCase() !== 'AUTHOR') {
      navigate('/', { replace: true })
      return
    }

    if (!preview) {
      // Fetch chapter if not provided in state
      const fetchChapter = async () => {
        try {
          const res = await getAuthorComicChaptersApi(comicId)
          if (res.status === 'fulfilled') {
            const chapters = normalizeArrayResponse(res.value)
            const found = chapters.find((c) => c.id === chapterId || c.chapterId === chapterId)
            if (found) {
              setPreview(found)
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

  const pages = normalizeArrayResponse(preview?.pages)
  const isRejected = preview.status === 'rejected' || preview.moderationStatus === 'REJECTED'
  const { overall, pagePins, otherPins } = parseRejectionPins(preview.rejectionReason)

  return (
    <div className="author-preview-fullscreen" style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <header className="author-preview-header" style={{
        position: 'sticky', top: 0, zIndex: 100, background: '#141414', 
        padding: '16px 24px', borderBottom: '1px solid #333',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            className="btn-author-action" 
            onClick={() => navigate(`/author/comics/${comicId}`)}
            style={{ background: 'transparent', border: '1px solid #444', color: '#ccc' }}
          >
            ← Back to Comic
          </button>
          <div>
            <h1 style={{ fontSize: '18px', margin: 0 }}>Preview · Chapter {getChapterNumber(preview)}</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>{pages.length} pages returned from backend upload.</p>
          </div>
        </div>
        
        <div className="author-view-toggle">
          <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Grid</button>
          <button type="button" className={viewMode === 'scroll' ? 'active' : ''} onClick={() => setViewMode('scroll')}>Scroll</button>
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: viewMode === 'grid' ? '1200px' : '100%', margin: '0 auto' }}>
        {isRejected && (overall || otherPins.length > 0) && (
          <div className="author-alert error" style={{ marginBottom: '20px', maxWidth: '800px', margin: '0 auto 24px auto' }}>
            <strong>Reason for Rejection:</strong> {overall || 'No reason provided.'}
            {otherPins.map((pin, i) => (
              <div key={i} style={{ marginTop: '8px' }}>
                <span style={{ fontWeight: '600', color: '#ff4d4f' }}>[{pin.label}]</span>: {pin.text}
              </div>
            ))}
          </div>
        )}

        {pages.length === 0 ? (
          <div className="author-empty-state small">No page URL was returned for this chapter.</div>
        ) : viewMode === 'grid' ? (
          <div className="author-page-preview-grid">
            {pages.map((page) => (
              <figure key={page.id || page.pageNumber || page.imageUrl}>
                <img src={page.imageUrl} alt={`Page ${page.pageNumber}`} />
                <figcaption>Page {page.pageNumber}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="author-page-preview-scroll">
            {pages.map((page) => (
              <div key={page.id || page.pageNumber || page.imageUrl} className="author-scroll-page-container">
                <img src={page.imageUrl} alt={`Page ${page.pageNumber}`} />
                
                {isRejected && pagePins[page.pageNumber] && pagePins[page.pageNumber].length > 0 && (
                  <div className="author-page-pin-overlay">
                    {pagePins[page.pageNumber].map((msg, idx) => (
                      <div key={idx} className="author-pin-message">
                        <strong>Moderator:</strong> {msg}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
