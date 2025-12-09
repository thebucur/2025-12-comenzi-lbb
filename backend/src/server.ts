import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import ordersRoutes from './routes/orders.routes'
import uploadRoutes from './routes/upload.routes'
import reportsRoutes from './routes/reports.routes'
import adminRoutes from './routes/admin.routes'
import authRoutes from './routes/auth.routes'
import configRoutes from './routes/config.routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Routes
app.use('/api/orders', ordersRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/config', configRoutes)

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Cake Ordering API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      orders: '/api/orders',
      upload: '/api/upload',
      reports: '/api/reports',
      admin: '/api/admin',
      auth: '/api/auth',
      config: '/api/config'
    }
  })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

