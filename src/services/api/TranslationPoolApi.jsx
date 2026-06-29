import AxiosClient from './AxiosClient';

/**
 * Translation Pool API
 * Manages the "Job Board" workflow for translation projects.
 * Uses the translation_projects table with status='UNCLAIMED' for pending jobs.
 */

// Moderator: Create translation request(s) for a comic
// Backend splits targetLanguages array into separate UNCLAIMED rows
export const createTranslationRequestApi = (data) => {
  return AxiosClient.post('/translation-pool/request', data);
};

// Translator: Get all unclaimed translation projects (Job Pool)
export const getAllUnclaimedProjectsApi = (page = 1, size = 9, search = '') => {
  return AxiosClient.get('/translation-pool/unclaimed', { params: { page, size, search } });
};

// Translator Leader: Claim a project from the pool
export const claimProjectApi = (projectId) => {
  return AxiosClient.put(`/translation-pool/${projectId}/claim`);
};
