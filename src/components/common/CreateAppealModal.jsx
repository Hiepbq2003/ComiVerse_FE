import { useState } from 'react'
import { toast } from 'react-toastify'
import { createAppealApi } from '../../services/api/AppealApi'
import AnimatedButton from './AnimatedButton'

function CreateAppealModal({ isOpen, onClose, targetId, targetType, targetName, onSuccess }) {
  const [appealReason, setAppealReason] = useState('')
  const [evidenceUrls, setEvidenceUrls] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!appealReason.trim()) {
      toast.error('Please provide a reason for your appeal.')
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        targetId,
        targetType,
        appealReason,
        evidenceUrls
      }
      await createAppealApi(payload)
      toast.success('Appeal submitted successfully. A moderator will review it soon.')
      onSuccess && onSuccess()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit appeal. You may have already appealed this item.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-content glass-panel" style={contentStyle}>
        <div style={headerStyle}>
          <h2>Request Appeal</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <div style={bodyStyle}>
          <p style={infoStyle}>
            You are appealing the action taken on: <strong>{targetName}</strong>. 
            Please note that you can only appeal once per moderation action.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="glass-input-wrapper" style={{ marginBottom: '16px' }}>
              <span className="glass-input-label">APPEAL REASON *</span>
              <textarea 
                className="glass-input-field" 
                rows="4"
                placeholder="Explain why this action should be reversed..."
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="glass-input-wrapper" style={{ marginBottom: '24px' }}>
              <span className="glass-input-label">EVIDENCE URLs (Optional)</span>
              <input 
                type="text"
                className="glass-input-field" 
                placeholder="Comma separated image or document URLs"
                value={evidenceUrls}
                onChange={(e) => setEvidenceUrls(e.target.value)}
              />
            </div>

            <div style={footerStyle}>
              <button type="button" onClick={onClose} className="btn-secondary" style={cancelBtnStyle}>
                Cancel
              </button>
              <AnimatedButton 
                type="submit" 
                disabled={isSubmitting}
                text={isSubmitting ? "Submitting..." : "Submit Appeal"}
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Inline styles for the modal structure
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)'
}

const contentStyle = {
  width: '100%',
  maxWidth: '500px',
  backgroundColor: '#161122', // Match dark theme
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
}

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '20px',
  cursor: 'pointer'
}

const bodyStyle = {
  padding: '24px'
}

const infoStyle = {
  color: '#e2e8f0',
  fontSize: '14px',
  lineHeight: '1.5',
  marginBottom: '20px',
  padding: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '6px'
}

const footerStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  marginTop: '32px'
}

const cancelBtnStyle = {
  padding: '10px 20px',
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  color: '#fff',
  borderRadius: '8px',
  cursor: 'pointer'
}

export default CreateAppealModal
