import AxiosClient from './AxiosClient';

// Get current user's notifications
export const getMyNotificationsApi = () => {
  return AxiosClient.get('/notifications', { timeout: 5000 });
};

// Get unread notification count
export const getUnreadCountApi = () => {
  return AxiosClient.get('/notifications/unread-count', { timeout: 5000 });
};

// Mark single notification as read
export const markAsReadApi = (id) => {
  return AxiosClient.put(`/notifications/${id}/read`, {}, { timeout: 5000 });
};

// Mark all notifications as read
export const markAllAsReadApi = () => {
  return AxiosClient.put('/notifications/read-all', {}, { timeout: 5000 });
};

export const getNotificationPreferencesApi = () => {
  return AxiosClient.get('/notifications/preferences');
};

export const updateNotificationPreferencesApi = (preferences) => {
  return AxiosClient.put('/notifications/preferences', { preferences });
};
