import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  StepForward,
  GitCompare,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Eye,
  Plus
} from "lucide-react";
import { getChapterDetailApi, getChaptersByComicIdApi } from "../../services/api/ChapterApi";
import { getAuthorComicByIdApi, getAuthorComicChaptersApi, getAuthorChapterPreviewApi } from "../../services/api/AuthorComicApi";
import { getComicByIdApi, searchComicsApi, getAllComicsApi } from "../../services/api/ComicApi";
import { getAuth } from "../../utils/Auth";
import CustomDatePicker from '../../components/common/CustomDatePicker';
import "../../assets/style/moderator/comic-detail.css";

const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  const backendHost = apiBase.startsWith('http') ? apiBase.replace(/\/api\/?$/, '') : 'http://localhost:8081';
  return `${backendHost}${url.startsWith('/') ? '' : '/'}${url}`;
};



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

export function getNormalizedStatusKey(statusStr) {
  if (!statusStr) return 'backlog'
  const s = String(statusStr).toLowerCase().trim()
  if (s === 'backlog') return 'backlog'
  if (s === 'in_progress' || s === 'in-progress' || s === 'in progress') return 'in_progress'
  if (s === 'under_review' || s === 'under-review' || s === 'under review' || s === 'review') return 'under_review'
  if (s === 'completed' || s === 'done') return 'completed'
  if (s === 'paused') return 'paused'
  return 'backlog'
}

export function getAllowedStatusOptions(currentStatusStr) {
  const currentKey = getNormalizedStatusKey(currentStatusStr)
  
  const allOptions = [
    { value: 'backlog', label: 'Backlog' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'completed', label: 'Completed' },
    { value: 'paused', label: 'Paused' }
  ]

  if (currentKey === 'paused') {
    return allOptions
  }

  const pipeline = ['backlog', 'in_progress', 'under_review', 'completed']
  const currentIndex = pipeline.indexOf(currentKey)

  if (currentIndex === -1) {
    return allOptions
  }

  const allowedKeys = new Set()
  allowedKeys.add(currentKey)
  if (currentIndex > 0) {
    allowedKeys.add(pipeline[currentIndex - 1])
  }
  if (currentIndex < pipeline.length - 1) {
    allowedKeys.add(pipeline[currentIndex + 1])
  }
  allowedKeys.add('paused')

  return allOptions.filter(opt => allowedKeys.has(opt.value))
}

export function getTaskColumn(task) {
  return getNormalizedStatusKey(task?.status)
}

