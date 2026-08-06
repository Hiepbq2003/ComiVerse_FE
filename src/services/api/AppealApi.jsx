import AxiosClient from './AxiosClient'

export const createAppealApi = (data) => {
  return AxiosClient.post('/appeals', data)
}

export const getMyAppealsApi = (page = 0, size = 10) => {
  return AxiosClient.get('/appeals/my-appeals', { params: { page, size } })
}

export const getPendingAppealsQueueApi = (page = 0, size = 20) => {
  return AxiosClient.get('/appeals/queue', { params: { page, size } })
}

export const resolveAppealApi = (id, data) => {
  return AxiosClient.put(`/appeals/${id}/resolve`, data)
}

export const getPendingAppealByTargetApi = (targetId) => {
  return AxiosClient.get(`/appeals/target/${targetId}`)
}
