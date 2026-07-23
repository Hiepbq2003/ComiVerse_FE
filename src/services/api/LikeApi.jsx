import AxiosClient from './AxiosClient';

export const checkLikeStatusApi = (comicId, config = {}) => {
  return AxiosClient.get(`/likes/check/${comicId}`, config);
};

export const toggleLikeStatusApi = (comicId) => {
  return AxiosClient.post(`/likes/toggle/${comicId}`, {});
};

export const getMyLikesApi = () => {
  return AxiosClient.get('/likes/my-likes');
};
