import AxiosClient from './AxiosClient'

export const getForumCategoriesApi = () => {
  return AxiosClient.get('/forum-categories')
}

export const createForumCategoryApi = (data) => {
  return AxiosClient.post('/forum-categories', data)
}

export const updateForumCategoryApi = (id, data) => {
  return AxiosClient.put(`/forum-categories/${id}`, data)
}

export const deleteForumCategoryApi = (id) => {
  return AxiosClient.delete(`/forum-categories/${id}`)
}
