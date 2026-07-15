import AxiosClient from './AxiosClient'

export const getAllAuditLogsApi = () => {
  return AxiosClient.get('/audit-logs/all')
}

export const getAuditLogsApi = (page = 0, size = 15) => {
  return AxiosClient.get('/audit-logs', { params: { page, size } })
}
