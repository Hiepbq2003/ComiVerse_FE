import AxiosClient from './AxiosClient';

export const loginApi = (username, password) => {
  return AxiosClient.post('/auth/login', { username, password });
};

export const registerApi = (userData) => {
  return AxiosClient.post('/auth/register', userData);
};

export const verifyEmailApi = (email, otp) => {
  return AxiosClient.post('/auth/verify-email', { email, otp });
};

export const resendVerificationOtpApi = (email) => {
  return AxiosClient.post('/auth/resend-verification-otp', { email });
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

export const changePasswordApi = (currentPassword, newPassword) => {
  return AxiosClient.post('/auth/change-password', { currentPassword, newPassword });
};

export const updateProfileApi = (fullName, avatarUrl, backgroundImageUrl) => {
  return AxiosClient.put('/auth/profile', { fullName, avatarUrl, backgroundImageUrl });
};

export const uploadAvatarApi = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return AxiosClient.post('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const getUserInteractionCountsApi = () => {
  return AxiosClient.get('/users/me/interaction-counts');
};