export function isUserAssignedToTask(t, teamMembers = [], authUser) {
  if (!t || !authUser) return false;

  const currentUserName = (authUser.fullName || authUser.username || '').toLowerCase().trim();
  const currentUserId = authUser.id ? String(authUser.id) : null;

  const assignees = t.assignees || t.assigneeIds || t.assignedMembers || [];
  if (!Array.isArray(assignees) || assignees.length === 0) return false;

  return assignees.some(mId => {
    if (!mId) return false;

    // 1. Direct ID match
    if (currentUserId && String(mId) === currentUserId) return true;

    // 2. Direct string name match
    if (typeof mId === 'string') {
      const s = mId.toLowerCase().trim();
      if (s === currentUserName || (currentUserId && s === currentUserId)) return true;
    }

    // 3. Candidate lookup in team members list
    const mem = teamMembers.find(m => String(m?.id) === String(mId));
    if (mem) {
      const mName = (mem.name || mem.fullName || mem.username || '').toLowerCase().trim();
      if (mName === currentUserName || (currentUserId && String(mem.id) === currentUserId)) return true;
    }

    return false;
  });
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
  comicId,
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
  isCurrentLeader,
  chapterOptions = [],
  onOpenCreateTaskWithChapter
}) {
  const [inspectingChapter, setInspectingChapter] = useState(null);
  const [isBacklogCollapsed, setIsBacklogCollapsed] = useState(false);

  // Filter out chapters that already have a task created for them
  const assignedChapterIds = new Set(
    (tasks || [])
      .map(t => String(t.chapterId || t.chapter_id || ''))
      .filter(Boolean)
  );

  const unassignedChapterOptions = (chapterOptions || []).filter(ch => {
    if (!ch) return false;
    // 1. Direct ID match
    if (ch.id && assignedChapterIds.has(String(ch.id))) return false;

    // 2. Title / Chapter number pattern match against existing tasks
    const chTitleLower = (ch.title || '').toLowerCase();
    const chNumMatch = chTitleLower.match(/chapter\s*(\d+)/i);

    const isTaskCreated = (tasks || []).some(t => {
      if (!t || !t.title) return false;
      const tLower = t.title.toLowerCase();

      // Check if task title contains exact chapter title
      if (chTitleLower && tLower.includes(chTitleLower)) return true;

      // Check if task title contains "chapter X"
      if (chNumMatch && tLower.includes(`chapter ${chNumMatch[1]}`)) return true;

      return false;
    });

    return !isTaskCreated;
  });

  const auth = getAuth();
  const authUser = auth?.user;

  // Leader sees ALL tasks in project. Members ONLY see tasks they are assigned to.
  const visibleTasks = (tasks || []).filter(t => {
    if (isCurrentLeader) return true;
    return isUserAssignedToTask(t, members, authUser);
  });

  return (
    <div className="board tasks-board-tab-container fade-in" style={{ padding: 0, background: 'transparent' }}>
      
      {/* ── RAW MANUSCRIPT CHAPTERS BACKLOG ──────────────── */}
      {unassignedChapterOptions.length > 0 && (
        <div style={{
          padding: '14px 20px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(99, 102, 241, 0.08))',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setIsBacklogCollapsed(prev => !prev)}>
              <svg
                xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: '#c084fc', transform: isBacklogCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--trans-text-primary)' }}>
                📖 Raw Manuscript Chapters Available ({unassignedChapterOptions.length})
              </h4>
              <span style={{ fontSize: '11px', color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                Ready to Translate
              </span>
            </div>

            {isCurrentLeader && (
              <button
                type="button"
                className="trans-btn primary"
                onClick={() => onCreateTaskClick()}
                style={{ fontSize: '11.5px', padding: '4px 10px', borderRadius: '6px' }}
              >
                <Plus size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Create Task
              </button>
            )}
          </div>

          {!isBacklogCollapsed && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginTop: '12px' }}>
              {unassignedChapterOptions.map((ch, idx) => (
                <div key={ch.id || idx} style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--trans-text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ch.title}
                      </strong>
                      {ch.pagesCount > 0 && (
                        <span style={{ fontSize: '10.5px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                          {ch.pagesCount} pages
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="trans-btn secondary"
                    onClick={() => setInspectingChapter(ch)}
                    style={{ width: '100%', padding: '5px 0', fontSize: '11.5px', textAlign: 'center' }}
                  >
                    👁️ View Chapter
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Raw Chapter Manuscript Viewer & Review Mode Full-Screen Workspace */}
      {inspectingChapter && (
        <ChapterInspectModal
          chapter={inspectingChapter}
          onClose={() => setInspectingChapter(null)}
          comicName={comicName}
          comicId={comicId}
          chapterOptions={chapterOptions}
          teamMembersForAssign={members}
          onCreateTask={(taskData) => {
            if (onOpenCreateTaskWithChapter) {
              onOpenCreateTaskWithChapter(taskData);
            } else if (onCreateTaskClick) {
              onCreateTaskClick(taskData);
            }
          }}
        />
      )}

      {/* ── KANBAN BOARD CARD ────────────────────────────── */}
      <div className="board__card">
        <div className="board__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--trans-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div className="board__title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: '#c084fc', flexShrink: 0 }}
              >
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
              <h1 style={{
                margin: 0,
                fontSize: '19px',
                fontWeight: '700',
                letterSpacing: '0.03em',
                lineHeight: '1.3',
                color: 'var(--trans-text-primary)',
                marginRight: '8px'
              }}>
                {comicName || 'Comic'}
              </h1>
            </div>

            <div className="board__meta" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className="board__badge" style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontWeight: '700' }}>
                Translation Team
              </span>

              <span style={{ fontSize: '12px', color: 'var(--trans-text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <strong>{visibleTasks.length}</strong> tasks total
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--trans-text-secondary)', fontWeight: '600' }}>Project Team:</span>
                <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                  {(members && members.length > 0 ? members : [{ name: 'Leader' }]).slice(0, 6).map((m, i) => (
                    <div
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
                  {members && members.length > 6 && (
                    <div
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
          </div>

          {isCurrentLeader && (
            <button
              type="button"
              className="trans-btn primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '38px',
                padding: '0 18px',
                fontSize: '13px',
                fontWeight: '700',
                borderRadius: '8px',
                background: 'linear-gradient(110deg, #a855f7 0%, #ec4899 55%, #f97316 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 4px 16px rgba(168,85,247,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={onCreateTaskClick}
            >
              <Plus size={16} /> Create Task
            </button>
          )}
        </div>

        <div className="columns kanban-board-grid" id="columns" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px', width: '100%' }}>
          {COLUMN_LIST.map((col) => {
            const isLocked = lockedColumns.includes(col.id)
            const isHighlighted = highlightedColumns.includes(col.id)

            let colTasks = visibleTasks.filter(t => getTaskColumn(t) === col.id)
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

        <div className="paused-tasks-container" style={{
          borderTop: '1px solid var(--trans-border)', paddingTop: '20px', marginTop: '20px',
          paddingLeft: '24px', paddingRight: '24px', width: '100%', clear: 'both'
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

function ChapterInspectModal({ chapter, onClose, comicName, comicId, chapterOptions = [], teamMembersForAssign = [], onCreateTask }) {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'reader'
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [inspectTaskData, setInspectTaskData] = useState({
    title: '',
    column: 'backlog',
    assignees: [],
    dueDate: '',
    priority: 'High',
    chapterId: null
  });

  const handleOpenCreateTask = () => {
    const chId = chapter?.id || null;
    const defaultTitle = `${chapter?.title || `Chapter ${chapter?.number || chapter?.chapterNumber || ''}`} - Translation & Proofreading`;
    setInspectTaskData({
      title: defaultTitle,
      column: 'backlog',
      assignees: [],
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      priority: 'High',
      chapterId: chId
    });
    setShowCreateTaskModal(true);
  };

  useEffect(() => {
    let isMounted = true;
    const loadChapterPages = async () => {
      const cacheKey = `comiverse_chapter_pages_${chapter.id}`;

      // 0a. Instant cache load from sessionStorage (<3ms)
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
            setPages(parsed);
            setLoading(false);
            // Continue fetching in background to revalidate
          }
        }
      } catch (e) {}

      setLoading(prev => prev);

      const isSyntheticId = String(chapter.id || '').startsWith('ch-') || String(chapter.id || '').startsWith('task-');
      const uuidMatch = String(chapter.id || '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      const activeComicId = comicId || chapter.comicId || chapter.comic_id;
      let realChapterId = (!isSyntheticId && uuidMatch) ? uuidMatch[0] : null;

      let fetchedPages = [];

      // 0. Check inline pages / images on chapter object
      if (Array.isArray(chapter.pages) && chapter.pages.length > 0) {
        fetchedPages = chapter.pages;
      } else if (Array.isArray(chapter.images) && chapter.images.length > 0) {
        fetchedPages = chapter.images;
      }

      // 1+2. Parallel: Direct getChapterDetailApi + getAuthorChapterPreviewApi
      if (fetchedPages.length === 0 && realChapterId && realChapterId !== activeComicId) {
        const extractPages = (response) => {
          const data = response?.data?.data || response?.data || response;
          return data?.pages || data?.images || (Array.isArray(data) ? data : []);
        };

        const results = await Promise.allSettled([
          getChapterDetailApi(realChapterId),
          activeComicId ? getAuthorChapterPreviewApi(activeComicId, realChapterId) : Promise.reject('no comicId')
        ]);

        for (const r of results) {
          if (r.status === 'fulfilled') {
            const rawPages = extractPages(r.value);
            if (Array.isArray(rawPages) && rawPages.length > 0) {
              fetchedPages = rawPages;
              break;
            }
          }
        }
      }

      // 3. Parallel Chapter Discovery Pipeline by comicId
      if (fetchedPages.length === 0 && activeComicId) {
        let chapList = [];

        // 3a+3b. Parallel: getChaptersByComicIdApi + getAuthorComicChaptersApi
        const chapResults = await Promise.allSettled([
          getChaptersByComicIdApi(activeComicId, {}, true),
          getAuthorComicChaptersApi(activeComicId)
        ]);

        for (const r of chapResults) {
          if (r.status === 'fulfilled') {
            const list = Array.isArray(r.value) ? r.value : (r.value?.content || r.value?.data || []);
            if (list.length > 0) { chapList = list; break; }
          }
        }

        // 3c+3d. Parallel fallback: getComicByIdApi + getAuthorComicByIdApi
        if (chapList.length === 0 && fetchedPages.length === 0) {
          const comicResults = await Promise.allSettled([
            getComicByIdApi(activeComicId),
            getAuthorComicByIdApi(activeComicId)
          ]);

          for (const r of comicResults) {
            if (r.status === 'fulfilled') {
              const data = r.value?.data?.data || r.value?.data || r.value;
              if (data?.chapters && Array.isArray(data.chapters) && data.chapters.length > 0) {
                chapList = data.chapters; break;
              } else if (data?.pages || data?.images) {
                fetchedPages = data.pages || data.images; break;
              }
            }
          }
        }

        if (chapList.length > 0 && fetchedPages.length === 0) {
          const matchedChap = chapList.find(c =>
            (realChapterId && String(c.id) === String(realChapterId)) ||
            c.chapterNumber === chapter.number ||
            c.chapterNumber === chapter.chapterNumber
          ) || chapList[0];

          if (matchedChap) {
            if (Array.isArray(matchedChap.pages) && matchedChap.pages.length > 0) {
              fetchedPages = matchedChap.pages;
            } else if (Array.isArray(matchedChap.images) && matchedChap.images.length > 0) {
              fetchedPages = matchedChap.images;
            }

            // Parallel: detail + preview for matched chapter
            if (fetchedPages.length === 0 && matchedChap.id) {
              const detailResults = await Promise.allSettled([
                getChapterDetailApi(matchedChap.id),
                activeComicId ? getAuthorChapterPreviewApi(activeComicId, matchedChap.id) : Promise.reject('skip')
              ]);

              for (const r of detailResults) {
                if (r.status === 'fulfilled') {
                  const data = r.value?.data?.data || r.value?.data || r.value;
                  const pages = data?.pages || data?.images || (Array.isArray(data) ? data : []);
                  if (Array.isArray(pages) && pages.length > 0) { fetchedPages = pages; break; }
                }
              }
            }
          }
        }
      }

      // 4. Smart Comic Title Search Fallback (Find comic by title in DB)
      if (fetchedPages.length === 0) {
        const queryName = comicName || chapter.title || '';
        if (queryName) {
          try {
            let foundComic = null;
            try {
              const allRes = await getAllComicsApi();
              const list = Array.isArray(allRes) ? allRes : (allRes?.data || allRes?.content || []);
              const cleanQuery = queryName.toLowerCase().trim();
              foundComic = list.find(c =>
                c.title && (c.title.toLowerCase().includes(cleanQuery) || cleanQuery.includes(c.title.toLowerCase()))
              );
            } catch (e) { /* ignore */ }

            if (foundComic?.id) {
              try {
                const chapRes = await getChaptersByComicIdApi(foundComic.id, {}, true);
                const list = Array.isArray(chapRes) ? chapRes : (chapRes?.content || chapRes?.data || []);
                if (list.length > 0) {
                  const targetChap = list.find(c => c.chapterNumber === chapter.number || c.chapterNumber === chapter.chapterNumber) || list[0];
                  if (targetChap?.id) {
                    const detailRes = await getChapterDetailApi(targetChap.id);
                    const data = detailRes?.data?.data || detailRes?.data || detailRes;
                    const pages = data?.pages || data?.images || (Array.isArray(data) ? data : []);
                    if (Array.isArray(pages) && pages.length > 0) fetchedPages = pages;
                  }
                }
              } catch (e) { /* ignore */ }
            }
          } catch (e) { /* ignore */ }
        }
      }

      // Map fetched DB pages & resolve relative URLs against backend server
      if (fetchedPages.length > 0) {
        const mapped = fetchedPages
          .map((item, idx) => {
            const rawUrl = typeof item === 'string'
              ? item
              : (item?.imageUrl || item?.url || item?.pageUrl || item?.path || item?.src);

            const resolved = resolveImageUrl(rawUrl);
            if (!resolved) return null;

            return {
              id: item?.id || `p-${idx + 1}`,
              pageNumber: item?.pageNumber || idx + 1,
              imageUrl: resolved
            };
          })
          .filter(Boolean);

        if (mapped.length > 0 && isMounted) {
          setPages(mapped);
          setLoading(false);
          // Cache to sessionStorage for instant future opens
          try { sessionStorage.setItem(cacheKey, JSON.stringify(mapped)); } catch (e) {}
          return;
        }
      }

      if (isMounted) {
        setPages([]);
        setLoading(false);
      }
    };

    loadChapterPages();
    return () => { isMounted = false; };
  }, [chapter]);

  // Keyboard navigation for Reader mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (viewMode === 'reader') {
          setViewMode('grid');
        } else {
          onClose();
        }
      } else if (viewMode === 'reader') {
        if (e.key === 'ArrowRight') {
          setActivePageIndex(prev => Math.min(pages.length - 1, prev + 1));
        } else if (e.key === 'ArrowLeft') {
          setActivePageIndex(prev => Math.max(0, prev - 1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, pages.length, onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const currentPage = pages[activePageIndex] || null;

  const isLightTheme = document.documentElement.classList.contains('light');

  return createPortal(
    <div className={`mod-inspector-overlay ${isLightTheme ? 'light-theme' : ''}`} style={{ overflow: 'hidden', height: '100vh', width: '100vw' }}>
      <header className="mod-inspector-topbar" style={{ height: 'auto', minHeight: '60px', padding: '10px 20px', flexWrap: 'wrap', gap: '12px' }}>
        <div className="mod-inspector-title-group" style={{ flex: '1 1 auto', minWidth: 0, flexWrap: 'wrap', gap: '12px' }}>
          <button
            type="button"
            className="mod-mode-tab"
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }}
          >
            ← Back to Board
          </button>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.15)', flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ fontSize: '11px', color: '#c084fc', background: 'rgba(168,85,247,0.18)', padding: '3px 10px', borderRadius: '6px', fontWeight: '700', border: '1px solid rgba(168,85,247,0.3)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {comicName || 'Comic Project'}
              </span>
              <h3 className="mod-inspector-title" style={{ fontSize: '16px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '360px' }} title={chapter.title}>
                📖 {chapter.title}
              </h3>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '11.5px', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Total {pages.length} Pages • Raw Manuscript Inspector Workspace
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
          {onCreateTask && (
            <button
              type="button"
              className="mod-mode-tab active"
              onClick={handleOpenCreateTask}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '36px',
                padding: '0 16px',
                fontSize: '12.5px',
                fontWeight: '700',
                borderRadius: '8px',
                background: 'linear-gradient(110deg, #a855f7 0%, #ec4899 55%, #f97316 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 4px 16px rgba(168,85,247,0.4)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <Plus size={15} /> Create Task
            </button>
          )}

          <div className="mod-inspector-mode-tabs" style={{ flexShrink: 0 }}>
            <button
              type="button"
              className={`mod-mode-tab ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Grid Mode
            </button>
            <button
              type="button"
              className={`mod-mode-tab ${viewMode === 'reader' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('reader');
                if (activePageIndex === undefined) setActivePageIndex(0);
              }}
            >
              <BookOpen size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Reader Mode
            </button>
            <button
              type="button"
              className={`mod-mode-tab ${viewMode === 'scroll' ? 'active' : ''}`}
              onClick={() => setViewMode('scroll')}
            >
              <Eye size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Webtoon Scroll
            </button>
          </div>

          <button className="mod-inspector-close-btn" onClick={onClose} title="Close Inspector" style={{ flexShrink: 0 }}>×</button>
        </div>
      </header>

      {/* Moderator Content Body - Full Width & Height Flex Column */}
      <div className="mod-inspector-body" style={{ flex: 1, width: '100%', minWidth: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', position: 'relative' }}>
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', padding: viewMode === 'reader' ? '12px 24px' : '24px 32px' }}>
          {loading ? (
            <div style={{ padding: '100px 0', textAlign: 'center', color: '#c084fc' }}>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>⏳ Loading Chapter Pages from Database...</div>
            </div>
          ) : pages.length === 0 ? (
            <div style={{ padding: '120px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <h4 style={{ margin: '0 0 8px', fontSize: '18px', color: '#e2e8f0', fontWeight: '700' }}>
                No Real Database Chapter Images Found
              </h4>
              <p style={{ margin: '0 auto', fontSize: '13px', color: '#64748b', maxWidth: '480px', lineHeight: '1.6' }}>
                This chapter does not have uploaded page images in the database yet. Fake local data has been completely disabled.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* ── GRID MODE OVERVIEW ────────────────────────── */
            <div style={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '24px',
              padding: '12px 4px 32px'
            }}>
              {pages.map((page, pIdx) => (
                <div
                  key={page.id || pIdx}
                  className="chapter-page-card"
                  onClick={() => {
                    setActivePageIndex(pIdx);
                    setViewMode('reader');
                  }}
                  style={{
                    borderRadius: '16px',
                    border: isLightTheme ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                    background: isLightTheme ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
                    boxShadow: isLightTheme ? '0 4px 18px rgba(0,0,0,0.06)' : '0 8px 24px rgba(0,0,0,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative'
                  }}
                >
                  <div style={{
                    width: '100%',
                    height: '280px',
                    overflow: 'hidden',
                    background: isLightTheme ? '#f1f5f9' : '#05030a',
                    position: 'relative'
                  }}>
                    <img
                      src={page.imageUrl}
                      alt={`Page ${pIdx + 1}`}
                      loading={pIdx > 3 ? 'lazy' : 'eager'}
                      decoding="async"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        padding: '8px',
                        transition: 'transform 0.3s ease'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'rgba(15, 10, 26, 0.85)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                    }}>
                      Page #{pIdx + 1}
                    </div>
                  </div>

                  <div style={{
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    background: isLightTheme ? '#f8fafc' : 'rgba(0, 0, 0, 0.25)',
                    borderTop: isLightTheme ? '1px solid #f1f5f9' : '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <span style={{ fontSize: '12px', color: isLightTheme ? '#475569' : '#94a3b8', fontWeight: '600' }}>
                      Page {pIdx + 1} of {pages.length}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: '#a855f7',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontWeight: '700'
                    }}>
                      <Eye size={14} /> Inspect
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'scroll' ? (
            /* ── WEBTOON CONTINUOUS SCROLL MODE ───────────────────── */
            <div style={{
              width: '100%',
              maxWidth: '860px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 0 40px'
            }}>
              {pages.map((p, idx) => (
                <div key={p.id || idx} style={{ width: '100%', position: 'relative' }}>
                  <img
                    src={p.imageUrl}
                    alt={`Page ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      borderRadius: '12px',
                      boxShadow: isLightTheme ? '0 8px 24px rgba(0,0,0,0.1)' : '0 12px 36px rgba(0,0,0,0.6)'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'rgba(15, 10, 26, 0.85)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}>
                    Page {idx + 1} / {pages.length}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── SINGLE PAGE READER MODE ───────────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
              {/* Reader Controls Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                background: isLightTheme ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                padding: '10px 20px',
                borderRadius: '14px',
                border: isLightTheme ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isLightTheme ? '0 2px 10px rgba(0,0,0,0.03)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    className="mod-mode-tab"
                    disabled={activePageIndex === 0}
                    onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: activePageIndex === 0 ? 0.4 : 1,
                      cursor: activePageIndex === 0 ? 'not-allowed' : 'pointer',
                      background: 'rgba(168,85,247,0.12)',
                      color: '#a855f7'
                    }}
                  >
                    <ChevronLeft size={16} /> Prev Page
                  </button>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: isLightTheme ? '#0f172a' : '#c084fc',
                    minWidth: '120px',
                    textAlign: 'center'
                  }}>
                    Page {activePageIndex + 1} of {pages.length}
                  </span>
                  <button
                    type="button"
                    className="mod-mode-tab"
                    disabled={activePageIndex === pages.length - 1}
                    onClick={() => setActivePageIndex(prev => Math.min(pages.length - 1, prev + 1))}
                    style={{
                      padding: '6px 14px',
                      fontSize: '12.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: activePageIndex === pages.length - 1 ? 0.4 : 1,
                      cursor: activePageIndex === pages.length - 1 ? 'not-allowed' : 'pointer',
                      background: 'rgba(168,85,247,0.12)',
                      color: '#a855f7'
                    }}
                  >
                    Next Page <ChevronRight size={16} />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className="mod-mode-tab"
                    onClick={() => setZoomScale(prev => Math.max(0.6, prev - 0.15))}
                    style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.08)' }}
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span style={{ fontSize: '13px', color: isLightTheme ? '#334155' : '#94a3b8', minWidth: '50px', textAlign: 'center', fontWeight: '700' }}>
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    type="button"
                    className="mod-mode-tab"
                    onClick={() => setZoomScale(prev => Math.min(2.0, prev + 0.15))}
                    style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.08)' }}
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    type="button"
                    className="mod-mode-tab"
                    onClick={() => setZoomScale(1)}
                    style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.08)' }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Single Page Canvas Display */}
              <div style={{
                width: '100%',
                display: 'flex',
                justify: 'center',
                alignItems: 'center',
                background: isLightTheme ? '#f1f5f9' : '#020106',
                borderRadius: '16px',
                padding: '20px',
                border: isLightTheme ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)',
                maxHeight: 'calc(100vh - 270px)',
                minHeight: '360px',
                overflow: 'auto'
              }}>
                {currentPage ? (
                  <img
                    src={currentPage.imageUrl}
                    alt={`Page ${activePageIndex + 1}`}
                    style={{
                      maxHeight: `${620 * zoomScale}px`,
                      maxWidth: '100%',
                      margin: '0 auto',
                      objectFit: 'contain',
                      borderRadius: '10px',
                      boxShadow: isLightTheme ? '0 10px 28px rgba(0,0,0,0.12)' : '0 14px 40px rgba(0,0,0,0.85)',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '13px' }}>Page unavailable</div>
                )}
              </div>

              {/* Bottom Thumbnail Strip */}
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '6px 4px 12px', width: '100%' }}>
                {pages.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    onClick={() => setActivePageIndex(idx)}
                    style={{
                      width: '56px',
                      height: '74px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      cursor: 'pointer',
                      border: idx === activePageIndex ? '2px solid #a855f7' : isLightTheme ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.12)',
                      opacity: idx === activePageIndex ? 1 : 0.65,
                      boxShadow: idx === activePageIndex ? '0 0 12px rgba(168,85,247,0.4)' : 'none',
                      transition: 'all 0.2s ease',
                      background: isLightTheme ? '#fff' : '#05030a'
                    }}
                  >
                    <img src={p.imageUrl} alt={`Thumb ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateTaskModal && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 100001 }}>
          <CreateTaskModal
            comicName={comicName}
            newTaskData={inspectTaskData}
            setNewTaskData={setInspectTaskData}
            chapterOptions={chapterOptions && chapterOptions.length > 0 ? chapterOptions : [chapter]}
            teamMembersForAssign={teamMembersForAssign}
            onCancel={() => setShowCreateTaskModal(false)}
            onCreate={async () => {
              setShowCreateTaskModal(false);
              if (onCreateTask) {
                await onCreateTask(inspectTaskData);
              }
            }}
          />
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
}

function AssigneeChipPicker({ candidates, selectedIds, onToggle, emptyLabel, readOnly = false }) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return <p style={{ fontSize: '12px', color: 'var(--trans-text-muted)', margin: 0 }}>{emptyLabel || 'No assignees available'}</p>
  }
  return (
    <div className="trans-assignees-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '4px 0' }}>
      {candidates.map((m) => {
        const memberId = m.id || m.userId;
        const isSelected = (selectedIds || []).includes(memberId);
        const displayName = m.fullName || m.name || m.username || 'User';
        const initial = (m.avatar && m.avatar.length <= 3 ? m.avatar : displayName.charAt(0)).toUpperCase();
        const roleLabel = m.role || (m.isLeader ? 'Leader' : 'Member');

        return (
          <button
            key={memberId}
            type="button"
            className={`trans-assignee-chip${isSelected ? ' selected' : ''}`}
            onClick={() => !readOnly && onToggle && onToggle(memberId, isSelected)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px 6px 6px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: readOnly ? 'default' : 'pointer',
              border: isSelected
                ? '1.5px solid #a855f7'
                : '1px solid rgba(255, 255, 255, 0.12)',
              background: isSelected
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.22) 0%, rgba(236, 72, 153, 0.18) 100%)'
                : 'rgba(255, 255, 255, 0.05)',
              color: isSelected ? '#e9d5ff' : 'var(--trans-text-secondary)',
              boxShadow: isSelected
                ? '0 4px 14px rgba(168, 85, 247, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)'
                : '0 2px 4px rgba(0,0,0,0.05)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: isSelected
                  ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
                  : (m.color || 'rgba(255,255,255,0.15)'),
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                boxShadow: isSelected ? '0 0 8px rgba(168, 85, 247, 0.5)' : 'none',
                flexShrink: 0
              }}
            >
              {initial}
            </span>

            <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{displayName}</span>
              {roleLabel && (
                <span style={{ fontSize: '10px', color: isSelected ? '#c084fc' : 'var(--trans-text-muted)', fontWeight: 500 }}>
                  {roleLabel}
                </span>
              )}
            </span>

            {isSelected && (
              <Check size={14} style={{ color: '#c084fc', strokeWidth: 2.5, marginLeft: '2px' }} />
            )}
          </button>
        );
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
              onChange={(e) => {
                const chId = e.target.value || null;
                const foundCh = chapterOptions.find(c => String(c.id) === String(chId));
                setNewTaskData(prev => ({
                  ...prev,
                  chapterId: chId,
                  title: (!prev.title.trim() && foundCh) ? `${foundCh.title} - Translation & Proofreading` : prev.title
                }));
              }}
              disabled={chapterOptions.length === 0}
              style={{ ...errorBorder('chapterId') }}
            >
              <option value="">
                {chapterOptions.length === 0 ? 'No chapters found for this project' : 'Select a chapter…'}
              </option>
              {chapterOptions.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  📖 {ch.title}{ch.pagesCount > 0 ? ` (${ch.pagesCount} pages)` : ''}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="trans-form-label" style={{ margin: 0 }}>
                Due Date *
              </label>
            </div>

            <CustomDatePicker
              value={newTaskData.dueDate}
              onChange={(val) => setNewTaskData({ ...newTaskData, dueDate: val })}
              placeholder="Select due date"
              style={errorBorder('dueDate')}
            />

            {showError('dueDate') && (
              <p style={{ color: '#ef4444', fontSize: '11px', margin: '4px 0 0' }}>This field is required</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {[
              { label: '+1 Day', days: 1 },
              { label: '+3 Days', days: 3 },
              { label: '+1 Week', days: 7 },
              { label: '+2 Weeks', days: 14 }
            ].map((opt) => {
              const targetDate = new Date();
              targetDate.setDate(targetDate.getDate() + opt.days);
              const targetStr = targetDate.toISOString().split('T')[0];
              const isActive = newTaskData.dueDate === targetStr;

              return (
                <button
                  key={opt.label}
                  type="button"
                  className="trans-btn secondary"
                  style={{
                    fontSize: '11px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    background: isActive ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' : 'rgba(255,255,255,0.06)',
                    color: '#fff',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    fontWeight: isActive ? '700' : '500',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => setQuickDueDate(opt.days)}
                >
                  {opt.label}
                </button>
              );
            })}
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


export function EditTaskModal({ editTaskData, setEditTaskData, teamMembersForAssign, isProjectLeader, onCancel, onSave, onContinue, onReview }) {
  const [submitted, setSubmitted] = useState(false)

  const auth = getAuth();
  const currentUserName = (auth?.user?.fullName || auth?.user?.username || '').toLowerCase().trim();
  const currentUserId = auth?.user?.id || auth?.user?.userId;

  const isAssigned = (editTaskData.assignees || []).some(id => {
    if (currentUserId && String(id) === String(currentUserId)) return true;
    if (typeof id === 'string' && id.toLowerCase().trim() === currentUserName) return true;
    const matchedMem = (teamMembersForAssign || []).find(m => String(m.id || m.userId) === String(id));
    if (matchedMem) {
      const memName = (matchedMem.fullName || matchedMem.name || matchedMem.username || '').toLowerCase().trim();
      if (memName === currentUserName) return true;
    }
    return false;
  });

  const canAccessWorkspace = isProjectLeader || isAssigned;

  const errors = {
    title: !editTaskData.title.trim(),
    assignees: (editTaskData.assignees || []).length === 0,
    dueDate: !editTaskData.dueDate
  }
  const showError = (field) => submitted && errors[field]
  const errorBorder = (field) => showError(field) ? { borderColor: '#ef4444' } : undefined

  const isUnderReview = editTaskData.status === 'under_review'
  const canReview = isProjectLeader && isUnderReview
  const isInProgress = editTaskData.status === 'in_progress'

  const toggleAssignee = (memberId, isSelected) => {
    if (!isProjectLeader) return;
    setEditTaskData({
      ...editTaskData,
      assignees: isSelected
        ? editTaskData.assignees.filter(a => a !== memberId)
        : [...(editTaskData.assignees || []), memberId]
    })
  }

  const handleSaveClick = () => {
    if (!isProjectLeader) return;
    setSubmitted(true)
    if (Object.values(errors).some(Boolean)) return
    if (onSave) onSave()
  }

  const handleOpenWorkspaceClick = () => {
    if (!canAccessWorkspace) return;
    if (onContinue) onContinue()
  }

  const handleReviewClick = () => {
    if (!canReview) return
    setSubmitted(true)
    if (Object.values(errors).some(Boolean)) return
    if (onSave) onSave()
    onReview()
  }

  return (
    <div className="trans-modal-overlay">
      <div className="trans-modal-card">
        <div className="trans-modal-header">
          <h3>{isProjectLeader ? 'Edit Task Details' : 'Task Information'}</h3>
          <button className="trans-modal-close-btn" onClick={onCancel}>×</button>
        </div>
        <div className="trans-modal-body">
          {isProjectLeader ? (
            /* ── FULL EDITING FORM FOR GROUP LEADER ───────────── */
            <>
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
                  value={getNormalizedStatusKey(editTaskData.status)}
                  onChange={(e) => setEditTaskData({ ...editTaskData, status: e.target.value })}
                >
                  {getAllowedStatusOptions(editTaskData.status).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
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
                <div style={showError('assignees') ? { border: '1px solid #ef4444', borderRadius: '12px', padding: '8px' } : undefined}>
                  <AssigneeChipPicker
                    candidates={teamMembersForAssign}
                    selectedIds={editTaskData.assignees}
                    onToggle={toggleAssignee}
                    emptyLabel="No team members found for this project."
                  />
                </div>
                {showError('assignees') && (
                  <p style={{ color: '#ef4444', fontSize: '11px', margin: '4px 0 0' }}>At least one assignee is required</p>
                )}
              </div>

              <div className="trans-form-group">
                <label className="trans-form-label">Due Date *</label>
                <input
                  type="date"
                  className="trans-form-input"
                  style={errorBorder('dueDate')}
                  value={editTaskData.dueDate}
                  onChange={(e) => setEditTaskData({ ...editTaskData, dueDate: e.target.value })}
                />
                {showError('dueDate') && (
                  <p style={{ color: '#ef4444', fontSize: '11px', margin: '4px 0 0' }}>Due date is required</p>
                )}
              </div>
            </>
          ) : (
            /* ── CLEAN READ-ONLY INFORMATION VIEW FOR MEMBERS ──── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="trans-form-group">
                <label className="trans-form-label" style={{ color: 'var(--trans-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comic Project</label>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--trans-text-primary)' }}>
                  {editTaskData.comic || 'Unknown Project'}
                </div>
              </div>

              <div className="trans-form-group">
                <label className="trans-form-label" style={{ color: 'var(--trans-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Task Name</label>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--trans-text-primary)', lineHeight: '1.4' }}>
                  {editTaskData.title}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="trans-form-group">
                  <label className="trans-form-label" style={{ color: 'var(--trans-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
                  <div>
                    <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {editTaskData.status === 'in_progress' ? '🟠 In Progress' : editTaskData.status === 'under_review' ? '🟣 Under Review' : editTaskData.status === 'completed' ? '🟢 Completed' : '⚪ Backlog'}
                    </span>
                  </div>
                </div>

                <div className="trans-form-group">
                  <label className="trans-form-label" style={{ color: 'var(--trans-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Priority</label>
                  <div>
                    <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {editTaskData.priority === 'Urgent' ? '🚨 Urgent' : editTaskData.priority === 'High' ? '🟠 High' : editTaskData.priority === 'Medium' ? '🟣 Medium' : '⚪ Low'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="trans-form-group">
                <label className="trans-form-label" style={{ color: 'var(--trans-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Members</label>
                <AssigneeChipPicker
                  candidates={teamMembersForAssign}
                  selectedIds={editTaskData.assignees}
                  readOnly={true}
                  emptyLabel="No assigned members."
                />
              </div>

              <div className="trans-form-group">
                <label className="trans-form-label" style={{ color: 'var(--trans-text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Due Date</label>
                <div style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--trans-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📅 {editTaskData.dueDate ? editTaskData.dueDate : 'No due date'}
                </div>
              </div>

              {!canAccessWorkspace && (
                <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔒 <strong>Restricted Access:</strong> You are not assigned to this task. Only assigned members and Group Leaders can access this translation workspace.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="trans-modal-footer">
          <button className="trans-btn secondary" onClick={onCancel}>
            {isProjectLeader ? 'Cancel' : 'Close'}
          </button>

          {/* Review: Project-Leader-only */}
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

          {/* Open Workspace — ONLY IF ASSIGNED OR PROJECT LEADER */}
          {canAccessWorkspace && !isUnderReview && (
            <button className="trans-btn primary" onClick={handleOpenWorkspaceClick} title="Open translate workspace">
              <StepForward />Open Workspace
            </button>
          )}

          {/* Save — ONLY FOR PROJECT LEADER */}
          {isProjectLeader && (
            <button className="trans-btn primary" onClick={handleSaveClick}>
              <Check size={16} />Save
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TasksTab