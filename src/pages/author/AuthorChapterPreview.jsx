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

function resolveRejectionInfo(preview, comicId) {
  let isRejected = false;
  const statusStr = String(preview?.status || preview?.moderationStatus || '').toUpperCase();
  if (statusStr === 'REJECTED') {
    isRejected = true;
  }

  let reason = preview?.rejectionReason || preview?.rejection_reason || preview?.rejectionNote || preview?.reason || preview?.notes || '';
  let docComments = [];

  // Try fetching from localStorage overrides
  try {
    const rawOverrides = localStorage.getItem('comiverse_moderator_submissions_override');
    if (rawOverrides) {
      const overrides = JSON.parse(rawOverrides);
      if (Array.isArray(overrides)) {
        const match = overrides.find(o => {
          const st = String(o.status || '').toUpperCase();
          const matchId = (preview?.id && String(o.id) === String(preview.id)) || (preview?.submissionId && String(o.submissionId) === String(preview.submissionId));
          const matchComicId = (comicId && (String(o.comicId) === String(comicId) || String(o.id) === String(comicId)));
          return st === 'REJECTED' && (matchId || matchComicId);
        }) || overrides.find(o => String(o.status || '').toUpperCase() === 'REJECTED');

        if (match) {
          isRejected = true;
          if (match.rejectionReason) reason = match.rejectionReason;
        }
      }
    }
  } catch (e) {}

  // Try fetching pinned comments from localStorage
  try {
    const rawCommentsMap = localStorage.getItem('comiverse_moderator_doc_comments');
    if (rawCommentsMap) {
      const commentsMap = JSON.parse(rawCommentsMap);
      Object.keys(commentsMap).forEach(key => {
        if (
          (preview?.id && key.includes(String(preview.id))) ||
          (preview?.submissionId && key.includes(String(preview.submissionId))) ||
          (comicId && key.includes(String(comicId)))
        ) {
          docComments = [...docComments, ...(commentsMap[key] || [])];
        }
      });

      if (docComments.length === 0) {
        Object.values(commentsMap).forEach(arr => {
          if (Array.isArray(arr)) docComments.push(...arr);
        });
      }
    }
  } catch (e) {}

  return { isRejected, reason, docComments };
}

