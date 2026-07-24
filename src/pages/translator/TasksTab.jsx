import { useState } from "react";
import { StepForward } from "lucide-react";
import { GitCompare } from "lucide-react";


export function parseTaskTitle(title, fallbackComic) {
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

export function getTaskColumn(task) {
  return task?.status || 'backlog'
}

const COLUMN_LIST = [
  { id: 'backlog', title: 'Backlog', dotClass: 'column__dot--backlog' },
  { id: 'in_progress', title: 'In Progress', dotClass: 'column__dot--progress' },
  { id: 'under_review', title: 'Under Review', dotClass: 'column__dot--review' },
  { id: 'completed', title: 'Completed', dotClass: 'column__dot--done' }
]

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
  members,
  isCurrentLeader
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
            </div>
            {isCurrentLeader && (
              <button className="trans-btn primary" style={{ height: '38px', padding: '0 16px', borderRadius: '8px', fontSize: '13px' }} onClick={onCreateTaskClick}>
                + Create Task
              </button>
            )}
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

export function CreateTaskModal({
  comicName,
  newTaskData,
  setNewTaskData,
  chapterOptions,
  teamMembersForAssign,
  onCancel,
  onCreate
}) {
  const [submitted, setSubmitted] = useState(false)

  const errors = {
    title: !newTaskData.title.trim(),
    chapterId: !newTaskData.chapterId,
    assignees: newTaskData.assignees.length === 0,
    dueDate: !newTaskData.dueDate
  }
  const showError = (field) => submitted && errors[field]
  const errorBorder = (field) => showError(field) ? { borderColor: '#ef4444' } : undefined

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

  const handleCreateClick = () => {
    setSubmitted(true)
    if (Object.values(errors).some(Boolean)) return
    onCreate()
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
            <input required
              type="text"
              className="trans-form-input"
              style={errorBorder('title')}
              placeholder="e.g. Chapter 47 - Proofreading"
              value={newTaskData.title}
              onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
              autoFocus
            />
            {showError('title') && (
              <p style={{ color: '#ef4444', fontSize: '11px', margin: '4px 0 0' }}>This field is required</p>
            )}
          </div>

          <div className="trans-form-group" style={{ marginTop: '14px' }}>
            <label className="trans-form-label">Chapter *</label>
            <select required
              className="trans-form-input"
              value={newTaskData.chapterId || ''}
              onChange={(e) => setNewTaskData({ ...newTaskData, chapterId: e.target.value || null })}
              disabled={chapterOptions.length === 0}
              style={{ color: '#111', background: '#fff', ...errorBorder('chapterId') }}
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
            {showError('chapterId') && (
              <p style={{ color: '#ef4444', fontSize: '11px', margin: '4px 0 0' }}>Please select a chapter</p>
            )}
          </div>

          <div className="trans-form-group" style={{ marginTop: '14px' }}>
            <label className="trans-form-label">Priority</label>
            <PriorityPicker value={newTaskData.priority} onChange={(v) => setNewTaskData({ ...newTaskData, priority: v })} />
          </div>

          <div className="trans-form-group" style={{ marginTop: '14px' }}>
            <label className="trans-form-label">Assignees *</label>
            <AssigneeChipPicker
              candidates={teamMembersForAssign}
              selectedIds={newTaskData.assignees}
              onToggle={toggleAssignee}
              emptyLabel="No team members found for this project."
            />
            {showError('assignees') && (
              <p style={{ color: '#ef4444', fontSize: '11px', margin: '6px 0 0' }}>Please assign at least one person</p>
            )}
          </div>

          <div className="trans-form-group" style={{ marginTop: '14px' }}>
            <label className="trans-form-label">Due Date *</label>
            <input required
              type="date"
              className="trans-form-input"
              style={errorBorder('dueDate')}
              value={newTaskData.dueDate}
              onChange={(e) => setNewTaskData({ ...newTaskData, dueDate: e.target.value })}
            />
            {showError('dueDate') && (
              <p style={{ color: '#ef4444', fontSize: '11px', margin: '4px 0 0' }}>This field is required</p>
            )}
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
          <button className="trans-btn primary" onClick={handleCreateClick}>
            Create Task
          </button>
        </div>
      </div>
    </div>
  )
}


export function EditTaskModal({ editTaskData, setEditTaskData, teamMembersForAssign, isProjectLeader, onCancel, onContinue, onReview }) {
  const [submitted, setSubmitted] = useState(false)

  const errors = {
    title: !editTaskData.title.trim(),
    assignees: (editTaskData.assignees || []).length === 0,
    dueDate: !editTaskData.dueDate
  }
  const showError = (field) => submitted && errors[field]
  const errorBorder = (field) => showError(field) ? { borderColor: '#ef4444' } : undefined

  // Review is a Project-Leader-only action, and only makes sense once the
  // task has actually been submitted for review by the translator. Outside
  // that state there is nothing to review yet.
  const isUnderReview = editTaskData.status === 'under_review'
  const canReview = isProjectLeader && isUnderReview

  const toggleAssignee = (memberId, isSelected) => {
    setEditTaskData({
      ...editTaskData,
      assignees: isSelected
        ? editTaskData.assignees.filter(a => a !== memberId)
        : [...(editTaskData.assignees || []), memberId]
    })
  }

  const handleContinueClick = () => {
    setSubmitted(true)
    if (Object.values(errors).some(Boolean)) return
    onContinue()
  }

  const handleReviewClick = () => {
    if (!canReview) return
    setSubmitted(true)
    if (Object.values(errors).some(Boolean)) return
    onReview()
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
            <input required
              type="text"
              className="trans-form-input"
              style={errorBorder('title')}
              value={editTaskData.title}
              onChange={(e) => setEditTaskData({ ...editTaskData, title: e.target.value })}
            />
            {showError('title') && (
              <p style={{ color: '#ef4444', fontSize: '11px', margin: '4px 0 0' }}>This field is required</p>
            )}
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
            <label className="trans-form-label">Assignees *</label>
            <AssigneeChipPicker
              candidates={teamMembersForAssign}
              selectedIds={editTaskData.assignees}
              onToggle={toggleAssignee}
              emptyLabel="No team members found for this project."
            />
            {showError('assignees') && (
              <p style={{ color: '#ef4444', fontSize: '11px', margin: '6px 0 0' }}>Please assign at least one person</p>
            )}
          </div>

          <div className="trans-form-group">
            <label className="trans-form-label">Due Date *</label>
            <input required
              type="date"
              className="trans-form-input"
              style={errorBorder('dueDate')}
              value={editTaskData.dueDate}
              onChange={(e) => setEditTaskData({ ...editTaskData, dueDate: e.target.value })}
            />
            {showError('dueDate') && (
              <p style={{ color: '#ef4444', fontSize: '11px', margin: '4px 0 0' }}>This field is required</p>
            )}
          </div>
        </div>
        <div className="trans-modal-footer">
          <button className="trans-btn secondary" onClick={onCancel}>Cancel</button>

          {/* Review: Project-Leader-only, and only once the task is actually
              Under Review — there's nothing to review before the translator
              has submitted it. */}
          {isProjectLeader && (
            <button
              className="trans-btn secondary"
              onClick={handleReviewClick}
              disabled={!isUnderReview}
              title={isUnderReview ? 'Review this submission' : 'Only available once the task is Under Review'}
              style={!isUnderReview ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              <GitCompare />Review
            </button>
          )}

          {/* Continue (keep translating pages): hidden once the task is
              Under Review, so nobody edits pages out from under an
              in-progress review — that's exactly the "chỉ được review"
              constraint. */}
          {!isUnderReview && (
            <button className="trans-btn primary" onClick={handleContinueClick}>
              <StepForward />Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TasksTab