export const COMIC_LANGUAGE_OPTIONS = [
  'English',
  'Vietnamese',
  'Japanese',
  'Korean',
  'Chinese',
  'Spanish',
  'French'
]

export const normalizeComicLanguage = (value) => {
  const normalized = (value || '').toString().trim()
  return normalized || 'Unknown'
}
