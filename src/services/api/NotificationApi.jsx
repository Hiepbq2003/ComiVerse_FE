import AxiosClient from './AxiosClient';

// Get current user's notifications
export const getMyNotificationsApi = () => {
  return AxiosClient.get('/notifications');
};

// Get unread notification count
export const getUnreadCountApi = () => {
  return AxiosClient.get('/notifications/unread-count');
};

// Mark single notification as read
export const markAsReadApi = (id) => {
  return AxiosClient.put(`/notifications/${id}/read`);
};

// Mark all notifications as read
export const markAllAsReadApi = () => {
  return AxiosClient.put('/notifications/read-all');
};

export const getNotificationPreferencesApi = () => {
  return AxiosClient.get('/notifications/preferences');
};

export const updateNotificationPreferencesApi = (preferences) => {
  return AxiosClient.put('/notifications/preferences', { preferences });
};
