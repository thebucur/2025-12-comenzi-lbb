import api from '../services/api'

/**
 * Converts a relative image URL to an absolute URL
 * Uses the same baseURL as the API client to ensure consistency
 * Works correctly in both development and production (Railway)
 */
export const getAbsoluteImageUrl = (url: string): string => {
  // Handle null/undefined/empty
  if (!url || typeof url !== 'string') {
    console.error('getAbsoluteImageUrl: Invalid URL provided:', url)
    return ''
  }

  // If already absolute, return as-is (but validate it)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Double-check it's a valid absolute URL
    try {
      new URL(url)
      return url
    } catch {
      // Invalid absolute URL, treat as relative
      console.warn('getAbsoluteImageUrl: Invalid absolute URL, treating as relative:', url)
    }
  }

  // Use the axios baseURL (from api.ts) which handles all environment cases
  let baseFromApi = api.defaults.baseURL
  
  // If baseURL is not set or looks wrong in production, try to construct it
  if (!baseFromApi || (import.meta.env.PROD && baseFromApi.includes('localhost'))) {
    // In production, try to get backend URL from Railway environment variable pattern
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
    
    // Check if we're on Railway (railway.app domain)
    if (currentOrigin && (currentOrigin.includes('railway.app') || currentOrigin.includes('up.railway.app'))) {
      // Try to construct backend URL from frontend URL
      // Frontend: frontend-production-xxx.up.railway.app
      // Backend: nodejs-production-xxx.up.railway.app (based on service name)
      // Or use known backend URL
      const backendDomain = 'nodejs-production-87d3.up.railway.app'
      baseFromApi = `https://${backendDomain}/api`
      console.warn('API baseURL not set correctly, using inferred Railway backend URL:', baseFromApi)
    } else if (currentOrigin) {
      console.warn('API baseURL not set, falling back to window.location.origin')
      baseFromApi = `${currentOrigin}/api`
    } else {
      console.error('getAbsoluteImageUrl: Cannot determine base URL - no origin available')
      return url // Return as-is if we can't determine base
    }
  }

  // Remove /api suffix if present to get backend base URL
  const backendURL = baseFromApi.replace(/\/api$/, '').replace(/\/$/, '')
  
  // Ensure relative URL starts with /
  const relativePath = url.startsWith('/') ? url : `/${url}`
  
  // Construct full URL
  const fullURL = `${backendURL}${relativePath}`
  
  // Validate the constructed URL
  try {
    const validatedUrl = new URL(fullURL)
    
    // Log warnings for invalid production URLs
    if (import.meta.env.PROD) {
      if (validatedUrl.hostname.includes('localhost') || !validatedUrl.protocol.startsWith('https')) {
        console.error(`getAbsoluteImageUrl: Invalid production URL: ${url} -> ${fullURL}`, {
          baseFromApi,
          backendURL,
          relativePath,
          currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
        })
      }
    } else if (import.meta.env.DEV) {
      console.log(`getAbsoluteImageUrl: ${url} -> ${fullURL}`, {
        baseFromApi,
        backendURL,
        relativePath,
      })
    }
    
    return validatedUrl.toString()
  } catch (error) {
    console.error(`getAbsoluteImageUrl: Failed to construct valid URL from: ${url}`, {
      error,
      baseFromApi,
      backendURL,
      relativePath,
    })
    return url // Return original if construction fails
  }
}
