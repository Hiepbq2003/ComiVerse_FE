import AxiosClient from './AxiosClient'

export const getCreatorPayoutOverviewApi = (month) => (
  AxiosClient.get('/creator/payouts/overview', { params: month ? { month } : {} })
)

export const getCreatorPayoutAccountApi = () => (
  AxiosClient.get('/creator/payouts/account')
)

export const startCreatorPayoutOnboardingApi = (countryCode) => (
  AxiosClient.post('/creator/payouts/account/onboarding', {
    ...(countryCode ? { countryCode } : {}),
  })
)

export const syncCreatorPayoutAccountApi = () => (
  AxiosClient.post('/creator/payouts/account/sync')
)

export const createCreatorPayoutRequestApi = (
  payoutMonth,
  requestedAmount,
  note = '',
) => (
  AxiosClient.post('/creator/payouts/requests', {
    payoutMonth,
    requestedAmount,
    note,
  })
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

export const getAdminPayoutSettingsApi = () => (
  AxiosClient.get('/admin/payouts/settings')
)

export const updateAdminPayoutSettingsApi = (payload) => (
  AxiosClient.put('/admin/payouts/settings', payload)
)

export const upsertAdminPayoutCurrencyApi = (payload) => (
  AxiosClient.put('/admin/payouts/settings/currencies', payload)
)
