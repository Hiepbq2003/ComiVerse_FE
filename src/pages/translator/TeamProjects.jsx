import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom';
import '../../assets/style/translator/team-projects.css'
import ModernButton from '../../components/common/ModernButton'
import { getMyProjectTeamsApi, getAllProjectTeamsApi, updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { createSubmissionApi, getAllSubmissionsApi } from '../../services/api/SubmissionApi'
import { getAllComicsApi, getComicsPageApi } from '../../services/api/ComicApi'
import { getChaptersByComicIdApi } from '../../services/api/ChapterApi'
import { getAuthorComicChaptersApi } from '../../services/api/AuthorComicApi'
import { getAuth } from '../../utils/Auth'
import { uploadImageApi } from '../../services/api/UploadApi'
const getProjectCover = (proj, dbComics = [], dbSubs = []) => {
  if (!proj) return '';
  const rawCover = proj.cover || proj.coverImage || proj.coverImageUrl || proj.coverUrl || proj.imageUrl || '';
  
  if (rawCover && typeof rawCover === 'string' && (
    rawCover.startsWith('http://') ||
    rawCover.startsWith('https://') ||
    rawCover.startsWith('data:') ||
    rawCover.startsWith('/') ||
    rawCover.includes('.')
  ) && !rawCover.includes('🔮') && !rawCover.includes('📚')) {
    return rawCover;
  }

  const cleanName = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/\s*(-.*)?(\s+translation\s+team|\s+team|\s+english\s+translation|\s+english)$/i, '')
      .toLowerCase()
      .trim();
  };

  const targetId = String(proj.comicId || proj.id || '').toLowerCase().trim();
  const targetTitle = cleanName(proj.comicName || proj.title || proj.comicTitle || proj.team || '');

  const findCoverInList = (list) => {
    if (!Array.isArray(list) || list.length === 0) return '';
    const match = list.find(item => {
      if (!item) return false;
      const itemId = String(item.id || item.comicId || '').toLowerCase().trim();
      if (targetId && itemId && (itemId === targetId || itemId === `comic-${targetId}`)) return true;
      const itemTitle = cleanName(item.title || item.comicName || item.comicTitle || item.name || '');
      return targetTitle && itemTitle && (itemTitle === targetTitle || itemTitle.includes(targetTitle) || targetTitle.includes(itemTitle));
    });
    if (match) {
      const c = match.cover || match.coverImage || match.coverImageUrl || match.coverUrl || match.imageUrl;
      if (c && typeof c === 'string' && (c.startsWith('http') || c.startsWith('data:') || c.startsWith('/') || c.includes('.')) && !c.includes('🔮') && !c.includes('📚')) {
        return c;
      }
    }
    return '';
  };

  let found = findCoverInList(dbComics) || findCoverInList(dbSubs);
  if (!found) {
    const storageKeys = [
      'comiverse_moderator_submissions_override',
      'comiverse_author_submissions',
      'comiverse_comics_override',
      'comiverse_admin_comics',
      'comiverse_comics_list'
    ];
    for (const key of storageKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          found = findCoverInList(parsed);
          if (found) break;
        }
      } catch (e) {}
    }
  }
  if (!found) {
    try {
      const sess = sessionStorage.getItem('comiverse_comics_cache');
      if (sess) {
        found = findCoverInList(JSON.parse(sess));
      }
    } catch (e) {}
  }
  if (!found) {
    try {
      const sessTeams = sessionStorage.getItem('comiverse_teams_list_cache');
      if (sessTeams) {
        found = findCoverInList(JSON.parse(sessTeams));
      }
    } catch (e) {}
  }

  return found || ((rawCover && !rawCover.includes('🔮') && !rawCover.includes('📚')) ? rawCover : '');
};

import {
  getTeamAnnouncementsApi,
  createTeamAnnouncementApi,
  likeTeamAnnouncementApi,
  pinTeamAnnouncementApi,
  createTeamPostCommentApi,
  likeTeamPostCommentApi,
  getTeamTasksApi,
  getTeamMembersApi,
  getTeamChaptersApi,
  createTeamTaskApi,
  updateTeamTaskApi,
  getTeamRequestsApi,
  decideTeamRequestApi,
  deleteTeamAnnouncementApi,
} from '../../services/api/TeamWorkspaceApi'
import { toast } from 'react-toastify'

import HomeTab from './HomeTab'
import MembersTab from './MembersTab'
import RequestsTab from './RequestsTab'
import TasksTab, { CreateTaskModal, EditTaskModal, parseTaskTitle, getTaskColumn } from './TasksTab'
import SettingsTab from './SettingsTab'

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

