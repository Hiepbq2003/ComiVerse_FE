import AxiosClient from './AxiosClient';

export const getReadChaptersByComicIdApi = (comicId) => {
  return AxiosClient.get(`/reading-histories/chapters/${comicId}`);
};
