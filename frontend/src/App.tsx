import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { OrderProvider } from './context/OrderContext'
import Wizard from './components/Wizard'
import Login from './components/Login'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminOrderView from './components/admin/OrderView'
import PhotoUpload from './components/PhotoUpload'

function App() {
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'))

  // Keep auth state in sync with localStorage changes (even within the same tab)
  useEffect(() => {
    const handleStorageChange = () => {
      setAuthToken(localStorage.getItem('authToken'))
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleLoginSuccess = () => {
    // Refresh auth state immediately after successful login
    setAuthToken(localStorage.getItem('authToken'))
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('installationId')
    localStorage.removeItem('installationName')
    localStorage.removeItem('installationConfig')
    setAuthToken(null)
  }

  const isAuthenticated = !!authToken
  const requireAuth = (element: JSX.Element) =>
    isAuthenticated ? element : <Navigate to="/login" replace />

  return (
    <OrderProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/"
            element={requireAuth(<Wizard onLogout={handleLogout} />)}
          />
          <Route path="/admin" element={requireAuth(<AdminDashboard />)} />
          <Route path="/admin/orders/:id" element={requireAuth(<AdminOrderView />)} />
          <Route path="/upload/:sessionId" element={requireAuth(<PhotoUpload />)} />
        </Routes>
      </Router>
    </OrderProvider>
  )
}

export default App

