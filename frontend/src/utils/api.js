/**
 * Central API configuration helper.
 * Automatically connects to the live Render backend when deployed in production,
 * and uses local proxy in development.
 */
function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalNetwork = (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    );

    if (isLocalNetwork) {
      if (window.location.port === '5173' || window.location.port === '3000') {
        // Vite development proxy handles relative /api and /media to localhost:8000
        return '';
      }
      return `http://${hostname}:8000`;
    }

    // Production cloud fallback (e.g. Vercel deployment)
    return 'https://ktv-backends.onrender.com';
  }

  return '';
}

export const API_BASE_URL = getApiBaseUrl();

export function apiUrl(path) {
  if (!path) return API_BASE_URL;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
