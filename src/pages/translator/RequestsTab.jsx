// =============================================================================
// Tab 3: Join Requests
// =============================================================================
import { useTheme } from '../../context/ThemeContext';

function RequestsTab({ joinRequests = [], onApprove, onReject, onBan }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const handleDownloadCv = async (e, url, rawName) => {
    e.preventDefault();
    if (!url) return;

    let fileName = rawName || 'Applicant_CV_Resume.pdf';
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf';
    }

    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      
      const blobUrl = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('[RequestsTab] Direct Blob download fallback:', err);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="join-requests-tab-container fade-in">
      <h3 className="requests-count-header" style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
        {joinRequests.length} requests pending review
      </h3>

      {joinRequests.length === 0 ? (
        <div className="translator-empty-state">
          <h3 style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>No pending recruitment requests</h3>
          <p style={{ color: isLight ? '#64748b' : '#94a3b8' }}>New request applications will appear here when users apply.</p>
        </div>
      ) : (
        joinRequests.map(req => {
          const cvLink = req.cvUrl || req.cv_url || req.cvFile || req.attachmentUrl;
          const rawCvName = req.cvFileName || req.cv_file_name || req.fileName || 'Applicant_CV_Resume.pdf';
          const cvName = rawCvName.toLowerCase().endsWith('.pdf') ? rawCvName : `${rawCvName}.pdf`;
          
          const roleList = Array.isArray(req.roles) 
            ? req.roles 
            : (typeof req.roles === 'string' ? req.roles.split(',') : ['Member']);

          return (
            <div
              className={`request-card-item ${isLight ? 'light-card' : 'dark-card'}`}
              key={req.id || `req-${Math.random()}`}
              style={{
                background: isLight ? '#ffffff' : 'linear-gradient(135deg, rgba(26, 22, 37, 0.95) 0%, rgba(17, 13, 26, 0.98) 100%)',
                border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isLight ? '0 4px 20px rgba(0, 0, 0, 0.05)' : '0 8px 32px rgba(0, 0, 0, 0.25)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '18px'
              }}
            >
              <div className="request-header">
                <div className="chat-avatar" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', color: '#ffffff', fontWeight: '800', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 12px rgba(168, 85, 247, 0.4)' }}>
                  {req.avatar || (req.name || 'U').substring(0, 2).toUpperCase()}
                </div>
                <div className="post-header-info">
                  <span className="member-name-text" style={{ fontSize: '16px', fontWeight: '700', color: isLight ? '#0f172a' : '#ffffff', letterSpacing: '0.02em' }}>
                    {req.name || 'Applicant'}
                  </span>
                  <span className="post-time" style={{ fontSize: '12px', color: isLight ? '#64748b' : '#a78bfa', marginLeft: '10px' }}>
                    {req.time ? new Date(req.time).toLocaleString() : 'Recently'}
                  </span>
                </div>
              </div>

              {/* Cover Note / Application Message */}
              <div
                className="request-message"
                style={{
                  margin: '14px 0 16px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: isLight ? '#334155' : '#cbd5e1',
                  background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                  border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '12px 16px',
                  borderRadius: '10px'
                }}
              >
                "{req.text || req.message || 'No introductory message provided.'}"
              </div>

              {/* Applicant Stats */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap'
              }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    color: isLight ? '#475569' : '#cbd5e1',
                    border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)'
                  }} title="Number of active project teams this user is currently in">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
                      <polyline points="14 2 14 8 20 8" />
                      <path d="M3 15h6" />
                      <path d="M3 18h6" />
                    </svg>
                    <span>Active Projects: <strong style={{color: ((req.activeProjectsCount || 0) > 3) ? '#f59e0b' : (isLight ? '#0f172a' : '#fff')}}>{req.activeProjectsCount || 0}</strong></span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    color: isLight ? '#475569' : '#cbd5e1',
                    border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)'
                  }} title="Number of incomplete tasks assigned to this user across all teams">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 11 12 14 22 4"></polyline>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                    <span>Active Tasks: <strong style={{color: ((req.activeTasksCount || 0) > 10) ? '#ef4444' : ((req.activeTasksCount || 0) > 5 ? '#f59e0b' : (isLight ? '#0f172a' : '#fff'))}}>{req.activeTasksCount || 0}</strong></span>
                  </div>
                </div>

              {/* CV / Resume Attachment Link */}
              {cvLink ? (
                <div className="request-cv-attachment" style={{
                  marginTop: '14px',
                  marginBottom: '16px',
                  padding: '14px 18px',
                  background: isLight ? '#f3e8ff' : 'rgba(168, 85, 247, 0.08)',
                  border: isLight ? '1px solid #d8b4fe' : '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: isLight ? '0 2px 10px rgba(126, 34, 206, 0.06)' : '0 4px 16px rgba(0,0,0,0.2)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: isLight ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      📄
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: isLight ? '#7e22ce' : '#c084fc' }}>
                        {cvName}
                      </span>
                      <span style={{ display: 'block', fontSize: '11.5px', color: isLight ? '#64748b' : '#cbd5e1', marginTop: '2px' }}>
                        Attached Portfolio / Resume CV Document (PDF Format)
                      </span>
                    </div>
                  </div>

                  <a
                    href={cvLink}
                    onClick={(e) => handleDownloadCv(e, cvLink, cvName)}
                    className="trans-btn icon-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    View / Download CV
                  </a>
                </div>
              ) : (
                <div style={{ marginBottom: '14px', fontSize: '12.5px', color: isLight ? '#64748b' : '#94a3b8', fontStyle: 'italic' }}>
                  ℹ️ No CV file attached with this application.
                </div>
              )}


              {/* Actions */}
              <div className="request-actions-row" style={{ display: 'flex', gap: '8px' }}>
                <button className="trans-btn primary" onClick={() => onApprove(req.id, req.name, req)} style={{ padding: '8px 20px', fontWeight: '700' }}>
                  ✓ Approve
                </button>
                <button
                  className="trans-btn secondary"
                  onClick={() => onReject(req.id, req.name, req)}
                  style={{
                    padding: '8px 20px',
                    background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.05)',
                    color: isLight ? '#f59e0b' : '#fbbf24',
                    borderColor: isLight ? '#fde68a' : 'rgba(245, 158, 11, 0.3)'
                  }}
                >
                  ✕ Reject
                </button>
                <button
                  className="trans-btn secondary"
                  onClick={() => onBan && onBan(req.requesterId, req.name, req.id)}
                  style={{
                    padding: '8px 20px',
                    background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.05)',
                    color: isLight ? '#dc2626' : '#ef4444',
                    borderColor: isLight ? '#fca5a5' : 'rgba(239, 68, 68, 0.3)'
                  }}
                >
                  🚫 Ban
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default RequestsTab;