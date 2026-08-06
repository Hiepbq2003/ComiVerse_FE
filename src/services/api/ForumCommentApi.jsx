import AxiosClient from './AxiosClient'

export const getForumCommentsApi = (threadId) => {
  return AxiosClient.get(`/forum-threads/${threadId}/comments`)
}

export const createForumCommentApi = (threadId, commentData) => {
  return AxiosClient.post(`/forum-threads/${threadId}/comments`, commentData)
}

export const toggleForumCommentLikeApi = (threadId, commentId) => {
  return AxiosClient.post(`/forum-threads/${threadId}/comments/${commentId}/like`)
}

export const updateForumCommentApi = (threadId, commentId, data) => {
  return AxiosClient.put(`/forum-threads/${threadId}/comments/${commentId}`, data)
}

export const deleteForumCommentApi = (threadId, commentId) => {
  return AxiosClient.delete(`/forum-threads/${threadId}/comments/${commentId}`)
}
