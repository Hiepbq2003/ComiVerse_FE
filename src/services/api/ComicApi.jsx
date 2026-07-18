import AxiosClient from './AxiosClient';

export const getAllComicsApi = () => {
  return AxiosClient.get('/comics/all');
};

export const getComicsPageApi = (page = 1, size = 10, search = '') => {
  return AxiosClient.get('/comics', { params: { page, size, search } });
};

export const updateComicApi = (id, data) => {
  return AxiosClient.put(`/comics/${id}`, data);
};

export const deleteComicApi = (id) => {
  return AxiosClient.delete(`/comics/${id}`);
};

export const searchComicsApi = (query) => {
  return AxiosClient.get(`/comics/search?query=${encodeURIComponent(query)}`);
};

export const getExploreComicsApi = (params) => {
  return AxiosClient.get('/comics/explore', { params });
};

export const getComicRecommendationsApi = (params) => {
  return AxiosClient.get('/comics/recommendations', { params });
};

export const getComicLeaderboardApi = (params) => {
  return AxiosClient.get('/comics/leaderboard', { params });
};

export const getComicByIdApi = (id) => {
  return AxiosClient.get(`/comics/${id}`);
};


