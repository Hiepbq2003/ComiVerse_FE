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

export const getChapterTranslationsApi = (chapterId) => {
  return AxiosClient.get(`/chapters/${chapterId}/translations`);
};
 
export const getComicTranslationLanguagesApi = (comicId) => {
  return AxiosClient.get(`/comics/${comicId}/translation-languages`);
};
