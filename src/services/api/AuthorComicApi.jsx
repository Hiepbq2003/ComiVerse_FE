import AxiosClient from './AxiosClient'

export const getAuthorComicsApi = () => {
  return AxiosClient.get('/author/comics')
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

export const updateAuthorComicApi = (comicId, payload) => {
  return AxiosClient.put(`/author/comics/${comicId}`, payload)
}

export const uploadAuthorChapterZipApi = (comicId, formData) => {
  return AxiosClient.post(`/author/comics/${comicId}/chapters/upload-zip`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000,
  })
}

export const getAuthorChapterPreviewApi = (comicId, chapterId) => {
  return AxiosClient.get(`/author/comics/${comicId}/chapters/${chapterId}/preview`)
}

export const submitAuthorChapterReviewApi = (comicId, chapterId) => {
  return AxiosClient.post(`/author/comics/${comicId}/chapters/${chapterId}/submit-review`)
}
