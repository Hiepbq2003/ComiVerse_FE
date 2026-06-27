import AxiosClient from './AxiosClient';

// Send a broadcast announcement (admin only)
export const sendBroadcastApi = (data) => {
  return AxiosClient.post('/admin/broadcasts', data);
};

// Get broadcast history (admin only)
export const getBroadcastHistoryApi = () => {
  return AxiosClient.get('/admin/broadcasts');
};

// Revoke a sent broadcast announcement (admin only)
export const revokeBroadcastApi = (id) => {
  return AxiosClient.delete(`/admin/broadcasts/${id}`);
};
