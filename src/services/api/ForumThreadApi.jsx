import AxiosClient from './AxiosClient';

export const getAllForumThreadsApi = () => {
  return AxiosClient.get('/forum-threads/all');
};

export const getForumThreadsPageApi = (page = 1, size = 10, search = '') => {
  return AxiosClient.get('/forum-threads', { params: { page, size, search } });
};

export const deleteForumThreadApi = (id) => {
  return AxiosClient.delete(`/forum-threads/${id}`);
};

export const createForumThreadApi = (threadData) => {
  return AxiosClient.post('/forum-threads', threadData);
};
