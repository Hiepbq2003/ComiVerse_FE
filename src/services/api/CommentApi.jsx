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
