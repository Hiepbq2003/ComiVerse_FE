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
            <h2 id="upload-guide-title">Author Upload Guide</h2>
            <p>Full comic package ZIP and single chapter CBZ formats.</p>
          </div>
          <button type="button" className="author-icon-btn ghost" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="author-upload-guide-content">
          <section className="author-section-card">
            <h2 className="author-section-title">1. Upload Comic Package</h2>
            <p className="author-guide-lead">Use this to create a comic and upload multiple chapters at once.</p>
            <div className="author-code-card">
              <pre>{`TenTruyen.zip
├── Chapter 1.cbz
├── Chapter 2.cbz
└── Chapter 3.cbz

Inside Chapter 1.cbz:
├── 01.jpg
├── 02.jpg
└── 03.jpg`}</pre>
            </div>
            <div className="author-guide-grid">
              <div className="author-guide-box success">
                <h3>Accepted</h3>
                <ul>
                  <li>Chapter CBZ files directly at the outer ZIP root.</li>
                  <li>Names such as <code>Chapter 1.cbz</code> or <code>Chapter 1.5.cbz</code>.</li>
                  <li>Page images directly at each CBZ root.</li>
                </ul>
              </div>
              <div className="author-guide-box danger">
                <h3>Rejected</h3>
                <ul>
                  <li>Images directly inside the outer ZIP.</li>
                  <li>Wrapper folders such as <code>TenTruyen/Chapter 1.cbz</code>.</li>
                  <li>PDF, TXT, hidden files, <code>__MACOSX</code>, or chapter <code>.zip</code> files.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="author-section-card">
            <h2 className="author-section-title">2. Upload One Chapter</h2>
            <p className="author-guide-lead">Use one CBZ when the comic already exists.</p>
            <div className="author-code-card">
              <pre>{`Chapter 2.cbz
├── 01.jpg
├── 02.jpg
├── 03.jpg
└── 04.jpg`}</pre>
            </div>
            <div className="author-guide-checklist">
              <div><strong>Archive name</strong><span>Use <code>Chapter 2.cbz</code>, <code>Chapter 1,5.cbz</code>, or <code>Chapter 1.5.cbz</code>.</span></div>
              <div><strong>Page names</strong><span>Use zero-padding: <code>01.jpg</code>, <code>02.jpg</code>, <code>010.jpg</code>.</span></div>
              <div><strong>Accepted images</strong><span>JPG, JPEG, PNG, WEBP, and GIF.</span></div>
              <div><strong>No nesting</strong><span>Do not include a wrapper folder, another archive, PDF, TXT, PSD, or hidden files.</span></div>
            </div>
          </section>

          <ol className="author-guide-steps">
            <li>Create every chapter as its own CBZ with page images at the root.</li>
            <li>For a full comic, place only chapter CBZ files at the outer ZIP root.</li>
            <li>Upload, wait for processing, preview the page order, then submit for review.</li>
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
