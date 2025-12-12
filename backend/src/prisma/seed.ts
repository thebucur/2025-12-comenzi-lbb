import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default installation
  const installation = await prisma.installation.upsert({
    where: { id: 'default-installation' },
    update: {},
    create: {
      id: 'default-installation',
      name: 'Default Installation',
      email: process.env.SMTP_FROM || 'default@example.com',
    },
  })

  // Initialize order counter
  await prisma.orderCounter.upsert({
    where: { id: 'main-counter' },
    update: {},
    create: {
      id: 'main-counter',
      lastOrder: 0,
    },
  })

  console.log('Database seeded successfully!')
  console.log('Default installation:', installation)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })











