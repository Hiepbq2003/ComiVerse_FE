import AxiosClient from './AxiosClient';

export const getPremiumPlansApi = () => {
  return AxiosClient.get('/plans');
};

export const upgradePlanApi = (planType) => {
  return AxiosClient.post('/plans/upgrade', { planType });
};

export const getAdminPremiumPlanSettingsApi = () => {
  return AxiosClient.get('/admin/settings/premium-plans');
};

export const updateAdminPremiumPlanSettingsApi = (data) => {
  return AxiosClient.put('/admin/settings/premium-plans', data);
};
