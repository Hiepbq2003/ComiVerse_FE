import AxiosClient from './AxiosClient';

export const getComicCommentsApi = (comicId, parentId = '', page = 1, size = 10, config = {}) => {
  return AxiosClient.get('/comments/comics', {
    params: {
      comicId,
      parentId: parentId || undefined,
      page,
      size
    },
    ...config
  });
};

export const createComicCommentApi = (data, config = {}) => {
  return AxiosClient.post('/comments/comics', data, config);
};

export const getChapterCommentsApi = (chapterId, parentId = '', page = 1, size = 10, config = {}) => {
  return AxiosClient.get('/comments/chapters', {
    params: {
      chapterId,
      parentId: parentId || undefined,
      page,
      size
    },
    ...config
  });
};

export const createChapterCommentApi = (data, config = {}) => {
  return AxiosClient.post('/comments/chapters', data, config);
};

export const getComicCommentByIdApi = (commentId, config = {}) => {
  return AxiosClient.get(`/comments/comics/${commentId}`, config);
};

export const getChapterCommentByIdApi = (commentId, config = {}) => {
  return AxiosClient.get(`/comments/chapters/${commentId}`, config);
};

export const deleteComicCommentApi = (id, config = {}) => {
  return AxiosClient.delete(`/comments/comics/${id}`, config);
};

export const deleteChapterCommentApi = (id, config = {}) => {
  return AxiosClient.delete(`/comments/chapters/${id}`, config);
};

export const updateComicCommentApi = (id, data, config = {}) => {
  return AxiosClient.put(`/comments/comics/${id}`, data, config);
};

export const updateChapterCommentApi = (id, data, config = {}) => {
  return AxiosClient.put(`/comments/chapters/${id}`, data, config);
};