function parseRejectionPins(reason, docComments = []) {
  let overall = (reason || '').trim();
  const pagePins = {};
  const otherPins = [];

  if (reason && reason.includes('--- DETAILED INSPECTION FEEDBACK REPORT')) {
    const reportSplit = reason.split('--- DETAILED INSPECTION FEEDBACK REPORT');
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

  if (Array.isArray(docComments)) {
    docComments.forEach(c => {
      const label = c.targetLabel || 'Page comment';
      const text = c.text;
      const pageMatch = (c.targetKey || '').match(/page-(\d+)/i) || label.match(/Page\s+(\d+)/i);
      if (pageMatch) {
        const pageNum = parseInt(pageMatch[1], 10);
        if (!pagePins[pageNum]) pagePins[pageNum] = [];
        if (!pagePins[pageNum].includes(text)) {
          pagePins[pageNum].push(text);
        }
      } else {
        if (!otherPins.some(p => p.text === text)) {
          otherPins.push({ label, text });
        }
      }
    });
  }

  return { overall, pagePins, otherPins };
}

const normalizePage = (page, idx) => {
  const url = typeof page === 'string' ? page : (page?.imageUrl || page?.url || page?.pageUrl || '');
  const number = (typeof page === 'object' && page?.pageNumber) ? page.pageNumber : (idx + 1);
  return { url, number };
};

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

  const rawPages = normalizeArrayResponse(preview?.pages)
  const pages = rawPages.map((p, idx) => normalizePage(p, idx))

  const { isRejected, reason, docComments } = resolveRejectionInfo(preview, comicId)
  const { overall, pagePins, otherPins } = parseRejectionPins(reason, docComments)

  return (
    <div className="author-preview-fullscreen" style={{ minHeight: '100vh', background: '#0d0919', color: '#fff' }}>
      <header className="author-preview-header" style={{
        position: 'sticky', top: 0, zIndex: 100, background: '#141024', 
        padding: '16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            className="btn-author-action" 
            onClick={() => navigate(`/author/comics/${comicId}`)}
            style={{ background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ccc' }}
          >
            ← Back to Comic
          </button>
          <div>
            <h1 style={{ fontSize: '18px', margin: 0 }}>Preview · Chapter {getChapterNumber(preview)}</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>{pages.length} pages ready in preview reader.</p>
          </div>
        </div>
        
        <div className="author-view-toggle">
          <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Grid</button>
          <button type="button" className={viewMode === 'scroll' ? 'active' : ''} onClick={() => setViewMode('scroll')}>Scroll</button>
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: viewMode === 'grid' ? '1200px' : '900px', margin: '0 auto' }}>
        {isRejected && (
          <div className="author-rejection-card" style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(153, 27, 27, 0.3) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '28px',
            boxShadow: '0 12px 36px rgba(239, 68, 68, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '22px' }}>⛔</span>
              <h3 style={{ margin: 0, color: '#fca5a5', fontSize: '17px', fontWeight: '700' }}>
                Chapter Rejected by Moderator — Action Required
              </h3>
            </div>

            <div style={{ fontSize: '14px', color: '#f8fafc', lineHeight: '1.6', marginBottom: '16px', background: 'rgba(0,0,0,0.35)', padding: '14px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <strong style={{ color: '#fca5a5' }}>Moderator Overall Note:</strong>
              <p style={{ margin: '6px 0 0 0', whiteSpace: 'pre-wrap', color: '#e2e8f0', fontSize: '13.5px' }}>
                {overall || 'No overall remarks provided. Please inspect flagged page feedback below.'}
              </p>
            </div>

            {otherPins.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <strong style={{ fontSize: '12.5px', color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Specific Section Comments ({otherPins.length}):
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  {otherPins.map((pin, i) => (
                    <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', borderLeft: '3px solid #ef4444' }}>
                      <span style={{ fontWeight: '700', color: '#f87171' }}>[{pin.label}]</span>: {pin.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {pages.length === 0 ? (
          <div className="author-empty-state small">No page URL was returned for this chapter.</div>
        ) : viewMode === 'grid' ? (
          <div className="author-page-preview-grid">
            {pages.map((page) => (
              <figure key={page.number} style={{ position: 'relative' }}>
                <img src={page.url} alt={`Page ${page.number}`} />
                <figcaption>Page {page.number}</figcaption>
                {isRejected && pagePins[page.number] && pagePins[page.number].length > 0 && (
                  <div style={{ background: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', position: 'absolute', top: '8px', right: '8px' }}>
                    📌 {pagePins[page.number].length} Feedback
                  </div>
                )}
              </figure>
            ))}
          </div>
        ) : (
          <div className="author-page-preview-scroll">
            {pages.map((page) => (
              <div key={page.number} className="author-scroll-page-container" style={{ position: 'relative', marginBottom: '28px' }}>
                <img src={page.url} alt={`Page ${page.number}`} style={{ width: '100%', borderRadius: '8px', display: 'block' }} />
                
                <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', backdropFilter: 'blur(4px)' }}>
                  Page {page.number}
                </div>

                {isRejected && pagePins[page.number] && pagePins[page.number].length > 0 && (
                  <div className="author-page-pin-overlay" style={{
                    position: 'absolute', bottom: '16px', left: '16px', right: '16px',
                    background: 'rgba(15, 10, 24, 0.94)', backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '10px',
                    padding: '12px 16px', boxShadow: '0 12px 30px rgba(0,0,0,0.6)'
                  }}>
                    <div style={{ color: '#fca5a5', fontWeight: '700', fontSize: '13px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📌</span> Moderator Page {page.number} Feedback ({pagePins[page.number].length}):
                    </div>
                    {pagePins[page.number].map((msg, idx) => (
                      <div key={idx} style={{ color: '#f8fafc', fontSize: '13px', lineHeight: '1.4', marginTop: idx > 0 ? '6px' : '0', paddingLeft: '8px', borderLeft: '2px solid #ef4444' }}>
                        • {msg}
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
