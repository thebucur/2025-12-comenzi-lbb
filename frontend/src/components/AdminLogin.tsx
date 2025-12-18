import axios from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Authenticate with backend using admin credentials
      // Default credentials: admin / 0000
      const response = await api.post('/auth/login', { username, password })
      const { user, token } = response.data

      // Store admin authentication token
      // Use token from response if available, otherwise fallback to username
      localStorage.setItem('adminAuthToken', token || user.username)
      
      // Dispatch custom event to trigger auth state update
      window.dispatchEvent(new Event('adminAuthChange'))
      
      // Redirect to admin dashboard
      navigate('/admin/dashboard')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Credențiale incorecte')
      } else {
        setError('A apărut o eroare neașteptată')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-purple-50 to-primary flex items-center justify-center p-4">
      <div className="absolute top-10 left-10 w-64 h-64 bg-accent-purple/20 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-accent-pink/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }}></div>
      
      <div className="card-neumorphic max-w-md w-full mx-4 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-accent-purple to-accent-pink shadow-glow-purple mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2">Panou Administrare</h1>
          <p className="text-secondary/70">Autentificați-vă pentru a accesa panoul de administrare</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-3 font-semibold text-secondary">Utilizator Admin</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
              placeholder="Introduceți numele de utilizator"
              required
            />
          </div>

          <div>
            <label className="block mb-3 font-semibold text-secondary">Parolă</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-neumorphic w-full text-secondary placeholder:text-secondary/40"
              placeholder="Introduceți parola"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm text-center py-3 rounded-2xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-neumorphic-inset'
                : 'btn-active hover:scale-105'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Se autentifică...
              </span>
            ) : (
              'Autentificare Admin'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin


