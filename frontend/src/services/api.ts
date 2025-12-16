import axios from 'axios'

// Normalize baseURL to always end with /api
const getBaseURL = () => {
  let envURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  
  // In development, detect IP from current location or localStorage
  if (import.meta.env.DEV) {
    const currentHostname = typeof window !== 'undefined' ? window.location.hostname : null
    
    // If accessing from mobile device via IP (not localhost), use that IP for API
    if (currentHostname && currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
      // Extract IP from current URL
      const port = envURL.match(/:(\d+)/)?.[1] || '5000'
      envURL = `http://${currentHostname}:${port}`
      console.log(`Detected IP from current URL: ${envURL}`)
    } else {
      // Check localStorage for manually set IP
      const localIP = localStorage.getItem('localNetworkIP')
      if (localIP) {
        // Replace localhost with the local IP for mobile device access
        envURL = envURL.replace('localhost', localIP).replace('127.0.0.1', localIP)
        console.log(`Using local network IP from localStorage: ${envURL}`)
      }
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
    // Get auth token from localStorage and add to Authorization header
    const authToken = localStorage.getItem('authToken')
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



