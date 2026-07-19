import AxiosClient from './AxiosClient';

export const getChaptersByComicIdApi = (comicId, config = {}) => {
  return AxiosClient.get(`/chapters/comic/${comicId}`, config);
};

export const getChapterDetailApi = (chapterId) => {
  return AxiosClient.get(`/chapters/detail/${chapterId}`);
};

export const deleteChapterApi = (chapterId) => {
  return AxiosClient.delete(`/chapters/${chapterId}`);
};
