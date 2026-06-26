import AxiosClient from './AxiosClient';

export const getAllGenresApi = () => {
  return AxiosClient.get('/genre', { params: { size: 1000 } });
};

export const createGenreApi = (data) => {
  return AxiosClient.post('/genre', data);
};

export const updateGenreApi = (id, data) => {
  return AxiosClient.put(`/genre/${id}`, data);
};

export const deleteGenreApi = (id) => {
  return AxiosClient.delete(`/genre/${id}`);
};
