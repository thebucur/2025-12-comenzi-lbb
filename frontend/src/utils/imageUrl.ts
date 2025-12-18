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
  let baseFromApi = api.defaults.baseURL
  
  // If baseURL is not set or looks wrong in production, try to construct it
  if (!baseFromApi || (import.meta.env.PROD && baseFromApi.includes('localhost'))) {
    // In production, try to get backend URL from Railway environment variable pattern
    // Railway provides RAILWAY_SERVICE_NODEJS_URL or we can infer from current origin
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
    
    // Check if we're on Railway (railway.app domain)
    if (currentOrigin.includes('railway.app') || currentOrigin.includes('up.railway.app')) {
      // Try to construct backend URL from frontend URL
      // Frontend: frontend-production-xxx.up.railway.app
      // Backend: nodejs-production-xxx.up.railway.app (based on service name)
      // Or use known backend URL
      const backendDomain = 'nodejs-production-87d3.up.railway.app'
      baseFromApi = `https://${backendDomain}/api`
      console.warn('API baseURL not set correctly, using inferred Railway backend URL:', baseFromApi)
    } else {
      console.warn('API baseURL not set, falling back to window.location.origin')
      baseFromApi = `${currentOrigin}/api`
    }
  }

  // Remove /api suffix if present to get backend base URL
  const backendURL = baseFromApi.replace(/\/api$/, '').replace(/\/$/, '')
  
  // Ensure relative URL starts with /
  const url = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`
  
  const fullURL = `${backendURL}${url}`
  
  // Always log in production to debug broken images
  if (fullURL.includes('localhost') || (import.meta.env.PROD && !fullURL.startsWith('https://'))) {
    console.error(`getAbsoluteImageUrl: Invalid URL in production: ${relativeUrl} -> ${fullURL}`, {
      baseFromApi,
      backendURL,
      relativeUrl,
      currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
    })
  } else if (import.meta.env.DEV) {
    console.log(`getAbsoluteImageUrl: ${relativeUrl} -> ${fullURL}`, {
      baseFromApi,
      backendURL,
      relativeUrl,
    })
  }

  return fullURL
}
