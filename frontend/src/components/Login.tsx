import axios from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

type LoginProps = {
  onLoginSuccess?: () => void
}

function Login({ onLoginSuccess }: LoginProps) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Block admin login from main app - admin must use /admin panel
    if (username.trim().toLowerCase() === 'admin') {
      setError('Autentificarea utilizatorului admin nu este permisă din aplicația principală.')
      setLoading(false)
      return
    }

    try {
      const response = await api.post('/auth/login', { username, password })
      const { user } = response.data

      // Store authentication info
      localStorage.setItem('authToken', user.username) // Simple token (username)
      localStorage.setItem('userId', user.id)

      // Fetch global configuration
      const configResponse = await api.get('/auth/config')
      localStorage.setItem('globalConfig', JSON.stringify(configResponse.data))

      onLoginSuccess?.()

      // Redirect to wizard
      navigate('/')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Eroare la autentificare')
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gradient mb-2">Bun venit</h1>
          <p className="text-secondary/70">Autentificați-vă pentru a continua</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-3 font-semibold text-secondary">Utilizator</label>
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
              'Autentificare'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login

