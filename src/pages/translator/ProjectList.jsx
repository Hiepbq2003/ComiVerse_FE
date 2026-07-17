import { useState, useEffect } from 'react';
import { Search, Filter, BookOpen, Users, Calendar, User } from 'lucide-react';
import { toast } from 'react-toastify';
import '../../assets/style/translator/project-list.css';
import { getAllProjectTeamsApi } from '../../services/api/ProjectTeamApi';
import { createTeamRequestApi } from '../../services/api/TeamWorkspaceApi';
import { getAuth } from '../../utils/Auth';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedIds, setAppliedIds] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [joinRole, setJoinRole] = useState('Translator');

  // Load auth details
  const auth = getAuth();
  const authUser = auth?.user;
  const userFullName = authUser?.fullName || authUser?.username || 'Translator';

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await getAllProjectTeamsApi();
        setProjects(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load available projects.');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((p) => {
    // Only show active recruiting projects
    if (!p.isRecruiting || p.status?.toUpperCase() !== 'ACTIVE') return false;

    // Filter by search text (comic name or team title)
    const matchesSearch =
      (p.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.comicName || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // Do not show projects led by the current user
    const isLeaderMatch = (leaderName) => {
      if (!leaderName) return false;
      const ln = leaderName.toLowerCase().trim();
      const username = (authUser?.username || '').toLowerCase().trim();
      const fullName = (authUser?.fullName || '').toLowerCase().trim();
      
      if (ln === username || ln === fullName) return true;
      
      const isDevLeader = ln.includes('trans') || ln.includes('tran');
      const isDevUser = username.includes('trans') || username.includes('tran') || fullName.includes('trans') || fullName.includes('tran');
      
      return isDevLeader && isDevUser;
    };

    return !isLeaderMatch(p.leaderName);
  });

  const handleApplyClick = (project) => {
    setSelectedProject(project);
    setJoinMessage(`Hi, I'm a Translator and I'd like to help with ${project.comicName || project.title || 'this series'}.`);
    setJoinRole('Translator');
    setShowJoinModal(true);
  };

  const handleSendJoinRequest = async () => {
    if (!selectedProject) return;
    try {
      const initials = userFullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

      await createTeamRequestApi(selectedProject.id, {
        name: userFullName,
        time: 'Just now',
        text: joinMessage.trim() || 'Hi, I would love to join your translation team!',
        roles: joinRole,
        avatar: initials,
      });

      toast.success(`Application sent successfully for "${selectedProject.comicName || selectedProject.title}"!`);
      setAppliedIds((prev) => [...prev, selectedProject.id]);
      setShowJoinModal(false);
      setSelectedProject(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to send application.');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--trans-text-primary)' }}>
        <h3>⏳ Loading available projects...</h3>
      </div>
    );
  }

  return (
    <div className="translator-project-list-container container-fluid py-4" style={{ padding: '24px' }}>
      {/* Header */}
      <div className="mb-4">
        <h1 className="fw-bold" style={{ color: 'var(--trans-text-primary)', margin: '0 0 8px 0' }}>Available Projects</h1>
        <p style={{ color: 'var(--trans-text-secondary)', margin: 0 }}>
          Browse open translation projects and apply to join a team.
        </p>
      </div>

      {/* Toolbar */}
      <div className="d-flex gap-3 mb-4" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              top: '50%',
              left: '12px',
              transform: 'translateY(-50%)',
              color: 'var(--trans-text-muted)',
            }}
          />
          <input
            type="text"
            className="trans-form-input"
            style={{ paddingLeft: '38px', width: '100%' }}
            placeholder="Search available projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid Projects */}
      <div className="available-projects-grid">
        {filteredProjects.map((project) => {
          const alreadyApplied = appliedIds.includes(project.id);
          const currentMembersCount = project.membersCount || 0;
          const limit = project.maxMembers || 5;
          const spotsLeft = Math.max(0, limit - currentMembersCount);
          const progressPercent = Math.min(100, Math.round((currentMembersCount / limit) * 100));

          return (
            <div key={project.id} className="available-project-card">
              <div>
                <div className="project-card-header">
                  <h5 className="project-card-title">
                    {project.comicName || project.title}
                  </h5>
                  <span className={`project-card-badge ${spotsLeft > 0 ? 'spots-open' : 'spots-full'}`}>
                    {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} open
                  </span>
                </div>

                <p className="project-card-team-label">
                  Team: <strong>{project.title}</strong>
                </p>

                <ul className="project-details-list">
                  <li className="project-details-item">
                    <BookOpen size={15} />
                    Language: <strong>{project.sourceLang || 'Any'} ➔ {project.targetLang}</strong> &middot; {project.chaptersCount || 0} chapters
                  </li>
                  <li className="project-details-item">
                    <User size={15} />
                    Leader: <strong>{project.leaderName || 'No Leader'}</strong>
                  </li>
                  <li className="project-details-item">
                    <Users size={15} />
                    Available: <strong>{spotsLeft}</strong> translator{spotsLeft !== 1 ? 's' : ''} needed
                  </li>
                  <li className="project-details-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" 
                      stroke={project.priority === 'Urgent' ? '#ef4444' : '#a855f7'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                    Urgency: <strong style={{ 
                      color: project.priority === 'Urgent' ? '#ef4444' : (project.priority === 'High' ? '#f97316' : 'var(--trans-text-secondary)') 
                    }}>
                      {project.priority === 'Urgent' ? '🔥 URGENTLY Recruiting' : project.priority || 'Medium'}
                    </strong>
                  </li>
                </ul>
              </div>

              <div style={{ marginTop: '24px' }}>
                <button
                  className="available-project-apply-btn"
                  disabled={alreadyApplied || spotsLeft === 0}
                  onClick={() => handleApplyClick(project)}
                >
                  {alreadyApplied ? 'Applied ✓' : spotsLeft === 0 ? 'Team Full' : 'Apply to Join'}
                </button>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--trans-text-muted)', fontSize: '14px', margin: 0 }}>No available recruiting projects found.</p>
          </div>
        )}
      </div>

      {/* ── MODAL: REQUEST TO JOIN TEAM ────────────────── */}
      {showJoinModal && selectedProject && (
        <div
          className="trans-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            className="trans-modal-card"
            style={{
              background: 'var(--trans-card-bg)',
              border: '1px solid var(--trans-border)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              color: 'var(--trans-text-primary)',
            }}
          >
            <div
              className="trans-modal-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--trans-border)',
                paddingBottom: '14px',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--trans-text-primary)' }}>
                Apply to Join Team
              </h3>
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setSelectedProject(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '22px',
                  cursor: 'pointer',
                  lineHeight: '1',
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>

            <div className="trans-modal-body">
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                }}
              >
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--trans-text-secondary)' }}>Comic Project:</p>
                <strong style={{ fontSize: '15px', color: '#c084fc' }}>{selectedProject.comicName || selectedProject.title}</strong>
                <p style={{ margin: '8px 0 0 0', fontSize: '12.5px', color: '#10b981' }}>
                  Open Positions: {(selectedProject.maxMembers || 5) - (selectedProject.membersCount || 0)} spots left
                </p>
              </div>

              <div className="trans-form-group" style={{ marginBottom: '16px' }}>
                <label className="trans-form-label" style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                  Role you're applying for
                </label>
                <select
                  className="trans-form-input"
                  style={{ width: '100%' }}
                  value={joinRole}
                  onChange={(e) => setJoinRole(e.target.value)}
                >
                  <option value="Translator">Translator</option>
                  <option value="Proofreader">Proofreader</option>
                  <option value="Editor">Editor</option>
                  <option value="Quality Checker">Quality Checker</option>
                </select>
              </div>

              <div className="trans-form-group">
                <label className="trans-form-label" style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '6px' }}>
                  Introduction Message
                </label>
                <textarea
                  className="trans-form-input textarea"
                  style={{ width: '100%', height: '100px' }}
                  placeholder="Tell the group leader about your experience or why you want to join..."
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                />
              </div>
            </div>

            <div
              className="trans-modal-footer"
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '16px',
                marginTop: '20px',
              }}
            >
              <button
                className="trans-btn secondary"
                onClick={() => {
                  setShowJoinModal(false);
                  setSelectedProject(null);
                }}
              >
                Cancel
              </button>
              <button className="trans-btn primary" onClick={handleSendJoinRequest}>
                Send Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectList;
