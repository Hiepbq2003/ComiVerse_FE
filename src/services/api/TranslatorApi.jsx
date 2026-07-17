import AxiosClient from './AxiosClient';

export const registerTranslatorApi = (data) => {
  return AxiosClient.post('/translator-registration', data);
};

export const getMyTranslatorProfileApi = () => {
  return AxiosClient.get('/translator/profile');
};