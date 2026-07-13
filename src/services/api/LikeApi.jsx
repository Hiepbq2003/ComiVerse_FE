import AxiosClient from './AxiosClient';

export const checkLikeStatusApi = (comicId) => {
  return AxiosClient.get(`/likes/check/${comicId}`);
};

export const toggleLikeStatusApi = (comicId) => {
  return AxiosClient.post(`/likes/toggle/${comicId}`, {});
};
