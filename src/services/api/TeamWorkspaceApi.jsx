import AxiosClient from './AxiosClient'

export const getTeamAnnouncementsApi = async (teamId) => {
  return AxiosClient.get(`/team-workspace/${teamId}/announcements`)
}

export const createTeamAnnouncementApi = async (teamId, announcement) => {
  return AxiosClient.post(`/team-workspace/${teamId}/announcements`, announcement)
}

export const likeTeamAnnouncementApi = async (id) => {
  return AxiosClient.put(`/team-workspace/announcements/${id}/like`)
}

export const pinTeamAnnouncementApi = async (id) => {
  return AxiosClient.put(`/team-workspace/announcements/${id}/pin`)
}

export const getTeamPostCommentsApi = async (announcementId) => {
  return AxiosClient.get(`/team-workspace/announcements/${announcementId}/comments`)
}

export const createTeamPostCommentApi = async (announcementId, comment) => {
  return AxiosClient.post(`/team-workspace/announcements/${announcementId}/comments`, comment)
}

export const likeTeamPostCommentApi = async (id) => {
  return AxiosClient.put(`/team-workspace/comments/${id}/like`)
}

export const getTeamMessagesApi = async (teamId) => {
  return AxiosClient.get(`/team-workspace/${teamId}/messages`)
}

export const createTeamMessageApi = async (teamId, message) => {
  return AxiosClient.post(`/team-workspace/${teamId}/messages`, message)
}

export const getTeamTasksApi = async (teamId) => {
  return AxiosClient.get(`/team-workspace/${teamId}/tasks`)
}

export const getTeamMembersApi = async (teamId) => {
  return AxiosClient.get(`/team-workspace/${teamId}/members`)
}

export const getTeamChaptersApi = async (teamId) => {
  return AxiosClient.get(`/team-workspace/${teamId}/chapters`)
}

const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

export const createTeamTaskApi = async (teamId, task) => {
  if (!isUuid(teamId)) {
    return null
  }

  const rawChapterId = task?.chapterId

  // Synthetic chapter IDs generated on FE start with 'ch-' (e.g. 'ch-{teamId}-1').
  // Since synthetic chapters do not exist in the Spring Boot 'chapters' database table,
  // sending them to Backend will cause 400 'Chapter not found'. Return null to safely fall back to local task creation.
  if (typeof rawChapterId === 'string' && rawChapterId.startsWith('ch-')) {
    console.log('[TeamWorkspaceApi] Synthetic chapter detected, falling back to local task storage.')
    return null
  }

  // Real Chapter UUID validation
  const chapterId = isUuid(rawChapterId) ? rawChapterId : null
  if (!chapterId) {
    console.warn('[TeamWorkspaceApi] No valid real Chapter UUID, falling back to local task storage.')
    return null
  }

  const validAssigneeIds = Array.isArray(task?.assigneeIds) ? task.assigneeIds.filter(isUuid) : []

  const sanitizedTask = {
    title: task.title,
    status: task.status || 'backlog',
    dueDate: task.dueDate || new Date().toISOString().split('T')[0],
    chapterId: chapterId,
    ...(validAssigneeIds.length > 0 ? { assigneeIds: validAssigneeIds } : {})
  }

  try {
    return await AxiosClient.post(`/team-workspace/${teamId}/tasks`, sanitizedTask)
  } catch (err) {
    console.warn(`[TeamWorkspaceApi] createTeamTaskApi notice for team ${teamId}:`, err?.response?.data?.message || err?.message || err)
    return null
  }
}

export const updateTeamTaskApi = async (id, updates) => {
  const isUuid = typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4,5}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  if (!isUuid) {
    return { success: true, message: 'Local task updated' }
  }
  return AxiosClient.put(`/team-workspace/tasks/${id}`, updates)
}

export const getTeamRequestsApi = async (teamId) => {
  return AxiosClient.get(`/team-workspace/${teamId}/requests`)
}

export const deleteTeamRequestApi = async (id) => {
  return AxiosClient.delete(`/team-workspace/requests/${id}`)
}

export const decideTeamRequestApi = async (id, decision) => {
  return AxiosClient.put(`/team-workspace/requests/${id}/decision`, { decision })
}

export const createTeamRequestApi = async (teamId, request) => {
  return AxiosClient.post(`/team-workspace/${teamId}/requests`, request)
}

export const getRequestsByNameApi = async (name) => {
  return AxiosClient.get('/team-workspace/requests/by-name', { params: { name } })
}
