/**
 * @typedef {Object} GenreDTO
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 */

/**
 * @typedef {Object} ComicDTO
 * @property {string} id
 * @property {string} title
 * @property {string} slug
 * @property {string} summary
 * @property {string} status - ONGOING, COMPLETED, PAUSED
 * @property {string} moderationStatus - DRAFT, PENDING, PUBLISHED, REJECTED
 * @property {string} cover
 * @property {string} thumbnail
 * @property {GenreDTO[]} genres
 * @property {number} viewCount
 * @property {number} likeCount
 * @property {number} saveCount
 * @property {number} ratingAverage
 * @property {number} ratingCount
 * 
 * // Client-side mapped properties for rendering compatibility
 * @property {string} rating - Formatted rating string (e.g. "4.8")
 * @property {string} views - Formatted views string (e.g. "1.2M", "850K")
 * @property {string|number} chapters - Total chapters count (e.g. 184)
 */

/**
 * Maps raw API response element to a clean, standardized ComicDTO object.
 * Provides fallback values to prevent undefined errors in rendering.
 * 
 * @param {Object} raw 
 * @returns {ComicDTO}
 */
export const mapToComicDTO = (raw) => {
  if (!raw) return null;

  return {
    id: raw.id || '',
    title: raw.title || '',
    slug: raw.slug || '',
    summary: raw.summary || '',
    status: raw.status || 'ONGOING',
    moderationStatus: raw.moderationStatus || 'DRAFT',
    cover: raw.cover || '',
    thumbnail: raw.thumbnail || '',
    genres: (raw.genres || []).map(g => ({
      id: g.id || '',
      name: g.name || '',
      slug: g.slug || ''
    })),
    viewCount: Number(raw.viewCount) || 0,
    likeCount: Number(raw.likeCount) || 0,
    saveCount: Number(raw.saveCount) || 0,
    ratingAverage: Number(raw.ratingAverage) || 0.0,
    ratingCount: Number(raw.ratingCount) || 0,
  };
};
