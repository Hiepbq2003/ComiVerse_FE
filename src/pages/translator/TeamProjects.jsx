import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom';
import '../../assets/style/translator/team-projects.css'
import ModernButton from '../../components/common/ModernButton'
import { getMyProjectTeamsApi, updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { createSubmissionApi } from '../../services/api/SubmissionApi'
import { getAuth } from '../../utils/Auth'
import { formatTimeAgo } from '../../utils/formatTimeAgo'
import { AIPopover } from '../../components/common/AIPopover'
import { uploadImageApi } from '../../services/api/UploadApi'

import {
  getTeamAnnouncementsApi,
  createTeamAnnouncementApi,
  likeTeamAnnouncementApi,
  pinTeamAnnouncementApi,
  getTeamPostCommentsApi,
  createTeamPostCommentApi,
  likeTeamPostCommentApi,
  getTeamMessagesApi,
  createTeamMessageApi,
  getTeamTasksApi,
  getTeamMembersApi,
  getTeamChaptersApi,
  createTeamTaskApi,
  updateTeamTaskApi,
  getTeamRequestsApi,
  decideTeamRequestApi,
  createTeamRequestApi
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

function ProjectsListView({ teamProjectsList, searchTerm, onSearchChange, onOpenDetails, onOpenEdit, isLeaderMatch }) {
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
                {proj.cover && /^(https?:)?\/\//.test(proj.cover) ? (
                  <img
                    src={proj.cover}
                    alt={proj.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                  />
                ) : (
                  proj.cover || '📚'
                )}
              </div>
              <div className="trans-project-info">
                <h3 className="trans-project-title">{proj.title}</h3>
                <p className="trans-project-meta">
                  🧑‍🤝‍🧑 Language: <strong>{proj.sourceLang || 'Any'} ➔ {proj.targetLang}</strong>
                </p>
                <p className="trans-project-meta" style={{ marginTop: '4px' }}>
                  <span style={{ color: '#cbd5e1', fontSize: '12.5px' }}>
                    👥 Capacity: {proj.membersCount || 0} / {proj.maxMembers || 5} members ({proj.isRecruiting ? 'Open' : 'Closed'})
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
                <button className="trans-btn icon-edit" onClick={(e) => onOpenEdit(proj, e)}>
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
  workspaceTab,
  setWorkspaceTab,
  isCurrentLeader,
  members,
  memberSearch,
  setMemberSearch,
  onMembersLoaded,
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
  chatMessages,
  chatInput,
  setChatInput,
  onSendChat,
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
          chatMessages={chatMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          onSendChat={onSendChat}
        />
      )}

      {workspaceTab === 'members' && (
        <MembersTab
          teamId={selectedDetails.id}
          leaderName={selectedDetails.leaderName}
          memberSearch={memberSearch}
          setMemberSearch={setMemberSearch}
          onMembersLoaded={onMembersLoaded}
        />
      )}

      {workspaceTab === 'requests' && (
        <RequestsTab joinRequests={joinRequests} onApprove={onApproveRequest} onReject={onRejectRequest} />
      )}

      {workspaceTab === 'tasks' && (
        <>
          <TasksTab
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
            onCreateTaskClick={onCreateTaskClick}
            onMoveAllToDone={onMoveAllToDone}
            onMoveTask={onMoveTask}
            onOpenTaskDetails={onOpenTaskDetails}
            getAssigneeInitials={getAssigneeInitials}
            members={members}
          />

          {showCreateTask && (
            <CreateTaskModal
              comicName={comicName}
              newTaskData={newTaskData}
              setNewTaskData={setNewTaskData}
              chapterOptions={chapterOptions}
              teamMembersForAssign={teamMembersForAssign}
              onCancel={onCancelCreateTask}
              onCreate={onCreateTask}
            />
          )}

          {selectedTask && (
            <EditTaskModal
              editTaskData={editTaskData}
              setEditTaskData={setEditTaskData}
              teamMembersForAssign={teamMembersForAssign}
              onCancel={onCancelEditTask}
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

  const renderReviewModal = () => {
    if (!selectedReviewRequest) return null;
    return (
      <div className="trans-modal-overlay" style={{ zIndex: 10000 }}>
        <div className="trans-modal-card" style={{ maxWidth: '680px', width: '95%', borderRadius: '16px' }}>
          <div className="trans-modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c084fc', margin: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              Application Details Review
            </h3>
            <button className="trans-modal-close-btn" onClick={() => setSelectedReviewRequest(null)}>×</button>
          </div>

          <div className="trans-modal-body" style={{ padding: '20px 24px 10px 24px' }}>
            
            {/* Applicant Profile Row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '12px', padding: '16px', marginBottom: '20px'
            }}>
              <div className="chat-avatar" style={{ 
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)', 
                color: '#ffffff', width: '48px', height: '48px', fontSize: '18px', fontWeight: '600'
              }}>
                {selectedReviewRequest.avatar || 'U'}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: 'var(--trans-text-primary)' }}>
                  {selectedReviewRequest.name}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--trans-text-muted)' }}>
                  <span>Applied: {formatDisplayTime(selectedReviewRequest.time)}</span>
                </div>
              </div>
            </div>

            {/* Introduction Message */}
            <div style={{ marginBottom: '20px' }}>
              <label className="trans-form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--trans-text-secondary)' }}>
                Introduction Message
              </label>
              <div className={`request-review-msg-box ${selectedReviewRequest.text?.trim() ? '' : 'empty'}`}>
                {selectedReviewRequest.text?.trim() ? `"${selectedReviewRequest.text}"` : "No introduction message was provided by the applicant."}
              </div>
            </div>

            {/* CV Section */}
            <div>
              <label className="trans-form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--trans-text-secondary)' }}>
                Attached CV / Resume
              </label>
              {selectedReviewRequest.cvUrl ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.15)',
                  borderRadius: '10px', padding: '14px 16px'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: '600', color: '#c084fc', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {selectedReviewRequest.cvFileName || 'CV_Resume.pdf'}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--trans-text-muted)' }}>Ready to download</p>
                  </div>
                  <button
                    onClick={() => handleDownloadCV(selectedReviewRequest.cvUrl, selectedReviewRequest.cvFileName)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc',
                      border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px',
                      padding: '6px 14px', fontSize: '12px', fontWeight: '600',
                      textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.25)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.15)' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download CV
                  </button>
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
                  borderRadius: '10px', padding: '16px', color: 'var(--trans-text-muted)',
                  fontSize: '13px', justifyContent: 'center'
                }}>
                  <span>No CV file attached. Only introduction message is provided.</span>
                </div>
              )}
            </div>

          </div>

          <div className="trans-modal-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="trans-btn secondary" onClick={() => setSelectedReviewRequest(null)}>
              Cancel
            </button>
            <button 
              className="trans-btn secondary" 
              style={{ 
                background: 'rgba(239, 68, 68, 0.08)', 
                borderColor: 'rgba(239, 68, 68, 0.2)', 
                color: '#f87171' 
              }}
              onClick={() => handleRejectRequest(selectedReviewRequest.id, selectedReviewRequest.name)}
            >
              Reject Application
            </button>
            <button className="trans-btn primary" onClick={() => handleApproveRequest(selectedReviewRequest)}>
              Approve Application
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleDownloadCV = async (fileUrl, fileName) => {
    if (!fileUrl) return;
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Failed to fetch CV file');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'CV_Resume.pdf';
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Client-side download failed, falling back to new tab:', err);
      window.open(fileUrl, '_blank');
    }
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return '';
    const ago = formatTimeAgo(timeStr);
    if (ago) return ago;
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeStr;
    }
  };

  const fetchProjects = async (silent = false) => {
    try {
      if (!silent) setLoadingProjects(true)
      const data = await getMyProjectTeamsApi()
      const mapped = (data || []).map(p => ({ ...p, team: p.title, title: p.comicName }))
      setProjects(mapped)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load translator project teams.')
    } finally {
      if (!silent) setLoadingProjects(false)
    }
  }

  useEffect(() => { fetchProjects() }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDetails, setSelectedDetails] = useState(null)
  const [selectedEdit, setSelectedEdit] = useState(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadData, setUploadData] = useState({ chapterTitle: '', chapterContent: '', wordsCount: 3000 })
  const [editForm, setEditForm] = useState({ description: '', status: 'Active', team: '' })

  const [workspaceTab, setWorkspaceTab] = useState('home')
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)

  const [announcements, setAnnouncements] = useState([])
  const [newPostText, setNewPostText] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedImagePreview, setSelectedImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [expandedComments, setExpandedComments] = useState({})
  const [postComments, setPostComments] = useState({})
  const [newCommentTexts, setNewCommentTexts] = useState({})
  const [replyTexts, setReplyTexts] = useState({})
  const [activeReplyCommentId, setActiveReplyCommentId] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [joinRequests, setJoinRequests] = useState([])
  const [selectedReviewRequest, setSelectedReviewRequest] = useState(null)
  const [tasks, setTasks] = useState([])
  const [lockedColumns, setLockedColumns] = useState([])
  const [highlightedColumns, setHighlightedColumns] = useState([])
  const [sortedColumns, setSortedColumns] = useState([])
  const [openDropdownCol, setOpenDropdownCol] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [editTaskData, setEditTaskData] = useState({
    title: '', status: 'backlog', priority: 'Medium', assignees: [], dueDate: ''
  })

  const [members, setMembers] = useState([])
  const [teamMembersForAssign, setTeamMembersForAssign] = useState([])
  const [chapterOptions, setChapterOptions] = useState([])
  const [memberSearch, setMemberSearch] = useState('')

  const handleRemoveMember = async (memberId, memberName) => {
    if (window.confirm(`Are you sure you want to remove ${memberName} from the translation team?`)) {
      try {
        const updated = members.filter(m => m.id !== memberId)
        setMembers(updated)
        localStorage.setItem(`comiverse_project_members_${selectedDetails?.id}`, JSON.stringify(updated))

        const nextMembersCount = Math.max(1, (selectedDetails?.membersCount || 1) - 1)
        await updateProjectTeamApi(selectedDetails.id, {
          id: selectedDetails.id,
          title: selectedDetails.title || selectedDetails.team,
          comicName: selectedDetails.comicName || selectedDetails.title,
          status: selectedDetails.status,
          membersCount: nextMembersCount,
          chaptersCount: selectedDetails.chaptersCount,
          progress: selectedDetails.progress,
          leaderName: selectedDetails.leaderName,
          leaderInitials: selectedDetails.leaderInitials,
          deadline: selectedDetails.deadline,
          sourceLang: selectedDetails.sourceLang,
          targetLang: selectedDetails.targetLang,
          priority: selectedDetails.priority,
          cover: selectedDetails.cover,
          description: selectedDetails.description,
          notes: selectedDetails.notes,
          isRecruiting: selectedDetails.isRecruiting,
          maxMembers: selectedDetails.maxMembers
        })

        setSelectedDetails(prev => ({ ...prev, membersCount: nextMembersCount }))
        setProjects(prev => prev.map(p => p.id === selectedDetails.id ? { ...p, membersCount: nextMembersCount } : p))
        toast.success(`Removed ${memberName} from the team.`)
      } catch (err) {
        console.error(err)
        toast.error('Failed to update team members count on backend.')
      }
    }
  }

  const getMemberMenuItems = (member) => {
    if (member.role === 'Group Leader') {
      return [
        { label: 'Role: Group Leader', action: 'none', disabled: true }
      ]
    }
    return [
      { label: 'Remove from Team', action: 'remove', danger: true }
    ]
  }
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [newTaskData, setNewTaskData] = useState({
    title: '', column: 'backlog', assignees: [], dueDate: '', priority: 'Medium', chapterId: null
  })

  const getAssigneeInitials = (memberId) => {
    const member = teamMembersForAssign.find(m => m.id === memberId)
    return member?.avatar || '?'
  }

  const openCreateTaskModal = () => {
    setNewTaskData({ title: '', column: 'backlog', assignees: [], dueDate: '', priority: 'Medium', chapterId: null })
    setShowCreateTask(true)
  }

