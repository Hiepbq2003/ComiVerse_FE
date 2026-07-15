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
  getTeamMembersApi,
  getTeamChaptersApi,
  createTeamTaskApi,
  updateTeamTaskApi,
  getTeamRequestsApi,
  deleteTeamRequestApi,
  createTeamRequestApi
} from '../../services/api/TeamWorkspaceApi'
import { toast } from 'react-toastify'

// =============================================================================
// Pure helper functions — no closure over component state, take everything
// they need as explicit parameters/arguments.
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

// "fallbackComic" replaces the old closure over "selectedDetails" — pass
// selectedDetails?.comicName || selectedDetails?.title || 'Unknown Comic' from the caller.
function parseTaskTitle(title, fallbackComic) {
  const match = (title || '').match(/^\[(URGENT|HIGH|MEDIUM|LOW)\]\s*(?:\[([^\]]+)\])?\s*(.*)$/i)
  if (match) {
    return {
      priority: match[1].toUpperCase(),
      comicProject: match[2] || fallbackComic || 'Unknown Comic',
      cleanTitle: match[3]
    }
  }
  return {
    priority: 'MEDIUM',
    comicProject: fallbackComic || 'Unknown Comic',
    cleanTitle: title
  }
}

// Backend Entity uses "status" as the single source of truth for which Kanban column
// a task belongs to.
function getTaskColumn(task) {
  return task?.status || 'backlog'
}

const COLUMN_LIST = [
  { id: 'backlog', title: 'Backlog', dotClass: 'column__dot--backlog' },
  { id: 'in_progress', title: 'In Progress', dotClass: 'column__dot--progress' },
  { id: 'under_review', title: 'Under Review', dotClass: 'column__dot--review' },
  { id: 'completed', title: 'Completed', dotClass: 'column__dot--done' }
]

// =============================================================================
// Projects listing view — the "no project open yet" screen with the searchable
// grid of project cards.
// =============================================================================

function ProjectsListView({ teamProjectsList, searchTerm, onSearchChange, onOpenDetails, onOpenEdit }) {
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
                  <span className="status-badge leader">⭐ Led by Me</span>
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
// Tab 1: Home (announcements feed + group chat)
// =============================================================================

function HomeTab({
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
  onSendChat
}) {
  return (
    <div className="workspace-home-grid">
      {/* Left Feed Column */}
      <div className="workspace-feed-column">
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
                <button className="trans-btn secondary" onClick={() => setShowUploadForm(false)}>Cancel</button>
                <button className="trans-btn primary" onClick={onUploadChapter} disabled={!uploadData.chapterTitle.trim()}>
                  Submit Draft
                </button>
              </div>
            </div>
          )}
        </div>

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
              <button className="trans-btn primary" onClick={onPostAnnouncement} disabled={!newPostText.trim()}>
                Post
              </button>
            </div>
          </div>
        </div>

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
                  <button className="post-action-btn" onClick={() => onLikePost(post.id)}>
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

        <form className="chat-input-wrapper" onSubmit={onSendChat}>
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
  )
}

// =============================================================================
// Tab 2: Members
// =============================================================================

function MembersTab({ members, memberSearch, setMemberSearch }) {
  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()))

  return (
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
  )
}

// =============================================================================
// Tab 3: Join Requests
// =============================================================================

