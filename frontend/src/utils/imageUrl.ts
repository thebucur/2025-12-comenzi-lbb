import api from '../services/api'

/**
 * Converts a relative image URL to an absolute URL
 * Uses the same baseURL as the API client to ensure consistency
 * Works correctly in both development and production (Railway)
 */
export const getAbsoluteImageUrl = (relativeUrl: string): string => {
  // If already absolute, return as-is
  if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
    return relativeUrl
  }

  // Use the axios baseURL (from api.ts) which handles all environment cases
  const baseFromApi = api.defaults.baseURL
  if (!baseFromApi) {
    console.warn('API baseURL not set, falling back to window.location.origin')
    // Fallback to window origin (shouldn't happen in production)
    const url = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`
    return `${window.location.origin}${url}`
  }

  // Remove /api suffix if present to get backend base URL
  const backendURL = baseFromApi.replace(/\/api$/, '').replace(/\/$/, '')
  
  // Ensure relative URL starts with /
  const url = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`
  
  const fullURL = `${backendURL}${url}`
  
  if (import.meta.env.DEV) {
    console.log(`getAbsoluteImageUrl: ${relativeUrl} -> ${fullURL}`, {
      baseFromApi,
      backendURL,
      relativeUrl,
    })
  }

  return fullURL
}
