import AxiosClient from './AxiosClient';

// Fetch all user accounts (admin only)
export const getAllAccountsApi = (params = {}) => {
  return AxiosClient.get('/admin/users', { params });
};

// Create a staff account (admin only) — uses the /auth/register-staff endpoint
export const registerStaffApi = (data) => {
  return AxiosClient.post('/auth/register-staff', data);
};

// Ban a user account
export const banUserApi = (userId) => {
  return AxiosClient.put(`/admin/users/${userId}/ban`);
};

// Unban a user account
export const unbanUserApi = (userId) => {
  return AxiosClient.put(`/admin/users/${userId}/unban`);
};

// Admin reset a user's password
export const resetUserPasswordApi = (userId) => {
  return AxiosClient.post(`/admin/users/${userId}/reset-password`);
};

// Search active translators (moderator & admin accessible)
export const searchTranslatorsApi = (query) => {
  return AxiosClient.get('/users/translators', { params: { query } });
};
