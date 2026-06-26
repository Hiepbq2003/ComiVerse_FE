import AxiosClient from './AxiosClient';

export const getAllForumThreadsApi = () => {
  return AxiosClient.get('/forum-threads/all');
};

export const deleteForumThreadApi = (id) => {
  return AxiosClient.delete(`/forum-threads/${id}`);
};
