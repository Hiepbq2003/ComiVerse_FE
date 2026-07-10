import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import '../../assets/style/translator/team-projects.css'
import ModernButton from '../../components/common/ModernButton'
import { getAllProjectTeamsApi, updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { createSubmissionApi } from '../../services/api/SubmissionApi'
import { StepForward } from "lucide-react";
import { GitCompare } from "lucide-react";
import { getAuth } from '../../utils/Auth'

import {
  getTeamAnnouncementsApi,
  createTeamAnnouncementApi,
  likeTeamAnnouncementApi,
  getTeamMessagesApi,
  createTeamMessageApi,
  getTeamTasksApi,
  createTeamTaskApi,
  updateTeamTaskApi,
  getTeamRequestsApi,
  deleteTeamRequestApi,
  getChapterBacklogApi
} from '../../services/api/TeamWorkspaceApi'
import { toast } from 'react-toastify'

function TeamProjects() {
  const navigate = useNavigate()

  // ── Projects data (previously received via props, now fetched locally) ──
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const auth = getAuth()
  const user = auth?.user || {}

  const fetchProjects = async (silent = false) => {
    try {
      if (!silent) setLoadingProjects(true)
      const data = await getAllProjectTeamsApi()
      const mapped = (data || []).map(p => ({
        ...p,
        team: p.title,
        title: p.comicName
      }))
      setProjects(mapped)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load translator project teams.')
    } finally {
      if (!silent) setLoadingProjects(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDetails, setSelectedDetails] = useState(null)
  const [selectedEdit, setSelectedEdit] = useState(null)
  const [showUploadForm, setShowUploadForm] = useState(false)

  const [uploadData, setUploadData] = useState({ chapterTitle: '', chapterContent: '', wordsCount: 3000 })
  const [editForm, setEditForm] = useState({ description: '', status: 'Active', team: '' })

  // ── Workspace State ──────────────────────────────
  const [activeProjectTab, setActiveProjectTab] = useState('my-projects') // 'my-projects' | 'job-pool'
  const [workspaceTab, setWorkspaceTab] = useState('home') // 'home' | 'members' | 'requests' | 'tasks' | 'settings'
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)

  // Real DB Backed States
  const [announcements, setAnnouncements] = useState([])
  const [newPostText, setNewPostText] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [joinRequests, setJoinRequests] = useState([])
  const [tasks, setTasks] = useState([])
  const [chapterBacklog, setChapterBacklog] = useState([])
  const [backlogCollapsed, setBacklogCollapsed] = useState(false)
  const [lockedColumns, setLockedColumns] = useState([])
  const [highlightedColumns, setHighlightedColumns] = useState([])
  const [sortedColumns, setSortedColumns] = useState([])
  const [openDropdownCol, setOpenDropdownCol] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [editTaskData, setEditTaskData] = useState({
    title: '',
    columnName: 'backlog',
    progress: 0,
    priority: 'Medium',
    assignee: '',
    dueDate: ''
  })

  // Dynamic user mapping from auth token
  const authStr = localStorage.getItem('user')
  const authUser = authStr ? JSON.parse(authStr) : user
  const userFullName = authUser?.fullName || authUser?.username || user?.fullName || user?.username || 'Translator'

  const parseTaskTitle = (title) => {
    const match = (title || '').match(/^\[(URGENT|HIGH|MEDIUM|LOW)\]\s*(?:\[([^\]]+)\])?\s*(.*)$/i)
    if (match) {
      return {
        priority: match[1].toUpperCase(),
        comicProject: match[2] || selectedDetails?.comicName || selectedDetails?.title || 'Unknown Comic',
        cleanTitle: match[3]
      }
    }
    return {
      priority: 'MEDIUM',
      comicProject: selectedDetails?.comicName || selectedDetails?.title || 'Unknown Comic',
      cleanTitle: title
    }
  }



  const [members, setMembers] = useState([])
  const [claimedCurrentPage, setClaimedCurrentPage] = useState(1)

  useEffect(() => {
    setClaimedCurrentPage(1)
  }, [selectedDetails?.id])
  const [memberSearch, setMemberSearch] = useState('')
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    column: 'backlog',
    assignee: '',
    dueDate: '',
    priority: 'Medium',
    comic: ''
  })

  const openCreateTaskModal = () => {
    const claimedComics = projects.filter(p =>
      p.status === 'ACTIVE' &&
      (p.leaderName === userFullName || p.leaderName === authUser?.fullName || p.leaderName === authUser?.username) &&
      p.title && p.title !== '-'
    )
    setNewTaskData({
      title: '',
      column: 'backlog',
      assignee: selectedDetails?.leaderInitials || 'TL',
      dueDate: '',
      priority: 'Medium',
      comic: claimedComics[0]?.title || selectedDetails?.comicName || selectedDetails?.title || ''
    })
    setShowCreateTask(true)
  }

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

  const claimedProjects = projects.filter(proj => {
    const isNotUnclaimed = !proj.status || proj.status.toUpperCase() !== 'UNCLAIMED'
    const isUserLeader = proj.leaderName && (
      proj.leaderName === userFullName ||
      proj.leaderName === authUser?.fullName ||
      proj.leaderName === authUser?.username ||
      proj.leaderName.toLowerCase() === userFullName.toLowerCase() ||
      proj.leaderName.toLowerCase() === authUser?.username?.toLowerCase() ||
      proj.leaderName.toLowerCase() === user?.username?.toLowerCase() ||
      proj.leaderName.toLowerCase() === user?.fullName?.toLowerCase()
    )
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
  useEffect(() => {
    if (selectedDetails) {
      const updated = projects.find(p => p.id === selectedDetails.id)
      if (updated) {
        setSelectedDetails(updated)
      }
    }
  }, [projects])

  useEffect(() => {
    const handleGlobalClick = () => {
      setOpenDropdownCol(null)
    }
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  const COLUMN_LIST = [
    { id: 'backlog', title: 'Backlog', dotClass: 'column__dot--backlog', defaultProgress: 0 },
    { id: 'in_progress', title: 'In Progress', dotClass: 'column__dot--progress', defaultProgress: 40 },
    { id: 'under_review', title: 'Under Review', dotClass: 'column__dot--review', defaultProgress: 80 },
    { id: 'completed', title: 'Completed', dotClass: 'column__dot--done', defaultProgress: 100 }
  ]

  // ── Handlers ─────────────────────────────────────
  const handleOpenDetails = async (project) => {
    setSelectedDetails(project)
    setWorkspaceTab('home')
    setShowUploadForm(false)
    setLoadingWorkspace(true)

    // Sync leader info dynamically in the members list
    const actualLeader = {
      name: project.leaderName || 'No Leader',
      role: 'Group Leader',
      status: 'Active',
      joinDate: '01/15/2024',
      contributions: `${project.chaptersCount || 0} chapters`,
      avatar: project.leaderInitials || 'TL'
    }
    setMembers([actualLeader])

    try {
      const [annList, msgList, taskList, reqList, backlogList] = await Promise.all([
        getTeamAnnouncementsApi(project.id),
        getTeamMessagesApi(project.id),
        getTeamTasksApi(project.id),
        getTeamRequestsApi(project.id),
        getChapterBacklogApi(project.id).catch(() => [])
      ])
      setAnnouncements(annList)
      setChatMessages(msgList.map(m => ({ ...m, isMe: m.sender === userFullName })))
      setTasks(taskList)
      setJoinRequests(reqList.map(r => ({
        ...r,
        roles: typeof r.roles === 'string' ? r.roles.split(',') : r.roles
      })))
      setChapterBacklog(Array.isArray(backlogList) ? backlogList : [])
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
      team: project.title || '' // project title matches the team name column
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
        cover: selectedEdit.cover
      })
      const mappedUpdated = {
        ...updated,
        team: updated.title,
        title: updated.comicName
      }
      setProjects(prev =>
        prev.map(proj => (proj.id === selectedEdit.id ? mappedUpdated : proj))
      )
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
        cover: selectedDetails.cover
      })
      const mappedUpdated = {
        ...updated,
        team: updated.title,
        title: updated.comicName
      }
      setProjects(prev =>
        prev.map(proj => (proj.id === selectedDetails.id ? mappedUpdated : proj))
      )
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
      title: selectedDetails.title, // Comic Title
      chapter: uploadData.chapterTitle.trim(),
      submittedBy: selectedDetails.team, // Team Name
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

      // Update local history preview
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

  // Action: Add Announcement
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

  // Action: Like Announcement
  const handleLikePost = async (id) => {
    try {
      const updated = await likeTeamAnnouncementApi(id)
      setAnnouncements(prev =>
        prev.map(post => post.id === id ? { ...post, likes: updated.likes } : post)
      )
    } catch (err) {
      console.error(err)
    }
  }

  // Action: Group Chat Send
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

  // Action: Approve Join Request
  const handleApproveRequest = async (id, name) => {
    try {
      await deleteTeamRequestApi(id)
      setJoinRequests(prev => prev.filter(req => req.id !== id))

      const newMem = {
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

  // Action: Reject Join Request
  const handleRejectRequest = async (id, name) => {
    try {
      await deleteTeamRequestApi(id)
      setJoinRequests(prev => prev.filter(req => req.id !== id))
      toast.info(`Rejected ${name}'s request in database.`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to reject request.')
    }
  }

  // Action: Create Kanban Task
  const handleCreateTask = async () => {
    if (!newTaskData.title.trim()) return
    const formattedTitle = `[${newTaskData.priority.toUpperCase()}] [${newTaskData.comic}] ${newTaskData.title.trim()}`
    try {
      const taskPayload = {
        title: formattedTitle,
        columnName: newTaskData.column,
        progress: 0,
        assignees: newTaskData.assignee,
        dueDate: newTaskData.dueDate || new Date().toISOString().split('T')[0]
      }
      if (newTaskData.chapterId) {
        taskPayload.chapterId = newTaskData.chapterId
      }
      const created = await createTeamTaskApi(selectedDetails.id, taskPayload)
      setTasks([...tasks, created])
      if (newTaskData.chapterId) {
        setChapterBacklog(prev => prev.filter(c => c.chapterId !== newTaskData.chapterId))
      }
      setNewTaskData({ title: '', column: 'backlog', assignee: '', dueDate: '', priority: 'Medium', comic: '', chapterId: null })
      setShowCreateTask(false)
      toast.success('Task saved to database!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to create task.')
    }
  }

  // Action: Move Task Column
  const handleMoveTask = async (id, newCol) => {
    const progressVal = newCol === 'completed' ? 100 : (newCol === 'backlog' ? 0 : undefined)
    try {
      const updated = await updateTeamTaskApi(id, {
        columnName: newCol,
        progress: progressVal
      })
      setTasks(prev =>
        prev.map(task => task.id === id ? {
          ...task,
          columnName: updated.columnName,
          progress: updated.progress
        } : task)
      )
    } catch (err) {
      console.error(err)
      toast.error('Failed to update task state in DB.')
    }
  }

  const handleOpenTaskDetails = (task) => {
    // In toàn bộ đối tượng ra console để xem nó có chứa gì
    console.log("Đối tượng task đầy đủ:", JSON.stringify(task, null, 2));

    const { priority, cleanTitle, comicProject } = parseTaskTitle(task.title);
    setSelectedTask(task);
    
    setEditTaskData({
      title: cleanTitle,
      comic: comicProject || '',
      columnName: task.columnName || 'backlog',
      progress: task.progress || 0,
      priority: priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase(),
      assignees: task.assignees || '',      
      dueDate: task.dueDate || '',
      // Dùng logic này để tìm mọi khả năng có thể là ID
      taskId: task.id || task._id || task.taskId || task.TaskID || 'KHONG-TIM-THAY-ID'
    });
}



  // Action: Move All Column Tasks to Done
  const handleMoveAllToDone = async (colId) => {
    const targets = tasks.filter(t => t.columnName === colId)
    if (targets.length === 0) return
    try {
      await Promise.all(targets.map(t => updateTeamTaskApi(t.id, {
        columnName: 'completed',
        progress: 100,
        dueDate: t.dueDate,
        assignees: t.assignees
      })))
      setTasks(prev => prev.map(t => t.columnName === colId ? { ...t, columnName: 'completed', progress: 100 } : t))
      toast.success(`Moved all tasks from ${colId} to Completed!`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to move all tasks to Completed.')
    }
  }

  const teamProjectsList = projects.filter(proj => {
    const matchesSearch = (proj.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proj.comicName || '').toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    const isUserLeader = proj.leaderName && (
      proj.leaderName === userFullName ||
      proj.leaderName === authUser?.fullName ||
      proj.leaderName === authUser?.username ||
      proj.leaderName.toLowerCase() === userFullName.toLowerCase() ||
      proj.leaderName.toLowerCase() === authUser?.username?.toLowerCase() ||
      proj.leaderName.toLowerCase() === user?.username?.toLowerCase() ||
      proj.leaderName.toLowerCase() === user?.fullName?.toLowerCase()
    )

    return isUserLeader
  })

  // ── PROJECTS DATA LOADING GUARD ───────────────────
  if (loadingProjects) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--trans-text-primary)' }}>
        <h3>⏳ Loading translation project teams...</h3>
      </div>
    )
  }

  // ── WORKSPACE DETAIL VIEW ────────────────────────
  if (selectedDetails) {
    if (loadingWorkspace) {
      return (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--trans-text-primary)' }}>
          <h3>⏳ Loading real-time database details...</h3>
        </div>
      )
    }

    const isCurrentLeader = selectedDetails.leaderName === userFullName ||
      selectedDetails.leaderName === authUser?.fullName ||
      selectedDetails.leaderName === authUser?.username ||
      (selectedDetails.leaderName && selectedDetails.leaderName.toLowerCase() === userFullName.toLowerCase()) ||
      (selectedDetails.leaderName && selectedDetails.leaderName.toLowerCase() === authUser?.username?.toLowerCase()) ||
      (selectedDetails.leaderName && selectedDetails.leaderName.toLowerCase() === user?.username?.toLowerCase()) ||
      (selectedDetails.leaderName && selectedDetails.leaderName.toLowerCase() === user?.fullName?.toLowerCase())

    const activeTasks = tasks.filter(t => t.columnName !== 'paused')
    const pausedTasks = tasks.filter(t => t.columnName === 'paused')
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

        {/* Tab 1: HOME WORKSPACE */}
        {workspaceTab === 'home' && (
          <div className="workspace-home-grid">

            {/* Left Feed Column */}
            <div className="workspace-feed-column">

              {/* Draft Chapter Upload Form Toggle (Integrated original feature) */}
              <div style={{ marginBottom: '20px' }}>
                {!showUploadForm ? (
                  <button className="trans-btn primary" onClick={() => setShowUploadForm(true)}>
                    + Upload New Translated Chapter
                  </button>
                ) : (
                  <div style={{ border: '1px solid var(--trans-border)', padding: '16px', borderRadius: '12px', background: '#ffffff', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 12px', color: 'var(--trans-text-primary)' }}>Upload Chapter Draft</h4>
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
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
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

              {/* Share box */}
              <div className="post-creation-card">
                <div className="post-user-avatar">YS</div>
                <div className="post-creation-input-wrapper">
                  <textarea
                    className="post-textarea"
                    placeholder="Post an announcement, update, or share with the group..."
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                  />
                  <div className="post-creation-actions">
                    <button className="trans-btn primary" onClick={handlePostAnnouncement} disabled={!newPostText.trim()}>
                      Post
                    </button>
                  </div>
                </div>
              </div>

              {/* Feed Card list */}
              <div className="announcement-feed-list">
                {announcements.length === 0 ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--trans-text-muted)', textAlign: 'center', padding: '20px' }}>No announcements yet.</p>
                ) : (
                  announcements.map(post => (
                    <div className="feed-post-card" key={post.id}>
                      <div className="post-header">
                        <div className="post-user-avatar" style={{ background: post.role === 'Group Leader' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '' }}>
                          {post.avatar || 'U'}
                        </div>
                        <div className="post-header-info">
                          <div className="post-author-row">
                            <span className="post-author-name">{post.author}</span>
                            <span className={`post-role-badge ${post.role === 'Group Leader' ? 'leader' : ''}`}>{post.role || 'Member'}</span>
                          </div>
                          <span className="post-time">{post.time}</span>
                        </div>
                      </div>
                      <div className="post-body">{post.content}</div>
                      <div className="post-footer-actions">
                        <button className="post-action-btn" onClick={() => handleLikePost(post.id)}>
                          👍 {post.likes} likes
                        </button>
                      </div>
                    </div>
                  ))
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
                  {filteredMembers.map((member, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="member-cell-info">
                          <div className="chat-avatar" style={{ background: member.role === 'Group Leader' ? '#f59e0b' : '', color: member.role === 'Group Leader' ? '#ffffff' : '' }}>
                            {member.avatar}
                          </div>
                          <div className="member-status-details">
                            <span className="member-name-text">{member.name}</span>
                            <div className="member-status-row">
                              <span className={`status-dot ${member.status.toLowerCase()}`}></span>
                              <span>{member.status}</span>
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
                        <button className="table-action-dots-btn">⋮</button>
                      </td>
                    </tr>
                  ))}
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
                  <div className="request-header">
                    <div className="chat-avatar" style={{ background: '#7c3aed', color: '#ffffff' }}>{req.avatar || 'U'}</div>
                    <div className="post-header-info">
                      <span className="member-name-text">{req.name}</span>
                      <span className="post-time">{req.time}</span>
                    </div>
                  </div>
                  <div className="request-message">"{req.text}"</div>
                  <div className="request-role-tags">
                    {req.roles.map((r, i) => (
                      <span className="role-tag" key={i}>{r}</span>
                    ))}
                  </div>
                  <div className="request-actions-row">
                    <button className="trans-btn primary" onClick={() => handleApproveRequest(req.id, req.name)}>
                      Approve
                    </button>
                    <button className="trans-btn secondary" onClick={() => handleRejectRequest(req.id, req.name)}>
                      Reject
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="board__meta">
                      <span className="board__badge">{selectedDetails?.te || 'Translation'} Team</span>
                      <span className="board__date">{activeTasks.length} active · {pausedTasks.length} paused</span>
                    </div>
                    <button className="trans-btn primary" style={{ height: '38px', padding: '0 16px', borderRadius: '8px', fontSize: '13px' }} onClick={openCreateTaskModal}>
                      + Create Task
                    </button>
                  </div>
                </div>

                {/* Chapter Backlog Section */}
                {chapterBacklog.length > 0 && (
                  <div className="chapter-backlog-section">
                    <div className="chapter-backlog-header" onClick={() => setBacklogCollapsed(!backlogCollapsed)}>
                      <div className="chapter-backlog-header-left">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                        <h3>Chapter Backlog</h3>
                        <span className="chapter-backlog-subtitle">— approved by moderator, waiting for task assignment</span>
                      </div>
                      <div className="chapter-backlog-header-right">
                        <span className="chapter-backlog-count">{chapterBacklog.length}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`chapter-backlog-chevron ${backlogCollapsed ? '' : 'rotated'}`}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                    {!backlogCollapsed && (
                      <div className="chapter-backlog-table">
                        <div className="chapter-backlog-table-head">
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
                                  onClick={() => openCreateTaskFromBacklog(ch)}
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
                )}

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
                          <option key={idx} value={m.avatar}>{m.name}</option>
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

              <div className="trans-form-group">
                <label className="trans-form-label">Description</label>
                <textarea
                  className="trans-form-input textarea"
                  style={{ height: '120px' }}
                  value={selectedDetails.description || ''}
                  onChange={(e) => {
                    const updated = { ...selectedDetails, description: e.target.value }
                    setSelectedDetails(updated)
                  }}
                />
              </div>

              <div className="trans-form-group">
                <label className="trans-form-label">Recruitment Status</label>
                <select className="trans-form-input">
                  <option>Open — accepting new members</option>
                  <option>Closed — team is full</option>
                </select>
              </div>

              <button className="trans-btn primary" style={{ marginTop: '12px' }} onClick={handleSaveWorkspaceSettings}>
                Save Changes
              </button>
            </div>

            {/* Leader Info section */}
            <div className="settings-leader-card">
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
        )}
      </div>
    )
  }

  // ── PROJECTS LISTING VIEW ────────────────────────
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
              <div className="trans-project-cover">
                {proj.cover && /^(https?:)?\/\//.test(proj.cover) ? (
                  <img
                    src={proj.cover}
                    alt={proj.title}
                    style={{ width: '100FS%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                  />
                ) : (
                  proj.cover || '📚'
                )}
              </div>
              <div className="trans-project-info">
                <h3 className="trans-project-title">{proj.title}</h3>
                <p className="trans-project-meta">
                  🧑‍🤝‍🧑 Language: <strong>{proj.targetLang}</strong>
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span className={`status-badge ${proj.status.toLowerCase()}`}>{proj.status}</span>
                  {proj.leaderName && (
                    proj.leaderName === userFullName ||
                    proj.leaderName === authUser?.fullName ||
                    proj.leaderName === authUser?.username ||
                    proj.leaderName.toLowerCase() === userFullName.toLowerCase() ||
                    proj.leaderName.toLowerCase() === authUser?.username?.toLowerCase() ||
                    proj.leaderName.toLowerCase() === user?.username?.toLowerCase() ||
                    proj.leaderName.toLowerCase() === user?.fullName?.toLowerCase()
                  ) && (
                      <span className="status-badge leader">⭐ Led by Me</span>
                    )}
                </div>
              </div>
              <div className="trans-project-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <ModernButton
                  variant={2}
                  label="View Details"
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
          ))
        )}
      </div>

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

export default TeamProjects;