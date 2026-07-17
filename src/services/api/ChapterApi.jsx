import AxiosClient from './AxiosClient';

export const getChaptersByComicIdApi = (comicId) => {
  return AxiosClient.get(`/chapters/comic/${comicId}`);
};

export const deleteChapterApi = (chapterId) => {
  return AxiosClient.delete(`/chapters/${chapterId}`);
};
