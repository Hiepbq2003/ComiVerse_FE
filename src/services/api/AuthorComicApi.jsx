import AxiosClient from './AxiosClient'

export const getAuthorComicsApi = (params = {}) => {
  return AxiosClient.get('/author/comics', { params })
}

export const getAuthorComicByIdApi = (comicId) => {
  return AxiosClient.get(`/author/comics/${comicId}`)
}

export const getAuthorComicChaptersApi = (comicId) => {
  return AxiosClient.get(`/author/comics/${comicId}/chapters`)
}

export const getAuthorComicMetricsApi = (comicId) => {
  return AxiosClient.get(`/author/comics/${comicId}/metrics`)
}

export const createAuthorComicApi = (payload) => {
  return AxiosClient.post('/author/comics', payload)
}

export const uploadAuthorComicPackageZipApi = (formData) => {
  return AxiosClient.post('/author/comics/upload-package', formData, {
    timeout: 300000,
  })
}

export const getAuthorComicPackageUploadStatusApi = (taskId) => {
  return AxiosClient.get(`/author/comics/upload-package/status/${taskId}`)
}

export const updateAuthorComicApi = (comicId, payload) => {
  return AxiosClient.put(`/author/comics/${comicId}`, payload)
}

export const uploadAuthorChapterZipApi = (comicId, formData) => {
  return AxiosClient.post(`/author/comics/${comicId}/chapters/upload-zip`, formData, {
    timeout: 120000,
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
