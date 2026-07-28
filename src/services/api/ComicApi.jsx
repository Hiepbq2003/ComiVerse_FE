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
  const formattedData = {
    ...data,
    status: (data.publicationStatus || data.status || 'ONGOING').toUpperCase(),
    publicationStatus: (data.publicationStatus || data.status || 'ONGOING').toUpperCase(),
    language: data.language || 'Vietnamese'
  };

  const endpoints = [
    () => AxiosClient.put(`/comics/${cid}`, formattedData),
    () => AxiosClient.put(`/author/comics/${cid}`, formattedData),
    () => AxiosClient.put(`/comics/staff/${cid}`, formattedData),
    () => AxiosClient.put(`/moderator/comics/${cid}`, formattedData),
    () => AxiosClient.patch(`/comics/${cid}`, formattedData),
    () => AxiosClient.patch(`/author/comics/${cid}`, formattedData),
    () => AxiosClient.patch(`/comics/staff/${cid}`, formattedData),
    () => AxiosClient.patch(`/moderator/comics/${cid}`, formattedData)
  ];

  let lastError = null;
  for (const fn of endpoints) {
    try {
      const res = await fn();
      if (res) return res;
    } catch (e) {
      // Continue to next endpoint
      lastError = e;
    }
  }
  throw lastError || new Error("All endpoints failed to update comic");
};

export const deleteComicApi = (id) => {
  return AxiosClient.delete(`/comics/${cleanComicId(id)}`);
};

export const searchComicsApi = (query) => {
  return AxiosClient.get(`/comics/search?query=${encodeURIComponent(query)}`);
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

export const getComicByIdApi = (id, config = {}) => {
  return AxiosClient.get(`/comics/${cleanComicId(id)}`, config);
};
