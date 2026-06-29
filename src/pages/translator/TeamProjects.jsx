import { useState } from 'react'
import '../../assets/style/translator/team-projects.css'
import { updateProjectTeamApi } from '../../services/api/ProjectTeamApi'
import { createSubmissionApi } from '../../services/api/SubmissionApi'
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
  deleteTeamRequestApi
} from '../../services/api/TeamWorkspaceApi'
import { toast } from 'react-toastify'

function TeamProjects({ projects, setProjects }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDetails, setSelectedDetails] = useState(null)
  const [selectedEdit, setSelectedEdit] = useState(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  
  const [uploadData, setUploadData] = useState({ chapterTitle: '', chapterContent: '', wordsCount: 3000 })
  const [editForm, setEditForm] = useState({ description: '', status: 'Active', team: '' })

  // ── Workspace State ──────────────────────────────
  const [workspaceTab, setWorkspaceTab] = useState('home') // 'home' | 'members' | 'requests' | 'tasks' | 'settings'
  const [loadingWorkspace, setLoadingWorkspace] = useState(false)
  
  // Real DB Backed States
  const [announcements, setAnnouncements] = useState([])
  const [newPostText, setNewPostText] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [joinRequests, setJoinRequests] = useState([])
  const [tasks, setTasks] = useState([])
  
  // Dynamic user mapping from auth token
  const authStr = localStorage.getItem('auth')
  const authUser = authStr ? JSON.parse(authStr) : null
  const userFullName = authUser?.fullName || authUser?.username || 'Translator'

  // Default members list (seeded details, status active/inactive)
  const [members, setMembers] = useState([
    { name: 'John Smith', role: 'Group Leader', status: 'Active', joinDate: '01/15/2024', contributions: '145 chapters', avatar: 'JS' },
    { name: 'Emily Brown', role: 'Member', status: 'Active', joinDate: '01/20/2024', contributions: '98 chapters', avatar: 'EB' },
    { name: 'Michael Chen', role: 'Member', status: 'Active', joinDate: '02/05/2024', contributions: '67 chapters', avatar: 'MC' },
    { name: 'Sarah Davis', role: 'Member', status: 'Active', joinDate: '02/10/2024', contributions: '53 chapters', avatar: 'SD' },
    { name: 'David Wilson', role: 'Member', status: 'Inactive', joinDate: '03/01/2024', contributions: '41 chapters', avatar: 'DW' },
    { name: 'Lisa Martinez', role: 'Member', status: 'Active', joinDate: '03/15/2024', contributions: '28 chapters', avatar: 'LM' },
    { name: 'Ryan Park', role: 'Member', status: 'Active', joinDate: '04/02/2024', contributions: '19 chapters', avatar: 'RP' }
  ])
  const [memberSearch, setMemberSearch] = useState('')
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [newTaskData, setNewTaskData] = useState({ title: '', column: 'backlog', progress: 0, assignee: 'MC', dueDate: '' })

  // ── Handlers ─────────────────────────────────────
  const handleOpenDetails = async (project) => {
    setSelectedDetails(project)
    setWorkspaceTab('home')
    setShowUploadForm(false)
    setLoadingWorkspace(true)
    try {
      const [annList, msgList, taskList, reqList] = await Promise.all([
        getTeamAnnouncementsApi(project.id),
        getTeamMessagesApi(project.id),
        getTeamTasksApi(project.id),
        getTeamRequestsApi(project.id)
      ])
      setAnnouncements(annList)
      setChatMessages(msgList.map(m => ({ ...m, isMe: m.sender === userFullName })))
      setTasks(taskList)
      setJoinRequests(reqList.map(r => ({
        ...r,
        roles: typeof r.roles === 'string' ? r.roles.split(',') : r.roles
      })))
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
    try {
      const created = await createTeamTaskApi(selectedDetails.id, {
        title: newTaskData.title.trim(),
        columnName: newTaskData.column,
        progress: Number(newTaskData.progress) || 0,
        assignees: newTaskData.assignee,
        dueDate: newTaskData.dueDate || '06/25/2024'
      })
      setTasks([...tasks, created])
      setNewTaskData({ title: '', column: 'backlog', progress: 0, assignee: 'MC', dueDate: '' })
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
          column: updated.columnName, 
          progress: updated.progress
        } : task)
      )
    } catch (err) {
      console.error(err)
      toast.error('Failed to update task state in DB.')
    }
  }

  const teamProjectsList = projects.filter(proj => {
    return proj.title.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // ── WORKSPACE DETAIL VIEW ────────────────────────
  if (selectedDetails) {
    if (loadingWorkspace) {
      return (
        <div style={{ textAlign: 'center', padding: '100px', color: 'var(--trans-text-primary)' }}>
          <h3>⏳ Loading real-time database details...</h3>
        </div>
      )
    }

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
          <button 
            className={`workspace-tab-btn ${workspaceTab === 'requests' ? 'active' : ''}`}
            onClick={() => setWorkspaceTab('requests')}
          >
            Requests {joinRequests.length > 0 && <span className="tab-badge alert-badge">{joinRequests.length}</span>}
          </button>
          <button 
            className={`workspace-tab-btn ${workspaceTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setWorkspaceTab('tasks')}
          >
            Tasks <span className={`tab-badge ${workspaceTab === 'tasks' ? 'active-badge' : ''}`}>{tasks.length}</span>
          </button>
          <button 
            className={`workspace-tab-btn ${workspaceTab === 'settings' ? 'active' : ''}`}
            onClick={() => setWorkspaceTab('settings')}
          >
            Group Settings
          </button>
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
          <div className="tasks-board-tab-container fade-in">
            <div className="taskboard-header-row">
              <div className="taskboard-summary">
                <strong>{activeTasks.length}</strong> active · <strong>{pausedTasks.length}</strong> paused · <strong>{tasks.filter(t => t.columnName === 'completed').length}</strong> completed
              </div>
              <button className="trans-btn primary" onClick={() => setShowCreateTask(true)}>
                + Create Task
              </button>
            </div>

            {/* Kanban columns grid */}
            <div className="kanban-board-grid">
              
              {/* Backlog */}
              <div className="kanban-column-wrapper">
                <div className="kanban-column-title-row">
                  <h4>Backlog</h4>
                  <span className="column-card-count">{tasks.filter(t => t.columnName === 'backlog').length}</span>
                </div>
                {tasks.filter(t => t.columnName === 'backlog').map(task => (
                  <div className="task-card-item" key={task.id}>
                    <span className="task-project-tag">{task.project}</span>
                    <h5 className="task-title">{task.title}</h5>
                    <div className="task-card-footer">
                      <div className="task-assignees-row">
                        {(task.assignees || 'MC').split(',').map((as, i) => (
                          <div className="task-assignee-avatar" key={i}>{as}</div>
                        ))}
                      </div>
                      <div className="task-meta-info">
                        <span className="task-date-info">📅 {task.dueDate}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <button style={{ flex: 1, fontSize: '10px', padding: '2px' }} className="trans-btn primary" onClick={() => handleMoveTask(task.id, 'in_progress')}>Start</button>
                      <button style={{ fontSize: '10px', padding: '2px 6px' }} className="trans-btn secondary" onClick={() => handleMoveTask(task.id, 'paused')}>⏸</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* In Progress */}
              <div className="kanban-column-wrapper">
                <div className="kanban-column-title-row">
                  <h4>In Progress</h4>
                  <span className="column-card-count">{tasks.filter(t => t.columnName === 'in_progress').length}</span>
                </div>
                {tasks.filter(t => t.columnName === 'in_progress').map(task => (
                  <div className="task-card-item" key={task.id}>
                    <span className="task-project-tag">{task.project}</span>
                    <h5 className="task-title">{task.title}</h5>
                    
                    <div className="task-progress-section">
                      <div className="task-progress-label-row">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="task-progress-bar-bg">
                        <div className="task-progress-bar-fill" style={{ width: `${task.progress}%` }}></div>
                      </div>
                    </div>

                    <div className="task-card-footer">
                      <div className="task-assignees-row">
                        {(task.assignees || 'MC').split(',').map((as, i) => (
                          <div className="task-assignee-avatar" key={i}>{as}</div>
                        ))}
                      </div>
                      <div className="task-meta-info">
                        <span className="task-date-info">📅 {task.dueDate}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <button style={{ flex: 1, fontSize: '10px', padding: '2px' }} className="trans-btn primary" onClick={() => handleMoveTask(task.id, 'under_review')}>Submit Review</button>
                      <button style={{ fontSize: '10px', padding: '2px 6px' }} className="trans-btn secondary" onClick={() => handleMoveTask(task.id, 'paused')}>⏸</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Under Review */}
              <div className="kanban-column-wrapper">
                <div className="kanban-column-title-row">
                  <h4>Under Review</h4>
                  <span className="column-card-count">{tasks.filter(t => t.columnName === 'under_review').length}</span>
                </div>
                {tasks.filter(t => t.columnName === 'under_review').map(task => (
                  <div className="task-card-item" key={task.id}>
                    <span className="task-project-tag">{task.project}</span>
                    <h5 className="task-title">{task.title}</h5>
                    
                    <div className="task-progress-section">
                      <div className="task-progress-label-row">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="task-progress-bar-bg">
                        <div className="task-progress-bar-fill" style={{ width: `${task.progress}%`, backgroundColor: '#3b82f6' }}></div>
                      </div>
                    </div>

                    <div className="task-card-footer">
                      <div className="task-assignees-row">
                        {(task.assignees || 'MC').split(',').map((as, i) => (
                          <div className="task-assignee-avatar" key={i}>{as}</div>
                        ))}
                      </div>
                      <div className="task-meta-info">
                        <span className="task-date-info">📅 {task.dueDate}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                      <button style={{ flex: 1, fontSize: '10px', padding: '2px' }} className="trans-btn primary" onClick={() => handleMoveTask(task.id, 'completed')}>Approve & Done</button>
                      <button style={{ flex: 1, fontSize: '10px', padding: '2px' }} className="trans-btn secondary" onClick={() => handleMoveTask(task.id, 'in_progress')}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Completed */}
              <div className="kanban-column-wrapper">
                <div className="kanban-column-title-row">
                  <h4>Completed</h4>
                  <span className="column-card-count">{tasks.filter(t => t.columnName === 'completed').length}</span>
                </div>
                {tasks.filter(t => t.columnName === 'completed').map(task => (
                  <div className="task-card-item" key={task.id}>
                    <span className="task-project-tag">{task.project}</span>
                    <h5 className="task-title">{task.title}</h5>
                    
                    <div className="task-progress-section">
                      <div className="task-progress-label-row">
                        <span>Progress</span>
                        <span>100%</span>
                      </div>
                      <div className="task-progress-bar-bg">
                        <div className="task-progress-bar-fill completed-fill" style={{ width: '100%' }}></div>
                      </div>
                    </div>

                    <div className="task-card-footer">
                      <div className="task-assignees-row">
                        {(task.assignees || 'MC').split(',').map((as, i) => (
                          <div className="task-assignee-avatar" key={i}>{as}</div>
                        ))}
                      </div>
                      <div className="task-meta-info">
                        <span className="task-date-info">📅 {task.dueDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Paused Tasks Row */}
            <div className="paused-tasks-container">
              <h4 className="paused-tasks-title">⏸ Paused ({pausedTasks.length})</h4>
              {pausedTasks.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: 'var(--trans-text-muted)', fontSize: '13px' }}>No paused tasks.</p>
              ) : (
                <div className="paused-tasks-grid">
                  {pausedTasks.map(task => (
                    <div className="paused-task-card" key={task.id}>
                      <span className="paused-task-badge">Paused</span>
                      <h5 className="task-title" style={{ margin: '8px 0 4px' }}>{task.title}</h5>
                      <span style={{ fontSize: '11px', color: 'var(--trans-text-muted)' }}>Project: {task.project}</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--trans-text-secondary)' }}>Due: {task.dueDate}</span>
                        <button className="trans-btn primary" style={{ fontSize: '9px', padding: '2px 8px' }} onClick={() => handleMoveTask(task.id, 'backlog')}>Resume</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                      <label className="trans-form-label">Task Name</label>
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
                      <label className="trans-form-label">Initial Progress %</label>
                      <input 
                        type="number" 
                        className="trans-form-input"
                        value={newTaskData.progress}
                        onChange={(e) => setNewTaskData({ ...newTaskData, progress: e.target.value })}
                      />
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
                        type="text" 
                        className="trans-form-input"
                        placeholder="MM/DD/YYYY"
                        value={newTaskData.dueDate}
                        onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="trans-modal-footer">
                    <button className="trans-btn secondary" onClick={() => setShowCreateTask(false)}>Cancel</button>
                    <button className="trans-btn primary" onClick={handleCreateTask} disabled={!newTaskData.title.trim()}>Create</button>
                  </div>
                </div>
              </div>
            )}

          </div>
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
                <div className="chat-avatar" style={{ background: '#f59e0b', color: '#ffffff' }}>JS</div>
                <div className="member-status-details">
                  <span className="member-name-text">John Smith</span>
                  <span className="post-time" style={{ textTransform: 'uppercase', fontWeight: '700', fontSize: '9px', color: '#d97706' }}>Group Leader · 145 chapters contributed</span>
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
