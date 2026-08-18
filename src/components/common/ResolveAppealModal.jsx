import { useState } from 'react'
import { toast } from 'react-toastify'
import { resolveAppealApi } from '../../services/api/AppealApi'

function ResolveAppealModal({ isOpen, onClose, ticket, onSuccess }) {
  const [resolvedReason, setResolvedReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !ticket) return null

  const handleResolve = async (status) => {
    if (!resolvedReason.trim()) {
      toast.error('Please provide a reason for your resolution.')
      return
    }

    try {
      setIsSubmitting(true)
      await resolveAppealApi(ticket.id, {
        status,
        resolvedReason
      })
      try {
        const comicId = ticket.targetId || ticket.comicId
        if (comicId) {
          const existing = JSON.parse(localStorage.getItem('appealedComics') || '[]')
          const updated = existing.filter((id) => String(id) !== String(comicId))
          localStorage.setItem('appealedComics', JSON.stringify(updated))
          
          // CRITICAL: Clear localStorage comic cache so restored data from backend is displayed
          localStorage.removeItem('comiverse_local_comic_' + comicId)
          
          window.dispatchEvent(new Event('appealStateChanged'))
        }
      } catch (e) {
        console.error('Error clearing local appeal state:', e)
      }
      toast.success(`Appeal has been marked as ${status}.`)
      onSuccess && onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve appeal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-content glass-panel" style={contentStyle}>
        <div style={headerStyle}>
          <h2>Resolve Appeal: {ticket.targetName}</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={bodyStyle}>
          {/* Split Screen Concept */}
          <div style={splitContainerStyle}>
            {/* Left Side: Author's Appeal */}
            <div style={panelStyle}>
              <h3 style={panelTitleStyle}>Author's Appeal</h3>
              <div style={dataRowStyle}>
                <span style={labelStyle}>Target Type:</span>
                <span style={valueStyle}>{ticket.targetType}</span>
              </div>
              <div style={dataRowStyle}>
                <span style={labelStyle}>Appeal Reason:</span>
                <p style={paragraphStyle}>{ticket.appealReason}</p>
              </div>
              {ticket.evidenceUrls && (
                <div style={dataRowStyle}>
                  <span style={labelStyle}>Evidence:</span>
                  <a href={ticket.evidenceUrls} target="_blank" rel="noreferrer" style={linkStyle}>View Evidence</a>
                </div>
              )}
            </div>

            {/* Right Side: Resolution Form */}
            <div style={panelStyle}>
              <h3 style={panelTitleStyle}>Moderator Decision</h3>
              <div className="glass-input-wrapper">
                <span className="glass-input-label">RESOLUTION REASON *</span>
                <textarea 
                  className="glass-input-field" 
                  rows="4"
                  placeholder="Explain why you are accepting or rejecting..."
                  value={resolvedReason}
                  onChange={(e) => setResolvedReason(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={actionsContainerStyle}>
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => handleResolve('APPROVED')}
                  style={{...actionBtnStyle, backgroundColor: '#22c55e', color: '#fff'}}
                >
                  Accept & Revert
                </button>
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => handleResolve('RESOLVED')}
                  style={{...actionBtnStyle, backgroundColor: '#f59e0b', color: '#fff'}}
                >
                  Manual Edit
                </button>
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => handleResolve('REJECTED')}
                  style={{...actionBtnStyle, backgroundColor: '#ef4444', color: '#fff'}}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inline styles for the modal structure
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, backdropFilter: 'blur(4px)'
}

const contentStyle = {
  width: '100%', maxWidth: '800px',
  backgroundColor: '#161122', 
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px', overflow: 'hidden',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
}

const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
}

const closeBtnStyle = {
  background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer'
}

const bodyStyle = { padding: '24px' }

const splitContainerStyle = {
  display: 'flex', gap: '24px',
}

const panelStyle = {
  flex: 1, backgroundColor: 'rgba(255,255,255,0.03)',
  padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)'
}

const panelTitleStyle = { fontSize: '16px', color: '#fff', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }

const dataRowStyle = { marginBottom: '12px' }
const labelStyle = { display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase' }
const valueStyle = { color: '#e2e8f0', fontSize: '14px', fontWeight: '500' }
const paragraphStyle = { color: '#e2e8f0', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }
const linkStyle = { color: '#a855f7', textDecoration: 'none' }

const actionsContainerStyle = { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }
const actionBtnStyle = { padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }

export default ResolveAppealModal
