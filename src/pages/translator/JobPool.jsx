import { useState, useEffect } from 'react'
import '../../assets/style/translator/job-pool.css'
import { getAllUnclaimedProjectsApi, claimProjectApi } from '../../services/api/TranslationPoolApi'
import { toast } from 'react-toastify'

const PRIORITY_CONFIG = {
  High: { emoji: '🔴', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  Medium: { emoji: '🟡', color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
  Low: { emoji: '🟢', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' }
}

function JobPool() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [langFilter, setLangFilter] = useState('All Languages')
  const [priorityFilter, setPriorityFilter] = useState('All Priorities')
  const [claimingId, setClaimingId] = useState(null)

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      setLoading(true)
      const data = await getAllUnclaimedProjectsApi()
      setJobs(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load available translation projects.')
    } finally {
      setLoading(false)
    }
  }

  const handleClaimProject = async (job) => {
    if (!window.confirm(`Claim "${job.comicTitle}" (${job.sourceLang} → ${job.targetLang}) for your team?`)) return

    try {
      setClaimingId(job.id)
      await claimProjectApi(job.id)
      toast.success(`Successfully claimed: ${job.comicTitle} (${job.targetLang})`)
      // Remove from the list immediately
      setJobs(prev => prev.filter(j => j.id !== job.id))
    } catch (err) {
      console.error(err)
      toast.error('Failed to claim this project. It may have already been taken.')
    } finally {
      setClaimingId(null)
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesLang = langFilter === 'All Languages' || job.targetLang === langFilter
    const matchesPriority = priorityFilter === 'All Priorities' || job.priority === priorityFilter
    return matchesLang && matchesPriority
  })

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
        <div className="job-pool-grid">
          {filteredJobs.map(job => {
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
                    onClick={() => handleClaimProject(job)}
                    disabled={claimingId === job.id}
                  >
                    {claimingId === job.id ? '⏳ Claiming...' : '📥 Claim Project'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default JobPool
