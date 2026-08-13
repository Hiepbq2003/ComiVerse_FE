import AxiosClient from './AxiosClient';

export const getAllChatFlagsApi = () => {
  return AxiosClient.get('/chat-flags/all');
};

export const warnChatFlagApi = (id) => {
  return AxiosClient.put(`/chat-flags/${id}/warn`);
};

export const muteUserChatApi = (userId, durationHours = 24, reason = '') => {
  return AxiosClient.post(`/chat-flags/mute-user`, { userId, durationHours, reason });
};

export const unmuteUserChatApi = (userId) => {
  return AxiosClient.post(`/chat-flags/unmute-user`, { userId });
};

export const dismissChatFlagApi = (id) => {
  return AxiosClient.put(`/chat-flags/${id}/dismiss`);
};

export const deleteChatFlagApi = (id) => {
  return AxiosClient.delete(`/chat-flags/${id}`);
};

export const createChatFlagApi = (flagData) => {
  const payload = {
    userId: flagData.userId || flagData.user,
    user: flagData.user || flagData.userId,
    username: flagData.user || flagData.username,
    message: flagData.message || flagData.content || '',
    reason: flagData.reason || 'Flagged by Moderator',
    messageId: flagData.messageId || flagData.id,
    ...(flagData.imageUrl ? { imageUrl: flagData.imageUrl } : {})
  };
  return AxiosClient.post('/chat-flags', payload, {
    suppressToast: true,
    headers: { 'X-Suppress-Toast': 'true' }
  });
};


