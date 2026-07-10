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

export const getTeamMessagesApi = async (teamId) => {
  return AxiosClient.get(`/team-workspace/${teamId}/messages`)
}

export const createTeamMessageApi = async (teamId, message) => {
  return AxiosClient.post(`/team-workspace/${teamId}/messages`, message)
}

export const getTeamTasksApi = async (teamId) => {
  return AxiosClient.get(`/team-workspace/${teamId}/tasks`)
}

export const createTeamTaskApi = async (teamId, task) => {
  return AxiosClient.post(`/team-workspace/${teamId}/tasks`, task)
}

export const updateTeamTaskApi = async (id, updates) => {
  return AxiosClient.put(`/team-workspace/tasks/${id}`, updates)
}

export const getTeamRequestsApi = async (teamId) => {
  return AxiosClient.get(`/team-workspace/${teamId}/requests`)
}

export const deleteTeamRequestApi = async (id) => {
  return AxiosClient.delete(`/team-workspace/requests/${id}`)
}

export const getChapterBacklogApi = async (teamId) => {
  return AxiosClient.get(`/team-workspace/${teamId}/chapter-backlog`)
}
