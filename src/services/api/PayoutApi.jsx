import AxiosClient from './AxiosClient'

export const getCreatorPayoutOverviewApi = (month) => (
  AxiosClient.get('/creator/payouts/overview', { params: month ? { month } : {} })
)

export const linkCreatorPayoutAccountApi = (stripeConnectedAccountId) => (
  AxiosClient.put('/creator/payouts/account', { stripeConnectedAccountId })
)

export const createCreatorPayoutRequestApi = (payoutMonth, note = '') => (
  AxiosClient.post('/creator/payouts/requests', { payoutMonth, note })
)

export const getAdminPayoutsApi = ({ status, page = 0, size = 20 } = {}) => (
  AxiosClient.get('/admin/payouts', {
    params: { ...(status ? { status } : {}), page, size },
  })
)

export const approveAdminPayoutApi = (payoutId, note = '') => (
  AxiosClient.post(`/admin/payouts/${payoutId}/approve`, null, {
    params: note ? { note } : {},
  })
)

export const rejectAdminPayoutApi = (payoutId, reason) => (
  AxiosClient.post(`/admin/payouts/${payoutId}/reject`, { reason })
)

export const payAdminPayoutApi = (payoutId) => (
  AxiosClient.post(`/admin/payouts/${payoutId}/pay`)
)
