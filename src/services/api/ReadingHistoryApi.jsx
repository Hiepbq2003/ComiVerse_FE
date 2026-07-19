import AxiosClient from './AxiosClient';

export const getReadChaptersByComicIdApi = (comicId, config = {}) => {
  return AxiosClient.get(`/reading-histories/chapters/${comicId}`, config);
};

export const getMyReadingHistoryApi = () => {
  return AxiosClient.get('/reading-histories/my-history');
};

export const deleteReadingHistoryComicApi = (comicId) => {
  return AxiosClient.delete(`/reading-histories/comic/${comicId}`);
};

