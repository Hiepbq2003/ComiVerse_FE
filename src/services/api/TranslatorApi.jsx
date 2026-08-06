import AxiosClient from './AxiosClient';

export const registerTranslatorApi = (data) => {
  return AxiosClient.post('/translator-registration', data);
};

export const getMyTranslatorProfileApi = () => {
  return AxiosClient.get('/translator-registration/profile');
};

export const updateMyTranslatorProfileApi = (data) => {
  return AxiosClient.put('/translator-registration/profile', data);
};