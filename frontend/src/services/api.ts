import axios from 'axios'

// Normalize baseURL to always end with /api
const getBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
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
})

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



