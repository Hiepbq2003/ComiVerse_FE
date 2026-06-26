import { useState } from 'react'

function TeamProjects({ projects, setProjects }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDetails, setSelectedDetails] = useState(null)
  const [selectedEdit, setSelectedEdit] = useState(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  
  const [uploadData, setUploadData] = useState({ chapterTitle: '', chapterContent: '', wordsCount: 3000 })
  const [editForm, setEditForm] = useState({ description: '', status: 'Active', team: '' })

  const handleOpenDetails = (project) => {
    setSelectedDetails(project)
  }

  const handleOpenEdit = (project, e) => {
    e.stopPropagation()
    setSelectedEdit(project)
    setEditForm({
      description: project.description,
      status: project.status,
      team: project.team
    })
  }

  const handleSaveEdit = () => {
    if (!selectedEdit) return
    setProjects(prev =>
      prev.map(proj =>
        proj.id === selectedEdit.id
          ? { 
              ...proj, 
              description: editForm.description, 
              status: editForm.status, 
              team: editForm.team 
            }
          : proj
      )
    )
    setSelectedEdit(null)
  }

  const handleUploadChapter = () => {
    if (!selectedDetails || !uploadData.chapterTitle.trim()) return

    const newChapter = {
      num: uploadData.chapterTitle.trim(),
      date: 'Just now',
      words: Number(uploadData.wordsCount) || 3000
    }

    setProjects(prev =>
      prev.map(proj => {
        if (proj.id === selectedDetails.id) {
          const updatedProj = {
            ...proj,
            chaptersCount: proj.chaptersCount + 1,
            lastUpdated: 'Just now',
            chaptersList: [newChapter, ...proj.chaptersList]
          }
          // Sync details modal
          setSelectedDetails(updatedProj)
          return updatedProj
        }
        return proj
      })
    )

    setUploadData({ chapterTitle: '', chapterContent: '', wordsCount: 3000 })
    setShowUploadForm(false)
  }

  const teamProjectsList = projects.filter(proj => {
    return proj.title.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div className="fade-in">
      <div className="translator-page-header">
        <div className="translator-page-header-info">
          <h1>Translation Projects</h1>
          <p>All group translation project teams registered on the platform.</p>
        </div>
        <div>
          <input
            type="text"
            className="trans-form-input"
            placeholder="Search translation projects..."
            style={{ width: '250px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="trans-projects-list">
        {teamProjectsList.length === 0 ? (
          <div className="translator-empty-state">
            <h3>No translation projects found</h3>
            <p>Change your search filters and try again.</p>
          </div>
        ) : (
          teamProjectsList.map(proj => (
            <div className="trans-project-card" key={proj.id}>
              <div className="trans-project-cover">{proj.cover}</div>
              <div className="trans-project-info">
                <h3 className="trans-project-title">{proj.title}</h3>
                <p className="trans-project-meta">
                  🧑‍🤝‍🧑 Team: <strong>{proj.team}</strong> · {proj.chaptersCount} chapters published
                </p>
                <span className={`status-badge ${proj.status.toLowerCase()}`}>{proj.status}</span>
              </div>
              <div className="trans-project-actions">
                <button className="trans-btn primary" onClick={() => handleOpenDetails(proj)}>
                  View Details
                </button>
                <button className="trans-btn icon-edit" onClick={(e) => handleOpenEdit(proj, e)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── MODAL: PROJECT DETAILS & CHAPTERS LIST ──── */}
      {selectedDetails && (
        <div className="trans-modal-overlay">
          <div className="trans-modal-card wide">
            <div className="trans-modal-header">
              <h3>Project Hub: {selectedDetails.title}</h3>
              <button className="trans-modal-close-btn" onClick={() => setSelectedDetails(null)}>×</button>
            </div>

            <div className="trans-modal-body">
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 8px' }}><strong>Description:</strong> {selectedDetails.description}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '13px', marginTop: '10px' }}>
                  <div><strong>Team:</strong> {selectedDetails.team}</div>
                  <div><strong>Total Chapters:</strong> {selectedDetails.chaptersCount}</div>
                  <div><strong>Status:</strong> {selectedDetails.status}</div>
                </div>
              </div>

              {/* Upload Form Toggle */}
              {selectedDetails.assignedToMe && (
                <div style={{ marginBottom: '20px' }}>
                  {!showUploadForm ? (
                    <button className="trans-btn primary" onClick={() => setShowUploadForm(true)}>
                      + Upload New Translated Chapter
                    </button>
                  ) : (
                    <div style={{ border: '1px solid var(--trans-border)', padding: '16px', borderRadius: '8px', background: '#ffffff' }}>
                      <h4 style={{ margin: '0 0 12px' }}>Upload Chapter Draft</h4>
                      <div className="trans-form-group">
                        <label className="trans-form-label">Chapter Title / Number</label>
                        <input
                          type="text"
                          className="trans-form-input"
                          placeholder="e.g. Chapter 46: The Awakening"
                          value={uploadData.chapterTitle}
                          onChange={(e) => setUploadData({ ...uploadData, chapterTitle: e.target.value })}
                        />
                      </div>
                      <div className="trans-form-group">
                        <label className="trans-form-label">Word Count</label>
                        <input
                          type="number"
                          className="trans-form-input"
                          value={uploadData.wordsCount}
                          onChange={(e) => setUploadData({ ...uploadData, wordsCount: e.target.value })}
                        />
                      </div>
                      <div className="trans-form-group">
                        <label className="trans-form-label">Translation Text Content</label>
                        <textarea
                          className="trans-form-input textarea"
                          placeholder="Paste translated chapter contents here..."
                          value={uploadData.chapterContent}
                          onChange={(e) => setUploadData({ ...uploadData, chapterContent: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="trans-btn secondary" onClick={() => setShowUploadForm(false)}>
                          Cancel
                        </button>
                        <button className="trans-btn primary" onClick={handleUploadChapter} disabled={!uploadData.chapterTitle.trim()}>
                          Submit Draft
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chapters list history */}
              <h4 style={{ margin: '0 0 10px' }}>Translation History Logs</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedDetails.chaptersList.map((ch, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                    <span><strong>{ch.num}</strong> · {ch.words} words</span>
                    <span style={{ color: 'var(--trans-text-muted)' }}>{ch.date}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="trans-modal-footer">
              <button className="trans-btn secondary" onClick={() => setSelectedDetails(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT PROJECT ─────────────────────── */}
      {selectedEdit && (
        <div className="trans-modal-overlay">
          <div className="trans-modal-card">
            <div className="trans-modal-header">
              <h3>Edit Translation Project Info</h3>
              <button className="trans-modal-close-btn" onClick={() => setSelectedEdit(null)}>×</button>
            </div>

            <div className="trans-modal-body">
              <div className="trans-form-group">
                <label className="trans-form-label">Project Team Name</label>
                <input
                  type="text"
                  className="trans-form-input"
                  value={editForm.team}
                  onChange={(e) => setEditForm({ ...editForm, team: e.target.value })}
                />
              </div>

              <div className="trans-form-group">
                <label className="trans-form-label">Project Status</label>
                <select
                  className="trans-form-input"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                </select>
              </div>

              <div className="trans-form-group">
                <label className="trans-form-label">Description / Synopses</label>
                <textarea
                  className="trans-form-input textarea"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
            </div>

            <div className="trans-modal-footer">
              <button className="trans-btn secondary" onClick={() => setSelectedEdit(null)}>
                Cancel
              </button>
              <button className="trans-btn primary" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamProjects
