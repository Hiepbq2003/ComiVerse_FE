import { useEffect } from 'react'

function UploadGuideModal({ onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="author-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="author-modal author-upload-guide-modal" role="dialog" aria-modal="true" aria-labelledby="upload-guide-title">
        <div className="author-modal-head">
          <div>
            <h2 id="upload-guide-title">Chapter Upload Guide</h2>
            <p>Rules for uploading a single chapter after the comic draft has been created.</p>
          </div>
          <button type="button" className="author-icon-btn ghost" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="author-upload-guide-content">
          <section className="author-section-card">
            <h2 className="author-section-title">Required Folder Structure</h2>
            <p className="author-guide-lead">Each chapter is uploaded as one selected folder. Page images must be located directly inside that folder.</p>
            <div className="author-code-card">
              <pre>{`Chapter 2/
├── 01.jpg
├── 02.jpg
├── 03.jpg
└── 04.jpg`}</pre>
            </div>

            <div className="author-guide-grid">
              <div className="author-guide-box success">
                <h3>Accepted</h3>
                <ul>
                  <li>Any folder name is accepted. Enter the chapter number in the separate Chapter Number field.</li>
                  <li>Page files such as <code>01.jpg</code>, <code>02.png</code>, and <code>003.webp</code>.</li>
                  <li>JPG, JPEG, PNG, WEBP, and GIF images.</li>
                  <li>Duplicate source image names are handled safely.</li>
                </ul>
              </div>

              <div className="author-guide-box danger">
                <h3>Rejected</h3>
                <ul>
                  <li>Nested folders such as <code>Chapter 2/pages/01.jpg</code>.</li>
                  <li>ZIP, RAR, PDF, TXT, PSD, README, or hidden files inside the chapter folder.</li>
                  <li>Files from multiple folders in one chapter request.</li>
                  <li>Images larger than the backend upload limit.</li>
                </ul>
              </div>
            </div>
          </section>

          <ol className="author-guide-steps">
            <li>Create the comic draft with its information and cover image.</li>
            <li>Open Comic Detail and select one chapter folder.</li>
            <li>Check the page order while the chapter is <strong>PREVIEW_READY</strong>.</li>
            <li>Submit the chapter, then press <strong>Push Review</strong> for the comic profile.</li>
          </ol>
        </div>

        <div className="author-modal-actions">
          <button type="button" className="btn-author-action black" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  )
}

export default UploadGuideModal
