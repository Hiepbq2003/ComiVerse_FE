import AxiosClient from './AxiosClient'

export const getAuthorComicsApi = (params = {}) => {
  return AxiosClient.get('/author/comics', { params })
}

export const getAuthorComicByIdApi = (comicId) => {
  return AxiosClient.get(`/author/comics/${comicId}`)
}

export const getAuthorComicChaptersApi = (comicId, params = {}) => {
  return AxiosClient.get(`/author/comics/${comicId}/chapters`, { params })
}

export const getAuthorComicMetricsApi = (comicId) => {
  return AxiosClient.get(`/author/comics/${comicId}/metrics`)
}

export const getAuthorDashboardMetricsApi = (period = 'WEEK') => {
  return AxiosClient.get('/author/dashboard/metrics', {
    params: { period }
  })
}

export const checkAuthorComicTitleExistsApi = (title) => {
  return AxiosClient.get('/author/comics/title-exists', { params: { title } })
}

export const createAuthorComicApi = (payload) => {
  return AxiosClient.post('/author/comics', payload)
}

export const updateAuthorComicApi = (comicId, payload) => {
  return AxiosClient.put(`/author/comics/${comicId}`, payload)
}

export const submitAuthorComicReviewApi = (comicId) => {
  return AxiosClient.post(`/author/comics/${comicId}/submit-review`)
}

export const confirmModEditApi = (comicId) => {
  return AxiosClient.put(`/author/comics/${comicId}/confirm-edit`)
}

export const uploadAuthorChapterFolderApi = (comicId, formData, onUploadProgress) => {
  return AxiosClient.post(`/author/comics/${comicId}/chapters/upload-zip`, formData, {
    timeout: 120000,
    onUploadProgress
  })
}

export const getAuthorChapterUploadStatusApi = (comicId, taskId) => {
  return AxiosClient.get(`/author/comics/${comicId}/chapters/upload-zip/status/${taskId}`)
}

export const getAuthorChapterPreviewApi = (comicId, chapterId) => {
  return AxiosClient.get(`/author/comics/${comicId}/chapters/${chapterId}/preview`)
}

export const submitAuthorChapterReviewApi = (comicId, chapterId) => {
  return AxiosClient.post(`/author/comics/${comicId}/chapters/${chapterId}/submit-review`)
}

export const deleteAuthorComicApi = (comicId) => {
  return AxiosClient.delete(`/author/comics/${comicId}`)
}

export const updateAuthorChapterApi = (comicId, chapterId, payload) => {
  return AxiosClient.put(`/author/comics/${comicId}/chapters/${chapterId}`, payload)
}

export const deleteAuthorChapterApi = (comicId, chapterId) => {
  return AxiosClient.delete(`/author/comics/${comicId}/chapters/${chapterId}`)
}

export const replaceAuthorChapterZipApi = (comicId, chapterId, formData, onUploadProgress) => {
  return AxiosClient.put(`/author/comics/${comicId}/chapters/${chapterId}/replace-zip`, formData, {
    timeout: 120000,
    onUploadProgress
  })
}

export const submitAuthorComicAppealApi = (comicId, payload) => {
  return AxiosClient.post(`/author/comics/${comicId}/appeal`, payload)
}