function RequestsTab({ joinRequests, onApprove, onReject }) {
  return (
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
              <button className="trans-btn primary" onClick={() => onApprove(req.id, req.name)}>Approve</button>
              <button className="trans-btn secondary" onClick={() => onReject(req.id, req.name)}>Reject</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// =============================================================================
// Tab 4: Tasks (Kanban board)
// =============================================================================

function TaskAssigneeAvatars({ assigneeIds, getAssigneeInitials }) {
  const ids = assigneeIds && assigneeIds.length > 0 ? assigneeIds : [null]
  return (
    <div style={{ display: 'flex' }}>
      {ids.slice(0, 3).map((memberId, i) => (
        <div
          key={memberId || i}
          className="avatar avatar--fallback"
          style={{
            fontSize: '9px',
            width: '22px',
            height: '22px',
            marginLeft: i > 0 ? '-6px' : 0,
            border: '1.5px solid var(--trans-card-bg, #1a1225)',
            zIndex: 3 - i
          }}
        >
          {memberId ? getAssigneeInitials(memberId) : 'TL'}
        </div>
      ))}
      {assigneeIds && assigneeIds.length > 3 && (
        <div
          className="avatar avatar--fallback"
          style={{
            fontSize: '9px',
            width: '22px',
            height: '22px',
            marginLeft: '-6px',
            border: '1.5px solid var(--trans-card-bg, #1a1225)',
            background: '#475569'
          }}
        >
          +{assigneeIds.length - 3}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, colId, comicName, onOpenTaskDetails, getAssigneeInitials }) {
  const { priority, cleanTitle } = parseTaskTitle(task.title, comicName)
  const isDone = colId === 'completed'

  return (
    <article
      className={`task ${isDone ? 'task--completed' : ''}`}
      tabIndex="0"
      onClick={() => onOpenTaskDetails(task)}
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
      <p className="task__desc">Task for {comicName}</p>

      <footer className="task__footer">
        <TaskAssigneeAvatars assigneeIds={task.assigneeIds} getAssigneeInitials={getAssigneeInitials} />
        <span className="task__date">📅 {task.dueDate}</span>
      </footer>
    </article>
  )
}

function KanbanColumn({
  col,
  colTasks,
  comicName,
  isLocked,
  isHighlighted,
  isDropdownOpen,
  onToggleDropdown,
  isSorted,
  onToggleSort,
  onToggleLock,
  onToggleHighlight,
  onMoveAllToDone,
  onOpenTaskDetails,
  getAssigneeInitials
}) {
  return (
    <div
      className={`column ${isLocked ? 'column--locked' : ''} ${isHighlighted ? 'column--highlighted' : ''}`}
      style={{ height: 'auto', minHeight: '38rem' }}
    >
      <div className="column__header">
        <div className="column__label">
          <div className={`column__dot ${col.dotClass}`}></div>
          <h2>{col.title}</h2>
          <span className="column__count">{colTasks.length}</span>
        </div>
        <div className={`column__add-wrap ${isDropdownOpen ? 'open' : ''}`}>
          <button
            type="button"
            className="column__add"
            aria-label="Column options"
            onClick={(e) => {
              e.stopPropagation()
              onToggleDropdown()
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
          <div className="dropdown" style={{ display: isDropdownOpen ? 'block' : 'none' }}>
            <button type="button" className="dropdown__item" onClick={onToggleSort}>
              {isSorted ? 'Unsort' : 'Sort by priority'}
            </button>
            <button type="button" className="dropdown__item" onClick={onToggleLock}>
              {isLocked ? 'Unlock column' : 'Lock column'}
            </button>
            <button type="button" className="dropdown__item" onClick={onToggleHighlight}>
              {isHighlighted ? 'Unhighlight' : 'Highlight column'}
            </button>
            {col.id !== 'completed' && (
              <button type="button" className="dropdown__item" onClick={onMoveAllToDone}>
                Move all to Done
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="task-list" style={{ opacity: isLocked ? 0.6 : 1, pointerEvents: isLocked ? 'none' : 'auto' }}>
        {colTasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            colId={col.id}
            comicName={comicName}
            onOpenTaskDetails={onOpenTaskDetails}
            getAssigneeInitials={getAssigneeInitials}
          />
        ))}
      </div>
    </div>
  )
}

function PausedTaskCard({ task, comicName, onResume }) {
  const { priority, cleanTitle } = parseTaskTitle(task.title, comicName)
  return (
    <div className="paused-task-card task-card-item" style={{ opacity: 0.75 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span className="paused-task-badge task-project-tag" style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>Paused</span>
        <span className={`task-priority-badge ${priority.toLowerCase()}`}>{priority}</span>
      </div>
      <h5 className="task-title" style={{ margin: '8px 0 4px' }}>{cleanTitle}</h5>
      <span style={{ fontSize: '11px', color: 'var(--trans-text-muted)' }}>Project: {task.project || comicName}</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <span style={{ fontSize: '11px', color: 'var(--trans-text-secondary)' }}>Due: {task.dueDate}</span>
        <button className="trans-btn primary" style={{ fontSize: '9px', padding: '2px 8px' }} onClick={onResume}>Resume</button>
      </div>
    </div>
  )
}

function TasksTab({
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
  members
}) {
  return (
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
            <h1>{comicName || 'Comic'}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="board__meta">
              <span className="board__badge">Translation Team</span>
              <span className="board__date">{activeTasks.length} active · {pausedTasks.length} paused</span>
            </div>
            <button className="trans-btn primary" style={{ height: '38px', padding: '0 16px', borderRadius: '8px', fontSize: '13px' }} onClick={onCreateTaskClick}>
              + Create Task
            </button>
          </div>
        </div>

        <div className="columns kanban-board-grid" id="columns">
          {COLUMN_LIST.map((col) => {
            const isLocked = lockedColumns.includes(col.id)
            const isHighlighted = highlightedColumns.includes(col.id)

            let colTasks = tasks.filter(t => getTaskColumn(t) === col.id)
            if (sortedColumns.includes(col.id)) {
              const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
              colTasks = [...colTasks].sort((a, b) => {
                const pa = parseTaskTitle(a.title, comicName).priority
                const pb = parseTaskTitle(b.title, comicName).priority
                return (priorityOrder[pa] ?? 4) - (priorityOrder[pb] ?? 4)
              })
            }

            return (
              <KanbanColumn
                key={col.id}
                col={col}
                colTasks={colTasks}
                comicName={comicName}
                isLocked={isLocked}
                isHighlighted={isHighlighted}
                isDropdownOpen={openDropdownCol === col.id}
                onToggleDropdown={() => setOpenDropdownCol(openDropdownCol === col.id ? null : col.id)}
                isSorted={sortedColumns.includes(col.id)}
                onToggleSort={() => {
                  setSortedColumns(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id])
                  setOpenDropdownCol(null)
                }}
                onToggleLock={() => {
                  setLockedColumns(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id])
                  setOpenDropdownCol(null)
                }}
                onToggleHighlight={() => {
                  setHighlightedColumns(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id])
                  setOpenDropdownCol(null)
                }}
                onMoveAllToDone={() => {
                  onMoveAllToDone(col.id)
                  setOpenDropdownCol(null)
                }}
                onOpenTaskDetails={onOpenTaskDetails}
                getAssigneeInitials={getAssigneeInitials}
              />
            )
          })}
        </div>

        <div className="board__footer" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', borderTop: '1px solid var(--trans-border)', marginTop: '16px'
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
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: '700', border: '1.5px solid var(--trans-card-bg)',
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
                    width: '24px', height: '24px', borderRadius: '50%', background: '#475569', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: '700', border: '1.5px solid var(--trans-card-bg)'
                  }}
                >
                  +{members.length - 6}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="paused-tasks-container" style={{
          borderTop: '1px solid var(--trans-border)', paddingTop: '20px', marginTop: '20px',
          paddingLeft: '24px', paddingRight: '24px'
        }}>
          <h4 className="paused-tasks-title" style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--trans-text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⏸</span> Paused ({pausedTasks.length})
          </h4>
          {pausedTasks.length === 0 ? (
            <p style={{ fontStyle: 'italic', color: 'var(--trans-text-muted)', fontSize: '13px', margin: 0 }}>No paused tasks.</p>
          ) : (
            <div className="paused-tasks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
              {pausedTasks.map(task => (
                <PausedTaskCard key={task.id} task={task} comicName={comicName} onResume={() => onMoveTask(task.id, 'backlog')} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Create Task modal
// =============================================================================

const PRIORITY_OPTIONS = [
  { value: 'Urgent', icon: '🚨', color: '#ef4444' },
  { value: 'High', icon: '🟠', color: '#f59e0b' },
  { value: 'Medium', icon: '🟣', color: '#a855f7' },
  { value: 'Low', icon: '⚪', color: '#94a3b8' }
]

function PriorityPicker({ value, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
      {PRIORITY_OPTIONS.map((p) => {
        const isActive = value === p.value
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              padding: '10px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${isActive ? p.color : 'rgba(255,255,255,0.1)'}`,
              background: isActive ? `${p.color}22` : 'rgba(255,255,255,0.03)',
              color: isActive ? p.color : 'var(--trans-text-secondary)',
              transition: 'all 0.15s'
            }}
          >
            <span style={{ fontSize: '16px' }}>{p.icon}</span>
            {p.value}
          </button>
        )
      })}
    </div>
  )
}

function AssigneeChipPicker({ candidates, selectedIds, onToggle, emptyLabel }) {
  if (candidates.length === 0) {
    return <p style={{ fontSize: '12px', color: 'var(--trans-text-muted)', margin: 0 }}>{emptyLabel}</p>
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {candidates.map((m) => {
        const isSelected = (selectedIds || []).includes(m.id)
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onToggle(m.id, isSelected)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px 5px 5px',
              borderRadius: '999px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${isSelected ? '#a855f7' : 'rgba(255,255,255,0.1)'}`,
              background: isSelected ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
              color: isSelected ? '#c084fc' : 'var(--trans-text-secondary)',
              transition: 'all 0.15s'
            }}
          >
            <span
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: isSelected ? '#a855f7' : 'rgba(255,255,255,0.12)',
                color: isSelected ? '#fff' : 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700
              }}
            >
              {m.avatar}
            </span>
            {m.name}
          </button>
        )
      })}
    </div>
  )
}

function CreateTaskModal({
  comicName,
  newTaskData,
  setNewTaskData,
  chapterOptions,
  teamMembersForAssign,
  onCancel,
  onCreate
}) {
  const toggleAssignee = (memberId, isSelected) => {
    setNewTaskData({
      ...newTaskData,
      assignees: isSelected
        ? newTaskData.assignees.filter(a => a !== memberId)
        : [...newTaskData.assignees, memberId]
    })
  }

  const setQuickDueDate = (days) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setNewTaskData({ ...newTaskData, dueDate: d.toISOString().split('T')[0] })
  }

  return (
    <div className="trans-modal-overlay">
      <div className="trans-modal-card" style={{ maxWidth: '560px', width: '92%' }}>
        <div className="trans-modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Create New Task</h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--trans-text-muted)' }}>
              Add a task to the {comicName || 'project'} board
            </p>
          </div>
          <button className="trans-modal-close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="trans-modal-body">
          <div className="trans-form-group">
            <label className="trans-form-label">Task Name *</label>
            <input
              type="text"
              className="trans-form-input"
              placeholder="e.g. Chapter 47 - Proofreading"
              value={newTaskData.title}
              onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
              autoFocus
            />
          </div>

          {/* Chapter — required, options come straight from THIS team's chapters
              (chapters.project_team_id = selectedDetails.id) — no separate
              "which project" step needed, we're already inside that team's workspace */}
          <div className="trans-form-group" style={{ marginTop: '14px' }}>
            <label className="trans-form-label">Chapter *</label>
            <select
              className="trans-form-input"
              value={newTaskData.chapterId || ''}
              onChange={(e) => setNewTaskData({ ...newTaskData, chapterId: e.target.value || null })}
              disabled={chapterOptions.length === 0}
              style={{ color: '#111', background: '#fff' }}
            >
              <option value="" style={{ color: '#111', background: '#fff' }}>
                {chapterOptions.length === 0 ? 'No chapters found for this project' : 'Select a chapter…'}
              </option>
              {chapterOptions.map((ch) => (
                <option key={ch.id} value={ch.id} style={{ color: '#111', background: '#fff' }}>
                  {ch.title}
                </option>
              ))}
            </select>
          </div>

          <div className="trans-form-group" style={{ marginTop: '14px' }}>
            <label className="trans-form-label">Priority</label>
            <PriorityPicker value={newTaskData.priority} onChange={(v) => setNewTaskData({ ...newTaskData, priority: v })} />
          </div>

          <div className="trans-form-group" style={{ marginTop: '14px' }}>
            <label className="trans-form-label">Assignees</label>
            <AssigneeChipPicker
              candidates={teamMembersForAssign}
              selectedIds={newTaskData.assignees}
              onToggle={toggleAssignee}
              emptyLabel="No team members found for this project."
            />
          </div>

          <div className="trans-form-group" style={{ marginTop: '14px' }}>
            <label className="trans-form-label">Due Date</label>
            <input
              type="date"
              className="trans-form-input"
              value={newTaskData.dueDate}
              onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {[{ label: '+3 Days', days: 3 }, { label: '+1 Week', days: 7 }, { label: '+2 Weeks', days: 14 }].map((opt) => (
              <button
                key={opt.label}
                type="button"
                className="trans-btn secondary"
                style={{ fontSize: '11px', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
                onClick={() => setQuickDueDate(opt.days)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="trans-modal-footer">
          <button className="trans-btn secondary" onClick={onCancel}>Cancel</button>
          <button
            className="trans-btn primary"
            onClick={onCreate}
            disabled={!newTaskData.title.trim() || !newTaskData.chapterId || newTaskData.assignees.length === 0}
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Edit Task details modal
// =============================================================================

function EditTaskModal({ editTaskData, setEditTaskData, teamMembersForAssign, onCancel, onContinue }) {
  const toggleAssignee = (memberId, isSelected) => {
    setEditTaskData({
      ...editTaskData,
      assignees: isSelected
        ? editTaskData.assignees.filter(a => a !== memberId)
        : [...(editTaskData.assignees || []), memberId]
    })
  }

  return (
    <div className="trans-modal-overlay">
      <div className="trans-modal-card">
        <div className="trans-modal-header">
          <h3>Edit Task Details</h3>
          <button className="trans-modal-close-btn" onClick={onCancel}>×</button>
        </div>
        <div className="trans-modal-body">
          <div className="trans-form-group">
            <label className="trans-form-label">Comic Project</label>
            <input type="text" className="trans-form-input" value={editTaskData.comic} disabled />
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
              value={editTaskData.status}
              onChange={(e) => setEditTaskData({ ...editTaskData, status: e.target.value })}
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
            <label className="trans-form-label">Assignees</label>
            <AssigneeChipPicker
              candidates={teamMembersForAssign}
              selectedIds={editTaskData.assignees}
              onToggle={toggleAssignee}
              emptyLabel="No team members found for this project."
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
          <button className="trans-btn secondary" onClick={onCancel}>Cancel</button>
          <button className="trans-btn secondary" onClick={onCancel}><GitCompare />Review</button>
          <button className="trans-btn primary" onClick={onContinue} disabled={!editTaskData.title.trim()}>
            <StepForward />Continue
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Tab 5: Group Settings
// =============================================================================

function SettingsTab({ selectedDetails, setSelectedDetails, members, onSaveWorkspaceSettings }) {
  return (
    <div className="group-settings-tab-container fade-in">
      <div className="settings-tab-card">
        <h3 className="settings-section-title">Group Information</h3>

        <div className="trans-form-group">
          <label className="trans-form-label">Group Name</label>
          <input
            type="text"
            className="trans-form-input"
            value={selectedDetails.team}
            onChange={(e) => setSelectedDetails({ ...selectedDetails, team: e.target.value })}
          />
        </div>

        <div className="trans-form-group" style={{ marginTop: '16px' }}>
          <label className="trans-form-label">Description</label>
          <textarea
            className="trans-form-input textarea"
            style={{ height: '150px' }}
            value={selectedDetails.description || ''}
            onChange={(e) => setSelectedDetails({ ...selectedDetails, description: e.target.value })}
          />
        </div>

        <button className="trans-btn primary" style={{ marginTop: '20px' }} onClick={onSaveWorkspaceSettings}>
          Save Changes
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="settings-tab-card" style={{ maxWidth: '100%' }}>
          <h3 className="settings-section-title">Recruitment & Capacity</h3>

          <div className="trans-form-group">
            <label className="trans-form-label">Recruitment Status</label>
            <select
              className="trans-form-input"
              value={selectedDetails.isRecruiting ? "true" : "false"}
              onChange={(e) => setSelectedDetails({ ...selectedDetails, isRecruiting: e.target.value === "true" })}
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
              onChange={(e) => setSelectedDetails({ ...selectedDetails, maxMembers: Math.max(1, Number(e.target.value) || 5) })}
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
              (selectedDetails.maxMembers || 5) - members.length > 0 ? (
                <div className="capacity-info-alert recruiting" style={{
                  background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)',
                  color: '#4ade80', padding: '10px 14px', borderRadius: '6px', fontSize: '13px'
                }}>
                  <span>🟢 Open Recruiting: <strong>{Math.max(0, (selectedDetails.maxMembers || 5) - members.length)}</strong> spots available to join</span>
                </div>
              ) : (
                <div className="capacity-info-alert full" style={{
                  background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: '#f87171', padding: '10px 14px', borderRadius: '6px', fontSize: '13px'
                }}>
                  <span>🔴 Team is full (0 spots available)</span>
                </div>
              )
            ) : (
              <div className="capacity-info-alert full" style={{
                background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94a3b8', padding: '10px 14px', borderRadius: '6px', fontSize: '13px'
              }}>
                <span>⚪ Recruitment Closed</span>
              </div>
            )}
          </div>

          <button className="trans-btn primary" style={{ marginTop: '16px', width: '100%' }} onClick={onSaveWorkspaceSettings}>
            Save Recruitment Settings
          </button>
        </div>

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
        <MembersTab members={members} memberSearch={memberSearch} setMemberSearch={setMemberSearch} />
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
      const data = await getAllProjectTeamsApi()
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

  const teamProjectsList = projects.filter(proj => {
    const matchesSearch = (proj.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (proj.comicName || '').toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    return isLeaderMatch(proj.leaderName)
  })

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

export default TeamProjects;