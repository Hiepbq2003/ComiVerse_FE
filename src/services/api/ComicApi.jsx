import AxiosClient from './AxiosClient';

// Strip any "comic-" prefix from IDs before hitting the API
const cleanComicId = (id) =>
  typeof id === 'string' ? id.replace(/^comic-/i, '') : id;

export const getAllComicsApi = async (config = {}) => {
  try {
    const res = await AxiosClient.get('/comics/staff/all', { params: { t: Date.now() }, ...config });
    console.log('[ComicApi] GET /comics/staff/all success:', Array.isArray(res) ? `${res.length} items` : res);
    return res;
  } catch (err) {
    console.warn('[ComicApi] GET /comics/staff/all failed:', err?.response?.status, err?.response?.data || err?.message);
    try {
      const res = await AxiosClient.get('/comics', { params: { page: 1, size: 100, t: Date.now() }, ...config });
      console.log('[ComicApi] Fallback GET /comics success:', Array.isArray(res) ? `${res.length} items` : res);
      if (Array.isArray(res)) return res;
      return res?.data?.data || res?.data?.content || res?.data || [];
    } catch (e) {
      console.error('[ComicApi] Fallback GET /comics failed:', e?.response?.status, e?.response?.data || e?.message);
      return [];
    }
  }
};

export const getComicsPageApi = (page = 1, size = 10, search = '') => {
  return AxiosClient.get('/comics', { params: { page, size, search } });
};

export const updateComicApi = async (id, data) => {
  const cid = cleanComicId(id);
  const formattedData = { ...data };

  if (data.publicationStatus || data.status) {
    const statusValue = (data.publicationStatus || data.status).toUpperCase();
    formattedData.status = statusValue;
    formattedData.publicationStatus = statusValue;
  }

  try {
    const res = await AxiosClient.put(`/comics/${cid}`, formattedData);
    return res;
  } catch (e) {
    console.error("PUT /comics/{id} failed with error:", e.response?.data || e);
    throw e;
  }
};

export const deleteComicApi = (id) => {
  return AxiosClient.delete(`/comics/${cleanComicId(id)}`);
};

export const getExploreComicsApi = (params, config = {}) => {
  return AxiosClient.get('/comics/explore', { params, ...config });
};

export const getComicRecommendationsApi = (params, config = {}) => {
  return AxiosClient.get('/comics/recommendations', { params, ...config });
};

export const getComicLeaderboardApi = (params, config = {}) => {
  return AxiosClient.get('/comics/leaderboard', { params, ...config });
};

export const getComicByIdApi = async (idOrSlug, config = {}) => {
  const cleanId = cleanComicId(idOrSlug);
  if (!cleanId) return null;

  try {
    // Primary API: GET /api/v2/comics/{slugOrId}
    return await AxiosClient.get(`/v2/comics/${cleanId}`, config);
  } catch (err) {
    // Fallback API: GET /api/comics/{id}
    return await AxiosClient.get(`/comics/${cleanId}`, config);
  }
};
