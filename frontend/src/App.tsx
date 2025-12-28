import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { OrderProvider } from './context/OrderContext'
import Wizard from './components/Wizard'
import Login from './components/Login'
import PhotoUpload from './components/PhotoUpload'
import UserOrdersView from './components/UserOrdersView'
import UserOrderDetails from './components/UserOrderDetails'
import InventoryForm from './components/InventoryForm'

function App() {
  const [, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'))

  // Keep auth state in sync with localStorage changes (even within the same tab)
  useEffect(() => {
    const handleStorageChange = () => {
      setAuthToken(localStorage.getItem('authToken'))
    }

    // Listen for both storage events (cross-tab) and custom authChange events (same-tab)
    const handleAuthChange = () => {
      setAuthToken(localStorage.getItem('authToken'))
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('authChange', handleAuthChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('authChange', handleAuthChange)
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
  const requireAuth = (element: JSX.Element) => {
    return checkAuth() ? element : <Navigate to="/login" replace />
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
            path="/my-orders"
            element={requireAuth(<UserOrdersView />)}
          />
          <Route
            path="/my-orders/:id"
            element={requireAuth(<UserOrderDetails />)}
          />
          <Route
            path="/inventory"
            element={requireAuth(<InventoryForm />)}
          />
          <Route path="/upload/:sessionId" element={<PhotoUpload />} />
        </Routes>
      </Router>
    </OrderProvider>
  )
}

export default App

