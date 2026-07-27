import AxiosClient from './AxiosClient';

// Strip any "comic-" prefix from IDs before hitting the API
const cleanComicId = (id) =>
  typeof id === 'string' ? id.replace(/^comic-/i, '') : id;

export const getAllComicsApi = async (config = {}) => {
  try {
    return await AxiosClient.get('/comics/staff/all', { timeout: 2500, ...config });
  } catch (err) {
    return [];
  }
};

export const getComicsPageApi = (page = 1, size = 10, search = '') => {
  return AxiosClient.get('/comics', { params: { page, size, search } });
};

export const updateComicApi = (id, data) => {
  return AxiosClient.put(`/comics/${cleanComicId(id)}`, data);
};

export const deleteComicApi = (id) => {
  return AxiosClient.delete(`/comics/${cleanComicId(id)}`);
};

export const searchComicsApi = (query) => {
  return AxiosClient.get(`/comics/search?query=${encodeURIComponent(query)}`);
};

export const getExploreComicsApi = (params, config = {}) => {
  return AxiosClient.get('/comics/explore', { params, ...config });
};

export const getComicRecommendationsApi = (params, config = {}) => {
  return AxiosClient.get('/comics/recommendations', { params, ...config });
};

export const getComicLeaderboardApi = (params, config = {}) => {
  return AxiosClient.get('/comics/leaderboard', { params, ...config });
};

export const getComicByIdApi = (id, config = {}) => {
  return AxiosClient.get(`/comics/${cleanComicId(id)}`, config);
};
