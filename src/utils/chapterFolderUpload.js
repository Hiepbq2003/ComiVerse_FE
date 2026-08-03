import JSZip from 'jszip'

const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_PAGE_COUNT = 200
const MAX_TOTAL_UPLOAD_BYTES = 250 * 1024 * 1024

const normalizePath = (value = '') => value.replace(/\\/g, '/')
const getRelativePath = (file) => normalizePath(file?.webkitRelativePath || file?.name || '')
const getBaseName = (path) => normalizePath(path).split('/').filter(Boolean).pop() || ''
const isHiddenPath = (path) => {
  const normalized = normalizePath(path)
  return normalized.startsWith('__MACOSX/') || normalized.split('/').some((part) => part.startsWith('.'))
}
const extensionOf = (name) => name.includes('.') ? name.split('.').pop().toLowerCase() : ''

export const validateChapterFolder = (fileList) => {
  const selected = Array.from(fileList || []).filter((file) => !isHiddenPath(getRelativePath(file)))
  if (selected.length === 0) {
    return { error: 'Please select a chapter folder containing page images.', files: [], chapterNumber: '', folderName: '' }
  }
  if (selected.length > MAX_PAGE_COUNT) {
    return { error: `A chapter can contain at most ${MAX_PAGE_COUNT} page images.`, files: [], chapterNumber: '', folderName: '' }
  }

  const totalBytes = selected.reduce((sum, file) => sum + (file?.size || 0), 0)
  if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
    return { error: 'Chapter folder exceeds the 250MB total upload limit.', files: [], chapterNumber: '', folderName: '' }
  }

  let folderName = ''
  for (const file of selected) {
    const path = getRelativePath(file)
    if (path.startsWith('/') || path.includes('../')) {
      return { error: `Unsafe file path: ${path}`, files: [], chapterNumber: '', folderName: '' }
    }
    const parts = path.split('/').filter(Boolean)
    if (file.webkitRelativePath) {
      if (parts.length !== 2) {
        return { error: `Images must be directly inside one chapter folder: ${path}`, files: [], chapterNumber: '', folderName: '' }
      }
      if (!folderName) folderName = parts[0]
      if (folderName !== parts[0]) {
        return { error: 'Do not combine files from multiple chapter folders.', files: [], chapterNumber: '', folderName: '' }
      }
    }

    const baseName = getBaseName(path)
    if (!ALLOWED_IMAGE_EXTENSIONS.includes(extensionOf(baseName))) {
      return { error: `Unsupported file in chapter folder: ${baseName}`, files: [], chapterNumber: '', folderName: '' }
    }
    if (file.size <= 0) {
      return { error: `Empty image file: ${baseName}`, files: [], chapterNumber: '', folderName: '' }
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { error: `Image exceeds 10MB: ${baseName}`, files: [], chapterNumber: '', folderName: '' }
    }
  }

  // Folder name is intentionally unrestricted. The chapter number comes from
  // the dedicated form field instead of being inferred from the directory name.
  return { error: '', files: selected, chapterNumber: '', folderName }
}

export const buildChapterZipFormData = async ({ chapterNumber, chapterTitle, files }) => {
  const zip = new JSZip()
  
  files.forEach((file) => {
    zip.file(file.name, file)
  })

  const zipBlob = await zip.generateAsync({ type: 'blob' })

  const formData = new FormData()
  formData.append('chapterNumber', chapterNumber)
  formData.append('title', chapterTitle || '')
  formData.append('zipFile', zipBlob, `Chapter ${chapterNumber}.zip`)
  
  return formData
}
