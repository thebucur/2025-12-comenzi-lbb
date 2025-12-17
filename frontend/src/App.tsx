import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { OrderProvider } from './context/OrderContext'
import Wizard from './components/Wizard'
import Login from './components/Login'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminOrderView from './components/admin/OrderView'
import PhotoUpload from './components/PhotoUpload'

function App() {
  const [, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'))
  const [, setAdminAuthToken] = useState<string | null>(localStorage.getItem('adminAuthToken'))

  // Keep auth state in sync with localStorage changes (even within the same tab)
  useEffect(() => {
    const handleStorageChange = () => {
      setAuthToken(localStorage.getItem('authToken'))
      setAdminAuthToken(localStorage.getItem('adminAuthToken'))
    }

    // Listen for both storage events (cross-tab) and custom authChange events (same-tab)
    const handleAuthChange = () => {
      setAuthToken(localStorage.getItem('authToken'))
    }

    const handleAdminAuthChange = () => {
      setAdminAuthToken(localStorage.getItem('adminAuthToken'))
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('authChange', handleAuthChange)
    window.addEventListener('adminAuthChange', handleAdminAuthChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('authChange', handleAuthChange)
      window.removeEventListener('adminAuthChange', handleAdminAuthChange)
    }
  }, [])

  const handleLoginSuccess = () => {
    // Refresh auth state immediately after successful login
    setAuthToken(localStorage.getItem('authToken'))
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('globalConfig')
    setAuthToken(null)
    // Dispatch custom event to trigger auth state update in same tab
    window.dispatchEvent(new Event('authChange'))
  }

  // Check localStorage directly as source of truth (state updates are async)
  const checkAuth = () => !!localStorage.getItem('authToken')
  const checkAdminAuth = () => !!localStorage.getItem('adminAuthToken')
  const requireAuth = (element: JSX.Element) => {
    return checkAuth() ? element : <Navigate to="/login" replace />
  }
  const requireAdminAuth = (element: JSX.Element) => {
    return checkAdminAuth() ? element : <Navigate to="/admin" replace />
  }

  return (
    <OrderProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={checkAuth() ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/"
            element={requireAuth(<Wizard onLogout={handleLogout} />)}
          />
          <Route
            path="/admin"
            element={checkAdminAuth() ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin />}
          />
          <Route path="/admin/dashboard" element={requireAdminAuth(<AdminDashboard />)} />
          <Route path="/admin/orders/:id" element={requireAdminAuth(<AdminOrderView />)} />
          <Route path="/upload/:sessionId" element={<PhotoUpload />} />
        </Routes>
      </Router>
    </OrderProvider>
  )
}

export default App

