import { Link } from 'react-router-dom'
import AuthorLayout from '../../components/layout/AuthorLayout'
import '../../assets/style/author/upload-guide.css'

function AuthorUploadGuide() {
  return (
    <AuthorLayout activeNav="upload-guide">
      <div className="author-upload-guide-page">
        <div className="author-page-header">
          <h1>Author Upload Guide</h1>
          <p>There are two upload formats: full comic package ZIP and single chapter CBZ. Large files are accepted first, then processed by background status task.</p>
        </div>

        <section className="author-section-card">
          <h2 className="author-section-title">1. Upload Comic Package</h2>
          <p className="author-guide-lead">Use this when the author wants to create a comic and upload many chapters at once.</p>

          <div className="author-code-card">
            <pre>{`Required structure:
TenTruyen.zip
├── Chapter 1.cbz
├── Chapter 2.cbz
└── Chapter 3.cbz

Inside each chapter CBZ:
Chapter 1.cbz
├── 01.jpg
├── 02.jpg
└── 03.jpg`}</pre>
          </div>

          <div className="author-guide-grid">
            <div className="author-guide-box success">
              <h3>Accepted in outer ZIP</h3>
              <ul>
                <li>Only chapter archives directly at root, for example <code>Chapter 1.cbz</code>, <code>Chapter 2.cbz</code>.</li>
                <li>Chapter number supports comma or dot decimal: <code>Chapter 1,5.cbz</code> or <code>Chapter 1.5.cbz</code>.</li>
                <li>Each chapter CBZ contains page images directly at root: <code>01.jpg</code>, <code>02.jpg</code>.</li>
              </ul>
            </div>
            <div className="author-guide-box danger">
              <h3>Rejected in outer ZIP</h3>
              <ul>
                <li>Images directly inside <code>TenTruyen.zip</code>.</li>
                <li>Wrapper folder such as <code>TenTruyen/Chapter 1.cbz</code>.</li>
                <li>Chapter ZIP files such as <code>Chapter 1.zip</code>; chapter archive must be <code>.cbz</code>.</li>
                <li><code>readme.txt</code>, <code>chapter.pdf</code>, hidden files, or <code>__MACOSX</code>.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="author-section-card">
          <h2 className="author-section-title">2. Upload One Chapter CBZ</h2>
          <p className="author-guide-lead">Use this when the comic already exists and the author wants to add one chapter.</p>

          <div className="author-code-card">
            <pre>{`Chapter 2.cbz
├── 01.jpg
├── 02.jpg
├── 03.jpg
└── 04.jpg`}</pre>
          </div>

          <div className="author-guide-grid">
            <div className="author-guide-box success">
              <h3>Accepted in chapter CBZ</h3>
              <ul>
                <li><code>01.jpg</code></li>
                <li><code>02.png</code></li>
                <li><code>03.jpeg</code></li>
                <li><code>04.webp</code></li>
                <li><code>05.gif</code></li>
              </ul>
            </div>
            <div className="author-guide-box danger">
              <h3>Rejected in chapter CBZ</h3>
              <ul>
                <li>Wrapper folder such as <code>Chapter 2/01.jpg</code>.</li>
                <li>Nested archive such as <code>Chapter 2.cbz</code> inside another CBZ.</li>
                <li><code>readme.txt</code>, <code>chapter.pdf</code>, <code>cover.psd</code>, <code>.DS_Store</code>.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="author-section-card">
          <h2 className="author-section-title">3. Naming Rules</h2>
          <div className="author-guide-checklist">
            <div>
              <strong>Comic package name</strong>
              <span>Use the comic name with outer <code>.zip</code>, for example <code>TenTruyen.zip</code>.</span>
            </div>
            <div>
              <strong>Chapter archive name</strong>
              <span>Use <code>Chapter 1.cbz</code>, <code>Chapter 1,5.cbz</code>, or <code>Chapter 1.5.cbz</code>. The backend reads the number from the filename.</span>
            </div>
            <div>
              <strong>Page image name</strong>
              <span>Use zero-padding: <code>01.jpg</code>, <code>02.jpg</code>, <code>010.jpg</code>. This keeps page order clear.</span>
            </div>
            <div>
              <strong>One chapter CBZ = one chapter</strong>
              <span>For Add Chapter, do not put many chapter archives together. For Upload Comic, put many chapter CBZ files directly inside the outer ZIP.</span>
            </div>
          </div>
        </section>

        <section className="author-section-card">
          <h2 className="author-section-title">4. Backend Endpoint Contract</h2>
          <div className="author-code-card">
            <pre>{`POST /api/author/comics/upload-package
Content-Type: multipart/form-data

Fields:
- title: Ten Truyen
- slug: ten-truyen
- description: Short synopsis
- minimumAge: 13
- publicationStatus: ONGOING
- coverImageUrl: https://.../cover.png
- genres: Action
- genres: Fantasy
- comicZip: TenTruyen.zip

Response: 202 ACCEPTED with taskId
Status: GET /api/author/comics/upload-package/status/{taskId}`}</pre>
          </div>

          <div className="author-code-card">
            <pre>{`POST /api/author/comics/{comicId}/chapters/upload-zip
Content-Type: multipart/form-data

Fields:
- chapterNumber: 2
- title: Optional chapter title
- zipFile: Chapter 2.cbz

Response: 202 ACCEPTED with taskId
Status: GET /api/author/comics/{comicId}/chapters/upload-zip/status/{taskId}`}</pre>
          </div>
        </section>

        <section className="author-section-card">
          <h2 className="author-section-title">5. Windows Packaging Steps</h2>
          <ol className="author-guide-steps">
            <li>Create each chapter as a CBZ first: <code>Chapter 1.cbz</code>, <code>Chapter 2.cbz</code>.</li>
            <li>Put page images directly inside each CBZ: <code>01.jpg</code>, <code>02.jpg</code>.</li>
            <li>Put only chapter CBZ files directly into the final outer ZIP: <code>TenTruyen.zip</code>.</li>
            <li>Do not let Windows create <code>TenTruyen.zip/TenTruyen/Chapter 1.cbz</code>; that wrapper folder will be rejected.</li>
            <li>Upload the full comic package from <strong>Upload New Comic</strong>.</li>
            <li>Upload one chapter CBZ from <strong>Add Chapter</strong>.</li>
            <li>Open Preview, check the page order, then submit for review.</li>
          </ol>
        </section>

        <div className="author-guide-actions">
          <Link className="btn-author-action black" to="/author/comics">Back to My Comics</Link>
        </div>
      </div>
    </AuthorLayout>
  )
}

export default AuthorUploadGuide
