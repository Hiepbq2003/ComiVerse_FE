import AxiosClient from './AxiosClient'

export const getForumCommentsApi = (threadId) => {
  return AxiosClient.get(`/forum-threads/${threadId}/comments`)
}

export const createForumCommentApi = (threadId, commentData) => {
  return AxiosClient.post(`/forum-threads/${threadId}/comments`, commentData)
}
