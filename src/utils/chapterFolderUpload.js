const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_PAGE_COUNT = 200
const MAX_TOTAL_UPLOAD_BYTES = 100 * 1024 * 1024

const normalizePath = (value = '') => value.replace(/\\/g, '/')
const getRelativePath = (file) => normalizePath(
  file?.webkitRelativePath || file?.name || ''
)
const getBaseName = (path) => (
  normalizePath(path).split('/').filter(Boolean).pop() || ''
)
const extensionOf = (name) => (
  name.includes('.') ? name.split('.').pop().toLowerCase() : ''
)

const isHiddenPath = (path) => {
  const normalized = normalizePath(path)
  return normalized.startsWith('__MACOSX/')
    || normalized.split('/').some((part) => part.startsWith('.'))
}

const comparePagePaths = (left, right) => (
  getRelativePath(left).localeCompare(
    getRelativePath(right),
    undefined,
    { numeric: true, sensitivity: 'base' }
  )
)

export const validateChapterFolder = (fileList) => {
  const selected = Array.from(fileList || [])
    .filter((file) => !isHiddenPath(getRelativePath(file)))
    .sort(comparePagePaths)

  if (selected.length === 0) {
    return {
      error: 'Please select a chapter folder containing page images.',
      files: [],
      chapterNumber: '',
      folderName: '',
    }
  }

  if (selected.length > MAX_PAGE_COUNT) {
    return {
      error: `A chapter can contain at most ${MAX_PAGE_COUNT} page images.`,
      files: [],
      chapterNumber: '',
      folderName: '',
    }
  }

  const totalBytes = selected.reduce(
    (sum, file) => sum + (file?.size || 0),
    0
  )

  if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
    return {
      error: 'Chapter folder exceeds the 100MB total upload limit.',
      files: [],
      chapterNumber: '',
      folderName: '',
    }
  }

  let folderName = ''

  for (const file of selected) {
    const path = getRelativePath(file)

    if (path.startsWith('/') || path.includes('../')) {
      return {
        error: `Unsafe file path: ${path}`,
        files: [],
        chapterNumber: '',
        folderName: '',
      }
    }

    const parts = path.split('/').filter(Boolean)

    if (file.webkitRelativePath) {
      if (parts.length !== 2) {
        return {
          error: `Images must be directly inside one chapter folder: ${path}`,
          files: [],
          chapterNumber: '',
          folderName: '',
        }
      }

      if (!folderName) {
        folderName = parts[0]
      }

      if (folderName !== parts[0]) {
        return {
          error: 'Do not combine files from multiple chapter folders.',
          files: [],
          chapterNumber: '',
          folderName: '',
        }
      }
    }

    const baseName = getBaseName(path)

    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extensionOf(baseName))) {
      return {
        error: `Unsupported file in chapter folder: ${baseName}`,
        files: [],
        chapterNumber: '',
        folderName: '',
      }
    }

    if (file.size <= 0) {
      return {
        error: `Empty image file: ${baseName}`,
        files: [],
        chapterNumber: '',
        folderName: '',
      }
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return {
        error: `Image exceeds 10MB: ${baseName}`,
        files: [],
        chapterNumber: '',
        folderName: '',
      }
    }
  }

  return {
    error: '',
    files: selected,
    chapterNumber: '',
    folderName,
  }
}

/**
 * Uploads the selected folder as multipart files.
 *
 * No ZIP/CBZ archive is generated in the browser.
 * The file at index n corresponds to relativePathsJson[n].
 */
export const buildChapterFolderFormData = ({
  chapterNumber,
  chapterTitle,
  files,
}) => {
  const selectedFiles = Array.from(files || []).sort(comparePagePaths)

  if (selectedFiles.length === 0) {
    throw new Error('Chapter folder does not contain any page images.')
  }

  const relativePaths = selectedFiles.map((file) => getRelativePath(file))

  const formData = new FormData()
  formData.append('chapterNumber', String(chapterNumber || '').trim())
  formData.append('title', String(chapterTitle || '').trim())
  formData.append('relativePathsJson', JSON.stringify(relativePaths))

  selectedFiles.forEach((file) => {
    formData.append('files', file, getBaseName(getRelativePath(file)))
  })

  return formData
}
