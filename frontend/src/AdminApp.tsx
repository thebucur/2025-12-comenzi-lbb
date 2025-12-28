import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AdminLogin from './components/AdminLogin'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminOrderView from './components/admin/OrderView'
import InventoryView from './components/admin/InventoryView'

function AdminApp() {
  const [, setAdminAuthToken] = useState<string | null>(localStorage.getItem('adminAuthToken'))

  // Keep auth state in sync with localStorage changes (even within the same tab)
  useEffect(() => {
    const handleStorageChange = () => {
      setAdminAuthToken(localStorage.getItem('adminAuthToken'))
    }

    const handleAdminAuthChange = () => {
      setAdminAuthToken(localStorage.getItem('adminAuthToken'))
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('adminAuthChange', handleAdminAuthChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('adminAuthChange', handleAdminAuthChange)
    }
  }, [])

  // Check localStorage directly as source of truth (state updates are async)
  const checkAdminAuth = () => !!localStorage.getItem('adminAuthToken')
  const requireAdminAuth = (element: JSX.Element) => {
    return checkAdminAuth() ? element : <Navigate to="/" replace />
  }

  return (
    <Router basename="/admin">
      <Routes>
        <Route
          path="/"
          element={checkAdminAuth() ? <Navigate to="/dashboard" replace /> : <AdminLogin />}
        />
        <Route path="/dashboard" element={requireAdminAuth(<AdminDashboard />)} />
        <Route path="/orders/:id" element={requireAdminAuth(<AdminOrderView />)} />
        <Route path="/inventory/:id" element={requireAdminAuth(<InventoryView />)} />
      </Routes>
    </Router>
  )
}

export default AdminApp


