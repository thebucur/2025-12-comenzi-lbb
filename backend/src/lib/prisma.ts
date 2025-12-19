import { PrismaClient } from '@prisma/client'

// Create a singleton Prisma client instance to avoid multiple connections
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure DATABASE_URL has connection timeout to prevent hanging
// PostgreSQL: add ?connect_timeout=5 to connection string
// This should be set in .env file, but we'll add it here as a fallback
const databaseUrl = process.env.DATABASE_URL
const urlWithTimeout = databaseUrl?.includes('connect_timeout')
  ? databaseUrl
  : databaseUrl?.includes('?')
  ? `${databaseUrl}&connect_timeout=5`
  : databaseUrl
  ? `${databaseUrl}?connect_timeout=5`
  : undefined

if (urlWithTimeout && urlWithTimeout !== databaseUrl) {
  process.env.DATABASE_URL = urlWithTimeout
}

// Connection pool settings for Railway
// Note: These are set via DATABASE_URL query parameters instead of client options
// Example: postgresql://user:pass@host:5432/db?connection_limit=5&pool_timeout=10
const connectionPoolUrl = databaseUrl?.includes('connection_limit')
  ? databaseUrl
  : urlWithTimeout?.includes('?')
  ? `${urlWithTimeout}&connection_limit=5&pool_timeout=10`
  : urlWithTimeout
  ? `${urlWithTimeout}?connection_limit=5&pool_timeout=10`
  : undefined

if (connectionPoolUrl && connectionPoolUrl !== databaseUrl) {
  process.env.DATABASE_URL = connectionPoolUrl
  console.log('✅ Database connection pool configured: connection_limit=5, pool_timeout=10s')
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// Test connection on startup (non-blocking)
// This will help identify connection issues early
prisma.$connect()
  .then(() => {
    console.log('✅ Database connection established')
  })
  .catch((error) => {
    console.warn('⚠️  Database connection failed on startup:', error.message)
    console.warn('   Server will start, but database operations may fail')
    // Don't throw - allow server to start even if DB is unavailable
    // The first query will attempt to reconnect
  })

// Handle graceful shutdown
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Graceful shutdown handler
const gracefulShutdown = async () => {
  try {
    await prisma.$disconnect()
    console.log('Database connection closed gracefully')
  } catch (error) {
    console.error('Error disconnecting from database:', error)
  }
}

process.on('beforeExit', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

export default prisma

