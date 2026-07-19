import AxiosClient from './AxiosClient';

export const checkSaveStatusApi = (comicId, config = {}) => {
  return AxiosClient.get(`/saves/check/${comicId}`, config);
};

export const toggleSaveStatusApi = (comicId) => {
  return AxiosClient.post(`/saves/toggle/${comicId}`, {});
};

export const getMySavesApi = () => {
  return AxiosClient.get('/saves/my-saves');
};
