import AxiosClient from './AxiosClient';

export const getAllSubmissionsApi = async () => {
  try {
    return await AxiosClient.get('/submissions/all');
  } catch (err) {
    console.warn('[SubmissionApi] getAllSubmissionsApi fallback:', err?.message || err);
    return [];
  }
};

export const createSubmissionApi = (data) => {
  return AxiosClient.post('/submissions', data);
};

export const approveSubmissionApi = (id) => {
  return AxiosClient.put(`/submissions/${id}/approve`);
};

export const rejectSubmissionApi = (id, reason) => {
  return AxiosClient.put(`/submissions/${id}/reject`, { reason });
};

export const getSubmissionCommentsApi = (id) => {
  return AxiosClient.get(`/submissions/${id}/comments`);
};

export const saveSubmissionCommentsApi = (id, comments) => {
  return AxiosClient.post(`/submissions/${id}/comments`, { comments });
};
