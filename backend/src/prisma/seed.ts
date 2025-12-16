import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Initialize order counter
  await prisma.orderCounter.upsert({
    where: { id: 'main-counter' },
    update: {},
    create: {
      id: 'main-counter',
      lastOrder: 0,
    },
  })

  // Create default admin user if it doesn't exist
  const adminPassword = await bcrypt.hash('0000', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: adminPassword, // Update password in case it was changed
    },
    create: {
      username: 'admin',
      password: adminPassword,
    },
  })

  console.log('Database seeded successfully!')
  console.log('Admin user created: username=admin, password=0000')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    // Don't exit with error code - allow server to start even if seeding fails
    // This is important for production where the admin user might already exist
  })
  .finally(async () => {
    await prisma.$disconnect()
  })













