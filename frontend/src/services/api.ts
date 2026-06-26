import axios from 'axios'

// Normalize baseURL to always end with /api
const getBaseURL = () => {
  let envURL: string
  
  if (import.meta.env.DEV) {
    // Prefer same-origin /api so Vite's dev proxy (see vite.config) forwards to the backend.
    // Calling http://localhost:5000 directly breaks when the backend is down, blocked, or
    // when mixed network setups; relative /api matches the page host (localhost:3000 or LAN IP).
    if (import.meta.env.VITE_API_URL) {
      envURL = import.meta.env.VITE_API_URL.replace(/\/api$/, '').replace(/\/$/, '')
    } else {
      envURL = ''
    }
  } else {
    // Production: use VITE_API_URL if set (injected at build time)
    envURL = import.meta.env.VITE_API_URL || ''
    
    // Remove /api suffix if present for base URL processing
    if (envURL) {
      envURL = envURL.replace(/\/api$/, '').replace(/\/$/, '')
    }
    
    // If still not set, log error (VITE_API_URL should be set at build time)
    if (!envURL && typeof window !== 'undefined') {
      console.error('VITE_API_URL is not set at build time!')
      console.error('This will cause broken image URLs.')
      // Fallback - this won't work correctly if frontend and backend are on different domains
      envURL = window.location.origin
    }
  }
  
  // Remove trailing slash if present
  const cleanURL = envURL.replace(/\/$/, '')
  // Ensure /api is appended
  return cleanURL.endsWith('/api') ? cleanURL : `${cleanURL}/api`
}

const baseURL = getBaseURL()

// Log baseURL in development for debugging
if (import.meta.env.DEV) {
  console.log('API Base URL:', baseURL)
}

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds timeout for uploads
})

// Add request interceptor to include auth token and handle FormData correctly
api.interceptors.request.use(
  (config) => {
    // Check if this is an admin endpoint
    // - /admin/* : admin panel routes
    // - /inventory-products/* (except /categories/public): admin product management
    // - /inventory/* when on admin page: InventoryView, PDF generation
    const isAdminPage = typeof window !== 'undefined' && window.location.pathname.includes('/admin')
    const isAdminEndpoint =
      config.url?.startsWith('/admin') ||
      (config.url?.startsWith('/inventory-products') && !config.url?.includes('/categories/public')) ||
      (isAdminPage && config.url?.startsWith('/inventory'))
    
    // Get appropriate auth token from localStorage
    // For admin endpoints, use adminAuthToken; otherwise use regular authToken
    const authToken = isAdminEndpoint 
      ? localStorage.getItem('adminAuthToken')
      : localStorage.getItem('authToken')
    
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`
    }
    
    // If data is FormData, remove Content-Type header to let axios set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response.status,
        message: error.response.data?.error || error.message,
      })
    } else if (error.request) {
      // Request was made but no response received
      console.error('API Network Error:', {
        url: error.config?.url,
        message: 'No response from server. Check if the backend is running.',
      })
    } else {
      // Something else happened
      console.error('API Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default api



