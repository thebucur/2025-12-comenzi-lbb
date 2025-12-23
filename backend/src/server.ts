import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import prisma from './lib/prisma'
import ordersRoutes from './routes/orders.routes'
import uploadRoutes from './routes/upload.routes'
import reportsRoutes from './routes/reports.routes'
import adminRoutes from './routes/admin.routes'
import authRoutes from './routes/auth.routes'
import configRoutes from './routes/config.routes'
import inventoryRoutes from './routes/inventory.routes'
import inventoryProductsRoutes from './routes/inventory-products.routes'

dotenv.config()

// Build marker to verify deployed code version
const BUILD_VERSION = 'pdf-unique-20251223'

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

    // Seed inventory products if they don't exist
    const categoriesCount = await prisma.inventoryCategory.count()
    if (categoriesCount === 0) {
      console.log('🌱 Seeding inventory products...')
      await seedInventoryProducts(prisma)
      console.log('✅ Inventory products seeded successfully!')
    } else {
      console.log(`✅ Inventory products already exist (${categoriesCount} categories)`)
    }
  } catch (error) {
    console.warn('⚠️ Seeding warning (continuing anyway):', error)
    // Don't fail startup if seeding fails - admin might already exist
  } finally {
    await prisma.$disconnect()
  }
}

// Inventory products seeding function
async function seedInventoryProducts(prismaClient: PrismaClient) {
  const INVENTORY_CATEGORIES = [
    {
      name: 'PRODUSE LA BUCATA',
      units: ['buc.', 'g.', 'tv'],
      defaultUnit: 'buc.',
      products: [
        'Amandina', 'Ora 12', 'Ecler frisca', 'Ecler vanilie farta', 'Ecler fistic',
        'Ecler cafea', 'Ecler ciocolata', 'Ecler caramel sarat', 'Savarine', 'Blanche',
        'Kremsnit', 'Extraordinar', 'Mousse X3', 'Mousse fructe de padure', 'Tiramisu cupa',
        'Mura', 'Mousse Snyx / felie', 'Visine pe tocuri', 'Mambo', 'Paris Brest',
        'Pavlova', 'Cannolo siciliani', 'Mini tort amandina', 'Mini tort inima',
        'Mousse fistic', 'Mousse Rocher', 'Pina Colada', 'Pearl', 'Mousse Kaffa',
      ],
    },
    {
      name: 'PRODUSE KG',
      units: ['tv', 'plt', 'rand'],
      defaultUnit: 'tv',
      products: [
        'Saratele', 'Placinta cu mere dulce', 'Placinta cu branza', 'Gobs', 'Turtite cu stafide',
        'Pricomigdale', 'Cornulete', 'Cracker vanzare', 'Cracker cafea', 'Minichoux',
        'Mini eclere', 'Mini eclere cu fistic', 'Mini Paris Brest', 'Minitarte', 'Raffaella',
        'Caramel', 'Meringue', 'Ardealul', 'Tavalita', 'Rulouri vanilie',
        'Rulouri ciocolata', 'Praj cu branza si lam', 'Linzer', 'Alba ca zapada', 'Dubai',
        'Dubai fara zahar', 'Rulada Dubai', 'Mini Excellent', 'Mini Rocher', 'Mix fructe',
      ],
    },
    {
      name: 'TORTURI SI TARTE',
      units: ['felie', 'buc.'],
      defaultUnit: 'felie',
      products: [
        'Tort belcolade intreg', 'Tort belcolade feliat', 'Tort fructe de padure', 'Tort mousse X3',
        'Tort de zmeure', 'Tort de mure', 'Tort Ness feliat', 'Tort amarena',
        'Tort fara zahar', 'Tort padurea neagra', 'Tort Snyx', 'Tort Oreo',
        'Tarta cu branza', 'Bavareza cu portocale', 'Tort de biscuiti', 'Tort Mambo',
        'Tort fistic, ciocolata, zmeure', 'Tort Ferrero Rocher', 'Cinnamon clasic',
        'Cinnamon fistic', 'Cinnamon cafea',
      ],
    },
    {
      name: 'PATISERIE',
      units: ['tv', 'plt'],
      defaultUnit: 'tv',
      products: [
        'Pateuri cu branza', 'Strudele cu mere', 'Rulouri cu branza', 'Mini pateuri',
        'Mini ciuperci', 'Mini carne', 'Cozonac', 'Pasca', 'Croissant zmeure', 'Croissant fistic',
      ],
    },
    {
      name: 'ALTELE',
      units: ['buc.', 'g.'],
      defaultUnit: 'buc.',
      products: ['Alune', 'Mucenici', 'Cozonac fara zahar'],
    },
    {
      name: 'POST',
      units: ['tv', 'plt', 'rand'],
      defaultUnit: 'tv',
      products: [
        'Minciunele', 'Placinta cu dovleac', 'Placinta cu mere', 'Negresa',
        'Baclava', 'Sarailie', 'Sarailie fara zahar', 'Salam de biscuiti',
      ],
    },
  ]

  for (let i = 0; i < INVENTORY_CATEGORIES.length; i++) {
    const categoryData = INVENTORY_CATEGORIES[i]
    
    const category = await prismaClient.inventoryCategory.create({
      data: {
        name: categoryData.name,
        units: categoryData.units,
        defaultUnit: categoryData.defaultUnit,
        displayOrder: i,
      },
    })

    // Create products for this category
    for (let j = 0; j < categoryData.products.length; j++) {
      await prismaClient.inventoryProduct.create({
        data: {
          categoryId: category.id,
          name: categoryData.products[j],
          displayOrder: j,
        },
      })
    }

    console.log(`✅ Created category "${category.name}" with ${categoryData.products.length} products`)
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

// Use Railway persistent volume for production, local directory for development
const STORAGE_BASE = process.env.STORAGE_BASE || process.env.RAILWAY_VOLUME_MOUNT_PATH || process.cwd()
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(STORAGE_BASE, 'uploads')
const PDF_DIR = process.env.PDF_DIR || path.join(STORAGE_BASE, 'pdfs')

// Log storage paths on startup
console.log('📁 Storage configuration:')
console.log(`   STORAGE_BASE: ${STORAGE_BASE}`)
console.log(`   UPLOAD_DIR: ${UPLOAD_DIR}`)
console.log(`   PDF_DIR: ${PDF_DIR}`)

// Serve uploaded files with CORS headers
app.use('/uploads', (req, res, next) => {
  // Set CORS headers for image requests
  const origin = req.headers.origin
  if (origin) {
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin)
      }
      return false
    })
    
    if (isAllowed || process.env.NODE_ENV !== 'production') {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    }
  }
  
  // Set cache headers for images
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  
  next()
}, express.static(UPLOAD_DIR))

// Serve PDF files
app.use('/pdfs', (req, res, next) => {
  // Set CORS headers for PDF requests
  const origin = req.headers.origin
  if (origin) {
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin)
      }
      return false
    })
    
    if (isAllowed || process.env.NODE_ENV !== 'production') {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    }
  }
  
  // Set cache headers for PDFs
  res.setHeader('Cache-Control', 'public, max-age=3600')
  
  next()
}, express.static(PDF_DIR))

// Health/version endpoint to verify deployed backend build
app.get('/api/version', (_req, res) => {
  res.json({ version: BUILD_VERSION })
})

// Routes
app.use('/api/orders', ordersRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/config', configRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/inventory-products', inventoryProductsRoutes)

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

// Health check with database status
app.get('/health', async (req, res) => {
  const healthStatus: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
    },
  }

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`
    healthStatus.database = { status: 'connected', error: null }
  } catch (error) {
    healthStatus.database = { 
      status: 'disconnected', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
    healthStatus.status = 'degraded'
    return res.status(503).json(healthStatus)
  }

  res.json(healthStatus)
})

// Database-specific health check
app.get('/health/db', async (req, res) => {
  try {
    const startTime = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - startTime
    
    res.json({
      status: 'ok',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    })
  }
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

