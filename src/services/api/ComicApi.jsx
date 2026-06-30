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
