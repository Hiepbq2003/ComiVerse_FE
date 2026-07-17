export const formatTimeAgo = (timestampOrDate) => {
  if (!timestampOrDate) return '';
  
  try {
    const date = (timestampOrDate instanceof Date) ? timestampOrDate : new Date(timestampOrDate);
    const timeMs = date.getTime();
    if (isNaN(timeMs)) return '';

    const now = Date.now();
    const diffMs = now - timeMs;

    if (diffMs < 0) {
      return 'Just now';
    }

    const seconds = Math.floor(diffMs / 1000);
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
    if (days < 7) {
      if (days === 1) return '1 day ago';
      return `${days} days ago`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};
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

