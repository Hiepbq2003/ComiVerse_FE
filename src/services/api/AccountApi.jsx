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

// Admin reset a user's password to the system default
export const resetUserPasswordApi = (userId) => {
  return AxiosClient.post(`/admin/users/${userId}/reset-password`);
};

// Update a user's details (fullName & role)
export const updateUserApi = (userId, data) => {
  return AxiosClient.put(`/admin/users/${userId}`, data);
};

// Search active translators (moderator & admin accessible)
export const searchTranslatorsApi = (query) => {
  return AxiosClient.get('/users/translators', { params: { query } });
};

// Search active project leaders (strictly from real backend data)
export const searchProjectLeadersApi = (query) => {
  return AxiosClient.get('/users/project-leaders', { params: { query } });
};

// Author license review (Admin/Moderator endpoints; this admin page uses them directly)
export const getAuthorLicenseReviewsApi = (status) => {
  return AxiosClient.get('/author-license-reviews', { params: status ? { status } : {} });
};

export const approveAuthorLicenseApi = (authorId) => {
  return AxiosClient.post(`/author-license-reviews/${authorId}/approve`);
};

export const rejectAuthorLicenseApi = (authorId, payload = {}) => {
  return AxiosClient.post(`/author-license-reviews/${authorId}/reject`, payload);
};

export const disableAuthorLicenseApi = (authorId) => {
  return AxiosClient.post(`/author-license-reviews/${authorId}/disable`);
};

export const reopenAuthorLicenseApi = (authorId, payload = {}) => {
  return AxiosClient.post(`/author-license-reviews/${authorId}/reopen`, payload);
};
