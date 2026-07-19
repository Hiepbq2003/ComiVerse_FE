import AxiosClient from './AxiosClient';

export const getAllGenresApi = (config = {}) => {
  return AxiosClient.get('/genres', { params: { size: 1000 }, ...config });
};

export const createGenreApi = (data) => {
  return AxiosClient.post('/genres', data);
};

export const updateGenreApi = (id, data) => {
  return AxiosClient.put(`/genres/${id}`, data);
};

export const deleteGenreApi = (id) => {
  return AxiosClient.delete(`/genres/${id}`);
};
