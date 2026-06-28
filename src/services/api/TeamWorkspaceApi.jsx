import AxiosClient from './AxiosClient'

export const getTeamAnnouncementsApi = async (teamId) => {
  const response = await AxiosClient.get(`/team-workspace/${teamId}/announcements`)
  return response.data
}

export const createTeamAnnouncementApi = async (teamId, announcement) => {
  const response = await AxiosClient.post(`/team-workspace/${teamId}/announcements`, announcement)
  return response.data
}

export const likeTeamAnnouncementApi = async (id) => {
  const response = await AxiosClient.put(`/team-workspace/announcements/${id}/like`)
  return response.data
}

export const getTeamMessagesApi = async (teamId) => {
  const response = await AxiosClient.get(`/team-workspace/${teamId}/messages`)
  return response.data
}

export const createTeamMessageApi = async (teamId, message) => {
  const response = await AxiosClient.post(`/team-workspace/${teamId}/messages`, message)
  return response.data
}

export const getTeamTasksApi = async (teamId) => {
  const response = await AxiosClient.get(`/team-workspace/${teamId}/tasks`)
  return response.data
}

export const createTeamTaskApi = async (teamId, task) => {
  const response = await AxiosClient.post(`/team-workspace/${teamId}/tasks`, task)
  return response.data
}

export const updateTeamTaskApi = async (id, updates) => {
  const response = await AxiosClient.put(`/team-workspace/tasks/${id}`, updates)
  return response.data
}

export const getTeamRequestsApi = async (teamId) => {
  const response = await AxiosClient.get(`/team-workspace/${teamId}/requests`)
  return response.data
}

export const deleteTeamRequestApi = async (id) => {
  const response = await AxiosClient.delete(`/team-workspace/requests/${id}`)
  return response.data
}
