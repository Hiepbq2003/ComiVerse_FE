import AxiosClient from './AxiosClient';

export const getAllGenresApi = (config = {}) => {
  const { params, ...restConfig } = config || {};
  return AxiosClient.get('/genres', {
    params: { page: 1, size: 100, ...params },
    ...restConfig
  });
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
