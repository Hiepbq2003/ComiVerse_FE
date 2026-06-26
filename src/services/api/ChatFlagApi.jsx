import AxiosClient from './AxiosClient';

export const getAllChatFlagsApi = () => {
  return AxiosClient.get('/chat-flags/all');
};

export const warnChatFlagApi = (id) => {
  return AxiosClient.put(`/chat-flags/${id}/warn`);
};

export const deleteChatFlagApi = (id) => {
  return AxiosClient.delete(`/chat-flags/${id}`);
};
