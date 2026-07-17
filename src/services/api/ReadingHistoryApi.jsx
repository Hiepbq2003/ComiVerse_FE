import AxiosClient from './AxiosClient';

export const getReadChaptersByComicIdApi = (comicId) => {
  return AxiosClient.get(`/reading-histories/chapters/${comicId}`);
};

export const getMyReadingHistoryApi = () => {
  return AxiosClient.get('/reading-histories/my-history');
};

export const deleteReadingHistoryComicApi = (comicId) => {
  return AxiosClient.delete(`/reading-histories/comic/${comicId}`);
};

