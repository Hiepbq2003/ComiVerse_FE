/**
 * @typedef {Object} GenreDTO
 * @property {string} id
 * @property {string} name
 * @property {string} slug - Genre slug; ComicEntity itself no longer has a slug.
 */

/**
 * @typedef {Object} ComicDTO
 * @property {string} id
 * @property {string} title
 * @property {string} summary
 * @property {number} minimumAge
 * @property {string} authorId
 * @property {string} authorName - Read-only value resolved by the backend mapper.
 * @property {string} publicationStatus - ONGOING, COMPLETED, HIATUS, CANCEL
 * @property {string} moderationStatus - DRAFT, SUBMITTED_FOR_REVIEW, PUBLISHED, REJECTED
 * @property {string} cover
 * @property {GenreDTO[]} genres
 * @property {number} viewCount
 * @property {number} likeCount
 * @property {number} saveCount
 * @property {number} ratingAverage
 * @property {number} ratingCount
 * @property {number} chapterCount
 * @property {string} latestChapterNumber
 * @property {string} lastChapterUpdatedAt
 */

/**
 * Maps a raw comic API item to fields supported by the current ComicDTO.
 * Comic slug, legacy status and thumbnail are intentionally not mapped.
 *
 * @param {Object} raw
 * @returns {ComicDTO|null}
 */
export const mapToComicDTO = (raw) => {
  if (!raw) return null

  return {
    id: raw.id || '',
    title: raw.title || '',
    summary: raw.summary || '',
    minimumAge: Number(raw.minimumAge) || 0,
    authorId: raw.authorId || '',
    authorName: raw.authorName || '',
    publicationStatus: raw.publicationStatus || 'ONGOING',
    moderationStatus: raw.moderationStatus || 'DRAFT',
    cover: raw.cover || '',
    genres: (raw.genres || []).map((genre) => ({
      id: genre.id || '',
      name: genre.name || '',
      slug: genre.slug || ''
    })),
    viewCount: Number(raw.viewCount) || 0,
    likeCount: Number(raw.likeCount) || 0,
    saveCount: Number(raw.saveCount) || 0,
    ratingAverage: Number(raw.ratingAverage) || 0,
    ratingCount: Number(raw.ratingCount) || 0,
    chapterCount: Number(raw.chapterCount) || 0,
    latestChapterNumber: raw.latestChapterNumber || '',
    lastChapterUpdatedAt: raw.lastChapterUpdatedAt || null,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null
  }
}
