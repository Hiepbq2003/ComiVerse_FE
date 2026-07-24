// =============================================================================
// Tab 3: Join Requests
// =============================================================================

function RequestsTab({ joinRequests = [], onApprove, onReject }) {
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
      <h3 className="requests-count-header">{joinRequests.length} requests pending review</h3>

      {joinRequests.length === 0 ? (
        <div className="translator-empty-state">
          <h3>No pending recruitment requests</h3>
          <p>New request applications will appear here when users apply.</p>
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
            <div className="request-card-item" key={req.id || `req-${Math.random()}`} style={{ marginBottom: '16px' }}>
              <div className="request-header">
                <div className="chat-avatar" style={{ background: '#7c3aed', color: '#ffffff', fontWeight: '700' }}>
                  {req.avatar || (req.name || 'U').substring(0, 2).toUpperCase()}
                </div>
                <div className="post-header-info">
                  <span className="member-name-text" style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
                    {req.name || 'Applicant'}
                  </span>
                  <span className="post-time" style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '10px' }}>
                    {req.time ? new Date(req.time).toLocaleString() : 'Recently'}
                  </span>
                </div>
              </div>

              {/* Cover Note / Application Message */}
              <div className="request-message" style={{ margin: '12px 0', fontSize: '14px', color: '#e2e8f0', fontStyle: 'italic' }}>
                "{req.text || req.message || 'No introductory message provided.'}"
              </div>

              {/* CV / Resume Attachment Link */}
              {cvLink ? (
                <div className="request-cv-attachment" style={{
                  marginTop: '12px',
                  marginBottom: '14px',
                  padding: '12px 16px',
                  background: 'rgba(168, 85, 247, 0.08)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: 'rgba(168, 85, 247, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      📄
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#c084fc' }}>
                        {cvName}
                      </span>
                      <span style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', marginTop: '2px' }}>
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
                <div style={{ marginBottom: '12px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                  ℹ️ No CV file attached with this application.
                </div>
              )}

              {/* Roles Badges */}
              <div className="request-role-tags" style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                {roleList.map((r, i) => (
                  <span className="role-tag" key={i} style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#e2e8f0',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: '600'
                  }}>
                    {r}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="request-actions-row" style={{ display: 'flex', gap: '10px' }}>
                <button className="trans-btn primary" onClick={() => onApprove(req.id, req.name, req)}>
                  ✓ Approve
                </button>
                <button className="trans-btn secondary" onClick={() => onReject(req.id, req.name, req)}>
                  ✕ Reject
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