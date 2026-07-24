import AxiosClient from './AxiosClient';

export const getChaptersByComicIdApi = (comicId, config = {}, includeAll = false) => {
  const params = { ...(config.params || {}) };
  if (includeAll) {
    params.includeAll = true;
  }
  return AxiosClient.get(`/chapters/comic/${comicId}`, { ...config, params });
};

export const getChapterDetailApi = (chapterId) => {
  return AxiosClient.get(`/chapters/detail/${chapterId}`);
};

export const deleteChapterApi = (chapterId) => {
  return AxiosClient.delete(`/chapters/${chapterId}`);
};