function ProjectsListView({ teamProjectsList, searchTerm, onSearchChange, onOpenDetails, onQuickTranslate, onOpenEdit, isLeaderMatch }) {
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
            onChange={(e) => onSearchChange(e.target.value)}
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
              <div className="trans-project-cover">
                {getProjectCover(proj) ? (
                  <img
                    src={getProjectCover(proj)}
                    alt={proj.title || 'Comic Cover'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 'inherit', fontSize: '28px' }}>
                    📖
                  </div>
                )}
              </div>
              <div className="trans-project-info">
                <h3 className="trans-project-title">{proj.title}</h3>
                <p className="trans-project-meta">
                  🧑‍🤝‍🧑 Language: <strong>{proj.sourceLang || 'Any'} ➔ {proj.targetLang}</strong>
                </p>
                <p className="trans-project-meta" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#cbd5e1', fontSize: '12.5px' }}>
                    👥 Capacity: <strong>{proj.membersCount || 1} / {(Number(proj.maxMembers) || 5) + 1}</strong> members (1 Leader + {Number(proj.maxMembers) || 5} Members)
                  </span>
                  <span style={{ 
                    padding: '2px 10px', 
                    borderRadius: '12px', 
                    fontSize: '11.5px', 
                    fontWeight: '600',
                    background: (proj.isRecruiting && (proj.membersCount || 1) < (Number(proj.maxMembers) || 5) + 1) ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: (proj.isRecruiting && (proj.membersCount || 1) < (Number(proj.maxMembers) || 5) + 1) ? '#34d399' : '#f87171',
                    border: (proj.isRecruiting && (proj.membersCount || 1) < (Number(proj.maxMembers) || 5) + 1) ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    {(proj.isRecruiting && (proj.membersCount || 1) < (Number(proj.maxMembers) || 5) + 1) ? '● Open for Recruiting' : '● Closed'}
                  </span>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <span className={`status-badge ${proj.status.toLowerCase()}`}>{proj.status}</span>
                  {isLeaderMatch(proj.leaderName) ? (
                    <span className="status-badge leader">⭐ Led by Me</span>
                  ) : (
                    <span className="status-badge">👤 Member</span>
                  )}
                </div>
              </div>
              <div className="trans-project-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <ModernButton variant={2} label="Workspace" onClick={() => onOpenDetails(proj)} />
                <button
                  className="dash-quick-action-btn"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                    padding: '8px 14px',
                    fontSize: '12.5px'
                  }}
                  title="Open Translation Editor Directly"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onQuickTranslate) onQuickTranslate(proj)
                  }}
                >
                  Translate
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function EditProjectModal({ editForm, setEditForm, onCancel, onSave }) {
  return (
    <div className="trans-modal-overlay">
      <div className="trans-modal-card">
        <div className="trans-modal-header">
          <h3>Edit Translation Project Info</h3>
          <button className="trans-modal-close-btn" onClick={onCancel}>×</button>
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
          <button className="trans-btn secondary" onClick={onCancel}>Cancel</button>
          <button className="trans-btn primary" onClick={onSave}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

function WorkspaceBreadcrumbs({ title, onBack }) {
  return (
    <div className="workspace-breadcrumbs">
      <button className="breadcrumb-back" onClick={onBack}>&lt; Projects</button>
      <span className="breadcrumb-divider">/</span>
      <span className="breadcrumb-current">{title}</span>
    </div>
  )
}

function WorkspaceTabs({ workspaceTab, setWorkspaceTab, membersCount, isCurrentLeader, joinRequestsCount, tasksCount }) {
  return (
    <>
      <style>{`.workspace-tabs::-webkit-scrollbar { display: none; }`}</style>
      <div
        className="workspace-tabs"
        style={{ overflowY: 'hidden', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button
          className={`workspace-tab-btn ${workspaceTab === 'home' ? 'active' : ''}`}
          onClick={() => setWorkspaceTab('home')}
        >
          Home
        </button>
        <button
          className={`workspace-tab-btn ${workspaceTab === 'members' ? 'active' : ''}`}
          onClick={() => setWorkspaceTab('members')}
        >
          Members <span className={`tab-badge ${workspaceTab === 'members' ? 'active-badge' : ''}`}>{membersCount}</span>
        </button>
        {isCurrentLeader && (
          <button
            className={`workspace-tab-btn ${workspaceTab === 'requests' ? 'active' : ''}`}
            onClick={() => setWorkspaceTab('requests')}
          >
            Requests {joinRequestsCount > 0 && <span className="tab-badge alert-badge">{joinRequestsCount}</span>}
          </button>
        )}
        <button
          className={`workspace-tab-btn ${workspaceTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setWorkspaceTab('tasks')}
        >
          Tasks <span className={`tab-badge ${workspaceTab === 'tasks' ? 'active-badge' : ''}`}>{tasksCount}</span>
        </button>
        {isCurrentLeader && (
          <button
            className={`workspace-tab-btn ${workspaceTab === 'settings' ? 'active' : ''}`}
            onClick={() => setWorkspaceTab('settings')}
          >
            Group Settings
          </button>
        )}
      </div>
    </>
  )
}

function WorkspaceDetailView({
  selectedDetails,
  setSelectedDetails,
  onBackToProjects,
  tasksLoading,
  workspaceTab,
  setWorkspaceTab,
  isCurrentLeader,
  members,
  memberSearch,
  setMemberSearch,
  onMembersLoaded,
  onLeaveTeam,
  onRemoveMember,
  joinRequests,
  onApproveRequest,
  onRejectRequest,
  showUploadForm,
  setShowUploadForm,
  uploadData,
  setUploadData,
  onUploadChapter,
  newPostText,
  setNewPostText,
  onPostAnnouncement,
  announcements,
  onLikePost,
  onTogglePinPost,
  onDeletePost,
  onAddComment,
  onLikeComment,
  comicName,
  tasks,
  activeTasks,
  pausedTasks,
  lockedColumns,
  setLockedColumns,
  highlightedColumns,
  setHighlightedColumns,
  sortedColumns,
  setSortedColumns,
  openDropdownCol,
  setOpenDropdownCol,
  onCreateTaskClick,
  onMoveAllToDone,
  onMoveTask,
  onOpenTaskDetails,
  getAssigneeInitials,
  showCreateTask,
  newTaskData,
  setNewTaskData,
  chapterOptions,
  teamMembersForAssign,
  onCancelCreateTask,
  onCreateTask,
  selectedTask,
  editTaskData,
  setEditTaskData,
  onCancelEditTask,
  onSaveEditTask,
  onContinueToWorkspace,
  onSaveWorkspaceSettings,
  onContinueToReviewWorkspace
}) {
  return (
    <div className="project-detail-workspace fade-in">
      <WorkspaceBreadcrumbs title={selectedDetails.title} onBack={onBackToProjects} />

      <WorkspaceTabs
        workspaceTab={workspaceTab}
        setWorkspaceTab={setWorkspaceTab}
        membersCount={members.length}
        isCurrentLeader={isCurrentLeader}
        joinRequestsCount={joinRequests.length}
        tasksCount={tasks.length}
      />

      {workspaceTab === 'home' && (
        <HomeTab
          selectedDetails={selectedDetails}
          isCurrentLeader={isCurrentLeader}
          showUploadForm={showUploadForm}
          setShowUploadForm={setShowUploadForm}
          uploadData={uploadData}
          setUploadData={setUploadData}
          onUploadChapter={onUploadChapter}
          newPostText={newPostText}
          setNewPostText={setNewPostText}
          onPostAnnouncement={onPostAnnouncement}
          announcements={announcements}
          onLikePost={onLikePost}
          onTogglePinPost={onTogglePinPost}
          onDeletePost={onDeletePost}
          onAddComment={onAddComment}
          onLikeComment={onLikeComment}
        />
      )}

      {workspaceTab === 'members' && (
        <MembersTab
          teamId={selectedDetails.id}
          leaderName={selectedDetails.leaderName}
          isCurrentLeader={isCurrentLeader}
          members={members}
          tasks={tasks}
          memberSearch={memberSearch}
          setMemberSearch={setMemberSearch}
          onMembersLoaded={onMembersLoaded}
          onLeaveTeam={onLeaveTeam}
          onRemoveMember={onRemoveMember}
        />
      )}

      {workspaceTab === 'requests' && (
        <RequestsTab joinRequests={joinRequests} onApprove={onApproveRequest} onReject={onRejectRequest} />
      )}

      {workspaceTab === 'tasks' && (
        <>
          {tasksLoading ? (
            <div className="fade-in" style={{ padding: '40px 0', textAlign: 'center' }}>
              <div className="skeleton-dash-shimmer" style={{ width: '100%', height: '48px', borderRadius: '12px', marginBottom: '24px' }}></div>
              <div className="skeleton-dash-shimmer" style={{ width: '100%', height: '320px', borderRadius: '16px' }}></div>
            </div>
          ) : (
            <TasksTab
              comicName={comicName}
              comicId={selectedDetails?.comicId}
              tasks={tasks}
              activeTasks={activeTasks}
              pausedTasks={pausedTasks}
              lockedColumns={lockedColumns}
              setLockedColumns={setLockedColumns}
              highlightedColumns={highlightedColumns}
              setHighlightedColumns={setHighlightedColumns}
              sortedColumns={sortedColumns}
              setSortedColumns={setSortedColumns}
              openDropdownCol={openDropdownCol}
              setOpenDropdownCol={setOpenDropdownCol}
              onCreateTaskClick={onCreateTaskClick}
              onMoveAllToDone={onMoveAllToDone}
              onMoveTask={onMoveTask}
              onOpenTaskDetails={onOpenTaskDetails}
              getAssigneeInitials={getAssigneeInitials}
              members={members}
              isCurrentLeader={isCurrentLeader}
              chapterOptions={chapterOptions}
              onOpenCreateTaskWithChapter={onCreateTaskClick}
              onCreateTask={onCreateTask}
            />
          )}

          {showCreateTask && (
            <CreateTaskModal
              comicName={comicName}
              newTaskData={newTaskData}
              setNewTaskData={setNewTaskData}
              chapterOptions={chapterOptions}
              teamMembersForAssign={teamMembersForAssign}
              tasks={tasks}
              onCancel={onCancelCreateTask}
              onCreate={onCreateTask}
            />
          )}

          {selectedTask && (
            <EditTaskModal
              editTaskData={editTaskData}
              setEditTaskData={setEditTaskData}
              teamMembersForAssign={teamMembersForAssign}
              isProjectLeader={isCurrentLeader}
              onCancel={onCancelEditTask}
              onSave={onSaveEditTask}
              onContinue={onContinueToWorkspace}
              onReview={onContinueToReviewWorkspace}
            />
          )}
        </>
      )}

      {workspaceTab === 'settings' && (
        <SettingsTab
          selectedDetails={selectedDetails}
          setSelectedDetails={setSelectedDetails}
          members={members}
          onSaveWorkspaceSettings={onSaveWorkspaceSettings}
        />
      )}
    </div>
  )
}

function TeamProjects() {
  const navigate = useNavigate()
  const location = useLocation()

  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const auth = getAuth()
  const authUser = auth?.user
  const userFullName = authUser?.fullName || authUser?.username || 'Translator'
  const user = authUser || {}

  const fetchProjects = async (silent = false) => {
    try {
      if (!silent && projects.length === 0) setLoadingProjects(true)
      const [myTeams, allTeams, allComicsRes, submissionsRes] = await Promise.all([
        getMyProjectTeamsApi().catch(() => []),
        getAllProjectTeamsApi().catch(() => []),
        getAllComicsApi().catch(() => []),
        getAllSubmissionsApi().catch(() => [])
      ])

      const dbComics = allComicsRes?.data?.data || allComicsRes?.data || (Array.isArray(allComicsRes) ? allComicsRes : []);
      const dbSubs = submissionsRes?.data?.data || submissionsRes?.data || (Array.isArray(submissionsRes) ? submissionsRes : []);

      const currentUserName = (userFullName || '').toLowerCase().trim();
      const currentUsername = (authUser?.username || '').toLowerCase().trim();
      
      const combinedProjectsMap = new Map();

      // 1. Add projects returned by backend getMyProjectTeamsApi
      (myTeams || []).forEach(p => {
        if (p && p.id) combinedProjectsMap.set(p.id, p);
      });

      // 2. Add projects from allTeams if current user is the leader OR an approved member in LocalStorage
      (allTeams || []).forEach(p => {
        if (!p || !p.id) return;

        const localApprovedKey = `comiverse_approved_members_${p.id}`;
        let savedMems = [];
        try {
          savedMems = JSON.parse(localStorage.getItem(localApprovedKey) || '[]');
        } catch (e) {}

        const isLeader = (p.leaderName || '').toLowerCase().trim() === currentUserName || (p.leaderName || '').toLowerCase().trim() === currentUsername;
        const isApprovedMember = savedMems.some(m => {
          const mn = (m.name || '').toLowerCase().trim();
          return mn === currentUserName || mn === currentUsername;
        });

        if (isLeader || isApprovedMember) {
          combinedProjectsMap.set(p.id, p);
        }
      });

      const finalProjectsList = Array.from(combinedProjectsMap.values()).map(p => {
        const localApprovedKey = `comiverse_approved_members_${p.id}`;
        let savedCount = 0;
        try {
          const saved = JSON.parse(localStorage.getItem(localApprovedKey) || '[]');
          savedCount = saved.length;
        } catch (e) { /* ignore */ }

        // Real members count = 1 (leader) + backend members + any local approved members
        const realCount = 1 + Math.max(savedCount, p.membersCount || 0);
        const maxCap = (Number(p.maxMembers) || 5) + 1;

        // Recruitment status: Default to OPEN unless full or manually closed by leader
        const localStatusKey = `comiverse_is_recruiting_${p.id}`;
        const manualStatus = localStorage.getItem(localStatusKey);

        let isRecruiting = true;
        if (manualStatus !== null) {
          isRecruiting = manualStatus === 'true';
        } else if (typeof p.isRecruiting === 'boolean') {
          isRecruiting = p.isRecruiting;
        }

        // Automatically close ONLY if team capacity is FULL
        if (realCount >= maxCap) {
          isRecruiting = false;
        }

        return {
          ...p,
          team: p.title,
          title: p.comicName,
          cover: getProjectCover(p, dbComics, dbSubs),
          membersCount: realCount,
          isRecruiting: isRecruiting
        };
      });

      setProjects(finalProjectsList)
      // Save cache to sessionStorage for instant (<5ms) future loads
      try {
        sessionStorage.setItem('comiverse_teams_list_cache', JSON.stringify(finalProjectsList));
      } catch (e) {}
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingProjects(false)
    }
  }

  useEffect(() => {
    let hasCache = false;
    try {
      const cached = sessionStorage.getItem('comiverse_teams_list_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProjects(parsed);
          setLoadingProjects(false);
          hasCache = true;
        }
      }
    } catch (e) {}

    fetchProjects(hasCache);
  }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDetails, setSelectedDetails] = useState(null)
  const [selectedEdit, setSelectedEdit] = useState(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadData, setUploadData] = useState({ chapterTitle: '', chapterContent: '', wordsCount: 3000 })
  const [editForm, setEditForm] = useState({ description: '', status: 'Active', team: '' })

  const [workspaceTab, setWorkspaceTab] = useState('home')
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)

  const [announcements, setAnnouncements] = useState([])
  const [newPostText, setNewPostText] = useState('')
  const [joinRequests, setJoinRequests] = useState([])
  const [tasks, setTasks] = useState([])
  const [lockedColumns, setLockedColumns] = useState([])
  const [highlightedColumns, setHighlightedColumns] = useState([])
  const [sortedColumns, setSortedColumns] = useState([])
  const [openDropdownCol, setOpenDropdownCol] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [editTaskData, setEditTaskData] = useState({
    title: '', status: 'backlog', priority: 'Medium', assigneeId: null, dueDate: ''
  })

  const [members, setMembers] = useState([])
  const [teamMembersForAssign, setTeamMembersForAssign] = useState([])
  const [chapterOptions, setChapterOptions] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [newTaskData, setNewTaskData] = useState({
    title: '', column: 'backlog', assigneeId: null, dueDate: '', priority: 'Medium', chapterId: null
  })

  const getAssigneeInitials = (memberId) => {
    const member = teamMembersForAssign.find(m => m.id === memberId)
    return member?.avatar || '?'
  }

  const openCreateTaskModal = (chap = null) => {
    const chId = (chap && typeof chap === 'object') ? (chap.id || null) : null;
    const defaultTitle = (chap && typeof chap === 'object' && chap.title) ? `${chap.title} - Translation & Proofreading` : '';
    setNewTaskData({
      title: defaultTitle,
      column: chId ? 'in_progress' : 'backlog',
      assigneeId: null,
      dueDate: '',
      priority: 'Medium',
      chapterId: chId
    })
    setShowCreateTask(true)
  }

  useEffect(() => {
    if (selectedDetails) {
      const updated = projects.find(p => p.id === selectedDetails.id)
      if (updated) setSelectedDetails(updated)
    } else if (projects && projects.length > 0) {
      const stateTeamId = location.state?.teamId
      const targetId = stateTeamId || localStorage.getItem('comiverse_active_project_id')
      if (targetId) {
        const matching = projects.find(p => String(p.id) === String(targetId))
        if (matching) {
          handleOpenDetails(matching, location.state?.tab || 'home')
        }
      }
    }
  }, [projects, location.state])

  useEffect(() => {
    const handleGlobalClick = () => setOpenDropdownCol(null)
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  const handleOpenDetails = async (project, initialTab = 'home') => {
    if (!project || !project.id) return;
    localStorage.setItem('comiverse_active_project_id', String(project.id));
    setSelectedDetails(project)
    setWorkspaceTab(initialTab)
    setShowUploadForm(false)
    setTasksLoading(true)

    const cacheKey = `comiverse_team_details_cache_${project.id}`;
    let hasCache = false;

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const c = JSON.parse(cached);
        if (c && Array.isArray(c.members) && c.members.length > 0) {
          setChapterOptions(c.chapterOptions || []);
          setAnnouncements(c.announcements || []);
          // NOTE: tasks are intentionally NOT restored from cache here.
          // Tasks must always reflect the live database via the API call below,
          // otherwise stale/failed-to-save tasks can "reappear" forever.
          setJoinRequests(c.joinRequests || []);
          setMembers(c.members || []);
          setTeamMembersForAssign(c.teamMembersForAssign || c.members || []);
          setLoadingWorkspace(false);
          hasCache = true;
        }
      }
    } catch (e) {}

    if (!hasCache) {
      setLoadingWorkspace(true);
    }

    const initialLeader = {
      id: `leader-${project.id}`,
      name: project.leaderName || userFullName,
      role: 'Group Leader',
      status: 'Offline',
      online: false,
      joinDate: '01/15/2024',
      contributions: `${project.chaptersCount || 0} chapters`,
      avatar: project.leaderInitials || 'TL'
    };

    // Load saved approved members from LocalStorage
    const localApprovedKey = `comiverse_approved_members_${project.id}`;
    let savedApprovedMems = [];
    try {
      const saved = localStorage.getItem(localApprovedKey);
      if (saved) savedApprovedMems = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    try {
      const [annList, taskList, reqList, teamMembersList] = await Promise.all([
        getTeamAnnouncementsApi(project.id),
        getTeamTasksApi(project.id),
        getTeamRequestsApi(project.id),
        getTeamMembersApi(project.id).catch((err) => {
          console.error('Could not load real team members for assignee picker:', err)
          return []
        })
      ])

      const rawComicTitle = project.comicName || project.title || 'Comic';
      let finalChapters = [];

      let effectiveComicId = project.comicId || project.comic_id || project.comic?.id;
      if (!effectiveComicId && project.comicName) {
        try {
          const pageRes = await getComicsPageApi(1, 10, project.comicName);
          const list = pageRes?.content || pageRes?.data?.content || pageRes?.data || (Array.isArray(pageRes) ? pageRes : []);
          const matchC = list.find(c => c.title && c.title.toLowerCase().trim() === project.comicName.toLowerCase().trim()) || list[0];
          if (matchC) effectiveComicId = matchC.id || matchC.comicId;
        } catch (e) {
          console.warn('Could not find comic by name', e);
        }
      }
      if (effectiveComicId) {
        // Fallback: fetch chapters directly from the comic's chapter list (using both public and author APIs like Moderator)
        try {
          let chapList = [];
          try {
            const comicChapters = await getChaptersByComicIdApi(effectiveComicId, {}, true);
            const list = Array.isArray(comicChapters) ? comicChapters : (comicChapters?.content || comicChapters?.data || []);
            if (list.length > 0) chapList = list;
          } catch (e) { /* ignore */ }

          if (chapList.length === 0) {
            try {
              const authorChapters = await getAuthorComicChaptersApi(effectiveComicId);
              const list = Array.isArray(authorChapters) ? authorChapters : (authorChapters?.content || authorChapters?.data || []);
              if (list.length > 0) chapList = list;
            } catch (e) { /* ignore */ }
          }

          if (chapList.length > 0) {
            // Filter to only approved chapters
            const approvedChapters = chapList.filter(ch => {
              const status = (ch.status || ch.moderationStatus || '').toUpperCase();
              return !status || status === 'APPROVED' || status === 'PUBLISHED' || status === 'READY';
            });
            
            finalChapters = approvedChapters.map((ch, idx) => {
              const realChId = ch.id || ch.chapterId || ch.chapter_id;
              return {
                ...ch,
                id: realChId || `ch-${project.id}-${idx + 1}`,
                comicId: ch.comicId || effectiveComicId,
                title: ch.title || `${rawComicTitle} - Chapter ${idx + 1}`,
                pagesCount: ch.pagesCount || ch.pages?.length || ch.images?.length || ch.pageCount || 24,
                pages: ch.pages || ch.images || [],
                status: 'Approved Raw Manuscript'
              };
            });
          }
        } catch (chErr) {
          console.error('Could not load chapters from comic:', chErr);
        }
      }

      // Attempt to load mock images from moderator's local override
      try {
        const overrideRaw = localStorage.getItem('comiverse_moderator_submissions_override');
        if (overrideRaw) {
          const parsed = JSON.parse(overrideRaw);
          const targetName = (project.comicName || project.title || '').toLowerCase().trim();
          const matchSub = parsed.find(s => (s.title && s.title.toLowerCase().trim() === targetName) || (s.comicName && s.comicName.toLowerCase().trim() === targetName));
          if (matchSub) {
            const chaps = matchSub.allChapters || matchSub.chapters || [];
            if (chaps.length > 0) {
              const enrichedChapters = chaps.map((ch, idx) => {
                const realChId = ch.id || ch.chapterId || ch.chapter_id;
                return {
                  ...ch,
                  id: realChId || `ch-${project.id}-${idx + 1}`,
                  comicId: ch.comicId || effectiveComicId,
                  title: ch.title || `${rawComicTitle} - Chapter ${idx + 1}`,
                  pagesCount: ch.pagesCount || ch.pages?.length || ch.images?.length || ch.pageCount || 24,
                  pages: ch.pages || ch.images || [],
                  status: 'Approved Raw Manuscript'
                };
              });
              
              if (finalChapters.length > 0) {
                finalChapters = finalChapters.map((fc, i) => {
                  const match = enrichedChapters.find(ec => ec.title === fc.title || ec.id === fc.id) || enrichedChapters[i];
                  return match && (match.pages?.length > 0) ? { ...fc, pages: match.pages, pagesCount: match.pagesCount } : fc;
                });
              } else {
                finalChapters = enrichedChapters;
              }
            }
          }
        }
      } catch (e) { /* ignore */ }

      // Default: Every approved comic submitted by author has at least Chapter 1 (Approved Raw Manuscript)
      if (finalChapters.length === 0) {
        finalChapters = [
          {
            id: `ch-${project.id}-1`,
            comicId: project.comicId,
            title: `${rawComicTitle} - Chapter 1`,
            pagesCount: 24,
            pages: [],
            status: 'Approved Raw Manuscript'
          }
        ];
      }

      setChapterOptions(finalChapters);

      // Load saved pinned post IDs from LocalStorage
      const localPinnedKey = `comiverse_pinned_posts_${project.id}`;
      let savedPinnedIds = [];
      try {
        const savedPin = localStorage.getItem(localPinnedKey);
        if (savedPin) savedPinnedIds = JSON.parse(savedPin);
      } catch (e) {}

      const now = Date.now();
      const mappedAnnouncements = (annList || []).map((p, idx) => {
        let ts = 0;
        const rawTime = p.createdAt || p.time || p.timestamp;
        if (rawTime && rawTime !== 'Just now') {
          const d = new Date(rawTime);
          if (!isNaN(d.getTime())) ts = d.getTime();
        }
        // If timestamp is missing or 'Just now', assign realistic descending timestamps (1h, 2h, 3h ago...)
        if (!ts) {
          ts = now - (idx + 1) * 3600000;
        }

        const cmtKey = `comiverse_announcement_comments_${project.id}_${p.id}`;
        let savedComments = [];
        try {
          const savedCmt = localStorage.getItem(cmtKey);
          if (savedCmt) savedComments = JSON.parse(savedCmt);
        } catch (e) {}

        const combinedCommentsMap = new Map();
        (p.comments || []).forEach(c => { if (c && c.id) combinedCommentsMap.set(c.id, c); });
        savedComments.forEach(c => { if (c && c.id) combinedCommentsMap.set(c.id, c); });

        return {
          ...p,
          timestamp: ts,
          createdAt: p.createdAt || new Date(ts).toISOString(),
          isPinned: Boolean(p.isPinned || savedPinnedIds.includes(p.id)),
          attachedImage: p.imageUrl || p.attachedImage || null,
          comments: Array.from(combinedCommentsMap.values())
        };
      });
      setAnnouncements(mappedAnnouncements)
      
      // Tasks always come straight from the API — no localStorage merge.
      // Merging in a locally-cached copy caused tasks that failed to save to the
      // backend (or were left over from earlier tests) to keep reappearing in the
      // UI even after they were deleted/changed directly in the database.
      const finalCombinedTasks = Array.isArray(taskList) ? taskList : [];
      setTasks(finalCombinedTasks);
      setTasksLoading(false);

      const mappedRequests = reqList.map(r => ({ ...r, roles: typeof r.roles === 'string' ? r.roles.split(',') : r.roles }));
      setJoinRequests(mappedRequests)

      const backendMems = Array.isArray(teamMembersList) ? teamMembersList : [];
      const combinedMap = new Map();

      // 1. Add Leader
      combinedMap.set((initialLeader.name || '').toLowerCase().trim(), initialLeader);

      // 2. Add backend members
      backendMems.forEach(m => {
        if (m && m.name) {
          const key = m.name.toLowerCase().trim();
          const existing = combinedMap.get(key);
          combinedMap.set(key, existing ? { ...existing, ...m } : m);
        }
      });

      // 3. Add saved approved members
      savedApprovedMems.forEach(m => {
        if (m && m.name) {
          const key = m.name.toLowerCase().trim();
          if (!combinedMap.has(key)) combinedMap.set(key, m);
        }
      });

      const finalMembersList = Array.from(combinedMap.values());
      setMembers(finalMembersList);
      setTeamMembersForAssign(finalMembersList);

      const realCount = finalMembersList.length;
      const maxCap = (Number(project.maxMembers) || 5) + 1;

      // Recruitment status: Default to OPEN unless full or manually closed by leader
      const localStatusKey = `comiverse_is_recruiting_${project.id}`;
      const manualStatus = localStorage.getItem(localStatusKey);

      let isRecruiting = true;
      if (manualStatus !== null) {
        isRecruiting = manualStatus === 'true';
      } else if (typeof project.isRecruiting === 'boolean') {
        isRecruiting = project.isRecruiting;
      }

      // Automatically close ONLY if team capacity is FULL
      if (realCount >= maxCap) {
        isRecruiting = false;
      }

      const updatedDetails = {
        ...project,
        membersCount: realCount,
        isRecruiting: isRecruiting
      };

      setSelectedDetails(updatedDetails);
      setProjects(prev => prev.map(p => p.id === project.id ? updatedDetails : p));

      // Cache details to sessionStorage for instantaneous (<5ms) future opens
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          chapterOptions: finalChapters,
          announcements: mappedAnnouncements,
          joinRequests: mappedRequests,
          members: finalMembersList,
          teamMembersForAssign: finalMembersList
        }));
      } catch (e) {}
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingWorkspace(false)
      setTasksLoading(false)
    }
  }

  useEffect(() => {
    if (loadingProjects) return
    const targetTeamId = location.state?.teamId
    if (!targetTeamId) return

    const targetProject = projects.find(p => p.id === targetTeamId)
    if (targetProject) {
      handleOpenDetails(targetProject).then(() => {
        setWorkspaceTab(location.state?.tab || 'home')
      })
    }

    navigate(location.pathname, { replace: true, state: {} })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProjects, projects, location.state])

  const handleOpenEdit = (project, e) => {
    e.stopPropagation()
    setSelectedEdit(project)
    setEditForm({
      description: project.description || '',
      status: project.status || 'Active',
      team: project.title || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!selectedEdit) return
    try {
      const updated = await updateProjectTeamApi(selectedEdit.id, {
        id: selectedEdit.id,
        title: editForm.team,
        comicName: selectedEdit.title,
        status: editForm.status,
        description: editForm.description,
        deadline: selectedEdit.deadline,
        sourceLang: selectedEdit.sourceLang,
        targetLang: selectedEdit.targetLang,
        priority: selectedEdit.priority,
        cover: selectedEdit.cover,
        isRecruiting: selectedEdit.isRecruiting,
        maxMembers: selectedEdit.maxMembers,
        leaderName: selectedEdit.leaderName,
        leaderInitials: selectedEdit.leaderInitials,
        membersCount: selectedEdit.membersCount,
        chaptersCount: selectedEdit.chaptersCount,
        progress: selectedEdit.progress,
        assignedToMe: selectedEdit.assignedToMe
      })
      const mappedUpdated = { ...updated, team: updated.title, title: updated.comicName }
      setProjects(prev => prev.map(proj => (proj.id === selectedEdit.id ? mappedUpdated : proj)))
      toast.success('Project details updated successfully!')
      setSelectedEdit(null)
      if (selectedDetails && selectedDetails.id === selectedEdit.id) {
        setSelectedDetails(mappedUpdated)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to save project updates.')
    }
  }

  const handleSaveWorkspaceSettings = async () => {
    if (!selectedDetails) return

    // Save manual recruitment status choice to LocalStorage
    localStorage.setItem(`comiverse_is_recruiting_${selectedDetails.id}`, String(selectedDetails.isRecruiting))

    try {
      const updated = await updateProjectTeamApi(selectedDetails.id, {
        id: selectedDetails.id,
        title: selectedDetails.team,
        comicName: selectedDetails.title,
        status: selectedDetails.status,
        description: selectedDetails.description,
        deadline: selectedDetails.deadline,
        sourceLang: selectedDetails.sourceLang,
        targetLang: selectedDetails.targetLang,
        priority: selectedDetails.priority,
        cover: selectedDetails.cover,
        isRecruiting: selectedDetails.isRecruiting,
        maxMembers: Number(selectedDetails.maxMembers) || 5,
        leaderName: selectedDetails.leaderName,
        leaderInitials: selectedDetails.leaderInitials,
        membersCount: selectedDetails.membersCount,
        chaptersCount: selectedDetails.chaptersCount,
        progress: selectedDetails.progress,
        assignedToMe: selectedDetails.assignedToMe,
        notes: selectedDetails.description || selectedDetails.notes || ''
      })
      const mappedUpdated = { ...selectedDetails, ...updated, team: updated.title || selectedDetails.team, title: updated.comicName || selectedDetails.title, isRecruiting: selectedDetails.isRecruiting }
      setProjects(prev => prev.map(proj => (proj.id === selectedDetails.id ? mappedUpdated : proj)))
      setSelectedDetails(mappedUpdated)
      toast.success('Workspace details saved successfully!')
    } catch (err) {
      console.warn('Backend update workspace settings fallback:', err)
      setProjects(prev => prev.map(proj => (proj.id === selectedDetails.id ? selectedDetails : proj)))
      toast.success('Workspace details saved locally!')
    }
  }

  const handleUploadChapter = async () => {
    if (!selectedDetails || !uploadData.chapterTitle.trim()) return

    const submission = {
      title: selectedDetails.title,
      chapter: uploadData.chapterTitle.trim(),
      submittedBy: selectedDetails.team,
      queueType: 'translator',
      timeLabel: 'Just now',
      timestamp: Date.now(),
      words: Number(uploadData.wordsCount) || 3000,
      priority: selectedDetails.priority || 'Medium',
      flags: 0,
      status: 'pending',
      cover: getProjectCover(selectedDetails),
      content: uploadData.chapterContent
    }

    try {
      await createSubmissionApi(submission)
      toast.success('Chapter uploaded successfully and sent for review!')
      if (selectedDetails.chaptersList) {
        selectedDetails.chaptersList.unshift({
          num: uploadData.chapterTitle.trim(),
          words: Number(uploadData.wordsCount) || 3000,
          date: 'Just now'
        })
      }
      setUploadData({ chapterTitle: '', chapterContent: '', wordsCount: 3000 })
      setShowUploadForm(false)
    } catch (err) {
      console.error(err)
      toast.error('Failed to submit chapter.')
    }
  }

  const handleTogglePinPost = async (postId) => {
    try {
      if (typeof postId === 'string' && !postId.startsWith('temp-')) {
        await pinTeamAnnouncementApi(postId)
      }
      let wasPinned = false
      setAnnouncements(prev => {
        const updated = prev.map(p => {
          if (p.id === postId) {
            wasPinned = !p.isPinned
            return { ...p, isPinned: !p.isPinned }
          }
          return p
        })
        if (selectedDetails?.id) {
          const localPinnedKey = `comiverse_pinned_posts_${selectedDetails.id}`
          const pinnedIds = updated.filter(p => p.isPinned).map(p => p.id)
          localStorage.setItem(localPinnedKey, JSON.stringify(pinnedIds))
        }
        return updated
      })
      if (wasPinned) {
        toast.success('📌 Post pinned to top of feed!')
      } else {
        toast.info('Post unpinned.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to pin post.')
    }
  }

  const handleDeletePost = async (postId) => {
    try {
      if (typeof postId !== 'string' || !postId.startsWith('temp-')) {
        await deleteTeamAnnouncementApi(postId)
      }
      setAnnouncements(prev => prev.filter(p => p.id !== postId))
      toast.success('Post deleted successfully.')
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete post.')
    }
  }

  const handlePostAnnouncement = async (customText, attachedImage = null) => {
    const textToPost = typeof customText === 'string' ? customText : newPostText
    if (!textToPost.trim() && !attachedImage) return
    const nowMs = Date.now()
    const nowIso = new Date(nowMs).toISOString()
    try {
      let finalImageUrl = undefined;
      
      if (attachedImage instanceof File) {
        const loadingToastId = toast.loading('Uploading image...')
        try {
          const uploadRes = await uploadImageApi(attachedImage)
          finalImageUrl = typeof uploadRes === 'string' ? uploadRes : (uploadRes?.url || uploadRes?.data || uploadRes)
          toast.dismiss(loadingToastId)
        } catch (uploadErr) {
          toast.dismiss(loadingToastId)
          toast.error('Failed to upload image.')
          return
        }
      } else if (typeof attachedImage === 'string') {
        finalImageUrl = attachedImage
      }

      const created = await createTeamAnnouncementApi(selectedDetails.id, {
        author: userFullName,
        role: (selectedDetails.leaderName || '').toLowerCase().trim() === userFullName.toLowerCase().trim() ? 'Group Leader' : 'Member',
        avatar: userFullName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2),
        time: nowIso,
        createdAt: nowIso,
        content: textToPost.trim(),
        imageUrl: finalImageUrl
      })
      const newPostObj = {
        ...created,
        timestamp: nowMs,
        createdAt: created?.createdAt || nowIso,
        time: created?.time || nowIso,
        attachedImage: finalImageUrl || created?.imageUrl || null,
        isPinned: false,
        comments: []
      }
      setAnnouncements(prev => [newPostObj, ...prev])
      setNewPostText('')
      toast.success('Announcement posted to group feed!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to post announcement.')
    }
  }

  const handleAddComment = async (postId, commentText, replyTarget = null) => {
    if (!commentText || !commentText.trim()) return
    const nowIso = new Date().toISOString()
    const newComment = {
      id: `cmt-${Date.now()}`,
      author: userFullName,
      avatar: userFullName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2),
      createdAt: nowIso,
      timestamp: Date.now(),
      text: commentText.trim(),
      content: commentText.trim(),
      likes: 0,
      replyToAuthor: replyTarget?.author || null
    }

    try {
      if (typeof postId === 'string' && !postId.startsWith('temp-')) {
        const created = await createTeamPostCommentApi(postId, {
          author: newComment.author,
          avatar: newComment.avatar,
          time: newComment.createdAt,
          content: newComment.text,
          replyToAuthor: newComment.replyToAuthor
        });
        newComment.id = created.id;
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to post comment.');
      return;
    }

    setAnnouncements(prev => {
      return prev.map(post => {
        if (post.id === postId) {
          const updatedComments = [...(post.comments || []), newComment]
          // Save to LocalStorage for this project & post
          if (selectedDetails?.id) {
            const cmtKey = `comiverse_announcement_comments_${selectedDetails.id}_${postId}`
            try {
              localStorage.setItem(cmtKey, JSON.stringify(updatedComments))
            } catch (e) { console.warn(e) }
          }
          return { ...post, comments: updatedComments }
        }
        return post
      })
    })

    if (replyTarget?.author) {
      toast.info(`🔔 Replied to @${replyTarget.author}!`)
    } else {
      const targetPost = announcements.find(p => p.id === postId);
      toast.info(`🔔 Replied to ${targetPost?.author || 'post'}!`)
    }
  }

  const handleLikeComment = (postId, commentId) => {
    setAnnouncements(prev => {
      return prev.map(post => {
        if (post.id === postId) {
          const updatedComments = (post.comments || []).map(cmt => {
            if (cmt.id === commentId) {
              return { ...cmt, likes: (cmt.likes || 0) + 1 }
            }
            return cmt
          })
          if (selectedDetails?.id) {
            const cmtKey = `comiverse_announcement_comments_${selectedDetails.id}_${postId}`
            try {
              localStorage.setItem(cmtKey, JSON.stringify(updatedComments))
            } catch (e) { console.warn(e) }
          }
          return { ...post, comments: updatedComments }
        }
        return post
      })
    })
  }

  const handleLeaveTeam = (teamId) => {
    const localApprovedKey = `comiverse_approved_members_${teamId}`
    try {
      localStorage.removeItem(localApprovedKey)
    } catch (e) {}

    setProjects(prev => prev.filter(p => p.id !== teamId))
    setSelectedDetails(null)
    toast.info('You have left the project team.')
  }

  const handleRemoveMember = (teamId, memberId, memberName) => {
    setMembers(prev => prev.filter(m => m.id !== memberId))
    toast.success(`Removed ${memberName} from the project team.`)
  }

  const handleLikePost = async (id) => {
    try {
      const updated = await likeTeamAnnouncementApi(id)
      setAnnouncements(prev => prev.map(post => post.id === id ? { ...post, likes: updated.likes } : post))
    } catch (err) {
      console.error(err)
    }
  }

  const handleApproveRequest = async (id, name, requestObj = {}) => {
    const reqId = typeof id === 'object' ? id?.id : id
    const reqName = typeof id === 'object' ? id?.name : name
    const requesterId = typeof id === 'object' ? id?.requesterId : requestObj?.requesterId

    if (!reqId) {
      console.error('[TeamProjects] Cannot approve request: Missing request ID', { id, name, requestObj })
      toast.error('Failed to approve request: Invalid request ID.')
      return
    }

    // 1. Optimistically update local UI states instantly (<5ms)
    setJoinRequests(prev => prev.filter(req => req.id !== reqId))

    const newMem = {
      id: requesterId || `mem-${Date.now()}`,
      name: reqName || 'Member',
      role: 'Member',
      status: 'Offline',
      online: false,
      joinDate: new Date().toLocaleDateString('en-US'),
      contributions: '0 chapters',
      avatar: (reqName || 'M').split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)
    }

    // Persist approved member to LocalStorage immediately
    if (selectedDetails?.id) {
      const localApprovedKey = `comiverse_approved_members_${selectedDetails.id}`;
      try {
        const existingSaved = JSON.parse(localStorage.getItem(localApprovedKey) || '[]');
        const isAlreadySaved = existingSaved.some(m => (m.name || '').toLowerCase().trim() === (newMem.name || '').toLowerCase().trim());
        if (!isAlreadySaved) {
          existingSaved.push(newMem);
          localStorage.setItem(localApprovedKey, JSON.stringify(existingSaved));
        }
      } catch (e) { console.warn(e); }
    }

    setMembers(prev => {
      const exists = prev.some(m => (m.name || '').toLowerCase().trim() === (newMem.name || '').toLowerCase().trim());
      return exists ? prev : [...prev, newMem];
    });

    setTeamMembersForAssign(prev => {
      const exists = prev.some(m => (m.name || '').toLowerCase().trim() === (newMem.name || '').toLowerCase().trim());
      return exists ? prev : [...prev, newMem];
    });

    if (selectedDetails) {
      const newCount = (members.length || 1) + 1
      const maxCapacityWithLeader = (Number(selectedDetails.maxMembers) || 5) + 1
      const isStillRecruiting = newCount < maxCapacityWithLeader && selectedDetails.isRecruiting

      const updatedDetails = {
        ...selectedDetails,
        membersCount: newCount,
        isRecruiting: isStillRecruiting
      }

      setSelectedDetails(updatedDetails)
      setProjects(prev => prev.map(p => p.id === selectedDetails.id ? updatedDetails : p))
    }

    toast.success(`🎉 Approved ${reqName} and added to project members!`)

    // 2. Fire backend query asynchronously in background
    try {
      await decideTeamRequestApi(reqId, 'approved')
    } catch (err) {
      console.error('[TeamProjects] Backend decide team request error:', err)
    }
  }

  const handleRejectRequest = async (id, name) => {
    const reqId = typeof id === 'object' ? id?.id : id
    const reqName = typeof id === 'object' ? id?.name : name

    if (!reqId) {
      console.error('[TeamProjects] Cannot reject request: Missing request ID', { id, name })
      toast.error('Failed to reject request: Invalid request ID.')
      return
    }

    // Optimistically remove from UI instantly
    setJoinRequests(prev => prev.filter(req => req.id !== reqId))
    toast.info(`Rejected request from ${reqName}.`)

    try {
      await decideTeamRequestApi(reqId, 'rejected')
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateTask = async (customData = null) => {
    const data = customData || newTaskData
    if (!data || !data.title || !data.title.trim()) return
    if (!data.chapterId) {
      toast.error('Please select a chapter.')
      return
    }
    if (!data.assigneeId) {
      toast.error('Please assign someone to this task.')
      return
    }

    const comicName = selectedDetails?.comicName || selectedDetails?.title || 'Unknown Comic'
    const cleanTitle = data.title.trim()
    const formattedTitle = cleanTitle.startsWith('[') ? cleanTitle : `[${(data.priority || 'MEDIUM').toUpperCase()}] [${comicName}] ${cleanTitle}`
    const dueDateVal = data.dueDate || new Date().toISOString().split('T')[0]

    const newTaskObj = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: formattedTitle,
      status: data.column || 'backlog',
      assigneeId: data.assigneeId,
      chapterId: data.chapterId,
      dueDate: dueDateVal,
      createdAt: new Date().toISOString()
    }

    let taskToSave = null

    try {
      const created = await createTeamTaskApi(selectedDetails.id, {
        title: formattedTitle,
        status: data.column || 'backlog',
        assigneeId: data.assigneeId,
        chapterId: data.chapterId,
        dueDate: dueDateVal
      })
      taskToSave = (created && (created.id || created.title)) ? { ...newTaskObj, ...created } : newTaskObj
    } catch (err) {
      console.error('Backend createTeamTaskApi error, task was NOT created:', err)
      toast.error('Failed to create task. Please try again.')
      return
    }

    const updatedTasks = [...tasks, taskToSave]
    setTasks(updatedTasks)

    if (!customData) {
      setNewTaskData({ title: '', column: 'backlog', assigneeId: null, dueDate: '', priority: 'Medium', chapterId: null })
      setShowCreateTask(false)
    }
    toast.success('Task created successfully!')
  }

  const handleMoveTask = async (id, newCol) => {
    const previousTasks = tasks
    const updatedTasks = tasks.map(task => task.id === id ? { ...task, status: newCol } : task)
    setTasks(updatedTasks)

    try {
      await updateTeamTaskApi(id, { status: newCol })
    } catch (err) {
      console.error('Backend updateTeamTaskApi error, reverting move:', err)
      toast.error('Failed to move task. Please try again.')
      setTasks(previousTasks)
    }
  }

  const handleOpenTaskDetails = (task) => {
    const comicFallback = selectedDetails?.comicName || selectedDetails?.title || 'Unknown Comic'
    const { priority, cleanTitle, comicProject } = parseTaskTitle(task.title, comicFallback)
    setSelectedTask(task)
    setEditTaskData({
      title: cleanTitle,
      comic: comicProject || '',
      status: getTaskColumn(task),
      priority: priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase(),
      assigneeId: task.assigneeId || null,
      dueDate: task.dueDate || '',
      taskId: task.id || task._id || task.taskId || task.TaskID || 'KHONG-TIM-THAY-ID'
    })
  }

  const handleSaveEditTask = async () => {
    if (!selectedTask || !editTaskData) return
    const comicFallback = selectedDetails?.comicName || selectedDetails?.title || 'Unknown Comic'
    const formattedTitle = `[${(editTaskData.priority || 'MEDIUM').toUpperCase()}] [${editTaskData.comic || comicFallback}] ${editTaskData.title.trim()}`

    const targetId = selectedTask.id || selectedTask._id || selectedTask.taskId
    const updatedTaskObj = {
      ...selectedTask,
      title: formattedTitle,
      status: editTaskData.status,
      assigneeId: editTaskData.assigneeId,
      dueDate: editTaskData.dueDate
    }

    const previousTasks = tasks
    const updatedTasks = tasks.map(t => (t.id === targetId || t._id === targetId) ? updatedTaskObj : t)
    setTasks(updatedTasks)

    try {
      await updateTeamTaskApi(targetId, {
        title: formattedTitle,
        status: editTaskData.status,
        assigneeId: editTaskData.assigneeId,
        dueDate: editTaskData.dueDate
      })
    } catch (err) {
      console.error('Backend updateTeamTaskApi error, reverting edit:', err)
      toast.error('Failed to save task changes. Please try again.')
      setTasks(previousTasks)
      return
    }

    toast.success('Task updated successfully!')
    setSelectedTask(null)
  }

  const handleMoveAllToDone = async (colId) => {
    const targets = tasks.filter(t => getTaskColumn(t) === colId)
    if (targets.length === 0) return

    const previousTasks = tasks
    const updatedTasks = tasks.map(t => getTaskColumn(t) === colId ? { ...t, status: 'completed' } : t)
    setTasks(updatedTasks)

    toast.success(`Moved all tasks from ${colId} to Completed!`)

    try {
      await Promise.all(targets.map(t => updateTeamTaskApi(t.id, {
        status: 'completed',
        dueDate: t.dueDate,
        assigneeId: t.assigneeId
      })))
    } catch (err) {
      console.error('Backend move all tasks error, reverting:', err)
      toast.error('Failed to move some tasks. Please try again.')
      setTasks(previousTasks)
    }
  }

  const isLeaderMatch = (leaderName) => {
    if (!leaderName) return false
    const ln = leaderName.toLowerCase().trim()
    const username = (authUser?.username || '').toLowerCase().trim()
    const fullName = (authUser?.fullName || '').toLowerCase().trim()
    return ln === username || ln === fullName
  }

  const teamProjectsList = projects.filter(proj =>
    (proj.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (proj.comicName || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loadingProjects && projects.length === 0) {
    return (
      <div className="fade-in trans-projects-container" style={{ padding: '0 0 40px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div className="skeleton-dash-shimmer" style={{ width: '240px', height: '28px', marginBottom: '8px' }}></div>
          <div className="skeleton-dash-shimmer" style={{ width: '380px', height: '16px' }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="skeleton-dash-shimmer" style={{ height: '100px', borderRadius: '16px' }}></div>
          <div className="skeleton-dash-shimmer" style={{ height: '100px', borderRadius: '16px' }}></div>
          <div className="skeleton-dash-shimmer" style={{ height: '100px', borderRadius: '16px' }}></div>
        </div>
      </div>
    )
  }

  if (selectedDetails) {
    if (loadingWorkspace && members.length === 0) {
      return (
        <div className="fade-in trans-projects-container" style={{ padding: '0 0 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <div className="skeleton-dash-shimmer" style={{ width: '280px', height: '28px', marginBottom: '8px' }}></div>
              <div className="skeleton-dash-shimmer" style={{ width: '180px', height: '16px' }}></div>
            </div>
            <div className="skeleton-dash-shimmer" style={{ width: '120px', height: '36px', borderRadius: '10px' }}></div>
          </div>
          <div className="skeleton-dash-shimmer" style={{ width: '100%', height: '48px', borderRadius: '12px', marginBottom: '24px' }}></div>
          <div className="skeleton-dash-shimmer" style={{ width: '100%', height: '320px', borderRadius: '16px' }}></div>
        </div>
      )
    }

    const isCurrentLeader = isLeaderMatch(selectedDetails.leaderName)

    const activeTasks = tasks.filter(t => getTaskColumn(t) !== 'paused')
    const pausedTasks = tasks.filter(t => getTaskColumn(t) === 'paused')
    const comicName = selectedDetails?.comicName || selectedDetails?.title
    const filteredMembers = members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()))

    return (
      <WorkspaceDetailView
        selectedDetails={selectedDetails}
        setSelectedDetails={setSelectedDetails}
        tasksLoading={tasksLoading}
        onBackToProjects={() => {
          localStorage.removeItem('comiverse_active_project_id');
          setSelectedDetails(null);
        }}
        workspaceTab={workspaceTab}
        setWorkspaceTab={setWorkspaceTab}
        isCurrentLeader={isCurrentLeader}
        members={members}
        memberSearch={memberSearch}
        setMemberSearch={setMemberSearch}
        onMembersLoaded={setMembers}
        onLeaveTeam={handleLeaveTeam}
        onRemoveMember={handleRemoveMember}
        joinRequests={joinRequests}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
        showUploadForm={showUploadForm}
        setShowUploadForm={setShowUploadForm}
        uploadData={uploadData}
        setUploadData={setUploadData}
        onUploadChapter={handleUploadChapter}
        newPostText={newPostText}
        setNewPostText={setNewPostText}
        onPostAnnouncement={handlePostAnnouncement}
        announcements={announcements}
        onLikePost={handleLikePost}
        onTogglePinPost={handleTogglePinPost}
        onDeletePost={handleDeletePost}
        onAddComment={handleAddComment}
        onLikeComment={handleLikeComment}
        comicName={comicName}
        tasks={tasks}
        activeTasks={activeTasks}
        pausedTasks={pausedTasks}
        lockedColumns={lockedColumns}
        setLockedColumns={setLockedColumns}
        highlightedColumns={highlightedColumns}
        setHighlightedColumns={setHighlightedColumns}
        sortedColumns={sortedColumns}
        setSortedColumns={setSortedColumns}
        openDropdownCol={openDropdownCol}
        setOpenDropdownCol={setOpenDropdownCol}
        onCreateTaskClick={openCreateTaskModal}
        onMoveAllToDone={handleMoveAllToDone}
        onMoveTask={handleMoveTask}
        onOpenTaskDetails={handleOpenTaskDetails}
        getAssigneeInitials={getAssigneeInitials}
        showCreateTask={showCreateTask}
        newTaskData={newTaskData}
        setNewTaskData={setNewTaskData}
        chapterOptions={chapterOptions}
        teamMembersForAssign={teamMembersForAssign}
        onCancelCreateTask={() => setShowCreateTask(false)}
        onCreateTask={handleCreateTask}
        selectedTask={selectedTask}
        editTaskData={editTaskData}
        setEditTaskData={setEditTaskData}
        onCancelEditTask={() => setSelectedTask(null)}
        onSaveEditTask={handleSaveEditTask}
        onContinueToWorkspace={() => navigate(`/translator/translate-workspace/task/${selectedTask.id}`)}
        onContinueToReviewWorkspace={() => navigate(`/translator/review-workspace/task/${selectedTask.id}`)}
        onSaveWorkspaceSettings={handleSaveWorkspaceSettings}
      />
    )
  }

  const handleQuickTranslate = async (proj) => {
    try {
      // Always fetch the live task list from the API — tasks are no longer
      // cached in localStorage/sessionStorage, so this always reflects the
      // current database state.
      let taskList = [];
      try {
        const tRes = await getTeamTasksApi(proj.id);
        taskList = Array.isArray(tRes) ? tRes : (tRes?.data || tRes?.content || []);
      } catch (e) {}

      let targetTask = taskList.find(t => {
        const col = (t.column || t.status || '').toLowerCase();
        return col.includes('progress') || col.includes('doing');
      }) || taskList[0];

      const targetTaskId = targetTask?.id || `task-${proj.id}`;

      // Pre-warm workspace cache to avoid 0-page flickering
      const rawComicTitle = proj.comicName || proj.title || 'Comic';
      const cleanTitle = targetTask?.title || `${rawComicTitle} - Chapter 1 - Translation`;
      const chId = targetTask?.chapterId || `ch-${proj.id}-1`;

      const cacheKey = `comiverse_ws_cache_${targetTaskId}`;
      if (!sessionStorage.getItem(cacheKey)) {
        try {
          const cachedPages = sessionStorage.getItem(`comiverse_chapter_pages_${chId}`);
          let pages = [];
          if (cachedPages) {
            pages = JSON.parse(cachedPages);
          } else if (Array.isArray(targetTask?.pages) && targetTask.pages.length > 0) {
            pages = targetTask.pages;
          }

          if (pages.length > 0) {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              chapter: {
                id: chId,
                title: cleanTitle,
                comicTitle: rawComicTitle,
                pagesCount: pages.length,
                pages: pages
              },
              pages: pages
            }));
          }
        } catch (e) {}
      }

      navigate(`/translator/translate-workspace/task/${targetTaskId}`);
    } catch (err) {
      navigate(`/translator/translate-workspace/task/task-${proj.id}`);
    }
  };

  return (
    <>
      <ProjectsListView
        teamProjectsList={teamProjectsList}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenDetails={handleOpenDetails}
        onQuickTranslate={handleQuickTranslate}
        onOpenEdit={handleOpenEdit}
        isLeaderMatch={isLeaderMatch}
      />
      {selectedEdit && (
        <EditProjectModal
          editForm={editForm}
          setEditForm={setEditForm}
          onCancel={() => setSelectedEdit(null)}
          onSave={handleSaveEdit}
        />
      )}
    </>
  )
}

export default TeamProjects