import AxiosClient from './AxiosClient';

export const getAllComicsApi = () => {
  return AxiosClient.get('/comics/all');
};

export const updateComicApi = (id, data) => {
  return AxiosClient.put(`/comics/${id}`, data);
};

export const deleteComicApi = (id) => {
  return AxiosClient.delete(`/comics/${id}`);
};
