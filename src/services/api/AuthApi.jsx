import AxiosClient from './AxiosClient';

export const loginApi = (username, password) => {
  return AxiosClient.post('/auth/login', { username, password });
};

export const registerApi = (userData) => {
  return AxiosClient.post('/auth/register', userData);
};

export const forgotPasswordApi = (email) => {
  return AxiosClient.post('/auth/forgot-password', { email });
};

export const resetPasswordApi = (email, otp, newPassword) => {
  return AxiosClient.post('/auth/reset-password', { email, otp, newPassword });
};

export const getMeApi = () => {
  return AxiosClient.get('/auth/me');
};
