import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import '../../assets/style/translator/team-projects.css'
import ModernButton from '../../components/common/ModernButton'
import { getMyProjectTeamsApi, updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { createSubmissionApi } from '../../services/api/SubmissionApi'
import { getAuth } from '../../utils/Auth'

import {
  getTeamAnnouncementsApi,
  createTeamAnnouncementApi,
  likeTeamAnnouncementApi,
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

// =============================================================================
// Pure helper function — no closure over component state.
// =============================================================================

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

// =============================================================================
// Projects listing view — the "no project open yet" screen with the searchable
// grid of project cards.
// =============================================================================

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

// =============================================================================
// Edit Project modal
// =============================================================================

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

// =============================================================================
// Workspace breadcrumbs + tab switcher bar
// =============================================================================

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

// =============================================================================
// Workspace detail view — composes breadcrumbs + tabs + whichever tab is active
// =============================================================================

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
  onSaveWorkspaceSettings
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

// =============================================================================
// Main component — holds ALL state + handlers, decides which top-level view to
// render (projects list vs workspace detail), and passes everything down as props.
// =============================================================================

function TeamProjects() {
  const navigate = useNavigate()

  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const auth = getAuth()
  const authUser = auth?.user
  const userFullName = authUser?.fullName || authUser?.username || 'Translator'
  const user = authUser || {}

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
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [joinRequests, setJoinRequests] = useState([])
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

  // Fetch chapter options for THIS team whenever the Create Task modal opens.
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

  // ── Handlers ─────────────────────────────────────
  const handleOpenDetails = async (project) => {
    setSelectedDetails(project)
    setWorkspaceTab('home')
    setShowUploadForm(false)
    setLoadingWorkspace(true)

    // Placeholder shown (badge count, capacity calc, etc.) until MembersTab
    // fetches the real roster from GET /{teamId}/members and reports it back
    // up via its onMembersLoaded callback.
    setMembers([{
      name: project.leaderName || 'No Leader',
      role: 'Group Leader',
      status: 'Active',
      joinDate: '01/15/2024',
      contributions: `${project.chaptersCount || 0} chapters`,
      avatar: project.leaderInitials || 'TL'
    }])

    try {
      const [annList, msgList, taskList, reqList, teamMembersList] = await Promise.all([
        getTeamAnnouncementsApi(project.id),
        getTeamMessagesApi(project.id),
        getTeamTasksApi(project.id),
        getTeamRequestsApi(project.id),
        // GET /{teamId}/members — raw roster for the Tasks tab's assignee
        // picker. MembersTab does its own separate fetch/mapping for display.
        getTeamMembersApi(project.id).catch((err) => {
          console.error('Could not load real team members for assignee picker:', err)
          return []
        })
      ])
      setAnnouncements(annList)
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

  const handlePostAnnouncement = async () => {
    if (!newPostText.trim()) return
    try {
      const created = await createTeamAnnouncementApi(selectedDetails.id, {
        author: userFullName,
        role: selectedDetails.leaderName === userFullName ? 'Group Leader' : 'Member',
        avatar: userFullName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2),
        time: 'Just now',
        content: newPostText.trim()
      })
      setAnnouncements([created, ...announcements])
      setNewPostText('')
      toast.success('Announcement saved to database!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to post announcement.')
    }
  }

  const handleLikePost = async (id) => {
    try {
      const updated = await likeTeamAnnouncementApi(id)
      setAnnouncements(prev => prev.map(post => post.id === id ? { ...post, likes: updated.likes } : post))
    } catch (err) {
      console.error(err)
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
        id: request.requesterId,
        name,
        role: 'Member',
        status: 'Active',
        joinDate: new Date().toLocaleDateString('en-US'),
        contributions: '0 chapters',
        avatar: name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)
      }
      setMembers([...members, newMem])
      toast.success(`Approved ${name} in database!`)
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
    if (ln === username || ln === fullName) return true
    const isDevLeader = ln.includes('trans') || ln.includes('tran')
    const isDevUser = username.includes('trans') || username.includes('tran') || fullName.includes('trans') || fullName.includes('tran')
    return isDevLeader && isDevUser
  }

  // Backend's /my-teams endpoint already only returns projects the current user leads
  // or is a member of — no need to re-filter by leader here anymore. isLeaderMatch is
  // still used below for "isCurrentLeader" (deciding whether to show the Requests/
  // Settings tabs INSIDE an already-opened project's workspace).
  const teamProjectsList = projects.filter(proj =>
    (proj.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (proj.comicName || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ── Render ─────────────────────────────────────
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
        onSaveWorkspaceSettings={handleSaveWorkspaceSettings}
      />
    )
  }

  return (
    <>
      <ProjectsListView
        teamProjectsList={teamProjectsList}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenDetails={handleOpenDetails}
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