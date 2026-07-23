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
import TeamGroupChat from '../../components/chat/TeamGroupChat'

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
    const filteredMembers = members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()))

    return (
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

            {/* Right Chat Sidebar - Integrated Real-time Group Chat */}
            <TeamGroupChat
              groupId={selectedDetails?.id}
              teamName={selectedDetails?.title || selectedDetails?.team}
            />

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