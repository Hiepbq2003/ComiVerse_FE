import AxiosClient from './AxiosClient'

export const getAllAuditLogsApi = () => {
  return AxiosClient.get('/audit-logs/all')
}
