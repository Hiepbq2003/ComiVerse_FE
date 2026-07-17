import AxiosClient from './AxiosClient';

export const getChaptersByComicIdApi = (comicId) => {
  return AxiosClient.get(`/chapters/comic/${comicId}`);
};

export const getChapterDetailApi = (chapterId) => {
  return AxiosClient.get(`/chapters/detail/${chapterId}`);
};
