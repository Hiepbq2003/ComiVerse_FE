import { useState, useEffect } from 'react'
import '../../assets/style/translator/job-pool.css'
import { getAllUnclaimedProjectsApi, claimProjectApi } from '../../services/api/TranslationPoolApi'
import { toast } from 'react-toastify'

const PRIORITY_CONFIG = {
  High: { emoji: '🔴', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  Medium: { emoji: '🟡', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
  Low: { emoji: '🟢', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' }
}

function JobPool({ fetchProjects }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [langFilter, setLangFilter] = useState('All Languages')
  const [priorityFilter, setPriorityFilter] = useState('All Priorities')
  const [claimingId, setClaimingId] = useState(null)
  const [confirmJob, setConfirmJob] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const ITEMS_PER_PAGE = 9

  useEffect(() => {
    fetchJobs()
  }, [currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [langFilter, priorityFilter])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const response = await getAllUnclaimedProjectsApi(currentPage, ITEMS_PER_PAGE)
      // response = { data: [...], metadata: { page, size, totalElements, totalPages, isLastPage } }
      setJobs(response.data || [])
      if (response.metadata) {
        setTotalPages(response.metadata.totalPages || 1)
        setTotalElements(response.metadata.totalElements || 0)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load available translation projects.')
    } finally {
      setLoading(false)
    }
  }

  const handleClaimProject = async (job) => {
    try {
      setClaimingId(job.id)
      await claimProjectApi(job.id)
      toast.success(`Successfully claimed: ${job.comicTitle} (${job.targetLang})`)
      // Re-fetch current page from server after claim
      await fetchJobs()
      if (fetchProjects) {
        await fetchProjects(true)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to claim this project. It may have already been taken.')
    } finally {
      setClaimingId(null)
    }
  }

  // Client-side filters on already-fetched page data
  const filteredJobs = jobs.filter(job => {
    const matchesLang = langFilter === 'All Languages' || job.targetLang === langFilter
    const matchesPriority = priorityFilter === 'All Priorities' || job.priority === priorityFilter
    return matchesLang && matchesPriority
  })

  const paginatedJobs = filteredJobs

  const uniqueLangs = [...new Set(jobs.map(j => j.targetLang))]

  return (
    <div className="fade-in">
      <div className="translator-page-header">
        <div className="translator-page-header-info">
          <h1>Job Pool</h1>
          <p>Browse and claim available translation projects posted by moderators.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="job-pool-filters">
        <select
          className="job-pool-select"
          value={langFilter}
          onChange={(e) => setLangFilter(e.target.value)}
        >
          <option>All Languages</option>
          {uniqueLangs.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>

        <select
          className="job-pool-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option>All Priorities</option>
          <option value="High">🔴 High</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Low">🟢 Low</option>
        </select>

        <div className="job-pool-count">
          <span>{filteredJobs.length}</span> project{filteredJobs.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {/* Job Cards */}
      {loading ? (
        <div className="moderator-empty-state">
          <p>Loading available projects...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="job-pool-empty">
          <div className="job-pool-empty-icon">📭</div>
          <h3>No projects available</h3>
          <p>{jobs.length === 0 
            ? 'The job pool is currently empty. Check back later for new translation requests!' 
            : 'No projects match your current filters.'
          }</p>
        </div>
      ) : (
        <>
          <div className="job-pool-grid">
            {paginatedJobs.map(job => {
              const pri = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.Medium
              return (
                <div className="job-pool-card" key={job.id}>
                  <div className="job-pool-card-header">
                    <h3 className="job-pool-card-title">{job.comicTitle}</h3>
                    <span 
                      className="job-pool-priority-badge"
                      style={{ background: pri.bg, color: pri.color, borderColor: pri.color }}
                    >
                      {pri.emoji} {job.priority}
                    </span>
                  </div>

                  <div className="job-pool-card-body">
                    <div className="job-pool-lang-row">
                      <span className="job-pool-lang-badge source">{job.sourceLang}</span>
                      <span className="job-pool-lang-arrow">→</span>
                      <span className="job-pool-lang-badge target">{job.targetLang}</span>
                    </div>

                    {job.deadline && (
                      <div className="job-pool-detail-row">
                        <span className="job-pool-detail-label">📅 Deadline</span>
                        <span className="job-pool-detail-value">{job.deadline}</span>
                      </div>
                    )}

                    {job.notes && (
                      <div className="job-pool-notes">
                        <span className="job-pool-detail-label">📝 Notes</span>
                        <p>{job.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="job-pool-card-footer">
                    <button
                      className="job-pool-claim-btn"
                      onClick={() => setConfirmJob(job)}
                      disabled={claimingId === job.id}
                    >
                      {claimingId === job.id ? '⏳ Claiming...' : '📥 Claim Project'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '24px' }}>
              <button 
                className="trans-btn secondary" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', fontSize: '12.5px' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '13px', color: 'var(--trans-text-secondary)' }}>
                Page <strong>{currentPage}</strong> of <strong>{totalPages || 1}</strong>
              </span>
              <button 
                className="trans-btn secondary" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{ padding: '6px 12px', fontSize: '12.5px' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* CUSTOM CONFIRM MODAL */}
      {confirmJob && (
        <div className="trans-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="trans-modal-card" style={{ maxWidth: '450px', background: 'rgba(23, 23, 37, 0.95)', border: '1px solid rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div className="trans-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--trans-text-primary)', fontWeight: '700' }}>Confirm Claim</h3>
              <button className="trans-modal-close-btn" style={{ color: 'var(--trans-text-secondary)', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }} onClick={() => setConfirmJob(null)}>×</button>
            </div>
            <div className="trans-modal-body" style={{ padding: '20px 0', color: 'var(--trans-text-primary)' }}>
              <p style={{ margin: '0 0 16px', fontSize: '14.5px', lineHeight: '1.5', color: 'var(--trans-text-secondary)' }}>
                Are you sure you want to claim <strong style={{ color: '#ffffff' }}>"{confirmJob.comicTitle}"</strong> for your team?
              </p>
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '13px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ display: 'block', color: 'var(--trans-text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Language Route</span>
                  <span style={{ fontWeight: '600' }}>{confirmJob.sourceLang} → {confirmJob.targetLang}</span>
                </div>
                {confirmJob.deadline && (
                  <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '12px' }}>
                    <span style={{ display: 'block', color: 'var(--trans-text-muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Deadline</span>
                    <span style={{ fontWeight: '600', color: 'var(--trans-yellow)' }}>{confirmJob.deadline}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="trans-modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
              <button 
                className="trans-btn secondary" 
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => setConfirmJob(null)}
              >
                Cancel
              </button>
              <button 
                className="trans-btn primary" 
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => {
                  const jobToClaim = confirmJob
                  setConfirmJob(null)
                  handleClaimProject(jobToClaim)
                }}
              >
                Claim Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobPool
