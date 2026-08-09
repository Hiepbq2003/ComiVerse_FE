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

export const takedownChapterApi = (chapterId, reason) => {
  return AxiosClient.post(`/chapters/${chapterId}/takedown`, { reason });
};

export const approveChapterDirectApi = (chapterId) => {
  return AxiosClient.put(`/chapters/${chapterId}/approve`);
};

export const getChapterTranslationsApi = (chapterId) => {
  return AxiosClient.get(`/chapters/${chapterId}/translations`);
};

export const getChapterTranslationByIdApi = (translationId) => {
  return AxiosClient.get(`/chapters/translations/${translationId}`);
};
 
export const getComicTranslationLanguagesApi = (comicId) => {
  return AxiosClient.get(`/comics/${comicId}/translation-languages`);
};

export const getTasksByChapterIdApi = (chapterId) => {
  return AxiosClient.get(`/team-workspace/tasks/by-chapter/${chapterId}`);
};

export const revokeChapterTranslationApi = (taskId, reason) => {
  return AxiosClient.put(`/review-workspace/tasks/${taskId}/revoke`, { reason });
};
