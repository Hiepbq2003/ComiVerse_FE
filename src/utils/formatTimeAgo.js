/**
 * Formats a date string relative to the current time (e.g. "Just now", "2m ago", "3h ago").
 * 
 * @param {string|Date} dateVal 
 * @returns {string}
 */
export const formatTimeAgo = (dateVal) => {
  if (!dateVal) return ''
  try {
    const date = new Date(dateVal)
    const now = new Date()
    const diffMs = now - date
    if (isNaN(diffMs) || diffMs < 0) return ''
    
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}
