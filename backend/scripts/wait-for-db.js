// Script to wait for database to be ready before starting the server
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['error'],
})

const maxRetries = 30
const retryDelay = 2000 // 2 seconds

async function waitForDatabase() {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await prisma.$connect()
      console.log('✅ Database connection established')
      await prisma.$disconnect()
      return true
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error('❌ Failed to connect to database after', maxRetries, 'attempts')
        console.error('Error:', error.message)
        process.exit(1)
      }
      console.log(`⏳ Waiting for database... (attempt ${i + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }
}

waitForDatabase()
  .then(() => {
    console.log('✅ Database is ready')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error waiting for database:', error)
    process.exit(1)
  })
