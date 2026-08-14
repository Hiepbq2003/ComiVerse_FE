/**
 * Centralized API & Server Base URL Configuration
 */

// Primary API Base URL (e.g. "https://sep490g37sum26java-production-0ff1.up.railway.app/api" or "/api")
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://sep490g37sum26java-production-0ff1.up.railway.app/api';

// Compute backend server origin host (e.g. "http://localhost:8081")
export const getBackendHost = () => {
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    return API_BASE_URL.replace(/\/api\/?$/, '');
  }
  // return 'http://localhost:8081';
  return 'https://sep490g37sum26java-production-0ff1.up.railway.app';
};

// Centralized helper to resolve image/asset URLs
export const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const backendHost = getBackendHost();
  return `${backendHost}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Compute Native WebSocket URL (ws:// or wss://)
export const getWebSocketUrl = () => {
  if (
    API_BASE_URL.startsWith('http://') ||
    API_BASE_URL.startsWith('https://')
  ) {
    return API_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws'
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/ws`
}
