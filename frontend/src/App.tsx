import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { OrderProvider } from './context/OrderContext'
import Wizard from './components/Wizard'
import Login from './components/Login'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminOrderView from './components/admin/OrderView'
import PhotoUpload from './components/PhotoUpload'

function App() {
  // Check if user is authenticated or has skipped authentication
  const isAuthenticated = () => {
    return !!localStorage.getItem('authToken') || !!localStorage.getItem('skipAuth')
  }

  return (
    <OrderProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated() ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/"
            element={isAuthenticated() ? <Wizard /> : <Navigate to="/login" replace />}
          />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/orders/:id" element={<AdminOrderView />} />
          <Route path="/upload/:sessionId" element={<PhotoUpload />} />
        </Routes>
      </Router>
    </OrderProvider>
  )
}

export default App

