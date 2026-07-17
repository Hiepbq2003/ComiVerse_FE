import AxiosClient from './AxiosClient';

export const checkSaveStatusApi = (comicId) => {
  return AxiosClient.get(`/saves/check/${comicId}`);
};

export const toggleSaveStatusApi = (comicId) => {
  return AxiosClient.post(`/saves/toggle/${comicId}`, {});
};

export const getMySavesApi = () => {
  return AxiosClient.get('/saves/my-saves');
};
