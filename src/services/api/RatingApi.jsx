import AxiosClient from './AxiosClient';

/**
 * Rate or update rating score for a comic (score: 1-5)
 * POST /ratings/comics/{comicId}
 */
export const rateComicApi = (comicId, score, config = {}) => {
  return AxiosClient.post(`/ratings/comics/${comicId}`, { score }, config);
};

/**
 * Delete rating for a comic
 * DELETE /ratings/comics/{comicId}
 */
export const deleteComicRatingApi = (comicId, config = {}) => {
  return AxiosClient.delete(`/ratings/comics/${comicId}`, config);
};

/**
 * Get rating summary and user score for a comic
 * GET /ratings/comics/{comicId}
 */
export const getComicRatingApi = (comicId, config = {}) => {
  return AxiosClient.get(`/ratings/comics/${comicId}`, config);
};

/**
 * Get current user's rated comics
 * GET /ratings/my-ratings
 */
export const getUserRatingsApi = (config = {}) => {
  return AxiosClient.get('/ratings/my-ratings', config);
};
