import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')
  
  try {
    // Test database connection
    await prisma.$connect()
    console.log('Database connection established')
    
    // Initialize order counter
    await prisma.orderCounter.upsert({
      where: { id: 'main-counter' },
      update: {},
      create: {
        id: 'main-counter',
        lastOrder: 0,
      },
    })
    console.log('Order counter initialized')

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

    console.log('✅ Admin user verified: username=admin, password=0000')
    console.log(`✅ Admin user ID: ${verifyUser.id}`)

    // Seed default location users with staff names as sub-categories
    const DEFAULT_STAFF_NAMES = ['ALINA', 'DANA', 'MIRELA', 'LIVIA']
    const LOCATION_USERS = ['CARAIMAN', 'NORD', 'TIMKEN', 'LABORATOR', 'CENTRU']
    const defaultUserPassword = await bcrypt.hash('0000', 10)

    for (const username of LOCATION_USERS) {
      const existing = await prisma.user.findUnique({ where: { username } })
      if (!existing) {
        await prisma.user.create({
          data: {
            username,
            password: defaultUserPassword,
            staffNames: DEFAULT_STAFF_NAMES,
          },
        })
        console.log(`✅ Created location user: ${username}`)
      } else {
        console.log(`✅ Location user already exists: ${username}`)
      }
    }

    console.log('✅ Database seeded successfully!')
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error seeding database:', e)
    console.error('Stack trace:', e instanceof Error ? e.stack : 'No stack trace')
    // Don't exit with error code - allow server to start even if seeding fails
    // This is important for production where the admin user might already exist
    process.exit(0) // Exit with success to allow server to start
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log('Database connection closed')
  })


















