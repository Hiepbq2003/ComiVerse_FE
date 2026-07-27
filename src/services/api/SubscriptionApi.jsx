import AxiosClient from './AxiosClient'

export const getSubscriptionPlansApi = () => AxiosClient.get('/subscriptions/plans')

export const getMySubscriptionApi = () => AxiosClient.get('/subscriptions/me')

export const createCheckoutSessionApi = (planId) => (
  AxiosClient.post('/subscriptions/checkout', { planId })
)

export const getCheckoutStatusApi = (sessionId) => (
  AxiosClient.get(`/subscriptions/checkout/${encodeURIComponent(sessionId)}`)
)

export const createBillingPortalApi = () => AxiosClient.post('/subscriptions/portal')

export const getAdminSubscriptionPlansApi = () => AxiosClient.get('/admin/subscriptions/plans')

export const createAdminSubscriptionPlanApi = (data) => (
  AxiosClient.post('/admin/subscriptions/plans', data)
)

export const updateAdminSubscriptionPlanApi = (planId, data) => (
  AxiosClient.put(`/admin/subscriptions/plans/${planId}`, data)
)

export const updateAdminSubscriptionPlanStatusApi = (planId, active) => (
  AxiosClient.patch(`/admin/subscriptions/plans/${planId}/status`, { active })
)

export const getAdminPaymentLogsApi = (params = {}) => (
  AxiosClient.get('/admin/subscriptions/payments', { params })
)
