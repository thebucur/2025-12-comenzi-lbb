import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import ordersRoutes from './routes/orders.routes'
import uploadRoutes from './routes/upload.routes'
import reportsRoutes from './routes/reports.routes'
import adminRoutes from './routes/admin.routes'
import authRoutes from './routes/auth.routes'
import configRoutes from './routes/config.routes'

dotenv.config()

// Function to automatically seed the database
async function seedDatabase() {
  const prisma = new PrismaClient()
  try {
    console.log('🌱 Starting database seed...')
    
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connection established')
    
    // Initialize order counter
    await prisma.orderCounter.upsert({
      where: { id: 'main-counter' },
      update: {},
      create: {
        id: 'main-counter',
        lastOrder: 0,
      },
    })
    console.log('✅ Order counter initialized')

    // Create default admin user if it doesn't exist
    const adminPassword = await bcrypt.hash('0000', 10)
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        password: adminPassword, // Update password in case it was changed
      },
      create: {
        username: 'admin',
        password: adminPassword,
      },
    })

    // Verify the admin user was created/updated
    const verifyUser = await prisma.user.findUnique({
      where: { username: 'admin' },
    })

    if (!verifyUser) {
      throw new Error('Failed to create admin user - user not found after creation')
    }

    // Verify password can be compared
    const passwordValid = await bcrypt.compare('0000', verifyUser.password)
    if (!passwordValid) {
      throw new Error('Failed to verify admin password - password comparison failed')
    }

    console.log('✅ Database seeded successfully!')
    console.log('✅ Admin user verified: username=admin, password=0000')
    console.log(`✅ Admin user ID: ${verifyUser.id}`)
  } catch (error) {
    console.warn('⚠️ Seeding warning (continuing anyway):', error)
    // Don't fail startup if seeding fails - admin might already exist
  } finally {
    await prisma.$disconnect()
  }
}

const app = express()
const PORT = parseInt(process.env.PORT || '5000', 10)
const HOST = process.env.HOST || '0.0.0.0' // Listen on all network interfaces for mobile access

// Middleware
// Enhanced CORS configuration for mobile devices and Railway deployment
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  // Allow all Railway frontend domains
  /^https:\/\/.*\.up\.railway\.app$/,
  /^https:\/\/.*\.railway\.app$/,
  // Allow railway.com for admin panel
  'https://railway.com',
]

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) {
      return callback(null, true)
    }
    
    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin)
      }
      return false
    })
    
    if (isAllowed) {
      callback(null, true)
    } else {
      // In development, allow all origins
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true)
      } else {
        console.warn(`CORS blocked origin: ${origin}`)
        callback(new Error('Not allowed by CORS'))
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400, // 24 hours
}))

// Increase body size limit for file uploads
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Routes
app.use('/api/orders', ordersRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/config', configRoutes)

// Log registered routes on startup
console.log('Registered routes:')
console.log('  GET  /api/auth/test')
console.log('  POST /api/auth/login')
console.log('  GET  /api/auth/config')
console.log('  POST /api/auth/seed-admin')
console.log('  DELETE /api/admin/orders/all (temporary - delete all orders)')

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
      auth: {
        base: '/api/auth',
        login: 'POST /api/auth/login',
        config: 'GET /api/auth/config',
        seedAdmin: 'POST /api/auth/seed-admin',
        test: 'GET /api/auth/test'
      },
      config: '/api/config'
    }
  })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// 404 handler - must be after all routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: {
      auth: {
        login: 'POST /api/auth/login',
        config: 'GET /api/auth/config',
        seedAdmin: 'POST /api/auth/seed-admin',
        test: 'GET /api/auth/test'
      }
    }
  })
})

// Initialize database (seed) before starting server
seedDatabase().then(() => {
  startServer()
}).catch((error) => {
  console.error('❌ Failed to seed database, starting server anyway:', error)
  startServer()
})

function startServer() {
  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`)
    if (HOST === '0.0.0.0') {
      console.log(`Server is accessible from your local network`)
      console.log(`To find your local IP, run: ipconfig | findstr IPv4 (Windows) or ifconfig (Mac/Linux)`)
    }
  })

  // Graceful shutdown handler
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`)
    
    server.close(() => {
      console.log('HTTP server closed')
      
      // Disconnect Prisma
      import('./lib/prisma').then(({ default: prisma }) => {
        prisma.$disconnect()
          .then(() => {
            console.log('Database connection closed')
            process.exit(0)
          })
          .catch((error) => {
            console.error('Error closing database connection:', error)
            process.exit(1)
          })
      })
    })
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout')
      process.exit(1)
    }, 10000)
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  
  // Handle uncaught errors
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  })

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    gracefulShutdown('uncaughtException')
  })
}

