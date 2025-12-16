import { PrismaClient } from '@prisma/client'

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

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })













