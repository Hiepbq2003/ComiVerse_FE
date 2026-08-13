import AxiosClient from './AxiosClient';

export const getPremiumPlansApi = () => {
  return AxiosClient.get('/plans');
};

export const upgradePlanApi = (planType) => {
  return AxiosClient.post('/plans/upgrade', { planType });
};