<<<<<<< HEAD
  const openCreateTaskModalWithComic = (comicName) => {
    setNewTaskData({
      title: '',
      column: 'backlog',
      assignee: selectedDetails?.leaderInitials || 'TL',
      dueDate: '',
      priority: 'Medium',
      comic: comicName,
      chapterId: null
    })
    setShowCreateTask(true)
  }

  const openCreateTaskFromBacklog = (chapter) => {
    setNewTaskData({
      title: `${chapter.title || 'Chapter ' + chapter.chapterNumber} - Translation`,
      column: 'backlog',
      assignee: selectedDetails?.leaderInitials || 'TL',
      dueDate: '',
      priority: 'Medium',
      comic: chapter.comicName || selectedDetails?.comicName || selectedDetails?.title || '',
      chapterId: chapter.chapterId
    })
    setShowCreateTask(true)
  }

  const getTimeAgo = (date) => {
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

  const displayPostTime = (timeStr) => {
    if (!timeStr) return ''
    if (!timeStr.includes('T') && !/^\d{4}-\d{2}-\d{2}/.test(timeStr)) {
      return timeStr
    }
    try {
      const d = new Date(timeStr)
      return getTimeAgo(d)
    } catch {
      return timeStr
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const claimedProjects = projects.filter(proj => {
    const isNotUnclaimed = !proj.status || proj.status.toUpperCase() !== 'UNCLAIMED'
    const authenticatedUserId = authUser?.userId || authUser?.id
    const isUserLeader = (authenticatedUserId && proj.leaderId === authenticatedUserId) || (proj.leaderName && (
      proj.leaderName === userFullName ||
      proj.leaderName === authUser?.fullName ||
      proj.leaderName === authUser?.username ||
      proj.leaderName.toLowerCase() === userFullName.toLowerCase() ||
      proj.leaderName.toLowerCase() === authUser?.username?.toLowerCase() ||
      proj.leaderName.toLowerCase() === user?.username?.toLowerCase() ||
      proj.leaderName.toLowerCase() === user?.fullName?.toLowerCase()
    ))
    return isNotUnclaimed && isUserLeader
  })

  const claimedJobsWithTaskStatus = claimedProjects.map(proj => {
    const hasTasks = tasks.some(t => {
      const parsed = parseTaskTitle(t.title)
      const taskComic = (parsed.comicProject || '').toLowerCase().trim()
      const projTitle = (proj.title || '').toLowerCase().trim()
      const projComicName = (proj.comicName || '').toLowerCase().trim()
      return taskComic === projTitle || taskComic === projComicName
    })

    return {
      ...proj,
      hasTasks,
      displayStatus: hasTasks ? 'Active' : 'Pending Task'
    }
  })

  const claimedTotalPages = Math.ceil(claimedJobsWithTaskStatus.length / 10)
  const paginatedClaimedJobs = claimedJobsWithTaskStatus.slice((claimedCurrentPage - 1) * 10, claimedCurrentPage * 10)
=======
>>>>>>> buihung
  useEffect(() => {
    if (selectedDetails) {
      const updated = projects.find(p => p.id === selectedDetails.id)
      if (updated) setSelectedDetails(updated)
    }
  }, [projects])

  useEffect(() => {
    const handleGlobalClick = () => setOpenDropdownCol(null)
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  useEffect(() => {
    if (!showCreateTask || !selectedDetails?.id) {
      setChapterOptions([])
      return
    }
    getTeamChaptersApi(selectedDetails.id)
      .then(list => setChapterOptions(Array.isArray(list) ? list : []))
      .catch(err => {
        console.error('Could not load chapters for this team:', err)
        setChapterOptions([])
      })
  }, [showCreateTask, selectedDetails?.id])

  const handleOpenDetails = async (project) => {
    setSelectedDetails(project)
    setWorkspaceTab('home')
    setShowUploadForm(false)
    setLoadingWorkspace(true)

<<<<<<< HEAD
    // Sync leader info dynamically in the members list
    const actualLeader = {
      id: project.leaderId || 'leader-id',
=======
    setMembers([{
>>>>>>> buihung
      name: project.leaderName || 'No Leader',
      role: 'Group Leader',
      status: 'Active',
      joinDate: '01/15/2024',
      contributions: `${project.chaptersCount || 0} chapters`,
      avatar: project.leaderInitials || 'TL'
<<<<<<< HEAD
    }

    const savedMembers = localStorage.getItem(`comiverse_project_members_${project.id}`)
    if (savedMembers) {
      try {
        const list = JSON.parse(savedMembers)
        const filtered = list.filter(m => m.role !== 'Group Leader')
        setMembers([actualLeader, ...filtered])
      } catch (e) {
        console.error(e)
        setMembers([actualLeader])
      }
    } else {
      setMembers([actualLeader])
    }
=======
    }])
>>>>>>> buihung

    try {
      const [annList, msgList, taskList, reqList, teamMembersList] = await Promise.all([
        getTeamAnnouncementsApi(project.id),
        getTeamMessagesApi(project.id),
        getTeamTasksApi(project.id),
        getTeamRequestsApi(project.id),
        getTeamMembersApi(project.id).catch((err) => {
          console.error('Could not load real team members for assignee picker:', err)
          return []
        })
      ])
      setAnnouncements(sortPosts(annList))
      setChatMessages(msgList.map(m => ({ ...m, isMe: m.sender === userFullName })))
      setTasks(taskList)
      setJoinRequests(reqList.map(r => ({ ...r, roles: typeof r.roles === 'string' ? r.roles.split(',') : r.roles })))
      setTeamMembersForAssign(Array.isArray(teamMembersList) ? teamMembersList : [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load real workspace data from DB.')
    } finally {
      setLoadingWorkspace(false)
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
        assignedToMe: selectedDetails.assignedToMe
      })
      const mappedUpdated = { ...updated, team: updated.title, title: updated.comicName }
      setProjects(prev => prev.map(proj => (proj.id === selectedDetails.id ? mappedUpdated : proj)))
      setSelectedDetails(mappedUpdated)
      toast.success('Workspace details saved to database!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save workspace updates.')
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
      cover: selectedDetails.cover || '🔮',
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

<<<<<<< HEAD
  const sortPosts = (postsList) => {
    return [...(postsList || [])].sort((a, b) => {
      const pinA = a.isPinned ? 1 : 0
      const pinB = b.isPinned ? 1 : 0
      if (pinA !== pinB) return pinB - pinA
      const tA = (a.time && a.time.includes('T')) ? new Date(a.time).getTime() : 0
      const tB = (b.time && b.time.includes('T')) ? new Date(b.time).getTime() : 0
      if (tA && tB) return tB - tA
      return (b.id || '').localeCompare(a.id || '')
    })
  }

  // Action: Add Announcement (Post)
=======
>>>>>>> buihung
  const handlePostAnnouncement = async () => {
    if (!newPostText.trim() && !selectedImage) return
    
    let imageUrl = null
    if (selectedImage) {
      setUploadingImage(true)
      try {
        const res = await uploadImageApi(selectedImage)
        imageUrl = res.url || res.data?.url || res
      } catch (uploadErr) {
        console.error(uploadErr)
        toast.error('Failed to upload image.')
        setUploadingImage(false)
        return
      }
    }

    try {
      const created = await createTeamAnnouncementApi(selectedDetails.id, {
        author: userFullName,
        role: selectedDetails.leaderName === userFullName ? 'Group Leader' : 'Member',
        avatar: userFullName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2),
        time: new Date().toISOString(),
        content: newPostText.trim(),
        imageUrl: imageUrl,
        isPinned: false
      })
      setAnnouncements(prev => sortPosts([created, ...prev]))
      setNewPostText('')
      setSelectedImage(null)
      setSelectedImagePreview(null)
      toast.success('Post published successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to publish post.')
    } finally {
      setUploadingImage(false)
    }
  }

<<<<<<< HEAD
  // Action: Like Announcement (Post)
=======
>>>>>>> buihung
  const handleLikePost = async (id) => {
    const currentUserIdStr = (authUser?.userId || authUser?.id || '').toString()
    let originalPost = null

    // 1. Optimistic update
    setAnnouncements(prev => prev.map(post => {
      if (post.id === id) {
        originalPost = { ...post }
        const likedList = post.likedByUsers ? post.likedByUsers.split(',').filter(Boolean) : []
        const isLiked = likedList.includes(currentUserIdStr)

        let newLikedList = []
        let newLikes = post.likes || 0
        if (isLiked) {
          newLikedList = likedList.filter(uid => uid !== currentUserIdStr)
          newLikes = Math.max(0, newLikes - 1)
        } else {
          newLikedList = [...likedList, currentUserIdStr]
          newLikes = newLikes + 1
        }

        return {
          ...post,
          likes: newLikes,
          likedByUsers: newLikedList.join(',')
        }
      }
      return post
    }))

    // 2. Perform API call
    try {
      const updated = await likeTeamAnnouncementApi(id)
<<<<<<< HEAD
      setAnnouncements(prev => prev.map(post => post.id === id ? { ...post, likes: updated.likes, likedByUsers: updated.likedByUsers } : post))
=======
      setAnnouncements(prev => prev.map(post => post.id === id ? { ...post, likes: updated.likes } : post))
>>>>>>> buihung
    } catch (err) {
      console.error(err)
      toast.error('Failed to register post like.')
      // 3. Rollback on failure
      if (originalPost) {
        setAnnouncements(prev => prev.map(post => post.id === id ? originalPost : post))
      }
    }
  }

  // Action: Pin Post (Leader only)
  const handleTogglePin = async (id) => {
    try {
      const updated = await pinTeamAnnouncementApi(id)
      setAnnouncements(prev => {
        const list = prev.map(post => post.id === id ? { ...post, isPinned: updated.isPinned } : post)
        return sortPosts(list)
      })
      toast.success(updated.isPinned ? 'Post pinned to top!' : 'Post unpinned.')
    } catch (err) {
      console.error(err)
      toast.error('Failed to toggle pin status.')
    }
  }

  // Action: Toggle Comments Collapsible
  const handleToggleComments = async (postId) => {
    const isExpanding = !expandedComments[postId]
    setExpandedComments(prev => ({
      ...prev,
      [postId]: isExpanding
    }))
    
    if (isExpanding) {
      try {
        const comments = await getTeamPostCommentsApi(postId)
        setPostComments(prev => ({
          ...prev,
          [postId]: comments
        }))
      } catch (err) {
        console.error('Failed to load comments:', err)
      }
    }
  }

  // Action: Post Comment
  const handlePostComment = async (postId) => {
    const text = newCommentTexts[postId] || ''
    if (!text.trim()) return
    
    try {
      const created = await createTeamPostCommentApi(postId, {
        author: userFullName,
        role: selectedDetails.leaderName === userFullName ? 'Group Leader' : 'Member',
        avatar: userFullName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2),
        content: text.trim(),
        time: new Date().toISOString()
      })
      
      setPostComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), created]
      }))
      
      setNewCommentTexts(prev => ({
        ...prev,
        [postId]: ''
      }))
      
      toast.success('Comment posted!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to post comment.')
    }
  }

  // Action: Like Comment
  const handleLikeComment = async (postId, commentId) => {
    const currentUserIdStr = (authUser?.userId || authUser?.id || '').toString()
    let originalComment = null

    // 1. Optimistic update
    setPostComments(prev => {
      const postCommentsList = prev[postId] || []
      const updatedList = postCommentsList.map(c => {
        if (c.id === commentId) {
          originalComment = { ...c }
          const likedList = c.likedByUsers ? c.likedByUsers.split(',').filter(Boolean) : []
          const isLiked = likedList.includes(currentUserIdStr)

          let newLikedList = []
          let newLikes = c.likes || 0
          if (isLiked) {
            newLikedList = likedList.filter(uid => uid !== currentUserIdStr)
            newLikes = Math.max(0, newLikes - 1)
          } else {
            newLikedList = [...likedList, currentUserIdStr]
            newLikes = newLikes + 1
          }

          return {
            ...c,
            likes: newLikes,
            likedByUsers: newLikedList.join(',')
          }
        }
        return c
      })

      return {
        ...prev,
        [postId]: updatedList
      }
    })

    // 2. Perform API call
    try {
      const updated = await likeTeamPostCommentApi(commentId)
      setPostComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => c.id === commentId ? { ...c, likes: updated.likes, likedByUsers: updated.likedByUsers } : c)
      }))
    } catch (err) {
      console.error(err)
      toast.error('Failed to toggle like on comment.')
      // 3. Rollback
      if (originalComment) {
        setPostComments(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).map(c => c.id === commentId ? originalComment : c)
        }))
      }
    }
  }

  // Action: Post Reply
  const handlePostReply = async (postId, parentCommentId) => {
    const text = replyTexts[parentCommentId] || ''
    if (!text.trim()) return

    try {
      const created = await createTeamPostCommentApi(postId, {
        author: userFullName,
        role: selectedDetails.leaderName === userFullName ? 'Group Leader' : 'Member',
        avatar: userFullName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2),
        content: text.trim(),
        time: new Date().toISOString(),
        parentId: parentCommentId
      })

      setPostComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), created]
      }))

      setReplyTexts(prev => ({
        ...prev,
        [parentCommentId]: ''
      }))
      setActiveReplyCommentId(null)
      toast.success('Reply posted!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to post reply.')
    }
  }

  const handleSendChat = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    try {
      const created = await createTeamMessageApi(selectedDetails.id, {
        sender: userFullName,
        avatar: userFullName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2),
        time,
        text: chatInput.trim()
      })
      setChatMessages([...chatMessages, { ...created, isMe: true }])
      setChatInput('')
    } catch (err) {
      console.error(err)
      toast.error('Failed to send message.')
    }
  }

  const handleApproveRequest = async (request) => {
    const { id, name } = request
    try {
      await decideTeamRequestApi(id, 'approved')
      setJoinRequests(prev => prev.filter(req => req.id !== id))
      const newMem = {
        id: request.requesterId || `mem-${Date.now()}`,
        name,
        role: 'Member',
        status: 'Active',
        joinDate: new Date().toLocaleDateString('en-US'),
        contributions: '0 chapters',
        avatar: name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)
      }

      const updatedMembers = [...members, newMem]
      setMembers(updatedMembers)
      localStorage.setItem(`comiverse_project_members_${selectedDetails?.id}`, JSON.stringify(updatedMembers))

      const nextMembersCount = (selectedDetails?.membersCount || 1) + 1
      setSelectedDetails(prev => ({ ...prev, membersCount: nextMembersCount }))
      setProjects(prev => prev.map(p => p.id === selectedDetails.id ? { ...p, membersCount: nextMembersCount } : p))

      toast.success(`Approved ${name} in database!`)
      setSelectedReviewRequest(null)
    } catch (err) {
      console.error(err)
      toast.error('Failed to approve request.')
    }
  }

  const handleRejectRequest = async (id, name) => {
    try {
      await decideTeamRequestApi(id, 'rejected')
      setJoinRequests(prev => prev.filter(req => req.id !== id))
      toast.info(`Rejected ${name}'s request in database.`)
      setSelectedReviewRequest(null)
    } catch (err) {
      console.error(err)
      toast.error('Failed to reject request.')
    }
  }

  const handleCreateTask = async () => {
    if (!newTaskData.title.trim()) return
    if (!newTaskData.chapterId) {
      toast.error('Please select a chapter.')
      return
    }
    if (newTaskData.assignees.length === 0) {
      toast.error('Please assign at least one person.')
      return
    }
    const comicName = selectedDetails?.comicName || selectedDetails?.title || 'Unknown Comic'
    const formattedTitle = `[${newTaskData.priority.toUpperCase()}] [${comicName}] ${newTaskData.title.trim()}`
    try {
      const selectedAssignee = members.find(member => (member.id || member.avatar) === newTaskData.assignee)
      const taskPayload = {
        title: formattedTitle,
        status: newTaskData.column,
        assigneeIds: newTaskData.assignees,
        chapterId: newTaskData.chapterId,
        dueDate: newTaskData.dueDate || new Date().toISOString().split('T')[0]
      }
      const created = await createTeamTaskApi(selectedDetails.id, taskPayload)
      setTasks([...tasks, created])
      setNewTaskData({ title: '', column: 'backlog', assignees: [], dueDate: '', priority: 'Medium', chapterId: null })
      setShowCreateTask(false)
      toast.success('Task saved to database!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to create task.')
    }
  }

  const handleMoveTask = async (id, newCol) => {
    try {
      const updated = await updateTeamTaskApi(id, { status: newCol })
      setTasks(prev => prev.map(task => task.id === id ? { ...task, status: newCol } : task))
    } catch (err) {
      console.error(err)
      toast.error('Failed to update task state in DB.')
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
      assignees: task.assigneeIds || [],
      dueDate: task.dueDate || '',
      taskId: task.id || task._id || task.taskId || task.TaskID || 'KHONG-TIM-THAY-ID'
    })
  }

  const handleMoveAllToDone = async (colId) => {
    const targets = tasks.filter(t => getTaskColumn(t) === colId)
    if (targets.length === 0) return
    try {
      await Promise.all(targets.map(t => updateTeamTaskApi(t.id, {
        status: 'completed',
        dueDate: t.dueDate,
        assigneeIds: t.assigneeIds
      })))
      setTasks(prev => prev.map(t => getTaskColumn(t) === colId ? { ...t, status: 'completed' } : t))
      toast.success(`Moved all tasks from ${colId} to Completed!`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to move all tasks to Completed.')
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

  if (loadingProjects) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--trans-text-primary)' }}>
        <h3>⏳ Loading translation project teams...</h3>
      </div>
    )
  }

  if (selectedDetails) {
    if (loadingWorkspace) {
      return (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--trans-text-primary)' }}>
          <h3>⏳ Loading real-time database details...</h3>
        </div>
      )
    }

    const isCurrentLeader = isLeaderMatch(selectedDetails.leaderName)
    const activeTasks = tasks.filter(t => getTaskColumn(t) !== 'paused')
    const pausedTasks = tasks.filter(t => getTaskColumn(t) === 'paused')
    const comicName = selectedDetails?.comicName || selectedDetails?.title

    return (
<<<<<<< HEAD
      <div className="project-detail-workspace fade-in">
        {/* Breadcrumbs Row */}
        <div className="workspace-breadcrumbs">
          <button className="breadcrumb-back" onClick={() => setSelectedDetails(null)}>
            &lt; Projects
          </button>
          <span className="breadcrumb-divider">/</span>
          <span className="breadcrumb-current">{selectedDetails.title}</span>
        </div>

        {/* Dynamic Tab Switcher bar */}
        <div className="workspace-tabs">
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
            Members <span className={`tab-badge ${workspaceTab === 'members' ? 'active-badge' : ''}`}>{members.length}</span>
          </button>
          {isCurrentLeader && (
            <button
              className={`workspace-tab-btn ${workspaceTab === 'requests' ? 'active' : ''}`}
              onClick={() => setWorkspaceTab('requests')}
            >
              Requests {joinRequests.length > 0 && <span className="tab-badge alert-badge">{joinRequests.length}</span>}
            </button>
          )}
          <button
            className={`workspace-tab-btn ${workspaceTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setWorkspaceTab('tasks')}
          >
            Tasks <span className={`tab-badge ${workspaceTab === 'tasks' ? 'active-badge' : ''}`}>{tasks.length}</span>
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

        {workspaceTab === 'home' && (
          <div className="workspace-home-grid">

            {/* Left Feed Column */}
            <div className="workspace-feed-column">

              {/* Share box */}
              <div className="post-creation-card">
                <div className="post-user-avatar" style={{ textTransform: 'uppercase', fontWeight: '700' }}>
                  {userFullName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)}
                </div>
                <div className="post-creation-input-wrapper">
                  <textarea
                    className="post-textarea"
                    placeholder="Write a new post or share an update..."
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    disabled={uploadingImage}
                  />

                  {selectedImagePreview && (
                    <div className="post-creation-image-preview" style={{ position: 'relative', marginTop: '10px', display: 'inline-block' }}>
                      <img src={selectedImagePreview} alt="Selected preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid var(--trans-border)' }} />
                      <button 
                        className="remove-preview-btn" 
                        onClick={() => { setSelectedImage(null); setSelectedImagePreview(null); }}
                        style={{
                          position: 'absolute',
                          top: '5px',
                          right: '5px',
                          background: 'rgba(0, 0, 0, 0.6)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <div className="post-creation-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <label className="image-attach-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--trans-purple)', fontSize: '13px', fontWeight: '500' }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleImageChange}
                        disabled={uploadingImage}
                      />
                      <span>🖼️ Attach Image</span>
                    </label>

                    <button 
                      className="trans-btn primary" 
                      onClick={handlePostAnnouncement} 
                      disabled={uploadingImage || (!newPostText.trim() && !selectedImage)}
                    >
                      {uploadingImage ? 'Publishing...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Feed Card list */}
              <div className="announcement-feed-list">
                {announcements.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--trans-text-muted)', textAlign: 'center', padding: '20px' }}>No posts yet.</p>
                ) : (
                  announcements.map(post => {
                    const isPinned = post.isPinned === true
                    const hasComments = expandedComments[post.id] === true
                    const commentsList = postComments[post.id] || []

                    return (
                      <div className={`feed-post-card ${isPinned ? 'pinned' : ''}`} key={post.id}>
                        {isPinned && (
                          <div className="post-pinned-badge" style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            color: '#f59e0b',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginBottom: '10px',
                            width: 'fit-content'
                          }}>
                            📌 Pinned Post
                          </div>
                        )}
                        <div className="post-header">
                          <div className="post-user-avatar" style={{ background: post.role === 'Group Leader' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '' }}>
                            {post.avatar || 'U'}
                          </div>
                          <div className="post-header-info">
                            <div className="post-author-row">
                              <span className="post-author-name">{post.author}</span>
                              <span className={`post-role-badge ${post.role === 'Group Leader' ? 'leader' : ''}`}>{post.role || 'Member'}</span>
                            </div>
                            <span className="post-time">{displayPostTime(post.time)}</span>
                          </div>
                        </div>
                        <div className="post-body" style={{ color: 'var(--trans-text-primary)' }}>
                          <p style={{ whiteSpace: 'pre-wrap', margin: '0 0 12px 0', fontSize: '14px', lineHeight: '1.5' }}>{post.content}</p>
                          {post.imageUrl && (
                            <div className="post-attached-image" style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--trans-border)', maxWidth: '100%', maxHeight: '400px' }}>
                              <img src={post.imageUrl} alt="Attached" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                            </div>
                          )}
                        </div>
                        <div className="post-footer-actions" style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--trans-border)', paddingTop: '10px', marginTop: '12px' }}>
                          {(() => {
                            const currentUserIdStr = (authUser?.userId || authUser?.id || '').toString()
                            const isPostLiked = post.likedByUsers && post.likedByUsers.split(',').includes(currentUserIdStr)
                            return (
                              <button 
                                className="post-action-btn" 
                                onClick={() => handleLikePost(post.id)} 
                                style={{ background: 'none', border: 'none', color: isPostLiked ? 'var(--trans-purple)' : 'var(--trans-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                              >
                                👍 {post.likes || 0} {isPostLiked ? 'Liked' : 'Like'}
                              </button>
                            )
                          })()}

                          <button className="post-action-btn" onClick={() => handleToggleComments(post.id)} style={{ background: 'none', border: 'none', color: 'var(--trans-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                            💬 Comments ({commentsList.length})
                          </button>

                          {isCurrentLeader && (
                            <button className="post-action-btn pin-btn" onClick={() => handleTogglePin(post.id)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginLeft: 'auto' }}>
                              📌 {isPinned ? 'Unpin' : 'Pin to top'}
                            </button>
                          )}
                        </div>

                        {/* Collapsible comments thread */}
                        {hasComments && (
                          <div className="post-comments-section" style={{ marginTop: '14px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', padding: '12px', border: '1px solid var(--trans-border)' }}>
                            <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {commentsList.length === 0 ? (
                                <p style={{ fontStyle: 'italic', fontSize: '12px', color: 'var(--trans-text-muted)', margin: '4px 0' }}>No comments yet. Write the first comment!</p>
                              ) : (
                                commentsList.filter(c => !c.parentId).map(comment => {
                                  const replies = commentsList.filter(c => c.parentId === comment.id)
                                  const currentUserIdStr = (authUser?.userId || authUser?.id || '').toString()
                                  const isCommentLiked = comment.likedByUsers && comment.likedByUsers.split(',').includes(currentUserIdStr)

                                  return (
                                    <div className="comment-thread-wrapper" key={comment.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      {/* Root Comment Item */}
                                      <div className="comment-item" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <div className="comment-avatar" style={{
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '50%',
                                          background: comment.role === 'Group Leader' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.1)',
                                          color: '#fff',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '12px',
                                          fontWeight: '700',
                                          flexShrink: 0
                                        }}>
                                          {comment.avatar || 'U'}
                                        </div>
                                        <div className="comment-content-box" style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '10px', flex: 1, border: '1px solid rgba(255,255,255,0.03)' }}>
                                          <div className="comment-header-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                            <span className="comment-author" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--trans-text-primary)' }}>{comment.author}</span>
                                            <span className={`comment-role-badge ${comment.role === 'Group Leader' ? 'leader' : ''}`} style={{
                                              fontSize: '9px',
                                              padding: '1px 5px',
                                              borderRadius: '6px',
                                              background: comment.role === 'Group Leader' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.08)',
                                              color: comment.role === 'Group Leader' ? '#f59e0b' : 'var(--trans-text-secondary)'
                                            }}>{comment.role || 'Member'}</span>
                                            <span className="comment-time" style={{ fontSize: '11px', color: 'var(--trans-text-muted)', marginLeft: 'auto' }}>{displayPostTime(comment.time)}</span>
                                          </div>
                                          <div className="comment-text" style={{ fontSize: '13.5px', color: 'var(--trans-text-primary)', lineHeight: '1.4', marginBottom: '6px' }}>{comment.content}</div>

                                          <div className="comment-actions" style={{ display: 'flex', gap: '12px', fontSize: '11.5px', color: 'var(--trans-text-muted)' }}>
                                            <button 
                                              onClick={() => handleLikeComment(post.id, comment.id)} 
                                              style={{ background: 'none', border: 'none', color: isCommentLiked ? 'var(--trans-purple)' : 'var(--trans-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                                            >
                                              👍 {comment.likes || 0} {isCommentLiked ? 'Liked' : 'Like'}
                                            </button>
                                            <button 
                                              onClick={() => setActiveReplyCommentId(activeReplyCommentId === comment.id ? null : comment.id)}
                                              style={{ background: 'none', border: 'none', color: 'var(--trans-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                                            >
                                              💬 Reply
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Sub-replies List */}
                                      {replies.length > 0 && (
                                        <div className="replies-list" style={{ marginLeft: '42px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '1px dashed var(--trans-border)', paddingLeft: '12px' }}>
                                          {replies.map(reply => {
                                            const isReplyLiked = reply.likedByUsers && reply.likedByUsers.split(',').includes(currentUserIdStr)
                                            return (
                                              <div className="comment-item reply-item" key={reply.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                <div className="comment-avatar reply-avatar" style={{
                                                  width: '26px',
                                                  height: '26px',
                                                  borderRadius: '50%',
                                                  background: reply.role === 'Group Leader' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.08)',
                                                  color: '#fff',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  fontSize: '10px',
                                                  fontWeight: '700',
                                                  flexShrink: 0
                                                }}>
                                                  {reply.avatar || 'U'}
                                                </div>
                                                <div className="comment-content-box reply-content-box" style={{ background: 'rgba(255,255,255,0.01)', padding: '6px 10px', borderRadius: '8px', flex: 1, border: '1px solid rgba(255,255,255,0.02)' }}>
                                                  <div className="comment-header-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                                                    <span className="comment-author" style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--trans-text-primary)' }}>{reply.author}</span>
                                                    <span className={`comment-role-badge ${reply.role === 'Group Leader' ? 'leader' : ''}`} style={{
                                                      fontSize: '8px',
                                                      padding: '1px 4px',
                                                      borderRadius: '4px',
                                                      background: reply.role === 'Group Leader' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.06)',
                                                      color: reply.role === 'Group Leader' ? '#f59e0b' : 'var(--trans-text-secondary)'
                                                    }}>{reply.role || 'Member'}</span>
                                                    <span className="comment-time" style={{ fontSize: '10.5px', color: 'var(--trans-text-muted)', marginLeft: 'auto' }}>{displayPostTime(reply.time)}</span>
                                                  </div>
                                                  <div className="comment-text" style={{ fontSize: '13px', color: 'var(--trans-text-primary)', lineHeight: '1.4', marginBottom: '4px' }}>{reply.content}</div>

                                                  <div className="comment-actions" style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--trans-text-muted)' }}>
                                                    <button 
                                                      onClick={() => handleLikeComment(post.id, reply.id)} 
                                                      style={{ background: 'none', border: 'none', color: isReplyLiked ? 'var(--trans-purple)' : 'var(--trans-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                                                    >
                                                      👍 {reply.likes || 0} {isReplyLiked ? 'Liked' : 'Like'}
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}

                                      {/* Reply Input Box */}
                                      {activeReplyCommentId === comment.id && (
                                        <div className="reply-input-box" style={{ marginLeft: '42px', display: 'flex', gap: '8px', marginTop: '4px' }}>
                                          <input
                                            type="text"
                                            className="trans-form-input"
                                            placeholder={`Reply to ${comment.author}...`}
                                            value={replyTexts[comment.id] || ''}
                                            onChange={(e) => setReplyTexts({ ...replyTexts, [comment.id]: e.target.value })}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                handlePostReply(post.id, comment.id)
                                              }
                                            }}
                                            style={{ flex: 1, height: '32px', padding: '0 10px', fontSize: '12.5px', borderRadius: '6px' }}
                                          />
                                          <button className="trans-btn primary" onClick={() => handlePostReply(post.id, comment.id)} style={{ height: '32px', padding: '0 12px', borderRadius: '6px', fontSize: '12px' }}>
                                            Reply
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </div>

                            {/* Comment Input */}
                            <div className="comment-input-row" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                              <input
                                type="text"
                                className="trans-form-input"
                                placeholder="Write a comment..."
                                value={newCommentTexts[post.id] || ''}
                                onChange={(e) => setNewCommentTexts({ ...newCommentTexts, [post.id]: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handlePostComment(post.id)
                                  }
                                }}
                                style={{ flex: 1, height: '36px', padding: '0 12px', fontSize: '13px', borderRadius: '8px' }}
                              />
                              <button className="trans-btn primary" onClick={() => handlePostComment(post.id)} style={{ height: '36px', padding: '0 16px', borderRadius: '8px', fontSize: '13px' }}>
                                Send
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Right Chat Sidebar */}
            <div className="group-chat-sidebar-card">
              <div className="chat-card-header">
                <h3>💬 Group Chat</h3>
                <span className="chat-online-badge">● 6 online</span>
              </div>

              <div className="chat-messages-container">
                {chatMessages.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--trans-text-muted)', textAlign: 'center', padding: '20px' }}>Send the first message!</p>
                ) : (
                  chatMessages.map(msg => (
                    <div className={`chat-message-item ${msg.isMe ? 'me' : ''}`} key={msg.id}>
                      <div className="chat-avatar">{msg.avatar || 'U'}</div>
                      <div className="chat-bubble-wrapper">
                        {!msg.isMe && <span className="chat-sender-info">{msg.sender}</span>}
                        <div className="chat-bubble">{msg.text}</div>
                        <span className="chat-time">{msg.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className="chat-input-wrapper" onSubmit={handleSendChat}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Send a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="chat-send-btn">➔</button>
              </form>
            </div>

          </div>
        )}

        {/* Tab 2: MEMBERS TAB */}
        {workspaceTab === 'members' && (
          <div className="members-tab-container fade-in">
            <div className="members-actions-bar">
              <input
                type="text"
                className="trans-form-input"
                placeholder="Search members..."
                style={{ maxWidth: '300px' }}
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              <span className="members-count-indicator">{members.length} members</span>
            </div>

            <div className="members-table-wrapper">
              <table className="members-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Join Date</th>
                    <th>Contributions</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member, idx) => {
                    const loggedInUsername = (authUser?.username || '').toLowerCase().trim();
                    const loggedInFullName = (authUser?.fullName || '').toLowerCase().trim();
                    const loggedInUserId = authUser?.userId || authUser?.id;
                    const memberNameLower = (member.name || '').toLowerCase().trim();
                    
                    const isSelf = 
                      (loggedInUsername && memberNameLower === loggedInUsername) || 
                      (loggedInFullName && memberNameLower === loggedInFullName) || 
                      (loggedInUserId && member.id === loggedInUserId);
                    const displayStatus = isSelf ? 'Active' : 'Offline';
                    return (
                      <tr key={idx}>
                        <td>
                          <div className="member-cell-info">
                            <div className="chat-avatar" style={{ background: member.role === 'Group Leader' ? '#f59e0b' : '', color: member.role === 'Group Leader' ? '#ffffff' : '' }}>
                              {member.avatar}
                            </div>
                            <div className="member-status-details">
                              <span className="member-name-text">{member.name}</span>
                              <div className="member-status-row">
                                <span className={`status-dot ${displayStatus.toLowerCase()}`}></span>
                                <span>{displayStatus}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      <td>
                        <span className={`member-role-badge ${member.role === 'Group Leader' ? 'leader' : ''}`}>
                          {member.role}
                        </span>
                      </td>
                      <td style={{ color: 'var(--trans-text-secondary)' }}>{member.joinDate}</td>
                      <td style={{ fontWeight: '600' }}>{member.contributions}</td>
                      <td>
                        <AIPopover
                          variant="menu"
                          triggerText=""
                          triggerClass="table-action-dots-btn"
                          data={{ menuItems: getMemberMenuItems(member) }}
                          onAction={(action) => {
                            if (action === 'remove') {
                              handleRemoveMember(member.id, member.name);
                            }
                          }}
                        />
                      </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: JOIN REQUESTS */}
        {workspaceTab === 'requests' && (
          <div className="join-requests-tab-container fade-in">
            <h3 className="requests-count-header">{joinRequests.length} requests pending review</h3>

            {joinRequests.length === 0 ? (
              <div className="translator-empty-state">
                <h3>No pending recruitment requests</h3>
                <p>New request applications will appear here when users apply.</p>
              </div>
            ) : (
              joinRequests.map(req => (
                <div className="request-card-item" key={req.id}>
                  <div className="request-header" style={{ marginBottom: '14px' }}>
                    <div className="chat-avatar" style={{ background: '#7c3aed', color: '#ffffff' }}>{req.avatar || 'U'}</div>
                    <div className="post-header-info">
                      <span className="member-name-text">{req.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="post-time">{formatDisplayTime(req.time)}</span>
                        {req.cvUrl && (
                          <span style={{ 
                            fontSize: '11px', 
                            color: '#a855f7', 
                            background: 'rgba(168, 85, 247, 0.08)',
                            padding: '1px 8px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            📄 Has CV Attachment
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="request-actions-row" style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button 
                      className="trans-btn primary" 
                      onClick={() => setSelectedReviewRequest(req)}
                      style={{ 
                        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                        border: 'none',
                        color: '#fff',
                        padding: '8px 16px',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.3)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      Review Application
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: TASK KANBAN BOARD */}
        {workspaceTab === 'tasks' && (
          <>
            <div className="board tasks-board-tab-container fade-in" style={{ padding: 0, background: 'transparent' }}>
              <div className="board__card">
                <div className="board__header">
                  <div className="board__title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="9" rx="1" />
                      <rect x="14" y="3" width="7" height="5" rx="1" />
                      <rect x="14" y="12" width="7" height="9" rx="1" />
                      <rect x="3" y="16" width="7" height="5" rx="1" />
                    </svg>
                    <h1>{selectedDetails?.comicName || selectedDetails?.title || 'Comic'}</h1>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="board__meta">
                      <span className="board__badge">{selectedDetails?.te || 'Translation'} Team</span>
                      <span className="board__date">{activeTasks.length} active · {pausedTasks.length} paused</span>
                    </div>
                    <button 
                      className="trans-btn secondary" 
                      style={{ height: '38px', padding: '0 16px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }} 
                      onClick={() => setShowBacklogModal(true)}
                    >
                      📂 Chapter Backlog ({chapterBacklog.length})
                    </button>
                    <button className="trans-btn primary" style={{ height: '38px', padding: '0 16px', borderRadius: '8px', fontSize: '13px' }} onClick={openCreateTaskModal}>
                      + Create Task
                    </button>
                  </div>
                </div>



                {/* Kanban columns grid */}
                <div className="columns kanban-board-grid" id="columns">
                  {COLUMN_LIST.map((col) => {
                    const isLocked = lockedColumns.includes(col.id)
                    const isHighlighted = highlightedColumns.includes(col.id)

                    // Filter tasks
                    let colTasks = tasks.filter(t => t.columnName === col.id)

                    // Sort if needed
                    if (sortedColumns.includes(col.id)) {
                      const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
                      colTasks = [...colTasks].sort((a, b) => {
                        const pa = parseTaskTitle(a.title).priority
                        const pb = parseTaskTitle(b.title).priority
                        return (priorityOrder[pa] ?? 4) - (priorityOrder[pb] ?? 4)
                      })
                    }

                    return (
                      <div
                        key={col.id}
                        className={`column ${isLocked ? 'column--locked' : ''} ${isHighlighted ? 'column--highlighted' : ''}`}
                        style={{ height: 'auto', minHeight: '38rem' }}
                      >
                        <div className="column__header">
                          <div className="column__label">
                            <div className={`column__dot ${col.dotClass}`}></div>
                            <h2>{col.title}</h2>
                            <span className="column__count">{colTasks.length}</span>
                          </div>
                          <div className={`column__add-wrap ${openDropdownCol === col.id ? 'open' : ''}`}>
                            <button
                              type="button"
                              className="column__add"
                              aria-label="Column options"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenDropdownCol(openDropdownCol === col.id ? null : col.id)
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="19" cy="12" r="1" />
                                <circle cx="5" cy="12" r="1" />
                              </svg>
                            </button>
                            <div className="dropdown" style={{ display: openDropdownCol === col.id ? 'block' : 'none' }}>
                              <button
                                type="button"
                                className="dropdown__item"
                                onClick={() => {
                                  setSortedColumns(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id])
                                  setOpenDropdownCol(null)
                                }}
                              >
                                {sortedColumns.includes(col.id) ? 'Unsort' : 'Sort by priority'}
                              </button>
                              <button
                                type="button"
                                className="dropdown__item"
                                onClick={() => {
                                  setLockedColumns(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id])
                                  setOpenDropdownCol(null)
                                }}
                              >
                                {isLocked ? 'Unlock column' : 'Lock column'}
                              </button>
                              <button
                                type="button"
                                className="dropdown__item"
                                onClick={() => {
                                  setHighlightedColumns(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id])
                                  setOpenDropdownCol(null)
                                }}
                              >
                                {isHighlighted ? 'Unhighlight' : 'Highlight column'}
                              </button>
                              {col.id !== 'completed' && (
                                <button
                                  type="button"
                                  className="dropdown__item"
                                  onClick={() => {
                                    handleMoveAllToDone(col.id)
                                    setOpenDropdownCol(null)
                                  }}
                                >
                                  Move all to Done
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="task-list" style={{ opacity: isLocked ? 0.6 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
                          {colTasks.map(task => {
                            const { priority, cleanTitle } = parseTaskTitle(task.title)
                            const isDone = col.id === 'completed'

                            return (
                              <article
                                key={task.id}
                                className={`task ${isDone ? 'task--completed' : ''}`}
                                tabIndex="0"
                                onClick={() => handleOpenTaskDetails(task)}
                              >
                                {isDone ? (
                                  <div className="task__check">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M20 6 9 17l-5-5" />
                                    </svg>
                                    <span>Done</span>
                                  </div>
                                ) : (
                                  <div className={`task__priority task__priority--${priority.toLowerCase()}`}>
                                    {priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase()}
                                  </div>
                                )}

                                <h3>{cleanTitle}</h3>
                                <p className="task__desc">Task for {selectedDetails?.comicName || selectedDetails?.title}</p>

                                {/* Progress bar inside In Progress or Under Review */}
                                {(col.id === 'in_progress' || col.id === 'under_review') && (
                                  <div className="task-progress-section" style={{ width: '100%', marginTop: '6px' }}>
                                    <div className="task-progress-label-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--trans-text-secondary)', marginBottom: '4px' }}>
                                      <span>Progress</span>
                                      <span>{task.progress || col.defaultProgress}%</span>
                                    </div>
                                    <div className="task-progress-bar-bg" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '10px', height: '6px' }}>
                                      <div
                                        className="task-progress-bar-fill"
                                        style={{
                                          width: `${task.progress || col.defaultProgress}%`,
                                          background: 'linear-gradient(90deg, #a855f7, #c084fc)',
                                          height: '100%',
                                          borderRadius: '10px'
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                )}

                                <footer className="task__footer">
                                  <div className="avatar avatar--fallback" style={{ fontSize: '9px', width: '22px', height: '22px' }}>
                                    {(task.assignees || 'TL').split(',')[0].slice(0, 2).toUpperCase()}
                                  </div>
                                  <span className="task__date">📅 {task.dueDate}</span>
                                </footer>
                              </article>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="board__footer" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 24px',
                  borderTop: '1px solid var(--trans-border)',
                  marginTop: '16px'
                }}>
                  <span className="board__footer-count" style={{ fontSize: '13px', color: 'var(--trans-text-secondary)' }}>
                    <strong>{tasks.length}</strong> tasks total
                  </span>
                  <span className="board__footer-dot" style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'var(--trans-text-muted)', display: 'inline-block' }}></span>
                  <div className="board__footer-members" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--trans-text-secondary)' }}>Project Team:</span>
                    <div className="task-assignees-row" style={{ display: 'inline-flex', gap: '4px' }}>
                      {members.slice(0, 6).map((m, i) => (
                        <div
                          className="task-assignee-avatar"
                          key={i}
                          title={m.name || m.username || 'Member'}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '700',
                            border: '1.5px solid var(--trans-card-bg)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          {String(m.name || m.username || 'M')[0].toUpperCase()}
                        </div>
                      ))}
                      {members.length > 6 && (
                        <div
                          className="task-assignee-avatar"
                          title={`${members.length - 6} more`}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#475569',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '700',
                            border: '1.5px solid var(--trans-card-bg)'
                          }}
                        >
                          +{members.length - 6}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Paused Tasks Row */}
                <div className="paused-tasks-container" style={{
                  borderTop: '1px solid var(--trans-border)',
                  paddingTop: '20px',
                  marginTop: '20px',
                  paddingLeft: '24px',
                  paddingRight: '24px'
                }}>
                  <h4 className="paused-tasks-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--trans-text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>⏸</span> Paused ({pausedTasks.length})
                  </h4>
                  {pausedTasks.length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: 'var(--trans-text-muted)', fontSize: '13px', margin: 0 }}>No paused tasks.</p>
                  ) : (
                    <div className="paused-tasks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                      {pausedTasks.map(task => {
                        const { priority, cleanTitle } = parseTaskTitle(task.title)
                        return (
                          <div className="paused-task-card task-card-item" key={task.id} style={{ opacity: 0.75 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span className="paused-task-badge task-project-tag" style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>Paused</span>
                              <span className={`task-priority-badge ${priority.toLowerCase()}`}>{priority}</span>
                            </div>
                            <h5 className="task-title" style={{ margin: '8px 0 4px' }}>{cleanTitle}</h5>
                            <span style={{ fontSize: '11px', color: 'var(--trans-text-muted)' }}>Project: {task.project || selectedDetails?.comicName || selectedDetails?.title}</span>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--trans-text-secondary)' }}>Due: {task.dueDate}</span>
                              <button className="trans-btn primary" style={{ fontSize: '9px', padding: '2px 8px' }} onClick={() => handleMoveTask(task.id, 'backlog')}>Resume</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* CREATE TASK MODAL */}
            {showCreateTask && (
              <div className="trans-modal-overlay">
                <div className="trans-modal-card">
                  <div className="trans-modal-header">
                    <h3>Create New Task</h3>
                    <button className="trans-modal-close-btn" onClick={() => setShowCreateTask(false)}>×</button>
                  </div>
                  <div className="trans-modal-body">
                    <div className="trans-form-group">
                      <label className="trans-form-label">Comic Project *</label>
                      <select
                        className="trans-form-input"
                        value={newTaskData.comic}
                        onChange={(e) => setNewTaskData({ ...newTaskData, comic: e.target.value })}
                      >
                        {projects.filter(p =>
                          p.status === 'ACTIVE' &&
                          (p.leaderName === userFullName || p.leaderName === authUser?.fullName || p.leaderName === authUser?.username) &&
                          p.title && p.title !== '-'
                        ).map((c, idx) => (
                          <option key={idx} value={c.title}>{c.title} ({c.targetLang})</option>
                        ))}
                      </select>
                    </div>
                    <div className="trans-form-group">
                      <label className="trans-form-label">Task Name *</label>
                      <input
                        type="text"
                        className="trans-form-input"
                        placeholder="e.g. Chapter 47 - Proofreading"
                        value={newTaskData.title}
                        onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                      />
                    </div>
                    <div className="trans-form-group">
                      <label className="trans-form-label">Kanban Column</label>
                      <select
                        className="trans-form-input"
                        value={newTaskData.column}
                        onChange={(e) => setNewTaskData({ ...newTaskData, column: e.target.value })}
                      >
                        <option value="backlog">Backlog</option>
                        <option value="in_progress">In Progress</option>
                        <option value="under_review">Under Review</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div className="trans-form-group">
                      <label className="trans-form-label">Priority</label>
                      <select
                        className="trans-form-input"
                        value={newTaskData.priority}
                        onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value })}
                      >
                        <option value="Urgent">🚨 Urgent</option>
                        <option value="High">🟠 High</option>
                        <option value="Medium">🟣 Medium</option>
                        <option value="Low">⚪ Low</option>
                      </select>
                    </div>
                    <div className="trans-form-group">
                      <label className="trans-form-label">Assignee</label>
                      <select
                        className="trans-form-input"
                        value={newTaskData.assignee}
                        onChange={(e) => setNewTaskData({ ...newTaskData, assignee: e.target.value })}
                      >
                        {members.map((m, idx) => (
                          <option key={m.id || idx} value={m.id || m.avatar}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="trans-form-group">
                      <label className="trans-form-label">Due Date</label>
                      <input
                        type="date"
                        className="trans-form-input"
                        value={newTaskData.dueDate}
                        onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          className="trans-btn secondary"
                          style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                          onClick={() => {
                            const d = new Date()
                            d.setDate(d.getDate() + 3)
                            setNewTaskData({ ...newTaskData, dueDate: d.toISOString().split('T')[0] })
                          }}
                        >
                          +3 Days
                        </button>
                        <button
                          type="button"
                          className="trans-btn secondary"
                          style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                          onClick={() => {
                            const d = new Date()
                            d.setDate(d.getDate() + 7)
                            setNewTaskData({ ...newTaskData, dueDate: d.toISOString().split('T')[0] })
                          }}
                        >
                          +1 Week
                        </button>
                        <button
                          type="button"
                          className="trans-btn secondary"
                          style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                          onClick={() => {
                            const d = new Date()
                            d.setDate(d.getDate() + 14)
                            setNewTaskData({ ...newTaskData, dueDate: d.toISOString().split('T')[0] })
                          }}
                        >
                          +2 Weeks
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="trans-modal-footer">
                    <button className="trans-btn secondary" onClick={() => setShowCreateTask(false)}>Cancel</button>
                    <button className="trans-btn primary" onClick={handleCreateTask} disabled={!newTaskData.title.trim()}>Create Task</button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL: CHAPTER BACKLOG WAREHOUSE */}
            {showBacklogModal && (
              <div className="trans-modal-overlay">
                <div className="trans-modal-card" style={{ maxWidth: '800px', width: '90%' }}>
                  <div className="trans-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--trans-text-primary)' }}>Chapter Backlog</h3>
                      <span className="chapter-backlog-count" style={{
                        background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        minWidth: '20px',
                        textAlign: 'center'
                      }}>{chapterBacklog.length}</span>
                    </div>
                    <button className="trans-modal-close-btn" onClick={() => setShowBacklogModal(false)}>×</button>
                  </div>

                  <div className="trans-modal-body" style={{ padding: '0 20px 20px 20px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--trans-text-secondary)', margin: '12px 0 20px' }}>
                      These are approved chapters from the Author that are waiting for task creation and assignment in your team.
                    </p>
                    
                    {chapterBacklog.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                        <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 6px 0', color: 'var(--trans-text-primary)' }}>🎉 No chapters pending</p>
                        <p style={{ fontSize: '13px', margin: 0 }}>All approved chapters have been assigned tasks on your board.</p>
                      </div>
                    ) : (
                      <div className="chapter-backlog-table" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--trans-border)', borderRadius: '8px' }}>
                        <div className="chapter-backlog-table-head" style={{ position: 'sticky', top: 0, background: 'var(--trans-card-bg)', zIndex: 10 }}>
                          <span>CHAPTER</span>
                          <span>COMIC</span>
                          <span>PAGES</span>
                          <span>APPROVED</span>
                          <span></span>
                        </div>
                        {chapterBacklog.map(ch => {
                          const approvedDate = ch.approvedAt ? new Date(ch.approvedAt) : null
                          const timeAgo = approvedDate ? getTimeAgo(approvedDate) : 'Unknown'
                          return (
                            <div className="chapter-backlog-row" key={ch.chapterId}>
                              <span className="chapter-backlog-cell-chapter">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                </svg>
                                <div>
                                  <strong>{ch.title || 'Chapter ' + ch.chapterNumber}</strong>
                                </div>
                              </span>
                              <span className="chapter-backlog-cell-comic">{ch.comicName}</span>
                              <span className="chapter-backlog-cell-pages">{ch.pages} pages</span>
                              <span className="chapter-backlog-cell-approved">{timeAgo}</span>
                              <span className="chapter-backlog-cell-action">
                                <button
                                  className="chapter-backlog-create-btn"
                                  onClick={() => {
                                    setShowBacklogModal(false)
                                    openCreateTaskFromBacklog(ch)
                                  }}
                                >
                                  + Create Task
                                </button>
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TASK DETAILS & EDIT STATUS MODAL */}
            {selectedTask && (
              <div className="trans-modal-overlay">
                <div className="trans-modal-card">
                  <div className="trans-modal-header">
                    <h3>Edit Task Details</h3>
                    <button className="trans-modal-close-btn" onClick={() => setSelectedTask(null)}>×</button>
                  </div>
                  <div className="trans-modal-body">

                    <div className="trans-form-group">
                      <label className="trans-form-label">Comic Project</label>
                      <input
                        type="text"
                        className="trans-form-input"
                        value={editTaskData.comic}
                        disabled
                      />
                    </div>

                    <div className="trans-form-group">
                      <label className="trans-form-label">Task Name *</label>
                      <input
                        type="text"
                        className="trans-form-input"
                        value={editTaskData.title}
                        onChange={(e) => setEditTaskData({ ...editTaskData, title: e.target.value })}
                      />
                    </div>

                    <div className="trans-form-group">
                      <label className="trans-form-label">Status (Sprint Column)</label>
                      <select
                        className="trans-form-input"
                        value={editTaskData.columnName}
                        onChange={(e) => setEditTaskData({ ...editTaskData, columnName: e.target.value })}
                      >
                        <option value="backlog">Backlog</option>
                        <option value="in_progress">In Progress</option>
                        <option value="under_review">Under Review</option>
                        <option value="completed">Completed</option>
                        <option value="paused">Paused</option>
                      </select>
                    </div>

                    <div className="trans-form-group">
                      <label className="trans-form-label">Priority</label>
                      <select
                        className="trans-form-input"
                        value={editTaskData.priority}
                        onChange={(e) => setEditTaskData({ ...editTaskData, priority: e.target.value })}
                      >
                        <option value="Urgent">🚨 Urgent</option>
                        <option value="High">🟠 High</option>
                        <option value="Medium">🟣 Medium</option>
                        <option value="Low">⚪ Low</option>
                      </select>
                    </div>

                    <div className="trans-form-group">
                      <label className="trans-form-label">Assignee</label>
                      <select
                        className="trans-form-input"
                        value={editTaskData.assignee}
                        onChange={(e) => setEditTaskData({ ...editTaskData, assignee: e.target.value })}
                      >
                        <option value="">Unassigned</option>
                        {members.map((m, idx) => (
                          <option key={idx} value={m.avatar || m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="trans-form-group">
                      <label className="trans-form-label">Progress Percentage ({editTaskData.progress}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="trans-form-input"
                        value={editTaskData.progress}
                        onChange={(e) => setEditTaskData({ ...editTaskData, progress: Number(e.target.value) })}
                        style={{ padding: 0 }}
                      />
                    </div>

                    <div className="trans-form-group">
                      <label className="trans-form-label">Due Date</label>
                      <input
                        type="date"
                        className="trans-form-input"
                        value={editTaskData.dueDate}
                        onChange={(e) => setEditTaskData({ ...editTaskData, dueDate: e.target.value })}
                      />
                    </div>

                  </div>
                  <div className="trans-modal-footer">
                    <button className="trans-btn secondary" onClick={() => setSelectedTask(null)}>Cancel</button>
                    <button className="trans-btn secondary" onClick={() => setSelectedTask(null)}><GitCompare />Review</button>

                    <button
                      className="trans-btn primary"
                      onClick={() => navigate(`/translator/translate-workspace/task/${selectedTask.id}`)}
                      disabled={!editTaskData.title.trim()}
                    >
                      <StepForward />Continue
                    </button>
                  </div>
                </div>
              </div>
            )}

          </>
        )}

        {/* Tab 5: GROUP SETTINGS */}
        {workspaceTab === 'settings' && (
          <div className="group-settings-tab-container fade-in">
            {/* Left Column: Group Details */}
            <div className="settings-tab-card">
              <h3 className="settings-section-title">Group Information</h3>

              <div className="trans-form-group">
                <label className="trans-form-label">Group Name</label>
                <input
                  type="text"
                  className="trans-form-input"
                  value={selectedDetails.team}
                  onChange={(e) => {
                    const updated = { ...selectedDetails, team: e.target.value }
                    setSelectedDetails(updated)
                  }}
                />
              </div>

              <div className="trans-form-group" style={{ marginTop: '16px' }}>
                <label className="trans-form-label">Description</label>
                <textarea
                  className="trans-form-input textarea"
                  style={{ height: '150px' }}
                  value={selectedDetails.description || ''}
                  onChange={(e) => {
                    const updated = { ...selectedDetails, description: e.target.value }
                    setSelectedDetails(updated)
                  }}
                />
              </div>

              <button className="trans-btn primary" style={{ marginTop: '20px' }} onClick={handleSaveWorkspaceSettings}>
                Save Changes
              </button>
            </div>

            {/* Right Column: Recruitment & Capacity + Leader Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="settings-tab-card" style={{ maxWidth: '100%' }}>
                <h3 className="settings-section-title">Recruitment & Capacity</h3>
                
                <div className="trans-form-group">
                  <label className="trans-form-label">Recruitment Status</label>
                  <select 
                    className="trans-form-input"
                    value={selectedDetails.isRecruiting ? "true" : "false"}
                    onChange={(e) => {
                      const val = e.target.value === "true"
                      setSelectedDetails({ ...selectedDetails, isRecruiting: val })
                    }}
                  >
                    <option value="true">Open — recruiting new members (Visible in pool)</option>
                    <option value="false">Closed — not accepting new members</option>
                  </select>
                </div>

                <div className="trans-form-group" style={{ marginTop: '16px' }}>
                  <label className="trans-form-label">Max Members Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className="trans-form-input"
                    value={selectedDetails.maxMembers || 5}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value) || 5)
                      setSelectedDetails({ ...selectedDetails, maxMembers: val })
                    }}
                  />
                </div>

                <div className="trans-form-group" style={{ marginTop: '16px' }}>
                  <label className="trans-form-label">Recruitment Urgency / Priority</label>
                  <select 
                    className="trans-form-input"
                    value={selectedDetails.priority || 'Medium'}
                    onChange={(e) => setSelectedDetails({ ...selectedDetails, priority: e.target.value })}
                  >
                    <option value="Urgent">🔥 Urgent (Recruiting Urgently)</option>
                    <option value="High">🟠 High Priority</option>
                    <option value="Medium">🟣 Medium Priority</option>
                    <option value="Low">⚪ Low Priority</option>
                  </select>
                </div>

                <div style={{ marginTop: '16px' }}>
                  {selectedDetails.isRecruiting ? (
                    (selectedDetails.maxMembers || 5) - members.filter(m => m.role !== 'Group Leader').length > 0 ? (
                      <div className="capacity-info-alert recruiting" style={{
                        background: 'rgba(34, 197, 94, 0.08)',
                        border: '1px solid rgba(34, 197, 94, 0.15)',
                        color: '#4ade80',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}>
                        <span>🟢 Open Recruiting: <strong>{Math.max(0, (selectedDetails.maxMembers || 5) - members.filter(m => m.role !== 'Group Leader').length)}</strong> spots available to join</span>
                      </div>
                    ) : (
                      <div className="capacity-info-alert full" style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        color: '#f87171',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}>
                        <span>🔴 Team is full (0 spots available)</span>
                      </div>
                    )
                  ) : (
                    <div className="capacity-info-alert full" style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#94a3b8',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <span>⚪ Recruitment Closed</span>
                    </div>
                  )}
                </div>

                <button className="trans-btn primary" style={{ marginTop: '16px', width: '100%' }} onClick={handleSaveWorkspaceSettings}>
                  Save Recruitment Settings
                </button>
              </div>

              {/* Leader Info section */}
              <div className="settings-leader-card" style={{ maxWidth: '100%', marginTop: 0 }}>
                <h3 className="settings-section-title">Group Leader</h3>
                <div className="member-cell-info">
                  <div className="chat-avatar" style={{ background: '#f59e0b', color: '#ffffff' }}>
                    {selectedDetails.leaderInitials || 'TL'}
                  </div>
                  <div className="member-status-details">
                    <span className="member-name-text">{selectedDetails.leaderName || 'No Leader'}</span>
                    <span className="post-time" style={{ textTransform: 'uppercase', fontWeight: '700', fontSize: '9px', color: '#d97706' }}>
                      Group Leader · {selectedDetails.chaptersCount || 0} chapters contributed
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--trans-text-muted)', margin: '14px 0 0' }}>
                  All other members are assigned as Member. Roles are managed automatically.
                </p>
              </div>
            </div>
          </div>
        )}
        {renderReviewModal()}
      </div>
=======
      <WorkspaceDetailView
        selectedDetails={selectedDetails}
        setSelectedDetails={setSelectedDetails}
        onBackToProjects={() => setSelectedDetails(null)}
        workspaceTab={workspaceTab}
        setWorkspaceTab={setWorkspaceTab}
        isCurrentLeader={isCurrentLeader}
        members={members}
        memberSearch={memberSearch}
        setMemberSearch={setMemberSearch}
        onMembersLoaded={setMembers}
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
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        onSendChat={handleSendChat}
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
        onContinueToWorkspace={() => navigate(`/translator/translate-workspace/task/${selectedTask.id}`)}
        onContinueToReviewWorkspace={() => navigate(`/translator/review-workspace/task/${selectedTask.id}`)}
        onSaveWorkspaceSettings={handleSaveWorkspaceSettings}
      />
>>>>>>> buihung
    )
  }

  return (
<<<<<<< HEAD
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
          teamProjectsList.map(proj => {
            return (
              <div className="trans-project-card" key={proj.id}>
                <div className="trans-project-cover">
                  {proj.cover && /^(https?:)?\/\//.test(proj.cover) ? (
                    <img
                      src={proj.cover}
                      alt={proj.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                    />
                  ) : (
                    proj.cover || '📚'
                  )}
                </div>
                <div className="trans-project-info">
                  <h3 className="trans-project-title">{proj.title}</h3>
                  <p className="trans-project-meta">
                    🧑‍🤝‍🧑 Language: <strong>{proj.sourceLang || 'Any'} ➔ {proj.targetLang}</strong>
                  </p>
                  
                  <p className="trans-project-meta" style={{ marginTop: '4px' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '12.5px' }}>
                      👥 Capacity: {Math.max(0, (proj.membersCount || 1) - 1)} / {proj.maxMembers || 5} members ({proj.isRecruiting ? 'Open' : 'Closed'})
                    </span>
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <span className={`status-badge ${proj.status.toLowerCase()}`}>{proj.status}</span>
                    <span className="status-badge leader">⭐ Led by Me</span>
                  </div>
                </div>
                <div className="trans-project-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <ModernButton
                    variant={2}
                    label="Workspace"
                    onClick={() => handleOpenDetails(proj)}
                  />
                  <button className="trans-btn icon-edit" onClick={(e) => handleOpenEdit(proj, e)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── MODAL: EDIT PROJECT ─────────────────────── */}
=======
    <>
      <ProjectsListView
        teamProjectsList={teamProjectsList}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenDetails={handleOpenDetails}
        onOpenEdit={handleOpenEdit}
        isLeaderMatch={isLeaderMatch}
      />
>>>>>>> buihung
      {selectedEdit && (
        <EditProjectModal
          editForm={editForm}
          setEditForm={setEditForm}
          onCancel={() => setSelectedEdit(null)}
          onSave={handleSaveEdit}
        />
      )}
<<<<<<< HEAD

      {renderReviewModal()}
    </div>
=======
    </>
>>>>>>> buihung
  )
}

export default TeamProjects