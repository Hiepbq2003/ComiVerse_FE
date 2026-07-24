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

