import AxiosClient from './AxiosClient'

export const getAdminStatisticsApi = () => AxiosClient.get('/admin/statistics')
