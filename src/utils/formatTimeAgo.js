export const formatTimeAgo = (timestampOrDate) => {
  if (!timestampOrDate) return 'Just now';
  
  let timeMs;
  if (typeof timestampOrDate === 'number') {
    timeMs = timestampOrDate;
  } else if (timestampOrDate instanceof Date) {
    timeMs = timestampOrDate.getTime();
  } else {
    const parsed = new Date(timestampOrDate);
    if (isNaN(parsed.getTime())) {
      return 'Just now';
    }
    timeMs = parsed.getTime();
  }

  const now = Date.now();
  const diffMs = now - timeMs;
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 0) {
    const absSeconds = Math.abs(seconds);
    if (absSeconds < 86400) {
      if (absSeconds < 60) return 'Just now';
      const minutes = Math.floor(absSeconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ago`;
    }
    return 'Just now';
  }

  if (seconds < 60) {
    return 'Just now';
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return '1 day ago';
  }
  return `${days} days ago`;
};
