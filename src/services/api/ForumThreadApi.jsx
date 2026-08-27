import AxiosClient from './AxiosClient';

export const getAllForumThreadsApi = () => {
  return AxiosClient.get('/forum-threads/all');
};

export const getForumThreadsPageApi = (page = 1, size = 10, search = '') => {
  const params = { page, size };
  if (search && typeof search === 'string' && search.trim()) {
    params.search = search.trim();
  }
  return AxiosClient.get('/forum-threads', { params });
};

export const deleteForumThreadApi = (id) => {
  return AxiosClient.delete(`/forum-threads/${id}`);
};

export const createForumThreadApi = (threadData) => {
  return AxiosClient.post('/forum-threads', threadData);
};

export const updateForumThreadApi = (id, data) => {
  return AxiosClient.put(`/forum-threads/${id}`, data);
};

export const getForumThreadByIdApi = (id) => {
  return AxiosClient.get(`/forum-threads/${id}`);
};

export const incrementForumThreadViewApi = (id) => {
  return AxiosClient.post(`/forum-threads/${id}/view`)
}

export const toggleForumThreadLikeApi = (id) => {
  return AxiosClient.post(`/forum-threads/${id}/like`)
}

export const toggleForumThreadFollowApi = (id) => {
  return AxiosClient.post(`/forum-threads/${id}/follow`)
}

export const reportForumThreadApi = (id, reason) => {
  return AxiosClient.post(`/forum-threads/${id}/report`, { reason })
}

