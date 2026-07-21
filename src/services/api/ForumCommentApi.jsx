import AxiosClient from './AxiosClient'

export const getForumCommentsApi = async (threadId) => {
  try {
    const res = await AxiosClient.get(`/forum-threads/${threadId}/comments`)
    return res
  } catch (err) {
    return []
  }
}

export const createForumCommentApi = async (threadId, commentData) => {
  try {
    const res = await AxiosClient.post(`/forum-threads/${threadId}/comments`, commentData)
    return res
  } catch (err) {
    return null
  }
}
