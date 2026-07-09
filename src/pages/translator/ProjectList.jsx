import { useState } from 'react';
import { Search, Filter, BookOpen, Users, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';

// TODO: Replace this mock data with a real API call, e.g.:
// const data = await getAvailableProjectsApi()
// Suggested condition for "open to apply": project has no assigned leader/team yet
// (e.g. status === 'OPEN' or leaderName is empty/'-')
const MOCK_AVAILABLE_PROJECTS = [
  {
    id: 1,
    title: 'Solo Leveling: Ragnarok',
    genre: 'Action, Fantasy',
    sourceLang: 'Korean',
    targetLang: 'English',
    totalChapters: 120,
    deadline: '2026-08-15',
    openSlots: 2,
  },
  {
    id: 2,
    title: 'Omniscient Reader',
    genre: 'Drama, Fantasy',
    sourceLang: 'Korean',
    targetLang: 'Vietnamese',
    totalChapters: 88,
    deadline: '2026-07-30',
    openSlots: 1,
  },
  {
    id: 3,
    title: 'The Beginning After The End',
    genre: 'Adventure, Isekai',
    sourceLang: 'English',
    targetLang: 'Vietnamese',
    totalChapters: 45,
    deadline: '2026-09-01',
    openSlots: 3,
  },
];

function ProjectList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedIds, setAppliedIds] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  const filteredProjects = MOCK_AVAILABLE_PROJECTS.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApply = async (project) => {
    setLoadingId(project.id);
    try {
      // TODO: Replace with real API call, e.g.:
      // await applyProjectApi(project.id)
      await new Promise((resolve) => setTimeout(resolve, 600)); // simulate request

      setAppliedIds((prev) => [...prev, project.id]);
      toast.success(`Application sent for "${project.title}"!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to apply. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="fw-bold">Available Projects</h1>
        <p className="text-muted">
          Browse open translation projects and apply to join a team.
        </p>
      </div>

      {/* Toolbar */}
      <div className="d-flex gap-3 mb-4">
        <div className="position-relative flex-grow-1">
          <Search
            size={18}
            className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
          />
          <input
            type="text"
            className="form-control ps-5"
            placeholder="Search available projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-outline-secondary d-flex align-items-center gap-2">
          <Filter size={18} /> Filter
        </button>
      </div>

      {/* Grid Projects */}
      <div className="row g-4">
        {filteredProjects.map((project) => {
          const alreadyApplied = appliedIds.includes(project.id);
          const isLoading = loadingId === project.id;

          return (
            <div key={project.id} className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0">{project.title}</h5>
                    <span className="badge bg-info-subtle text-info">
                      {project.openSlots} slot{project.openSlots > 1 ? 's' : ''} open
                    </span>
                  </div>

                  <p className="text-muted small mb-3">{project.genre}</p>

                  <ul className="list-unstyled small text-muted mb-3">
                    <li className="d-flex align-items-center gap-2 mb-1">
                      <BookOpen size={15} />
                      {project.sourceLang} → {project.targetLang} &middot; {project.totalChapters} chapters
                    </li>
                    <li className="d-flex align-items-center gap-2 mb-1">
                      <Calendar size={15} />
                      Deadline: {project.deadline}
                    </li>
                    <li className="d-flex align-items-center gap-2">
                      <Users size={15} />
                      {project.openSlots} translator{project.openSlots > 1 ? 's' : ''} needed
                    </li>
                  </ul>
                </div>

                <div className="card-footer bg-transparent border-0 pt-0">
                  <button
                    className={`btn w-100 ${alreadyApplied ? 'btn-success' : 'btn-primary'}`}
                    disabled={alreadyApplied || isLoading}
                    onClick={() => handleApply(project)}
                  >
                    {isLoading ? (
                      <span className="spinner-border spinner-border-sm me-2" />
                    ) : null}
                    {alreadyApplied ? 'Applied ✓' : isLoading ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="col-12">
            <p className="text-muted text-center py-5">No available projects found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectList;